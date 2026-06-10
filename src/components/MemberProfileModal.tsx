import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  MessageSquare, 
  Calendar, 
  Flame, 
  Clock, 
  Coins, 
  AlertCircle, 
  Shuffle, 
  Sparkles, 
  Lock, 
  Send,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { BadgeDisplay } from './BadgeDisplay';
import styles from './MemberProfileModal.module.css';

interface MemberProfileModalProps {
  userId: any;
  onClose: () => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({ userId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'growth'>('overview');
  
  // Queries
  const user = useQuery(api.users.getById, { userId });
  const currentUser = useQuery(api.users.me);
  
  const stats = useQuery(api.recognition.getUserStats, { userId });
  const badges = useQuery(api.recognition.getUserBadges, { userId });
  
  // Growth Track queries (only used if user has role "Probation")
  const probationReport = useQuery(api.probation.getProbationReport, { userId });
  const departments = useQuery(api.departments.getDepartments);
  const subunits = useQuery(api.subunits.getSubunits);

  // Mutations
  const addRemark = useMutation(api.probation.addRemark);
  const logKPI = useMutation(api.probation.logKPIForUser);
  const rotateSubunit = useMutation(api.probation.rotateProbationSubunit);
  const graduateProbationer = useMutation(api.probation.graduateProbationer);

  // Form States
  const [remarkContent, setRemarkContent] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [remarkSentiment, setRemarkSentiment] = useState<'Good' | 'Fair' | 'Concern'>('Good');
  
  const [kpiScore, setKpiScore] = useState<'Excellent' | 'Good' | 'Needs Improvement' | 'Disapprove'>('Good');
  const [kpiNote, setKpiNote] = useState('');
  
  const [targetSubunitId, setTargetSubunitId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKpiForm, setShowKpiForm] = useState(false);

  if (!user || !currentUser) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalContent} style={{ justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <div className={styles.loadingSpinner}>Loading member details...</div>
          </div>
        </div>
      </div>
    );
  }

  const isSelf = currentUser._id === userId;
  const isLeader = ['SuperAdmin', 'DeaconHead', 'PastoralOversight', 'DepartmentHead', 'SubunitLead'].includes(currentUser.role || '');
  const isProbationer = user.role === 'Probation';

  // Find department & subunit names
  const userDept = departments?.find((d) => d._id === user.departmentId)?.name || 'None';
  const userSubunit = subunits?.find((s) => s._id === user.subunitId)?.name || 'None';

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkContent.trim()) return;

