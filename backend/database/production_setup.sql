-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Database Schema Definition (PostgreSQL 16+)
-- File: database/schema.sql
-- ============================================================================

-- Ensure standard transaction and client behavior
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = true;
SET client_min_messages = warning;

-- ============================================================================
-- 1. EXTENSIONS & DOMAINS / ENUM TYPES
-- ============================================================================

-- Role of login accounts in fellowship administration
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role_enum') THEN
        CREATE TYPE account_role_enum AS ENUM ('ADMIN', 'FELLOWSHIP_LEADER');
    END IF;
END$$;

-- Family assignment role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'family_role_enum') THEN
        CREATE TYPE family_role_enum AS ENUM ('DAD', 'MOM', 'MEMBER');
    END IF;
END$$;

-- Student participation status (manually maintained)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'participation_status_enum') THEN
        CREATE TYPE participation_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
    END IF;
END$$;

-- Transfer request status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_status_enum') THEN
        CREATE TYPE transfer_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
    END IF;
END$$;

-- Gender domain / enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
        CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE');
    END IF;
END$$;

-- ============================================================================
-- 2. CORE TABLE: people
-- ============================================================================
-- Central entity representing any physical individual.
-- Dads, Moms, Students, and Fellowship Leaders all originate from people.
-- A person may hold multiple roles across the system without duplication.
-- ============================================================================
CREATE TABLE IF NOT EXISTS people (
    person_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Data integrity constraints
    CONSTRAINT chk_people_full_name_non_empty CHECK (LENGTH(TRIM(full_name)) > 0),
    CONSTRAINT chk_people_phone_non_empty CHECK (LENGTH(TRIM(phone)) >= 7)
);

COMMENT ON TABLE people IS 'Canonical directory of physical individuals in the fellowship ecosystem.';
COMMENT ON COLUMN people.phone IS 'Phone number stored as TEXT to preserve international/regional formats.';
COMMENT ON COLUMN people.email IS 'Optional email address; case-insensitive uniqueness enforced via partial index.';

-- ============================================================================
-- 3. CORE TABLE: fellowship_accounts
-- ============================================================================
-- Authentication accounts strictly restricted to ADMIN and FELLOWSHIP_LEADER.
-- Family roles (Dad, Mom, Member) never automatically grant login access.
-- Passwords must never be stored in plain text.
-- ============================================================================
CREATE TABLE IF NOT EXISTS fellowship_accounts (
    account_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id BIGINT NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role account_role_enum NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ NULL,

    -- Foreign keys with delete protection
    CONSTRAINT fk_fellowship_accounts_person FOREIGN KEY (person_id)
        REFERENCES people (person_id) ON DELETE RESTRICT,

    -- Constraints
    CONSTRAINT chk_account_username_format CHECK (LENGTH(TRIM(username)) >= 3),
    CONSTRAINT chk_account_password_hash_non_empty CHECK (LENGTH(TRIM(password_hash)) > 10)
);

COMMENT ON TABLE fellowship_accounts IS 'Privileged login accounts for system administrators and fellowship leaders only.';
COMMENT ON COLUMN fellowship_accounts.password_hash IS 'Cryptographic hash (Argon2id, bcrypt, or PBKDF2). Plain text prohibited.';

-- ============================================================================
-- 4. REFERENCE TABLE: departments
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
    department_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_departments_name UNIQUE (department_name),
    CONSTRAINT chk_department_name_non_empty CHECK (LENGTH(TRIM(department_name)) > 0)
);

COMMENT ON TABLE departments IS 'Academic university departments.';

-- ============================================================================
-- 5. REFERENCE TABLE: academic_stages
-- ============================================================================
-- Configurable academic stage progression.
-- Remedial is explicitly modeled as 0 Year.
-- First Year = 1, Second Year = 2, Third Year = 3, Fourth Year = 4, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS academic_stages (
    academic_stage_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stage_name TEXT NOT NULL,
    year_number INTEGER NOT NULL,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_academic_stages_name UNIQUE (stage_name),
    CONSTRAINT uq_academic_stages_year UNIQUE (year_number),
    CONSTRAINT chk_academic_stages_year_non_negative CHECK (year_number >= 0),
    CONSTRAINT chk_academic_stages_display_order CHECK (display_order >= 0)
);

COMMENT ON TABLE academic_stages IS 'University academic progression stages. Remedial = 0 Year, First Year = 1 Year, etc.';
COMMENT ON COLUMN academic_stages.year_number IS 'Numeric academic year representation. 0 = Remedial, 1 = 1st Year, etc.';

-- ============================================================================
-- 6. REFERENCE TABLE: gc_classifications
-- ============================================================================
-- GC means Graduating Class (students in their final university year).
-- Independent of academic stage (e.g., 3-year program vs 5-year engineering).
-- ============================================================================
CREATE TABLE IF NOT EXISTS gc_classifications (
    gc_classification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    classification_name TEXT NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_gc_classifications_name UNIQUE (classification_name),
    CONSTRAINT chk_gc_classification_name_non_empty CHECK (LENGTH(TRIM(classification_name)) > 0)
);

COMMENT ON TABLE gc_classifications IS 'Graduating Class (GC) designation lookup. Managed manually and independently from academic year.';

-- ============================================================================
-- 7. CORE TABLE: students
-- ============================================================================
-- Student profile linked 1:1 to a person.
-- Participation status is maintained manually by authorized leadership,
-- not derived from university enrollment or attendance.
-- ============================================================================
CREATE TABLE IF NOT EXISTS students (
    student_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id BIGINT NOT NULL,
    university_student_id TEXT NULL,
    department_id BIGINT NULL,
    academic_stage_id BIGINT NULL,
    gc_classification_id BIGINT NULL,
    gender gender_enum NOT NULL,
    enrollment_date DATE NULL,
    participation_status participation_status_enum NOT NULL DEFAULT 'ACTIVE',
    participation_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    participation_updated_by BIGINT NULL,
    created_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT uq_students_person_id UNIQUE (person_id),
    CONSTRAINT fk_students_person FOREIGN KEY (person_id)
        REFERENCES people (person_id) ON DELETE RESTRICT,
    CONSTRAINT fk_students_department FOREIGN KEY (department_id)
        REFERENCES departments (department_id) ON DELETE RESTRICT,
    CONSTRAINT fk_students_academic_stage FOREIGN KEY (academic_stage_id)
        REFERENCES academic_stages (academic_stage_id) ON DELETE RESTRICT,
    CONSTRAINT fk_students_gc_classification FOREIGN KEY (gc_classification_id)
        REFERENCES gc_classifications (gc_classification_id) ON DELETE RESTRICT,
    CONSTRAINT fk_students_participation_updated_by FOREIGN KEY (participation_updated_by)
        REFERENCES fellowship_accounts (account_id) ON DELETE RESTRICT,
    CONSTRAINT fk_students_created_by FOREIGN KEY (created_by)
        REFERENCES fellowship_accounts (account_id) ON DELETE RESTRICT,

    -- Constraints
    CONSTRAINT chk_student_university_id_non_empty CHECK (university_student_id IS NULL OR LENGTH(TRIM(university_student_id)) > 0)
);

COMMENT ON TABLE students IS 'Student profiles in the fellowship. 1:1 with people.';
COMMENT ON COLUMN students.participation_status IS 'Active/Inactive fellowship participation status, updated manually by leaders.';

-- ============================================================================
-- 8. CORE TABLE: families
-- ============================================================================
-- Fellowship families. member_capacity specifies max ordinary members (MEMBER).
-- Dads and Moms are leadership roles and do NOT consume member_capacity spaces.
-- ============================================================================
CREATE TABLE IF NOT EXISTS families (
    family_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    family_code TEXT NOT NULL,
    family_name TEXT NOT NULL,
    member_capacity INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_families_code UNIQUE (family_code),
    CONSTRAINT uq_families_name UNIQUE (family_name),
    CONSTRAINT fk_families_created_by FOREIGN KEY (created_by)
        REFERENCES fellowship_accounts (account_id) ON DELETE RESTRICT,

    -- Capacity must be non-negative
    CONSTRAINT chk_family_capacity_non_negative CHECK (member_capacity >= 0),
    CONSTRAINT chk_family_code_non_empty CHECK (LENGTH(TRIM(family_code)) > 0),
    CONSTRAINT chk_family_name_non_empty CHECK (LENGTH(TRIM(family_name)) > 0)
);

