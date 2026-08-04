import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Calendar, Plus, QrCode, Clock, MapPin, 
  Loader2, X, Printer, Copy, Trash2, Edit, Laptop, Share2, MoreHorizontal, Upload, Image as ImageIcon 
} from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceTicket } from '../components/AttendanceTicket';
import { ServiceDetailsModal } from '../components/ServiceDetailsModal';
import styles from './ServiceManagement.module.css';

export const ServiceManagement: React.FC = () => {
  const me = useQuery(api.users.me);
  const church = useQuery(api.churches.getMyChurch);
  const services = useQuery(api.services.getChurchServices);
  const createService = useMutation(api.services.createService);
  const updateService = useMutation(api.services.updateService);
  const deleteService = useMutation(api.services.deleteService);
  const generateFlyerUploadUrl = useMutation(api.services.generateFlyerUploadUrl);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editServiceId, setEditServiceId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [existingFlyerStorageId, setExistingFlyerStorageId] = useState<string | null>(null);
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    startTime: '09:00',
    endTime: '11:00',
    qrType: 'Unique' as 'Unique' | 'Generic',
    format: 'Physical' as 'Physical' | 'Online' | 'Hybrid',
    platform: 'Custom' as 'Teams' | 'Zoom' | 'Meet' | 'Custom',
    meetingUrl: '',
    locationName: '',
    useCustomLocation: false,
    customLat: '',
    customLng: '',
    customAddress: '',
    customGeofenceRadius: '',
  });

  const [occurrencesDates, setOccurrencesDates] = useState<string[]>([]);
  const [newOccurDate, setNewOccurDate] = useState('');
  
  const [showDailyPass, setShowDailyPass] = useState(false);
  const dailyServices = useQuery(api.services.getDailyServices);

  // Set default qrType when modal opens if church settings exist
  useEffect(() => {
    if (isAdding && !editServiceId && church?.settings?.defaultQrType) {
      setFormData(prev => ({ ...prev, qrType: church.settings!.defaultQrType! }));
    }
  }, [isAdding, editServiceId, church]);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleUrlChange = (val: string) => {
    const isTeams = /teams\.microsoft\.com|teams\.live\.com/i.test(val);
    const isZoom = /zoom\.us|zoom\.com/i.test(val);
    const isMeet = /meet\.google\.com/i.test(val);

    let platform = formData.platform;
    if (isTeams) platform = 'Teams';
    else if (isZoom) platform = 'Zoom';
    else if (isMeet) platform = 'Meet';
    else if (val) platform = 'Custom';

    setFormData(prev => ({
      ...prev,
      meetingUrl: val,
      platform
    }));
  };

  const handleFlyerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert("Invalid file format. Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("File size exceeds 3MB limit. Please upload a smaller flyer image.");
      return;
    }

    setFlyerFile(file);
    setFlyerPreview(URL.createObjectURL(file));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${formData.date}T${formData.startTime}`).getTime();
    const end = new Date(`${formData.date}T${formData.endTime}`).getTime();
    
    if (isNaN(start) || isNaN(end)) {
      alert("Please enter a valid date and time.");
      return;
    }

    if (end <= start) {
      alert("End time must be after start time.");
      return;
    }

    // Custom Location Parsing and Validation
    let customLocation = undefined;
    if (formData.useCustomLocation) {
      if (!formData.customAddress) {
        alert("Please enter a custom location address.");
        return;
      }
      const lat = parseFloat(formData.customLat);
      const lng = parseFloat(formData.customLng);
      if (isNaN(lat) || isNaN(lng)) {
        alert("Please enter valid latitude and longitude numbers.");
        return;
      }
      customLocation = {
        lat,
        lng,
        address: formData.customAddress,
        geofenceRadius: formData.customGeofenceRadius ? parseInt(formData.customGeofenceRadius, 10) : undefined
      };
    }

    let flyerStorageId: any = existingFlyerStorageId || undefined;

    try {
      if (flyerFile) {
        setIsUploadingFlyer(true);
        const postUrl = await generateFlyerUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": flyerFile.type },
          body: flyerFile,
        });
        const { storageId } = await result.json();
        flyerStorageId = storageId;
        setIsUploadingFlyer(false);
      }

      if (editServiceId) {
        // Edit Mode
        await updateService({
          id: editServiceId as any,
          name: formData.name,
          startTime: start,
          endTime: end,
          qrType: formData.qrType,
          format: formData.format,
          platform: (formData.format === 'Online' || formData.format === 'Hybrid') ? formData.platform : undefined,
          meetingUrl: (formData.format === 'Online' || formData.format === 'Hybrid') ? formData.meetingUrl : undefined,
          locationName: (formData.format === 'Physical' || formData.format === 'Hybrid') ? formData.locationName : undefined,
          customLocation,
          flyerStorageId,
        });
        alert("Service updated successfully.");
      } else {
        // Create Mode
        let occurrences = undefined;
        if (occurrencesDates.length > 0) {
          const duration = end - start;
          occurrences = [
            { startTime: start, endTime: end },
            ...occurrencesDates.map(dateStr => {
              const [year, month, day] = dateStr.split('-').map(Number);
              const startOccur = new Date(
                year,
                month - 1,
                day,
                new Date(start).getHours(),
                new Date(start).getMinutes(),
                new Date(start).getSeconds(),
                new Date(start).getMilliseconds()
              );
              const endOccur = new Date(startOccur.getTime() + duration);
              return {
                startTime: startOccur.getTime(),
                endTime: endOccur.getTime()
              };
            })
          ];
        }

        await createService({
          name: formData.name,
          startTime: start,
          endTime: end,
          qrType: formData.qrType,
          format: formData.format,
          platform: (formData.format === 'Online' || formData.format === 'Hybrid') ? formData.platform : undefined,
          meetingUrl: (formData.format === 'Online' || formData.format === 'Hybrid') ? formData.meetingUrl : undefined,
          locationName: (formData.format === 'Physical' || formData.format === 'Hybrid') ? formData.locationName : undefined,
          occurrences,
          customLocation,
          flyerStorageId,
        });
        alert("Service scheduled successfully.");
      }

      setIsAdding(false);
      setEditServiceId(null);
      setFlyerFile(null);
      setFlyerPreview(null);
      setExistingFlyerStorageId(null);
      setFormData({ 
        name: '', 
        date: '', 
        startTime: '09:00', 
        endTime: '11:00', 
        qrType: church?.settings?.defaultQrType || 'Unique',
        format: 'Physical',
        platform: 'Custom',
        meetingUrl: '',
        locationName: '',
        useCustomLocation: false,
        customLat: '',
        customLng: '',
        customAddress: '',
        customGeofenceRadius: '',
      });
      setOccurrencesDates([]);
      setNewOccurDate('');
    } catch (err: any) {
      setIsUploadingFlyer(false);
      alert(err.message || "Failed to process service. Please check your inputs.");
    }
  };

  const handleEdit = (service: any) => {
    setEditServiceId(service._id);
    const startDate = new Date(service.startTime);
    const endDate = new Date(service.endTime);
    
    // Adjust timezone offset so form datetime inputs populate correctly
    const tzOffsetStart = startDate.getTimezoneOffset() * 60000;
    const tzOffsetEnd = endDate.getTimezoneOffset() * 60000;
    
    setFormData({
      name: service.name,
      date: format(new Date(service.startTime - tzOffsetStart), 'yyyy-MM-dd'),
      startTime: format(new Date(service.startTime - tzOffsetStart), 'HH:mm'),
      endTime: format(new Date(service.endTime - tzOffsetEnd), 'HH:mm'),
      qrType: service.qrType || 'Unique',
      format: service.format || 'Physical',
      platform: service.platform || 'Custom',
      meetingUrl: service.meetingUrl || '',
      locationName: service.locationName || '',
      useCustomLocation: !!service.customLocation,
      customLat: service.customLocation?.lat?.toString() || '',
      customLng: service.customLocation?.lng?.toString() || '',
      customAddress: service.customLocation?.address || '',
      customGeofenceRadius: service.customLocation?.geofenceRadius?.toString() || '',
    });
    setExistingFlyerStorageId(service.flyerStorageId || null);
    setFlyerPreview(service.flyerUrl || null);
    setFlyerFile(null);
    setOccurrencesDates([]);
    setIsAdding(true);
  };

  const handleDuplicate = (service: any) => {
    const offset = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    const newStart = new Date(service.startTime + offset);
    const newEnd = new Date(service.endTime + offset);
    
    const tzOffsetStart = newStart.getTimezoneOffset() * 60000;
    const tzOffsetEnd = newEnd.getTimezoneOffset() * 60000;
    
    setFormData({
      name: service.name,
      date: format(new Date(newStart.getTime() - tzOffsetStart), 'yyyy-MM-dd'),
      startTime: format(new Date(newStart.getTime() - tzOffsetStart), 'HH:mm'),
      endTime: format(new Date(newEnd.getTime() - tzOffsetEnd), 'HH:mm'),
      qrType: service.qrType || 'Unique',
      format: service.format || 'Physical',
      platform: service.platform || 'Custom',
      meetingUrl: service.meetingUrl || '',
      locationName: service.locationName || '',
      useCustomLocation: !!service.customLocation,
      customLat: service.customLocation?.lat?.toString() || '',
      customLng: service.customLocation?.lng?.toString() || '',
      customAddress: service.customLocation?.address || '',
      customGeofenceRadius: service.customLocation?.geofenceRadius?.toString() || '',
    });
    setEditServiceId(null);
    setOccurrencesDates([]);
    setIsAdding(true);
  };

  const handleCopyInvite = (service: any) => {
    const formatDate = format(new Date(service.startTime), 'EEEE, MMM d');
    const formatTime = `${format(new Date(service.startTime), 'p')} - ${format(new Date(service.endTime), 'p')}`;
    const inviteText = `📅 *Service Gathering Invite*: *${service.name}*\n⏰ Date: ${formatDate}\n⏰ Time: ${formatTime}\n📍 Format: *${service.format || 'Physical'}* ${service.locationName ? `(${service.locationName})` : ''}\n\n👉 View shifts and sign up here:\nhttps://servesync-pi.vercel.app/service-management?id=${service._id}`;
    
    navigator.clipboard.writeText(inviteText)
      .then(() => {
        alert("Shareable invite copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy invite:", err);
      });
  };

  const handleAddOccurDate = () => {
    if (!newOccurDate) return;
    if (occurrencesDates.includes(newOccurDate)) {
      alert('This date has already been added.');
      return;
    }
    if (formData.date) {
      const parsedBase = new Date(formData.date);
      if (!isNaN(parsedBase.getTime())) {
        const baseDate = format(parsedBase, 'yyyy-MM-dd');
        if (baseDate === newOccurDate) {
          alert('The base date is already included as the first occurrence.');
          return;
        }
      }
    }
    setOccurrencesDates(prev => [...prev, newOccurDate].sort());
    setNewOccurDate('');
  };

  const handleRemoveOccurDate = (dateStr: string) => {
    setOccurrencesDates(prev => prev.filter(d => d !== dateStr));
  };

  const handlePrintPass = (startTime: number) => {
    const dateStr = format(new Date(startTime), 'yyyy-MM-dd');
    const printUrl = `/print/attendance/${church?._id}?secret=${church?.settings?.qrCodeSecret || ''}&date=${dateStr}`;
    window.open(printUrl, '_blank');
  };

  const handleDelete = async (serviceId: any) => {
    if (window.confirm("Are you sure? This will permanently delete all rotas, swap requests, and attendance records associated with this service.")) {
      try {
        await deleteService({ id: serviceId });
      } catch (err) {
        alert("Failed to delete service. You might not have permission.");
      }
    }
  };

  const getPlatformStyles = (platform: string, url?: string) => {
    if (platform === 'Custom' && url) {
      const lower = url.toLowerCase();
      if (lower.includes('whatsapp.com')) {
        return { backgroundColor: 'rgba(37, 211, 102, 0.1)', color: '#25d366', borderColor: 'rgba(37, 211, 102, 0.2)' };
      }
      if (lower.includes('discord.gg') || lower.includes('discord.com')) {
        return { backgroundColor: 'rgba(88, 101, 242, 0.1)', color: '#5865f2', borderColor: 'rgba(88, 101, 242, 0.2)' };
      }
      if (lower.includes('slack.com')) {
        return { backgroundColor: 'rgba(74, 21, 75, 0.1)', color: '#4a154b', borderColor: 'rgba(74, 21, 75, 0.2)' };
      }
      if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
        return { backgroundColor: 'rgba(255, 0, 0, 0.1)', color: '#ff0000', borderColor: 'rgba(255, 0, 0, 0.2)' };
      }
      if (lower.includes('facebook.com')) {
        return { backgroundColor: 'rgba(24, 119, 242, 0.1)', color: '#1877f2', borderColor: 'rgba(24, 119, 242, 0.2)' };
      }
    }
    switch (platform) {
      case 'Teams': return { backgroundColor: 'rgba(98, 100, 167, 0.1)', color: '#6264a7', borderColor: 'rgba(98, 100, 167, 0.2)' };
      case 'Zoom': return { backgroundColor: 'rgba(45, 140, 255, 0.1)', color: '#2d8cff', borderColor: 'rgba(45, 140, 255, 0.2)' };
      case 'Meet': return { backgroundColor: 'rgba(15, 157, 88, 0.1)', color: '#0f9d58', borderColor: 'rgba(15, 157, 88, 0.2)' };
      default: return { backgroundColor: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' };
    }
  };

  const getPlatformName = (platform: string, url?: string) => {
    if (platform === 'Custom' && url) {
      const lower = url.toLowerCase();
      if (lower.includes('whatsapp.com')) return 'WhatsApp';
      if (lower.includes('discord.gg') || lower.includes('discord.com')) return 'Discord';
      if (lower.includes('slack.com')) return 'Slack';
      if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube Live';
      if (lower.includes('facebook.com')) return 'Facebook Live';
      return 'External';
    }
    switch (platform) {
      case 'Teams': return 'MS Teams';
      case 'Zoom': return 'Zoom';
      case 'Meet': return 'Google Meet';
      default: return 'Virtual Link';
    }
  };

  const minOccurDate = (() => {
    if (formData.date) {
      const parsed = new Date(formData.date);
      if (!isNaN(parsed.getTime())) {
        return format(parsed, 'yyyy-MM-dd');
      }
    }
    return format(new Date(), 'yyyy-MM-dd');
  })();

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
            <p>Schedule services, assign formats, and generate check-in QR codes.</p>
          </div>
        </div>
        {me && ['SuperAdmin', 'DeaconHead', 'PastoralOversight'].includes(me.role || '') && (
          <div className={styles.headerActions}>
            <button className={styles.addBtn} onClick={() => { setEditServiceId(null); setIsAdding(true); }}>
              <Plus size={20} /> Create Service
            </button>
          </div>
        )}
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
            <div 
              key={service._id} 
              className={styles.serviceCard}
              onClick={() => setSelectedServiceId(service._id)}
            >
              <div className={styles.cardHeader}>
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
                    {(service.locationName || service.customLocation?.address) && (
                      <div className={styles.meta} style={{ marginTop: '4px' }}>
                        <MapPin size={14} />
                        <span>
                          {service.customLocation?.address 
                            ? (service.locationName ? `${service.locationName} (${service.customLocation.address})` : service.customLocation.address)
                            : service.locationName
                          }
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`${styles.formatBadge} ${styles[service.format || 'Physical']}`}>
                        {service.format || 'Physical'}
                      </span>
                      {(service.format === 'Online' || service.format === 'Hybrid') && service.meetingUrl && (
                        <span 
                          className={styles.platformBadge} 
                          style={getPlatformStyles(service.platform || 'Custom', service.meetingUrl)}
                        >
                          <Laptop size={12} />
                          {getPlatformName(service.platform || 'Custom', service.meetingUrl)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dropdown Menu */}
                <div className={styles.dropdownContainer} onClick={(e) => e.stopPropagation()}>
                  <button 
                    className={styles.ellipsisBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownId(activeDropdownId === service._id ? null : service._id);
                    }}
                    title="Actions"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  
                  {activeDropdownId === service._id && (
                    <div className={styles.dropdownMenu}>
                      <button 
                        onClick={() => {
                          handleCopyInvite(service);
                          setActiveDropdownId(null);
                        }}
                      >
                        <Share2 size={16} /> Copy Invite
                      </button>
                      {service.format !== 'Online' && (
                        <button 
                          onClick={() => {
                            handlePrintPass(service.startTime);
                            setActiveDropdownId(null);
                          }}
                        >
                          <Printer size={16} /> Print Pass
                        </button>
                      )}
                      {me && ['SuperAdmin', 'DeaconHead', 'PastoralOversight'].includes(me.role || '') && (
                        <>
                          <button 
                            onClick={() => {
                              handleDuplicate(service);
                              setActiveDropdownId(null);
                            }}
                          >
                            <Copy size={16} /> Duplicate (+7d)
                          </button>
                          <button 
                            onClick={() => {
                              handleEdit(service);
                              setActiveDropdownId(null);
                            }}
                          >
                            <Edit size={16} /> Edit Details
                          </button>
                          <button 
                            className={styles.deleteMenuBtn}
                            onClick={() => {
                              handleDelete(service._id);
                              setActiveDropdownId(null);
                            }}
                          >
                            <Trash2 size={16} /> Delete Service
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className={styles.cardFooter}>
                <button className={styles.manageBtn}>
                  Manage & View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {isAdding && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className={styles.modalHeader}>
              <h2>{editServiceId ? "Edit Service Details" : "Schedule New Service"}</h2>
              <button onClick={() => { setIsAdding(false); setEditServiceId(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className={styles.form} style={{ overflowY: 'auto', flex: 1 }}>
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
                <label>Service Format</label>
                <select 
                  value={formData.format}
                  onChange={e => setFormData({...formData, format: e.target.value as any})}
                >
                  <option value="Physical">Physical Only</option>
                  <option value="Online">Online Only</option>
                  <option value="Hybrid">Hybrid (Both)</option>
                </select>
              </div>

              {(formData.format === 'Online' || formData.format === 'Hybrid') && (
                <>
                  <div className={styles.field}>
                    <label>Platform</label>
                    <select 
                      value={formData.platform}
                      onChange={e => setFormData({...formData, platform: e.target.value as any})}
                    >
                      <option value="Custom">Custom Link (YouTube Live, etc.)</option>
                      <option value="Teams">Microsoft Teams</option>
                      <option value="Zoom">Zoom</option>
                      <option value="Meet">Google Meet</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Streaming/Room URL</label>
                    <input 
                      type="url" 
                      placeholder="https://..." 
                      value={formData.meetingUrl}
                      onChange={e => handleUrlChange(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {(formData.format === 'Physical' || formData.format === 'Hybrid') && (
                <>
                  <div className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <input 
                      type="checkbox"
                      id="useCustomLocation"
                      checked={formData.useCustomLocation}
                      onChange={e => setFormData({...formData, useCustomLocation: e.target.checked})}
                      style={{ width: 'auto', cursor: 'pointer' }}
                    />
                    <label htmlFor="useCustomLocation" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9rem' }}>
                      Use Custom Event Location (e.g. crusade, outreach)
                    </label>
                  </div>

                  {formData.useCustomLocation ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', margin: '0.5rem 0' }}>
                      <div className={styles.field}>
                        <label>Custom Location Full Address</label>
                        <input 
                          placeholder="e.g. 123 Crusade Road, City (Google Address)" 
                          value={formData.customAddress}
                          onChange={e => setFormData({...formData, customAddress: e.target.value})}
                          required={formData.useCustomLocation}
                        />
                      </div>
                      <div className={styles.row}>
                        <div className={styles.field}>
                          <label>Latitude</label>
                          <input 
                            type="number"
                            step="any"
                            placeholder="e.g. 6.5244" 
                            value={formData.customLat}
                            onChange={e => setFormData({...formData, customLat: e.target.value})}
                            required={formData.useCustomLocation}
                          />
                        </div>
                        <div className={styles.field}>
                          <label>Longitude</label>
                          <input 
                            type="number"
                            step="any"
                            placeholder="e.g. 3.3792" 
                            value={formData.customLng}
                            onChange={e => setFormData({...formData, customLng: e.target.value})}
                            required={formData.useCustomLocation}
                          />
                        </div>
                      </div>
                      <div className={styles.field}>
                        <label>Geofence Radius (meters, optional)</label>
                        <input 
                          type="number"
                          placeholder="e.g. 200 (Default: church geofence)" 
                          value={formData.customGeofenceRadius}
                          onChange={e => setFormData({...formData, customGeofenceRadius: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.field}>
                      <label>Sanctuary/Room Location</label>
                      <input 
                        placeholder="e.g. Main Sanctuary" 
                        value={formData.locationName}
                        onChange={e => setFormData({...formData, locationName: e.target.value})}
                        required
                      />
                    </div>
                  )}
                </>
              )}

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
              
              {!editServiceId && (
                <div className={styles.occurrencesSection}>
                  <label>Multi-Date Occurrences (Optional)</label>
                  <div className={styles.occurrencesRow}>
                    <input 
                      type="date" 
                      value={newOccurDate} 
                      onChange={e => setNewOccurDate(e.target.value)}
                      min={minOccurDate}
                    />
                    <button 
                      type="button" 
                      onClick={handleAddOccurDate} 
                      className={styles.addOccurBtn}
                      disabled={!newOccurDate}
                    >
                      + Add Date
                    </button>
                  </div>
                  <p className={styles.hint}>
                    Schedule recurring dates for this service. Each will use the same start/end hours as above.
                  </p>
                  
                  {occurrencesDates.length > 0 && (
                    <div className={styles.occurrencesList}>
                      {occurrencesDates.map(dateStr => {
                        const [y, m, d] = dateStr.split('-').map(Number);
                        const dateObj = new Date(y, m - 1, d);
                        return (
                          <span key={dateStr} className={styles.occurrenceBadge}>
                            {format(dateObj, 'MMM d, yyyy')}
                            <button 
                              type="button" 
                              onClick={() => handleRemoveOccurDate(dateStr)}
                              className={styles.removeOccurBtn}
                              title="Remove date"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

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

              {/* Flyer Attachment Input */}
              <div className={styles.field}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={16} /> Service Flyer Picture (Optional)
                </label>
                <div className={styles.flyerUploadBox}>
                  <input 
                    type="file" 
                    id="serviceFlyerInput"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFlyerChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="serviceFlyerInput" className={styles.flyerSelectBtn}>
                    <Upload size={16} /> {flyerPreview ? "Replace Flyer Image" : "Choose Flyer (JPG, PNG, WebP ≤ 3MB)"}
                  </label>
                  {flyerPreview && (
                    <div className={styles.flyerFormPreview}>
                      <img src={flyerPreview} alt="Flyer preview" />
                      <button 
                        type="button" 
                        onClick={() => {
                          setFlyerFile(null);
                          setFlyerPreview(null);
                          setExistingFlyerStorageId(null);
                        }}
                        className={styles.removeFlyerBtn}
                      >
                        <X size={14} /> Remove
                      </button>
                    </div>
                  )}
                </div>
                <div className={styles.privacyNoticeBanner}>
                  ⚠️ <strong>Privacy Guardrail:</strong> Do not upload identifiable photos of minors or individuals who have not consented to digital storage.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                {editServiceId && (
                  <button 
                    type="button" 
                    onClick={() => { setIsAdding(false); setEditServiceId(null); }} 
                    className={styles.submitBtn}
                    style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', boxShadow: 'none' }}
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className={styles.submitBtn} style={{ flex: 2 }}>
                  {editServiceId ? "Save Changes" : "Create Service"}
                </button>
              </div>
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

      {/* Service Details Modal */}
      {selectedServiceId && (
        <ServiceDetailsModal
          serviceId={selectedServiceId}
          onClose={() => setSelectedServiceId(null)}
          onDuplicate={() => {
            const s = services.find((srv) => srv._id === selectedServiceId);
            if (s) handleDuplicate(s);
          }}
          onEdit={() => {
            const s = services.find((srv) => srv._id === selectedServiceId);
            if (s) handleEdit(s);
          }}
        />
      )}
    </div>
  );
};
