import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import {
  Organization,
  User,
  Employee,
  Customer,
  Supplier,
  Product,
  InventoryTransaction,
  SalesOrder,
  PurchaseOrder,
  FinanceTransaction,
  Invoice,
  Project,
  Task,
  Notification,
  AuditLog,
} from '../models/index.js';

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/biznexus_erp';

    if (!process.env.MONGODB_URI && !process.env.MONGO_URI && process.env.NODE_ENV === 'production') {
      console.warn('[Seed]: No cloud MONGODB_URI provided in production environment. Skipping seed.');
      process.exit(0);
    }

    console.log(`[Seed]: Connecting to MongoDB: ${mongoUri.includes('@') ? mongoUri.split('@')[1] : mongoUri}`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });

    console.log('[Seed]: Clearing existing data...');
    await Promise.all([
      Organization.deleteMany({}),
      User.deleteMany({}),
      Employee.deleteMany({}),
      Customer.deleteMany({}),
      Supplier.deleteMany({}),
      Product.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      SalesOrder.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      FinanceTransaction.deleteMany({}),
      Invoice.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('[Seed]: Creating sample Organization...');
    const org = await Organization.create({
      name: 'Nexus Dynamics Private Limited',
      code: 'NEXUS-01',
      currency: 'INR',
      currencySymbol: '₹',
      email: 'contact@nexusdynamics.in',
      phone: '+91 80 4123 4567',
      address: {
        street: '42, Koramangala 4th Block, 100 Feet Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560034',
        country: 'India',
      },
      taxNumber: '29AABCN8891C1Z4',
      settings: {
        defaultTaxRate: 18,
        fiscalYearStart: '04-01',
        lowStockThreshold: 10,
      },
      status: 'active',
    });

    console.log('[Seed]: Creating Users with different roles...');
    const ownerUser = await User.create({
      organization: org._id,
      name: 'Vikram Malhotra',
      email: 'admin@biznexus.io',
      password: 'Password123!',
      role: 'business_owner',
      department: 'Management',
      phone: '+91 98765 43210',
      status: 'active',
    });

    const managerUser = await User.create({
      organization: org._id,
      name: 'Rajesh Sharma',
      email: 'manager@biznexus.io',
      password: 'Password123!',
      role: 'manager',
      department: 'Operations',
      phone: '+91 98765 43211',
      status: 'active',
    });

    const accountantUser = await User.create({
      organization: org._id,
      name: 'Ananya Iyer',
      email: 'accountant@biznexus.io',
      password: 'Password123!',
      role: 'accountant',
      department: 'Finance',
      phone: '+91 98765 43212',
      status: 'active',
    });

    const employeeUser = await User.create({
      organization: org._id,
      name: 'Priya Nair',
      email: 'employee@biznexus.io',
      password: 'Password123!',
      role: 'employee',
      department: 'Engineering',
      phone: '+91 98765 43213',
      status: 'active',
    });

    console.log('[Seed]: Creating Employees...');
    const employees = await Employee.create([
      {
        organization: org._id,
        employeeId: 'EMP-1001',
        fullName: 'Rajesh Sharma',
        email: 'rajesh.sharma@nexusdynamics.in',
        phone: '+91 98765 43211',
        department: 'Management',
        jobTitle: 'VP of Operations',
        joiningDate: new Date('2023-01-15'),
        employmentStatus: 'active',
        salary: 125000,
        address: 'Indiranagar, Bengaluru',
        userAccount: managerUser._id,
      },
      {
        organization: org._id,
        employeeId: 'EMP-1002',
        fullName: 'Priya Nair',
        email: 'priya.nair@nexusdynamics.in',
        phone: '+91 98765 43213',
        department: 'Engineering',
        jobTitle: 'Lead Cloud & Systems Architect',
        joiningDate: new Date('2023-03-01'),
        employmentStatus: 'active',
        salary: 110000,
        address: 'HSR Layout, Bengaluru',
        userAccount: employeeUser._id,
      },
      {
        organization: org._id,
        employeeId: 'EMP-1003',
        fullName: 'Ananya Iyer',
        email: 'ananya.iyer@nexusdynamics.in',
        phone: '+91 98765 43212',
        department: 'Finance',
        jobTitle: 'Chief Financial Controller',
        joiningDate: new Date('2023-02-10'),
        employmentStatus: 'active',
        salary: 115000,
        address: 'Jayanagar, Bengaluru',
        userAccount: accountantUser._id,
      },
      {
        organization: org._id,
        employeeId: 'EMP-1004',
        fullName: 'Amit Patel',
        email: 'amit.patel@nexusdynamics.in',
        phone: '+91 98765 43214',
        department: 'Purchasing',
        jobTitle: 'Senior Procurement Specialist',
        joiningDate: new Date('2023-06-20'),
        employmentStatus: 'active',
        salary: 85000,
        address: 'Whitefield, Bengaluru',
      },
      {
        organization: org._id,
        employeeId: 'EMP-1005',
        fullName: 'Sneha Roy',
        email: 'sneha.roy@nexusdynamics.in',
        phone: '+91 98765 43215',
        department: 'Inventory',
        jobTitle: 'Warehouse & Logistics Lead',
        joiningDate: new Date('2023-08-01'),
        employmentStatus: 'active',
        salary: 75000,
        address: 'Electronic City, Bengaluru',
      },
      {
        organization: org._id,
        employeeId: 'EMP-1006',
        fullName: 'Rohan Joshi',
        email: 'rohan.joshi@nexusdynamics.in',
        phone: '+91 98765 43216',
        department: 'Customer Support',
        jobTitle: 'Customer Success Manager',
        joiningDate: new Date('2024-01-10'),
        employmentStatus: 'active',
        salary: 68000,
        address: 'BTM Layout, Bengaluru',
      },
    ]);

    console.log('[Seed]: Creating Suppliers...');
    const suppliers = await Supplier.create([
      {
        organization: org._id,
        supplierId: 'SUP-1001',
        companyName: 'TechParts Semiconductor Ltd',
        contactPerson: 'Suresh Menon',
        email: 'orders@techparts.in',
        phone: '+91 80 2845 1100',
        paymentTerms: 'Net 30',
        rating: 5,
        address: { city: 'Bengaluru', state: 'Karnataka', country: 'India' },
      },
      {
        organization: org._id,
        supplierId: 'SUP-1002',
        companyName: 'Apex Precision Hardware Corp',
        contactPerson: 'Gautam Deshmukh',
        email: 'supply@apexprecision.com',
        phone: '+91 20 2712 3456',
        paymentTerms: 'Net 45',
        rating: 4,
        address: { city: 'Pune', state: 'Maharashtra', country: 'India' },
      },
      {
        organization: org._id,
        supplierId: 'SUP-1003',
        companyName: 'MicroSilicon Electronics Hub',
        contactPerson: 'Kavita Reddy',
        email: 'sales@microsilicon.co.in',
        phone: '+91 40 6789 0123',
        paymentTerms: 'Net 15',
        rating: 5,
        address: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
      },
    ]);

    console.log('[Seed]: Creating Products...');
    const products = await Product.create([
      {
        organization: org._id,
        sku: 'PROD-1001',
        name: 'Industrial Edge IoT Gateway',
        category: 'Hardware',
        description: 'Multi-protocol IoT Edge Computing Gateway with 4G LTE failover.',
        costPrice: 4800,
        sellingPrice: 8500,
        availableQuantity: 42,
        minStockLevel: 10,
        unit: 'pcs',
        supplier: suppliers[0]._id,
        status: 'active',
      },
      {
        organization: org._id,
        sku: 'PROD-1002',
        name: 'Smart Environmental Sensor Node v2',
        category: 'Electronics',
        description: 'High-precision temperature, humidity, and atmospheric pressure sensor.',
        costPrice: 1200,
        sellingPrice: 2450,
        availableQuantity: 110,
        minStockLevel: 25,
        unit: 'pcs',
        supplier: suppliers[2]._id,
        status: 'active',
      },
      {
        organization: org._id,
        sku: 'PROD-1003',
        name: 'Rugged Touch HMI Display 10.1"',
        category: 'Electronics',
        description: 'IP65 waterproof industrial touchscreen with RS-485 interface.',
        costPrice: 7200,
        sellingPrice: 12800,
        availableQuantity: 6, // Low stock!
        minStockLevel: 15,
        unit: 'pcs',
        supplier: suppliers[0]._id,
        status: 'active',
      },
      {
        organization: org._id,
        sku: 'PROD-1004',
        name: 'Shielded Cat6 Industrial Ethernet Spool (305m)',
        category: 'Hardware',
        description: 'Heavy duty outdoor UV-resistant Ethernet cable drum.',
        costPrice: 3800,
        sellingPrice: 6200,
        availableQuantity: 28,
        minStockLevel: 8,
        unit: 'spools',
        supplier: suppliers[1]._id,
        status: 'active',
      },
      {
        organization: org._id,
        sku: 'PROD-1005',
        name: 'Enterprise Rackmount Power Distribution Unit',
        category: 'Hardware',
        description: '16A Smart Switched PDU with power telemetry and SNMP.',
        costPrice: 14500,
        sellingPrice: 23500,
        availableQuantity: 4, // Low stock!
        minStockLevel: 10,
        unit: 'units',
        supplier: suppliers[1]._id,
        status: 'active',
      },
      {
        organization: org._id,
        sku: 'PROD-1006',
        name: 'Thermal Interface Conductive Compound (Pack of 5)',
        category: 'Office Supplies',
        description: 'High thermal conductivity paste for processor heatsinks.',
        costPrice: 450,
        sellingPrice: 890,
        availableQuantity: 75,
        minStockLevel: 20,
        unit: 'packs',
        supplier: suppliers[2]._id,
        status: 'active',
      },
    ]);

    console.log('[Seed]: Creating Customers...');
    const customers = await Customer.create([
      {
        organization: org._id,
        customerId: 'CUST-1001',
        name: 'Horizon Smart Tech Ltd',
        company: 'Horizon Smart Tech',
        email: 'procurement@horizontech.in',
        phone: '+91 22 2500 7890',
        customerType: 'business',
        leadStatus: 'customer',
        assignedEmployee: employees[0]._id,
        address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
        totalSpent: 168740,
        ordersCount: 2,
      },
      {
        organization: org._id,
        customerId: 'CUST-1002',
        name: 'Spectra Energy & Utilities Corp',
        company: 'Spectra Energy',
        email: 'contracts@spectraenergy.co',
        phone: '+91 11 4100 9988',
        customerType: 'business',
        leadStatus: 'customer',
        assignedEmployee: employees[1]._id,
        address: { city: 'New Delhi', state: 'Delhi', country: 'India' },
        totalSpent: 98530,
        ordersCount: 1,
      },
      {
        organization: org._id,
        customerId: 'CUST-1003',
        name: 'Zenith Robotics & Automation',
        company: 'Zenith Automations',
        email: 'info@zenithautomation.com',
        phone: '+91 44 2811 4455',
        customerType: 'business',
        leadStatus: 'qualified',
        assignedEmployee: employees[0]._id,
        address: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
        totalSpent: 0,
        ordersCount: 0,
      },
      {
        organization: org._id,
        customerId: 'CUST-1004',
        name: 'Aarav Singhania',
        company: 'Singhania Engineering Consultants',
        email: 'aarav@singhania.org',
        phone: '+91 99887 76655',
        customerType: 'individual',
        leadStatus: 'customer',
        assignedEmployee: employees[5]._id,
        address: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
        totalSpent: 29400,
        ordersCount: 1,
      },
    ]);

    console.log('[Seed]: Creating Sales Orders...');
    // Order 1: Fulfilled & Paid
    const order1 = await SalesOrder.create({
      organization: org._id,
      orderNumber: 'SO-10001',
      customer: customers[0]._id,
      orderDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[0]._id,
          sku: products[0].sku,
          productName: products[0].name,
          quantity: 10,
          unitPrice: 8500,
          subtotal: 85000,
        },
        {
          product: products[1]._id,
          sku: products[1].sku,
          productName: products[1].name,
          quantity: 20,
          unitPrice: 2450,
          subtotal: 49000,
        },
      ],
      subtotal: 134000,
      discount: 4000,
      taxRate: 18,
      taxAmount: 23400,
      totalAmount: 153400,
      paidAmount: 153400,
      paymentStatus: 'paid',
      orderStatus: 'fulfilled',
      isStockDeducted: true,
      createdBy: ownerUser._id,
      notes: 'Standard delivery via express road logistics',
    });

    // Order 2: Confirmed & Partially Paid
    const order2 = await SalesOrder.create({
      organization: org._id,
      orderNumber: 'SO-10002',
      customer: customers[1]._id,
      orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[2]._id,
          sku: products[2].sku,
          productName: products[2].name,
          quantity: 4,
          unitPrice: 12800,
          subtotal: 51200,
        },
        {
          product: products[3]._id,
          sku: products[3].sku,
          productName: products[3].name,
          quantity: 5,
          unitPrice: 6200,
          subtotal: 31000,
        },
      ],
      subtotal: 82200,
      discount: 2200,
      taxRate: 18,
      taxAmount: 14400,
      totalAmount: 94400,
      paidAmount: 50000,
      paymentStatus: 'partially_paid',
      orderStatus: 'confirmed',
      isStockDeducted: true,
      createdBy: managerUser._id,
      notes: 'Priority industrial installation client',
    });

    // Order 3: Pending
    const order3 = await SalesOrder.create({
      organization: org._id,
      orderNumber: 'SO-10003',
      customer: customers[3]._id,
      orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[1]._id,
          sku: products[1].sku,
          productName: products[1].name,
          quantity: 10,
          unitPrice: 2450,
          subtotal: 24500,
        },
      ],
      subtotal: 24500,
      discount: 0,
      taxRate: 18,
      taxAmount: 4410,
      totalAmount: 28910,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      isStockDeducted: false,
      createdBy: ownerUser._id,
      notes: 'Awaiting customer purchase agreement signoff',
    });

    console.log('[Seed]: Creating Invoices...');
    const invoice1 = await Invoice.create({
      organization: org._id,
      invoiceNumber: 'INV-10001',
      customer: customers[0]._id,
      salesOrder: order1._id,
      issueDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
      items: [
        { description: `${products[0].name} (Qty: 10)`, quantity: 10, unitPrice: 8500, subtotal: 85000 },
        { description: `${products[1].name} (Qty: 20)`, quantity: 20, unitPrice: 2450, subtotal: 49000 },
      ],
      subtotal: 130000,
      taxAmount: 23400,
      totalAmount: 153400,
      paidAmount: 153400,
      balanceDue: 0,
      status: 'paid',
    });

    const invoice2 = await Invoice.create({
      organization: org._id,
      invoiceNumber: 'INV-10002',
      customer: customers[1]._id,
      salesOrder: order2._id,
      issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      items: [
        { description: `${products[2].name} (Qty: 4)`, quantity: 4, unitPrice: 12800, subtotal: 51200 },
        { description: `${products[3].name} (Qty: 5)`, quantity: 5, unitPrice: 6200, subtotal: 31000 },
      ],
      subtotal: 80000,
      taxAmount: 14400,
      totalAmount: 94400,
      paidAmount: 50000,
      balanceDue: 44400,
      status: 'partially_paid',
    });

    console.log('[Seed]: Creating Purchase Orders...');
    const po1 = await PurchaseOrder.create({
      organization: org._id,
      poNumber: 'PO-10001',
      supplier: suppliers[0]._id,
      orderDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      expectedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[0]._id,
          sku: products[0].sku,
          productName: products[0].name,
          orderedQuantity: 50,
          receivedQuantity: 50,
          unitCost: 4800,
          subtotal: 240000,
        },
      ],
      totalAmount: 240000,
      status: 'received',
      paymentStatus: 'paid',
      createdBy: managerUser._id,
    });

    const po2 = await PurchaseOrder.create({
      organization: org._id,
      poNumber: 'PO-10002',
      supplier: suppliers[1]._id,
      orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[4]._id,
          sku: products[4].sku,
          productName: products[4].name,
          orderedQuantity: 15,
          receivedQuantity: 5,
          unitCost: 14500,
          subtotal: 217500,
        },
      ],
      totalAmount: 217500,
      status: 'partially_received',
      paymentStatus: 'partially_paid',
      createdBy: managerUser._id,
    });

    console.log('[Seed]: Creating Finance Transactions...');
    await FinanceTransaction.create([
      {
        organization: org._id,
        transactionId: 'TXN-10001',
        type: 'income',
        category: 'Sales Revenue',
        description: 'Payment in full for Invoice INV-10001 (Horizon Tech)',
        amount: 153400,
        transactionDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        paymentMethod: 'bank_transfer',
        relatedCustomer: customers[0]._id,
        relatedOrder: order1._id,
        referenceNumber: 'NEFT-8899120',
        createdBy: accountantUser._id,
      },
      {
        organization: org._id,
        transactionId: 'TXN-10002',
        type: 'income',
        category: 'Sales Revenue',
        description: 'Advance installment payment for INV-10002 (Spectra Energy)',
        amount: 50000,
        transactionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        paymentMethod: 'bank_transfer',
        relatedCustomer: customers[1]._id,
        relatedOrder: order2._id,
        referenceNumber: 'RTGS-442211',
        createdBy: accountantUser._id,
      },
      {
        organization: org._id,
        transactionId: 'TXN-10003',
        type: 'expense',
        category: 'Raw Materials & Inventory',
        description: 'Supplier payment for PO-10001 (TechParts)',
        amount: 240000,
        transactionDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        paymentMethod: 'bank_transfer',
        relatedSupplier: suppliers[0]._id,
        relatedPurchase: po1._id,
        referenceNumber: 'NEFT-5511002',
        createdBy: accountantUser._id,
      },
      {
        organization: org._id,
        transactionId: 'TXN-10004',
        type: 'expense',
        category: 'Office Rent & Facilities',
        description: 'Monthly office rent - Koramangala facility',
        amount: 45000,
        transactionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        paymentMethod: 'bank_transfer',
        referenceNumber: 'RENT-OCT-2026',
        createdBy: accountantUser._id,
      },
      {
        organization: org._id,
        transactionId: 'TXN-10005',
        type: 'expense',
        category: 'Cloud & Infrastructure',
        description: 'Monthly AWS / Cloud hosting infrastructure',
        amount: 18500,
        transactionDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        paymentMethod: 'credit_card',
        referenceNumber: 'AWS-INV-9938',
        createdBy: accountantUser._id,
      },
      {
        organization: org._id,
        transactionId: 'TXN-10006',
        type: 'expense',
        category: 'Utilities',
        description: 'High-speed commercial leased line broadband and electricity',
        amount: 9800,
        transactionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        paymentMethod: 'upi',
        referenceNumber: 'UPI-771122',
        createdBy: accountantUser._id,
      },
    ]);

    console.log('[Seed]: Creating Projects & Tasks...');
    const project1 = await Project.create({
      organization: org._id,
      projectId: 'PRJ-1001',
      name: 'Industrial Smart Factory IoT Deployment',
      description: 'End-to-end telemetry and monitoring for Horizon Tech manufacturing line.',
      client: customers[0]._id,
      startDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      budget: 450000,
      status: 'active',
      progressPercentage: 66,
      teamMembers: [employees[0]._id, employees[1]._id, employees[4]._id],
    });

    const project2 = await Project.create({
      organization: org._id,
      projectId: 'PRJ-1002',
      name: 'Spectra Microgrid Telemetry Architecture',
      description: 'Designing power monitoring gateway integration for distributed solar arrays.',
      client: customers[1]._id,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      budget: 320000,
      status: 'active',
      progressPercentage: 33,
      teamMembers: [employees[1]._id, employees[3]._id],
    });

    await Task.create([
      {
        organization: org._id,
        taskId: 'TSK-1001',
        title: 'Provision IoT Gateway Firmware with TLS 1.3 certs',
        description: 'Flash secure custom Linux OS onto the initial batch of 10 edge gateways.',
        project: project1._id,
        assignee: employees[1]._id,
        priority: 'urgent',
        status: 'completed',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdBy: ownerUser._id,
      },
      {
        organization: org._id,
        taskId: 'TSK-1002',
        title: 'Conduct RS-485 Modbus stress test in plant area B',
        description: 'Verify noise resistance and transmission packet latency over long spool.',
        project: project1._id,
        assignee: employees[0]._id,
        priority: 'high',
        status: 'completed',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdBy: managerUser._id,
      },
      {
        organization: org._id,
        taskId: 'TSK-1003',
        title: 'Install wall-mounted HMI touch consoles on factory floor',
        description: 'Mount and wire 4 HMI touch panels at line operator stations.',
        project: project1._id,
        assignee: employees[4]._id,
        priority: 'high',
        status: 'in_progress',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdBy: managerUser._id,
      },
      {
        organization: org._id,
        taskId: 'TSK-1004',
        title: 'Draft architecture diagram for Solar Inverter telemetry',
        description: 'Map out data flow from inverter Modbus register to Cloud time-series DB.',
        project: project2._id,
        assignee: employees[1]._id,
        priority: 'medium',
        status: 'in_progress',
        dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        createdBy: managerUser._id,
      },
      {
        organization: org._id,
        taskId: 'TSK-1005',
        title: 'Order replacement PDU units from Apex Precision',
        description: 'Ensure replenishment stock arrives before next commissioning phase.',
        project: project2._id,
        assignee: employees[3]._id,
        priority: 'urgent',
        status: 'todo',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        createdBy: ownerUser._id,
      },
    ]);

    console.log('[Seed]: Creating Notifications...');
    await Notification.create([
      {
        organization: org._id,
        title: 'Low Stock Alert',
        message: 'Rugged Touch HMI Display 10.1" (PROD-1003) has only 6 units remaining (Threshold: 15).',
        type: 'low_stock',
        isRead: false,
        link: '/inventory',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        organization: org._id,
        title: 'Payment Received',
        message: 'Received ₹50,000 installment for Invoice INV-10002 from Spectra Energy.',
        type: 'payment',
        isRead: false,
        link: '/finance/invoices',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      },
      {
        organization: org._id,
        title: 'New Sales Order Created',
        message: 'Sales Order SO-10002 has been confirmed for Spectra Energy (₹94,400).',
        type: 'order_status',
        isRead: true,
        link: '/sales',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        organization: org._id,
        title: 'Partial Goods Received',
        message: 'PO-10002: 5 units of Enterprise Rackmount PDU received and added to inventory.',
        type: 'purchase_status',
        isRead: true,
        link: '/purchases',
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
      },
    ]);

    console.log('[Seed]: Creating initial Audit Logs...');
    await AuditLog.create([
      {
        organization: org._id,
        user: ownerUser._id,
        userName: ownerUser.name,
        userRole: ownerUser.role,
        action: 'SYSTEM_INITIALIZED',
        module: 'settings',
        details: { organization: org.name, code: org.code },
      },
      {
        organization: org._id,
        user: ownerUser._id,
        userName: ownerUser.name,
        userRole: ownerUser.role,
        action: 'SALES_ORDER_FULFILLED',
        module: 'sales',
        details: { orderNumber: order1.orderNumber, total: order1.totalAmount },
      },
    ]);

    console.log('====================================================');
    console.log('  BizNexus ERP Database Successfully Seeded!       ');
    console.log('====================================================');
    console.log('  Organization: Nexus Dynamics Private Limited');
    console.log('  Organization Code: NEXUS-01');
    console.log('  Demonstration Login Credentials:');
    console.log('    1. Business Owner : admin@biznexus.io      / Password123!');
    console.log('    2. Manager        : manager@biznexus.io    / Password123!');
    console.log('    3. Accountant     : accountant@biznexus.io / Password123!');
    console.log('    4. Employee       : employee@biznexus.io   / Password123!');
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error.message);
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Seed]: Continuing deployment despite seed error.');
      process.exit(0);
    }
    process.exit(1);
  }
};

seedDatabase();