COMMENT ON TABLE families IS 'Fellowship family units.';
COMMENT ON COLUMN families.member_capacity IS 'Target capacity for ordinary MEMBER roles. Excludes DAD and MOM roles.';

-- ============================================================================
-- 9. CORE TABLE: family_assignments
-- ============================================================================
-- Historical and active assignments of people to families.
-- Supports DAD, MOM, and MEMBER roles.
-- History is strictly preserved (never hard-deleted).
-- Active assignment has end_date IS NULL.
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_assignments (
    assignment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    family_id BIGINT NOT NULL,
    person_id BIGINT NOT NULL,
    role family_role_enum NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NULL,
    assigned_by BIGINT NOT NULL,
    ended_by BIGINT NULL,
    end_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_assignments_family FOREIGN KEY (family_id)
        REFERENCES families (family_id) ON DELETE RESTRICT,
    CONSTRAINT fk_assignments_person FOREIGN KEY (person_id)
        REFERENCES people (person_id) ON DELETE RESTRICT,
    CONSTRAINT fk_assignments_assigned_by FOREIGN KEY (assigned_by)
        REFERENCES fellowship_accounts (account_id) ON DELETE RESTRICT,
    CONSTRAINT fk_assignments_ended_by FOREIGN KEY (ended_by)
        REFERENCES fellowship_accounts (account_id) ON DELETE RESTRICT,

    -- Constraints
    CONSTRAINT chk_assignment_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_assignment_ended_fields CHECK (
        (end_date IS NULL AND ended_by IS NULL) OR
        (end_date IS NOT NULL)
    )
);

COMMENT ON TABLE family_assignments IS 'Temporal assignment log of people to families in DAD, MOM, or MEMBER roles.';
COMMENT ON COLUMN family_assignments.role IS 'DAD/MOM (family leadership, uncounted against capacity) or MEMBER (ordinary student member).';

