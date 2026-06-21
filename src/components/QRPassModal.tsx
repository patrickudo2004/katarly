import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import QRCode from 'react-qr-code';
import { X, RefreshCw, Clock, Loader2 } from 'lucide-react';
import styles from './QRPassModal.module.css';

interface QRPassModalProps {
  onClose: () => void;
  userId: string;
}

export const QRPassModal: React.FC<QRPassModalProps> = ({ onClose, userId }) => {
  const [token, setToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateToken = useMutation(api.attendance.generateCheckInToken);

  const fetchToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const newToken = await generateToken();
      setToken(newToken);
      setTimeLeft(60);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to generate check-in token");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  useEffect(() => {
    if (loading || error || !token) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchToken();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [token, loading, error]);

  const qrValue = token ? JSON.stringify({ userId, token }) : '';
  const progressPercent = (timeLeft / 60) * 100;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>My Check-in Pass</span>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.instruction}>
            Present this QR pass to your department head or supervisor to scan for on-site check-in.
          </p>

          <div className={styles.qrContainer}>
            {loading && !token ? (
              <div className={styles.loaderWrapper}>
                <Loader2 className={styles.loadingSpinner} size={36} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Generating pass...</span>
              </div>
            ) : error ? (
              <div className={styles.errorText}>
                <p>{error}</p>
              </div>
            ) : token ? (
              <QRCode value={qrValue} size={180} level="M" />
            ) : null}
          </div>

          {token && !error && (
            <div className={styles.timerSection}>
              <span className={styles.timerLabel}>
                <Clock size={14} />
                <span>Pass expires in {timeLeft}s</span>
              </span>
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBar} 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.actionSection}>
          <button 
            className={styles.btnSecondary} 
            onClick={fetchToken} 
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? styles.loadingSpinner : ''} />
            <span>Refresh Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
};
