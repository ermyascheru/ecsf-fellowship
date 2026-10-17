# FTVTI ECSF Fellowship Student & Family Management System

Production-grade, full-stack management system built for the **FTVTI ECSF Fellowship**. The system manages students, fellowship family assignments, capacity limits, transfers, reports, and administrative access over PostgreSQL 16+.

---

## 1. Visual & Architectural Identity

The UI design is implemented following the design specifications and reference mockups:
- **Primary Color**: Deep Navy Blue (`#0F172A` / `#0A192F`)
- **Accent & Primary Buttons**: Royal Blue (`#2563EB`)
- **Backgrounds**: Slate White (`#F8FAFC`)
- **Status Badges**:
  - **Green**: On Track / Active / Approved
  - **Amber**: At Capacity / Pending
  - **Red**: Over Capacity / Rejected / Disabled
  - **Yellow**: Below Target
  - **Gray**: Inactive / Cancelled
- **Official Brand Mark**: Authentic ECSF Cross & Sunburst vector emblem located at `public/logo.svg` and `src/assets/logo.svg`.

---

## 2. Core Business Rules

1. **Role Separation**:
   - Only `ADMIN` and `FELLOWSHIP_LEADER` have login accounts (`fellowship_accounts`).
   - Family Dads, Moms, and regular Members **never log in** and do not have accounts.
2. **Normalized People Identity**:
   - One physical person has a single `people` record. A person can be a student, a family Dad/Mom, and an administrator concurrently without duplicate records.
3. **Academic Stages & GC**:
   - `Remedial` is strictly **Year 0** (not First Year).
   - `GC` (Graduating Class) is an independent, manually assigned classification rather than a calculated numeric year.
4. **Family Member Capacity**:
   - `member_capacity` applies **strictly to ordinary `MEMBER` roles**. Dads and Moms are leadership roles and do not consume member capacity.
   - Any transfer that would exceed family capacity requires transactional locking (`SELECT FOR UPDATE`), explicit administrator override (`allow_capacity_override = TRUE`), a mandatory documented reason, and an immutable audit trail.

---

## 3. Technology Stack

- **Frontend**:
  - React 18 + Vite + TypeScript
  - Tailwind CSS + Lucide Icons
  - TanStack React Query (server state & caching)
  - React Router v6
  - Recharts (Interactive responsive charts)
- **Backend API**:
  - Node.js + Express + TypeScript
  - PostgreSQL driver (`pg` with connection pooling & transaction helpers)
  - Zod (Request schema validation)
  - JWT Authentication + bcryptjs password hashing
  - ExcelJS (Excel `.xlsx` generation)
  - PDFKit (PDF report generation)
- **Database**:
  - PostgreSQL 16+ (`ftvti_ecsf_fellowship`)
  - Complete schema, views (`vw_family_capacity_status`, `vw_students_by_academic_stage`, etc.), stored procedures (`fn_approve_transfer_request`), and audit triggers.

---

## 4. Default Credentials (Development)

| Username | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `admin_samuel` | `Admin@123` | `ADMIN` | System Administrator (Full campus access) |
| `leader_ruth` | `Leader@123` | `FELLOWSHIP_LEADER` | Fellowship Leader (Bethlehem & Jerusalem) |
| `leader_daniel` | `Leader@123` | `FELLOWSHIP_LEADER` | Fellowship Leader (Antioch) |

---

## 5. Quick Start Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 16+ running locally on port `5432` with database `ftvti_ecsf_fellowship`.

### Running the Backend
```bash
cd backend
npm install
npm run dev
# Server starts on http://localhost:5000/api
```

### Running Backend Integration Tests
```bash
cd backend
npm test
# Runs 18 automated integration tests against live PostgreSQL
```

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
# Vite dev server starts on http://localhost:3000
```

### Building the Frontend for Production
```bash
cd frontend
npm run build
# Compiles TypeScript and creates optimized bundles in frontend/dist
```

---

## 6. Route Map

| Path | Description | Access |
| :--- | :--- | :--- |
| `/login` | Authentication page with split-screen navy branding | Public |
| `/dashboard` | Metrics, stage charts, capacity health, quick actions | Authenticated |
| `/students` | Student directory with search, stage filter, and status | Authenticated |
| `/students/new` | Register new student record | Authenticated |
| `/students/:id` | Student profile, family history, and participation toggle | Authenticated |
| `/students/:id/edit` | Edit academic stage, department, and GC status | Authenticated |
| `/people` | Global people directory (students, leaders, staff) | Authenticated |
| `/people/:id` | Person profile with linked student and account cards | Authenticated |
| `/families` | Family directory with live capacity status badges | Authenticated |
| `/families/new` | Create family unit and set member capacity | Authenticated |
| `/families/:id` | Family details, Dads/Moms, members, and role history | Authenticated |
| `/families/:id/edit` | Update family name and capacity ceiling | Authenticated |
| `/transfers` | Transfer requests with status tabs (Pending, Approved, Rejected) | Authenticated |
| `/transfers/:id` | Transfer inspection, approval modal, and capacity override | Authenticated |
| `/reports` | 2x3 interactive report catalog with instant export buttons | Authenticated |
| `/reports/family-summary` | Live report of family capacities and leaders | Authenticated |
| `/reports/students` | Comprehensive student roster | Authenticated |
| `/reports/academic-stages` | Students grouped by stage (Remedial Year 0 to Senior) | Authenticated |
| `/reports/departments` | Student distribution across faculties | Authenticated |
| `/reports/participation` | Active vs. Inactive attendance analysis | Authenticated |
| `/reports/family-capacity` | Capacity alerts and override audit trail | Authenticated |
| `/reports/unassigned-students`| Students pending active family placement | Authenticated |
| `/accounts` | Administrator-only user management & family scoping | `ADMIN` only |
| `/settings` | System lookups (Departments, Stages, GC categories) | `ADMIN` only |