-- ============================================================================
-- 10. CORE TABLE: transfer_requests
-- ============================================================================
-- Tracks student transfers between families with full audit history.
-- Supports administrative capacity overrides with mandatory reason & logging.
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfer_requests (
    transfer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT NOT NULL,
    from_family_id BIGINT NULL,  -- NULL if student has no prior family
    to_family_id BIGINT NOT NULL,
    requested_by BIGINT NOT NULL,
    approved_by BIGINT NULL,
    status transfer_status_enum NOT NULL DEFAULT 'PENDING',
    reason TEXT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMPTZ NULL,
    decision_note TEXT NULL,

    -- Capacity override audit fields
    is_capacity_override BOOLEAN NOT NULL DEFAULT FALSE,
    capacity_override_reason TEXT NULL,
    capacity_override_by BIGINT NULL,
    capacity_override_at TIMESTAMPTZ NULL,

    -- Foreign keys
    CONSTRAINT fk_transfers_student FOREIGN KEY (student_id)
        REFERENCES students (student_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_from_family FOREIGN KEY (from_family_id)
        REFERENCES families (family_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_to_family FOREIGN KEY (to_family_id)
        REFERENCES families (family_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_requested_by FOREIGN KEY (requested_by)
        REFERENCES fellowship_accounts (account_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_approved_by FOREIGN KEY (approved_by)
        REFERENCES fellowship_accounts (account_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_override_by FOREIGN KEY (capacity_override_by)
        REFERENCES fellowship_accounts (account_id) ON DELETE RESTRICT,

    -- Constraints
    CONSTRAINT chk_transfers_different_families CHECK (from_family_id IS NULL OR from_family_id <> to_family_id),
    CONSTRAINT chk_transfers_reason_non_empty CHECK (LENGTH(TRIM(reason)) > 0),
    CONSTRAINT chk_transfers_decision_state CHECK (
        (status = 'PENDING' AND approved_by IS NULL AND decided_at IS NULL) OR
        (status <> 'PENDING' AND decided_at IS NOT NULL)
    ),
    CONSTRAINT chk_transfers_override_fields CHECK (
        (is_capacity_override = FALSE AND capacity_override_by IS NULL AND capacity_override_reason IS NULL AND capacity_override_at IS NULL) OR
        (is_capacity_override = TRUE AND capacity_override_by IS NOT NULL AND LENGTH(TRIM(capacity_override_reason)) > 0 AND capacity_override_at IS NOT NULL)
    )
);

COMMENT ON TABLE transfer_requests IS 'Student family transfer requests with state machine and capacity override audit tracking.';

-- ============================================================================
-- 11. OPTIONAL AUTHORIZATION SCOPING: fellowship_leader_family_access
-- ============================================================================
-- Implemented feature: Maps FELLOWSHIP_LEADER accounts to specific families
-- they are delegated to manage. ADMIN accounts retain global access.
-- ============================================================================
CREATE TABLE IF NOT EXISTS fellowship_leader_family_access (
    access_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    family_id BIGINT NOT NULL,
    granted_by BIGINT NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_leader_family_access UNIQUE (account_id, family_id),
    CONSTRAINT fk_leader_access_account FOREIGN KEY (account_id)
        REFERENCES fellowship_accounts (account_id) ON DELETE CASCADE,
    CONSTRAINT fk_leader_access_family FOREIGN KEY (family_id)
        REFERENCES families (family_id) ON DELETE RESTRICT,
    CONSTRAINT fk_leader_access_granted_by FOREIGN KEY (granted_by)
        REFERENCES fellowship_accounts (account_id) ON DELETE RESTRICT
);

COMMENT ON TABLE fellowship_leader_family_access IS 'Explicit family management scoping for fellowship leader accounts. Admins have implicit global scope.';

-- ============================================================================
-- 12. AUDIT LOGGING TABLE: audit_events
-- ============================================================================
-- Implemented feature: Records system-wide critical operations with JSONB deltas.
-- Populated via automated triggers and stored procedures.
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_events (
    audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_account_id BIGINT NULL,
    entity_type TEXT NOT NULL,
    entity_id BIGINT NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB NULL,
    new_values JSONB NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,

    CONSTRAINT fk_audit_events_actor FOREIGN KEY (actor_account_id)
        REFERENCES fellowship_accounts (account_id) ON DELETE SET NULL,
    CONSTRAINT chk_audit_action_non_empty CHECK (LENGTH(TRIM(action)) > 0),
    CONSTRAINT chk_audit_entity_non_empty CHECK (LENGTH(TRIM(entity_type)) > 0)
);

COMMENT ON TABLE audit_events IS 'Comprehensive audit trail for security, participation changes, capacity alterations, and transfers.';
-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Indexes and Partial Unique Constraints
-- File: database/indexes.sql
-- ============================================================================

-- ============================================================================
-- 1. PEOPLE INDEXES
-- ============================================================================

-- Case-insensitive unique index for optional email addresses.
-- Allows multiple NULL emails, but strictly prohibits duplicates among non-null values.
CREATE UNIQUE INDEX IF NOT EXISTS uq_people_email_lower
    ON people (LOWER(email))
    WHERE email IS NOT NULL;

-- Fast lookup by phone number
CREATE INDEX IF NOT EXISTS idx_people_phone
    ON people (phone);

-- Name search indexing
CREATE INDEX IF NOT EXISTS idx_people_full_name
    ON people (full_name);

-- ============================================================================
-- 2. FELLOWSHIP ACCOUNTS INDEXES
-- ============================================================================

-- Case-insensitive username uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_fellowship_accounts_username_lower
    ON fellowship_accounts (LOWER(username));

-- Foreign key lookup
CREATE INDEX IF NOT EXISTS idx_fellowship_accounts_person
    ON fellowship_accounts (person_id);

-- Active accounts filtering
CREATE INDEX IF NOT EXISTS idx_fellowship_accounts_active_role
    ON fellowship_accounts (role, is_active);

-- ============================================================================
-- 3. STUDENTS INDEXES
-- ============================================================================

-- Case-insensitive unique index for optional university student IDs.
-- Permits multiple NULL values while guaranteeing uniqueness for actual student IDs.
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_university_id_upper
    ON students (UPPER(university_student_id))
    WHERE university_student_id IS NOT NULL;

-- Foreign key reference and reporting indexes
CREATE INDEX IF NOT EXISTS idx_students_department
    ON students (department_id);

CREATE INDEX IF NOT EXISTS idx_students_academic_stage
    ON students (academic_stage_id);

CREATE INDEX IF NOT EXISTS idx_students_gc_classification
    ON students (gc_classification_id);

CREATE INDEX IF NOT EXISTS idx_students_participation
    ON students (participation_status);

-- ============================================================================
-- 4. FAMILIES INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_families_active
    ON families (is_active);

-- ============================================================================
-- 5. FAMILY ASSIGNMENTS (CRITICAL BUSINESS RULES INDEXES)
-- ============================================================================

-- Business Rule 3: One person may have only ONE active ordinary MEMBER family assignment at a time across the entire system.
CREATE UNIQUE INDEX IF NOT EXISTS uq_person_active_member
    ON family_assignments (person_id)
    WHERE role = 'MEMBER' AND end_date IS NULL;

-- Business Rule 5: A person must not have duplicate active roles in the same family.
CREATE UNIQUE INDEX IF NOT EXISTS uq_person_active_role_per_family
    ON family_assignments (family_id, person_id, role)
    WHERE end_date IS NULL;

-- Fast lookup for current active family members and capacity calculations
CREATE INDEX IF NOT EXISTS idx_family_assignments_active_role
    ON family_assignments (family_id, role)
    WHERE end_date IS NULL;

-- Fast temporal query for individual person history
CREATE INDEX IF NOT EXISTS idx_family_assignments_person_history
    ON family_assignments (person_id, start_date DESC);

-- Fast temporal query for family leadership history
CREATE INDEX IF NOT EXISTS idx_family_assignments_leadership_history
    ON family_assignments (family_id, role, start_date DESC)
    WHERE role IN ('DAD', 'MOM');

-- ============================================================================
-- 6. TRANSFER REQUESTS INDEXES
-- ============================================================================

-- Business Rule: A student cannot have more than ONE pending transfer request at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_single_pending_transfer
    ON transfer_requests (student_id)
    WHERE status = 'PENDING';

-- Queue lookups by family destination and status
CREATE INDEX IF NOT EXISTS idx_transfer_requests_to_family_status
    ON transfer_requests (to_family_id, status);

-- Student transfer history lookup
CREATE INDEX IF NOT EXISTS idx_transfer_requests_student
    ON transfer_requests (student_id, requested_at DESC);

-- Capacity override audits
CREATE INDEX IF NOT EXISTS idx_transfer_requests_override
    ON transfer_requests (is_capacity_override)
    WHERE is_capacity_override = TRUE;

-- ============================================================================
-- 7. AUDIT LOGGING INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_events_entity
    ON audit_events (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_recorded_at
    ON audit_events (recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor
    ON audit_events (actor_account_id);
-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Database Functions, Triggers, and Transfer Approval Workflow
-- File: database/functions.sql
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER FUNCTIONS: UPDATED_AT TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_people_updated_at ON people;
CREATE TRIGGER trg_people_updated_at
    BEFORE UPDATE ON people
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_families_updated_at ON families;
CREATE TRIGGER trg_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================================
-- 2. TRIGGER FUNCTION: SCOPED LEADER ACCOUNT VALIDATION
-- ============================================================================
-- Enforces that fellowship_leader_family_access can ONLY contain accounts
-- with role = 'FELLOWSHIP_LEADER'. ADMIN accounts are global and must not
-- be scoped to individual families.
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_check_leader_family_access()
RETURNS TRIGGER AS $$
DECLARE
    v_role account_role_enum;
    v_is_active BOOLEAN;
BEGIN
    SELECT role, is_active INTO v_role, v_is_active
    FROM fellowship_accounts
    WHERE account_id = NEW.account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referenced account ID % does not exist.', NEW.account_id;
    END IF;

    IF v_is_active = FALSE THEN
        RAISE EXCEPTION 'Cannot grant family access to an inactive account (ID %).', NEW.account_id;
    END IF;

    IF v_role <> 'FELLOWSHIP_LEADER' THEN
        RAISE EXCEPTION 'Only accounts with role FELLOWSHIP_LEADER may be assigned family scopes. ADMIN accounts have system-wide authority and must not be restricted (Account ID %, Role %).', NEW.account_id, v_role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fellowship_leader_access_role_check ON fellowship_leader_family_access;
CREATE TRIGGER trg_fellowship_leader_access_role_check
    BEFORE INSERT OR UPDATE ON fellowship_leader_family_access
    FOR EACH ROW
    EXECUTE FUNCTION trg_check_leader_family_access();

-- ============================================================================
-- 3. AUDIT TRIGGER: STUDENT PARTICIPATION STATUS CHANGES
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_audit_student_participation()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.participation_status IS DISTINCT FROM NEW.participation_status) THEN
        NEW.participation_updated_at = CURRENT_TIMESTAMP;

        INSERT INTO audit_events (
            actor_account_id,
            entity_type,
            entity_id,
            action,
            old_values,
            new_values,
            notes
        ) VALUES (
            NEW.participation_updated_by,
            'STUDENT',
            NEW.student_id,
            'PARTICIPATION_CHANGED',
            jsonb_build_object('participation_status', OLD.participation_status),
            jsonb_build_object('participation_status', NEW.participation_status),
            'Student participation status manually updated.'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_students_participation_audit ON students;
CREATE TRIGGER trg_students_participation_audit
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION trg_audit_student_participation();

-- ============================================================================
-- 4. AUDIT TRIGGER: FAMILY CAPACITY CHANGES
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_audit_family_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.member_capacity IS DISTINCT FROM NEW.member_capacity) THEN
        INSERT INTO audit_events (
            actor_account_id,
            entity_type,
            entity_id,
            action,
            old_values,
            new_values,
            notes
        ) VALUES (
            NULL,
            'FAMILY',
            NEW.family_id,
            'CAPACITY_CHANGED',
            jsonb_build_object('member_capacity', OLD.member_capacity),
            jsonb_build_object('member_capacity', NEW.member_capacity),
            'Family member capacity adjusted.'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_families_capacity_audit ON families;
CREATE TRIGGER trg_families_capacity_audit
    AFTER UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION trg_audit_family_capacity();

-- ============================================================================
-- 5. BUSINESS WORKFLOW: REQUEST STUDENT TRANSFER
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_request_student_transfer(
    p_student_id BIGINT,
    p_to_family_id BIGINT,
    p_requested_by BIGINT,
    p_reason TEXT
)
RETURNS BIGINT AS $$
DECLARE
    v_requester_active BOOLEAN;
    v_person_id BIGINT;
    v_current_family_id BIGINT;
    v_to_family_active BOOLEAN;
    v_transfer_id BIGINT;
BEGIN
    -- 1. Validate requester account
    SELECT is_active INTO v_requester_active
    FROM fellowship_accounts
    WHERE account_id = p_requested_by;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Requester account ID % does not exist.', p_requested_by;
    END IF;

    IF v_requester_active = FALSE THEN
        RAISE EXCEPTION 'Inactive accounts cannot submit transfer requests.';
    END IF;

    -- 2. Validate destination family
    SELECT is_active INTO v_to_family_active
    FROM families
    WHERE family_id = p_to_family_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination family ID % does not exist.', p_to_family_id;
    END IF;

    IF v_to_family_active = FALSE THEN
        RAISE EXCEPTION 'Cannot transfer student to an inactive family (ID %).', p_to_family_id;
    END IF;

    -- 3. Fetch student & current active ordinary MEMBER assignment
    SELECT person_id INTO v_person_id
    FROM students
    WHERE student_id = p_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student ID % does not exist.', p_student_id;
    END IF;

    SELECT family_id INTO v_current_family_id
    FROM family_assignments
    WHERE person_id = v_person_id
      AND role = 'MEMBER'
      AND end_date IS NULL;

    -- 4. Check that destination is not current family
    IF v_current_family_id IS NOT NULL AND v_current_family_id = p_to_family_id THEN
        RAISE EXCEPTION 'Student is already an active ordinary member of family ID %.', p_to_family_id;
    END IF;

    -- 5. Insert transfer request (Partial unique index will catch duplicate pending requests)
    INSERT INTO transfer_requests (
        student_id,
        from_family_id,
        to_family_id,
        requested_by,
        status,
        reason
    ) VALUES (
        p_student_id,
        v_current_family_id,
        p_to_family_id,
        p_requested_by,
        'PENDING',
        TRIM(p_reason)
    ) RETURNING transfer_id INTO v_transfer_id;

    -- 6. Log audit event
    INSERT INTO audit_events (
        actor_account_id,
        entity_type,
        entity_id,
        action,
        new_values,
        notes
    ) VALUES (
        p_requested_by,
        'TRANSFER_REQUEST',
        v_transfer_id,
        'INSERT',
        jsonb_build_object(
            'student_id', p_student_id,
            'from_family_id', v_current_family_id,
            'to_family_id', p_to_family_id,
            'reason', p_reason
        ),
        'Transfer request submitted.'
    );

    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. BUSINESS WORKFLOW: APPROVE TRANSFER REQUEST (ATOMIC & CONCURRENCY-SAFE)
-- ============================================================================
-- Enforces:
-- - ONLY ADMIN role may approve (Rule 11)
-- - Locks destination family to prevent concurrent capacity race conditions
-- - Normal capacity limit check
-- - Explicit administrative capacity override with mandatory reason & logging
-- - Validates source family matches student's current active MEMBER assignment
-- - Validates student has not been reassigned/transferred in the interim
-- - Closes old assignment and creates new active assignment in a single transaction
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_approve_transfer_request(
    p_transfer_id BIGINT,
    p_admin_account_id BIGINT,
    p_decision_note TEXT DEFAULT NULL,
    p_allow_capacity_override BOOLEAN DEFAULT FALSE,
    p_override_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_admin_role account_role_enum;
    v_admin_active BOOLEAN;

    v_student_id BIGINT;
    v_req_from_family_id BIGINT;
    v_to_family_id BIGINT;
    v_status transfer_status_enum;

    v_person_id BIGINT;
    v_current_assignment_id BIGINT;
    v_current_family_id BIGINT;

    v_destination_capacity INTEGER;
    v_destination_active BOOLEAN;
    v_destination_name TEXT;
    v_current_member_count INTEGER;

    v_is_override BOOLEAN := FALSE;
    v_override_reason TEXT := NULL;
    v_override_by BIGINT := NULL;
    v_override_at TIMESTAMPTZ := NULL;
BEGIN
    -- Step 1: Authorization check — ONLY ADMIN accounts can approve transfers
    SELECT role, is_active INTO v_admin_role, v_admin_active
    FROM fellowship_accounts
    WHERE account_id = p_admin_account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admin account ID % not found.', p_admin_account_id;
    END IF;

    IF v_admin_active = FALSE THEN
        RAISE EXCEPTION 'Account ID % is inactive.', p_admin_account_id;
    END IF;

    IF v_admin_role <> 'ADMIN' THEN
        RAISE EXCEPTION 'Unauthorized: Only an administrator with role ADMIN can approve transfers (Account ID % has role %).', p_admin_account_id, v_admin_role;
    END IF;

    -- Step 2: Lock the transfer request row to guarantee isolated processing
    SELECT student_id, from_family_id, to_family_id, status
    INTO v_student_id, v_req_from_family_id, v_to_family_id, v_status
    FROM transfer_requests
    WHERE transfer_id = p_transfer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request ID % not found.', p_transfer_id;
    END IF;

    IF v_status <> 'PENDING' THEN
        RAISE EXCEPTION 'Transfer request ID % is not PENDING (current status: %).', p_transfer_id, v_status;
    END IF;

    -- Step 3: Identify the student and their physical person_id
    SELECT person_id INTO v_person_id
    FROM students
    WHERE student_id = v_student_id;

    -- Step 4: Lock and verify the student's current active ordinary MEMBER assignment
    SELECT assignment_id, family_id
    INTO v_current_assignment_id, v_current_family_id
    FROM family_assignments
    WHERE person_id = v_person_id
      AND role = 'MEMBER'
      AND end_date IS NULL
    FOR UPDATE;

    -- Validate that source family matches the student's active assignment
    IF v_req_from_family_id IS NOT NULL THEN
        IF v_current_family_id IS NULL OR v_current_family_id <> v_req_from_family_id THEN
            RAISE EXCEPTION 'Integrity conflict: Student (ID %) current active family (ID %) does not match transfer source family (ID %). The student was modified or transferred after this request was created.',
                v_student_id, v_current_family_id, v_req_from_family_id;
        END IF;
    ELSE
        -- The request was submitted when student had no active family
        IF v_current_family_id IS NOT NULL THEN
            RAISE EXCEPTION 'Integrity conflict: Student (ID %) was unassigned when request was created, but now has an active family assignment (ID %).',
                v_student_id, v_current_family_id;
        END IF;
    END IF;

    -- Step 5: Lock destination family row and calculate capacity atomically
    SELECT member_capacity, is_active, family_name
    INTO v_destination_capacity, v_destination_active, v_destination_name
    FROM families
    WHERE family_id = v_to_family_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination family ID % not found.', v_to_family_id;
    END IF;

    IF v_destination_active = FALSE THEN
        RAISE EXCEPTION 'Destination family "%" (ID %) is inactive.', v_destination_name, v_to_family_id;
    END IF;

    -- Count active ordinary MEMBER assignments in the destination family
    SELECT COUNT(*) INTO v_current_member_count
    FROM family_assignments
    WHERE family_id = v_to_family_id
      AND role = 'MEMBER'
      AND end_date IS NULL;

    -- Capacity evaluation: check if adding 1 member would breach capacity
    IF v_current_member_count >= v_destination_capacity THEN
        IF p_allow_capacity_override = TRUE THEN
            -- Administrator explicit capacity override
            IF p_override_reason IS NULL OR LENGTH(TRIM(p_override_reason)) = 0 THEN
                RAISE EXCEPTION 'Capacity override rejected: An explicit, non-empty reason is mandatory when overriding family capacity limit.';
            END IF;

            v_is_override := TRUE;
            v_override_reason := TRIM(p_override_reason);
            v_override_by := p_admin_account_id;
            v_override_at := CURRENT_TIMESTAMP;
        ELSE
            -- Hard limit enforcement
            RAISE EXCEPTION 'Capacity violation: Destination family "%" has reached capacity (% active members out of % capacity). To override, pass p_allow_capacity_override = TRUE with an explicit reason.',
                v_destination_name, v_current_member_count, v_destination_capacity;
        END IF;
    END IF;

    -- Step 6: Atomic Transition — Close old assignment if one exists
    IF v_current_assignment_id IS NOT NULL THEN
        UPDATE family_assignments
        SET end_date = CURRENT_DATE,
            ended_by = p_admin_account_id,
            end_reason = 'Transferred to ' || v_destination_name || ' (Transfer Request #' || p_transfer_id || ')'
        WHERE assignment_id = v_current_assignment_id;
    END IF;

    -- Step 7: Atomic Transition — Create new active MEMBER assignment
    INSERT INTO family_assignments (
        family_id,
        person_id,
        role,
        start_date,
        end_date,
        assigned_by
    ) VALUES (
        v_to_family_id,
        v_person_id,
        'MEMBER',
        CURRENT_DATE,
        NULL,
        p_admin_account_id
    );

    -- Step 8: Update transfer request status and audit fields
    UPDATE transfer_requests
    SET status = 'APPROVED',
        approved_by = p_admin_account_id,
        decided_at = CURRENT_TIMESTAMP,
        decision_note = TRIM(p_decision_note),
        is_capacity_override = v_is_override,
        capacity_override_reason = v_override_reason,
        capacity_override_by = v_override_by,
        capacity_override_at = v_override_at
    WHERE transfer_id = p_transfer_id;

    -- Step 9: Audit log entry
    INSERT INTO audit_events (
        actor_account_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        notes
    ) VALUES (
        p_admin_account_id,
        'TRANSFER_REQUEST',
        p_transfer_id,
        CASE WHEN v_is_override THEN 'TRANSFER_OVERRIDE' ELSE 'TRANSFER_APPROVED' END,
        jsonb_build_object('status', 'PENDING', 'from_family_id', v_req_from_family_id),
        jsonb_build_object(
            'status', 'APPROVED',
            'to_family_id', v_to_family_id,
            'is_capacity_override', v_is_override,
            'capacity_override_reason', v_override_reason
        ),
        CASE
            WHEN v_is_override THEN 'Transfer approved with authorized administrative capacity override.'
            ELSE 'Transfer approved under standard capacity.'
        END
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. BUSINESS WORKFLOW: REJECT TRANSFER REQUEST
-- ============================================================================
-- Enforces:
-- - ONLY ADMIN role may reject
-- - Rejection preserves full history
-- - Family membership remains completely unchanged
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_reject_transfer_request(
    p_transfer_id BIGINT,
    p_admin_account_id BIGINT,
    p_decision_note TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_admin_role account_role_enum;
    v_admin_active BOOLEAN;
    v_status transfer_status_enum;
BEGIN
    -- Check admin authorization
    SELECT role, is_active INTO v_admin_role, v_admin_active
    FROM fellowship_accounts
    WHERE account_id = p_admin_account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admin account ID % not found.', p_admin_account_id;
    END IF;

    IF v_admin_active = FALSE THEN
        RAISE EXCEPTION 'Account ID % is inactive.', p_admin_account_id;
    END IF;

    IF v_admin_role <> 'ADMIN' THEN
        RAISE EXCEPTION 'Unauthorized: Only an administrator with role ADMIN can reject transfers (Account ID % has role %).', p_admin_account_id, v_admin_role;
    END IF;

    -- Lock and check request status
    SELECT status INTO v_status
    FROM transfer_requests
    WHERE transfer_id = p_transfer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request ID % not found.', p_transfer_id;
    END IF;

    IF v_status <> 'PENDING' THEN
        RAISE EXCEPTION 'Transfer request ID % is not PENDING (current status: %).', p_transfer_id, v_status;
    END IF;

    -- Mark rejected (assignments remain untouched)
    UPDATE transfer_requests
    SET status = 'REJECTED',
        approved_by = p_admin_account_id,
        decided_at = CURRENT_TIMESTAMP,
        decision_note = TRIM(p_decision_note)
    WHERE transfer_id = p_transfer_id;

    -- Audit log
    INSERT INTO audit_events (
        actor_account_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        notes
    ) VALUES (
        p_admin_account_id,
        'TRANSFER_REQUEST',
        p_transfer_id,
        'TRANSFER_REJECTED',
        jsonb_build_object('status', 'PENDING'),
        jsonb_build_object('status', 'REJECTED', 'decision_note', p_decision_note),
        'Transfer request rejected. Family assignments unaltered.'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. BUSINESS WORKFLOW: ASSIGN FAMILY ROLE (DIRECT ASSIGNMENT)
-- ============================================================================
-- Supports assigning DAD, MOM, or MEMBER roles.
-- When assigning MEMBER, capacity is locked and verified with override support.
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_assign_family_role(
    p_family_id BIGINT,
    p_person_id BIGINT,
    p_role family_role_enum,
    p_assigned_by BIGINT,
    p_allow_capacity_override BOOLEAN DEFAULT FALSE,
    p_override_reason TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_capacity INTEGER;
    v_is_active BOOLEAN;
    v_family_name TEXT;
    v_current_count INTEGER;
    v_new_assignment_id BIGINT;
BEGIN
    -- Verify family
    SELECT member_capacity, is_active, family_name
    INTO v_capacity, v_is_active, v_family_name
    FROM families
    WHERE family_id = p_family_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Family ID % not found.', p_family_id;
    END IF;

    IF v_is_active = FALSE THEN
        RAISE EXCEPTION 'Cannot assign person to inactive family "%".', v_family_name;
    END IF;

    -- If assigning ordinary MEMBER, check capacity
    IF p_role = 'MEMBER' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM family_assignments
        WHERE family_id = p_family_id
          AND role = 'MEMBER'
          AND end_date IS NULL;

        IF v_current_count >= v_capacity THEN
            IF p_allow_capacity_override = FALSE THEN
                RAISE EXCEPTION 'Capacity exceeded: Family "%" has % of % active members.', v_family_name, v_current_count, v_capacity;
            ELSE
                IF p_override_reason IS NULL OR LENGTH(TRIM(p_override_reason)) = 0 THEN
                    RAISE EXCEPTION 'Capacity override requires an explicit, non-empty reason.';
                END IF;
            END IF;
        END IF;
    END IF;

    -- Insert assignment (constraints will enforce one active member role and no duplicate role in same family)
    INSERT INTO family_assignments (
        family_id,
        person_id,
        role,
        start_date,
        end_date,
        assigned_by
    ) VALUES (
        p_family_id,
        p_person_id,
        p_role,
        CURRENT_DATE,
        NULL,
        p_assigned_by
    ) RETURNING assignment_id INTO v_new_assignment_id;

    RETURN v_new_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. BUSINESS WORKFLOW: END FAMILY ASSIGNMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_end_family_assignment(
    p_assignment_id BIGINT,
    p_ended_by BIGINT,
    p_end_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE family_assignments
    SET end_date = CURRENT_DATE,
        ended_by = p_ended_by,
        end_reason = TRIM(p_end_reason)
    WHERE assignment_id = p_assignment_id
      AND end_date IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active assignment ID % not found or already ended.', p_assignment_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Reporting Database Views
-- File: database/views.sql
-- ============================================================================

-- ============================================================================
-- VIEW 1 & 2: Student Totals, Active, and Inactive Breakdown
-- ============================================================================
CREATE OR REPLACE VIEW vw_student_participation_summary AS
SELECT
    COUNT(*) AS total_students,
    COUNT(*) FILTER (WHERE participation_status = 'ACTIVE') AS active_students,
    COUNT(*) FILTER (WHERE participation_status = 'INACTIVE') AS inactive_students,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE participation_status = 'ACTIVE') / NULLIF(COUNT(*), 0),
        2
    ) AS active_percentage
FROM students;

COMMENT ON VIEW vw_student_participation_summary IS 'System-wide summary of student counts and participation status.';

-- ============================================================================
-- VIEW 3: Students Grouped by Academic Stage (Remedial = 0 Year, etc.)
-- ============================================================================
CREATE OR REPLACE VIEW vw_students_by_academic_stage AS
SELECT
    COALESCE(ast.year_number, -1) AS year_number,
    COALESCE(ast.stage_name, 'Unassigned Academic Stage') AS stage_name,
    COUNT(s.student_id) AS total_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'ACTIVE') AS active_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'INACTIVE') AS inactive_students
FROM students s
LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
GROUP BY ast.year_number, ast.stage_name, ast.display_order
ORDER BY ast.display_order NULLS LAST, ast.year_number NULLS LAST;

COMMENT ON VIEW vw_students_by_academic_stage IS 'Students categorized by academic stage, with Remedial sorted as 0 Year.';

-- ============================================================================
-- VIEW 4: Students Grouped by GC (Graduating Class) Classification
-- ============================================================================
CREATE OR REPLACE VIEW vw_students_by_gc_classification AS
SELECT
    COALESCE(gc.classification_name, 'Unassigned GC Classification') AS gc_classification,
    COUNT(s.student_id) AS total_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'ACTIVE') AS active_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'INACTIVE') AS inactive_students
FROM students s
LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
GROUP BY gc.classification_name
ORDER BY total_students DESC, gc.classification_name ASC;

COMMENT ON VIEW vw_students_by_gc_classification IS 'Students categorized by Graduating Class (GC) classification independent of academic year.';

-- ============================================================================
-- VIEW 5: Students Grouped by Department
-- ============================================================================
CREATE OR REPLACE VIEW vw_students_by_department AS
SELECT
    COALESCE(d.department_name, 'Unassigned Department') AS department_name,
    COUNT(s.student_id) AS total_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'ACTIVE') AS active_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'INACTIVE') AS inactive_students
FROM students s
LEFT JOIN departments d ON s.department_id = d.department_id
GROUP BY d.department_name
ORDER BY total_students DESC, d.department_name ASC;

COMMENT ON VIEW vw_students_by_department IS 'Distribution of fellowship students across university academic departments.';

-- ============================================================================
-- VIEW 6: Students with No Active Ordinary Family Membership
-- ============================================================================
CREATE OR REPLACE VIEW vw_students_unassigned_to_family AS
SELECT
    s.student_id,
    s.university_student_id,
    p.person_id,
    p.full_name,
    p.phone,
    p.email,
    s.gender,
    ast.stage_name AS academic_stage,
    ast.year_number AS academic_year,
    gc.classification_name AS gc_classification,
    d.department_name,
    s.participation_status
FROM students s
JOIN people p ON s.person_id = p.person_id
LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
LEFT JOIN departments d ON s.department_id = d.department_id
WHERE NOT EXISTS (
    SELECT 1
    FROM family_assignments fa
    WHERE fa.person_id = s.person_id
      AND fa.role = 'MEMBER'
      AND fa.end_date IS NULL
)
ORDER BY p.full_name ASC;

COMMENT ON VIEW vw_students_unassigned_to_family IS 'Students currently lacking an active ordinary MEMBER assignment in any fellowship family.';

-- ============================================================================
-- VIEW 7: Each Family Role Counts (DAD, MOM, MEMBER)
-- ============================================================================
CREATE OR REPLACE VIEW vw_family_role_counts AS
SELECT
    f.family_id,
    f.family_code,
    f.family_name,
    f.is_active,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'DAD' AND fa.end_date IS NULL) AS active_dads_count,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MOM' AND fa.end_date IS NULL) AS active_moms_count,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) AS active_members_count,
    COUNT(fa.assignment_id) FILTER (WHERE fa.end_date IS NULL) AS total_active_people_count
FROM families f
LEFT JOIN family_assignments fa ON f.family_id = fa.family_id
GROUP BY f.family_id, f.family_code, f.family_name, f.is_active
ORDER BY f.family_name ASC;

COMMENT ON VIEW vw_family_role_counts IS 'Count of active DAD, MOM, and ordinary MEMBER assignments per family.';

-- ============================================================================
-- VIEW 8 & 9: Family Active Members, Capacity, Remaining Spaces & Status
-- ============================================================================
CREATE OR REPLACE VIEW vw_family_capacity_status AS
SELECT
    f.family_id,
    f.family_code,
    f.family_name,
    f.is_active,
    f.member_capacity AS configured_capacity,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) AS active_member_count,
    f.member_capacity - COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) AS remaining_spaces,
    CASE
        WHEN COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) < f.member_capacity THEN 'BELOW_CAPACITY'
        WHEN COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) = f.member_capacity THEN 'AT_CAPACITY'
        ELSE 'OVER_CAPACITY'
    END AS capacity_status
