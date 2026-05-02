import React, { useState } from 'react';
import { BarChart3, Users, AlertCircle, ArrowRightLeft, ChevronRight, Loader2, ShieldAlert } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useNavigate } from 'react-router-dom';
import styles from './mobile.module.css';

export const DeptHeadHome: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Subunits');
  const me = useQuery(api.users.me);
  const health = useQuery(api.oversight.getDepartmentHealth, 
    me?.departmentId ? { departmentId: me.departmentId } : "skip"
  );
  const subunits = useQuery(api.subunits.getSubunits);
  const church = useQuery(api.churches.getMyChurch);
  const pendingVerifications = useQuery(api.attendance.getPendingVerifications, 
    church ? { churchId: church._id } : "skip"
  );

  // Loading state
  if (!me || subunits === undefined || pendingVerifications === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  // Filter subunits for this department
  const mySubunits = subunits.filter(s => s.departmentId === me.departmentId);

  return (
    <div className={styles.page}>
      {pendingVerifications.length > 0 && (
        <div 
          className={styles.card} 
          style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6', marginBottom: '1rem' }}
          onClick={() => setActiveTab('Approvals')}
        >
          <div className={styles.sectionHeader}>
            <h3 style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} />
              {pendingVerifications.length} Verification {pendingVerifications.length === 1 ? 'Request' : 'Requests'}
            </h3>
            <ChevronRight size={20} color="#8b5cf6" />
          </div>
          <p className={styles.itemSubtitle}>Volunteers waiting for geofence approval</p>
        </div>
      )}
      <div className={styles.grid}>
        <div className={styles.card + ' ' + styles.statCard}>
          <span className={styles.statValue}>{health?.attendanceRate || 0}%</span>
          <span className={styles.statLabel}>Avg Attendance</span>
        </div>
        <div className={styles.card + ' ' + styles.statCard}>
          <span className={styles.statValue}>{health?.activeProbations || 0}</span>
          <span className={styles.statLabel}>Active Gaps</span>
        </div>
      </div>

      <div className={styles.tabs}>
        {['Subunits', 'Approvals', 'Reports'].map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className={styles.section}>
        {activeTab === 'Subunits' && (
          <div className={styles.list}>
            {mySubunits.length === 0 ? (
              <div className={styles.emptyState}>
                No subunits in your department yet.
              </div>
            ) : (
              mySubunits.map((unit) => (
                <div key={unit._id} className={styles.listItem}>
                  <div className={styles.itemIcon}>
                    <Users size={20} />
                  </div>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemTitle}>{unit.name}</p>
                    <p className={styles.itemSubtitle}>Lead: {unit.leadId || 'Not Assigned'}</p>
                  </div>
                  <ChevronRight size={16} color="#9ca3af" />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'Approvals' && (
          <div className={styles.list}>
            {pendingVerifications.length > 0 && (
              <div 
                className={styles.listItem} 
                onClick={() => navigate('/admin')}
                style={{ borderLeft: '4px solid #8b5cf6' }}
              >
                <div className={styles.itemIcon} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  <ShieldAlert size={20} />
                </div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemTitle}>Manual Verifications</p>
                  <p className={styles.itemSubtitle}>{pendingVerifications.length} pending geofence overrides</p>
                </div>
                <ChevronRight size={16} color="#8b5cf6" />
              </div>
            )}
            
            <div className={styles.listItem}>
              <div className={styles.itemIcon} style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                <ArrowRightLeft size={20} />
              </div>
              <div className={styles.itemInfo}>
                <p className={styles.itemTitle}>Borrow Request</p>
                <p className={styles.itemSubtitle}>Music Dept needs 2 Media Volunteers</p>
              </div>
              <div className={styles.badge} style={{ background: '#fef9c3', color: '#854d0e' }}>
                Pending
              </div>
            </div>
            <div className={styles.listItem}>
              <div className={styles.itemIcon} style={{ background: '#fef2f2', color: '#ef4444' }}>
                <AlertCircle size={20} />
              </div>
              <div className={styles.itemInfo}>
                <p className={styles.itemTitle}>Probation Review</p>
                <p className={styles.itemSubtitle}>Mark Grayson (Week 4)</p>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </div>
          </div>
        )}
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .${styles.tabs} {
          display: flex;
          background: var(--bg-secondary);
          padding: 4px;
          border-radius: 12px;
          margin: 1rem 0;
        }
        .${styles.tab} {
          flex: 1;
          padding: 8px;
          border: none;
          background: transparent;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          border-radius: 8px;
          cursor: pointer;
        }
        .${styles.activeTab} {
          background: var(--card-bg);
          color: var(--text-primary);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
      `}} />
    </div>
  );
};
