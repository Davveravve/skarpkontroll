// src/App.js - Med team-stöd och onboarding - INGEN loading mellan sidor
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TeamProvider, useTeam } from './contexts/TeamContext';
import { ConfirmationProvider } from './components/ConfirmationProvider';
import MainLayout from './components/layout/MainLayout';
import AuthForm from './components/auth/AuthForm';
import OnboardingWizard from './components/OnboardingWizard';
import { ToastProvider } from './components/ui/Toast';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import CustomerForm from './pages/CustomerForm';

// NYA KONTROLL-KOMPONENTER
import ControlForm from './pages/ControlForm';
import ControlView from './pages/ControlView';
import Kontrollpunkter from './pages/Kontrollpunkter';

// TEAM-HANTERING
import TeamPage from './pages/TeamPage';

import ProfilePage from './pages/ProfilePage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import PublicInspectionView from './pages/PublicInspectionView';
import './App.css';

// Cache key for onboarding
const ONBOARDING_CACHE_KEY = 'skarpkontroll_onboardingDone';

// Login wrapper
const LoginWrapper = () => {
  return (
    <div className="login-page">
      <div className="login-container">
        <AuthForm />
      </div>
    </div>
  );
};

// Huvud-App komponenten
function AppContent() {
  const { currentUser, loading: authLoading } = useAuth();
  const { hasTeam, currentTeam } = useTeam();

  // Kolla om onboarding redan är klar (från cache)
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_CACHE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Spara onboarding status till cache
  const handleOnboardingComplete = () => {
    setOnboardingDismissed(true);
    try {
      localStorage.setItem(ONBOARDING_CACHE_KEY, 'true');
    } catch {}
  };

  // Rensa onboarding cache om användaren loggar ut
  useEffect(() => {
    if (!currentUser && !authLoading) {
      try {
        localStorage.removeItem(ONBOARDING_CACHE_KEY);
      } catch {}
      setOnboardingDismissed(false);
    }
  }, [currentUser, authLoading]);

  // ENDAST visa loading vid första auth-check - ALDRIG annars
  if (authLoading && !currentUser) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
        </div>
      </div>
    );
  }

  // Om ingen anvandare, visa login
  if (!currentUser) {
    return <LoginWrapper />;
  }

  // Visa onboarding ENDAST om:
  // 1. Användaren inte har team (hasTeam false)
  // 2. Inte redan dismissat
  // 3. Det finns inget cachat team (för att undvika blink)
  const cachedTeam = (() => {
    try {
      const data = localStorage.getItem('skarpkontroll_currentTeam');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  const shouldShowOnboarding = !hasTeam && !currentTeam && !cachedTeam && !onboardingDismissed;

  if (shouldShowOnboarding) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingComplete}
        />
      </div>
    );
  }

  // Användare inloggad - visa huvudapplikationen med MainLayout
  return (
    <ConfirmationProvider>
      <Routes>
        {/* Alla rutter är nu skyddade och använder MainLayout */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          
          {/* Profil */}
          <Route path="profile" element={<ProfilePage />} />

          {/* Team */}
          <Route path="team" element={<TeamPage />} />
          
          {/* Kunder - ENDAST DE SOM FINNS */}
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/new" element={<CustomerForm />} />
          <Route path="customers/:customerId" element={<CustomerDetail />} />
          <Route path="customers/:customerId/edit" element={<CustomerForm />} />
          
          {/* Kontrollpunkter */}
          <Route path="kontrollpunkter" element={<Kontrollpunkter />} />
          
          {/* Kontroller */}
          <Route path="customers/:customerId/controls/new" element={<ControlForm />} />
          <Route path="controls/:controlId" element={<ControlView />} />
          
          {/* GAMLA KONTROLLER - Kommenterade tills vi har filerna
          <Route path="customers/:customerId/addresses/new" element={<AddressForm />} />
          <Route path="customers/:customerId/addresses/:addressId" element={<AddressDetail />} />
          <Route path="customers/:customerId/addresses/:addressId/installations/new" element={<InstallationForm />} />
          <Route path="customers/:customerId/addresses/:addressId/installations/:installationId" element={<InstallationDetail />} />
          <Route path="customers/:customerId/addresses/:addressId/installations/:installationId/inspections/new" element={<InspectionForm />} />
          <Route path="customers/:customerId/addresses/:addressId/installations/:installationId/inspections/:inspectionId" element={<InspectionDetail />} />
          */}
          
          {/* ANDRA SIDOR - Kommenterade tills de behövs
          <Route path="templates" element={<TemplateList />} />
          <Route path="templates/new" element={<TemplateBuilder />} />
          <Route path="templates/:templateId" element={<TemplateDetail />} />
          <Route path="test/images" element={<ImageUploadTest />} />
          <Route path="test/supabase" element={<SupabaseTest />} />
          */}
        </Route>
        
        {/* Fallback för okända rutter */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfirmationProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages - accessible to everyone */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/view/:token" element={<PublicInspectionView />} />

        {/* Hemlig registreringssida - endast via direkt URL */}
        <Route path="/register" element={
          <AuthProvider>
            <div className="login-page">
              <div className="login-container">
                <AuthForm defaultMode="register" />
              </div>
            </div>
          </AuthProvider>
        } />

        {/* Protected routes - require auth */}
        <Route path="/*" element={
          <AuthProvider>
            <TeamProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </TeamProvider>
          </AuthProvider>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;