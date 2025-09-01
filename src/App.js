// src/App.js - Minimal version med endast befintliga filer
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfirmationProvider } from './components/ConfirmationProvider';
import MainLayout from './components/layout/MainLayout';
import AuthForm from './components/auth/AuthForm';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import CustomerForm from './pages/CustomerForm';

// NYA KONTROLL-KOMPONENTER
import ControlForm from './pages/ControlForm';
import ControlView from './pages/ControlView';
import Kontrollpunkter from './pages/Kontrollpunkter';

// GAMLA KOMPONENTER (endast de som finns)
// import InspectionForm from './pages/InspectionForm';
// import InspectionDetail from './pages/InspectionDetail';

// ANDRA SIDOR (kommenterade tills de behövs)
// import TemplateList from './pages/TemplateList';
// import TemplateBuilder from './pages/TemplateBuilder';
// import TemplateDetail from './pages/TemplateDetail';
// import ImageUploadTest from './pages/ImageUploadTest';
// import SupabaseTest from './pages/SupabaseTest';
import ProfilePage from './pages/ProfilePage';
import './App.css';

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
  const { currentUser, loading } = useAuth();
  
  console.log('🏠 App state:', { 
    currentUser: !!currentUser, 
    loading,
    userEmail: currentUser?.email 
  });

  // Om vi laddar, visa loading
  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Laddar applikation...</p>
      </div>
    );
  }

  // Om ingen användare, visa login
  if (!currentUser) {
    return <LoginWrapper />;
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
          
          {/* Kunder - ENDAST DE SOM FINNS */}
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/new" element={<CustomerForm />} />
          <Route path="customers/:customerId" element={<CustomerDetail />} />
          <Route path="customers/:customerId/edit" element={<CustomerForm />} />
          
          {/* Kontrollpunkter */}
          <Route path="kontrollpunkter" element={<Kontrollpunkter />} />
          
          {/* 🆕 NYA KONTROLLER - FÖRENKLAD STRUKTUR */}
          <Route path="customers/:customerId/controls/new" element={<ControlForm />} />
          <Route path="controls/:controlId" element={<ControlView />} />
          
          {/* 🗑️ GAMLA KONTROLLER - Kommenterade tills vi har filerna
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
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;