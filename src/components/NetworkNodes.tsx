import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Shield, Users, User, Building2, MapPin } from 'lucide-react';
import styles from './NetworkNodes.module.css';

export const ChurchNode = ({ data }: any) => (
  <div className={styles.churchNode}>
    <Handle type="target" position={Position.Top} className={styles.handle} />
    <div className={styles.nodeHeader}>
      <Building2 size={20} />
      <span>Church</span>
    </div>
    <div className={styles.nodeContent}>
      <strong>{data.label}</strong>
    </div>
    {data.hasChildren && (
      <div className={styles.expandHint}>
        {data.isCollapsed ? '+' : '−'}
      </div>
    )}
    <Handle type="source" position={Position.Bottom} className={styles.handle} />
  </div>
);

export const DeptNode = ({ data }: any) => (
  <div className={styles.deptNode}>
    <Handle type="target" position={Position.Top} className={styles.handle} />
    <div className={styles.nodeHeader}>
      <Shield size={16} />
      <span>Department</span>
    </div>
    <div className={styles.nodeContent}>
      <strong>{data.label}</strong>
    </div>
    {data.hasChildren && (
      <div className={styles.expandHint}>
        {data.isCollapsed ? '+' : '−'}
      </div>
    )}
    <Handle type="source" position={Position.Bottom} className={styles.handle} />
  </div>
);

export const SubunitNode = ({ data }: any) => (
  <div className={styles.subunitNode}>
    <Handle type="target" position={Position.Top} className={styles.handle} />
    <div className={styles.nodeHeader}>
      <div className={styles.headerTitle}>
        <MapPin size={16} />
        <span>Subunit</span>
      </div>
      {data.readiness && (
        <div className={`${styles.pulse} ${styles[data.readiness]}`} />
      )}
    </div>
    <div className={styles.nodeContent}>
      <strong>{data.label}</strong>
      <div className={styles.memberCount}>
        <Users size={12} />
        <span>{data.memberCount || 0} Members</span>
      </div>
    </div>
    {data.hasChildren && (
      <div className={styles.expandHint}>
        {data.isCollapsed ? '+' : '−'}
      </div>
    )}
    <Handle type="source" position={Position.Bottom} className={styles.handle} />
  </div>
);

export const VolunteerNode = ({ data }: any) => (
  <div className={styles.volunteerNode}>
    <Handle type="target" position={Position.Top} className={styles.handle} />
    <div className={styles.volunteerContent}>
      <div className={styles.avatar}>{data.label[0]}</div>
      <span>{data.label}</span>
    </div>
  </div>
);
