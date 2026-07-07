# Multi-Tenant MERN CRM

A secure, full-featured Customer Relationship Management (CRM) system built on the MERN Stack (MongoDB, Express, React, Node.js). This application demonstrates multi-tenancy data isolation, role-based access control (RBAC), drag-and-drop Kanban sales pipeline management, support ticketing workspaces, interactive Recharts dashboard widgets, transactional notifications, and AI integrations powered by Claude (Anthropic API).

---

## Tech Stack

- **Frontend:** React (Vite), React Router v6, React Icons (`react-icons/fa`), Recharts, `@hello-pangea/dnd` (for drag-and-drop Kanban pipeline).
- **Backend:** Node.js + Express, Mongoose (MongoDB ODM).
- **Auth:** JWT-based sessions, bcrypt password hashing.
- **Email:** Nodemailer (SMTP) with mock console logging fallback.
- **AI Features:** Anthropic API (Claude Model: `claude-3-haiku-20240307`) with mock fallback heuristic engine.
- **Animations:** Pure CSS transitions.

---

## Multi-Tenancy & Data Security

Every main database collection (`User`, `Contact`, `Deal`, `Ticket`, `Note`, `Notification`) has a `companyId` reference constraint. All backend database operations are strictly scoped by the authenticated user's `companyId`. Users can only query, edit, or delete items within their own tenant workspace.

### Roles & Permissions

- **Admin:** Complete access. Can update company settings, manage users, modify roles, view all deals/tickets, and access all contact records.
- **Sales Rep:** Manage their own contacts and deals. View the company's shared pipeline. No support ticketing or user management permissions.
- **Support Agent:** Manage and resolve support tickets. View contact records. No sales deal or pipeline access.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB](https://www.mongodb.com/) (Running locally on `mongodb://127.0.0.1:27017/multi-tenant-crm` or via MongoDB Atlas URI)

### Setup Instructions

1. **Install Dependencies:**
   From the root directory, run the recursive installation script:
   ```bash
   npm run install-all
   ```

2. **Configure Environment Variables:**
   Create a `.env` file inside the `server/` directory:
   ```bash
   cp server/.env.example server/.env
   ```
   Modify `server/.env` with your values (MongoDB connection URI, JWT secrets, optional SMTP details, and Anthropic API keys). If no keys are provided, the system will use safe fallback mock engines for emails and Claude AI calls.

3. **Seed Database:**
   Run the seeding script to populate the database with mock companies, users, contacts, pipeline deals, and support tickets:
   ```bash
   npm run seed
   ```

4. **Launch Application:**
   Run both the Express backend and Vite React client concurrently from the root directory:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## Demo Credentials

The database seeder generates two company tenants with three roles per workspace. All passwords are set to `password123`.

### 1. Acme Industrial (Invite Code: `ACME12`)
- **Admin:** `alice@acme.com`
- **Sales Rep:** `bob@acme.com`
- **Support Agent:** `charlie@acme.com`

### 2. Innovate Digital (Invite Code: `INNV99`)
- **Admin:** `isaac@innovate.com`
- **Sales Rep:** `rachel@innovate.com`
- **Support Agent:** `sam@innovate.com`

---

## Folder Layout

```
multi-tenant-crm/
├── client/                 # React frontend (Vite)
│   ├── public/
│   └── src/
│       ├── components/     # Layout headers, navigation (Sidebar, Topbar)
│       ├── context/        # State wrappers & API helper (AuthContext)
│       ├── pages/          # Dashboard, Contacts, Deals, Tickets, Settings, Login, Signup
│       └── index.css       # SaaS slate-blue stylesheet & design system
├── server/                 # Express backend
│   ├── config/             # DB settings
│   ├── controllers/        # Route controllers
│   ├── middleware/         # JWT parsing & Role restrictions (auth.js)
│   ├── models/             # Mongoose Schemas (User, Company, Contact, Deal, Ticket, Note, Notification)
│   ├── routes/             # Express API Endpoints
│   ├── services/           # Claude AI & Email SMTP (aiService, emailService)
│   └── utils/              # Seeder scripts
├── package.json            # Root launcher script
└── README.md
```
