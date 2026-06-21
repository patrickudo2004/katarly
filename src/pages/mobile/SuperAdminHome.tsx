import React, { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { LayoutGrid, Users, TrendingUp, ShieldCheck, ChevronRight, Loader2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MeetingCard } from '../../components/MeetingCard';
import { UpcomingShiftsCard } from '../../components/UpcomingShiftsCard';
import styles from './mobile.module.css';
import { MobileAssignShiftModal } from '../../components/MobileAssignShiftModal';

export const SuperAdminHome: React.FC = () => {
  const navigate = useNavigate();
  const me = useQuery(api.users.me);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const stats = useQuery(api.churches.getChurchStats);
  const subunits = useQuery(api.subunits.getSubunits);
  const meetings = useQuery(api.meetings.getMeetingsForUser);

  if (me === undefined || (me?.churchId && stats === undefined)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  const safeSubunits = subunits || [];

  const chartData = [
    { name: 'Total', value: stats?.totalVolunteers || 0 },
    { name: 'Records', value: stats?.totalAttendanceRecords || 0 },
  ];

  const now = Date.now();
  const activeMeetings = (meetings || []).filter((meeting: any) => 
    now >= meeting.startTime - 15 * 60 * 1000 && 
    now <= meeting.endTime + 30 * 60 * 1000
  );

  return (
    <div className={styles.page}>
      {activeMeetings.length > 0 && (
        <section className={styles.section} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <h2 className={styles.sectionTitle}>Active Gatherings</h2>
          {activeMeetings.map((meeting: any) => (
            <MeetingCard key={meeting._id} meeting={meeting} />
          ))}
        </section>
      )}
      <section className={styles.section}>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Church Overview</h2>
            <TrendingUp size={16} color="#22c55e" />
          </div>
          <div style={{ width: '100%', height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <Cell fill="#8b5cf6" />
                  <Cell fill="#e5e7eb" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.grid} style={{ marginTop: '0.5rem' }}>
            <div>
              <p className={styles.statValue}>{stats?.totalVolunteers || 0}</p>
              <p className={styles.statLabel}>Total Volunteers</p>
            </div>
            <div>
              <p className={styles.statValue}>{stats?.totalDepartments || 0}</p>
              <p className={styles.statLabel}>Departments</p>
            </div>
          </div>
        </div>
      </section>

      <UpcomingShiftsCard />

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Departments</h2>
          <button className={styles.linkBtn} onClick={() => navigate('/admin')}>Manage</button>
        </div>
        <div className={styles.list}>
          {subunits === undefined ? (
            <div className="space-y-3 w-full">
              <div className={styles.skeleton} style={{ height: '56px', width: '100%' }} />
              <div className={styles.skeleton} style={{ height: '56px', width: '100%' }} />
            </div>
          ) : safeSubunits.length === 0 ? (
            <div className={styles.emptyState}>
              <LayoutGrid size={32} className="mb-2 opacity-30" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>No Departments Found</p>
              <p style={{ margin: 0, fontSize: '0.8125rem' }}>Create departments from the admin panel to get started.</p>
            </div>
          ) : (
            safeSubunits.map((subunit) => (
              <div 
                key={subunit._id} 
                className={styles.listItem}
                onClick={() => navigate('/subunit/' + subunit._id)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.itemIcon} style={{ background: '#8b5cf615', color: '#8b5cf6' }}>
                  <Users size={20} />
                </div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemTitle}>{subunit.name}</p>
                  <p className={styles.itemSubtitle}>{subunit.departmentName}</p>
                </div>
                <ChevronRight size={16} color="#9ca3af" />
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
        </div>
        <div className={styles.card}>
          <div className={styles.list}>
            <div 
              className={styles.listItem} 
              style={{ cursor: 'pointer', padding: '0.75rem 0' }}
              onClick={() => navigate('/invites')}
            >
              <div className={styles.itemIcon} style={{ background: '#fef2f2', color: '#ef4444' }}>
                <ShieldCheck size={20} />
              </div>
              <div className={styles.itemInfo}>
                <p className={styles.itemTitle}>Invite Leaders</p>
                <p className={styles.itemSubtitle}>Add Dept Heads & Oversight</p>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </div>

            <div 
              className={styles.listItem} 
              style={{ cursor: 'pointer', padding: '0.75rem 0', borderTop: '1px solid var(--border-color)' }}
              onClick={() => setIsAssignModalOpen(true)}
            >
              <div className={styles.itemIcon} style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                <UserPlus size={20} />
              </div>
              <div className={styles.itemInfo}>
                <p className={styles.itemTitle}>Assign Shift</p>
                <p className={styles.itemSubtitle}>Schedule workforce roles</p>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </div>
          </div>
        </div>
      </section>

      <MobileAssignShiftModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />
    </div>
  );
};
