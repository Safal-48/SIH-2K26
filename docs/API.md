# Cross-Department Service Interoperability & Orchestration Platform — API Specification

> **SIH 2026 Prototype Notice & Academic Disclaimer**  
> This software is an architectural prototype developed for the Smart India Hackathon (SIH 2026). It demonstrates cross-department interoperability, canonical data abstraction, deterministic exception recovery, and citizen consent workflows.  
> **This platform does NOT connect to live government databases.** All departmental endpoints are local mock simulators, authentication/RBAC is a prototype demonstration, retry/queuing operates via deterministic simulation, and all citizen/financial records are synthetic demo profiles.

---

## 1. Gateway & Base URLs

- **API Gateway Base**: `http://localhost:5000/api/v1`
- **Direct Legacy & Mock Mount**: `http://localhost:5000/api`
- **Frontend Reverse Proxy**: `http://localhost:5173/api` (proxied to backend port `5000`)
- **Protocol**: HTTP/1.1 REST + JSON
- **Authentication**: Bearer JWT tokens in `Authorization: Bearer <TOKEN>` header

---

## 2. Canonical Envelope Format

All platform endpoints adhere to predictable JSON structures.

### 2.1 Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "total": 1,
    "timestamp": "2026-09-28T04:00:00.000Z"
  },
  "timestamp": "2026-09-28T04:00:00.000Z"
}
```

### 2.2 Error Response (`400`, `401`, `403`, `404`, `409`, `500`)
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "MISSING_REQUIRED_FIELD",
    "message": "Missing required application identifier(s): student_id",
    "details": {
      "missingFields": ["student_id"]
    }
  },
  "timestamp": "2026-09-28T04:00:00.000Z"
}
```

---

## 3. Demo Accounts & Role-Based Access Control (RBAC)

All demo accounts share the password: `demo123`

| Username | Role | Department | Description & Permissions |
|---|---|---|---|
| `citizen` | `CITIZEN` | `CITIZEN` | Aarav Sharma (`CZN-1001`). Can apply, grant consent, inspect own timeline & notifications. |
| `admin` | `ADMIN` | `ADMIN` | Platform Orchestrator. Unrestricted access to Dashboard, Exceptions, Workflow Builder, Demo Controls. |
| `edu_officer` | `EDUCATION_OFFICER` | `EDU` | Higher Education Officer. Can view and review academic verification queues. |
| `rev_officer` | `REVENUE_OFFICER` | `REV` | Revenue / Tehsil Officer. Can review income certificate verification queues. |
| `bank_officer` | `BANK_DBT_OFFICER` | `DBT` | PFMS / NPCI DBT Officer. Can review bank seeding & disbursement queues. |
| `system` | `SYSTEM` | `INTEROP` | System engine daemon service account. |

---

## 4. Authentication Endpoints