FROM families f
LEFT JOIN family_assignments fa ON f.family_id = fa.family_id
GROUP BY f.family_id, f.family_code, f.family_name, f.is_active, f.member_capacity
ORDER BY f.family_name ASC;

COMMENT ON VIEW vw_family_capacity_status IS 'Real-time capacity tracking comparing active ordinary members to configured limit.';

-- ============================================================================
-- VIEW 11: Transfer Request History with Requester, Approver, & Override Auditing
-- ============================================================================
CREATE OR REPLACE VIEW vw_transfer_request_history AS
SELECT
    tr.transfer_id,
    tr.student_id,
    stu_p.full_name AS student_name,
    s.university_student_id,
    tr.from_family_id,
    ff.family_name AS from_family_name,
    ff.family_code AS from_family_code,
    tr.to_family_id,
    tf.family_name AS to_family_name,
    tf.family_code AS to_family_code,
    tr.status,
    tr.reason,
    tr.requested_at,
    req_acc.username AS requested_by_username,
    req_p.full_name AS requested_by_name,
    tr.decided_at,
    tr.decision_note,
    app_acc.username AS approved_by_username,
    app_p.full_name AS approved_by_name,
    tr.is_capacity_override,
    tr.capacity_override_reason,
    ovr_acc.username AS capacity_override_by_username,
    tr.capacity_override_at
