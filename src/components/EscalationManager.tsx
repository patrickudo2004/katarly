import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  MessageSquare,
  Loader2
} from 'lucide-react';
import styles from './EscalationManager.module.css';

export const EscalationManager: React.FC = () => {
  const escalations = useQuery(api.deaconBoard.getPendingEscalations);
  const resolve = useMutation(api.deaconBoard.resolveEscalation);
  const [processing, setProcessing] = useState<string | null>(null);

  if (escalations === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-blue-900" size={24} />
      </div>
    );
  }

  if (escalations.length === 0) {
    return (
      <div className={styles.emptyState}>
        <CheckCircle2 size={40} className="mx-auto mb-3 opacity-20" />
        <p>No pending escalations in the queue.</p>
      </div>
    );
  }

  const handleResolve = async (id: any, action: 'approved' | 'declined') => {
    setProcessing(id);
    try {
      await resolve({ escalationId: id, action });
    } catch (error) {
      console.error("Failed to resolve escalation:", error);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className={styles.container}>
      {escalations.map((esc) => (
        <div key={esc._id} className={styles.card}>
          <div className={styles.header}>
            <div className="flex flex-col gap-1">
              <span className={`${styles.typeBadge} ${styles[esc.type]}`}>
                {esc.type}
              </span>
              <span className={styles.date}>
                {new Date(esc.createdAt).toLocaleDateString()} at {new Date(esc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <User size={14} className="text-gray-400" />
            <span className={styles.initiator}>Escalated by {esc.initiatorName}</span>
          </div>

          <div className={styles.note}>
            <div className="flex gap-2 mb-1">
              <MessageSquare size={14} className="opacity-50 mt-1" />
              <p className="font-semibold text-xs uppercase tracking-wider opacity-60">Oversight Note</p>
            </div>
            {esc.note}
          </div>

          <div className={styles.actions}>
            <button 
              className={styles.approveBtn}
              onClick={() => handleResolve(esc._id, 'approved')}
              disabled={processing === esc._id}
            >
              {processing === esc._id ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Approve Extension'}
            </button>
            <button 
              className={styles.declineBtn}
              onClick={() => handleResolve(esc._id, 'declined')}
              disabled={processing === esc._id}
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
