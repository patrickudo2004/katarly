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
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { NetworkSummaryCard } from '../components/NetworkSummaryCard';
import { UserRole } from '../components/RoleBadge';
import { OversightDashboardTab } from '../components/OversightDashboardTab';
import { MobileDashboard } from '../components/MobileDashboard';
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
  const attendanceTrends = useQuery(api.churches.getAttendanceTrends);
  
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
      {(userRole === 'PastoralOversight' || userRole === 'SuperAdmin') && me?.department && (
        <OversightDashboardTab department={me.department} />
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
        {/* Charts Section */}
        <div className={styles.chartSection}>
          <div className={styles.sectionHeader}>
            <TrendingUp size={20} />
            <h2>Attendance Trends</h2>
          </div>
          <div className={styles.chartContainer}>
            {attendanceTrends && attendanceTrends.length > 0 ? (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="present" name="Present" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="late" name="Late" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="excused" name="Excused" fill="#a78bfa" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                No attendance records found for this church.
              </div>
            )}
          </div>
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
