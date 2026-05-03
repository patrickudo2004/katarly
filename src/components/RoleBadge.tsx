import React from 'react';
import { Crown, ShieldCheck, User, Clock, AlertTriangle, Shield, ArrowRightLeft, Cross } from 'lucide-react';

export type UserRole = 
  | 'Volunteer' 
  | 'SubunitLead' 
  | 'SubunitAssistant'
  | 'DepartmentHead' 
  | 'DepartmentAssistant'
  | 'DepartmentSecretary'
  | 'PastoralOversight' 
  | 'DeaconHead'
  | 'Probation' 
  | 'OnNotice' 
  | 'SuperAdmin';

interface RoleBadgeProps {
  role: UserRole;
  isExtendedProbation?: boolean;
  isBorrowed?: boolean;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, isExtendedProbation, isBorrowed, className = "" }) => {
  const config: Record<string, { color: string; bg: string; icon: React.ReactNode; border?: string }> = {
    Volunteer: {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      icon: <User size={12} />,
    },
    SubunitLead: {
      color: '#6b7280',
      bg: 'rgba(107, 114, 128, 0.1)',
      icon: <Shield size={12} />,
    },
    SubunitAssistant: {
      color: '#6b7280',
      bg: 'rgba(107, 114, 128, 0.05)',
      icon: <Shield size={12} strokeWidth={1} />,
    },
    DepartmentHead: {
      color: '#d4af37',
      bg: 'rgba(212, 175, 55, 0.1)',
      icon: <ShieldCheck size={12} />,
      border: '1px solid #d4af37',
    },
    DepartmentAssistant: {
      color: '#d4af37',
      bg: 'rgba(212, 175, 55, 0.05)',
      icon: <ShieldCheck size={12} strokeWidth={1} />,
    },
    DepartmentSecretary: {
      color: '#0891b2',
      bg: 'rgba(8, 145, 178, 0.1)',
      icon: <Shield size={12} />,
    },
    PastoralOversight: {
      color: '#15803d',
      bg: 'rgba(21, 128, 61, 0.1)',
      icon: <Cross size={12} />,
      border: '1px solid #15803d',
    },
    DeaconHead: {
      color: '#1e3a5f',
      bg: 'rgba(30, 58, 95, 0.1)',
      icon: <ShieldCheck size={12} />,
      border: '2px solid #1e3a5f',
    },
    Probation: {
      color: isExtendedProbation ? '#1e40af' : '#3b82f6',
      bg: isExtendedProbation ? 'rgba(30, 64, 175, 0.1)' : 'rgba(59, 130, 246, 0.1)',
      icon: <Clock size={12} />,
      border: isExtendedProbation ? '1px solid #1e40af' : '1px dashed #3b82f6',
    },
    OnNotice: {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
      icon: <AlertTriangle size={12} />,
    },
    SuperAdmin: {
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
      icon: <Crown size={12} />,
    },
  };

  const activeConfig = config[role] || config.Volunteer;
  const { color, bg, icon, border } = activeConfig;

  return (
    <div className="flex items-center gap-1">
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 700,
          color,
          backgroundColor: bg,
          border: isBorrowed ? '2px solid #a855f7' : (border || 'none'),
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          boxShadow: isBorrowed ? '0 0 0 2px rgba(168, 85, 247, 0.2)' : 'none',
        }}
        className={className}
      >
        {isBorrowed ? <ArrowRightLeft size={12} /> : icon}
        {isExtendedProbation && role === 'Probation' ? 'Extended Probation' : (isBorrowed ? 'Borrowed' : role)}
      </span>
    </div>
  );
};
