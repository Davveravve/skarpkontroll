// src/components/ui/SkeletonLoader.js - Premium skeleton loading states
import React from 'react';
import './SkeletonLoader.css';

// Base skeleton pulse component
export const Skeleton = ({ width, height, borderRadius = '8px', className = '' }) => (
  <div
    className={`skeleton ${className}`}
    style={{
      width: width || '100%',
      height: height || '20px',
      borderRadius
    }}
  />
);

// Skeleton for stats card
export const StatsCardSkeleton = () => (
  <div className="skeleton-stats-card">
    <div className="skeleton-stats-header">
      <Skeleton width="48px" height="48px" borderRadius="12px" />
      <div className="skeleton-stats-trend">
        <Skeleton width="60px" height="24px" borderRadius="12px" />
      </div>
    </div>
    <div className="skeleton-stats-body">
      <Skeleton width="80px" height="36px" borderRadius="8px" />
      <Skeleton width="120px" height="16px" borderRadius="4px" />
    </div>
  </div>
);

// Skeleton for activity feed item
export const ActivityItemSkeleton = () => (
  <div className="skeleton-activity-item">
    <Skeleton width="32px" height="32px" borderRadius="8px" />
    <div className="skeleton-activity-content">
      <Skeleton width="200px" height="16px" borderRadius="4px" />
      <Skeleton width="140px" height="12px" borderRadius="4px" />
    </div>
    <Skeleton width="50px" height="12px" borderRadius="4px" />
  </div>
);

// Skeleton for progress tracker step
export const ProgressStepSkeleton = () => (
  <div className="skeleton-progress-step">
    <Skeleton width="28px" height="28px" borderRadius="50%" />
    <div className="skeleton-progress-content">
      <Skeleton width="100px" height="16px" borderRadius="4px" />
      <Skeleton width="160px" height="12px" borderRadius="4px" />
    </div>
    <Skeleton width="80px" height="32px" borderRadius="8px" />
  </div>
);

// Skeleton for control/inspection card
export const ControlCardSkeleton = () => (
  <div className="skeleton-control-card">
    <div className="skeleton-control-header">
      <Skeleton width="60%" height="20px" borderRadius="4px" />
      <Skeleton width="70px" height="24px" borderRadius="12px" />
    </div>
    <div className="skeleton-control-body">
      <Skeleton width="150px" height="14px" borderRadius="4px" />
      <Skeleton width="120px" height="14px" borderRadius="4px" />
    </div>
  </div>
);

// Full dashboard skeleton
export const DashboardSkeleton = () => (
  <div className="skeleton-dashboard">
    {/* Header skeleton */}
    <div className="skeleton-dashboard-header">
      <Skeleton width="300px" height="36px" borderRadius="8px" />
      <Skeleton width="200px" height="20px" borderRadius="4px" />
    </div>

    {/* Stats grid skeleton */}
    <div className="skeleton-stats-grid">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>

    {/* Two column layout skeleton */}
    <div className="skeleton-two-column">
      <div className="skeleton-main-column">
        <div className="skeleton-section-header">
          <Skeleton width="180px" height="24px" borderRadius="6px" />
          <Skeleton width="100px" height="36px" borderRadius="8px" />
        </div>
        <ControlCardSkeleton />
        <ControlCardSkeleton />
        <ControlCardSkeleton />
      </div>
      <div className="skeleton-sidebar-column">
        <div className="skeleton-section-header">
          <Skeleton width="140px" height="20px" borderRadius="6px" />
        </div>
        <ActivityItemSkeleton />
        <ActivityItemSkeleton />
        <ActivityItemSkeleton />
        <ActivityItemSkeleton />
        <ActivityItemSkeleton />
      </div>
    </div>
  </div>
);

export default DashboardSkeleton;
