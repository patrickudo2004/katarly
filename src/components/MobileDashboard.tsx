import React from 'react';
import { 
  Clock, 
  Calendar, 
  Flame, 
  MessageSquare, 
  CheckCircle, 
  ChevronRight, 
  ShieldCheck, 
  TrendingUp,
  AlertCircle,
  Loader2,
  Users
} from 'lucide-react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import styles from './MobileDashboard.module.css';

interface MobileDashboardProps {
  user: any;
  church: any;
  stats: any;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({ user, church, stats }) => {
  const navigate = useNavigate();
  const myShifts = useQuery(api.rotas.getMyShifts);
  const myStats = useQuery(api.recognition.getUserStats, { userId: user._id });
  const pendingVerifications = useQuery(api.attendance.getPendingVerifications, { churchId: church._id });
  
  const nextShift = myShifts?.filter(s => s.service && s.service.startTime > Date.now())
    .sort((a, b) => a.service.startTime - b.service.startTime)[0];

  const role = user.role;

  return (
    <div className={styles.container}>
      {/* 1. The Welcome Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Shalom, {user.name?.split(' ')[0] || 'Member'}</h1>
          <p>{format(new Date(), 'EEEE, MMMM do')}</p>
        </div>
        {myStats?.streak && myStats.streak > 0 && (
          <div className={styles.streakBadge}>
            <Flame size={16} />
            <span>{myStats.streak} Week Streak</span>
          </div>
        )}
      </section>

      {/* 2. Role-Based Primary Action Card */}
      <section className={styles.primarySection}>
        {role === 'Volunteer' && (
          <div className={styles.card} onClick={() => navigate('/marketplace')}>
            <div className={styles.cardHeader}>
              <Calendar className={styles.icon} style={{ color: '#8b5cf6' }} />
              <h3>Next Service</h3>
            </div>
            {nextShift ? (
              <div className={styles.shiftDetails}>
                <div className={styles.shiftInfo}>
                  <strong>{nextShift.service.name}</strong>
                  <span>{format(nextShift.service.startTime, 'MMM do, h:mm a')}</span>
                </div>
                <div className={styles.countdown}>
                  In {formatDistanceToNow(nextShift.service.startTime)}
                </div>
              </div>
            ) : (
              <p className={styles.emptyText}>No upcoming shifts assigned.</p>
            )}
            <div className={styles.cardFooter}>
              <span>View Rota</span>
              <ChevronRight size={16} />
            </div>
          </div>
        )}

        {(role === 'SubunitLead' || role === 'DepartmentHead') && (
          <div className={styles.card} onClick={() => navigate('/admin')}>
            <div className={styles.cardHeader}>
              <ShieldCheck className={styles.icon} style={{ color: '#10b981' }} />
              <h3>Team Readiness</h3>
            </div>
            <div className={styles.readinessInfo}>
              <div className={styles.readinessStat}>
                <div className={styles.statValue}>{pendingVerifications?.length || 0}</div>
                <div className={styles.statLabel}>Pending Verifications</div>
              </div>
              <div className={styles.readinessStat}>
                <div className={styles.statValue}>{stats.avgAttendance}%</div>
                <div className={styles.statLabel}>Avg. Attendance</div>
              </div>
            </div>
            <div className={styles.cardFooter}>
              <span>Manage Team</span>
              <ChevronRight size={16} />
            </div>
          </div>
        )}

        {(role === 'SuperAdmin' || role === 'PastoralOversight') && (
          <div className={styles.card} onClick={() => navigate('/admin')}>
            <div className={styles.cardHeader}>
              <TrendingUp className={styles.icon} style={{ color: '#3b82f6' }} />
              <h3>Church Pulse</h3>
            </div>
            <div className={styles.statsRow}>
              <div className={styles.miniStat}>
                <strong>{stats.totalVolunteers}</strong>
                <span>Volunteers</span>
              </div>
              <div className={styles.miniStat}>
                <strong>{stats.upcomingServices}</strong>
                <span>Services</span>
              </div>
              <div className={styles.miniStat}>
                <strong>{stats.pendingRequests}</strong>
                <span>Tasks</span>
              </div>
            </div>
            <div className={styles.cardFooter}>
              <span>Detailed Report</span>
              <ChevronRight size={16} />
            </div>
          </div>
        )}
      </section>

      {/* 3. Common Quick Links */}
      <section className={styles.quickLinks}>
        <button onClick={() => navigate('/chat')} className={styles.linkBtn}>
          <div className={styles.linkIcon} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <MessageSquare size={20} />
          </div>
          <span>Team Chat</span>
        </button>
        <button onClick={() => navigate('/hall-of-fame')} className={styles.linkBtn}>
          <div className={styles.linkIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Flame size={20} />
          </div>
          <span>Leaderboard</span>
        </button>
        <button onClick={() => navigate('/profile')} className={styles.linkBtn}>
          <div className={styles.linkIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Users size={20} />
          </div>
          <span>Profile</span>
        </button>
      </section>

      {/* 4. Recent Alerts (Simplified for Mobile) */}
      <section className={styles.alertsSection}>
        <div className={styles.sectionHeader}>
          <h3>Recent Alerts</h3>
          <button onClick={() => navigate('/notifications')}>View All</button>
        </div>
        <div className={styles.alertList}>
          {stats.pendingRequests > 0 ? (
            <div className={styles.alertItem}>
              <div className={styles.alertIndicator} />
              <p>You have {stats.pendingRequests} pending task(s) requiring attention.</p>
            </div>
          ) : (
            <div className={styles.emptyAlerts}>
              <CheckCircle size={16} />
              <span>Everything looks good!</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