FROM transfer_requests tr
JOIN students s ON tr.student_id = s.student_id
JOIN people stu_p ON s.person_id = stu_p.person_id
LEFT JOIN families ff ON tr.from_family_id = ff.family_id
JOIN families tf ON tr.to_family_id = tf.family_id
JOIN fellowship_accounts req_acc ON tr.requested_by = req_acc.account_id
JOIN people req_p ON req_acc.person_id = req_p.person_id
LEFT JOIN fellowship_accounts app_acc ON tr.approved_by = app_acc.account_id
LEFT JOIN people app_p ON app_acc.person_id = app_p.person_id
LEFT JOIN fellowship_accounts ovr_acc ON tr.capacity_override_by = ovr_acc.account_id
ORDER BY tr.requested_at DESC;

COMMENT ON VIEW vw_transfer_request_history IS 'Detailed historical log of all family transfer requests and administrative outcomes.';

-- ============================================================================
-- VIEW 12: Current Student Roster by Family
-- ============================================================================
CREATE OR REPLACE VIEW vw_family_student_roster AS
SELECT
    f.family_id,
    f.family_code,
    f.family_name,
    fa.role AS assignment_role,
    fa.start_date AS assigned_date,
    p.person_id,
    p.full_name,
    p.phone,
    p.email,
    s.student_id,
    s.university_student_id,
    s.gender,
    d.department_name,
    ast.stage_name AS academic_stage,
    ast.year_number AS academic_year,
    gc.classification_name AS gc_classification,
    s.participation_status
