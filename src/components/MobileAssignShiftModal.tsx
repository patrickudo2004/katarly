import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { X, Check, Loader2, Calendar, User, ShieldAlert, Search, ArrowLeft, Users } from 'lucide-react';
import { format } from 'date-fns';
import styles from './MobileAssignShiftModal.module.css';
import { UrgentConfirmModal } from './UrgentConfirmModal';

interface MobileAssignShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAssignShiftModal: React.FC<MobileAssignShiftModalProps> = ({ isOpen, onClose }) => {
  const me = useQuery(api.users.me);
  const upcomingServices = useQuery(api.services.getUpcomingServices);
  const allUsers = useQuery(api.users.getVisibleUsers, {});
  const timeOffRequests = useQuery(api.timeOff.getRequests);
  const departments = useQuery(api.departments.getDepartments);
  const subunits = useQuery(api.subunits.getSubunits);
  const createRotaEntry = useMutation(api.rotas.createRotaEntry);

  // Form State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedSubunitId, setSelectedSubunitId] = useState<string>('');
  const [roleName, setRoleName] = useState<string>('');
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>('');
  const [allowCrossDept, setAllowCrossDept] = useState<boolean>(false);
  
  const [volunteerSearch, setVolunteerSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Confirm modal state — replaces window.confirm
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    hoursUntil: number;
  }>({ open: false, hoursUntil: 0 });

  const closeConfirm = () => setConfirmModal({ open: false, hoursUntil: 0 });

  // Fetch details of the selected service to verify double-bookings
  const serviceDetails = useQuery(
    api.services.getServiceDetails,
    selectedServiceId ? { serviceId: selectedServiceId as any } : "skip"
  );

  // Initialize role scope constraints based on current user role
  React.useEffect(() => {
    if (me) {
      if (['SubunitLead', 'SubunitAssistant'].includes(me.role || '')) {
        if (me.departmentId) setSelectedDeptId(me.departmentId);
        if (me.subunitId) setSelectedSubunitId(me.subunitId);
      } else if (['DepartmentHead', 'DepartmentAssistant', 'DepartmentSecretary'].includes(me.role || '')) {
        if (me.departmentId) setSelectedDeptId(me.departmentId);
      }
    }
  }, [me]);

  const activeService = useMemo(() => {
    return upcomingServices?.find(s => s._id === selectedServiceId);
  }, [upcomingServices, selectedServiceId]);

  // Filter subunits by department
  const filteredSubunits = useMemo(() => {
    if (!subunits || !selectedDeptId) return [];
    return subunits.filter(s => s.departmentId === selectedDeptId);
  }, [subunits, selectedDeptId]);

  // Check if a volunteer is already scheduled for this service
  const isVolunteerAlreadyScheduled = (userId: string) => {
    return (serviceDetails?.rotas || []).some((r: any) => r.userId === userId);
  };

  // Check if a volunteer has an approved leave request covering the service
  const isVolunteerOnLeave = (userId: string) => {
    if (!activeService) return false;
    const serviceTime = activeService.startTime;
    return (timeOffRequests || []).some(
      (req: any) =>
        req.userId === userId &&
        req.status === "Approved" &&
        serviceTime >= req.startDate &&
        serviceTime <= req.endDate
    );
  };

