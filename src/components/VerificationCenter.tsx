import React from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Check, X, ShieldAlert, Clock, User, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import styles from './VerificationCenter.module.css';

export const VerificationCenter: React.FC = () => {
  const church = useQuery(api.churches.getMyChurch);
  const requests = useQuery(api.attendance.getPendingVerifications, 
    church ? { churchId: church._id } : "skip"
  );
  
  const approve = useMutation(api.attendance.approveVerification);
  const decline = useMutation(api.attendance.declineVerification);

  if (requests === undefined) {
    return (
      <div className={styles.loading}>
        <Loader2 className="animate-spin" />
        <span>Loading verification requests...</span>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className={styles.empty}>
        <ShieldAlert size={48} opacity={0.2} />
        <h3>No Pending Requests</h3>
        <p>All clear! There are currently no manual verification requests to process.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {requests.map((req) => (
          <div key={req._id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.userInfo}>
                <div className={styles.avatar}>{req.userName[0]}</div>
                <div>
                  <h4>{req.userName}</h4>
                  <span className={styles.roleBadge}>{req.userRole}</span>
                </div>
              </div>
              <div className={styles.timestamp}>
                <Clock size={14} />
                <span>{format(req.requestedAt, 'HH:mm')}</span>
              </div>
            </div>

            <div className={styles.requestDetails}>
              <div className={styles.detailItem}>
                <label>Requested Service</label>
                <div className={styles.detailValue}>
                  <strong>{req.serviceName}</strong>
                  <span>({req.serviceStartTime ? format(req.serviceStartTime, 'HH:mm') : 'N/A'})</span>
                </div>
              </div>

              {req.location && (
                <div className={styles.detailItem}>
                  <label>Claimed Location</label>
                  <div className={styles.detailValue}>
                    <MapPin size={14} />
                    <span>Last reported position logged</span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <button 
                className={styles.declineBtn}
                onClick={() => decline({ requestId: req._id })}
              >
                <X size={18} />
                <span>Decline</span>
              </button>
              <button 
                className={styles.approveBtn}
                onClick={() => approve({ requestId: req._id })}
              >
                <Check size={18} />
                <span>Verify Presence</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
