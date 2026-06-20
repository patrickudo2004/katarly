import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuery, useMutation } from "convex/react";
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
import { ProbationPage } from './pages/ProbationPage';
import { DebugAuth } from './pages/DebugAuth';
import { NetworkPage } from './pages/NetworkPage';
import { AcceptInvite } from './pages/AcceptInvite';
import { NfcGateway } from './pages/NfcGateway';
import { Layout } from './components/Layout';
import { MobileLayout } from './layouts/MobileLayout';
import { useMediaQuery } from './hooks/useMediaQuery';

// Mobile Pages
import { VolunteerHome } from './pages/mobile/VolunteerHome';
import { SubunitLeadHome } from './pages/mobile/SubunitLeadHome';
import { DeptHeadHome } from './pages/mobile/DeptHeadHome';
import { SuperAdminHome } from './pages/mobile/SuperAdminHome';
import { DeaconHeadHome } from './pages/mobile/DeaconHeadHome';
import { PastoralHome } from './pages/mobile/PastoralHome';
import { TimeOffPage as MobileTimeOff } from './pages/mobile/TimeOffPage';
import { SubunitDetail } from './pages/mobile/SubunitDetail';
import { ChurchSelector } from './pages/ChurchSelector';
import { LandingPage } from './pages/LandingPage';
import { MeetingsPage } from './pages/MeetingsPage';

import { ThemeProvider } from './contexts/ThemeContext';

// Convex Client
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const convex = new ConvexReactClient(CONVEX_URL);
const queryClient = new QueryClient();

function AppContent() {
  const me = useQuery(api.users.me);
  const memberships = useQuery(api.users.getMyMemberships);
  const switchChurch = useMutation(api.users.switchActiveChurch);
  const syncLegacy = useMutation(api.users.syncLegacyMembership);
  const [isSwitching, setIsSwitching] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  React.useEffect(() => {
    if (me && me.churchId && memberships && memberships.length === 0 && !isSyncing) {
      const runSync = async () => {
        setIsSyncing(true);
        try {
          await syncLegacy();
        } catch (e) {
          console.error("Legacy sync failed:", e);
        } finally {
          setIsSyncing(false);
        }
      };
      runSync();
    }
  }, [me, memberships, syncLegacy, isSyncing]);

  React.useEffect(() => {
    if (me && !me.churchId && memberships && memberships.length === 1) {
      const autoSelect = async () => {
        setIsSwitching(true);
        try {
          await switchChurch({ churchId: memberships[0].churchId });
          sessionStorage.setItem('sessionChurchId', memberships[0].churchId);
        } catch (e) {
          console.error("Auto switch failed:", e);
        } finally {
          setIsSwitching(false);
        }
      };
      autoSelect();
    }
  }, [me, memberships, switchChurch]);

  React.useEffect(() => {
    if (me?.churchId && memberships && memberships.length === 1) {
      sessionStorage.setItem('sessionChurchId', me.churchId);
    }
  }, [me?.churchId, memberships]);

  if (me === undefined || memberships === undefined || isSwitching || isSyncing) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // If user has no memberships, they must create/join one
  if (memberships.length === 0) {
    return <CreateChurch />;
  }

  const sessionChurchId = sessionStorage.getItem('sessionChurchId');
  const hasMultipleChurches = memberships.length > 1;

  // If user has multiple memberships but has not selected one in this browser session, show selector
  if (hasMultipleChurches && (!sessionChurchId || sessionChurchId !== me.churchId)) {
    return <ChurchSelector />;
  }

  // Fallback safety check
  if (!me.churchId) {
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
      case 'PastoralOversight': return <PastoralHome />;
      case 'DepartmentHead':
      case 'DepartmentAssistant':
      case 'DepartmentSecretary':
        return <DeptHeadHome />;
      case 'SubunitLead':
      case 'SubunitAssistant':
        return <SubunitLeadHome />;
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
      <Route path="/meetings" element={
        <PageLayout user={me as any}>
          <MeetingsPage />
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
      <Route path="/probation" element={
        <PageLayout user={me as any}>
          <ProbationPage />
        </PageLayout>
      } />
      <Route path="/select-church" element={<ChurchSelector />} />
      <Route path="/print/attendance/:churchId" element={<PrintAttendance />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/tap" element={<NfcGateway />} />
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
                <Route path="/" element={<LandingPage />} />
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
