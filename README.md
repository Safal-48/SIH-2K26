# Cross-Department Service Interoperability & Orchestration Platform

[![Platform Status](https://img.shields.io/badge/Platform-Operational-emerald?style=for-the-badge)](http://localhost:5000/api/v1/health)
[![Architecture](https://img.shields.io/badge/Architecture-Modular_Monolith-blue?style=for-the-badge)](docs/ARCHITECTURE.md)
[![SIH 2026](https://img.shields.io/badge/Smart_India_Hackathon-2026_Prototype-orange?style=for-the-badge)](https://sih.gov.in)

> **Product Concept**  
> *"Connect, orchestrate and monitor — without replacing existing systems."*

---

> [!IMPORTANT]
> **SIH 2026 PROTOTYPE NOTICE & ACADEMIC DISCLAIMER**  
> This software is an architectural proof-of-concept developed specifically for the **Smart India Hackathon (SIH 2026)**.  
> - **The prototype does NOT claim or attempt real government integration.**
> - **Departmental APIs** (Higher Education, Revenue, Bank DBT) are local mock simulators replicating realistic government payload contracts and outage conditions.
> - **Authentication & RBAC** are prototype demonstrations utilizing signed JSON Web Tokens (JWT) and role guards.
> - **Retry & Queuing** are local deterministic simulations demonstrating reliable dead-letter and backoff mechanics.
> - **Eligibility Assessment** is demo rules-engine logic for scholarship qualification.
> - **Audit & Monitoring** are prototype-grade operational telemetry feeds.
> - **Legacy Connector** is a simulated protocol translator demonstrating adaptation of legacy/SOAP records into modern canonical models.
> - **All data is synthetic**: Citizen names, tokenized Aadhaar Virtual IDs (`VID-XXXX`), masked phones, and masked bank accounts are dummy test profiles. Zero real citizen data exists.

---

## 1. What the Platform Does

The **Cross-Department Service Interoperability & Orchestration Platform** serves as a secure, consent-driven mediation tier linking heterogeneous government departments. For complex citizen services—such as the **Post-Matric Merit-cum-Means Scholarship**—the platform:
- Collects five canonical references from the citizen (Citizen ID, Student ID, Institution Code, Income Certificate No, Bank Account Reference).
- Captures an immutable electronic consent artifact before initiating any external data query.
- Coordinates asynchronous background verification across the **Higher Education Registry**, **Revenue Department**, and **PFMS / Bank DBT Bridge**.
- Translates divergent departmental payloads into a standardized canonical model.
- Provides **deterministic exception handling** with automated retry and queueing when a departmental service fails.
- Enables **administrative recovery without citizen resubmission**—previously completed steps are never repeated.
- Presents a single unified 7-stage visual timeline to the citizen with zero internal technical leakage.
- Offers platform administrators an **Operational Control Center**, **Service Health Monitor**, **Dynamic Workflow Builder**, and **Immutable Audit Trail**.

---

## 2. Why It Exists (The Problem Solved)

Government service delivery currently suffers from systemic data fragmentation:
1. **Departmental Silos**: Education boards, revenue tehsils, and banking portals operate completely separate databases with zero standardized communication.
2. **Citizen Administrative Burden**: Citizens must physically visit government offices, obtain signed paper certificates, photocopy them, and stand in queues to prove eligibility.
3. **High Rejection & Resubmission Rates**: When an external verification fails (e.g. temporary core banking timeout), traditional portals cancel the application, forcing citizens to start from scratch.
4. **Brittle Point-to-Point Architecture**: Custom one-off integrations between departments are fragile, insecure, and prohibitively expensive to maintain.

**Our Approach**: Rather than attempting the impossible task of replacing legacy government databases, our platform acts as an **interoperability overlay**—connecting existing systems as-is, translating data formats in-flight, guaranteeing resilient execution, and enforcing citizen privacy through electronic consent.

---

## 3. High-Level Architecture

The platform is designed as an enterprise-grade **Modular Monolith** to maximize development velocity, reliability, and local operational independence:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PRESENTATION TIER (Single Page App)                  │
│       React 18 • Vite • Tailwind CSS • Lucide Icons • Recharts         │
│     [ Citizen Portal ]  [ Admin Control Center ]  [ Workflow Builder ] │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / Bearer JWT
┌───────────────────────────────────▼────────────────────────────────────┐
│                    API GATEWAY & SECURITY TIER                         │
│         Express.js • Helmet • CORS • Zod Request Schemas               │
│     [ Authentication ]  [ Role-Based Access Guard ]  [ Audit Logger ]  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  INTEROPERABILITY CORE & ORCHESTRATOR                  │
│     ├── Workflow Engine (7-stage state machine loaded from DB)         │
│     ├── Data Mapper (Heterogeneous -> Canonical schema transformation) │
│     ├── Consent Guard (Purpose & scope validation gatekeeper)          │
│     ├── Exception Manager (Exponential backoff & recovery queue)       │
│     └── Telemetry & SLA Engine (Real-time latency & breach alerts)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Standard Connector Interface
┌───────────────────────────────────▼────────────────────────────────────┐
│                    CONNECTOR ABSTRACTION ADAPTERS                      │
│     [ Education (REST) ]  [ Income (REST) ]  [ Bank/DBT (REST/SBX) ]   │
│     [ Legacy Mainframe / SOAP Translator ]                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Parameterized SQL Pool
┌───────────────────────────────────▼────────────────────────────────────┐
│                 RELATIONAL PERSISTENCE GRID (PostgreSQL)               │
│     Native PostgreSQL Pool OR Embedded PGlite (database/pgdata)        │
│     15 Tables • Audit Logs • Workflow Topologies • Consents • Users    │
└────────────────────────────────────────────────────────────────────────┘
```

For complete architectural diagrams, state machine specifications, and security design, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 4. System Requirements & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Operating System**: Windows, macOS, or Linux

### Installation Commands

Clone the repository and install all root, backend, and frontend dependencies:

```bash
# Clone the repository
git clone <repository-url>
cd "SIH 2026"

# Install all workspace dependencies across root, backend, and frontend
npm run install:all
```

---

## 5. PostgreSQL Database Configuration

The platform features a **dual-engine PostgreSQL connection architecture** ([`backend/src/config/database.js`](backend/src/config/database.js)):
1. **Embedded PostgreSQL Engine (PGlite)**: Activated automatically with zero external setup required! Database files are persisted on disk at [`database/pgdata`](database/pgdata).
2. **Native PostgreSQL Server (Optional)**: If you prefer connecting to a native PostgreSQL server, configure your credentials in `backend/.env`.

### Environment Variables (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=super_secret_interop_jwt_key_2026_demo_sih
JWT_EXPIRES_IN=24h

# Optional Native PostgreSQL settings (fallback to embedded PGlite if offline)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interop_db
DB_USER=postgres
DB_PASSWORD=postgres
```

---

## 6. Database Provisioning & Seed Data

Initialize the 15-table relational schema and populate deterministic demo records:

```bash
# Provision schema and seed demo records
npm run db:setup

# Or reset database to a pristine baseline
npm run db:reset
```

Verified schema entities:
`citizens`, `applications`, `workflow_steps`, `education_records`, `income_records`, `bank_records`, `consents`, `api_services`, `api_requests`, `audit_logs`, `notifications`, `workflow_definitions`, `workflow_definition_steps`, `data_mappings`, `field_data_mappings`, `users`.

---

## 7. Starting Backend & Frontend

### Quick Start (Both Servers Concurrently)
```bash
npm run dev
```

### Or Start Individually in Separate Terminals:
```bash
# Terminal 1: Backend API Gateway (Port 5000)
npm --prefix backend run dev

# Terminal 2: Frontend Vite Development Server (Port 5173)
npm --prefix frontend run dev
```

- **Citizen Portal**: [http://localhost:5173/portal](http://localhost:5173/portal)
- **Admin Control Center**: [http://localhost:5173/admin](http://localhost:5173/admin)
- **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 8. Demo Accounts

All demo accounts use the standard password: `demo123`

| Username | Role | Full Name | Primary Screen & Access |
|---|---|---|---|
| `citizen` | `CITIZEN` | Aarav Sharma | Citizen Dashboard, Application Form, Consent Screen, Timeline |
| `admin` | `ADMIN` | Platform Admin | Admin Control Center, Workflow Builder, Service Registry, Demo Controls |
| `edu_officer` | `EDUCATION_OFFICER` | Dr. Ramesh Kumar | Higher Education Department Review Queue |
| `rev_officer` | `REVENUE_OFFICER` | Smt. Sunita Devi | Revenue & Caste/Income Certificate Queue |
| `bank_officer` | `BANK_DBT_OFFICER` | Vikram Malhotra | PFMS & NPCI DBT Beneficiary Clearing Queue |

---

## 9. 5-Minute SIH 2026 Judge Demonstration Guide

The demo is optimized to run smoothly within a **3 to 5 minute** hackathon presentation:

| Time | Stage | Action & Key Narrative |
|---|---|---|
| **0:00** | **Citizen Dashboard** | Navigate to `http://localhost:5173/portal`. Click **Quick Login as Citizen (Aarav Sharma)**. Point out clean citizen view, active applications, and masked PII. |
| **0:30** | **Application Submission** | Click **Apply for Scholarship**. Form auto-fills the 5 required cross-department identifiers. Click **Submit Application**. Application `SCH-2026-XXX` is created with HTTP 201. |
| **1:00** | **Consent & Verification** | Citizen grants explicit digital consent for EDU, REV, and DBT queries. Click **Authorize & Initiate Verification**. Watch Education (CGPA 8.75) and Income (₹1,80,000) verify electronically. |
| **1:30** | **Simulate Bank Failure** | In a second tab (`/admin/demo`), click **Fail Bank API (503 Outage)**. Return to Citizen tab. |
| **2:00** | **Retry, Queue & Notification** | Watch Bank verification attempt 3 automatic backoff retries, then gracefully transition to **QUEUED** status. Notification *"Verification In Queue"* is emitted. **Emphasize: Zero technical leakage, no crash, no citizen resubmission.** |
| **2:30** | **Admin Service Recovery** | Switch to `/admin/demo` and click **Recover Bank API**. The service restores to HEALTHY and triggers background retry. |
| **3:00** | **Resumed Workflow Completion** | Refresh Citizen Timeline: Bank verification succeeds, Eligibility Check evaluates, Officer Approval clears, and Status moves to **COMPLETED / BENEFIT SANCTIONED**. Prior steps 1–3 were never repeated! |
| **3:30** | **Admin Control Center** | Navigate to `http://localhost:5173/admin`. Show real-time KPI cards, live departmental service health indicators, and real measured latencies (ms). |
| **4:00** | **Audit Trail & Data Mappings** | Navigate to `/admin/mappings`. Show how currency strings (`"₹1,80,000.00"` -> `180000`) and boolean indicators are normalized without modifying external department databases. Inspect immutable audit trail. |
| **4:30** | **Dynamic Workflow Builder** | Navigate to `/admin/workflows/builder`. Show how pipeline topologies are stored in PostgreSQL. Demonstrate toggling a step off or cloning an immutable version (`v2.0.0`) without code changes. |
| **5:00** | **Closing Concept** | Conclude with core product philosophy: *"Connect, orchestrate and monitor — without replacing existing systems."* |

---

## 10. Golden Path (Step-by-Step Flow)

```
Citizen: Aarav Sharma [CZN-1001]
  ↓
Submit Application [SCH-2026-001]
  ↓
Step 1: Application Received [HTTP 201]
  ↓
Grant Digital Consent [CNS-8801]
  ↓
Step 2: Education Verification [National Academic Depository — CGPA: 8.75] ✓
  ↓
Step 3: Income Verification [Revenue Dept — Income: ₹1,80,000.00] ✓
  ↓
Step 4: Bank / DBT Verification [PFMS & NPCI — Aadhaar Seeded: Active] ✓
  ↓
Step 5: Eligibility Check [Rules Engine: Income < ₹2.5L & CGPA > 6.0] ✓
  ↓
Step 6: Officer Approval [Departmental Sanction Cleared] ✓
  ↓
Step 7: Completion [Benefit Sanctioned: ₹25,000.00] ✓
```

---

## 11. Failure & Recovery Path (Step-by-Step Flow)

```
Citizen Submits Application [SCH-2026-002]
  ↓
Steps 1, 2, 3: Completed Successfully [State Persisted in PostgreSQL] ✓
  ↓
Step 4: Bank / DBT Outage Encountered [HTTP 503 CORE_BANKING_TIMEOUT] ⚠
  ↓
Automated Exponential Retry Triggered [Attempt 1, Attempt 2, Attempt 3]
  ↓
Retry Limit Reached → Step Transitions to QUEUED [Preserved in Dead-Letter Queue]
  ↓
Citizen Notification Dispatched: "Verification In Queue — No Action Required"
  ↓
Admin Control Center: Outage Detected → Service Recovered to HEALTHY
  ↓
Admin Exception Action: Execute Retry (POST /api/exceptions/:id/retry)
  ↓
Step 4 Retried & Succeeded [Attempts: 4]
  ↓
Workflow Resumes Automatically → Steps 5, 6, 7 Completed Successfully!
  (Steps 1–3 were NEVER restarted or duplicated)
```

---

## 12. Verification & Automated Test Suites

The repository contains 14 automated verification suites validating all platform layers:

```bash
# Run the complete automated test suite (14/14 suites in sequence)
npm test

# Run the official 5-minute SIH 2026 Judge Demonstration script
npm run demo

# Or run individual verification suites:
npm --prefix backend run test:mock          # Mock Departmental APIs contract validation
npm --prefix backend run test:connectors    # Connector Abstraction Layer (REST, LEGACY, MOCK, SBX)
npm --prefix backend run test:mapper        # Canonical Data Normalization & Prototype Guard
npm --prefix backend run test:workflow      # Core Workflow Engine & State Machine
npm --prefix backend run test:auth          # JWT, Session Context & RBAC Security Guards
npm --prefix backend run test:lifecycle     # 10-point Application Lifecycle & Duplicate Gate
npm --prefix backend run test:timeline      # Unified Citizen Timeline & 0-Resubmission Model
npm --prefix backend run test:admin         # Admin Control Center KPIs, Health & Audit Trail
npm --prefix backend run test:exceptions   # Bank Outage, Retry Backoff & Dead-Letter Queue
npm --prefix backend run test:notifications # Notification Feeds & Live SLA Alert Engine
npm --prefix backend run test:builder       # PostgreSQL-Driven Dynamic Workflow Builder
npm --prefix backend run test:step15        # Service Registry & Canonical Field Mappings
npm --prefix backend run test:step16        # 7-Scenario Interactive Demo Controls
npm --prefix backend run test:step17        # Security, Validation & Stack Trace Sanitization
```

---

## 13. Known Limitations & Prototype Boundaries

1. **Simulated Departmental Networks**: Departmental endpoints are hosted on the local Express instance to allow offline, reproducible testing. Real-world deployment would connect through secure virtual private clouds (VPCs) or national API gateways.
2. **In-Memory Queue Simulation**: The current queueing mechanism records queued tasks directly in PostgreSQL `workflow_steps` with atomic transitions. In enterprise production, this would be paired with distributed message queues (e.g. Apache Kafka or RabbitMQ).
3. **Synthetic PII Data**: All citizens, virtual Aadhaar IDs, and bank account numbers are dummy test values to ensure zero privacy or data compliance risks.
4. **Mock Payment Disbursement**: Sanctioned scholarship amounts trigger database status updates rather than actual interbank RTGS/NEFT transfers.

---

## 14. Documentation Links

- **API Documentation**: [`docs/API.md`](docs/API.md) — Exhaustive endpoint listings, JSON schemas, status codes, and test payloads.
- **Architecture Specification**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 4-tier structural design, state machines, and data models.
