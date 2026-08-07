<div align="center">

# 💳 ReimburseMe

### **Modern Expense Recovery, Automated Debt Tracking & Instant Group Settlement Platform**

[![Next.js](https://img.shields.io/badge/Next.js-15+-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>ReimburseMe</b> solves the chaos of shared expenses, split bills, and delayed reimbursements. Built for freelancers, flatmates, teams, and peer groups to track who owes what, automatically parse receipt documents, and settle debts instantly via dynamic UPI payment links.
</p>

</div>

---

## 📑 Table of Contents
- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🧩 Database Entity Model](#-database-entity-model)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Project Directory Structure](#-project-directory-structure)
- [🚀 Quick Start & Installation](#-quick-start--installation)
- [⚙️ Environment Variables](#️-environment-variables)
- [🔐 Security & Data Privacy](#-security--data-privacy)

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🧾 **Multi-Format Receipt Ingestion** | Extract transactions effortlessly from PDF bank statements, utility invoices, and CSV/Excel sheets using embedded `pdfjs-dist`, `pdf-parse`, `papaparse`, and `xlsx` parsers. |
| 👥 **Smart Peer Split & Debt Ledger** | Tag group members or friends on individual transactions. The core calculation engine accurately computes fractional obligations, advances, and running debt balances. |
| ⚡ **Instant UPI QR Settlement** | Generate zero-friction, pre-filled UPI payment links (`upi://pay?pa=...&am=...`) and on-the-fly QR codes rendered via `qrcode` for rapid settling in Indian Rupees (₹). |
| 📊 **Interactive Cashflow Analytics** | Real-time interactive charts powered by **Recharts** displaying income vs. expense curves, category-wise spending pies, and monthly reimbursement timelines. |
| 🏦 **Multi-Account Treasury Vault** | Track multiple savings accounts, credit cards, and cash wallets with balance threshold monitoring and target reserve warnings. |
| 🏷️ **Categorization & Label Rules** | Automatic rule-based categorization (Food, Travel, Rent, Utilities, Subscriptions) with custom personal tags for clean financial bookkeeping. |
| 🔔 **Automated Settlement Reminders** | Integrated transactional email notifications powered by **Resend** to send friendly, automated settlement summaries and debt nudges. |
| 🌓 **Adaptive Glassmorphic Theme** | Polished UI built with Radix UI, Framer Motion micro-interactions, Lucide icons, and persistent Dark/Light mode support. |

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Presentation Layer - Next.js 15 App Router"]
        UI["Modern Responsive UI (Tailwind CSS v4 / Radix UI / Lucide)"]
        State["State Management (Zustand Stores / TanStack React Query v5)"]
        Charts["Analytics Engine (Recharts / Framer Motion Animations)"]
    end

    subgraph ServerLayer ["Backend & Edge API Layer - Server Actions & Routes"]
        AuthMiddleware["Supabase SSR Auth Guard (middleware.ts)"]
        
        subgraph Endpoints ["REST API & Action Routes"]
            TxnRoute["/api/transactions (CRUD / Split Tagging)"]
            ImportRoute["/api/import (PDF / CSV / Statement Engine)"]
            SettlementRoute["/api/settlements (UPI QR & Reconciliation)"]
            PeopleRoute["/api/people (Peer Directory & Balances)"]
            AnalyticsRoute["/api/analytics (Cashflow Aggregator)"]
        end
        
        subgraph ParserEngine ["Document Processing Pipeline"]
            PDFParser["PDF Parser (pdf-parse / unpdf / pdfjs-dist)"]
            SheetParser["Spreadsheet Parser (PapaParse / XLSX)"]
        end
    end

    subgraph DataServices ["Database & External Cloud Services"]
        PrismaORM["Prisma Client ORM"]
        SupabaseDB[("Supabase PostgreSQL Database (Row Level Security)")]
        ResendEmail["Resend API (Transactional Reminder Dispatch)"]
        UPIEngine["Dynamic UPI Payment & QR Generator"]
    end

    UI --> State
    State --> AuthMiddleware
    AuthMiddleware --> Endpoints
    ImportRoute --> ParserEngine
    Endpoints --> PrismaORM
    PrismaORM --> SupabaseDB
    SettlementRoute --> UPIEngine
    SettlementRoute --> ResendEmail
```

---

## 🧩 Database Entity Model

The core relational architecture managed by **Prisma** on **Supabase PostgreSQL**:

```text
  ┌──────────────┐       1:N       ┌──────────────┐
  │     User     ├─────────────────►│   Account    │
  └──────┬───────┘                 └──────┬───────┘
         │                                │
         │ 1:N                            │ 1:N
         ▼                                ▼
  ┌──────────────┐       1:N       ┌──────────────┐
  │    Person    ├─────────────────►│ Transaction  │
  └──────┬───────┘                 └──────┬───────┘
         │                                │
         │ 1:N                            │ 1:N
         ▼                                ▼
  ┌──────────────┐                 ┌──────────────┐
  │  DebtRecord  │                 │  Settlement  │
  └──────────────┘                 └──────────────┘
```

- **`User`**: Account owner profile with authentication linkage (`auth.users.id`), global currency, and reminder intervals.
- **`Account`**: Bank accounts, digital wallets, and cards with live, opening, and target reserve balances.
- **`Transaction`**: Unified ledger records with amounts, categories, receipt attachments, and directional flow (Income/Expense/Transfer).
- **`Person`**: Friends, colleagues, and flatmates associated with split transactions and aggregate balances.
- **`DebtRecord`**: Granular debt obligations pinpointing exact amounts owed between individuals per transaction.
- **`Settlement`**: Immutable settlement records with payment confirmation, method (UPI / Cash / Bank Transfer), and timestamp.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, Server Components, Route Handlers)
- **Frontend Library**: [React 19](https://react.dev/)
- **Styling & Theming**: [Tailwind CSS v4](https://tailwindcss.com/), [next-themes](https://github.com/pacocoursey/next-themes)
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [shadcn/ui](https://ui.shadcn.com/), [Lucide Icons](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/), [TanStack React Query v5](https://tanstack.com/query/latest)
- **Database & ORM**: [Supabase PostgreSQL](https://supabase.com/), [Prisma ORM](https://www.prisma.io/)
- **Authentication**: Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`)
- **Document Extractors**: `pdfjs-dist`, `pdf-parse`, `unpdf`, `xlsx`, `papaparse`
- **Email Service**: [Resend](https://resend.com/)
- **Charts**: [Recharts](https://recharts.org/)

---

## 📂 Project Directory Structure

```text
reimburse-me/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Authentication route group (Login / Register / Verify)
│   ├── api/                     # REST API Route Handlers
│   │   ├── accounts/            # Bank account endpoints
│   │   ├── analytics/           # Financial reporting & aggregations
│   │   ├── categories/          # Transaction category management
│   │   ├── debts/               # Outstanding debt calculation routes
│   │   ├── import/              # Document parser & extraction endpoints
│   │   ├── people/              # Peer directory & profile routes
│   │   ├── settlements/         # Settlement verification & QR generation
│   │   └── transactions/        # Core ledger transaction endpoints
│   ├── dashboard/               # Main application views
│   │   ├── accounts/            # Bank account vault
│   │   ├── analytics/           # Deep-dive financial reports & charts
│   │   ├── debts/               # Debt matrix & settlement interface
│   │   ├── people/              # People management view
│   │   ├── personal/            # Personal finance tracker
│   │   ├── reports/             # Exportable statement reports
│   │   └── transactions/        # Transaction explorer & manual log
│   ├── globals.css              # Global styles & Tailwind design tokens
│   └── layout.tsx               # Root layout with Query & Theme providers
├── components/                  # Reusable UI component library
│   ├── layout/                  # Navigation bar, sidebar, and headers
│   └── ui/                      # Radix UI / shadcn base components
├── lib/                         # Core utilities & service clients
│   ├── categorize.ts            # Rule-based transaction categorization
│   ├── prisma.ts                # Prisma singleton instance
│   └── supabase/                # Supabase browser and server SSR clients
├── prisma/                      # Database schema & migrations
│   └── schema.prisma            # PostgreSQL relational schema
├── store/                       # Client Zustand state stores
├── types/                       # Shared TypeScript interfaces & models
├── .env.local.example           # Environment template
└── package.json                 # Project dependencies & scripts
```

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **npm** / **pnpm** / **yarn**
- A **Supabase** account ([supabase.com](https://supabase.com))

### 2. Clone the Repository
```bash
git clone https://github.com/adithyen/reimburse-me.git
cd reimburse-me
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
Fill in your Supabase connection strings and API keys (see [Environment Variables](#️-environment-variables)).

### 5. Push Database Schema
Sync the Prisma schema directly to your Supabase PostgreSQL instance:
```bash
npx prisma db push
```

### 6. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory:

```env
# ---- Supabase Configuration ----
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# ---- Application URL ----
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ---- Transactional Email (Optional) ----
RESEND_API_KEY="re_your_resend_api_key"
FROM_EMAIL="noreply@reimburse.me"
```

---

## 🔐 Security & Data Privacy

- **Row Level Security (RLS)**: Enforced via Supabase to ensure users can strictly access only their own transactions, accounts, and contact ledgers.
- **Server-Side Token Verification**: All API endpoints authenticate incoming JWTs through `@supabase/ssr` before executing operations.
- **Zero Raw Account Exposure**: Bank account numbers are strictly stored masked (last 4 digits only).
- **Environment Isolation**: Live database secrets are never exposed on the client bundle; all public tokens are scoped to safe anonymous permissions.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

<div align="center">
  <b>Built with ❤️ by <a href="https://github.com/adithyen">Adithyan H</a></b>
</div>
