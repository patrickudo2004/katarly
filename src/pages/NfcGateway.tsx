import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Flame, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import styles from './NfcGateway.module.css';

export const NfcGateway: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const validateTap = useMutation(api.nfc.validateTap);
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null);

  const churchId = searchParams.get('c');
  const secret = searchParams.get('s');

  useEffect(() => {
    if (!churchId || !secret) {
      setStatus('error');
      setErrorMsg("Invalid Tap: Missing credentials.");
      return;
    }

    handleAutoCheckin();
  }, [churchId, secret]);

  const handleAutoCheckin = () => {
    setStatus('loading');
    setErrorMsg(null);

    // 1. Get GPS Location
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMsg("GPS not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // 2. Validate Tap on Backend
          const res = await validateTap({
            churchId: churchId as any,
            secret,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });

          setResultData(res);
          setStatus('success');

          // Auto-redirect to dashboard after 4 seconds
          setTimeout(() => {
            navigate('/');
          }, 4000);

        } catch (err: any) {
          console.error(err);
          setStatus('error');
          setErrorMsg(err.message || "Failed to check in via NFC.");
        }
      },
      (err) => {
        setStatus('error');
        setErrorMsg("Please enable GPS permissions to check in via NFC.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === 'loading' && (
          <>
            <div className={styles.spinnerContainer}>
              <div className={styles.pulse} />
              <Loader2 className={styles.spinner} />
            </div>
            <p className={styles.statusText}>Verifying Location...</p>
            <p className={styles.subText}>Please keep your phone steady.</p>
            <div className={styles.gpsHint}>
              <MapPin size={14} /> GPS Lock Required
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className={styles.successIcon} />
            <div>
              <p className={styles.statusText}>
                {resultData.status === 'already_present' ? "Already Present!" : "Successfully Checked In!"}
              </p>
              <p className={styles.subText}>{resultData.serviceName}</p>
            </div>

            {resultData.pointsEarned && (
              <div className={styles.pointsBadge}>
                <Flame size={16} /> +{resultData.pointsEarned} Service Points
              </div>
            )}

            <div className={styles.redirectHint}>
              Redirecting to Dashboard...
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className={styles.errorIcon} />
            <p className={styles.statusText}>Check-In Failed</p>
            <p className={styles.subText}>{errorMsg}</p>
            
            <div className={styles.errorHelp}>
              {errorMsg?.includes("GPS") ? (
                <p><AlertTriangle size={14} /> Location access is mandatory for NFC check-ins.</p>
              ) : (
                <p>Try scanning the QR code if this persists.</p>
              )}
            </div>

            <button className={styles.retryBtn} onClick={handleAutoCheckin}>
              Try Again
            </button>
            <button className={styles.retryBtn} style={{ marginTop: '0.5rem' }} onClick={() => navigate('/')}>
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};
