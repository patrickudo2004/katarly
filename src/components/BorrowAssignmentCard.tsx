import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { CheckCircle, XCircle, Calendar, Briefcase, Loader2, ArrowRightLeft } from 'lucide-react';
import styles from './BorrowAssignmentCard.module.css';

export const BorrowAssignmentCard: React.FC = () => {
  const assignments = useQuery(api.borrow.getMyBorrowAssignments);
  const respondToAssignment = useMutation(api.borrow.respondToAssignment);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { type: 'success' | 'error'; msg: string }>>({});
  const [declineReason, setDeclineReason] = useState<Record<string, string>>({});
  const [showDecline, setShowDecline] = useState<Record<string, boolean>>({});

  if (assignments === undefined) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} size={18} />
        <span>Loading assignments…</span>
      </div>
    );
  }

  if (assignments.length === 0) return null;

  const handleRespond = async (assignmentId: Id<'borrowAssignments'>, accept: boolean) => {
    setLoadingId(assignmentId);
    try {
      await respondToAssignment({
        assignmentId,
        accept,
        reason: accept ? undefined : declineReason[assignmentId],
      });
      setFeedback((f) => ({
        ...f,
        [assignmentId]: {
          type: 'success',
          msg: accept
            ? 'You accepted the assignment! Your scope has been expanded.'
            : 'You declined the assignment.',
        },
      }));
    } catch (e: any) {
      setFeedback((f) => ({
        ...f,
        [assignmentId]: { type: 'error', msg: e?.message ?? 'Something went wrong.' },
      }));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <h4 className={styles.sectionTitle}>
        <ArrowRightLeft size={16} />
        Borrow Assignments ({assignments.length})
      </h4>

      {assignments.map((a: any) => {
        const fb = feedback[a._id];
        const isLoading = loadingId === a._id;

        return (
          <div key={a._id} className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.iconBox}>
                <ArrowRightLeft size={18} />
              </div>
              <div className={styles.info}>
                <p className={styles.title}>
                  Help Request from{' '}
                  <strong>
                    {a.request?.requestingDeptName ?? a.targetDept?.name ?? 'another team'}
                  </strong>
                </p>
                <div className={styles.meta}>
                  <span><Briefcase size={12} /> {a.request?.role ?? 'Role TBD'}</span>
                  <span>
                    <Calendar size={12} />
                    {new Date(a.startDate).toLocaleDateString()} – {new Date(a.endDate).toLocaleDateString()}
                  </span>
                </div>
                {a.request?.note && (
                  <p className={styles.note}>"{a.request.note}"</p>
                )}
              </div>
            </div>

            {fb ? (
              <div className={`${styles.feedback} ${fb.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}`}>
                {fb.msg}
              </div>
            ) : (
              <>
                {showDecline[a._id] && (
                  <div className={styles.declineRow}>
                    <input
                      type="text"
                      placeholder="Reason for declining (optional)"
                      value={declineReason[a._id] ?? ''}
                      onChange={(e) => setDeclineReason((d) => ({ ...d, [a._id]: e.target.value }))}
                      className={styles.declineInput}
                    />
                  </div>
                )}
                <div className={styles.actions}>
                  <button
                    className={styles.declineBtn}
                    disabled={isLoading}
                    onClick={() => {
                      if (showDecline[a._id]) {
                        handleRespond(a._id, false);
                      } else {
                        setShowDecline((s) => ({ ...s, [a._id]: true }));
                      }
                    }}
                  >
                    {isLoading ? <Loader2 className={styles.spinner} size={14} /> : <XCircle size={15} />}
                    {showDecline[a._id] ? 'Confirm Decline' : 'Decline'}
                  </button>
                  <button
                    className={styles.acceptBtn}
                    disabled={isLoading}
                    onClick={() => handleRespond(a._id, true)}
                  >
                    {isLoading ? <Loader2 className={styles.spinner} size={14} /> : <CheckCircle size={15} />}
                    Accept
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
