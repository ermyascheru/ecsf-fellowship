# FTVTI ECSF Fellowship Student & Family Management System — Database Layer

## 1. Executive Summary & Architecture Scope

This project implements the complete, normalized, and production-ready PostgreSQL database layer for the **FTVTI ECSF Fellowship Student & Family Management System**.

The database manages university fellowship students (~100–500 students) assigned to campus families, handling student profiles, family capacity, leadership appointments, transfer workflows, and analytical reporting.

> **Scope Note**: This project is exclusively the database architecture layer. It provides normalized DDL schemas, constraints, partial indexes, triggers, stored procedures, seed data, analytical views, and test suites. No web server, UI, frontend, or non-database code is introduced.

---

## 2. PostgreSQL Version & Technical Prerequisites

- **Database Engine**: PostgreSQL 16.0 or newer.
- **Key Features Utilized**:
  - `BIGINT GENERATED ALWAYS AS IDENTITY` primary keys.
  - `TIMESTAMPTZ` for time zone-aware timestamps.
  - Partial Unique Indexes for conditional business rules.
  - Pl/pgSQL Stored Procedures with row-level locks (`SELECT ... FOR UPDATE`) for concurrency-safe capacity and transfer workflows.
  - Foreign key constraints with `ON DELETE RESTRICT` to guarantee historical data retention.
  - `JSONB` audit logging with change deltas.

---

## 3. Directory Layout & File Organization

All SQL and documentation files are organized under the `database/` directory:

```text
database/
├── README.md                      # Comprehensive deployment and architectural guide
├── constraints_notes.md           # Deep-dive documentation on business rules & concurrency
├── init.sql                       # Master runner executing all SQL scripts in sequence
├── schema.sql                     # Core tables, domains, types, and declarative constraints
├── indexes.sql                    # Performance B-trees and partial unique business indexes
├── functions.sql                  # Automated triggers, business procedures, and workflows
├── views.sql                      # Analytical and operational views for reporting
├── seed.sql                       # Demonstration and test seed data (realistic & fictional)
├── reports.sql                    # Standalone parameterized queries for Reports 1–14
└── tests/
    ├── integrity_tests.sql        # Validates schema rules, identity, and unique constraints
    ├── transfer_tests.sql         # Validates transfer workflows, locks, and capacity override
    └── reporting_tests.sql        # Validates output and calculations across all reports
```

---

## 4. Database Setup & Execution Order

### 4.1 Step 1: Create the Database
Connect to your PostgreSQL 16 instance via `psql` or an administrative client:

```sql
CREATE DATABASE ftvti_ecsf_fellowship
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_United States.1252'
    LC_CTYPE = 'English_United States.1252'
    TEMPLATE = template0;
```

### 4.2 Step 2: Execute Files in the Correct Order
Navigate to the `database/` directory and execute either the master initialization script or each file sequentially:

#### Option A: Single Master Command
```bash
psql -U postgres -d ftvti_ecsf_fellowship -f init.sql
```

#### Option B: Step-by-Step Execution
```bash
# 1. Schema (Tables, types, foreign keys)
psql -U postgres -d ftvti_ecsf_fellowship -f schema.sql

# 2. Indexes (Partial unique constraints & lookups)
psql -U postgres -d ftvti_ecsf_fellowship -f indexes.sql

# 3. Functions & Triggers (Stored procedures, audit triggers)
psql -U postgres -d ftvti_ecsf_fellowship -f functions.sql

# 4. Reporting Views (Operational and analytical views)
psql -U postgres -d ftvti_ecsf_fellowship -f views.sql

# 5. Seed Data (Demonstration dataset)
psql -U postgres -d ftvti_ecsf_fellowship -f seed.sql
```

---

## 5. Core Tables & Normalized Entity Model

| Table | Purpose | Primary Key | Key Relationships / Rules |
| :--- | :--- | :--- | :--- |
| **`people`** | Canonical registry of physical people. | `person_id` | Master entity for all individuals. Unique lower(email). |
| **`fellowship_accounts`** | Privileged login accounts. | `account_id` | Role restricted to `ADMIN` or `FELLOWSHIP_LEADER`. Family roles never grant login. |
| **`departments`** | University academic departments. | `department_id` | Unique department name. |
| **`academic_stages`** | Academic year levels. | `academic_stage_id` | Configurable numeric years: **Remedial = 0 Year**, 1st Year = 1, etc. |
| **`gc_classifications`** | Graduating Class classifications. | `gc_classification_id` | Independent designation for students in their final academic year. |
| **`students`** | Student profile record. | `student_id` | 1:1 with `people`. Manual fellowship participation tracking (`ACTIVE`/`INACTIVE`). |
| **`families`** | Fellowship family units. | `family_id` | Unique code and name. Non-negative `member_capacity` for ordinary members. |
| **`family_assignments`** | Temporal role assignment log. | `assignment_id` | Roles: `DAD`, `MOM`, `MEMBER`. Retains full history (`end_date IS NULL` = active). |
| **`transfer_requests`** | Student family transfer state machine. | `transfer_id` | Only 1 pending transfer per student. Supports atomic administrative overrides. |
| **`fellowship_leader_family_access`** | Optional authorization scoping. | `access_id` | Scopes `FELLOWSHIP_LEADER` accounts to specific families. Admins are global. |
| **`audit_events`** | System audit logging. | `audit_id` | Logs participation changes, capacity changes, and transfer decisions with JSONB deltas. |

