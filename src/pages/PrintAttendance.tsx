import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import { Loader2, Printer, MapPin, Calendar, Clock, Building2 } from 'lucide-react';
import styles from './PrintAttendance.module.css';

export const PrintAttendance: React.FC = () => {
  const { churchId } = useParams();
  const [searchParams] = useSearchParams();
  const church = useQuery(api.churches.getMyChurch);
  const dailyServices = useQuery(api.services.getDailyServices);
  
  const qrSecret = searchParams.get('secret');
  const type = searchParams.get('type') || 'daily';
  const dateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    // Auto-trigger print after a short delay to allow QR and styles to render
    if (church && dailyServices) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [church, dailyServices]);

  if (!church || !dailyServices) {
    return (
      <div className={styles.loading}>
        <Loader2 className="animate-spin" size={48} />
        <p>Preparing High-Fidelity Ticket...</p>
      </div>
    );
  }

  const qrValue = JSON.stringify({
    churchId: church._id,
    type: 'daily',
    date: dateStr,
    secret: qrSecret || church.settings?.qrCodeSecret
  });

  return (
    <div className={styles.page}>
      <div className={styles.noPrintActions}>
        <button onClick={() => window.print()} className={styles.printBtn}>
          <Printer size={20} /> Print Now
        </button>
        <p>This page is optimized for printing. Use the button above or Ctrl+P.</p>
      </div>

      <div className={styles.ticketContainer}>
        <div className={styles.ticket}>
          {/* Left Section: Branding & QR */}
          <div className={styles.leftSection}>
            <div className={styles.branding}>
              {church.logoUrl ? (
                <img src={church.logoUrl} alt={church.name} className={styles.logo} />
              ) : (
                <div className={styles.fallbackLogo}>
                  <Building2 size={32} />
                  <span>{church.name[0]}</span>
                </div>
              )}
              <h1 className={styles.churchName}>{church.name}</h1>
            </div>

            <div className={styles.qrWrapper}>
              <QRCode value={qrValue} size={180} level="H" />
              <p className={styles.qrInstruction}>SCAN TO MARK ATTENDANCE</p>
            </div>
          </div>

          {/* Right Section: Details */}
          <div className={styles.rightSection}>
            <div className={styles.mainTitle}>
              <span className={styles.passType}>OFFICIAL PASS</span>
              <h2>Daily Attendance</h2>
            </div>

            <div className={styles.dateInfo}>
              <Calendar className={styles.icon} size={18} />
              <div className={styles.infoText}>
                <span className={styles.label}>DATE</span>
                <span className={styles.value}>{format(new Date(dateStr), 'EEEE, do MMMM yyyy')}</span>
              </div>
            </div>

            <div className={styles.servicesList}>
              <div className={styles.listHeader}>
                <Clock className={styles.icon} size={18} />
                <span className={styles.label}>SCHEDULED SERVICES</span>
              </div>
              <div className={styles.servicesGrid}>
                {dailyServices.map((service, idx) => (
                  <div key={service._id} className={styles.serviceItem}>
                    <span className={styles.serviceName}>{service.name}</span>
                    <span className={styles.serviceTime}>
                      {format(service.startTime, 'HH:mm')} - {format(service.endTime, 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.location}>
                <MapPin size={14} />
                <span>{church.address || 'Church Location'}</span>
              </div>
              <div className={styles.brandingSmall}>
                <span>Powered by Katarly</span>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className={styles.perforation}></div>
        </div>
      </div>
    </div>
  );
};
