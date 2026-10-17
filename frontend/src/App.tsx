import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';

// Auth
import { LoginPage } from './features/auth/LoginPage';

// Dashboard
import { DashboardPage } from './features/dashboard/DashboardPage';

// Students
import { StudentListPage } from './features/students/StudentListPage';
import { StudentDetailPage } from './features/students/StudentDetailPage';
import { StudentFormPage } from './features/students/StudentFormPage';

// Families
import { FamilyListPage } from './features/families/FamilyListPage';
import { FamilyDetailPage } from './features/families/FamilyDetailPage';
import { FamilyFormPage } from './features/families/FamilyFormPage';

// Transfers
import { TransferListPage } from './features/transfers/TransferListPage';
import { TransferDetailPage } from './features/transfers/TransferDetailPage';

// People
import { PeopleListPage } from './features/people/PeopleListPage';
import { PersonDetailPage } from './features/people/PersonDetailPage';

// Reports
import { ReportCatalogPage } from './features/reports/ReportCatalogPage';
import { ReportPreviewPage } from './features/reports/ReportPreviewPage';

// Admin Only
import { AccountsPage } from './features/accounts/AccountsPage';
import { SettingsPage } from './features/settings/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
          <span className="text-xs text-slate-400">Loading FTVTI ECSF Fellowship...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Application Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  {/* Dashboard */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />

                  {/* Students */}
                  <Route path="/students" element={<StudentListPage />} />
                  <Route path="/students/new" element={<StudentFormPage />} />
                  <Route path="/students/:id" element={<StudentDetailPage />} />
                  <Route path="/students/:id/edit" element={<StudentFormPage />} />

                  {/* People */}
                  <Route path="/people" element={<PeopleListPage />} />
                  <Route path="/people/:id" element={<PersonDetailPage />} />

                  {/* Families */}
                  <Route path="/families" element={<FamilyListPage />} />
                  <Route path="/families/new" element={<FamilyFormPage />} />
                  <Route path="/families/:id" element={<FamilyDetailPage />} />
                  <Route path="/families/:id/edit" element={<FamilyFormPage />} />

                  {/* Transfers */}
                  <Route path="/transfers" element={<TransferListPage />} />
                  <Route path="/transfers/:id" element={<TransferDetailPage />} />

                  {/* Reports */}
                  <Route path="/reports" element={<ReportCatalogPage />} />
                  <Route path="/reports/family-summary" element={<ReportPreviewPage forcedType="family-summary" />} />
                  <Route path="/reports/students" element={<ReportPreviewPage forcedType="students" />} />
                  <Route path="/reports/academic-stages" element={<ReportPreviewPage forcedType="academic-stages" />} />
                  <Route path="/reports/departments" element={<ReportPreviewPage forcedType="departments" />} />
                  <Route path="/reports/participation" element={<ReportPreviewPage forcedType="participation" />} />
                  <Route path="/reports/family-capacity" element={<ReportPreviewPage forcedType="family-capacity" />} />
                  <Route path="/reports/unassigned-students" element={<ReportPreviewPage forcedType="unassigned-students" />} />
                  <Route path="/reports/:type" element={<ReportPreviewPage />} />

                  {/* Admin Routes */}
                  <Route path="/accounts" element={<AccountsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
