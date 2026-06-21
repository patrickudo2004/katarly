import React, { useState } from 'react';
import { BarChart3, Users, AlertCircle, ArrowRightLeft, ChevronRight, Loader2, ShieldAlert, MessageSquare, ClipboardList, Video, UserPlus } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useNavigate } from 'react-router-dom';
import { MeetingCard } from '../../components/MeetingCard';
import { BorrowAssignmentCard } from '../../components/BorrowAssignmentCard';
import { BorrowBottomSheet } from '../../components/BorrowBottomSheet';
import { format } from 'date-fns';
import styles from './mobile.module.css';
import { MobileAssignShiftModal } from '../../components/MobileAssignShiftModal';

export const DeptHeadHome: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Subunits');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const me = useQuery(api.users.me);
  const health = useQuery(api.oversight.getDepartmentHealth, 
    me?.departmentId ? { departmentId: me.departmentId } : "skip"
  );
  const subunits = useQuery(api.subunits.getSubunits);
  const church = useQuery(api.churches.getMyChurch);
  const pendingVerifications = useQuery(api.attendance.getPendingVerifications, 
    church ? { churchId: church._id } : "skip"
  );
  const meetings = useQuery(api.meetings.getMeetingsForUser);
  const incomingBorrowRequests = useQuery(api.borrow.getIncomingBorrowRequests);
  
  // Time off approvals
  const timeOffRequests = useQuery(api.timeOff.getRequests);
  const updateTimeOffStatus = useMutation(api.timeOff.updateRequestStatus);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Burnout alerts for reports
  const burnoutAlerts = useQuery(api.reports.getBurnoutAlerts,
    me?.departmentId ? { departmentId: me.departmentId } : "skip"
  );

  const [borrowSheet, setBorrowSheet] = useState<'approval' | 'request' | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Loading state
  const isMeLoading = me === undefined;
  const isSubunitsLoading = subunits === undefined;
  const isChurchLoading = church === undefined;

  if (isMeLoading || (me?.churchId && (isSubunitsLoading || isChurchLoading))) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  // Safe checks for arrays
  const safeSubunits = subunits || [];
  const safePendingVerifications = pendingVerifications || [];

  // Filter subunits for this department
  const mySubunits = safeSubunits.filter(s => s.departmentId === me.departmentId);

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

      {pendingVerifications === undefined ? (
        <div className={styles.skeleton} style={{ height: '80px', marginBottom: '1rem', width: '100%' }} />
      ) : safePendingVerifications.length > 0 ? (
        <div 
          className={styles.card} 
          style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6', marginBottom: '1rem' }}
          onClick={() => setActiveTab('Approvals')}
        >
          <div className={styles.sectionHeader}>
            <h3 style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} />
              {safePendingVerifications.length} Verification {safePendingVerifications.length === 1 ? 'Request' : 'Requests'}
            </h3>
            <ChevronRight size={20} color="#8b5cf6" />
          </div>
          <p className={styles.itemSubtitle}>Volunteers waiting for geofence approval</p>
        </div>
      ) : null}
      <div className={styles.grid}>
        <div className={styles.card + ' ' + styles.statCard}>
          {health === undefined ? (
            <div className={styles.skeleton} style={{ height: '24px', width: '60px', margin: '0 auto 4px' }} />
          ) : (
            <span className={styles.statValue}>{health?.attendanceRate ?? 0}%</span>
          )}
          <span className={styles.statLabel}>Avg Attendance</span>
        </div>
        <div className={styles.card + ' ' + styles.statCard}>
          {health === undefined ? (
            <div className={styles.skeleton} style={{ height: '24px', width: '60px', margin: '0 auto 4px' }} />
          ) : (
            <span className={styles.statValue}>{health?.activeProbations ?? 0}</span>
          )}
          <span className={styles.statLabel}>Active Probations</span>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/chat')}
            className={styles.actionBtnGrid}
          >
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <MessageSquare size={20} />
            </div>
            <span className={styles.actionBtnGridText}>Dept Chat</span>
          </button>
          
          <button 
            onClick={() => navigate('/attendance')}
            className={styles.actionBtnGrid}
          >
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ClipboardList size={20} />
            </div>
            <span className={styles.actionBtnGridText}>Attendance</span>
          </button>

          <button 
            onClick={() => navigate('/meetings?create=true')}
            className={styles.actionBtnRow}
          >
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Video size={20} />
            </div>
            <span className={styles.actionBtnRowText}>Schedule Department Meeting</span>
          </button>

          <button 
            onClick={() => setIsAssignModalOpen(true)}
            className={styles.actionBtnRow}
            style={{ border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.05)' }}
          >
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <UserPlus size={20} />
            </div>
            <span className={styles.actionBtnRowText}>Assign Team Shift</span>
          </button>

          <button
            onClick={() => {
              setSelectedRequestId(null);
              setBorrowSheet('request');
            }}
            className={styles.actionBtnRow}
            style={{ border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.06)' }}
          >
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <ArrowRightLeft size={20} />
            </div>
            <span className={styles.actionBtnRowText}>Request Team Help</span>
          </button>
        </div>
      </section>

      <div className={styles.tabs}>
        {['Subunits', 'Approvals', 'Reports'].map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Approvals' && (incomingBorrowRequests?.length ?? 0) > 0 && (
              <span style={{
                marginLeft: '6px',
                background: '#8b5cf6',
                color: 'white',
                borderRadius: '10px',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '1px 6px',
                lineHeight: '1.4',
              }}>
                {incomingBorrowRequests!.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <section className={styles.section}>
        {activeTab === 'Subunits' && (
          <div className={styles.list}>
            {mySubunits.length === 0 ? (
              <div className={styles.emptyState}>
                <Users size={32} className="mb-2 opacity-30" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>No Subunits Found</p>
                <p style={{ margin: 0, fontSize: '0.8125rem' }}>Subunits will appear here once they are added by a Deacon Head.</p>
              </div>
            ) : (
              mySubunits.map((unit) => (
                <div 
                  key={unit._id} 
                  className={styles.listItem}
                  onClick={() => navigate(`/subunit/${unit._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.itemIcon}>
                    <Users size={20} />
                  </div>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemTitle}>{unit.name}</p>
                    <p className={styles.itemSubtitle}>Lead: {unit.leadId ? 'Assigned' : 'Not Assigned'}</p>
                  </div>
                  <ChevronRight size={16} color="#9ca3af" />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'Approvals' && (
          <div className={styles.list}>
            {pendingVerifications === undefined ? (
              <div className="space-y-3 w-full">
                <div className={styles.skeleton} style={{ height: '72px', width: '100%' }} />
              </div>
            ) : safePendingVerifications.length > 0 ? (
              <div 
                className={styles.listItem} 
                onClick={() => navigate('/admin')}
                style={{ borderLeft: '4px solid #8b5cf6' }}
              >
                <div className={styles.itemIcon} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  <ShieldAlert size={20} />
                </div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemTitle}>Manual Verifications</p>
                  <p className={styles.itemSubtitle}>{safePendingVerifications.length} pending geofence overrides</p>
                </div>
                <ChevronRight size={16} color="#8b5cf6" />
              </div>
            ) : null}

            {/* Live borrow requests */}
            {incomingBorrowRequests === undefined ? (
              <div className="space-y-3 w-full">
                <div className={styles.skeleton} style={{ height: '72px', width: '100%' }} />
                <div className={styles.skeleton} style={{ height: '72px', width: '100%' }} />
              </div>
            ) : incomingBorrowRequests.length === 0 ? (
              <div className={styles.listItem} style={{ opacity: 0.6 }}>
                <div className={styles.itemInfo}>
                  <p className={styles.itemTitle}>No pending borrow requests</p>
                  <p className={styles.itemSubtitle}>Your team has no incoming requests right now</p>
                </div>
              </div>
            ) : (
              incomingBorrowRequests.map((req: any) => (
                <div
                  key={req._id}
                  className={styles.listItem}
                  onClick={() => {
                    setSelectedRequestId(req._id);
                    setBorrowSheet('approval');
                  }}
                  style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }}
                >
                  <div className={styles.itemIcon} style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                    <ArrowRightLeft size={20} />
                  </div>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemTitle}>
                      {req.requestingDeptName}
                      {req.requestingSubunitName ? ` › ${req.requestingSubunitName}` : ''}
                      {' '}needs {req.count} {req.role}(s)
                    </p>
                    <p className={styles.itemSubtitle}>
                      From {req.requesterName} · {new Date(req.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={styles.badge} style={{ background: '#fef9c3', color: '#854d0e' }}>
                    Pending
                  </div>
                </div>
              ))
            )}

            {/* Time off approvals */}
            {me?.departmentId && (
              <>
                <div className={styles.sectionHeader} style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
                  <h4 className={styles.sectionTitle}>Time Off Requests</h4>
                </div>
                {timeOffRequests === undefined ? (
                  <div className="space-y-3 w-full">
                    <div className={styles.skeleton} style={{ height: '72px', width: '100%' }} />
                  </div>
                ) : (timeOffRequests.filter(r => r.status === 'Pending' && r.departmentId === me.departmentId).length === 0) ? (
                  <div className={styles.listItem} style={{ opacity: 0.6 }}>
                    <div className={styles.itemInfo}>
                      <p className={styles.itemTitle}>No pending time-off requests</p>
                      <p className={styles.itemSubtitle}>All time-off requests for your department are reviewed</p>
                    </div>
                  </div>
                ) : (
                  timeOffRequests
                    .filter(r => r.status === 'Pending' && r.departmentId === me.departmentId)
                    .map((req) => (
                      <div key={req._id} className={styles.listItem} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyItems: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                          <div className={styles.itemInfo}>
                            <p className={styles.itemTitle}>{req.userName}</p>
                            <p className={styles.itemSubtitle}>
                              {format(req.startDate, 'MMM d')} – {format(req.endDate, 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1" style={{ fontStyle: 'italic' }}>Reason: "{req.reason}"</p>
                          </div>
                          <div className={styles.badge} style={{ background: '#fef9c3', color: '#a16207' }}>
                            Pending
                          </div>
                        </div>
                        
                        {rejectingRequestId === req._id ? (
                          <div className="mt-2 space-y-2 w-100">
                            <input 
                              type="text" 
                              placeholder="Reason for rejection (optional)..." 
                              value={rejectionReasonText}
                              onChange={(e) => setRejectionReasonText(e.target.value)}
                              className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 transition-colors"
                            />
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => {
                                  setRejectingRequestId(null);
                                  setRejectionReasonText('');
                                }}
                                className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-lg font-semibold"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={async () => {
                                  await updateTimeOffStatus({ id: req._id, status: 'Rejected', rejectionReason: rejectionReasonText });
                                  setRejectingRequestId(null);
                                  setRejectionReasonText('');
                                }}
                                className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg font-semibold active:scale-95 transition-all"
                              >
                                Confirm Reject
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end mt-2 w-100" style={{ width: '100%' }}>
                            <button 
                              onClick={() => setRejectingRequestId(req._id)}
                              className="px-4 py-2 text-xs bg-red-50 text-red-600 rounded-xl font-bold active:scale-95 transition-all"
                            >
                              Reject
                            </button>
                            <button 
                              onClick={async () => {
                                await updateTimeOffStatus({ id: req._id, status: 'Approved' });
                              }}
                              className="px-4 py-2 text-xs bg-green-600 text-white rounded-xl font-bold active:scale-95 transition-all"
                            >
                              Approve
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </>
            )}

            {/* Volunteer's own pending assignments */}
            <BorrowAssignmentCard />
          </div>
        )}

        {activeTab === 'Reports' && (
          <div className="space-y-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className={styles.grid}>
              <div className={styles.card + ' ' + styles.statCard}>
                <span className={styles.statValue} style={{ color: '#15803d' }}>{health?.attendanceRate ?? 0}%</span>
                <span className={styles.statLabel}>Avg Attendance</span>
              </div>
              <div className={styles.card + ' ' + styles.statCard}>
                <span className={styles.statValue}>{health?.volunteerCount ?? 0}</span>
                <span className={styles.statLabel}>Total Team</span>
              </div>
              <div className={styles.card + ' ' + styles.statCard}>
                <span className={styles.statValue} style={{ color: '#d97706' }}>{health?.activeProbations ?? 0}</span>
                <span className={styles.statLabel}>Active Probations</span>
              </div>
              <div className={styles.card + ' ' + styles.statCard}>
                <span className={styles.statValue} style={{ color: '#ef4444' }}>{health?.lowKpis ?? 0}</span>
                <span className={styles.statLabel}>Low KPIs</span>
              </div>
            </div>

            <div className={styles.sectionHeader} style={{ marginTop: '0.5rem' }}>
              <h2 className={styles.sectionTitle}>Burnout & Wellness Warnings</h2>
            </div>
            
            <div className={styles.list}>
              {burnoutAlerts === undefined ? (
                <div className="space-y-3 w-full">
                  <div className={styles.skeleton} style={{ height: '72px', width: '100%' }} />
                  <div className={styles.skeleton} style={{ height: '72px', width: '100%' }} />
                </div>
              ) : burnoutAlerts.length === 0 ? (
                <div className={styles.emptyState}>
                  All volunteers are well within safe serving limits.
                </div>
              ) : (
                burnoutAlerts.map((alert: any) => (
                  <div 
                    key={alert.userId} 
                    className={styles.listItem}
                    style={{ borderLeft: alert.riskLevel === 'high' ? '4px solid #ef4444' : '4px solid #f59e0b' }}
                  >
                    <div className={styles.itemInfo}>
                      <p className={styles.itemTitle}>{alert.name}</p>
                      <p className={styles.itemSubtitle}>
                        {alert.subunitName} · {alert.reasons.join(', ')}
                      </p>
                    </div>
                    <div 
                      className={styles.badge} 
                      style={{ 
                        background: alert.riskLevel === 'high' ? '#fee2e2' : '#fef3c7', 
                        color: alert.riskLevel === 'high' ? '#991b1b' : '#92400e',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {alert.riskLevel} risk
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>
      <MobileAssignShiftModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />

      {/* Borrow bottom sheet — opens when tapping a request card or the Request Help action */}
      {borrowSheet && (
        <BorrowBottomSheet
          isOpen
          mode={borrowSheet}
          selectedRequestId={selectedRequestId}
          onClose={() => {
            setBorrowSheet(null);
            setSelectedRequestId(null);
          }}
        />
      )}
    </div>
  );
};
