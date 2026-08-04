import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AttendanceScanner } from '../components/AttendanceScanner';
import { MeetingCard } from '../components/MeetingCard';
import { 
  Calendar, Plus, X, Video, MapPin, Clock, 
  Laptop, Info, ArrowLeft, Loader2, CheckCircle2, Upload, Image as ImageIcon 
} from 'lucide-react';
import { format } from 'date-fns';
import styles from './MeetingsPage.module.css';

export const MeetingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const me = useQuery(api.users.me);
  const meetings = useQuery(api.meetings.getMeetingsForUser);
  const createMeeting = useMutation(api.meetings.createMeeting);
  const checkIn = useMutation(api.meetings.checkInToMeeting);
  const generateMeetingFlyerUploadUrl = useMutation(api.meetings.generateMeetingFlyerUploadUrl);

  const departments = useQuery(api.departments.getDepartments) || []; 
  const allDepartments = useQuery(api.churches.getMyChurch) ? departments : []; // safely fallback
  const dbSubunits = useQuery(api.subunits.getSubunits) || []; 
  
  // Page state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);

  // Auto-open modal if requested via URL search param
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
      // Clean query parameter to prevent reopening on reload
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'ChurchWide' | 'Departmental' | 'Subunit'>('ChurchWide');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [targetSubunitId, setTargetSubunitId] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [formatType, setFormatType] = useState<'Physical' | 'Online' | 'Hybrid'>('Physical');
  const [platform, setPlatform] = useState<'Teams' | 'Zoom' | 'Meet' | 'Custom'>('Custom');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [locationName, setLocationName] = useState('');
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customGeofenceRadius, setCustomGeofenceRadius] = useState('');

  // Multi-date occurrences state
  const [occurrencesDates, setOccurrencesDates] = useState<string[]>([]);
  const [newOccurDate, setNewOccurDate] = useState('');

  // Scanner state
  const isScanning = searchParams.get('scan') === 'true';
  const scanMeetingId = searchParams.get('id');
  const [isProcessingCheckin, setIsProcessingCheckin] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);

  // Auto-Detect Platform URL
  const handleUrlChange = (val: string) => {
    setMeetingUrl(val);
    
    const isTeams = /teams\.microsoft\.com|teams\.live\.com/i.test(val);
    const isZoom = /zoom\.us|zoom\.com/i.test(val);
    const isMeet = /meet\.google\.com/i.test(val);

    if (isTeams) setPlatform('Teams');
    else if (isZoom) setPlatform('Zoom');
    else if (isMeet) setPlatform('Meet');
    else if (val) setPlatform('Custom');
  };

  const canSchedule = me && [
    'SuperAdmin', 'DeaconHead', 'PastoralOversight', 
    'DepartmentHead', 'DepartmentAssistant', 'DepartmentSecretary', 
    'SubunitLead', 'SubunitAssistant'
  ].includes(me.role || '');

  // Set defaults for scope based on roles
  useEffect(() => {
    if (me) {
      if (me.role === 'SubunitLead' || me.role === 'SubunitAssistant') {
        setScope('Subunit');
        setTargetDeptId(me.departmentId || '');
        setTargetSubunitId(me.subunitId || '');
      } else if (me.role === 'DepartmentHead' || me.role === 'DepartmentAssistant' || me.role === 'DepartmentSecretary' || me.role === 'PastoralOversight') {
        setScope('Departmental');
        setTargetDeptId(me.departmentId || '');
      }
    }
  }, [me]);

  const handleDuplicateMeeting = (meeting: any) => {
    setName(meeting.name);
    setDescription(meeting.description || '');
    setScope(meeting.scope);
    setTargetDeptId(meeting.departmentId || '');
    setTargetSubunitId(meeting.subunitId || '');
    setFormatType(meeting.format);
    setPlatform(meeting.platform);
    setMeetingUrl(meeting.meetingUrl || '');
    setLocationName(meeting.locationName || '');
    setUseCustomLocation(!!meeting.customLocation);
    setCustomLat(meeting.customLocation?.lat?.toString() || '');
    setCustomLng(meeting.customLocation?.lng?.toString() || '');
    setCustomAddress(meeting.customLocation?.address || '');
    setCustomGeofenceRadius(meeting.customLocation?.geofenceRadius?.toString() || '');

    const offset = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    const newStart = new Date(meeting.startTime + offset);
    const newEnd = new Date(meeting.endTime + offset);
    
    // Format to local ISO (YYYY-MM-DDTHH:MM) using target date timezone offsets for accuracy
    const tzOffsetStart = newStart.getTimezoneOffset() * 60000;
    const tzOffsetEnd = newEnd.getTimezoneOffset() * 60000;
    setStartDateStr(new Date(newStart.getTime() - tzOffsetStart).toISOString().slice(0, 16));
    setEndDateStr(new Date(newEnd.getTime() - tzOffsetEnd).toISOString().slice(0, 16));

    // Clear occurrences for duplicate base
    setOccurrencesDates([]);
    setShowCreateModal(true);
  };

  const handleAddOccurDate = () => {
    if (!newOccurDate) return;
    if (occurrencesDates.includes(newOccurDate)) {
      setSubmitError('This occurrence date is already added.');
      return;
    }
    if (startDateStr) {
      const parsedBase = new Date(startDateStr);
      if (!isNaN(parsedBase.getTime())) {
        const baseDate = format(parsedBase, 'yyyy-MM-dd');
        if (baseDate === newOccurDate) {
          setSubmitError('The base date is already included as the first occurrence.');
          return;
        }
      }
    }
    setOccurrencesDates(prev => [...prev, newOccurDate].sort());
    setNewOccurDate('');
    setSubmitError(null);
  };

  const handleRemoveOccurDate = (dateStr: string) => {
    setOccurrencesDates(prev => prev.filter(d => d !== dateStr));
  };

  const handleFlyerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setSubmitError("Invalid file format. Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setSubmitError("File size exceeds 3MB limit. Please upload a smaller flyer image.");
      return;
    }

    setFlyerFile(file);
    setFlyerPreview(URL.createObjectURL(file));
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();

    if (isNaN(start) || isNaN(end)) {
      setSubmitError('Please enter valid start and end dates.');
      setIsSubmitting(false);
      return;
    }

    if (end <= start) {
      setSubmitError('End time must be after start time.');
      setIsSubmitting(false);
      return;
    }

    // Build occurrences if any additional dates selected
    let occurrences = undefined;
    if (occurrencesDates.length > 0) {
      const duration = end - start;
      const startBase = new Date(start);
      occurrences = [
        { startTime: start, endTime: end },
        ...occurrencesDates.map(dateStr => {
          const [year, month, day] = dateStr.split('-').map(Number);
          const occurDate = new Date(
            year,
            month - 1,
            day,
            startBase.getHours(),
            startBase.getMinutes(),
            startBase.getSeconds(),
            startBase.getMilliseconds()
          );
          const endOccur = new Date(occurDate.getTime() + duration);
          return {
            startTime: occurDate.getTime(),
            endTime: endOccur.getTime()
          };
        })
      ];
    }

    // Custom Location Parsing and Validation
    let customLocation = undefined;
    if (useCustomLocation) {
      if (!customAddress) {
        setSubmitError("Please enter a custom location address.");
        setIsSubmitting(false);
        return;
      }
      const lat = parseFloat(customLat);
      const lng = parseFloat(customLng);
      if (isNaN(lat) || isNaN(lng)) {
        setSubmitError("Please enter valid latitude and longitude numbers.");
        setIsSubmitting(false);
        return;
      }
      customLocation = {
        lat,
        lng,
        address: customAddress,
        geofenceRadius: customGeofenceRadius ? parseInt(customGeofenceRadius, 10) : undefined
      };
    }

    let flyerStorageId: any = undefined;

    try {
      if (flyerFile) {
        setIsUploadingFlyer(true);
        const postUrl = await generateMeetingFlyerUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": flyerFile.type },
          body: flyerFile,
        });
        const { storageId } = await result.json();
        flyerStorageId = storageId;
        setIsUploadingFlyer(false);
      }

      await createMeeting({
        name,
        description: description || undefined,
        scope,
        departmentId: scope !== 'ChurchWide' ? (targetDeptId as any) : undefined,
        subunitId: scope === 'Subunit' ? (targetSubunitId as any) : undefined,
        startTime: start,
        endTime: end,
        format: formatType,
        platform,
        meetingUrl: (formatType === 'Online' || formatType === 'Hybrid') ? meetingUrl : undefined,
        locationName: (formatType === 'Physical' || formatType === 'Hybrid') ? locationName : undefined,
        occurrences,
        customLocation,
        flyerStorageId,
      });

      // Clear Form
      setName('');
      setDescription('');
      setStartDateStr('');
      setEndDateStr('');
      setMeetingUrl('');
      setFlyerFile(null);
      setFlyerPreview(null);
      setLocationName('');
      setUseCustomLocation(false);
      setCustomLat('');
      setCustomLng('');
      setCustomAddress('');
      setCustomGeofenceRadius('');
      setOccurrencesDates([]);
      setNewOccurDate('');
      setShowCreateModal(false);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to schedule meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhysicalScan = async (decodedText: string, location: GeolocationPosition | null) => {
    setIsProcessingCheckin(true);
    setCheckinError(null);
    try {
      await checkIn({
        meetingId: scanMeetingId as any,
        attendanceType: 'physical',
        qrSecret: decodedText,
        lat: location?.coords.latitude,
        lng: location?.coords.longitude,
        accuracy: location?.coords.accuracy,
      });
      setCheckinSuccess(true);
      setTimeout(() => {
        setCheckinSuccess(false);
        navigate('/meetings');
      }, 3000);
    } catch (err: any) {
      setCheckinError(err.message || 'Check-in failed');
      throw err; // throw so scanner success badge doesn't fire prematurely
    } finally {
      setIsProcessingCheckin(false);
    }
  };

  const minOccurDate = (() => {
    if (startDateStr) {
      const parsed = new Date(startDateStr);
      if (!isNaN(parsed.getTime())) {
        return format(parsed, 'yyyy-MM-dd');
      }
    }
    return format(new Date(), 'yyyy-MM-dd');
  })();

  if (isScanning) {
    return (
      <div className={styles.scannerContainer}>
        <div className={styles.scannerHeader}>
          <button onClick={() => navigate('/meetings')} className={styles.backBtn}>
            <ArrowLeft size={20} />
            Back to Meetings
          </button>
          <h2>Venue QR Check-In</h2>
        </div>

        <div className={styles.scannerFrame}>
          {checkinSuccess ? (
            <div className={styles.successScreen}>
              <CheckCircle2 size={64} className="text-green-500 mb-4 animate-bounce" />
              <h3>Check-In Successful!</h3>
              <p>Your physical presence has been verified and registered.</p>
            </div>
          ) : (
            <>
              {checkinError && <p className={styles.scanErrorText}>{checkinError}</p>}
              <AttendanceScanner onScan={handlePhysicalScan} isProcessing={isProcessingCheckin} />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Internal Meetings</h1>
          <p>Devotionals, prayer clusters, training sessions, and department assemblies.</p>
        </div>
        {canSchedule && (
          <button onClick={() => setShowCreateModal(true)} className={styles.scheduleBtn}>
            <Plus size={18} />
            Schedule Meeting
          </button>
        )}
      </header>

      {meetings === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-purple-600" size={32} />
        </div>
      ) : meetings.length === 0 ? (
        <div className={styles.emptyState}>
          <Calendar size={48} className="opacity-20 mb-4" />
          <h3>No Meetings Scheduled</h3>
          <p>You have no upcoming departmental or church-wide meetings scheduled.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {meetings.map(meeting => (
            <MeetingCard 
              key={meeting._id} 
              meeting={meeting as any} 
              onDuplicate={handleDuplicateMeeting}
            />
          ))}
        </div>
      )}

      {/* Scheduler Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Schedule Meeting</h3>
              <button onClick={() => setShowCreateModal(false)} className={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {submitError && <p className={styles.formError}>{submitError}</p>}

              <div className={styles.formGroup}>
                <label>Meeting Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Choir Rehearsal, Media Prep" 
                  required 
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description (Optional)</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Details or agenda for the meeting..."
                  rows={2}
                />
              </div>

              {me?.role === 'SuperAdmin' && (
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Scope</label>
                    <select value={scope} onChange={e => setScope(e.target.value as any)}>
                      <option value="ChurchWide">Church-wide</option>
                      <option value="Departmental">Department-only</option>
                      <option value="Subunit">Subunit-only</option>
                    </select>
                  </div>
                </div>
              )}

              {scope !== 'ChurchWide' && me?.role === 'SuperAdmin' && (
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Target Department</label>
                    <select value={targetDeptId} onChange={e => setTargetDeptId(e.target.value)} required>
                      <option value="">Select Department</option>
                      {allDepartments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>

                  {scope === 'Subunit' && (
                    <div className={styles.formGroup}>
                      <label>Target Subunit</label>
                      <select value={targetSubunitId} onChange={e => setTargetSubunitId(e.target.value)} required>
                        <option value="">Select Subunit</option>
                        {dbSubunits.filter((s: any) => s.departmentId === targetDeptId).map((s: any) => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Start Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={startDateStr} 
                    onChange={e => setStartDateStr(e.target.value)} 
                    required 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={endDateStr} 
                    onChange={e => setEndDateStr(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              {/* Multi-Date Occurrences Option */}
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
                <p className={styles.hintText}>
                  Use this to schedule recurring or random dates for the same gathering series. Each date uses the same start/end hours as above.
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

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Meeting Format</label>
                  <select value={formatType} onChange={e => setFormatType(e.target.value as any)}>
                    <option value="Physical">Physical Only</option>
                    <option value="Online">Online Only</option>
                    <option value="Hybrid">Hybrid (Both)</option>
                  </select>
                </div>

                {(formatType === 'Online' || formatType === 'Hybrid') && (
                  <div className={styles.formGroup}>
                    <label>Platform</label>
                    <select value={platform} onChange={e => setPlatform(e.target.value as any)}>
                      <option value="Teams">Microsoft Teams</option>
                      <option value="Zoom">Zoom</option>
                      <option value="Meet">Google Meet</option>
                      <option value="Custom">Custom/Other</option>
                    </select>
                  </div>
                )}
              </div>

              {(formatType === 'Online' || formatType === 'Hybrid') && (
                <div className={styles.formGroup}>
                  <label>Meeting Link</label>
                  <input 
                    type="url" 
                    value={meetingUrl} 
                    onChange={e => handleUrlChange(e.target.value)} 
                    placeholder="https://teams.microsoft.com/..." 
                    required 
                  />
                  <p className={styles.hintText}>Auto-detects Zoom, Microsoft Teams, and Google Meet.</p>
                </div>
              )}

              {(formatType === 'Physical' || formatType === 'Hybrid') && (
                <>
                  <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <input 
                      type="checkbox"
                      id="useCustomLocationMeeting"
                      checked={useCustomLocation}
                      onChange={e => setUseCustomLocation(e.target.checked)}
                      style={{ width: 'auto', cursor: 'pointer' }}
                    />
                    <label htmlFor="useCustomLocationMeeting" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9rem' }}>
                      Use Custom Event Location (e.g. crusade, outreach)
                    </label>
                  </div>

                  {useCustomLocation ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', margin: '0.5rem 0' }}>
                      <div className={styles.formGroup}>
                        <label>Custom Location Full Address</label>
                        <input 
                          placeholder="e.g. 123 Crusade Road, City (Google Address)" 
                          value={customAddress}
                          onChange={e => setCustomAddress(e.target.value)}
                          required={useCustomLocation}
                        />
                      </div>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Latitude</label>
                          <input 
                            type="number"
                            step="any"
                            placeholder="e.g. 6.5244" 
                            value={customLat}
                            onChange={e => setCustomLat(e.target.value)}
                            required={useCustomLocation}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Longitude</label>
                          <input 
                            type="number"
                            step="any"
                            placeholder="e.g. 3.3792" 
                            value={customLng}
                            onChange={e => setCustomLng(e.target.value)}
                            required={useCustomLocation}
                          />
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Geofence Radius (meters, optional)</label>
                        <input 
                          type="number"
                          placeholder="e.g. 200 (Default: church geofence)" 
                          value={customGeofenceRadius}
                          onChange={e => setCustomGeofenceRadius(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.formGroup}>
                      <label>Sanctuary/Room Location</label>
                      <input 
                        type="text" 
                        value={locationName} 
                        onChange={e => setLocationName(e.target.value)} 
                        placeholder="e.g. Seminar Room B, Main Auditorium" 
                        required 
                      />
                    </div>
                  )}
                </>
              )}

              {/* Gathering Flyer Picture Upload */}
              <div className={styles.formGroup} style={{ marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={16} /> Gathering Flyer Picture (Optional)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="file" 
                    id="meetingFlyerInput"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFlyerChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="meetingFlyerInput" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--bg-secondary)',
                    border: '1px dashed var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}>
                    <Upload size={16} /> {flyerPreview ? "Replace Flyer Image" : "Choose Flyer (JPG, PNG, WebP ≤ 3MB)"}
                  </label>

                  {flyerPreview && (
                    <div style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      maxHeight: '180px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img src={flyerPreview} alt="Flyer preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'contain' }} />
                      <button 
                        type="button" 
                        onClick={() => {
                          setFlyerFile(null);
                          setFlyerPreview(null);
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <X size={14} /> Remove
                      </button>
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#b45309',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  lineHeight: '1.4',
                  marginTop: '0.25rem'
                }}>
                  ⚠️ <strong>Privacy Guardrail:</strong> Do not upload identifiable photos of minors or individuals who have not consented to digital storage.
                </div>
              </div>

              <button type="submit" disabled={isSubmitting || isUploadingFlyer} className={styles.submitBtn}>
                {isSubmitting || isUploadingFlyer ? <Loader2 className="animate-spin" size={18} /> : 'Create Meeting'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
