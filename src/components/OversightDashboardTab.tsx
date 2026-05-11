import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Activity, ShieldAlert, Users, Heart, ArrowUpCircle, CheckCircle } from 'lucide-react';
import styles from './OversightDashboardTab.module.css';

interface OversightDashboardTabProps {
  departmentName: string;
  departmentId: string;
}

export const OversightDashboardTab: React.FC<OversightDashboardTabProps> = ({ departmentName, departmentId }) => {
  const health = useQuery(api.oversight.getDepartmentHealth, { departmentId: departmentId as any });
  const escalate = useMutation(api.oversight.escalateItem);
  const [isEscalating, setIsEscalating] = React.useState(false);

  if (!health) return <div className={styles.loading}>Loading Department Health...</div>;

  const handleEscalate = async (type: 'probation' | 'borrow' | 'timeOff', note: string) => {
    setIsEscalating(true);
    try {
      await escalate({ type, itemId: "manual", note });
      alert("Item escalated to Super Admin successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to escalate item.");
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Heart className={styles.headerIcon} />
        <h2>{departmentName} Department Spiritual Health</h2>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <Activity className={styles.metricIcon} color="#10b981" />
          <div className={styles.metricValue}>{health.attendanceRate}%</div>
          <div className={styles.metricLabel}>Attendance Rate</div>
        </div>
        <div className={styles.metricCard}>
          <Users className={styles.metricIcon} color="#3b82f6" />
          <div className={styles.metricValue}>{health.volunteerCount}</div>
          <div className={styles.metricLabel}>Total Volunteers</div>
        </div>
        <div className={styles.metricCard}>
          <ShieldAlert className={styles.metricIcon} color="#f59e0b" />
          <div className={styles.metricValue}>{health.activeProbations}</div>
          <div className={styles.metricLabel}>Active Probations</div>
        </div>
      </div>

      <div className={styles.escalationSection}>
        <h3>Escalation Authority</h3>
        <p className={styles.description}>
          As Pastoral Oversight, you can escalate unresolved issues or spiritual concerns directly to the Super Admin.
        </p>
        
        <div className={styles.actionList}>
          <div className={styles.actionItem}>
            <div className={styles.actionInfo}>
              <h4>Probation Extension</h4>
              <p>Extend a volunteer's probation if spiritual growth goals aren't met.</p>
            </div>
            <button 
              className={styles.escalateBtn}
              onClick={() => handleEscalate('probation', 'Spiritual growth goals not met after review.')}
              disabled={isEscalating}
            >
              <ArrowUpCircle size={16} />
              Escalate
            </button>
          </div>

          <div className={styles.actionItem}>
            <div className={styles.actionInfo}>
              <h4>Borrow Dispute</h4>
              <p>Resolve conflicts between departments regarding volunteer borrowing.</p>
            </div>
            <button 
              className={styles.escalateBtn}
              onClick={() => handleEscalate('borrow', 'Inter-departmental conflict over volunteer resources.')}
              disabled={isEscalating}
            >
              <ArrowUpCircle size={16} />
              Resolve
            </button>
          </div>
        </div>
      </div>

      <div className={styles.summarySection}>
        <h3>Volunteer Morale Summary</h3>
        <div className={styles.moraleIndicator}>
          {health.lowKpis > 0 ? (
            <div className={styles.warning}>
              <ShieldAlert size={20} />
              <span>{health.lowKpis} volunteers have "Needs Improvement" or "Disapprove" KPI logs. Pastoral attention recommended.</span>
            </div>
          ) : (
            <div className={styles.success}>
              <CheckCircle size={20} />
              <span>Department morale appears healthy based on recent KPI logs.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
