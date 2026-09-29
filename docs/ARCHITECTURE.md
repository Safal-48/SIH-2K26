# Architectural Specification: Cross-Department Service Interoperability & Orchestration Platform

> **Product Concept**  
> *"Connect, orchestrate and monitor — without replacing existing systems."*

> **SIH 2026 Prototype Notice & Academic Disclaimer**  
> This software is an architectural prototype developed for the Smart India Hackathon (SIH 2026). It demonstrates cross-department interoperability, canonical data abstraction, deterministic exception recovery, and citizen consent workflows.  
> **This platform does NOT connect to live government databases.** All departmental endpoints are local mock simulators, authentication/RBAC is a prototype demonstration, retry/queuing operates via deterministic simulation, and all citizen/financial records are synthetic demo profiles.

---

## 1. Executive Summary & Architectural Motivation

Government service delivery (e.g. merit scholarship disbursement, welfare pensions, subsidy verification) is hindered by severe departmental data fragmentation:
- **Departmental Silos**: Education, Revenue, and Banking departments operate autonomous, heterogeneous databases with divergent field naming, data types, and legacy protocols.
- **Citizen Burden**: Citizens are repeatedly forced to obtain, photocopy, and submit physical certificates from one government agency to prove credentials to another.
- **Brittle Point-to-Point Integrations**: Traditional attempts to link departments through custom one-to-one APIs create tight coupling, cascade single-point-of-failure outages, and require expensive legacy migrations.

**The Solution**: An asynchronous, consent-driven mediation tier that connects existing systems as-is, standardizes outputs into a unified canonical model, guarantees resilient workflow progress, and presents a single unified journey to the citizen.

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TIER 1: PRESENTATION LAYER (SPA)                         │
│  React 18 + Vite + Tailwind CSS + Lucide Icons + Recharts Data Viz          │
│                                                                             │
│  [ Citizen Portal ]          [ Admin Control Center ]     [ Workflow Builder]│
│  - Application Form          - Service Health & Latency   - Visual Topology │
│  - Consent Grant Screen      - Live Operational Stream    - Step Toggles    │
│  - Unified 7-Stage Timeline  - Exception Recovery Queue   - Dynamic Versioning│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST / JWT Bearer
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    TIER 2: API GATEWAY & SECURITY LAYER                     │
│  Express.js + Helmet Security Headers + CORS Policies + Morgan Logging      │
│                                                                             │
│  [ Authentication ]     [ RBAC Guard ]         [ Validation Tier ]          │
│  - JWT Verification     - Role Boundaries      - Zod Request Schemas        │
│  - Session Profile      - Ownership Guard      - Sanitized Error Contracts  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│            TIER 3: INTEROPERABILITY CORE & ORCHESTRATION ENGINE             │
│                                                                             │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌────────────────────┐ │
│  │    Workflow Engine    │ │  Data Mapper Engine  │ │   Consent Guard    │ │
│  │  - 7-Stage Pipeline   │ │  - Schema Converter  │ │ - Purpose Bound    │ │
│  │  - DB Topology Driven │ │  - Type Coercion     │ │ - Scope Enforcement│ │
│  │  - Dynamic Skipping   │ │  - Prototype-Safe    │ │ - Audit Verification│ │
│  └───────────┬───────────┘ └──────────┬───────────┘ └─────────┬──────────┘ │
│              │                        │                       │             │
│  ┌───────────▼───────────┐ ┌──────────▼───────────┐ ┌─────────▼──────────┐ │
│  │   Exception Manager   │ │  Telemetry & Metrics │ │ Notification Engine│ │
│  │  - Exponential Retry  │ │  - Real-time Latency │ │ - Citizen Feeds    │ │
│  │  - Dead-Letter Queue  │ │  - SLA Breach Alerts │ │ - Zero Tech Leak   │ │
│  │  - Resilient Resume   │ │  - Service Health    │ │ - 9 Event Types    │ │
│  └───────────────────────┘ └──────────────────────┘ └────────────────────┘ │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Standardized Connector Interface
┌──────────────────────────────────────▼──────────────────────────────────────┐
│               TIER 4: CONNECTOR ABSTRACTION LAYER (ADAPTERS)                │
│                                                                             │
│  [ Education Adapter ]   [ Income Adapter ]  [ Bank / DBT Adapter ]  [Legacy]│
│  - Type: REST            - Type: REST        - Type: REST / SANDBOX  - SOAP  │
│  - Academic Depository   - Revenue Tehsils   - PFMS / NPCI Bridge    - Mainframe│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Parameterized SQL Pool
┌──────────────────────────────────────▼──────────────────────────────────────┐
│               TIER 5: RELATIONAL DATA GRID (POSTGRESQL)                     │
│  Native PostgreSQL Pool / Embedded PGlite Storage Engine (database/pgdata)   │
│                                                                             │
│  - citizens            - applications         - workflow_steps              │
│  - education_records   - income_records       - bank_records                │
│  - consents            - api_services         - api_requests                │
│  - audit_logs          - notifications        - workflow_definitions        │
│  - workflow_def_steps  - data_mappings        - field_data_mappings         │
│  - users                                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Architectural Subsystems

### 3.1 Connector Abstraction Layer
The connector tier isolates external departmental transport protocols from internal orchestration logic:
- **Interface Contract**: Every connector implements `execute(requestPayload, options)` and returns either a `{ success: true, data: normalizedPayload, latencyMs }` or a standardized failure `{ success: false, status: 'FAILED', errorCode, retryable: boolean, latencyMs }`.
- **Supported Protocols**:
  - `REST`: Standard JSON over HTTP (Education, Income, Bank endpoints).
  - `LEGACY`: SOAP/XML terminal emulation with punchcard record mapping.
  - `MOCK`: In-process deterministic mock generator.
  - `SANDBOX`: Safe DBT clearing sandbox with mock settlement logic.