FROM families f
JOIN family_assignments fa ON f.family_id = fa.family_id AND fa.end_date IS NULL
JOIN people p ON fa.person_id = p.person_id
LEFT JOIN students s ON p.person_id = s.person_id
LEFT JOIN departments d ON s.department_id = d.department_id
LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
ORDER BY f.family_name ASC, fa.role DESC, p.full_name ASC;

COMMENT ON VIEW vw_family_student_roster IS 'Current active roster of family members and leaders with complete student profiles.';

-- ============================================================================
-- VIEW 13: Students with Incomplete Profiles (Missing Dept, Stage, or GC)
-- ============================================================================
CREATE OR REPLACE VIEW vw_students_with_missing_data AS
SELECT
    s.student_id,
    s.university_student_id,
    p.person_id,
    p.full_name,
    p.phone,
    p.email,
    s.gender,
    s.department_id IS NULL AS is_missing_department,
    s.academic_stage_id IS NULL AS is_missing_academic_stage,
    s.gc_classification_id IS NULL AS is_missing_gc_classification,
    s.participation_status
FROM students s
JOIN people p ON s.person_id = p.person_id
WHERE s.department_id IS NULL
   OR s.academic_stage_id IS NULL
   OR s.gc_classification_id IS NULL
ORDER BY p.full_name ASC;

COMMENT ON VIEW vw_students_with_missing_data IS 'Data quality view identifying student records requiring profile completion.';

-- ============================================================================
-- VIEW 14: Family Leadership History (DAD and MOM Role Transitions)
-- ============================================================================
CREATE OR REPLACE VIEW vw_family_leadership_history AS
SELECT
    f.family_id,
    f.family_code,
    f.family_name,
    fa.assignment_id,
    fa.role AS leadership_role,
    p.person_id,
    p.full_name AS leader_name,
    p.phone AS leader_phone,
    fa.start_date,
    fa.end_date,
    CASE WHEN fa.end_date IS NULL THEN 'CURRENT_LEADER' ELSE 'FORMER_LEADER' END AS leadership_status,
    assigner_acc.username AS assigned_by_username,
    ender_acc.username AS ended_by_username,
    fa.end_reason