### `POST /api/auth/login`
Authenticates credentials and returns a signed JWT and user session profile.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "identifier": "citizen",
    "password": "demo123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Authentication successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": "uuid",
        "username": "citizen",
        "role": "CITIZEN",
        "citizenId": "CZN-1001",
        "departmentCode": "CITIZEN",
        "fullName": "Aarav Sharma"
      }
    }
  }
  ```

### `GET /api/auth/me`
Inspects current JWT session context.
- **Access**: Authenticated (`Bearer <TOKEN>`)

### `POST /api/auth/logout`
Terminates session and records immutable `USER_LOGOUT` audit log event.
- **Access**: Authenticated

---

## 5. Mock Departmental Services & Connectors

### 5.1 Education Verification
- **Route**: `POST /api/education/verify`
- **Connector**: `REST` (adapter: `educationConnector.js`)
- **Request**:
  ```json
  {
    "citizen_id": "CZN-1001",
    "student_id": "STU-1001",
    "institution_code": "INST-NIT-04"
  }
  ```
- **Response**:
  ```json
  {
    "status": "VERIFIED",
    "student_id": "STU-1001",
    "course": "B.Tech Computer Science & Engineering",
    "institution": "National Institute of Technology",
    "year": 2026,
    "cgpa": 8.75,
    "verification_id": "EDU-9001"
  }
  ```

### 5.2 Income Verification
- **Route**: `POST /api/income/verify`
- **Connector**: `REST` (adapter: `incomeConnector.js`)
- **Request**:
  ```json
  {
    "citizen_id": "CZN-1001",
    "income_certificate_no": "INC-5001"
  }
  ```
- **Response**:
  ```json
  {
    "status": "VALID",
    "annual_income": 180000,
    "category": "GENERAL_EWS",
    "issuing_district": "New Delhi Central",
    "verification_id": "INC-8001"
  }
  ```

### 5.3 Bank / DBT Verification
- **Route**: `POST /api/bank/verify`
- **Connector**: `REST` (adapter: `bankConnector.js`)
- **Request**:
  ```json
  {
    "citizen_id": "CZN-1001",
    "account_reference": "BANK-7001"
  }
  ```
- **Response (Healthy)**:
  ```json
  {
    "status": "VERIFIED",
    "account_reference": "BANK-7001",
    "account_holder_match": true,
    "is_aadhaar_seeded": true,
    "dbt_active": true,
    "verification_id": "BNK-3001"
  }
  ```

### 5.4 Department Outage & Latency Simulation Controls
- **`GET /api/bank/control`**: Read bank simulator health (`{ "healthy": true }`).
- **`POST /api/bank/control`**: Force bank simulator failure (`{ "healthy": false, "httpStatus": 503 }`).
- **`GET /api/income/control`**: Read income simulator delay.
- **`POST /api/income/control`**: Injected delay (`{ "delayMs": 1500 }`).

---

## 6. Scholarship Application Lifecycle

### `POST /api/applications`
Submits a new scholarship application with 5 required cross-department identifiers.
- **Access**: Citizen / Authenticated
- **Request Body**:
  ```json
  {
    "citizen_id": "CZN-1001",
    "student_id": "STU-1001",
    "institution_code": "INST-NIT-04",
    "income_certificate_no": "INC-5001",
    "account_reference": "BANK-7001",
    "academic_year": "2025-2026",
    "declared_income": 180000,
    "scheme_name": "Post-Matric Merit-cum-Means Financial Assistance Scheme",
    "benefit_amount": 25000
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Scholarship application submitted successfully",
    "data": {
      "applicationId": "SCH-2026-001",
      "citizenId": "CZN-1001",
      "status": "SUBMITTED",
      "currentStep": "APPLICATION_RECEIVED"
    }
  }
  ```
- **Validation Codes**:
  - `400 MISSING_REQUIRED_FIELD`: Missing one of the 5 required identifiers.
  - `400 MALFORMED_IDENTIFIER`: Format regex failure (e.g. `CZN-XXXX`).
  - `404 CITIZEN_NOT_FOUND`: Citizen ID not present in master registry.
  - `409 DUPLICATE_APPLICATION`: An active application already exists for the citizen in the current academic year.

### `GET /api/applications/:id`
Retrieves full application details and current progress.
- **Access**: Citizen (owner only) or Admin/Officer.

### `GET /api/applications/:id/timeline`
Returns citizen-safe unified journey timeline with 7 sequential stages.
- **Access**: Citizen (owner only) or Admin/Officer.
- **Visual States**: `COMPLETED`, `IN_PROGRESS`, `ACTION_REQUIRED`, `QUEUED`, `PENDING`.
- **Zero Technical Leakage**: No internal database queries, raw stack traces, or server IPs exposed.

---

## 7. Citizen Consent Endpoints

### `POST /api/applications/:id/consent`
Records electronic consent artifact authorizing cross-departmental data queries.
- **Access**: Citizen (owner)
- **Request Body**:
  ```json
  {
    "purpose": "Scholarship eligibility verification across higher education, revenue and banking registries",
    "allowedDepartments": ["EDU", "REV", "DBT"],
    "dataScopes": ["Education verification", "Income verification", "Bank verification status"],
    "validUntil": "2026-12-31T23:59:59.000Z"
  }
  ```

### `GET /api/applications/:id/consent`
Inspects active consent record for the specified application.

### `POST /api/applications/:id/consent/revoke`
Revokes active consent. Subsequent cross-department lookups will be halted with HTTP 403 `CONSENT_REVOKED`.

---

## 8. Workflow Orchestration Engine

### `POST /api/workflows/:id/run`
Executes the cross-department verification state machine for the application.
- **Prerequisite**: Valid citizen consent must be granted.
- **Execution**: Runs active DB-configured workflow (Step 1 -> Step 7).

### `POST /api/workflows/resume`
Resumes an in-flight, queued, or recovered workflow without restarting completed steps.
- **Request Body**:
  ```json
  {
    "applicationId": "SCH-2026-001"
  }
  ```

### `GET /api/workflows/:id/status`
Returns live workflow execution progress across all pipeline steps.

---

## 9. Exception Handling & Recovery Queue

### `GET /api/exceptions`
Returns all failed and queued workflow exceptions.
- **Access**: Admin only (`ADMIN`, `SYSTEM`).
- **Response**: Filterable by `serviceCode`, `departmentCode`, and `status` (`QUEUED`, `FAILED`).

### `POST /api/exceptions/:id/retry`
Admin operational action to re-dispatch a queued or failed workflow step.
- **Access**: Admin only.
- **Behavior**: Verifies exception is retryable, dispatches connector, increments attempt counter, and resumes remaining pipeline upon success.

---

## 10. Notifications & SLA Monitoring

### `GET /api/notifications`
Returns citizen or admin notification stream.
- **Supported Types**: `APPLICATION_SUBMITTED`, `VERIFICATION_COMPLETED`, `ACTION_REQUIRED`, `SERVICE_UNAVAILABLE`, `WORKFLOW_QUEUED`, `RETRY_SUCCEEDED`, `ELIGIBLE`, `APPLICATION_APPROVED`, `APPLICATION_REJECTED`, `SLA_BREACHED`.

### `PATCH /api/notifications/:id/read`
Marks a notification as read.

### `GET /api/sla`
Returns live department-level SLA adherence metrics calculated from database timestamps.

### `POST /api/sla/evaluate`
Triggers automated evaluation of open cases and generates `SLA_BREACHED` alerts when turnaround thresholds are exceeded.

---

## 11. Admin Control Center & Telemetry

### `GET /api/admin/dashboard`
Returns consolidated KPIs: Total Applications, Success Rate, Average Latency, SLA Adherence %, Service Health table, and Live Event stream.
- **Access**: Admin only (`HTTP 403` for citizens).

### `GET /api/admin/monitoring`
Detailed telemetry with real-time connector latencies and throughput metrics.

### `GET /api/admin/audit-logs`
Immutable audit trail queried from `audit_logs` table (supports action, actor, and date filters).

---

## 12. Dynamic Workflow Builder

### `GET /api/admin/workflow-builder/definitions`
Lists all pipeline topologies stored in PostgreSQL (`workflow_definitions`).

### `POST /api/admin/workflow-builder/definitions/:code/versions`
Clones an existing topology into a new immutable version (e.g. `2.0.0`).

### `POST /api/admin/workflow-builder/definitions/:code/versions/:ver/activate`
Atomically marks a workflow version as the active production pipeline.

### `POST /api/admin/workflow-builder/definitions/:code/versions/:ver/steps`
Adds, reorders, or toggles steps (`is_enabled`) within the version.

---

## 13. Service Registry & Data Mapping

### `GET /api/services`
Lists all departmental connectors with protocol (`REST`, `LEGACY`, `MOCK`, `SANDBOX`), endpoint, health status, and response times.

### `POST /api/services/:id/test`
Actively pings a departmental connector and persists measured latency and health in PostgreSQL.

### `GET /api/mappings`
Returns all 12 registered canonical field mapping rules.

### `POST /api/mappings/test-transform`
Interactive utility to test currency stripping (`"₹1,80,000.00"` -> `180000`) or boolean coercion (`"MATCH"` -> `true`).

---

## 14. Demo Controls (One-Click Scenario Automation)

Available at `/api/admin/demo/*` (and replicated at `/api/demo/*`):

| Endpoint | Method | Scenario Triggered |
|---|:---:|---|
| `/status` | `GET` | Returns active demo configurations and bank mock health. |
| `/run-success` | `POST` | Executes complete Golden Path (all 7 steps completed). |
| `/fail-bank` | `POST` | Sets Bank API to 503 outage; submits application that enters `QUEUED` state. |
| `/recover-bank` | `POST` | Restores Bank API to healthy; auto-resumes queued applications. |
| `/slow-income` | `POST` | Injects configurable latency delay into Income API (e.g. 1500ms). |
| `/invalid-income`| `POST`| Submits application with invalid certificate to demonstrate clean rejection. |
| `/duplicate` | `POST` | Triggers duplicate submission detection (HTTP 409). |
| `/reset` | `POST` | Restores database and mock states to pristine deterministic baseline. |
