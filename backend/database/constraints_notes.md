# FTVTI ECSF Fellowship Student & Family Management System — Database Architecture & Constraints Notes

## 1. Architectural Overview & Entity Separation

The database layer for the FTVTI ECSF Fellowship Student & Family Management System strictly enforces normalized relational modeling. A critical requirement is maintaining clear separation of concerns across physical identity, academic enrollment, privileged authentication, and family role assignments:

1. **`people`**: The canonical root directory of physical human beings.
   - Every individual (administrators, fellowship leaders, family dads, family moms, and ordinary student members) exists exactly once in `people`.
   - Never duplicate a person record because someone has multiple responsibilities (e.g., a student who also serves as a Family Dad).
2. **`students`**: 1:1 extension of `people` representing fellowship students.
   - Contains university student ID, academic department, academic stage (year), GC classification, gender, and fellowship participation status.
   - Non-student leaders or external family dads/moms do not have records in `students`.
3. **`fellowship_accounts`**: Dedicated authentication accounts.
   - Restricted strictly to `ADMIN` and `FELLOWSHIP_LEADER` roles.
   - Family leadership (Dad, Mom) or ordinary membership (`MEMBER`) **never** automatically creates or grants a login account.
   - Plain-text passwords are prohibited; only secure cryptographic hashes are stored.
4. **`families`**: Fellowship family groups.
   - Configured with `member_capacity` representing the target limit for ordinary `MEMBER` assignments.
   - Family leadership roles (`DAD` and `MOM`) do **not** consume member capacity spaces.
5. **`family_assignments`**: Temporal assignment log connecting a person to a family.
   - Supports roles `DAD`, `MOM`, and `MEMBER`.
   - Full historical retention: old assignments are ended (`end_date = CURRENT_DATE`), never deleted.
6. **`transfer_requests`**: Administrative state machine for moving students between families.
   - Supports pending, approved, rejected, and cancelled states with complete audit trails and capacity override tracking.

---

## 2. Integrity Constraints & Business Rules Enforcement Matrix

| Business Rule | PostgreSQL Mechanism | File / Location | Rationale & Behavioral Details |
| :--- | :--- | :--- | :--- |
| **Case-Insensitive Unique Email** | `CREATE UNIQUE INDEX uq_people_email_lower ON people (LOWER(email)) WHERE email IS NOT NULL;` | `database/indexes.sql` | Supports optional emails (`NULL` allowed multiple times), while strictly rejecting duplicate active emails regardless of casing (e.g., `user@domain.com` vs `USER@DOMAIN.COM`). |
| **Unique University Student ID** | `CREATE UNIQUE INDEX uq_students_university_id_upper ON students (UPPER(university_student_id)) WHERE university_student_id IS NOT NULL;` | `database/indexes.sql` | Ensures institutional student IDs are globally unique when provided, but permits `NULL` for students awaiting ID issuance. |
| **Non-Negative Family Capacity** | `CONSTRAINT chk_family_capacity_non_negative CHECK (member_capacity >= 0)` | `database/schema.sql` | Guarantees family capacity cannot be configured as a negative integer. |
| **Only 1 Active Ordinary MEMBER Assignment** | `CREATE UNIQUE INDEX uq_person_active_member ON family_assignments (person_id) WHERE role = 'MEMBER' AND end_date IS NULL;` | `database/indexes.sql` | Enforces that an individual can only be an ordinary member in one family at any given time. |
| **Dual Roles Across Families Permitted** | Partial index scoped strictly to `role = 'MEMBER'` | `database/indexes.sql` | Because `uq_person_active_member` only filters on `role = 'MEMBER'`, a person can simultaneously be an active `MEMBER` in Family A and an active `DAD` or `MOM` in Family B without violating constraints. |
| **No Duplicate Active Roles in Same Family** | `CREATE UNIQUE INDEX uq_person_active_role_per_family ON family_assignments (family_id, person_id, role) WHERE end_date IS NULL;` | `database/indexes.sql` | Prevents assigning a person to the same role multiple times concurrently within a single family. |
| **Remedial Configured as 0 Year** | `CONSTRAINT chk_academic_stages_year_non_negative CHECK (year_number >= 0)` & seed `year_number = 0` | `database/schema.sql`, `database/seed.sql` | Remedial is explicitly modeled as 0 Year. First Year is 1 Year, Second Year is 2 Year, etc., providing intuitive numerical ordering for reporting. |
| **Manual & Independent GC Classification** | `gc_classifications` foreign key in `students` | `database/schema.sql` | Graduating Class (GC) represents students in their final academic year. Because degree lengths vary (e.g., 3-year diplomas vs 4-year degrees vs 5-year engineering), GC is maintained independently from numeric year. |
| **Single Pending Transfer per Student** | `CREATE UNIQUE INDEX uq_student_single_pending_transfer ON transfer_requests (student_id) WHERE status = 'PENDING';` | `database/indexes.sql` | Guarantees a student cannot have multiple conflicting pending transfer requests in flight. |
| **Source != Destination Family** | `CONSTRAINT chk_transfers_different_families CHECK (from_family_id IS NULL OR from_family_id <> to_family_id)` | `database/schema.sql` | Disallows submitting or executing transfers where source and destination families are identical. |
| **Historical Data Erasure Protection** | `ON DELETE RESTRICT` on all core foreign keys | `database/schema.sql` | Prohibits cascading deletes. Deleting a person, student, family, or account that has historical assignments, transfers, or audit logs is blocked at the database level. |

