import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  CheckCircle, XCircle, Users, Calendar, Briefcase,
  Loader2, ArrowRightLeft, Layers, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import styles from './BorrowApprovalPanel.module.css';

interface BorrowApprovalPanelProps {
  initialRequestId?: string | null;
}

export const BorrowApprovalPanel: React.FC<BorrowApprovalPanelProps> = ({ initialRequestId }) => {
  const incoming = useQuery(api.borrow.getIncomingBorrowRequests);
  const approveBorrow = useMutation(api.borrow.approveBorrow);
  const declineBorrow = useMutation(api.borrow.declineBorrow);

  const [expandedId, setExpandedId] = useState<string | null>(initialRequestId || null);
  const [selectedVolunteers, setSelectedVolunteers] = useState<Record<string, Id<'users'>[]>>({});
  const [declineReason, setDeclineReason] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { type: 'success' | 'error'; msg: string }>>({});

  React.useEffect(() => {
    if (incoming) {
      const prefilled: Record<string, Id<'users'>[]> = {};
      incoming.forEach((req: any) => {
        if (req.targetVolunteerId && req.status === 'pending') {
          prefilled[req._id] = [req.targetVolunteerId];
        }
      });
      setSelectedVolunteers((prev) => ({ ...prefilled, ...prev }));
    }
  }, [incoming]);

  if (incoming === undefined) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} size={20} />
        <span>Loading incoming requests…</span>
      </div>
    );
  }

  if (incoming.length === 0) {
    return (
      <div className={styles.emptyState}>
        <CheckCircle size={32} />
        <p>No pending requests for your team.</p>
      </div>
    );
  }

  const handleApprove = async (requestId: Id<'borrowRequests'>) => {
    const vIds = selectedVolunteers[requestId] ?? [];
    if (vIds.length === 0) {
      setFeedback((f) => ({ ...f, [requestId]: { type: 'error', msg: 'Please select at least one volunteer before approving.' } }));
      return;
    }
    setLoadingId(requestId);
    try {
      await approveBorrow({ requestId, volunteerIds: vIds });
      setFeedback((f) => ({ ...f, [requestId]: { type: 'success', msg: 'Request approved! Volunteers have been notified.' } }));
    } catch (e: any) {
      setFeedback((f) => ({ ...f, [requestId]: { type: 'error', msg: e?.message ?? 'Failed to approve.' } }));
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (requestId: Id<'borrowRequests'>) => {
    setLoadingId(requestId);
    try {
      await declineBorrow({ requestId, reason: declineReason[requestId] });
      setFeedback((f) => ({ ...f, [requestId]: { type: 'success', msg: 'Request declined.' } }));
    } catch (e: any) {
      setFeedback((f) => ({ ...f, [requestId]: { type: 'error', msg: e?.message ?? 'Failed to decline.' } }));
    } finally {
      setLoadingId(null);
    }
  };

  const toggleVolunteer = (requestId: string, vId: Id<'users'>) => {
    setSelectedVolunteers((prev) => {
      const current = prev[requestId] ?? [];
      const exists = current.includes(vId);
      return {
        ...prev,
        [requestId]: exists ? current.filter((id) => id !== vId) : [...current, vId],
      };
    });
  };

  return (
    <div className={styles.container}>
      <h4 className={styles.sectionTitle}>
        <ArrowRightLeft size={16} />
        Incoming Requests ({incoming.length})
      </h4>

      <div className={styles.list}>
        {incoming.map((req: any) => {
          const isExpanded = expandedId === req._id;
          const fb = feedback[req._id];
          const isLoading = loadingId === req._id;

          return (
            <div key={req._id} className={styles.card}>
              {/* Card Header */}
              <div className={styles.cardHeader} onClick={() => setExpandedId(isExpanded ? null : req._id)}>
                <div className={styles.badgeRow}>
                  <span className={`${styles.typeBadge} ${req.borrowType === 'intra_dept' ? styles.intra : styles.inter}`}>
                    {req.borrowType === 'intra_dept' ? <Layers size={12} /> : <ArrowRightLeft size={12} />}
                    {req.borrowType === 'intra_dept' ? 'Within Dept' : 'Inter-Dept'}
                  </span>
                  <span className={styles.pendingBadge}>Pending</span>
                </div>
                <div className={styles.requestSummary}>
                  <strong>{req.requesterName}</strong>
                  <span className={styles.from}>
                    from <em>{req.requestingDeptName}{req.requestingSubunitName ? ` › ${req.requestingSubunitName}` : ''}</em>
                  </span>
                  <span className={styles.wants}>
                    needs <strong>{req.count} × {req.role}</strong>
                  </span>
                </div>
                <div className={styles.dateRow}>
                  <Calendar size={13} />
                  {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {/* Expanded body */}
              {isExpanded && (
                <div className={styles.cardBody}>
                  {req.note && (
                    <div className={styles.noteBox}>
                      <FileText size={13} />
                      <p>{req.note}</p>
                    </div>
                  )}

                  {req.targetVolunteerId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.875rem', backgroundColor: 'var(--card-bg-hover)', border: '1px dashed var(--border-color)', borderRadius: '8px', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Targeted Rota Assignment:
                      </span>
                      <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {req.targetVolunteerName || 'Unknown volunteer'}
                      </strong>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {req.targetVolunteerEmail || ''}
                      </span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        💡 This request specifically targets this individual. Approving will directly assign them.
                      </p>
                    </div>
                  ) : (
                    <VolunteerPicker
                      deptId={req.targetDeptId}
                      subunitId={req.targetSubunitId}
                      startDate={req.startDate}
                      endDate={req.endDate}
                      selected={selectedVolunteers[req._id] ?? []}
                      onToggle={(vId) => toggleVolunteer(req._id, vId)}
                      max={req.count}
                    />
                  )}

                  <div className={styles.declineField}>
                    <label>Decline reason (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Not enough available volunteers right now"
                      value={declineReason[req._id] ?? ''}
                      onChange={(e) =>
                        setDeclineReason((d) => ({ ...d, [req._id]: e.target.value }))
                      }
                    />
                  </div>

                  {fb && (
                    <div className={`${styles.feedback} ${fb.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}`}>
                      {fb.msg}
                    </div>
                  )}

                  <div className={styles.actions}>
                    <button
                      className={styles.declineBtn}
                      onClick={() => handleDecline(req._id)}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className={styles.spinner} size={14} /> : <XCircle size={16} />}
                      Decline
                    </button>
                    <button
                      className={styles.approveBtn}
                      onClick={() => handleApprove(req._id)}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className={styles.spinner} size={14} /> : <CheckCircle size={16} />}
                      Approve ({(selectedVolunteers[req._id] ?? []).length}/{req.count})
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Volunteer Picker Sub-Component ──────────────────────────────────────────
interface PickerProps {
  deptId: Id<'departments'>;
  subunitId?: Id<'subunits'>;
  startDate: number;
  endDate: number;
  selected: Id<'users'>[];
  onToggle: (id: Id<'users'>) => void;
  max: number;
}

const VolunteerPicker: React.FC<PickerProps> = ({ deptId, subunitId, startDate, endDate, selected, onToggle, max }) => {
  const [search, setSearch] = useState('');
  const volunteers = useQuery(api.borrow.getAvailableVolunteers, { deptId, subunitId, startDate, endDate });

  if (volunteers === undefined) {
    return <div className={styles.pickerLoading}><Loader2 className={styles.spinner} size={16} /> Loading volunteers…</div>;
  }

  const filtered = volunteers.filter((v: any) =>
    !search || (v.name ?? v.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.picker}>
      <label className={styles.pickerLabel}>
        <Users size={14} />
        Select Volunteers to Send ({selected.length}/{max} max)
      </label>
      <input
        type="text"
        className={styles.pickerSearch}
        placeholder="Search volunteers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {filtered.length === 0 ? (
        <p className={styles.pickerEmpty}>No available volunteers found for this period.</p>
      ) : (
        <div className={styles.pickerList}>
          {filtered.map((v: any) => {
            const isSelected = selected.includes(v._id);
            const isDisabled = !isSelected && selected.length >= max;
            return (
              <label
                key={v._id}
                className={`${styles.pickerItem} ${isSelected ? styles.pickerSelected : ''} ${isDisabled ? styles.pickerDisabled : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => onToggle(v._id)}
                />
                <div className={styles.pickerInfo}>
                  <span className={styles.pickerName}>{v.name ?? 'Unknown'}</span>
                  <span className={styles.pickerRole}>{v.role}</span>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};
