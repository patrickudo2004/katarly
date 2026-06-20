import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { 
  ChevronLeft, Users, CheckCircle2, XCircle, 
  Clock, Loader2, MessageSquare, AlertTriangle 
} from 'lucide-react';
import styles from './mobile.module.css';

export const SubunitDetail: React.FC = () => {
  const { subunitId } = useParams();
  const navigate = useNavigate();
  
  const subunit = useQuery(api.subunits.getSubunit, { id: subunitId as any });
  const nextService = useQuery(api.services.getNextService);
  const liveAttendance = useQuery(api.subunits.getLiveAttendance, 
    nextService && subunitId ? { serviceId: nextService._id, subunitId: subunitId as any } : "skip"
  );
  const channels = useQuery(api.chat.getChannels);
  
  const subunitAttendance = liveAttendance || [];
  const subunitChannel = channels?.find(c => c.type === 'subunit' && c.subunitId === subunitId);

  if (subunit === undefined || nextService === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className="flex items-center gap-4 p-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold">{subunit?.name}</h1>
          <p className="text-xs text-gray-500">Live Team Status</p>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.grid}>
          <div className={styles.card + ' ' + styles.statCard}>
            <span className={styles.statValue}>{subunitAttendance.length}</span>
            <span className={styles.statLabel}>Checked In</span>
          </div>
          <div className={styles.card + ' ' + styles.statCard}>
            <span className={styles.statValue} style={{ color: '#ef4444' }}>
              {nextService?.name ? 'Live' : 'No Service'}
            </span>
            <span className={styles.statLabel}>Service Status</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Attendance Roster</h2>
          {nextService?.name && (
            <div className={styles.badge} style={{ background: '#f0f9ff', color: '#0369a1' }}>
              {nextService.name}
            </div>
          )}
        </div>
        
        <div className={styles.list}>
          {subunitAttendance.length === 0 ? (
            <div className={styles.emptyState}>
              <AlertTriangle size={32} className="mb-2 opacity-20" />
              <p>No one from this subunit has checked in yet.</p>
            </div>
          ) : (
            subunitAttendance.map((record: any) => (
              <div key={record._id} className={styles.listItem}>
                <div className={styles.avatar}>
                  {record.user?.name?.[0] || '?'}
                </div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemTitle}>{record.user?.name || 'Unknown'}</p>
                  <p className={styles.itemSubtitle}>
                    <Clock size={12} className="inline mr-1" />
                    {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className={styles.badge} style={{ 
                  background: record.status === 'Present' ? '#dcfce7' : '#fef9c3', 
                  color: record.status === 'Present' ? '#15803d' : '#a16207' 
                }}>
                  {record.status}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <button 
          onClick={() => {
            if (subunitChannel) {
              navigate(`/chat?channelId=${subunitChannel._id}`);
            } else {
              navigate('/chat');
            }
          }}
          className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-200 active:scale-95 transition-all"
        >
          <MessageSquare size={20} />
          Message Subunit Team
        </button>
      </section>
    </div>
  );
};