FROM family_assignments fa
JOIN families f ON fa.family_id = f.family_id
JOIN people p ON fa.person_id = p.person_id
JOIN fellowship_accounts assigner_acc ON fa.assigned_by = assigner_acc.account_id
LEFT JOIN fellowship_accounts ender_acc ON fa.ended_by = ender_acc.account_id
WHERE fa.role IN ('DAD', 'MOM')
ORDER BY f.family_name ASC, fa.role ASC, fa.start_date DESC;

COMMENT ON VIEW vw_family_leadership_history IS 'Chronological record of family dad and mom appointments and departures.';
-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Fictional Demonstration and Testing Seed Data
-- File: database/seed.sql
-- ============================================================================

-- Disable notices during seed run
SET client_min_messages = warning;

-- ============================================================================
-- 1. DEPARTMENTS SEED DATA
-- ============================================================================
INSERT INTO departments (department_name, is_active) VALUES
    ('Information & Communication Technology', TRUE),
    ('Electrical & Electronics Technology', TRUE),
    ('Automotive Technology', TRUE),
    ('Manufacturing Technology', TRUE),
    ('Civil & Construction Technology', TRUE)
ON CONFLICT (department_name) DO NOTHING;

-- ============================================================================
-- 2. ACADEMIC STAGES (Remedial = 0 Year, First Year = 1 Year, etc.)
-- ============================================================================
INSERT INTO academic_stages (stage_name, year_number, display_order, is_active) VALUES
    ('Remedial (0 Year)', 0, 0, TRUE),
    ('First Year (1st Year)', 1, 1, TRUE),
    ('Second Year (2nd Year)', 2, 2, TRUE),
    ('Third Year (3rd Year)', 3, 3, TRUE),
    ('Fourth Year (4th Year)', 4, 4, TRUE),
    ('Fifth Year (5th Year)', 5, 5, TRUE)
ON CONFLICT (stage_name) DO UPDATE
SET year_number = EXCLUDED.year_number,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- 3. GC (GRADUATING CLASS) CLASSIFICATIONS
-- ============================================================================
INSERT INTO gc_classifications (classification_name, description, is_active) VALUES
    ('Graduating Class (GC)', 'Students currently in the final year of their specific academic curriculum.', TRUE),
    ('Non-Graduating (Non-GC)', 'Continuing students not yet eligible for graduating class status.', TRUE)
ON CONFLICT (classification_name) DO NOTHING;

-- ============================================================================
-- 4. PHYSICAL INDIVIDUALS (people)
-- Fictional dataset covering Administrators, Leaders, Dads, Moms, and Students
-- ============================================================================
INSERT INTO people (full_name, phone, email) VALUES
    -- 1: System Admin
    ('Samuel Kassa (Admin)', '+251-911-000001', 'admin.samuel@fellowship.example.org'),
    -- 2: Fellowship Leader 1
    ('Ruth Haile (Leader)', '+251-911-000002', 'ruth.haile@fellowship.example.org'),
    -- 3: Fellowship Leader 2
    ('Daniel Bekele (Leader)', '+251-911-000003', 'daniel.bekele@fellowship.example.org'),
    -- 4: Senior Non-Student Dad (Bethel Family Dad)
    ('Pastor Yohannes Tesfaye', '+251-911-000004', 'yohannes.tesfaye@community.example.org'),
    -- 5: Senior Non-Student Mom (Bethel Family Mom)
    ('Sister Martha Girma', '+251-911-000005', 'martha.girma@community.example.org'),
    -- 6: Student who also serves as Dad of Shiloh Family (Dual Role: Student + Family Dad)
    ('Dawit Tadesse (Student & Dad)', '+251-911-000006', 'dawit.tadesse@student.example.org'),
    -- 7: Student who is a MEMBER in Bethel Family and MOM in Ebenezer Family (Dual Family Role)
    ('Sara Solomon (Member & Mom)', '+251-911-000007', 'sara.solomon@student.example.org'),
    -- 8: Ebenezer Family Dad
    ('Elder Michael Alemu', '+251-911-000008', 'michael.alemu@community.example.org'),
    -- 9: Zion Family Dad
    ('Pastor Ephrem Mengistu', '+251-911-000009', 'ephrem.mengistu@community.example.org'),
    -- 10: Zion Family Mom
    ('Sister Hana Desta', '+251-911-000010', 'hana.desta@community.example.org'),
    -- 11-17: Regular Students
    ('Bereket Wolde', '+251-911-000011', 'bereket.wolde@student.example.org'),
    ('Hellen Negash', '+251-911-000012', 'hellen.negash@student.example.org'),
    ('Nahom Fikru', '+251-911-000013', 'nahom.fikru@student.example.org'),
    ('Liya Kebede', '+251-911-000014', 'liya.kebede@student.example.org'),
    ('Abel Tefera', '+251-911-000015', 'abel.tefera@student.example.org'),
    ('Eden Shimelis', '+251-911-000016', 'eden.shimelis@student.example.org'),
    ('Kaleb Mulugeta', '+251-911-000017', 'kaleb.mulugeta@student.example.org'),
    -- 18: Unassigned Student (No active family)
    ('Tsion Assefa (Unassigned)', '+251-911-000018', 'tsion.assefa@student.example.org'),
    -- 19: Incomplete Profile Student (Missing Stage, Dept, GC)
    ('Yonas Hailu (Incomplete Profile)', '+251-911-000019', 'yonas.hailu@student.example.org');

-- ============================================================================
-- 5. FELLOWSHIP PRIVILEGED ACCOUNTS (fellowship_accounts)
-- Notice: Dads, Moms, and regular members have NO accounts.
-- Only ADMIN and FELLOWSHIP_LEADER accounts exist.
-- Fictional PBKDF2/bcrypt placeholder hash used for seed demonstration.
-- ============================================================================
INSERT INTO fellowship_accounts (person_id, username, password_hash, role, is_active) VALUES
    -- Initial System Administrator
    (1, 'admin_samuel', '$2a$12$e86gXh8kLmNpQrStUvWxYzO1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O', 'ADMIN', TRUE),
    -- Fellowship Leader 1
    (2, 'leader_ruth', '$2a$12$aB3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V3w4X5y6Z7A8B', 'FELLOWSHIP_LEADER', TRUE),
    -- Fellowship Leader 2
    (3, 'leader_daniel', '$2a$12$zY9x8W7v6U5t4S3r2Q1p0O9n8M7l6K5j4I3h2G1f0E9d8C7b6A5Z4Y', 'FELLOWSHIP_LEADER', TRUE);

-- ============================================================================
-- 6. FAMILIES
-- Varied member capacities to test below-capacity, at-capacity, and over-capacity
-- ============================================================================
INSERT INTO families (family_code, family_name, member_capacity, is_active, created_by) VALUES
    ('FAM-BTH', 'Bethel Family', 4, TRUE, 1),      -- Capacity 4
    ('FAM-EBN', 'Ebenezer Family', 3, TRUE, 1),    -- Capacity 3
    ('FAM-SHL', 'Shiloh Family', 2, TRUE, 1),      -- Capacity 2
    ('FAM-ZON', 'Zion Family', 5, TRUE, 1);        -- Capacity 5

-- ============================================================================
-- 7. OPTIONAL SCOPING: fellowship_leader_family_access
-- ============================================================================
INSERT INTO fellowship_leader_family_access (account_id, family_id, granted_by) VALUES
    (2, 1, 1),  -- Ruth assigned to Bethel Family
    (2, 2, 1),  -- Ruth assigned to Ebenezer Family
    (3, 3, 1),  -- Daniel assigned to Shiloh Family
    (3, 4, 1);  -- Daniel assigned to Zion Family

