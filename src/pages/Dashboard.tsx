import React from 'react';
import { 
  Users, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Settings as SettingsIcon,
  Building2,
  Sparkles,
  Loader2,
  Scale,
  MessageSquareLock
} from 'lucide-react';
import { 
  ResponsiveContainer
} from 'recharts';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { NetworkSummaryCard } from '../components/NetworkSummaryCard';
import { UserRole } from '../components/RoleBadge';
import { OversightDashboardTab } from '../components/OversightDashboardTab';
import { MobileDashboard } from '../components/MobileDashboard';
import { EscalationManager } from '../components/EscalationManager';
import styles from './Dashboard.module.css';

// Statistics and Organization data will be fetched from Convex

interface DashboardProps {
  userRole: UserRole;
}

export const Dashboard: React.FC<DashboardProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const me = useQuery(api.users.me);
  const church = useQuery(api.churches.getMyChurch);
  const stats = useQuery(api.churches.getChurchStats);
  const organogramData = useQuery(api.churches.getOrganogram);
  const activities = useQuery(api.churches.getRecentActivities);
  
  const ensureChannels = useMutation(api.chat.ensureChannels);
  const seedBadges = useMutation(api.recognition.seedBadges);

  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (me?.churchId) {
      ensureChannels({ churchId: me.churchId });
      seedBadges({ churchId: me.churchId });
    }
  }, [me?.churchId, ensureChannels, seedBadges]);

  if (!me || !church || !stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  if (isMobile) {
    return <MobileDashboard user={me} church={church} stats={stats} />;
  }

  // Dedicated Volunteer View for Desktop
  if (userRole === 'Volunteer') {
    return (
      <div className={styles.container}>
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div className={styles.churchIdentity}>
              <div className={styles.logoWrapper}>
                {church.logoUrl ? (
                  <img src={church.logoUrl} alt={church.name} className={styles.logo} />
                ) : (
                  <div className={styles.fallbackLogo}>
                    <Building2 size={32} />
                  </div>
                )}
              </div>
              <div className={styles.titles}>
                <div className={styles.badge}>
                  <Sparkles size={12} />
                  <span>Volunteer Portal</span>
                </div>
                <h1>{church.name}</h1>
                <p>Welcome back, {me.name || 'Member'}. Your service makes a difference!</p>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/attendance')}
              className={styles.settingsBtn}
              style={{ background: 'var(--accent)' }}
            >
              <CheckCircle size={18} />
              Check In Now
            </button>
          </div>
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.analyticsSection}>
            <div className={styles.sectionHeader}>
              <CalendarIcon size={20} />
              <h2>Your Upcoming Shifts</h2>
            </div>
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>You can view and manage your full schedule in the <strong>Rota</strong> tab.</p>
              <button 
                onClick={() => navigate('/rota')}
                className={styles.settingsBtn}
                style={{ marginTop: '1rem', display: 'inline-flex' }}
              >
                Go to Rota
              </button>
            </div>
          </div>

          <div className={styles.orgSection}>
            <div className={styles.sectionHeader}>
              <Building2 size={20} />
              <h2>Church Information</h2>
            </div>
            <div className={styles.statCard} style={{ marginTop: '1rem' }}>
              <p><strong>Address:</strong> {church.address || 'Location not set'}</p>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Please ensure you are at the church premises during check-in.
              </p>
            </div>
          </div>

          <div className={styles.activitySection}>
            <div className={styles.sectionHeader}>
              <Sparkles size={20} />
              <h2>Quick Actions</h2>
            </div>
            <div className={styles.activityList}>
              <div className={styles.activityItem} onClick={() => navigate('/chat')} style={{ cursor: 'pointer' }}>
                <div className={styles.activityIndicator} style={{ background: '#8b5cf6' }} />
                <div className={styles.activityContent}>
                  <p className={styles.activityTitle}>Open Group Chat</p>
                  <p className={styles.activityMeta}>Connect with your team</p>
                </div>
                <ChevronRight size={16} />
              </div>
              <div className={styles.activityItem} onClick={() => navigate('/marketplace')} style={{ cursor: 'pointer' }}>
                <div className={styles.activityIndicator} style={{ background: '#10b981' }} />
                <div className={styles.activityContent}>
                  <p className={styles.activityTitle}>Shift Marketplace</p>
                  <p className={styles.activityMeta}>Claim open shifts or swap</p>
                </div>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dedicated Deacon Head View for Desktop
  if (userRole === 'DeaconHead') {
    return (
      <div className={styles.container}>
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div className={styles.churchIdentity}>
              <div className={styles.logoWrapper}>
                {church.logoUrl ? (
                  <img src={church.logoUrl} alt={church.name} className={styles.logo} />
                ) : (
                  <div className={styles.fallbackLogo}>
                    <Scale size={32} />
                  </div>
                )}
              </div>
              <div className={styles.titles}>
                <div className={styles.badge} style={{ background: '#1e3a5f', color: 'white' }}>
                  <Scale size={12} />
                  <span>Deacon Board Governance</span>
                </div>
                <h1>{church.name}</h1>
                <p>Church-wide oversight and escalation management.</p>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/chat')}
              className={styles.settingsBtn}
              style={{ background: '#1e3a5f' }}
            >
              <MessageSquareLock size={18} />
              Board Channel
            </button>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <Users className={styles.statIcon} style={{ color: '#1e3a5f' }} />
              <span className={styles.statLabel}>Total Workforce</span>
            </div>
            <div className={styles.statValue}>{stats?.totalVolunteers ?? 0}</div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <TrendingUp className={styles.statIcon} style={{ color: '#15803d' }} />
              <span className={styles.statLabel}>Avg. Attendance</span>
            </div>
            <div className={styles.statValue}>{stats?.avgAttendance ?? 0}%</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <AlertTriangle className={styles.statIcon} style={{ color: '#ef4444' }} />
              <span className={styles.statLabel}>Pending Escalations</span>
            </div>
            <div className={styles.statValue}>{stats?.pendingRequests ?? 0}</div>
          </div>
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.analyticsSection}>
            <div className={styles.sectionHeader}>
              <AlertTriangle size={20} className="text-red-500" />
              <h2>Governance Queue</h2>
            </div>
            <EscalationManager />
          </div>

          <div className={styles.orgSection}>
            <NetworkSummaryCard stats={{
              departments: stats?.totalDepartments || 0,
              subunits: stats?.totalSubunits || 0,
              volunteers: stats?.totalVolunteers || 0,
              pendingInvites: stats?.pendingInvites || 0
            }} />
          </div>

          <div className={styles.activitySection}>
            <div className={styles.sectionHeader}>
              <Sparkles size={20} />
              <h2>Quick Actions</h2>
            </div>
            <div className={styles.activityList}>
              <div className={styles.activityItem} onClick={() => navigate('/admin')} style={{ cursor: 'pointer' }}>
                <div className={styles.activityIndicator} style={{ background: '#1e3a5f' }} />
                <div className={styles.activityContent}>
                  <p className={styles.activityTitle}>Department Management</p>
                  <p className={styles.activityMeta}>Assign roles & oversee structure</p>
                </div>
                <ChevronRight size={16} />
              </div>
              <div className={styles.activityItem} onClick={() => navigate('/reports')} style={{ cursor: 'pointer' }}>
                <div className={styles.activityIndicator} style={{ background: '#15803d' }} />
                <div className={styles.activityContent}>
                  <p className={styles.activityTitle}>Global Reports</p>
                  <p className={styles.activityMeta}>Full church growth analytics</p>
                </div>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin/Leader View
  return (
    <div className={styles.container}>
      {/* Church Identity Hero */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.churchIdentity}>
            <div className={styles.logoWrapper}>
              {church.logoUrl ? (
                <img src={church.logoUrl} alt={church.name} className={styles.logo} />
              ) : (
                <div className={styles.fallbackLogo}>
                  <Building2 size={32} />
                </div>
              )}
            </div>
            <div className={styles.titles}>
              <div className={styles.badge}>
                <Sparkles size={12} />
                <span>Sanctuary Dashboard</span>
              </div>
              <h1>{church.name}</h1>
              <p>Welcome back, {me.name || 'Admin'}. Here is your church's operational pulse.</p>
            </div>
          </div>
          
          {userRole === 'SuperAdmin' && (
            <button 
              onClick={() => navigate('/admin/settings')}
              className={styles.settingsBtn}
            >
              <SettingsIcon size={18} />
              Configure Church
            </button>
          )}
        </div>
      </div>

      {/* Oversight View - Only for Pastoral Oversight and Super Admins */}
      {(userRole === 'PastoralOversight' || userRole === 'SuperAdmin') && me?.departmentId && (
        <OversightDashboardTab departmentName={me.departmentName || 'Your'} departmentId={me.departmentId} />
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Users className={styles.statIcon} style={{ color: '#8b5cf6' }} />
            <span className={styles.statLabel}>Total Volunteers</span>
          </div>
          <div className={styles.statValue}>{stats?.totalVolunteers ?? 0}</div>
          <div className={styles.statTrend}>{stats?.totalVolunteers ? "Active workforce" : "Invite your first volunteer"}</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <CheckCircle className={styles.statIcon} style={{ color: '#10b981' }} />
            <span className={styles.statLabel}>Avg. Attendance</span>
          </div>
          <div className={styles.statValue}>{stats?.avgAttendance ?? 0}%</div>
          <div className={styles.statTrend}>Last 5 services</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <CalendarIcon className={styles.statIcon} style={{ color: '#3b82f6' }} />
            <span className={styles.statLabel}>Upcoming Services</span>
          </div>
          <div className={styles.statValue}>{stats?.upcomingServices ?? 0}</div>
          <div className={styles.statTrend}>
            {stats?.nextService ? `Next: ${new Date(stats.nextService.startTime).toLocaleDateString()}` : "No upcoming services"}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Clock className={styles.statIcon} style={{ color: '#f59e0b' }} />
            <span className={styles.statLabel}>Pending Tasks</span>
          </div>
          <div className={styles.statValue}>{stats?.pendingRequests ?? 0}</div>
          <div className={styles.statTrend}>Swaps & Invites</div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* Analytics & Escalations Section */}
        <div className={styles.analyticsSection}>
          {stats?.pendingRequests ? (
            <div className={styles.statCard} style={{ height: '100%', padding: '1.5rem' }}>
              <div className={styles.sectionHeader} style={{ marginBottom: '1rem' }}>
                <AlertTriangle size={20} className="text-red-500" />
                <h2>Governance Queue</h2>
              </div>
              <EscalationManager />
            </div>
          ) : (
            <div className={styles.statCard} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{ background: '#f3e8ff', color: '#8b5cf6', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                <TrendingUp size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Deep-Dive Analytics</h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Access detailed growth trends, export high-fidelity charts, and drill down into service-level check-ins.</p>
              <button 
                onClick={() => navigate('/reports')}
                className={styles.settingsBtn}
                style={{ background: 'var(--accent)', padding: '0.75rem 1.5rem', borderRadius: '8px', color: 'white', fontWeight: 600 }}
              >
                Open Reports Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Network Summary Section */}
        <div className={styles.orgSection}>
          <NetworkSummaryCard stats={{
            departments: stats?.totalDepartments || 0,
            subunits: stats?.totalSubunits || 0,
            volunteers: stats?.totalVolunteers || 0,
            pendingInvites: stats?.pendingInvites || 0
          }} />
        </div>

        {/* Recent Activity / Tasks */}
        <div className={styles.activitySection}>
          <div className={styles.sectionHeader}>
            <AlertTriangle size={20} />
            <h2>Recent Alerts</h2>
          </div>
          <div className={styles.activityList}>
            {activities?.length ? activities.map(activity => (
              <div key={activity._id} className={styles.activityItem}>
                <div className={styles.activityIndicator} />
                <div className={styles.activityContent}>
                  <p className={styles.activityTitle}>{activity.title}</p>
                  <p className={styles.activityMeta}>{activity.message}</p>
                </div>
                <ChevronRight size={16} className={styles.activityAction} />
              </div>
            )) : (
              <div className="p-4 text-center text-gray-400">
                No recent alerts.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