### 3.2 Canonical Data Model & Mapping System
Heterogeneous department outputs are mapped to standardized schema models via `DataMapperService`:
- **Direct Mapping**: Preserves unique department identifiers (`student_id` -> `studentId`).
- **Data Coercion**: Normalizes divergent representations (e.g. currency string `"₹1,80,000.00"` -> numeric `180000.00`).
- **Boolean Normalization**: Converts string indicators (`"MATCH"` or `"Y"`) into strict boolean `true`.
- **Security Guardrails**: Enforces prototype pollution guards and filters extraneous unmapped fields to prevent contamination.

### 3.3 Database-Driven Workflow Engine
Workflows are not hardcoded in JavaScript; they are dynamically loaded from PostgreSQL:
- **Topologies**: Defined in `workflow_definitions` and `workflow_definition_steps`.
- **Dynamic Configuration**: Steps can be toggled on/off (`is_enabled: false`), causing the engine to dynamically mark steps as `SKIPPED` without requiring code redeployment.
- **Versioning**: Creating a new version clones existing step definitions into an isolated version namespace (e.g. `1.0.0` -> `2.0.0`). Once marked active, subsequent submissions execute the new topology.

### 3.4 Consent-Driven Data Exchange
The platform adheres to strict data privacy principles:
- **Purpose Limitation**: Consent records in `consents` define exact authorized departments (`['EDU', 'REV', 'DBT']`) and valid expiration dates.
- **Execution Gatekeeper**: If a citizen has not explicitly granted consent, or revokes it, the workflow engine strictly aborts multi-department data lookups with HTTP 403 `CONSENT_REQUIRED`.

---

## 4. End-to-End Workflow State Machine

```
              ┌───────────────────────────────┐
              │    1. Application Received    │  (Citizen Submits SCH-2026-XXX)
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │    2. Education Verification  │  (Connects to Higher Edu Registry)
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │     3. Income Verification    │  (Connects to Revenue Dept)
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │     4. Bank / DBT Verification│
              └───────┬───────────────┬───────┘
    [API Healthy]     │               │  [API Outage / 503 Timeout]
                      ▼               ▼
                      │       ┌───────────────────────────────┐
                      │       │ 4a. Exponential Backoff Retry │ (Up to 3 Retries)
                      │       └───────────────┬───────────────┘
                      │                       ▼
                      │       ┌───────────────────────────────┐
                      │       │ 4b. Step Marked as QUEUED     │ (Preserved in DB)
                      │       └───────────────┬───────────────┘
                      │                       ▼
                      │       ┌───────────────────────────────┐
                      │       │ 4c. Citizen Notification Sent │ ("Verification In Queue")
                      │       └───────────────┬───────────────┘
                      │                       ▼
                      │       ┌───────────────────────────────┐
                      │       │ 4d. Admin Recovers Bank API   │ (Control Center Action)
                      │       └───────────────┬───────────────┘
                      │                       ▼
                      │       ┌───────────────────────────────┐
                      │       │ 4e. Admin Retry / Auto-Resume │ (NO Citizen Resubmission)
                      │       └───────────────┬───────────────┘
                      │                       │
                      ▼◄──────────────────────┘
              ┌───────────────────────────────┐
              │     5. Eligibility Check      │  (Automated Rules Evaluation)
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │      6. Officer Review        │  (Departmental Approval Gate)
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │       7. Completion           │  (Benefit Sanctioned & Disbursed)
              └───────────────────────────────┘
```

---

## 5. Failure Recovery & Zero-Resubmission Model

When external departmental services suffer outages (e.g. Bank DBT server down with 503):
1. **Idempotent Preservation**: Steps 1, 2, and 3 remain marked `SUCCESS` in PostgreSQL. Their execution timestamps, payloads, and results are never discarded.
2. **Queued Dead-Letter Entry**: Step 4 captures the retryable failure, attempts 3 automated retries, and transitions to status `QUEUED`.
3. **Citizen Transparency**: The citizen's timeline displays `Action Required / In Queue` with citizen-safe language. The citizen is not asked to resubmit.
4. **Resilient Recovery**: Once the bank endpoint is restored, an admin or automated daemon triggers `POST /api/exceptions/:id/retry`. The engine resumes execution from Step 4 onward, leaving prior steps untouched.

---

## 6. Security, Privacy & Audit Hardening

1. **Role-Based Access Control (RBAC)**:
   - Server-side middleware verifies roles on every protected endpoint.
   - Citizens attempting to access `/api/admin/*`, `/api/services/*`, or `/api/exceptions/*` receive HTTP 403 Forbidden.
   - Departmental officers are restricted to their respective queues (e.g. Education Officer cannot access Revenue cases).
   - Citizen resource ownership checks ensure Citizen A cannot view Citizen B's application.
2. **Zero Technical Leakage**:
   - Citizen notification messages and timeline statuses suppress raw database errors, stack traces, IP addresses, and internal microservice endpoints.
3. **Data Masking & Synthetic Profiles**:
   - All Aadhaar references use tokenized Virtual IDs (`VID-9901-XXXX-XXXX`).
   - Phone numbers are masked (`+91-XXXXX-98765`).
   - Bank accounts are masked (`XXXX-XXXX-4421`).
4. **Immutable Audit Trail**:
   - Every login, application submission, duplicate block, connector dispatch, consent grant, and admin action writes an append-only row to `audit_logs`.
