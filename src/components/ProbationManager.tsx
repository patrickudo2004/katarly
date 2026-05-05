import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Users, 
  Target, 
  MessageSquare, 
  TrendingUp, 
  Award, 
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import styles from './ProbationManager.module.css';

interface Props {
  churchId: any;
}

export const ProbationManager: React.FC<Props> = ({ churchId }) => {
  const probationers = useQuery(api.probation.listProbationers, { churchId });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const status = useQuery(api.probation.getProbationStatus, { 
    userId: selectedUser?._id as any 
  });

  const addRemark = useMutation(api.probation.addRemark);
  const promoteUser = useMutation(api.users.updateUserRole);

  const [remarkContent, setRemarkContent] = useState('');
  const [remarkSentiment, setRemarkSentiment] = useState<'Good' | 'Fair' | 'Concern'>('Good');

  const handleAddRemark = async () => {
    if (!remarkContent.trim() || !selectedUser) return;
    try {
      await addRemark({
        userId: selectedUser._id,
        content: remarkContent,
        sentiment: remarkSentiment,
      });
      setRemarkContent('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePromote = async (userId: any) => {
    if (!confirm("Promote this volunteer to full status?")) return;
    try {
      await promoteUser({ userId, role: "Volunteer" });
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Users size={18} />
          <h3>Probationers</h3>
        </div>
        <div className={styles.userList}>
          {probationers?.map(user => (
            <button 
              key={user._id} 
              className={`${styles.userItem} ${selectedUser?._id === user._id ? styles.active : ''}`}
              onClick={() => setSelectedUser(user)}
            >
              <div className={styles.avatar}>{user.name?.[0] || 'U'}</div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userSub}>{user.remarkCount} remarks</span>
              </div>
              <ChevronRight size={14} />
            </button>
          ))}
          {probationers?.length === 0 && <p className={styles.empty}>No active probations.</p>}
        </div>
      </div>

      <div className={styles.main}>
        {selectedUser ? (
          <div className={styles.details}>
            <header className={styles.detailHeader}>
              <div className={styles.profileInfo}>
                <h2>{selectedUser.name}</h2>
                <p>On probation since {format(selectedUser.probationMetadata?.startDate || Date.now(), 'MMM dd, yyyy')}</p>
              </div>
              <button 
                className={styles.promoteBtn}
                onClick={() => handlePromote(selectedUser._id)}
                disabled={status?.stats.total === 0}
              >
                <Award size={18} /> Promote to Volunteer
              </button>
            </header>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <Target size={20} />
                <div className={styles.statInfo}>
                  <label>Attendance Threshold</label>
                  <strong>{selectedUser.probationMetadata?.threshold}%</strong>
                </div>
              </div>
              <div className={styles.statCard}>
                <TrendingUp size={20} />
                <div className={styles.statInfo}>
                  <label>Current Attendance</label>
                  <strong>
                    {status ? Math.round((status.stats.present / (status.stats.total || 1)) * 100) : 0}%
                  </strong>
                </div>
              </div>
              <div className={styles.statCard}>
                <MessageSquare size={20} />
                <div className={styles.statInfo}>
                  <label>Total Remarks</label>
                  <strong>{status?.remarks.length || 0}</strong>
                </div>
              </div>
            </div>

            <div className={styles.remarkSection}>
              <div className={styles.addRemark}>
                <textarea 
                  placeholder="Add a remark on their service..." 
                  value={remarkContent}
                  onChange={e => setRemarkContent(e.target.value)}
                />
                <div className={styles.remarkControls}>
                  <select 
                    value={remarkSentiment} 
                    onChange={e => setRemarkSentiment(e.target.value as any)}
                  >
                    <option value="Good">Good (Green)</option>
                    <option value="Fair">Fair (Yellow)</option>
                    <option value="Concern">Concern (Red)</option>
                  </select>
                  <button onClick={handleAddRemark}>Post Remark</button>
                </div>
              </div>

              <div className={styles.remarksList}>
                {status?.remarks.map(remark => (
                  <div key={remark._id} className={`${styles.remarkItem} ${styles[remark.sentiment.toLowerCase()]}`}>
                    <div className={styles.remarkHeader}>
                      <span className={styles.sentimentBadge}>{remark.sentiment}</span>
                      <span className={styles.remarkTime}>{format(remark.timestamp, 'MMM dd, HH:mm')}</span>
                    </div>
                    <p>{remark.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <Award size={48} />
            <h2>Probation Monitoring Quest</h2>
            <p>Select a volunteer from the sidebar to monitor their progress, add remarks, and approve their promotion.</p>
          </div>
        )}
      </div>
    </div>
  );
};
