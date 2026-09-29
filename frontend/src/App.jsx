import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RootLayout from './layouts/RootLayout';
import CitizenLayout from './layouts/CitizenLayout';
import AdminLayout from './layouts/AdminLayout';

// Architecture / System Pages
import HomePage from './pages/HomePage';
import ArchitecturePage from './pages/ArchitecturePage';
import NotFoundPage from './pages/NotFoundPage';

// Citizen Portal Screens
import LoginPage from './pages/portal/LoginPage';
import CitizenHomePage from './pages/portal/CitizenHomePage';
import CitizenApplicationsPage from './pages/portal/CitizenApplicationsPage';
import ScholarshipApplyPage from './pages/portal/ScholarshipApplyPage';
import CitizenNotificationsPage from './pages/portal/CitizenNotificationsPage';
import ConsentScreenPage from './pages/portal/ConsentScreenPage';
import ApplicationDetailPage from './pages/portal/ApplicationDetailPage';

// Admin Control Center Dedicated Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminWorkflowsPage from './pages/admin/AdminWorkflowsPage';
import AdminSlaPage from './pages/admin/AdminSlaPage';
import AdminExceptionsPage from './pages/admin/AdminExceptionsPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage';
import WorkflowBuilderPage from './pages/admin/WorkflowBuilderPage';
import ServiceRegistryPage from './pages/admin/ServiceRegistryPage';
import DataMappingsPage from './pages/admin/DataMappingsPage';
import DemoControlsPage from './pages/admin/DemoControlsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Citizen Portal Authentication */}
          <Route path="/login" element={<CitizenLayout />}>
            <Route index element={<LoginPage />} />
          </Route>

          {/* Citizen Portal Layout & Dedicated Screens */}
          <Route path="/portal" element={<CitizenLayout />}>
            <Route index element={<CitizenHomePage />} />
            <Route path="applications" element={<CitizenApplicationsPage />} />
            <Route path="apply" element={<ScholarshipApplyPage />} />
            <Route path="notifications" element={<CitizenNotificationsPage />} />
            <Route path="applications/:id" element={<ApplicationDetailPage />} />
            <Route path="applications/:id/consent" element={<ConsentScreenPage />} />
          </Route>

          {/* Direct Aliases for Application & Consent Deep Links */}
          <Route path="/applications" element={<Navigate to="/portal/applications" replace />} />
          <Route path="/applications/:id" element={<Navigate to="/portal/applications/:id" replace />} />
          <Route path="/applications/:id/consent" element={<Navigate to="/portal/applications/:id/consent" replace />} />

          {/* Admin Control Center & Specialized Dedicated Sub-Pages */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="workflows" element={<AdminWorkflowsPage />} />
            <Route path="sla" element={<AdminSlaPage />} />
            <Route path="exceptions" element={<AdminExceptionsPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="workflows/builder" element={<WorkflowBuilderPage />} />
            <Route path="builder" element={<Navigate to="/admin/workflows/builder" replace />} />
            <Route path="services" element={<ServiceRegistryPage />} />
            <Route path="registry" element={<Navigate to="/admin/services" replace />} />
            <Route path="mappings" element={<DataMappingsPage />} />
            <Route path="demo" element={<DemoControlsPage />} />
            <Route path="controls" element={<Navigate to="/admin/demo" replace />} />
          </Route>

          {/* System Architecture & Overview Layout */}
          <Route path="/" element={<RootLayout />}>
            <Route index element={<HomePage />} />
            <Route path="architecture" element={<ArchitecturePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