---

## 6. Core Business Rules & Architectural Mechanisms

### 6.1 Multi-Role Architecture Without Duplication
- A person can be a student and simultaneously a Family Dad or Family Mom (e.g., Person 6, Dawit Tadesse, is a 4th-year student and active Dad of Shiloh Family).
- A person can be an ordinary `MEMBER` in Family A and simultaneously a `MOM` or `DAD` in Family B (e.g., Person 7, Sara Solomon, is a `MEMBER` in Bethel and a `MOM` in Ebenezer).
- A person can never have more than one active `MEMBER` assignment across the fellowship. This is enforced via:
  ```sql
  CREATE UNIQUE INDEX uq_person_active_member
      ON family_assignments (person_id)
      WHERE role = 'MEMBER' AND end_date IS NULL;
  ```

### 6.2 Remedial as 0 Year & Graduating Class (GC)
- **Remedial as 0 Year**: Remedial is explicitly assigned `year_number = 0` in `academic_stages`. This allows chronological numerical sorting in all academic reports.
- **Graduating Class (GC)**: GC indicates students in their final year of university. Because degree durations differ across faculties (e.g., 3-year vocational diplomas vs 5-year engineering degrees), GC is stored as an independent, manually assigned lookup (`gc_classifications`) rather than being derived strictly from the year number.

### 6.3 Concurrency-Safe Family Capacity & Administrative Override
- **Capacity Definition**: Family capacity applies strictly to active ordinary `MEMBER` roles. Family Dads and Moms are leadership roles and do not consume member spaces.
- **Atomic Locking**: When evaluating transfers in `fn_approve_transfer_request`, the destination family is locked using:
  ```sql
  SELECT member_capacity, family_name, is_active
  FROM families
  WHERE family_id = v_to_family_id
  FOR UPDATE;
  ```
  This serializes concurrent approvals and prevents race conditions from exceeding capacity.
- **Administrative Override**:
  - If a destination family is full, standard approval is rejected.
  - An authorized administrator (`ADMIN`) can explicitly pass `p_allow_capacity_override = TRUE` along with a non-empty `p_override_reason`.
  - The override reason, timestamp, and authorizing administrator ID are immutably captured in `transfer_requests` and recorded in `audit_events`.
  - Fellowship leaders cannot authorize their own capacity overrides.

### 6.4 Atomic Transfer Approvals
When a transfer request is approved via `fn_approve_transfer_request`:
1. Source family active assignment is verified to prevent stale reassignments.
2. Prior assignment is closed (`end_date = CURRENT_DATE`).
3. New active `MEMBER` assignment is inserted for the destination family.
4. Transfer record is marked `APPROVED` with decision notes and override metadata.
5. All operations execute inside a single atomic database transaction.

---

## 7. How to Create the Initial Administrator Securely

Never insert plain-text passwords or reusable default credentials into production databases.

### 7.1 Option A: Using PostgreSQL `pgcrypto` Extension
You can generate a secure salted Blowfish/bcrypt hash directly within PostgreSQL:

```sql
-- Enable pgcrypto in your target database
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Insert physical person record for Administrator
INSERT INTO people (full_name, phone, email)
VALUES ('System Administrator', '+251-911-000001', 'admin@fellowship.ecsf.org')
RETURNING person_id;

-- 2. Insert fellowship account with bcrypt hashed password (cost factor 12)
-- Replace 'YourStrongRandomSecretPasswordHere!' with your actual secure passphrase
INSERT INTO fellowship_accounts (
    person_id,
    username,
    password_hash,
    role,
    is_active
) VALUES (
    (SELECT person_id FROM people WHERE email = 'admin@fellowship.ecsf.org'),
    'admin_root',
    crypt('YourStrongRandomSecretPasswordHere!', gen_salt('bf', 12)),
    'ADMIN',
    TRUE
);
```

### 7.2 Option B: Using Backend Application Runtime (Argon2id or bcrypt)
In your production backend application (e.g., Node.js / Python / Go), hash the administrator's password using Argon2id or bcrypt:
```python
import argon2
ph = argon2.PasswordHasher()
hash = ph.hash("SecurePassphrase123!")
# Insert `hash` into fellowship_accounts.password_hash
```

---

## 8. Status of Optional Features

1. **Fellowship Leader Scoping (`fellowship_leader_family_access`)**:
   - **Status: IMPLEMENTED**.
   - Allows administrators to assign fellowship leaders to specific families.
   - Enforced by trigger `trg_fellowship_leader_access_role_check` to prevent scoping global `ADMIN` accounts.
2. **Audit Logging (`audit_events`)**:
   - **Status: IMPLEMENTED & ACTIVE**.
   - Automatically records participation status modifications, capacity changes, and transfer lifecycle events with `JSONB` deltas.

---

## 9. Running Verification & Test Suites

The test suites validate all integrity constraints, capacity limits, atomic transfer workflows, and reporting views.

Execute tests using `psql`:

```bash
# 1. Structural Integrity & Constraint Tests (Suite 1)
psql -U postgres -d ftvti_ecsf_fellowship -f tests/integrity_tests.sql

# 2. Transfer Workflows & Capacity Enforcement Tests (Suite 2)
psql -U postgres -d ftvti_ecsf_fellowship -f tests/transfer_tests.sql

# 3. Analytical & Reporting Views Validation (Suite 3)
psql -U postgres -d ftvti_ecsf_fellowship -f tests/reporting_tests.sql
```
