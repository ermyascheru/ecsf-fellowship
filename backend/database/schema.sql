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
