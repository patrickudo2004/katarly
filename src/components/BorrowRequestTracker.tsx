import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  Clock, CheckCircle, XCircle, Calendar, Briefcase,
  Loader2, Trash2, ChevronDown, ChevronUp, AlertCircle, RefreshCw
} from 'lucide-react';
import styles from './BorrowRequestTracker.module.css';

export const BorrowRequestTracker: React.FC = () => {
  const outgoing = useQuery(api.borrow.getOutgoingBorrowRequests);
  const cancelBorrowRequest = useMutation(api.borrow.cancelBorrowRequest);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (outgoing === undefined) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} size={20} />
        <span>Loading sent requests…</span>
      </div>
    );
  }

  if (outgoing.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Clock size={32} />
        <p>No help requests sent from your team.</p>
      </div>
    );
  }

  const handleCancel = async (e: React.MouseEvent, requestId: Id<'borrowRequests'>) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to cancel this borrow request?")) return;

    setCancelingId(requestId);
    setError(null);
    try {
      await cancelBorrowRequest({ requestId });
    } catch (err: any) {
      setError(err?.message ?? "Failed to cancel request.");
    } finally {
      setCancelingId(null);
    }
  };

  const statusLabels: Record<string, string> = {
    pending: 'Awaiting Lead Approval',
    approved: 'Approved (Pending Volunteers)',
    declined: 'Declined by Lead',
    expired: 'Expired / Cancelled',
  };

  const getVolunteerStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className={`${styles.volBadge} ${styles.volActive}`}>Confirmed</span>;
      case 'declined':
        return <span className={`${styles.volBadge} ${styles.volDeclined}`}>Declined</span>;
      case 'expired':
        return <span className={`${styles.volBadge} ${styles.volExpired}`}>Expired</span>;
      default:
        return <span className={`${styles.volBadge} ${styles.volPending}`}>Pending Accept</span>;
    }
  };

  return (
    <div className={styles.container}>
      <h4 className={styles.sectionTitle}>
        <RefreshCw size={16} />
        Sent Requests ({outgoing.length})
      </h4>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.list}>
        {outgoing.map((req: any) => {
          const isExpanded = expandedId === req._id;
          const isCanceling = cancelingId === req._id;
          const hasVolunteers = req.assignments && req.assignments.length > 0;
          
          // Calculate overall volunteer confirmation status
          const acceptedCount = req.assignments?.filter((a: any) => a.status === 'active').length || 0;
          const totalVolunteers = req.assignments?.length || 0;

          return (
            <div key={req._id} className={styles.card}>
              {/* Header */}
              <div 
                className={styles.cardHeader} 
                onClick={() => setExpandedId(isExpanded ? null : req._id)}
              >
                <div className={styles.row}>
                  <span className={`${styles.statusBadge} ${styles[req.status]}`}>
                    {statusLabels[req.status] || req.status}
                  </span>
                  {req.status === 'approved' && totalVolunteers > 0 && (
                    <span className={styles.countBadge}>
                      {acceptedCount}/{totalVolunteers} Confirmed
                    </span>
                  )}
                </div>

                <div className={styles.requestSummary}>
                  <span>To <strong>{req.targetDeptName}{req.targetSubunitName ? ` › ${req.targetSubunitName}` : ''}</strong></span>
                  <span className={styles.roleLabel}>
                    <Briefcase size={12} />
                    Requested: <strong>{req.count} × {req.role}</strong>
                  </span>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.dateRow}>
                    <Calendar size={13} />
                    {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                  </span>
                  
                  <div className={styles.headerRight}>
                    {req.status === 'pending' && (
                      <button 
                        className={styles.cancelBtn} 
                        onClick={(e) => handleCancel(e, req._id)}
                        disabled={isCanceling}
                        title="Cancel Pending Request"
                      >
                        {isCanceling ? <Loader2 className={styles.spinner} size={13} /> : <Trash2 size={13} />}
                        Cancel
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className={styles.cardBody}>
                  {req.note && (
                    <div className={styles.noteBlock}>
                      <span className={styles.label}>Requester's Note:</span>
                      <p className={styles.noteContent}>"{req.note}"</p>
                    </div>
                  )}

                  {req.targetVolunteerId && (
                    <div className={styles.targetedBlock}>
                      <span className={styles.label}>Targeted Volunteer:</span>
                      <p className={styles.volunteerDetails}>
                        <strong>{req.targetVolunteerName || 'Nominated Volunteer'}</strong> ({req.targetVolunteerEmail || ''})
                      </p>
                    </div>
                  )}

                  {/* Nominated Volunteers List */}
                  {req.status === 'approved' && (
                    <div className={styles.volunteersSection}>
                      <h5 className={styles.volSectionTitle}>Nominated Volunteers & Confirmation Status</h5>
                      {!hasVolunteers ? (
                        <p className={styles.noVolunteersHint}>No volunteers have been nominated yet by the target team lead.</p>
                      ) : (
                        <div className={styles.volList}>
                          {req.assignments.map((assignment: any) => (
                            <div key={assignment._id} className={styles.volItem}>
                              <div className={styles.volInfo}>
                                <span className={styles.volName}>{assignment.userName}</span>
                                <span className={styles.volEmail}>{assignment.userEmail}</span>
                              </div>
                              {getVolunteerStatusBadge(assignment.status)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {req.status === 'declined' && (
                    <div className={styles.declinedSection}>
                      <AlertCircle className={styles.alertIcon} size={16} />
                      <p>This request was declined. Please coordinate with the target department head to address coverage gaps.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
