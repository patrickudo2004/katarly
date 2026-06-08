import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import styles from './AttendanceScanner.module.css';
import { MapPin, Camera, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface AttendanceScannerProps {
  onScan: (data: string, location: GeolocationPosition) => Promise<void>;
  isProcessing: boolean;
}

export const AttendanceScanner: React.FC<AttendanceScannerProps> = ({ onScan, isProcessing }) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const locationRef = useRef<GeolocationPosition | null>(null);

  // Update locationRef whenever location changes
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Handle geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation(pos),
      (err) => {
        console.error("GPS Error:", err);
        setError("Location access is required for check-in verification.");
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    if (isInitializing || isCameraActive) return;
    setIsInitializing(true);
    setError(null);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      }

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (isProcessing) return;
          
          // We no longer block on GPS. We pass null if not available.
          try {
            await onScan(decodedText, locationRef.current || undefined as any);
            setSuccess(true);
            stopScanner();
          } catch (err: any) {
            setError(err.message || "Failed to check in");
          }
        },
        () => {} // silent failure for non-matches
      );
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera Error:", err);
      setError("Could not start camera. Please ensure you have granted permissions.");
      setIsCameraActive(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current?.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsCameraActive(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      stopScanner();
    } else {
      startScanner();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Camera className={styles.icon} />
        <h2>Scan Service QR Code</h2>
      </div>

      {isCameraActive && !location && !error && (
        <div className={styles.status}>
          <MapPin className={styles.spinning} />
          <p>Acquiring GPS location...</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className={styles.success}>
          <CheckCircle2 size={40} />
          <h3>Check-In Successful!</h3>
          <p>You have been successfully checked in.</p>
          <button onClick={() => setSuccess(false)} className={styles.resetBtn}>Scan Another</button>
        </div>
      )}

      {!success && (
        <>
          <div className={styles.readerWrapper}>
            <div id="qr-reader" className={styles.reader}></div>
            {isInitializing && (
              <div className={styles.loaderOverlay}>
                <Loader2 className="animate-spin" size={32} />
                <p>Starting Camera...</p>
              </div>
            )}
            {!isCameraActive && !isInitializing && (
              <div className={styles.cameraPlaceholder}>
                <Camera size={48} opacity={0.2} />
                <p>Camera is currently off</p>
              </div>
            )}
          </div>

          <div className={styles.controls}>
            <button 
              onClick={toggleCamera}
              disabled={isInitializing}
              className={isCameraActive ? styles.stopBtn : styles.startBtn}
            >
              {isInitializing ? "Initializing..." : isCameraActive ? "Stop Camera" : "Start Camera"}
            </button>
          </div>
        </>
      )}

      <div className={styles.footer}>
        <p>Ensure you are within the church premises to check in.</p>
      </div>
    </div>
  );
};
