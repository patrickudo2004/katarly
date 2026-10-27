import React from 'react';
import { Crown, ShieldCheck, User, Clock, AlertTriangle, Shield, ArrowRightLeft, Cross } from 'lucide-react';
import styles from './RoleBadge.module.css';

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
  const icons: Record<string, React.ReactNode> = {
    Volunteer: <User size={12} />,
    SubunitLead: <Shield size={12} />,
    SubunitAssistant: <Shield size={12} strokeWidth={1} />,
    DepartmentHead: <ShieldCheck size={12} />,
    DepartmentAssistant: <ShieldCheck size={12} strokeWidth={1} />,
    DepartmentSecretary: <Shield size={12} />,
    PastoralOversight: <Cross size={12} />,
    DeaconHead: <ShieldCheck size={12} />,
    Probation: <Clock size={12} />,
    OnNotice: <AlertTriangle size={12} />,
    SuperAdmin: <Crown size={12} />,
  };

  const icon = icons[role] || icons.Volunteer;

  // Determine CSS class based on role/modifier
  let roleClass = styles[`role_${role}`] || styles.role_Volunteer;
  if (role === 'Probation' && isExtendedProbation) {
    roleClass = styles.role_ExtendedProbation;
  }
  if (isBorrowed) {
    roleClass = `${roleClass} ${styles.role_Borrowed}`;
  }

  const label = isBorrowed 
    ? 'Borrowed' 
    : (isExtendedProbation && role === 'Probation' ? 'Extended Probation' : role);

  return (
    <div className="flex items-center gap-1">
      <span
        className={`${styles.badge} ${roleClass} ${className}`}
      >
        <span className={styles.icon}>
          {isBorrowed ? <ArrowRightLeft size={12} /> : icon}
        </span>
        <span className={styles.label}>{label}</span>
      </span>
    </div>
  );
};