-- ============================================================================
-- 8. STUDENTS
-- ============================================================================
INSERT INTO students (
    person_id,
    university_student_id,
    department_id,
    academic_stage_id,
    gc_classification_id,
    gender,
    enrollment_date,
    participation_status,
    participation_updated_by,
    created_by
) VALUES
    -- Dawit: 4th Year, GC, Male, ICT (Also Shiloh Dad)
    (6, 'FTVTI/2021/0101', 1, 5, 1, 'MALE', '2021-10-15', 'ACTIVE', 1, 1),
    -- Sara: 3rd Year, GC (3-yr program), Female, Garment/Manufacturing (Also Ebenezer Mom, Bethel Member)
    (7, 'FTVTI/2022/0202', 4, 4, 1, 'FEMALE', '2022-10-20', 'ACTIVE', 1, 1),
    -- Bereket: Remedial (0 Year), Non-GC, Male, ICT
    (11, 'FTVTI/2025/0301', 1, 1, 2, 'MALE', '2025-09-01', 'ACTIVE', 1, 1),
    -- Hellen: 1st Year (1 Year), Non-GC, Female, Electrical
    (12, 'FTVTI/2024/0402', 2, 2, 2, 'FEMALE', '2024-10-05', 'ACTIVE', 1, 1),
    -- Nahom: 2nd Year (2 Year), Non-GC, Male, Automotive
    (13, 'FTVTI/2023/0503', 3, 3, 2, 'MALE', '2023-10-10', 'ACTIVE', 1, 1),
    -- Liya: 3rd Year (3 Year), Non-GC, Female, Civil
    (14, 'FTVTI/2022/0604', 5, 4, 2, 'FEMALE', '2022-10-12', 'ACTIVE', 1, 1),
    -- Abel: 4th Year (4 Year), GC, Male, Electrical
    (15, 'FTVTI/2021/0705', 2, 5, 1, 'MALE', '2021-10-01', 'ACTIVE', 1, 1),
    -- Eden: 2nd Year (2 Year), Non-GC, Female, ICT
    (16, 'FTVTI/2023/0806', 1, 3, 2, 'FEMALE', '2023-10-15', 'INACTIVE', 1, 1),
    -- Kaleb: 1st Year (1 Year), Non-GC, Male, Civil
    (17, 'FTVTI/2024/0907', 5, 2, 2, 'MALE', '2024-10-25', 'ACTIVE', 1, 1),
    -- Tsion: Remedial (0 Year), Non-GC, Female, Automotive (Currently Unassigned to family)
    (18, 'FTVTI/2025/1008', 3, 1, 2, 'FEMALE', '2025-09-01', 'ACTIVE', 1, 1),
    -- Yonas: Incomplete Profile (Null dept, stage, gc)
    (19, NULL, NULL, NULL, NULL, 'MALE', '2025-09-01', 'ACTIVE', 1, 1);

-- ============================================================================
-- 9. FAMILY ASSIGNMENTS (Dads, Moms, Ordinary Members, Past History)
-- ============================================================================
INSERT INTO family_assignments (
    family_id,
    person_id,
    role,
    start_date,
    end_date,
    assigned_by,
    ended_by,
    end_reason
) VALUES
    -- BETHEL FAMILY (Capacity = 4)
    -- Active Dad (Non-student)
    (1, 4, 'DAD', '2023-09-01', NULL, 1, NULL, NULL),
    -- Active Mom (Non-student)
    (1, 5, 'MOM', '2023-09-01', NULL, 1, NULL, NULL),
    -- Active Members: Sara, Bereket, Hellen, Nahom (4 active members -> AT CAPACITY)
    (1, 7, 'MEMBER', '2023-10-01', NULL, 1, NULL, NULL),
    (1, 11, 'MEMBER', '2025-09-10', NULL, 1, NULL, NULL),
    (1, 12, 'MEMBER', '2024-10-15', NULL, 1, NULL, NULL),
    (1, 13, 'MEMBER', '2023-10-20', NULL, 1, NULL, NULL),

    -- EBENEZER FAMILY (Capacity = 3)
    -- Active Dad
    (2, 8, 'DAD', '2022-09-01', NULL, 1, NULL, NULL),
    -- Active Mom (Sara Solomon: Dual role -> Bethel Member & Ebenezer Mom!)
    (2, 7, 'MOM', '2024-09-01', NULL, 1, NULL, NULL),
    -- Former Mom in Ebenezer (Historical assignment preserved!)
    (2, 10, 'MOM', '2022-09-01', '2024-08-31', 1, 1, 'Graduated and relocated to Zion family'),
    -- Active Members: Liya, Abel (2 active members out of 3 capacity -> BELOW CAPACITY)
    (2, 14, 'MEMBER', '2022-10-15', NULL, 1, NULL, NULL),
    (2, 15, 'MEMBER', '2021-10-10', NULL, 1, NULL, NULL),

    -- SHILOH FAMILY (Capacity = 2)
    -- Active Dad (Dawit Tadesse: Dual role -> Student + Family Dad!)
    (3, 6, 'DAD', '2024-09-01', NULL, 1, NULL, NULL),
    -- Shiloh has no active Mom currently (Validating that families do not require both)
    -- Active Members: Eden, Kaleb (2 active members out of 2 capacity -> AT CAPACITY)
    (3, 16, 'MEMBER', '2023-10-20', NULL, 1, NULL, NULL),
    (3, 17, 'MEMBER', '2024-10-28', NULL, 1, NULL, NULL),

    -- ZION FAMILY (Capacity = 5)
    -- Active Dad
    (4, 9, 'DAD', '2024-09-01', NULL, 1, NULL, NULL),
    -- Active Mom
    (4, 10, 'MOM', '2024-09-01', NULL, 1, NULL, NULL),
    -- Currently 0 active ordinary members (BELOW CAPACITY, 5 spaces available)

    -- Historical assignment for Bereket (previously Member in Shiloh, ended when transferred)
    (3, 11, 'MEMBER', '2025-08-01', '2025-09-09', 1, 1, 'Transferred to Bethel Family');

-- ============================================================================
-- 10. TRANSFER REQUESTS (Completed, Rejected, and Pending Examples)
-- ============================================================================
INSERT INTO transfer_requests (
    student_id,
    from_family_id,
    to_family_id,
    requested_by,
    approved_by,
    status,
    reason,
    requested_at,
    decided_at,
    decision_note,
    is_capacity_override,
    capacity_override_reason,
    capacity_override_by,
    capacity_override_at
) VALUES
    -- Completed transfer (Bereket from Shiloh to Bethel)
    (
        3, -- Bereket Wolde (student_id = 3)
        3, -- from Shiloh
        1, -- to Bethel
        2, -- requested by Leader Ruth
        1, -- approved by Admin Samuel
        'APPROVED',
        'Schedule conflict with Shiloh family weekly prayer meeting.',
        CURRENT_TIMESTAMP - INTERVAL '30 days',
        CURRENT_TIMESTAMP - INTERVAL '29 days',
        'Approved after reviewing family meeting times.',
        FALSE,
        NULL,
        NULL,
        NULL
    ),
    -- Rejected transfer (Abel from Ebenezer to Bethel)
    (
        7, -- Abel Tefera (student_id = 7)
        2, -- from Ebenezer
        1, -- to Bethel
        3, -- requested by Leader Daniel
        1, -- decided by Admin Samuel
        'REJECTED',
        'Requested move to be with department coursemates.',
        CURRENT_TIMESTAMP - INTERVAL '15 days',
        CURRENT_TIMESTAMP - INTERVAL '14 days',
        'Rejected: Bethel is already at capacity; balance maintained in Ebenezer.',
        FALSE,
        NULL,
        NULL,
        NULL
    ),
    -- Active Pending transfer (Liya from Ebenezer to Zion)
    (
        6, -- Liya Kebede (student_id = 6)
        2, -- from Ebenezer
        4, -- to Zion
        2, -- requested by Leader Ruth
        NULL,
        'PENDING',
        'Dormitory relocation to Block 42 closer to Zion fellowship location.',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        NULL,
        NULL,
        FALSE,
        NULL,
        NULL,
        NULL
    );
