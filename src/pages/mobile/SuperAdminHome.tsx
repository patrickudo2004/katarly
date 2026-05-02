import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { LayoutGrid, Users, TrendingUp, ShieldCheck, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './mobile.module.css';

export const SuperAdminHome: React.FC = () => {
  const navigate = useNavigate();
  const stats = useQuery(api.churches.getChurchStats);
  const subunits = useQuery(api.subunits.getSubunits);

  if (stats === undefined || subunits === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  const chartData = [
    { name: 'Total', value: stats?.totalVolunteers || 0 },
    { name: 'Records', value: stats?.totalAttendanceRecords || 0 },
  ];

  return (
    <div className={styles.page}>
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
              <p className={styles.statValue}>{stats?.totalSubunits || 0}</p>
              <p className={styles.statLabel}>Departments</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Departments</h2>
          <button className={styles.linkBtn} onClick={() => navigate('/admin')}>Manage</button>
        </div>
        <div className={styles.list}>
          {subunits.length === 0 ? (
            <div className={styles.emptyState}>
              No departments created yet.
            </div>
          ) : (
            subunits.map((subunit) => (
              <div key={subunit._id} className={styles.listItem}>
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
              style={{ border: 'none', padding: 0, cursor: 'pointer' }}
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
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .${styles.linkBtn} {
          background: none;
          border: none;
          color: #8b5cf6;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
        }
      `}} />
    </div>
  );
};
