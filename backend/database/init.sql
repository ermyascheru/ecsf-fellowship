-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Master Initialization Script
-- File: database/init.sql
-- ============================================================================

\echo '======================================================================'
\echo 'INITIALIZING FTVTI ECSF FELLOWSHIP DATABASE LAYER'
\echo '======================================================================'

\echo '1. Loading Schema & Table Definitions...'
\i schema.sql

\echo '2. Applying Performance and Partial Unique Indexes...'
\i indexes.sql

\echo '3. Creating Triggers, Business Functions & Workflow Procedures...'
\i functions.sql

\echo '4. Creating Analytical & Reporting Views...'
\i views.sql

\echo '5. Seeding Fictional Demonstration Dataset...'
\i seed.sql

\echo '======================================================================'
\echo 'FTVTI ECSF DATABASE INITIALIZATION COMPLETE!'
\echo '======================================================================'
