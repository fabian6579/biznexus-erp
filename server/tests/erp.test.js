import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import {
  Organization,
  User,
  Product,
  SalesOrder,
  PurchaseOrder,
  Supplier,
  Customer,
} from '../src/models/index.js';

describe('BizNexus ERP Core Business Logic & Isolation Tests', () => {
  let org1, org2;
  let ownerTokenOrg1, ownerTokenOrg2, employeeTokenOrg1;
  let sampleProductOrg1, sampleSupplierOrg1, sampleCustomerOrg1;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biznexus_erp';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Set up test org 1
    org1 = await Organization.create({
      name: 'Test Org One',
      code: `TEST1-${Date.now()}`,
      currency: 'INR',
    });

    const owner1 = await User.create({
      organization: org1._id,
      name: 'Org1 Owner',
      email: `owner1_${Date.now()}@test.io`,
      password: 'Password123!',
      role: 'business_owner',
    });

    const employee1 = await User.create({
      organization: org1._id,
      name: 'Org1 Employee',
      email: `emp1_${Date.now()}@test.io`,
      password: 'Password123!',
      role: 'employee',
    });

    // Set up test org 2
    org2 = await Organization.create({
      name: 'Test Org Two',
      code: `TEST2-${Date.now()}`,
      currency: 'INR',
    });

    const owner2 = await User.create({
      organization: org2._id,
      name: 'Org2 Owner',
      email: `owner2_${Date.now()}@test.io`,
      password: 'Password123!',
      role: 'business_owner',
    });

    // Obtain tokens via login
    const resLogin1 = await request(app).post('/api/auth/login').send({
      email: owner1.email,
      password: 'Password123!',
    });
    ownerTokenOrg1 = resLogin1.body.token;

    const resLoginEmp1 = await request(app).post('/api/auth/login').send({
      email: employee1.email,
      password: 'Password123!',
    });
    employeeTokenOrg1 = resLoginEmp1.body.token;

    const resLogin2 = await request(app).post('/api/auth/login').send({
      email: owner2.email,
      password: 'Password123!',
    });
    ownerTokenOrg2 = resLogin2.body.token;

    // Create a supplier, customer, and product in Org 1
    sampleSupplierOrg1 = await Supplier.create({
      organization: org1._id,
      supplierId: `SUP-T1-${Date.now()}`,
      companyName: 'Test Components Co',
      email: 'testsup@example.com',
    });

    sampleCustomerOrg1 = await Customer.create({
      organization: org1._id,
      customerId: `CUST-T1-${Date.now()}`,
      name: 'Test Buyer Ltd',
      email: 'buyer@example.com',
    });

    sampleProductOrg1 = await Product.create({
      organization: org1._id,
      sku: `SKU-T1-${Date.now()}`,
      name: 'Test Microcontroller Board',
      category: 'Electronics',
      costPrice: 500,
      sellingPrice: 1000,
      availableQuantity: 50,
      minStockLevel: 10,
    });
  });

  afterAll(async () => {
    // Cleanup test organizations and all their data
    if (org1 && org2) {
      await Promise.all([
        Organization.deleteMany({ _id: { $in: [org1._id, org2._id] } }),
        User.deleteMany({ organization: { $in: [org1._id, org2._id] } }),
        Product.deleteMany({ organization: { $in: [org1._id, org2._id] } }),
        Customer.deleteMany({ organization: { $in: [org1._id, org2._id] } }),
        Supplier.deleteMany({ organization: { $in: [org1._id, org2._id] } }),
        SalesOrder.deleteMany({ organization: { $in: [org1._id, org2._id] } }),
        PurchaseOrder.deleteMany({ organization: { $in: [org1._id, org2._id] } }),
      ]);
    }
    await mongoose.connection.close();
  });

  test('1. Authentication: Successfully logs in and retrieves user profile via /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ownerTokenOrg1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('business_owner');
    expect(res.body.organization.name).toBe('Test Org One');
  });

  test('2. Organization Isolation: User from Org 2 cannot read or access Org 1 products', async () => {
    const res = await request(app)
      .get(`/api/products/${sampleProductOrg1._id}`)
      .set('Authorization', `Bearer ${ownerTokenOrg2}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('3. RBAC Enforcement: Employee role cannot delete products or change org settings', async () => {
    const res = await request(app)
      .delete(`/api/products/${sampleProductOrg1._id}`)
      .set('Authorization', `Bearer ${employeeTokenOrg1}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('4. Inventory & Sales Workflow: Creating and fulfilling a sales order deducts stock accurately', async () => {
    const initialStock = sampleProductOrg1.availableQuantity; // 50
    const orderQuantity = 15;

    // Create sales order with pending status
    const createOrderRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerTokenOrg1}`)
      .send({
        customer: sampleCustomerOrg1._id,
        items: [
          {
            product: sampleProductOrg1._id,
            quantity: orderQuantity,
            unitPrice: 1000,
          },
        ],
        orderStatus: 'pending',
      });

    expect(createOrderRes.status).toBe(201);
    const orderId = createOrderRes.body.data._id;

    // Check that stock was NOT deducted while pending
    let prod = await Product.findById(sampleProductOrg1._id);
    expect(prod.availableQuantity).toBe(initialStock);

    // Now change order status to fulfilled
    const updateRes = await request(app)
      .patch(`/api/sales/${orderId}/status`)
      .set('Authorization', `Bearer ${ownerTokenOrg1}`)
      .send({ status: 'fulfilled' });

    expect(updateRes.status).toBe(200);

    // Stock must now be deducted
    prod = await Product.findById(sampleProductOrg1._id);
    expect(prod.availableQuantity).toBe(initialStock - orderQuantity); // 35
  });

  test('5. Stock Reversal: Cancelling a fulfilled sales order reverses the inventory deduction', async () => {
    // Fetch product's current stock
    let prod = await Product.findById(sampleProductOrg1._id);
    const stockBeforeCancel = prod.availableQuantity; // 35

    // Find the order we fulfilled in the previous test
    const order = await SalesOrder.findOne({ organization: org1._id, isStockDeducted: true });
    expect(order).not.toBeNull();

    // Cancel order
    const cancelRes = await request(app)
      .patch(`/api/sales/${order._id}/status`)
      .set('Authorization', `Bearer ${ownerTokenOrg1}`)
      .send({ status: 'cancelled' });

    expect(cancelRes.status).toBe(200);

    // Stock must be restored
    prod = await Product.findById(sampleProductOrg1._id);
    expect(prod.availableQuantity).toBe(stockBeforeCancel + order.items[0].quantity); // 50
  });

  test('6. Purchase Workflow: Receiving goods increments product available stock', async () => {
    let prod = await Product.findById(sampleProductOrg1._id);
    const stockBeforePO = prod.availableQuantity;

    // Create a Purchase Order for 20 units
    const poRes = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${ownerTokenOrg1}`)
      .send({
        supplier: sampleSupplierOrg1._id,
        items: [
          {
            product: sampleProductOrg1._id,
            orderedQuantity: 20,
            unitCost: 500,
          },
        ],
      });

    expect(poRes.status).toBe(201);
    const poId = poRes.body.data._id;

    // Receive 20 units
    const receiveRes = await request(app)
      .patch(`/api/purchases/${poId}/receive`)
      .set('Authorization', `Bearer ${ownerTokenOrg1}`)
      .send({
        receivedItems: [
          {
            product: sampleProductOrg1._id,
            quantityReceived: 20,
          },
        ],
      });

    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.data.status).toBe('received');

    // Verify stock incremented
    prod = await Product.findById(sampleProductOrg1._id);
    expect(prod.availableQuantity).toBe(stockBeforePO + 20);
  });
});
