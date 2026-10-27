import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { RefreshCw, User, Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import styles from './ShiftSwap.module.css';

interface ShiftSwapMarketplaceProps {
  churchId: any;
  userSubunitId?: string;
}

export const ShiftSwapMarketplace: React.FC<ShiftSwapMarketplaceProps> = ({ churchId, userSubunitId }) => {
  const me = useQuery(api.users.me);
  const availableSwaps = useQuery(api.shiftSwap.getAvailableSwaps, { churchId, subunitId: userSubunitId });
  const openShifts = useQuery(api.rotas.getOpenShifts);
  const userSwaps = useQuery(api.shiftSwap.getUserSwaps);
  const claimSwap = useMutation(api.shiftSwap.claimSwap);
  const claimOpenShift = useMutation(api.shiftSwap.claimOpenShift);
  const approveSwap = useMutation(api.shiftSwap.approveSwap);
  const declineSwap = useMutation(api.shiftSwap.declineSwap);

  const [activeSubTab, setActiveSubTab] = React.useState<'market' | 'my-swaps'>('market');
  const [claimingId, setClaimingId] = React.useState<string | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = React.useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (id: string, type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ id, type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleClaim = async (swapId: any) => {
    setClaimingId(swapId);
    try {
      await claimSwap({ swapRequestId: swapId });
      showFeedback(swapId, 'success', 'Shift claimed! Waiting for owner approval.');
    } catch (err: any) {
      showFeedback(swapId, 'error', err.message || 'Failed to claim shift.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimOpen = async (rotaId: any) => {
    setClaimingId(rotaId);
    try {
      await claimOpenShift({ rotaId });
      showFeedback(rotaId, 'success', 'Open shift claimed! You are now scheduled.');
    } catch (err: any) {
      showFeedback(rotaId, 'error', err.message || 'Failed to claim open shift.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleApprove = async (swapId: any) => {
    setProcessingId(swapId);
    try {
      await approveSwap({ swapRequestId: swapId });
      showFeedback(swapId, 'success', 'Claim approved! Shift reassigned successfully.');
    } catch (err: any) {
      showFeedback(swapId, 'error', err.message || 'Failed to approve claim.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (swapId: any) => {
    setProcessingId(swapId);
    try {
      await declineSwap({ swapRequestId: swapId });
      showFeedback(swapId, 'success', 'Claim declined. Shift returned to marketplace.');
    } catch (err: any) {
      showFeedback(swapId, 'error', err.message || 'Failed to decline claim.');
    } finally {
      setProcessingId(null);
    }
  };

  if (!availableSwaps) return <div className={styles.loading}>Loading marketplace...</div>;

  const pendingClaimsCount = (userSwaps || []).filter(s => s.requesterId === me?._id && s.status === 'claimed').length;

  return (
    <div className={styles.marketplaceContainer}>
      <header className={styles.marketHeader}>
        <RefreshCw size={24} className={styles.marketIcon} />
        <h2>Shift Swap Marketplace</h2>
      </header>

      <div className={styles.subTabs}>
        <button
          className={`${styles.subTabBtn} ${activeSubTab === 'market' ? styles.subTabBtnActive : ''}`}
          onClick={() => setActiveSubTab('market')}
        >
          Available Shifts
        </button>
        <button
          className={`${styles.subTabBtn} ${activeSubTab === 'my-swaps' ? styles.subTabBtnActive : ''}`}
          onClick={() => setActiveSubTab('my-swaps')}
        >
          My Swaps & Claims {pendingClaimsCount > 0 && <span style={{ marginLeft: '6px', padding: '2px 6px', borderRadius: '999px', background: '#ef4444', color: 'white', fontSize: '0.75rem' }}>{pendingClaimsCount}</span>}
        </button>
      </div>

      {activeSubTab === 'my-swaps' ? (
        <div>
          <div style={{ marginTop: '10px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>Your Swap Activity</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Review shifts you offered or claimed, and approve pending requests.</p>
          </div>

          {!userSwaps || userSwaps.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircle2 size={32} color="#10b981" />
              <p>You have not offered or claimed any shifts yet.</p>
            </div>
          ) : (
            <div className={styles.swapList}>
              {userSwaps.map((swap: any) => {
                const isRequester = swap.requesterId === me?._id;
                const isClaimant = swap.claimantId === me?._id;

                const getStatusStyle = (status: string) => {
                  switch (status) {
                    case 'approved': return { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' };
                    case 'claimed': return { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
                    case 'available': return { background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' };
                    default: return { background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' };
                  }
                };

                return (
                  <div key={swap._id} className={styles.swapCard}>
                    <div className={styles.swapMain}>
                      <div className={styles.serviceInfo}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span className={styles.statusPill} style={getStatusStyle(swap.status)}>
                            {swap.status === 'claimed' && isRequester ? 'Action Required: Claimed' : swap.status}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {isRequester ? 'Offered by you' : 'Claimed by you'}
                          </span>
                        </div>
                        <h4 className={styles.serviceName}>{swap.service?.name || 'Service Shift'}</h4>
                        {swap.service?.startTime && (
                          <div className={styles.metaItem}>
                            <Calendar size={14} />
                            <span>{new Date(swap.service.startTime).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.requesterInfo}>
                        <User size={16} />
                        <span>{isRequester ? (swap.claimant?.name ? `Claimant: ${swap.claimant.name}` : 'Awaiting Claimant') : `Offered by ${swap.requester?.name || 'Teammate'}`}</span>
                        {swap.rota?.role && <span className={styles.roleTag}>{swap.rota.role}</span>}
                      </div>
                    </div>

                    {swap.note && (
                      <div className={styles.noteBox}>
                        <strong>Note:</strong> {swap.note}
                      </div>
                    )}

                    {isRequester && swap.status === 'claimed' && (
                      <div className={styles.actionRow}>
                        <button
                          onClick={() => handleApprove(swap._id)}
                          disabled={processingId === swap._id}
                          className={styles.approveButton}
                        >
                          {processingId === swap._id ? 'Approving...' : 'Approve Claim'}
                        </button>
                        <button
                          onClick={() => handleDecline(swap._id)}
                          disabled={processingId === swap._id}
                          className={styles.declineButton}
                        >
                          {processingId === swap._id ? 'Declining...' : 'Decline'}
                        </button>
                      </div>
                    )}

                    {feedbackMsg?.id === swap._id && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: feedbackMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: feedbackMsg.type === 'success' ? '#16a34a' : '#dc2626',
                        border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      }}>
                        {feedbackMsg.text}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{marginTop: '20px', marginBottom: '10px'}}>
        <h3 style={{fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)'}}>Open Needs (Unassigned)</h3>
      </div>
      
      {!openShifts || openShifts.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle2 size={32} color="#10b981" />
          <p>All roles are filled. No open shifts right now!</p>
        </div>
      ) : (
        <div className={styles.swapList}>
          {openShifts.map((rota: any) => (
            <div key={rota._id} className={styles.swapCard} style={{ border: '2px dashed var(--accent)', background: 'var(--surface-hover)' }}>
              <div className={styles.swapMain}>
                <div className={styles.serviceInfo}>
                  <h4 className={styles.serviceName}>{rota.service?.name}</h4>
                  <div className={styles.metaItem}>
                    <Calendar size={14} />
                    <span>{new Date(rota.service?.startTime).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className={styles.requesterInfo}>
                  <User size={16} />
                  <span>Unassigned</span>
                  <span className={styles.roleTag}>{rota.role}</span>
                  {rota.allowCrossDept ? (
                    <span className={styles.roleTag} style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', marginLeft: '8px' }}>🌐 Global Help</span>
                  ) : (
                    <span className={styles.roleTag} style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', marginLeft: '8px' }}>🏢 Internal Only</span>
                  )}
                </div>
              </div>

              <div className={styles.noteBox} style={{ color: 'var(--accent)' }}>
                <strong>Needed:</strong> {rota.department?.name} {rota.subunit ? `(${rota.subunit.name})` : ''}
              </div>

              <button 
                onClick={() => handleClaimOpen(rota._id)}
                disabled={claimingId === rota._id}
                className={styles.claimButton}
              >
                {claimingId === rota._id ? 'Claiming...' : 'Claim Open Shift'}
              </button>

              {feedbackMsg?.id === rota._id && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: feedbackMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: feedbackMsg.type === 'success' ? '#16a34a' : '#dc2626',
                  border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                  {feedbackMsg.text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop: '40px', marginBottom: '10px'}}>
        <h3 style={{fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)'}}>Requested Swaps</h3>
      </div>

      {!availableSwaps || availableSwaps.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle2 size={32} color="#10b981" />
          <p>No one has requested a shift swap right now. Check back later!</p>
        </div>
      ) : (
        <div className={styles.swapList}>
          {availableSwaps.map((swap: any) => (
            <div key={swap._id} className={styles.swapCard}>
              <div className={styles.swapMain}>
                <div className={styles.serviceInfo}>
                  <h4 className={styles.serviceName}>{swap.service?.name}</h4>
                  <div className={styles.metaItem}>
                    <Calendar size={14} />
                    <span>{new Date(swap.service?.startTime).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <Clock size={14} />
                    <span>
                      {new Date(swap.service?.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(swap.service?.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className={styles.requesterInfo}>
                  <User size={16} />
                  <span>{swap.requester?.name}</span>
                  <span className={styles.roleTag}>{swap.rota?.role}</span>
                  {swap.allowCrossDept ? (
                    <span className={styles.roleTag} style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', marginLeft: '8px' }}>🌐 Global Help</span>
                  ) : (
                    <span className={styles.roleTag} style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', marginLeft: '8px' }}>🏢 Subunit Only</span>
                  )}
                </div>
              </div>

              {swap.note && (
                <div className={styles.noteBox}>
                  <strong>Note:</strong> {swap.note}
                </div>
              )}

              <button 
                onClick={() => handleClaim(swap._id)}
                disabled={claimingId === swap._id}
                className={styles.claimButton}
              >
                {claimingId === swap._id ? 'Claiming...' : 'Claim Shift'}
              </button>

              {feedbackMsg?.id === swap._id && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: feedbackMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: feedbackMsg.type === 'success' ? '#16a34a' : '#dc2626',
                  border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                  {feedbackMsg.text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
};