---

## 3. Why Certain Business Rules Require Procedural Enforcement

While PostgreSQL constraints and partial unique indexes excel at static and single-row validations, certain business rules cannot be enforced with declarative constraints alone:

### 3.1 Concurrency-Safe Family Capacity Checks
- **Limitation of Declarative Constraints**: Standard SQL `CHECK` constraints cannot execute subqueries or aggregate queries across multiple rows (e.g., `CHECK ((SELECT COUNT(*) FROM family_assignments WHERE ...) < member_capacity)` is invalid SQL in PostgreSQL).
- **Race Condition Under Concurrency**: If two administrators or leaders simultaneously approve transfers to a family with 1 remaining slot, both transactions would see 1 slot available and commit, leading to overcapacity.
- **Solution (`fn_approve_transfer_request`)**:
  1. The function issues an explicit row-level lock:
     ```sql
     SELECT member_capacity, is_active, family_name
     INTO v_destination_capacity, v_destination_active, v_destination_name
     FROM families
     WHERE family_id = v_to_family_id
     FOR UPDATE;
     ```
  2. Any concurrent transfer targeting the same destination family is blocked until the first transaction commits or rolls back.
  3. The active ordinary member count is recalculated within the locked critical section.
  4. If capacity is reached, the transaction raises an exception unless the administrator explicitly provided `p_allow_capacity_override = TRUE` and a non-empty reason.

### 3.2 Atomic Transfer Approval and Role Transitions
- **Requirement**: When a transfer is approved, the student's prior family assignment must be closed (`end_date = CURRENT_DATE`), and their new assignment created in the destination family within a single atomic transaction.
- **Risk Without Stored Function**: If done across multiple separate application calls, network failures or process crashes could leave the student either with two active memberships or with none.
- **Solution**: The `fn_approve_transfer_request` stored procedure executes both steps inside a single transactional context.

### 3.3 Authorization Enforcement at the Database Boundary
- **Requirement**: Fellowship leaders can submit transfer requests, but only administrators (`role = 'ADMIN'`) can approve or reject them. Non-admin users must be blocked even if they attempt to invoke database functions directly.
- **Solution**: `fn_approve_transfer_request` and `fn_reject_transfer_request` query `fellowship_accounts` directly and verify `v_admin_role = 'ADMIN'` and `v_admin_active = TRUE`, immediately raising an authorization exception if an unauthorized account attempts execution.

---

## 4. Family Capacity Override Design

Normally, family capacity is a strict limit on active ordinary `MEMBER` assignments. However, real-world fellowship dynamics require administrative exceptions (e.g., housing crises, special mentorship arrangements, departmental cohesion).

The database implements an auditable override strategy:
1. **Explicit Flags**: The approving administrator must pass `p_allow_capacity_override := TRUE` to `fn_approve_transfer_request`.
2. **Mandatory Justification**: The administrator must provide `p_override_reason`. Passing `NULL` or whitespace is rejected with an exception.
3. **Immutability in Transfer Record**:
   - `is_capacity_override` (BOOLEAN NOT NULL)
   - `capacity_override_reason` (TEXT NOT NULL when override is TRUE)
   - `capacity_override_by` (BIGINT REFERENCES fellowship_accounts)
   - `capacity_override_at` (TIMESTAMPTZ)
4. **Enforced via Database Table Constraint**:
   ```sql
   CONSTRAINT chk_transfers_override_fields CHECK (
       (is_capacity_override = FALSE AND capacity_override_by IS NULL AND capacity_override_reason IS NULL AND capacity_override_at IS NULL) OR
       (is_capacity_override = TRUE AND capacity_override_by IS NOT NULL AND LENGTH(TRIM(capacity_override_reason)) > 0 AND capacity_override_at IS NOT NULL)
   )
   ```
5. **Audit Logging**: Every override automatically logs an entry in `audit_events` with action `'TRANSFER_OVERRIDE'`.

---

## 5. Status of Optional Features

### 5.1 Fellowship Leader Family Access (`fellowship_leader_family_access`)
- **Status: IMPLEMENTED.**
- Maps `FELLOWSHIP_LEADER` accounts to specific families they are delegated to manage.
- A trigger (`trg_fellowship_leader_access_role_check`) enforces that only accounts with `role = 'FELLOWSHIP_LEADER'` can be inserted. `ADMIN` accounts are global and cannot be restricted.

### 5.2 System Audit Trail (`audit_events`)
- **Status: IMPLEMENTED AND ACTIVE.**
- Populated in real-time via triggers and procedures for:
  - Student participation status changes (`PARTICIPATION_CHANGED`)
  - Family capacity adjustments (`CAPACITY_CHANGED`)
  - Transfer requests, approvals, overrides, and rejections (`TRANSFER_REQUEST`, `TRANSFER_APPROVED`, `TRANSFER_OVERRIDE`, `TRANSFER_REJECTED`)
