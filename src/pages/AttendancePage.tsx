import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AttendanceScanner } from '../components/AttendanceScanner';
import { MapPin, Clock, CheckCircle2, AlertCircle, ShieldCheck, ChevronRight, Loader2 } from 'lucide-react';
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

export const AttendancePage: React.FC = () => {
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

  const handleScan = async (data: string, location: GeolocationPosition) => {
    try {
      const qrData = JSON.parse(data);
      setScanData(qrData);
      setUserLocation(location);
      setStep('select');
    } catch (e) {
      setError("Invalid QR Code format. Please scan a valid Katarly code.");
    }
  };

  const handleCheckIn = async (serviceId: any) => {
    if (!userLocation || !scanData) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const radius = church?.settings?.geofenceRadius || 100;
      
      if (distance !== null && distance > radius) {
        // Outside geofence - request manual verification instead
        await requestVerification({
          serviceId,
          lat: userLocation.coords.latitude,
          lng: userLocation.coords.longitude
        });
        setStep('verifying');
      } else {
        // Inside geofence - proceed normally
        await markAttendance({
          serviceId,
          qrSecret: scanData.secret,
          lat: userLocation.coords.latitude,
          lng: userLocation.coords.longitude,
          accuracy: userLocation.coords.accuracy,
        });
        setStep('success');
      }
    } catch (err: any) {
      setError(err.message || "Attendance marking failed");
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === 'scan') {
    return (
      <div className={styles.container}>
        <div className={styles.scannerWrapper}>
          <AttendanceScanner onScan={handleScan} isProcessing={isProcessing} />
        </div>
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
          <h1>Attendance Marked!</h1>
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
        {todayServices?.map(service => (
          <button 
            key={service._id} 
            className={styles.serviceItem}
            onClick={() => handleCheckIn(service._id)}
            disabled={isProcessing}
          >
            <div className={styles.serviceTime}>
              <Clock size={16} />
              <span>{format(new Date(service.startTime), 'HH:mm')}</span>
            </div>
            <div className={styles.serviceInfo}>
              <h3>{service.name}</h3>
              <p>Scan verified</p>
            </div>
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <ChevronRight size={20} />}
          </button>
        ))}
      </div>

      <p className={styles.hint}>
        {distance !== null && distance > (church?.settings?.geofenceRadius || 100)
          ? "You are outside the boundary. Tapping a service will request a manual lead verification."
          : "Tap the service you are serving in to check in."}
      </p>
    </div>
  );
};
