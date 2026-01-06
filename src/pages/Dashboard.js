// src/pages/Dashboard.js - Premium Dashboard med stats och aktivitets-feed
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import ProgressTracker from '../components/ProgressTracker';
import ActivityFeed from '../components/ActivityFeed';
import StatsCard, { StatsIcons } from '../components/ui/StatsCard';
import EmptyState from '../components/ui/EmptyState';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser, userProfile } = useAuth();
  const { currentTeam, hasTeam } = useTeam();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    customers: 0,
    activeControls: 0,
    completedControls: 0,
    teamMembers: 0
  });
  const [recentControls, setRecentControls] = useState([]);
  const [hasCustomers, setHasCustomers] = useState(false);
  const [hasControls, setHasControls] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    if (!hasTeam || !currentTeam?.id) {
      setHasCustomers(false);
      setHasControls(false);
      setRecentControls([]);
      setLoading(false);
      return;
    }

    // Realtidslyssnare för customers
    const customersQuery = query(collection(db, 'customers'), where('teamId', '==', currentTeam.id));
    const unsubscribeCustomers = onSnapshot(customersQuery, (snapshot) => {
      const customerCount = snapshot.docs.length;
      setHasCustomers(customerCount > 0);
      setStats(prev => ({ ...prev, customers: customerCount }));
    }, (error) => {
      console.error('Error listening to customers:', error);
    });

    // Realtidslyssnare för controls
    const controlsQuery = query(collection(db, 'inspections'), where('teamId', '==', currentTeam.id));
    const unsubscribeControls = onSnapshot(controlsQuery, (snapshot) => {
      const controls = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      const activeControls = controls.filter(c => c.status === 'active').length;
      const completedControls = controls.filter(c => c.status === 'completed').length;

      setHasControls(controls.length > 0);

      // Set stats
      setStats(prev => ({
        ...prev,
        activeControls,
        completedControls,
        teamMembers: currentTeam.members?.length || 1
      }));

      // Get recent controls
      const sortedControls = controls
        .sort((a, b) => {
          const aDate = a.createdAt?.seconds || 0;
          const bDate = b.createdAt?.seconds || 0;
          return bDate - aDate;
        })
        .slice(0, 5);

      setRecentControls(sortedControls);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to controls:', error);
      setLoading(false);
    });

    // Cleanup - avsluta lyssnare när komponenten unmountas
    return () => {
      unsubscribeCustomers();
      unsubscribeControls();
    };
  }, [currentUser, currentTeam, hasTeam]);

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return 'Okänt datum';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="dashboard">
        <DashboardSkeleton />
      </div>
    );
  }

  // No team state
  if (!hasTeam) {
    return (
      <div className="dashboard">
        <div className="dashboard-no-team">
          <EmptyState
            type="noTeam"
            title="Valj eller skapa ett team"
            description="For att anvanda SkarpKontroll behover du vara med i ett team. Skapa ett nytt team eller ga med i ett befintligt med en inbjudningskod."
            actionLabel="Ga till Team-sidan"
            actionLink="/team"
          />
        </div>
      </div>
    );
  }

  const userName = userProfile?.companyName || currentTeam?.name || currentUser?.email?.split('@')[0] || 'Anvandare';

  return (
    <div className="dashboard">
      {/* Progress Tracker */}
      <ProgressTracker
        hasTeam={hasTeam}
        hasCustomers={hasCustomers}
        hasControls={hasControls}
      />

      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="dashboard-title">
            Valkommen, {userName}
          </h1>
          <p className="dashboard-subtitle">
            Har ar en oversikt av ditt kontrollsystem
          </p>
        </div>
        <div className="dashboard-header-actions">
          <Link to="/customers/new" className="dashboard-btn dashboard-btn--primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ny kund
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="dashboard-stats">
        <StatsCard
          title="Kunder"
          value={stats.customers}
          icon={StatsIcons.customers}
          color="blue"
          onClick={() => navigate('/customers')}
        />
        <StatsCard
          title="Aktiva kontroller"
          value={stats.activeControls}
          icon={StatsIcons.controls}
          color="orange"
          subtitle="Pagaende"
        />
        <StatsCard
          title="Slutforda"
          value={stats.completedControls}
          icon={StatsIcons.completed}
          color="green"
          subtitle="Klara kontroller"
        />
        <StatsCard
          title="Teammedlemmar"
          value={stats.teamMembers}
          icon={StatsIcons.team}
          color="purple"
          subtitle={currentTeam?.name}
        />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Recent Controls Section */}
        <div className="dashboard-main">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <h2 className="dashboard-card-title">Senaste kontroller</h2>
                <p className="dashboard-card-subtitle">De senaste kontrollerna i teamet</p>
              </div>
              <Link to="/customers" className="dashboard-card-action">
                Visa alla
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            </div>

            <div className="dashboard-card-body">
              {recentControls.length === 0 ? (
                <EmptyState
                  type="noControls"
                  title="Inga kontroller ännu"
                  description={hasCustomers
                    ? "Skapa din första kontroll för en befintlig kund"
                    : "Börja genom att lägga till en kund och skapa din första kontroll"
                  }
                  actionLabel={hasCustomers ? "Välj kund" : "Lägg till kund"}
                  actionLink={hasCustomers ? "/customers" : "/customers/new"}
                />
              ) : (
                <div className="control-list">
                  {recentControls.map((control, index) => (
                    <Link
                      key={control.id}
                      to={`/controls/${control.id}`}
                      className="control-item"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="control-item-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                      </div>
                      <div className="control-item-content">
                        <h4 className="control-item-name">
                          {control.name || control.customerName || 'Kontroll'}
                        </h4>
                        <div className="control-item-meta">
                          <span className="control-item-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            {formatDate(control.createdAt)}
                          </span>
                          {control.customerName && (
                            <span className="control-item-customer">
                              {control.customerName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="control-item-status-wrapper">
                        <span className={`control-item-status control-item-status--${control.status || 'active'}`}>
                          {control.status === 'completed' ? 'Slutford' : 'Pagaende'}
                        </span>
                        <svg className="control-item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Feed Sidebar */}
        <div className="dashboard-sidebar">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
