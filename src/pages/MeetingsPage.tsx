import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AttendanceScanner } from '../components/AttendanceScanner';
import { MeetingCard } from '../components/MeetingCard';
import { 
  Calendar, Plus, X, Video, MapPin, Clock, 
  Laptop, Info, ArrowLeft, Loader2, CheckCircle2 
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

  const departments = useQuery(api.departments.getDepartments) || []; 
  const allDepartments = useQuery(api.churches.getMyChurch) ? departments : []; // safely fallback
  const dbSubunits = useQuery(api.subunits.getSubunits) || []; 
  
  // Page state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

    try {
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
      });

      // Clear Form
      setName('');
      setDescription('');
      setStartDateStr('');
      setEndDateStr('');
      setMeetingUrl('');
      setLocationName('');
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
            <MeetingCard key={meeting._id} meeting={meeting as any} />
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

              <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Create Meeting'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
