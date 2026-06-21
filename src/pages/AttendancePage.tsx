import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AttendanceScanner } from '../components/AttendanceScanner';
import { MapPin, Clock, CheckCircle2, AlertCircle, ShieldCheck, ChevronRight, Loader2, Nfc } from 'lucide-react';
import { format } from 'date-fns';
import styles from './AttendancePage.module.css';

// Helper for geofence distance calculation (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const cleanErrorMessage = (msg: string) => {
  if (!msg) return "Attendance marking failed";
  const match = msg.match(/Server Error:\s*(.+)$/i) || msg.match(/Error:\s*(.+)$/i);
  return match ? match[1].trim() : msg;
};

export const AttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const church = useQuery(api.churches.getMyChurch);
  const todayServices = useQuery(api.services.getDailyServices);
  const markAttendance = useMutation(api.attendance.markAttendance);
  const requestVerification = useMutation(api.attendance.requestVerification);

  const [step, setStep] = useState<'scan' | 'select' | 'success' | 'verifying'>('scan');
  const [scanData, setScanData] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<GeolocationPosition | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const [isNfcScanning, setIsNfcScanning] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [showNfcInstructions, setShowNfcInstructions] = useState(false);

  // Live listener for verification status
  const latestRequest = useQuery(api.attendance.getLatestVerificationStatus);

  useEffect(() => {
    if (step === 'verifying' && latestRequest?.status === 'approved') {
      setStep('success');
      // Subtle haptic if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    }
  }, [latestRequest, step]);

  useEffect(() => {
    if (userLocation && church?.location) {
      const d = calculateDistance(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        church.location.lat,
        church.location.lng
      );
      setDistance(d);
    }
  }, [userLocation, church]);

  const handleScan = async (data: string, location: GeolocationPosition | null) => {
    try {
      // New simplified format: "TYPE:ID:SECRET" or "SERVICE:ID:SECRET"
      const parts = data.split(':');
      if (parts.length < 3) throw new Error("Invalid format");
      
      const [type, id, secret] = parts;
      setScanData({ type, id, secret });
      setUserLocation(location);
      setStep('select');
    } catch (e) {
      setError("Invalid QR Code format. Please scan a valid Katarly code.");
    }
  };

  const handleManualRequest = () => {
    setScanData({ type: 'MANUAL', id: 'MANUAL', secret: 'MANUAL' });
    setStep('select');
  };

  const handleNfcCheckin = async () => {
    if (!('NDEFReader' in window)) {
      setShowNfcInstructions(true);
      return;
    }

    setIsNfcScanning(true);
    setNfcError(null);

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      
      ndef.onreading = (event: any) => {
        try {
          const record = event.message.records[0];
          if (record && record.recordType === "url") {
            const textDecoder = new TextDecoder("utf-8");
            const urlString = textDecoder.decode(record.data);
            const url = new URL(urlString);
            const c = url.searchParams.get('c');
            const s = url.searchParams.get('s');
            
            if (c && s) {
              setIsNfcScanning(false);
              navigate(`/tap?c=${c}&s=${s}`);
            } else {
              setNfcError("Invalid NFC tag: missing credentials.");
            }
          } else {
            setNfcError("Invalid NFC tag format.");
          }
        } catch (e: any) {
          setNfcError("Failed to read NFC data.");
        }
      };

      ndef.onreadingerror = () => {
        setNfcError("NFC reading failed. Please try again.");
      };

    } catch (err: any) {
      console.error("NFC Scan error:", err);
      setNfcError(err.message || "Failed to start NFC scanner.");
      setIsNfcScanning(false);
    }
  };

  const handleCheckIn = async (serviceId: any) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // 1. If it's a manual request (no QR scanned)
      if (scanData?.secret === 'MANUAL') {
        await requestVerification({
          serviceId,
          lat: userLocation?.coords.latitude,
          lng: userLocation?.coords.longitude
        });
        setStep('verifying');
        return;
      }

      // 2. If it's a QR scan
      const radius = church?.settings?.geofenceRadius || 100;
      
      if (distance !== null && distance > radius) {
        // Outside geofence - request manual verification instead
        await requestVerification({
          serviceId,
          lat: userLocation?.coords.latitude,
          lng: userLocation?.coords.longitude
        });
        setStep('verifying');
      } else {
        // Inside geofence - proceed normally
        await markAttendance({
          serviceId,
          qrSecret: scanData.secret,
          lat: userLocation?.coords.latitude,
          lng: userLocation?.coords.longitude,
          accuracy: userLocation?.coords.accuracy,
        });
        setStep('success');
      }
    } catch (err: any) {
      setError(cleanErrorMessage(err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === 'scan') {
    return (
      <div className={styles.container}>
        <div className={styles.scannerWrapper}>
          <AttendanceScanner onScan={handleScan} isProcessing={isProcessing} />
          
          <div className="mt-8 px-4 text-center flex flex-col gap-3">
            <button 
              onClick={handleNfcCheckin}
              className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
            >
              <Nfc size={20} />
              Check In via NFC
            </button>

            <p className="text-gray-500 text-sm mt-2 mb-2">Having trouble with the scanner or GPS?</p>
            <button 
              onClick={handleManualRequest}
              className="w-full py-3 px-4 bg-white border-2 border-purple-200 text-purple-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:border-purple-600 transition-colors"
            >
              <ShieldCheck size={20} />
              Request Manual Check-in
            </button>
          </div>
        </div>

        {/* NFC Scanning Glassmorphism Overlay */}
        {isNfcScanning && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.pulseContainer}>
                <div className={styles.pulseRing} />
                <Nfc size={40} className="text-purple-600 animate-pulse" />
              </div>
              <h3>Scanning NFC Tag</h3>
              <p>Hold the back of your phone close to the physical NFC sticker on the wall.</p>
              {nfcError && <p className="text-red-500 text-sm mt-2">{nfcError}</p>}
              <button 
                onClick={() => setIsNfcScanning(false)}
                className="mt-6 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* NFC Instructions Modal */}
        {showNfcInstructions && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-full w-fit mb-4 mx-auto">
                <Nfc size={32} />
              </div>
              <h3>One-Tap NFC Check-In</h3>
              <div className="text-left text-sm text-gray-600 space-y-3 mt-4">
                <p><strong>For iPhones:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-1">
                  <li>Wake or unlock your iPhone.</li>
                  <li>Hold the top-back edge of your phone directly against the physical NFC sticker on the wall.</li>
                  <li>Tap the notification that pops up on your screen.</li>
                </ol>
                <p className="mt-2 text-xs text-gray-400">Note: You do not need to click any buttons in this app. iOS detects the tag automatically!</p>
                
                <p className="pt-2"><strong>For Androids:</strong></p>
                <p>Ensure NFC is enabled in your phone settings, then use Chrome to tap the tag.</p>
              </div>
              <button 
                onClick={() => setShowNfcInstructions(false)}
                className="mt-6 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className={styles.statusContainer}>
        <div className={styles.statusCard}>
          <div className={styles.successIcon}>
            <CheckCircle2 size={64} />
          </div>
          <h1>Check-In Successful!</h1>
          <p>You have been successfully checked in for your service.</p>
          <button onClick={() => setStep('scan')} className={styles.primaryBtn}>
            Done
          </button>
        </div>
      </div>
    );
  }

  if (step === 'verifying') {
    return (
      <div className={styles.statusContainer}>
        <div className={styles.statusCard}>
          <div className={styles.verifyIcon}>
            <ShieldCheck size={64} />
          </div>
          <h1>Verification Requested</h1>
          <p>Your Lead has been alerted. Please show this screen to them so they can physically verify your presence in the building.</p>
          <div className={styles.pendingBadge}>Pending Approval</div>
          <button onClick={() => setStep('scan')} className={styles.secondaryBtn}>
            Back to Scanner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.selectionContainer}>
      <header className={styles.selectionHeader}>
        <h1>Select Your Service</h1>
        <p>{format(new Date(), 'EEEE, MMMM do')}</p>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.locationStatus}>
        <div className={`${styles.statusDot} ${distance !== null && distance <= (church?.settings?.geofenceRadius || 100) ? styles.active : styles.warning}`} />
        <span>
          {distance !== null 
            ? distance <= (church?.settings?.geofenceRadius || 100)
              ? "Inside Church Premises"
              : `Outside Boundary (${Math.round(distance)}m away)`
            : "Calculating location..."}
        </span>
      </div>

      <div className={styles.serviceList}>
        {todayServices?.map(service => {
          const windowMinutes = church?.settings?.attendanceWindowMinutes || 30;
          const windowMs = windowMinutes * 60 * 1000;
          const nowTime = Date.now();
          const isUpcoming = nowTime < service.startTime - windowMs;
          const isEnded = nowTime > service.endTime + windowMs;
          const isOpen = !isUpcoming && !isEnded;

          return (
            <button 
              key={service._id} 
              className={styles.serviceItem}
              onClick={() => handleCheckIn(service._id)}
              disabled={isProcessing || !isOpen}
              style={{ display: 'flex', alignItems: 'center', width: '100%' }}
            >
              <div className={styles.serviceTime}>
                <Clock size={16} />
                <span>{format(new Date(service.startTime), 'HH:mm')}</span>
              </div>
              <div className={styles.serviceInfo} style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{service.name}</h3>
                  {isOpen && (
                    <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #bbf7d0' }}>
                      Open
                    </span>
                  )}
                  {isUpcoming && (
                    <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', backgroundColor: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #fed7aa' }}>
                      Upcoming
                    </span>
                  )}
                  {isEnded && (
                    <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', backgroundColor: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #e5e7eb' }}>
                      Closed
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                  {isOpen && "Scan verified • Tap to check in"}
                  {isUpcoming && `Check-in opens at ${format(new Date(service.startTime - windowMs), 'HH:mm')}`}
                  {isEnded && `Closed at ${format(new Date(service.endTime + windowMs), 'HH:mm')}`}
                </p>
              </div>
              {isProcessing ? (
                <Loader2 className="animate-spin" size={20} style={{ color: '#8b5cf6' }} />
              ) : (
                <ChevronRight size={20} style={{ color: isOpen ? '#8b5cf6' : 'var(--text-secondary)', opacity: isOpen ? 1 : 0.5 }} />
              )}
            </button>
          );
        })}
      </div>

      <p className={styles.hint}>
        {distance !== null && distance > (church?.settings?.geofenceRadius || 100)
          ? "You are outside the boundary. Tapping a service will request a manual lead verification."
          : "Tap the service you are serving in to check in."}
      </p>
    </div>
  );
};