    setIsSubmitting(true);
    try {
      await addRemark({
        userId,
        content: remarkContent,
        privateNote: privateNote.trim() ? privateNote : undefined,
        sentiment: remarkSentiment,
      });
      setRemarkContent('');
      setPrivateNote('');
      setRemarkSentiment('Good');
    } catch (error: any) {
      alert(error.message || 'Failed to add remark');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await logKPI({
        userId,
        score: kpiScore,
        note: kpiNote.trim() ? kpiNote : undefined,
      });
      setKpiNote('');
      setKpiScore('Good');
      setShowKpiForm(false);
    } catch (error: any) {
      alert(error.message || 'Failed to log KPI');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRotate = async () => {
    if (!targetSubunitId) return;
    const selectedSub = subunits?.find(s => s._id === targetSubunitId);
    if (!selectedSub) return;

    if (!confirm(`Are you sure you want to rotate ${user.name} to the ${selectedSub.name} subunit?`)) return;

    setIsSubmitting(true);
    try {
      await rotateSubunit({
        userId,
        targetSubunitId: targetSubunitId as any,
        targetDeptId: selectedSub.departmentId,
      });
      setTargetSubunitId('');
      alert('Rotation completed successfully.');
    } catch (error: any) {
      alert(error.message || 'Failed to rotate subunit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGraduate = async (targetRole: 'Volunteer' | 'SubunitLead' | 'DepartmentHead') => {
    if (!confirm(`Graduate ${user.name} and restore their role to ${targetRole}?`)) return;

    setIsSubmitting(true);
    try {
      await graduateProbationer({
        userId,
        role: targetRole,
      });
      alert('Graduation completed! Volunteer is now restored.');
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to graduate volunteer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <header className={styles.modalHeader}>
          <div className={styles.profileSummary}>
            <div className={styles.avatar}>
              {user.imageUrl ? (
                <img src={user.imageUrl} alt={user.name} />
              ) : (
                user.name?.[0] || 'U'
              )}
            </div>
            <div className={styles.nameInfo}>
              <h2>
                {user.name}
                {isProbationer && (
                  <span className={styles.statusBadge}>Growth Track</span>
                )}
              </h2>
              <p>{user.role} • Dept: {userDept} • Subunit: {userSubunit}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {/* Tabs */}
        {isProbationer && (
          <nav className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'growth' ? styles.active : ''}`}
              onClick={() => setActiveTab('growth')}
            >
              Growth Track
            </button>
          </nav>
        )}

        {/* Content Area */}
        <div className={styles.modalContent}>
          {activeTab === 'overview' ? (
            <>
              {/* Contact Details & Info Grid */}
              <div className={styles.infoGrid}>
                {user.email && (
                  <div className={styles.infoCard}>
                    <Mail size={18} className={styles.infoIcon} />
                    <div className={styles.infoMeta}>
                      <label>Email Address</label>
                      <span>{user.email}</span>
                    </div>
                  </div>
                )}
                {user.phone && (
                  <div className={styles.infoCard}>
                    <Phone size={18} className={styles.infoIcon} />
                    <div className={styles.infoMeta}>
                      <label>Phone Number</label>
                      <span>{user.phone}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Rota Stats / Flame Streak */}
              {stats && (
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <Flame className={styles.streakIcon} size={24} />
                    <strong>{stats.streak || 0}</strong>
                    <label>Serving Streak</label>
                  </div>
                  <div className={styles.statCard}>
                    <Calendar className={styles.servicesIcon} size={24} />
                    <strong>{stats.totalServices || 0}</strong>
                    <label>Total Services</label>
                  </div>
                  <div className={styles.statCard}>
                    <Clock className={styles.hoursIcon} size={24} />
                    <strong>{stats.totalHours || 0}</strong>
                    <label>Total Hours</label>
                  </div>
                </div>
              )}

              {/* Badges Achievements */}
              {badges && (
                <section className={styles.badgesSection}>
                  <h4 className={styles.sectionTitle}>Badges & Achievements</h4>
                  {badges.length === 0 ? (
                    <p className={styles.emptyText}>No achievements unlocked yet. Keep serving!</p>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                      {badges.map((ub: any) => (
                        <BadgeDisplay key={ub._id} badge={ub.badge} />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          ) : (
            /* Growth Track Tab */
            <>
              {probationReport ? (
                <>
                  {/* Milestones and Progress */}
                  <div className={styles.restorationHeader}>
                    <div className={styles.statusLabel}>
                      <h4>Restorative Milestone Tracker</h4>
                      <span>
                        Goal Target:{' '}
                        {probationReport.probation.endDate
                          ? format(probationReport.probation.endDate, 'MMM dd, yyyy')
                          : 'Ongoing'}
                      </span>
                    </div>
                    <span className={styles.statusBadge}>
                      {probationReport.probation.status}
                    </span>
                  </div>

                  {/* Attendance & KPI score stats */}
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <strong>
                        {Math.round(probationReport.stats.attendanceRate * 100)}%
                      </strong>
                      <label>Attendance (Target {user.probationMetadata?.threshold}%)</label>
                    </div>
                    <div className={styles.statCard}>
                      <strong>
                        {probationReport.stats.avgScore
                          ? probationReport.stats.avgScore.toFixed(1)
                          : '0.0'}{' '}
                        / 4.0
                      </strong>
                      <label>Average KPI Rating</label>
                    </div>
                    <div className={styles.statCard}>
                      <strong>{probationReport.stats.totalLogs}</strong>
                      <label>Weekly Appraisals</label>
                    </div>
                  </div>

                  {/* Progress bar towards completion */}
                  <div className={styles.progressWrapper}>
                    <div className={styles.progressHeader}>
                      <span>Restoration Progress</span>
                      <span>
                        {probationReport.stats.totalLogs} logged /{' '}
                        {user.probationMetadata?.targetServiceCount || 6} required
                      </span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill} 
                        style={{ 
                          width: `${Math.min(
                            100, 
                            (probationReport.stats.totalLogs / 
                              (user.probationMetadata?.targetServiceCount || 6)) * 100
                          )}%` 
                        }} 
                      />
                    </div>
                  </div>

                  {/* Cross-Subunit Rotation Management (Visible only to leaders) */}
                  {isLeader && subunits && subunits.length > 0 && (
                    <section className={styles.rotationSection}>
                      <div className={styles.rotationHeader}>
                        <h4>Cross-Subunit Serving Rotation</h4>
                        <Shuffle size={16} style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className={styles.rotationRow}>
                        <select
                          value={targetSubunitId}
                          onChange={(e) => setTargetSubunitId(e.target.value)}
                        >
                          <option value="">Select serving subunit rotation...</option>
                          {subunits.map((sub: any) => (
                            <option key={sub._id} value={sub._id}>
                              {sub.departmentName} - {sub.name}
                            </option>
                          ))}
                        </select>
                        <button 
                          onClick={handleRotate} 
                          disabled={!targetSubunitId || isSubmitting}
                        >
                          Rotate Stage
                        </button>
                      </div>
                    </section>
                  )}

                  {/* KPI Weekly Appraisals Logs (Leadership view logs, Probationer sees limited dashboard) */}
                  {isLeader && (
                    <section className={styles.remarksContainer}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 className={styles.sectionTitle}>Weekly KPI Logs</h4>
                        <button 
                          className={styles.extendBtn}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => setShowKpiForm(!showKpiForm)}
                        >
                          {showKpiForm ? 'Cancel' : 'Log Weekly KPI'}
                        </button>
                      </div>

                      {showKpiForm && (
                        <form onSubmit={handleLogKPI} className={styles.addRemarkBox}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Performance:</label>
                            <select 
                              value={kpiScore} 
                              onChange={e => setKpiScore(e.target.value as any)}
                              className={styles.sentimentSelect}
                              style={{ flex: 1 }}
                            >
                              <option value="Excellent">Excellent</option>
                              <option value="Good">Good (Expected)</option>
                              <option value="Needs Improvement">Needs Improvement</option>
                              <option value="Disapprove">Disapprove (Extends 30 Days)</option>
                            </select>
                          </div>
                          <textarea
                            placeholder="Add evaluation details..."
                            value={kpiNote}
                            onChange={e => setKpiNote(e.target.value)}
                            rows={3}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                              type="submit" 
                              disabled={isSubmitting}
                              style={{
                                background: 'var(--accent)',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Submit appraisal
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Display recent KPIs */}
                      <div className={styles.remarksList} style={{ maxHeight: '200px' }}>
                        {probationReport.logs.map((log: any) => (
                          <div key={log._id} className={styles.remarkItem}>
                            <div className={styles.remarkHeader}>
                              <span className={styles.sentimentBadge} style={{
                                backgroundColor: log.score === 'Excellent' ? 'rgba(16,185,129,0.1)' : log.score === 'Good' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                                color: log.score === 'Excellent' ? '#10b981' : log.score === 'Good' ? '#3b82f6' : '#ef4444'
                              }}>
                                {log.score}
                              </span>
                              <span className={styles.remarkTime}>
                                {log.subunitName} • {format(log.date, 'MMM dd, yyyy')}
                              </span>
                            </div>
                            {log.note && <p className={styles.remarkBody}>{log.note}</p>}
                          </div>
                        ))}
                        {probationReport.logs.length === 0 && (
                          <p className={styles.emptyText}>No weekly KPI logs submitted yet.</p>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Remarks - Public Encouraging Comments & Optional Private Evaluation Notes */}
                  <section className={styles.remarksContainer}>
                    <h4 className={styles.sectionTitle}>Restoration Journal & Remarks</h4>
                    
                    {/* Add Remark Form (Leaders only) */}
                    {isLeader && (
                      <form onSubmit={handleAddRemark} className={styles.addRemarkBox}>
                        <div className={styles.remarkControls}>
                          <select 
                            value={remarkSentiment} 
                            onChange={e => setRemarkSentiment(e.target.value as any)}
                          >
                            <option value="Good">Encouraging (Good)</option>
                            <option value="Fair">Fair (Needs Focus)</option>
                            <option value="Concern">Concern (Warning)</option>
                          </select>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Logged by: {currentUser.name}
                          </span>
                        </div>
                        
                        <textarea
                          placeholder="Write encouraging public comment... (visible to the volunteer)"
                          value={remarkContent}
                          onChange={e => setRemarkContent(e.target.value)}
                          rows={2}
                          required
                        />
                        
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Add confidential leader note... (strictly hidden from volunteer)"
                            value={privateNote}
                            onChange={e => setPrivateNote(e.target.value)}
                          />
                          <Lock size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button type="submit" disabled={isSubmitting || !remarkContent.trim()}>
                            <Send size={14} style={{ marginRight: '6px' }} /> Post Journal Entry
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Remarks Feed */}
                    <div className={styles.remarksList}>
                      {probationReport.remarks.map((remark: any) => (
                        <div 
                          key={remark._id} 
                          className={`${styles.remarkItem} ${
                            remark.sentiment === 'Good' 
                              ? styles.good 
                              : remark.sentiment === 'Fair' 
                              ? styles.fair 
                              : styles.concern
                          }`}
                        >
                          <div className={styles.remarkHeader}>
                            <span className={styles.sentimentBadge}>{remark.sentiment}</span>
                            <span className={styles.remarkTime}>
                              {format(remark.timestamp, 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          
                          <p className={styles.remarkBody}>{remark.content}</p>
                          
                          {/* Private Remarks (Only visible if viewer is leader AND privateNote is populated) */}
                          {isLeader && remark.privateNote && (
                            <div className={styles.privateRemarkBox}>
                              <strong>
                                <Lock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                Leadership Confidential:
                              </strong>{' '}
                              {remark.privateNote}
                            </div>
                          )}
                        </div>
                      ))}
                      {probationReport.remarks.length === 0 && (
                        <p className={styles.emptyText}>No remarks logged yet.</p>
                      )}
                    </div>
                  </section>
                </>
              ) : (
                <div className={styles.loadingSpinner}>No active growth track reports.</div>
              )}
            </>
          )}
        </div>

        {/* Action Controls / Graduation footer (Only visible in Growth Track tab & for leadership roles) */}
        {activeTab === 'growth' && isLeader && (
          <footer className={styles.actionFooter}>
            <button 
              className={styles.extendBtn}
              onClick={() => handleGraduate('Volunteer')}
              disabled={isSubmitting}
            >
              Graduate as Volunteer
            </button>
            
            {/* SuperAdmin/DeaconHead can also graduate to other leadership roles if fitting */}
            {(currentUser.role === 'SuperAdmin' || currentUser.role === 'DeaconHead') && (
              <>
                <button 
                  className={styles.graduateBtn}
                  onClick={() => handleGraduate('SubunitLead')}
                  disabled={isSubmitting}
                  style={{ background: 'var(--accent)' }}
                >
                  <Sparkles size={16} /> Restore & Promote to Subunit Lead
                </button>
              </>
            )}
          </footer>
        )}
      </div>
    </div>
  );
};
