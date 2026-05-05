import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

import { Dashboard } from './pages/Dashboard';
import { Rota } from './pages/Rota';
import { TimeOff } from './pages/TimeOff';
import { Login } from './pages/Login';
import { CreateChurch } from './pages/CreateChurch';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { InviteManagement } from './pages/InviteManagement';
import { AttendancePage } from './pages/AttendancePage';
import { ChatPage } from './pages/ChatPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { HallOfFamePage } from './pages/HallOfFamePage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { AdminSettings } from './pages/AdminSettings';
import { ServiceManagement } from './pages/ServiceManagement';
import { PrintAttendance } from './pages/PrintAttendance';
import { PeoplePage } from './pages/PeoplePage';
import { ReportsPage } from './pages/ReportsPage';
import { DebugAuth } from './pages/DebugAuth';
import { NetworkPage } from './pages/NetworkPage';
import { AcceptInvite } from './pages/AcceptInvite';
import { Layout } from './components/Layout';
import { MobileLayout } from './layouts/MobileLayout';
import { useMediaQuery } from './hooks/useMediaQuery';

// Mobile Pages
import { VolunteerHome } from './pages/mobile/VolunteerHome';
import { SubunitLeadHome } from './pages/mobile/SubunitLeadHome';
import { DeptHeadHome } from './pages/mobile/DeptHeadHome';
import { SuperAdminHome } from './pages/mobile/SuperAdminHome';
import { DeaconHeadHome } from './pages/mobile/DeaconHeadHome';
import { TimeOffPage as MobileTimeOff } from './pages/mobile/TimeOffPage';
import { SubunitDetail } from './pages/mobile/SubunitDetail';

import { ThemeProvider } from './contexts/ThemeContext';

// Convex Client
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const convex = new ConvexReactClient(CONVEX_URL);
const queryClient = new QueryClient();

function AppContent() {
  const me = useQuery(api.users.me);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  if (me === undefined) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Phase 1: If user has no church, they must create or join one
  if (!me || !me.churchId) {
    return <CreateChurch />;
  }

  if (!me.onboardingCompleted) {
    return <OnboardingWizard />;
  }

  const PageLayout = isMobile ? MobileLayout : Layout;

  const getMobileHome = () => {
    switch (me?.role) {
      case 'SuperAdmin': return <SuperAdminHome />;
      case 'DeaconHead': return <DeaconHeadHome />;
      case 'DepartmentHead': return <DeptHeadHome />;
      case 'SubunitLead': return <SubunitLeadHome />;
      default: return <VolunteerHome />;
    }
  };

  return (
    <Routes>
      <Route path="/" element={
        <PageLayout user={me}>
          {isMobile ? getMobileHome() : <Dashboard userRole={me.role as any} />}
        </PageLayout>
      } />
      <Route path="/attendance" element={
        <PageLayout user={me as any}>
          <AttendancePage />
        </PageLayout>
      } />
      <Route path="/rota" element={
        <PageLayout user={me as any}>
          <Rota />
        </PageLayout>
      } />
      <Route path="/time-off" element={
        <PageLayout user={me as any}>
          <TimeOff />
        </PageLayout>
      } />
      <Route path="/invites" element={
        <PageLayout user={me as any}>
          <InviteManagement />
        </PageLayout>
      } />
      <Route path="/chat" element={
        <PageLayout user={me as any}>
          <ChatPage />
        </PageLayout>
      } />
      <Route path="/admin" element={
        <PageLayout user={me as any}>
          <AdminPage />
        </PageLayout>
      } />
      <Route path="/admin/settings" element={
        <PageLayout user={me as any}>
          <AdminSettings />
        </PageLayout>
      } />
      <Route path="/services" element={
        <PageLayout user={me as any}>
          <ServiceManagement />
        </PageLayout>
      } />
      <Route path="/marketplace" element={
        <PageLayout user={me as any}>
          <MarketplacePage />
        </PageLayout>
      } />
      <Route path="/hall-of-fame" element={
        <PageLayout user={me as any}>
          <HallOfFamePage />
        </PageLayout>
      } />
      <Route path="/reports" element={
        <PageLayout user={me as any}>
          <ReportsPage />
        </PageLayout>
      } />
      <Route path="/profile" element={
        <PageLayout user={me as any}>
          <ProfilePage />
        </PageLayout>
      } />
      <Route path="/time-off" element={
        <PageLayout user={me as any}>
          {isMobile ? <MobileTimeOff /> : <TimeOff />}
        </PageLayout>
      } />
      <Route path="/subunit/:subunitId" element={
        <PageLayout user={me as any}>
          <SubunitDetail />
        </PageLayout>
      } />
      <Route path="/network" element={
        <PageLayout user={me as any}>
          <NetworkPage />
        </PageLayout>
      } />
      <Route path="/people" element={
        <PageLayout user={me as any}>
          <PeoplePage />
        </PageLayout>
      } />
      <Route path="/print/attendance/:churchId" element={<PrintAttendance />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/debug-auth" element={<DebugAuth />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ConvexAuthProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <AuthLoading>
              <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            </AuthLoading>
            
            <Unauthenticated>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/create-church" element={<CreateChurch />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="/debug-auth" element={<DebugAuth />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Unauthenticated>

            <Authenticated>
              <AppContent />
            </Authenticated>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ConvexAuthProvider>
  );
}
