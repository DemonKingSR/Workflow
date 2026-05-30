# WorkFlow: AI-Powered Employee Task & Accountability Platform

WorkFlow is a production-ready employee tracking and accountability software solution designed for small and medium businesses. It leverages AI models to verify employee work logs, assist managers in generating smart task details, and compose structured team productivity reports.

## Tech Stack
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, custom modern CSS animations.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, JSON Web Tokens (JWT).
- **Database**: PostgreSQL.
- **AI Automation**: Google Gemini API via `@google/generative-ai` with robust heuristic fallbacks.
- **Infrastructure**: Docker & Docker Compose.

---

## Quickstart

### Option A: Running with Docker Compose (Recommended)
You can launch the entire database, backend, and frontend stack in one command:
```bash
docker-compose up --build
```
This will start:
- **PostgreSQL Database** on port `5432`
- **Express Backend API** on port `5000` (http://localhost:5000)
- **Next.js Frontend Client** on port `3000` (http://localhost:3000)

The database will be automatically migrated and seeded with default roles and accounts.

### Option B: Local Manual Setup

#### 1. Setup PostgreSQL Database
Make sure you have PostgreSQL running locally, then create a database named `workflow`.

#### 2. Configure Environment Variables
Copy `.env.example` in both folders or create a root `.env` file:
```bash
cp .env.example .env
```
Provide your `GEMINI_API_KEY` for AI features (the app automatically falls back to detailed heuristic calculations if this is left blank).

#### 3. Start Backend API
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

#### 4. Start Frontend Client
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Seed Accounts (Built-in Demo Users)
You can immediately log in and explore all roles with the following preconfigured accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@workflow.com` | `AdminPass123` |
| **Manager** | `manager@workflow.com` | `ManagerPass123` |
| **Employee** | `employee@workflow.com` | `EmployeePass123` |
