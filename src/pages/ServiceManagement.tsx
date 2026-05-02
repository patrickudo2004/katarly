import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Calendar, Plus, QrCode, Clock, MapPin, Loader2, X, Printer, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceTicket } from '../components/AttendanceTicket';
import styles from './ServiceManagement.module.css';

export const ServiceManagement: React.FC = () => {
  const church = useQuery(api.churches.getMyChurch);
  const services = useQuery(api.services.getChurchServices);
  const createService = useMutation(api.services.createService);
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    startTime: '09:00',
    endTime: '11:00',
    qrType: 'Unique' as 'Unique' | 'Generic'
  });
  const [showDailyPass, setShowDailyPass] = useState(false);
  const dailyServices = useQuery(api.services.getDailyServices);
  const initializeQrSecret = useMutation(api.churches.initializeQrSecret);

  // Set default qrType when modal opens if church settings exist
  React.useEffect(() => {
    if (isAdding && church?.settings?.defaultQrType) {
      setFormData(prev => ({ ...prev, qrType: church.settings!.defaultQrType! }));
    }
  }, [isAdding, church]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${formData.date}T${formData.startTime}`).getTime();
    const end = new Date(`${formData.date}T${formData.endTime}`).getTime();
    
    try {
      await createService({
        name: formData.name,
        startTime: start,
        endTime: end,
        qrType: formData.qrType
      });
      setIsAdding(false);
      setFormData({ 
        name: '', 
        date: '', 
        startTime: '09:00', 
        endTime: '11:00', 
        qrType: church?.settings?.defaultQrType || 'Unique' 
      });
    } catch (err) {
      alert("Failed to create service. Please ensure all fields are correct.");
    }
  };

  const handleDuplicate = (service: any) => {
    const startDate = new Date(service.startTime);
    const endDate = new Date(service.endTime);
    
    setFormData({
      name: `${service.name}`,
      date: format(startDate, 'yyyy-MM-dd'),
      startTime: format(startDate, 'HH:mm'),
      endTime: format(endDate, 'HH:mm'),
      qrType: service.qrType || 'Unique'
    });
    setIsAdding(true);
  };

  const handlePrintPass = (startTime: number) => {
    // Open the high-fidelity print route for this service's specific date
    const dateStr = format(new Date(startTime), 'yyyy-MM-dd');
    const printUrl = `/print/attendance/${church?._id}?secret=${church?.settings?.qrCodeSecret || ''}&date=${dateStr}`;
    window.open(printUrl, '_blank');
  };

  if (services === undefined || church === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleInfo}>
          <Calendar className={styles.headerIcon} />
          <div>
            <h1>Service Management</h1>
            <p>Schedule services and generate attendance QR codes.</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addBtn} onClick={() => setIsAdding(true)}>
            <Plus size={20} /> Create Service
          </button>
        </div>
      </header>

      <div className={styles.grid}>
        {services.length === 0 ? (
          <div className={styles.emptyState}>
            <Calendar size={48} />
            <h3>No services scheduled</h3>
            <p>Get started by creating your first church service.</p>
          </div>
        ) : (
          services.map(service => (
            <div key={service._id} className={styles.serviceCard}>
              <div className={styles.serviceInfo}>
                <div className={styles.dateBadge}>
                  <span className={styles.day}>{new Date(service.startTime).getDate()}</span>
                  <span className={styles.month}>
                    {new Date(service.startTime).toLocaleString('default', { month: 'short' })}
                  </span>
                </div>
                <div className={styles.details}>
                  <h3>{service.name}</h3>
                  <div className={styles.meta}>
                    <Clock size={14} />
                    <span>
                      {new Date(service.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(service.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={styles.typeTag}>
                    <QrCode size={12} />
                    {service.qrType} Code
                  </div>
                </div>
              </div>
              <div className={styles.cardActions}>
                <button 
                  className={styles.duplicateBtn}
                  onClick={() => handleDuplicate(service)}
                  title="Duplicate this service"
                >
                  <Copy size={18} />
                </button>
                <button 
                  className={styles.printBtn}
                  onClick={() => handlePrintPass(service.startTime)}
                >
                  <Printer size={18} /> Print Pass
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {isAdding && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Schedule New Service</h2>
              <button onClick={() => setIsAdding(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className={styles.form}>
              <div className={styles.field}>
                <label>Service Name</label>
                <input 
                  placeholder="e.g. Sunday Celebration" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Date</label>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Start Time</label>
                  <input 
                    type="time" 
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>End Time</label>
                  <input 
                    type="time" 
                    value={formData.endTime}
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className={styles.field}>
                <label>QR Code Security</label>
                <select 
                  value={formData.qrType}
                  onChange={e => setFormData({...formData, qrType: e.target.value as any})}
                >
                  <option value="Unique">Unique (Recommended - Most Secure)</option>
                  <option value="Generic">Generic (Fixed code)</option>
                </select>
                <p className={styles.hint}>Unique codes change per service to prevent attendance fraud.</p>
              </div>

              <button type="submit" className={styles.submitBtn}>Create Service</button>
            </form>
          </div>
        </div>
      )}

      {/* Daily Pass Ticket Modal */}
      {showDailyPass && church && dailyServices && (
        <AttendanceTicket
          churchName={church.name}
          services={dailyServices}
          date={new Date()}
          qrCodeValue={`DAILY:${church._id}:${church.settings?.qrCodeSecret || 'none'}`}
          onClose={() => setShowDailyPass(false)}
        />
      )}

      {/* Individual QR Modal (Legacy/Fallback) */}
      {selectedService && (
        <AttendanceTicket
          churchName={church.name}
          services={[selectedService]}
          date={new Date(selectedService.startTime)}
          qrCodeValue={`SERVICE:${selectedService._id}:${selectedService.qrCodeSecret}`}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
};
