# BizNexus ERP
> **One Platform. Every Business Operation.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vercel Deployment](https://img.shields.io/badge/Deployed%20with-Vercel-black?logo=vercel)](https://vercel.com)
[![Tech Stack](https://img.shields.io/badge/Stack-MERN-green)](https://www.mongodb.com/mern-stack)

**BizNexus ERP** is a modern, centralized, multi-tenant Enterprise Resource Planning (ERP) platform engineered specifically for Small and Medium-Sized Businesses (SMBs). It unites core operational functions—including Employee Management, CRM, Inventory Control, Sales Order Workflows, Vendor Purchasing, Cash Flow Finance, Project Task Tracking, and Reports—into a unified dashboard.

---

### Project Information
- **Author:** Fabian J
- **Register Number:** 310624205062
- **Degree:** Bachelor of Technology in Information Technology
- **Course:** Full Stack Development (2311CSC503R)
- **Institution:** Easwari Engineering College (Autonomous), Affiliated to Anna University, Chennai

---

## 🏗️ Architecture & Technology Stack

- **Frontend:** React 18, Vite, React Router 6, Tailwind CSS, Lucide React, Recharts, Axios
- **Backend:** Node.js, Express.js (ES Modules), Mongoose, JSON Web Tokens (JWT), Bcrypt.js, Helmet, Express-Rate-Limit, Json2csv
- **Database:** MongoDB (Multi-tenant organization-scoped schema, referential integrity, and atomic inventory stock transactions)
- **Serverless / Cloud Deployment:** Vercel (Frontend SPA + Serverless Express API via `@vercel/node`)
- **Testing:** Jest, Supertest

---

## 🚀 Key Modules & Features

### 1. Multi-Tenant Architecture & RBAC
- Organization-scoped data isolation enforced on all database queries and writes.
- Role-based permissions supporting:
  - **Super Admin:** Global tenant platform oversight.
  - **Business Owner:** Full operational and administrative access.
  - **Manager:** Operational approvals, orders, inventory adjustments, task allocations.
  - **Accountant:** General ledger, cash transactions, invoicing, and P&L summaries.
  - **Employee:** Assigned projects, tasks, customer inquiries, and product views.

### 2. Operational Cross-Module Workflows
- **Sales & Inventory:** Confirming or fulfilling a Sales Order automatically deducts stock, records an inventory transaction, and checks for low-stock alert thresholds.
- **Cancellation & Restocking:** Cancelling a fulfilled order automatically restocks items and creates a return inventory log.
- **Procurement & Goods Receiving:** When goods are received against a Purchase Order, stock levels increment, average unit costs update, and Goods Receipt Notes (GRN) are generated without risk of duplicate reception.
- **Invoicing & Finance:** Generating an invoice links customer balances; receiving payments automatically logs an income transaction in the financial ledger and updates invoice/order payment status.
- **Projects & Kanban:** Drag-and-drop / single-click task state progressions automatically calculate real-time project percentage completion.

---

## 🔑 Demonstration Credentials

The platform includes a database seed script with sample enterprise data:
- **Organization:** Nexus Dynamics Private Limited (`NEXUS-01`)
- **Default Currency:** USD / INR (`$`, `₹`)
- **Users:**
  | Role | Email | Password |
  |---|---|---|
  | **Business Owner** | `admin@biznexus.io` | `Password123!` |
  | **Operations Manager** | `manager@biznexus.io` | `Password123!` |
  | **Accountant** | `accountant@biznexus.io` | `Password123!` |
  | **Employee** | `employee@biznexus.io` | `Password123!` |

*(One-click demo login buttons are also available directly on the login page)*

---

## 📁 Project Folder Structure

```text
biznexus-erp/
├── api/
│   └── index.js             # Vercel Serverless Function entry point
├── client/                  # React + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── api/             # Axios client with interceptors
│   │   ├── components/      # UI components (Modal, StatCard, Badge, etc.)
│   │   ├── context/         # Auth & Notification React Contexts
│   │   ├── layouts/         # MainLayout, Sidebar, TopNav
│   │   ├── pages/           # Dashboard, Inventory, Sales, CRM, Finance, etc.
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── server/                  # Node.js + Express backend
│   ├── src/
│   │   ├── config/          # Database connection (supports Atlas & Serverless)
│   │   ├── controllers/     # Business logic handlers
│   │   ├── middleware/      # JWT auth, RBAC guards, error handler
│   │   ├── models/          # 15 Mongoose schemas
│   │   ├── routes/          # Express REST endpoints
│   │   ├── seeders/         # Seed script with realistic demo data
│   │   ├── app.js           # Express app instance
│   │   └── server.js        # Local standalone HTTP server
│   └── package.json
├── vercel.json              # Vercel routing, rewrites & build configuration
├── package.json             # Root monorepo configuration
├── .gitignore               # Strict ignore rules for security
└── README.md
```

---

## ⚙️ Environment Variables Required

Create a `.env` file in the `server/` directory (or configure in Vercel Project Settings):

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `development` or `production` |
| `PORT` | Local server port | `5000` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017/biznexus_erp` or MongoDB Atlas URI |
| `JWT_SECRET` | Secret key for JWT signing | `your_super_secret_jwt_key_here` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:5173` or your Vercel URL |

---

## 💻 Instructions to Run the Project Locally

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher
- **MongoDB:** MongoDB Community Server running locally on `localhost:27017`

### 2. Clone and Install
```bash
git clone https://github.com/fabian6579/biznexus-erp.git
cd biznexus-erp

# Install dependencies for root, server, and client
npm run install:all
```

### 3. Seed Database
```bash
cd server
npm run seed
cd ..
```

### 4. Run Development Servers
Open two terminal windows:

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Running on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Running on http://localhost:5173
```

---

## 🌐 Deployment Information (Vercel)

This project is configured for one-click deployment on **Vercel**:
1. **Frontend:** Built via Vite (`npm --prefix client run build`), outputting to `client/dist`.
2. **Backend API:** Deployed as a serverless Node.js function (`api/index.js`), mapped to `/api/*` via `vercel.json`.
3. **Database:** Connected via MongoDB Atlas cloud URI configured in the Vercel Environment Variables (`MONGODB_URI`).

---

## 📸 Screenshots

*(Screenshots can be added here)*

- **Login Screen:** Clean authentication with one-click demo credentials.
- **Executive Dashboard:** Real-time KPI summary cards, revenue/expense area charts, and inventory status breakdown.
- **Inventory & Stock Management:** Real-time stock movement, SKU search, reorder alert indicators.
- **Sales Orders & Invoicing:** Complete order fulfillment lifecycle and printable invoice generation.
- **Kanban Task Board:** Project task management with workflow progression.
