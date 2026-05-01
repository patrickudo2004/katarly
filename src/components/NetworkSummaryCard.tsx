import React from 'react';
import { Network, ChevronRight, Users, Building2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './NetworkSummaryCard.module.css';

interface NetworkSummaryCardProps {
  stats: {
    departments: number;
    subunits: number;
    volunteers: number;
  };
}

export const NetworkSummaryCard: React.FC<NetworkSummaryCardProps> = ({ stats }) => {
  const navigate = useNavigate();

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <div className={styles.iconBox}>
            <Network size={20} />
          </div>
          <div>
            <h3>The Network</h3>
            <p>Organization Structure</p>
          </div>
        </div>
        <button className={styles.viewBtn} onClick={() => navigate('/network')}>
          <span>View Map</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Building2 size={16} />
          </div>
          <div className={styles.statInfo}>
            <strong>{stats.departments}</strong>
            <span>Departments</span>
          </div>
        </div>

        <div className={styles.statItem}>
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <MapPin size={16} />
          </div>
          <div className={styles.statInfo}>
            <strong>{stats.subunits}</strong>
            <span>Subunits</span>
          </div>
        </div>

        <div className={styles.statItem}>
          <div className={styles.statIcon} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Users size={16} />
          </div>
          <div className={styles.statInfo}>
            <strong>{stats.volunteers}</strong>
            <span>Total Workforce</span>
          </div>
        </div>
      </div>
    </div>
  );
};
