import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Heart, ChevronRight, Loader2, MessageSquare, ClipboardList, Video, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { MeetingCard } from '../../components/MeetingCard';
import styles from './mobile.module.css';

export const PastoralHome: React.FC = () => {
  const navigate = useNavigate();
  const me = useQuery(api.users.me);
  const nextService = useQuery(api.services.getNextService);
  const meetings = useQuery(api.meetings.getMeetingsForUser);
  
  const health = useQuery(api.oversight.getDepartmentHealth, 
    me?.departmentId ? { departmentId: me.departmentId } : "skip"
  );

  if (me === undefined || nextService === undefined || health === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  const now = Date.now();
  const activeMeetings = (meetings || []).filter((meeting: any) => 
    now >= meeting.startTime - 15 * 60 * 1000 && 
    now <= meeting.endTime + 30 * 60 * 1000
  );

  const formatDistanceSafe = (timestamp: number | undefined) => {
    if (!timestamp) return 'No upcoming services';
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch (e) {
      return 'TBD';
    }
  };

  return (
    <div className={styles.page}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
        borderRadius: 20,
        padding: '1.5rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Heart size={24} color="white" />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Pastoral Oversight</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.85, margin: 0 }}>{me.departmentName} Department</p>
        </div>
      </div>

      {activeMeetings.length > 0 && (
        <section className={styles.section} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <h2 className={styles.sectionTitle}>Active Gatherings</h2>
          {activeMeetings.map((meeting: any) => (
            <MeetingCard key={meeting._id} meeting={meeting} />
          ))}
        </section>
      )}

      {/* Countdown Card */}
      <section className={styles.section}>
        <div className={styles.card + ' ' + styles.countdownCard} style={{ background: '#166534' }}>
          <span className={styles.countdownLabel} style={{ color: 'rgba(255,255,255,0.8)' }}>Next Service</span>
          <span className={styles.countdownValue} style={{ color: 'white' }}>
            {formatDistanceSafe(nextService?.startTime)}
          </span>
          <span className={styles.countdownLabel} style={{ color: 'rgba(255,255,255,0.8)' }}>{nextService?.name || '---'}</span>
        </div>
      </section>

      {/* Stat Grid */}
      <div className={styles.grid}>
        <div className={styles.card + ' ' + styles.statCard}>
          <span className={styles.statValue} style={{ color: '#15803d' }}>{health?.attendanceRate ?? 0}%</span>
          <span className={styles.statLabel}>Avg Attendance</span>
        </div>
        <div className={styles.card + ' ' + styles.statCard}>
          <span className={styles.statValue} style={{ color: '#d97706' }}>{health?.activeProbations ?? 0}</span>
          <span className={styles.statLabel}>Active Probations</span>
        </div>
      </div>

      {/* Quick Actions */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Oversight Tools</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/chat')}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-95 transition-all"
          >
            <div className="p-3 bg-green-50 text-green-700 rounded-xl">
              <MessageSquare size={20} />
            </div>
            <span className="text-xs font-semibold text-gray-700">Pastoral Chat</span>
          </button>
          
          <button 
            onClick={() => navigate('/reports')}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-95 transition-all"
          >
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ClipboardList size={20} />
            </div>
            <span className="text-xs font-semibold text-gray-700">View Reports</span>
          </button>

          <button 
            onClick={() => navigate('/rota')}
            className="col-span-2 flex items-center justify-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-95 transition-all"
          >
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Calendar size={20} />
            </div>
            <span className="text-sm font-semibold text-gray-700">View Department Rota</span>
          </button>
        </div>
      </section>
    </div>
  );
};