  // Filter volunteers based on selected department/subunit and search term
  const eligibleVolunteers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => {
      // Filter by status (must be active)
      if (u.status === 'archived') return false;

      // Filter by department
      if (selectedDeptId && u.departmentId !== selectedDeptId) return false;

      // Filter by subunit
      if (selectedSubunitId && u.subunitId !== selectedSubunitId) return false;

      // Search term
      if (volunteerSearch) {
        const query = volunteerSearch.toLowerCase();
        return (
          (u.name || '').toLowerCase().includes(query) ||
          (u.email || '').toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [allUsers, selectedDeptId, selectedSubunitId, volunteerSearch]);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (step === 1 && !selectedServiceId) return;
    if (step === 2) {
      if (!selectedDeptId) return;
      // If user has subunits in department, but hasn't selected one
      if (filteredSubunits.length > 0 && !selectedSubunitId) return;
    }
    if (step === 3 && !roleName.trim()) return;

    setStep((prev) => (prev + 1) as any);
  };

  const handleBackStep = () => {
    setStep((prev) => (prev - 1) as any);
  };

  const resetForm = () => {
    setStep(1);
    setSelectedServiceId('');
    setRoleName('');
    setSelectedVolunteerId('');
    setAllowCrossDept(false);
    setVolunteerSearch('');
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!selectedServiceId || !selectedDeptId || !roleName.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    // < 24h urgent scheduling guardrail — show branded modal instead of window.confirm
    if (activeService) {
      const hoursUntilService = (activeService.startTime - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilService > 0 && hoursUntilService < 24) {
        setConfirmModal({ open: true, hoursUntil: Math.round(hoursUntilService) });
        return; // modal's onConfirm will call doSubmit
      }
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await createRotaEntry({
        serviceId: selectedServiceId as any,
        departmentId: selectedDeptId as any,
        subunitId: selectedSubunitId ? (selectedSubunitId as any) : undefined,
        userId: selectedVolunteerId ? (selectedVolunteerId as any) : undefined,
        role: roleName.trim(),
        allowCrossDept: selectedVolunteerId ? undefined : allowCrossDept,
      });
      
      setSuccessMsg('Shift successfully assigned!');
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign shift. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatServiceDate = (timestamp: number) => {
    try {
      return format(timestamp, 'EEEE, MMM d @ p');
    } catch (e) {
      return 'TBD';
    }
  };

  return (
    <>
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className={styles.header}>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button className={styles.backBtn} onClick={handleBackStep}>
                <ArrowLeft size={20} />
              </button>
            )}
            <h2>Assign Shift</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Tracker */}
        <div className={styles.progress}>
          <div className={`${styles.progressBar} ${styles[`step${step}`]}`}></div>
        </div>

        {/* Form Body */}
        <div className={styles.body}>
          {successMsg ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <Check size={36} />
              </div>
              <h3>{successMsg}</h3>
              <p>Volunteers will receive in-app and email notifications immediately.</p>
            </div>
          ) : (
            <>
              {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

              {/* STEP 1: Select Service */}
              {step === 1 && (
                <div className={styles.stepContainer}>
                  <h3>Select Service</h3>
                  <p className={styles.stepDesc}>Which upcoming service is this shift for?</p>
                  
                  {upcomingServices === undefined ? (
                    <div className={styles.loaderContainer}>
                      <Loader2 className="animate-spin text-purple-600" size={24} />
                    </div>
                  ) : upcomingServices.length === 0 ? (
                    <p className={styles.emptyState}>No upcoming services found.</p>
                  ) : (
                    <div className={styles.radioList}>
                      {upcomingServices.map((service) => (
                        <label 
                          key={service._id} 
                          className={`${styles.radioCard} ${selectedServiceId === service._id ? styles.selectedCard : ''}`}
                        >
                          <input
                            type="radio"
                            name="service"
                            value={service._id}
                            checked={selectedServiceId === service._id}
                            onChange={() => setSelectedServiceId(service._id)}
                            hidden
                          />
                          <Calendar size={20} className={styles.cardIcon} />
                          <div>
                            <strong>{service.name}</strong>
                            <span>{formatServiceDate(service.startTime)}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <button 
                    className={styles.nextBtn} 
                    disabled={!selectedServiceId}
                    onClick={handleNextStep}
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* STEP 2: Select Team Scoping */}
              {step === 2 && (
                <div className={styles.stepContainer}>
                  <h3>Select Team Scoping</h3>
                  <p className={styles.stepDesc}>Verify the department and subunit for this shift.</p>

                  <div className={styles.formGroup}>
                    <label>Department</label>
                    <select
                      value={selectedDeptId}
                      onChange={(e) => {
                        setSelectedDeptId(e.target.value);
                        setSelectedSubunitId('');
                      }}
                      disabled={['SubunitLead', 'SubunitAssistant', 'DepartmentHead', 'DepartmentAssistant', 'DepartmentSecretary'].includes(me?.role || '')}
                    >
                      <option value="">-- Choose Department --</option>
                      {departments?.map((dept) => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedDeptId && filteredSubunits.length > 0 && (
                    <div className={styles.formGroup}>
                      <label>Subunit (Team)</label>
                      <select
                        value={selectedSubunitId}
                        onChange={(e) => setSelectedSubunitId(e.target.value)}
                        disabled={['SubunitLead', 'SubunitAssistant'].includes(me?.role || '')}
                      >
                        <option value="">-- Choose Subunit --</option>
                        {filteredSubunits.map((sub) => (
                          <option key={sub._id} value={sub._id}>{sub.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button 
                    className={styles.nextBtn} 
                    disabled={!selectedDeptId || (filteredSubunits.length > 0 && !selectedSubunitId)}
                    onClick={handleNextStep}
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* STEP 3: Define Role */}
              {step === 3 && (
                <div className={styles.stepContainer}>
                  <h3>Specify Role</h3>
                  <p className={styles.stepDesc}>What role or position will the volunteer perform?</p>

                  <div className={styles.formGroup}>
                    <input
                      type="text"
                      className={styles.textInput}
                      placeholder="e.g., Camera Operator, Lead Vocalist"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className={styles.chipsContainer}>
                    <span className={styles.chipLabel}>Suggestions:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['Leader', 'Assistant', 'Operator', 'Supervisor', 'Support'].map(suggestion => (
                        <button
                          key={suggestion}
                          type="button"
                          className={styles.chip}
                          onClick={() => setRoleName(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    className={styles.nextBtn} 
                    disabled={!roleName.trim()}
                    onClick={handleNextStep}
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* STEP 4: Select Volunteer & Submit */}
              {step === 4 && (
                <div className={styles.stepContainer}>
                  <h3>Assign Volunteer</h3>
                  <p className={styles.stepDesc}>Select a workforce member to fill this slot.</p>

                  <div className={styles.searchBar}>
                    <Search size={18} />
                    <input 
                      type="text" 
                      placeholder="Search member by name..."
                      value={volunteerSearch}
                      onChange={(e) => setVolunteerSearch(e.target.value)}
                    />
                  </div>

                  <div className={styles.volunteerList}>
                    {/* Open Shift Option */}
                    <div 
                      onClick={() => setSelectedVolunteerId('')}
                      className={`${styles.volunteerCard} ${selectedVolunteerId === '' ? styles.selectedCard : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={styles.avatarMini} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                          🌐
                        </div>
                        <div className={styles.volunteerInfo}>
                          <span className={styles.volunteerName}>Leave Unassigned (Open Shift)</span>
                          <span className={styles.volunteerRole}>Publish to Marketplace</span>
                        </div>
                      </div>
                      {selectedVolunteerId === '' && (
                        <div className={styles.checkIcon}>
                          <Check size={18} />
                        </div>
                      )}
                    </div>

                    {allUsers === undefined ? (
                      <div className={styles.loaderContainer}>
                        <Loader2 className="animate-spin text-purple-600" size={24} />
                      </div>
                    ) : eligibleVolunteers.length === 0 ? (
                      <p className={styles.emptyState}>No volunteers found in this team scope.</p>
                    ) : (
                      eligibleVolunteers.map((user) => {
                        const isScheduled = isVolunteerAlreadyScheduled(user._id);
                        const isOnLeave = isVolunteerOnLeave(user._id);
                        const isSelected = selectedVolunteerId === user._id;
                        
                        return (
                          <div 
                            key={user._id} 
                            onClick={() => {
                              if (!isScheduled) setSelectedVolunteerId(user._id);
                            }}
                            className={`${styles.volunteerCard} ${isSelected ? styles.selectedCard : ''} ${isScheduled ? styles.disabledCard : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={styles.avatarMini}>
                                {user.name?.[0] || '?'}
                              </div>
                              <div className={styles.volunteerInfo}>
                                <span className={styles.volunteerName}>{user.name || 'Unknown'}</span>
                                <span className={styles.volunteerRole}>{user.role || 'Volunteer'}</span>
                                {isOnLeave && (
                                  <span className={styles.warningBadge}>
                                    <ShieldAlert size={12} /> On Approved Leave
                                  </span>
                                )}
                                {isScheduled && (
                                  <span className={styles.conflictBadge}>
                                    <ShieldAlert size={12} /> Already Scheduled
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className={styles.checkIcon}>
                                <Check size={18} />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {selectedVolunteerId === '' && (
                    <div className={styles.toggleContainer}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '12px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Allow Cross-Department Claims</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Allow volunteers from any department to claim this shift.</span>
                      </div>
                      <label className={styles.switch}>
                        <input 
                          type="checkbox" 
                          checked={allowCrossDept} 
                          onChange={e => setAllowCrossDept(e.target.checked)}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                  )}

                  <button 
                    className={styles.submitBtn} 
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Scheduling...
                      </>
                    ) : selectedVolunteerId ? (
                      'Assign Shift'
                    ) : (
                      'Create Open Shift'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

    {/* Urgent confirm modal — rendered outside bottom sheet so it stacks above it */}
    <UrgentConfirmModal
      isOpen={confirmModal.open}
      severity="urgent"
      title="Urgent Scheduling Alert"
      message={`This service starts in approximately ${confirmModal.hoursUntil} hour(s). This is an urgent scheduling action.`}
      detail="The volunteer will receive a high-priority email notification immediately after assignment."
      confirmLabel="Yes, Schedule Now"
      cancelLabel="Go Back"
      onConfirm={async () => { closeConfirm(); await doSubmit(); }}
      onCancel={closeConfirm}
    />
  </>
  );
};

