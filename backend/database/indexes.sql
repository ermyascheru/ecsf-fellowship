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
