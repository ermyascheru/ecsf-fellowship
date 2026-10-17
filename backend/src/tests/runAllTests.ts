import app from '../app.js';
import { pool, query } from '../config/db.js';
import { Server } from 'http';

let server: Server;
const PORT = 5555;
const BASE_URL = `http://localhost:${PORT}/api`;

let adminToken = '';
let leaderToken = '';

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const contentType = res.headers.get('content-type') || '';
  let body: any = null;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else if (contentType.includes('text/') || contentType.includes('application/')) {
    body = await res.text();
  }
  return { status: res.status, headers: res.headers, body };
}

async function runTests() {
  console.log('======================================================================');
  console.log('STARTING BACKEND API INTEGRATION TEST SUITE');
  console.log('======================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`, detail || '');
      failed++;
    }
  }

  try {
    // Start temporary test server
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`Test server running on ${BASE_URL}`);
        resolve();
      });
    });

    // TEST 1: Health check
    const health = await request('/health');
    assert(health.status === 200 && health.body.status === 'ok', 'API Health Check');

    // TEST 2: Invalid Login
    const badLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin_samuel', password: 'WrongPassword!' }),
    });
    assert(badLogin.status === 401, 'Invalid password rejected with 401');

    // TEST 3: Admin Login
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin_samuel', password: 'Admin@123' }),
    });
    assert(
      adminLogin.status === 200 && adminLogin.body.token && adminLogin.body.user.role === 'ADMIN',
      'Admin login succeeds with JWT and ADMIN role'
    );
    adminToken = adminLogin.body.token;

    // TEST 4: Leader Login
    const leaderLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'leader_ruth', password: 'Leader@123' }),
    });
    assert(
      leaderLogin.status === 200 && leaderLogin.body.token && leaderLogin.body.user.role === 'FELLOWSHIP_LEADER',
      'Leader login succeeds with FELLOWSHIP_LEADER role'
    );
    leaderToken = leaderLogin.body.token;

    // TEST 5: Verify Auth Me Endpoint
    const meRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(meRes.status === 200 && meRes.body.user.username === 'admin_samuel', 'GET /auth/me returns authenticated user');

    // TEST 6: Dashboard Statistics
    const dashRes = await request('/dashboard/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      dashRes.status === 200 &&
      dashRes.body.totalStudents >= 10 &&
      dashRes.body.remedialStudents >= 1 &&
      dashRes.body.gcStudents >= 1,
      'Dashboard stats reflect live PostgreSQL data (Remedial and GC included)'
    );

    // TEST 7: Dashboard Academic Stages Chart
    const chartRes = await request('/dashboard/academic-stages', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const remedialStage = chartRes.body.stages.find((s: any) => s.yearNumber === 0);
    assert(
      chartRes.status === 200 && remedialStage !== undefined,
      'Academic stage chart data includes Remedial as Year 0'
    );

    // TEST 8: Students List with Filtering
    const studentsRes = await request('/students?status=ACTIVE&limit=5', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      studentsRes.status === 200 &&
      Array.isArray(studentsRes.body.students) &&
      studentsRes.body.pagination.total > 0,
      'GET /students returns filtered paginated results'
    );

    // TEST 9: Student Detail with Multi-Role and History
    const studentDetail = await request('/students/1', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      studentDetail.status === 200 &&
      studentDetail.body.student &&
      Array.isArray(studentDetail.body.activeAssignments),
      'GET /students/:id returns student profile and active family assignments'
    );

    // TEST 10: Manual Participation Status Update
    const partUpdate = await request('/students/1/participation', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    assert(partUpdate.status === 200 && partUpdate.body.participationStatus === 'ACTIVE', 'PATCH /students/:id/participation updates status');

    // TEST 11: Families List and Capacity Indicators
    const familiesRes = await request('/families', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      familiesRes.status === 200 &&
      familiesRes.body.families.length >= 4 &&
      familiesRes.body.families[0].capacityStatus !== undefined,
      'GET /families returns families with active member counts and capacity status'
    );

    // TEST 12: Family Details with Leaders and Members
    const familyDetail = await request('/families/1', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      familyDetail.status === 200 &&
      Array.isArray(familyDetail.body.leaders) &&
      Array.isArray(familyDetail.body.members),
      'GET /families/:id returns separated leaders (Dad/Mom) and ordinary members'
    );

    // TEST 13: Transfers List
    const transfersRes = await request('/transfers', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      transfersRes.status === 200 &&
      transfersRes.body.tabCounts.total >= 1 &&
      Array.isArray(transfersRes.body.transfers),
      'GET /transfers returns requests with tab counts'
    );

    // TEST 14: Unauthorized Non-Admin Transfer Approval Rejection
    // Fellowship Leader attempts to approve transfer #3
    const unauthorizedApprove = await request('/transfers/3/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${leaderToken}` },
      body: JSON.stringify({ decisionNote: 'Leader attempting approval' }),
    });
    assert(
      unauthorizedApprove.status === 403,
      'Non-admin (FELLOWSHIP_LEADER) transfer approval is blocked (403 Forbidden)'
    );

    // TEST 15: Reports Catalog
    const reportCat = await request('/reports/catalog', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(reportCat.status === 200 && reportCat.body.reports.length >= 8, 'GET /reports/catalog returns report list');

    // TEST 16: Family Summary Report Data
    const famSummary = await request('/reports/family-summary', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(famSummary.status === 200 && famSummary.body.data.length >= 4, 'GET /reports/family-summary returns real data');

    // TEST 17: CSV Export
    const csvExport = await request('/reports/family-summary/export?format=csv', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(csvExport.status === 200 && typeof csvExport.body === 'string' && csvExport.body.includes('Family Code'), 'CSV report export generates valid CSV content');

    // TEST 18: Settings Metadata
    const metadata = await request('/settings/metadata', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      metadata.status === 200 &&
      metadata.body.departments.length > 0 &&
      metadata.body.academicStages.length > 0 &&
      metadata.body.gcClassifications.length > 0,
      'GET /settings/metadata returns departments, stages (with 0 Year), and GC options'
    );

  } catch (err) {
    console.error('Fatal test execution error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await pool.end();
  }

  console.log('======================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
