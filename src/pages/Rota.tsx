import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Plus,
  Clock,
  AlertCircle,
  X,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  UserPlus,
  Users
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  addWeeks, 
  subWeeks, 
  isSameDay, 
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  getYear
} from 'date-fns';
import styles from './Rota.module.css';
import { RoleBadge } from '../components/RoleBadge';
import { UrgentConfirmModal } from '../components/UrgentConfirmModal';

type ViewMode = 'week' | 'month' | 'year';

export const Rota: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const me = useQuery(api.users.me);
  const isVolunteer = me?.role === 'Volunteer';

  // Range calculations based on viewMode
  const { startDate, endDate } = useMemo(() => {
    if (viewMode === 'week') {
      return { 
        startDate: startOfWeek(currentDate).getTime(),
        endDate: endOfWeek(currentDate).getTime() 
      };
    } else if (viewMode === 'month') {
      return {
        startDate: startOfMonth(currentDate).getTime(),
        endDate: endOfMonth(currentDate).getTime()
      };
    } else {
      return {
        startDate: startOfYear(currentDate).getTime(),
        endDate: endOfYear(currentDate).getTime()
      };
    }
  }, [currentDate, viewMode]);

  // Queries
  const rotaEntries = useQuery(api.rotas.getRotaForRange, { startDate, endDate });
  const coverageStats = useQuery(api.rotas.getCoverageStats, { year: getYear(currentDate) });
  const allUsers = useQuery(api.users.getVisibleUsers, {});
  const services = useQuery(api.services.getChurchServices);
  const subunits = useQuery(api.subunits.getSubunits);
  const departments = useQuery(api.departments.getDepartments);
  const sidebarStats = useQuery(api.reports.getRotaSidebarStats);

  // Mutations
  const createShift = useMutation(api.rotas.createRotaEntry);
  const assignShift = useMutation(api.rotas.assignUserToShift);
  const removeShift = useMutation(api.rotas.removeRotaEntry);
  const createService = useMutation(api.services.createService);

  // State
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isLoggingKpi, setIsLoggingKpi] = useState<any>(null); // holds the entry
  const [kpiForm, setKpiForm] = useState({ score: 'Good', note: '' });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [rosterSearch, setRosterSearch] = useState('');

  // Confirm modal state — replaces all window.confirm/alert calls
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    severity: 'urgent' | 'warning' | 'danger';
    title: string;
    message: string;
    detail?: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    open: false,
    severity: 'warning',
    title: '',
    message: '',
    confirmLabel: 'Proceed',
    onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, open: false }));

  const [newShift, setNewShift] = useState({
    userId: '',
    serviceId: '',
    departmentId: '',
    subunitId: '',
    role: '',
    allowCrossDept: false
  });

  const [newService, setNewService] = useState({
    name: '',
    time: '09:00',
    endTime: '11:00',
    qrType: 'Unique' as 'Unique' | 'Generic'
  });

  const filteredRoster = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => 
      (u.name?.toLowerCase() || '').includes(rosterSearch.toLowerCase()) ||
      (u.email?.toLowerCase() || '').includes(rosterSearch.toLowerCase())
    );
  }, [allUsers, rosterSearch]);

  // Handlers
  const handleNav = (dir: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(prev => dir === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
    } else if (viewMode === 'month') {
      setCurrentDate(prev => dir === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    } else {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setFullYear(d.getFullYear() + (dir === 'prev' ? -1 : 1));
        return d;
      });
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;
    try {
      const [hours, minutes] = newService.time.split(':').map(Number);
      const [endHours, endMinutes] = newService.endTime.split(':').map(Number);
      const startTime = new Date(selectedDay);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = new Date(selectedDay);
      endTime.setHours(endHours, endMinutes, 0, 0);

      await createService({
        name: newService.name,
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
        qrType: newService.qrType
      });
      setIsAddingService(false);
      setNewService({ name: '', time: '09:00', endTime: '11:00', qrType: 'Unique' });
    } catch (err) {
      alert("Failed to create service");
    }
  };

  const doCreateShift = async () => {
    try {
      await createShift({
        serviceId: newShift.serviceId as any,
        departmentId: newShift.departmentId as any,
        ...(newShift.userId ? { userId: newShift.userId as any } : {}),
        ...(newShift.subunitId ? { subunitId: newShift.subunitId as any } : {}),
        role: newShift.role,
        allowCrossDept: newShift.userId ? undefined : newShift.allowCrossDept,
      });
      setIsAssigning(false);
      setNewShift({ userId: '', serviceId: '', departmentId: '', subunitId: '', role: '', allowCrossDept: false });
    } catch (err: any) {
      setConfirmModal(prev => ({ ...prev, open: false }));
      setConfirmModal({
        open: true,
        severity: 'danger',
        title: 'Assignment Failed',
        message: err.message || 'Failed to assign shift. Please check for conflicts and try again.',
        confirmLabel: 'OK',
        onConfirm: closeConfirm,
      });
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.serviceId) return;
    const selectedService = services?.find(s => s._id === newShift.serviceId);
    const hoursUntilService = selectedService
      ? (selectedService.startTime - Date.now()) / (1000 * 60 * 60)
      : Infinity;

    if (hoursUntilService > 0 && hoursUntilService < 24) {
      setConfirmModal({
        open: true,
        severity: 'urgent',
        title: 'Urgent Scheduling Alert',
        message: `This service starts in approximately ${Math.round(hoursUntilService)} hour(s). Scheduling this close to service time is an urgent action.`,
        detail: 'The volunteer will receive a high-priority email notification immediately.',
        confirmLabel: 'Yes, Proceed',
        onConfirm: async () => { closeConfirm(); await doCreateShift(); },
      });
    } else {
      await doCreateShift();
    }
  };

  const handleDelete = (id: any) => {
    setConfirmModal({
      open: true,
      severity: 'danger',
      title: 'Remove Shift Assignment',
      message: 'Are you sure you want to remove this shift assignment? The slot will become unassigned.',
      confirmLabel: 'Remove Shift',
      onConfirm: async () => { closeConfirm(); await removeShift({ rotaId: id }); },
    });
  };

  const doAssignDrop = async (rotaId: string, userId: string) => {
    try {
      await assignShift({ rotaId: rotaId as any, userId: userId as any });
    } catch (err: any) {
      setConfirmModal({
        open: true,
        severity: 'danger',
        title: 'Assignment Rejected',
        message: err.message || 'A conflict was detected. This volunteer could not be assigned.',
        confirmLabel: 'OK',
        onConfirm: closeConfirm,
      });
    }
  };

  const handleDrop = (rotaId: string, userId: string) => {
    setDragOverId(null);
    const targetEntry = rotaEntries?.find(r => r._id === rotaId);
    const targetService = targetEntry ? services?.find(s => s._id === targetEntry.serviceId) : null;
    const hoursUntilService = targetService
      ? (targetService.startTime - Date.now()) / (1000 * 60 * 60)
      : Infinity;

    if (targetService && hoursUntilService > 0 && hoursUntilService < 24) {
      setConfirmModal({
        open: true,
        severity: 'urgent',
        title: 'Urgent Assignment',
        message: `"${targetService.name}" starts in less than 24 hours. This is an urgent scheduling action.`,
        detail: 'The volunteer will receive a high-priority email notification immediately.',
        confirmLabel: 'Assign Anyway',
        onConfirm: async () => { closeConfirm(); await doAssignDrop(rotaId, userId); },
      });
    } else {
      doAssignDrop(rotaId, userId);
    }
  };

  const logKPIForUser = useMutation(api.probation.logKPIForUser);

  const handleLogKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggingKpi) return;
    
    try {
      await logKPIForUser({
        userId: isLoggingKpi.userId,
        score: kpiForm.score as any,
        note: kpiForm.note
      });
      alert("KPI Logging has been registered.");
      setIsLoggingKpi(null);
      setKpiForm({ score: 'Good', note: '' });
    } catch (err: any) {
      alert("Failed to log KPI: " + err.message);
    }
  };

  if (rotaEntries === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  // View Renderers
  const renderWeekView = () => {
    const weekDays = eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) });
    return (
      <div className={styles.weekGrid}>
        {weekDays.map(day => {
          const hasService = services?.some(s => isSameDay(new Date(s.startTime), day));
          return (
            <div key={day.toString()} className={styles.dayColumn}>
              <div className={`${styles.dayHeader} ${isSameDay(day, new Date()) ? styles.today : ''} ${hasService ? styles.hasService : ''}`}>
                <div className={styles.dayInfo}>
                  <span className={styles.dayName}>{format(day, 'EEE')}</span>
                  <span className={styles.dayNumber}>{format(day, 'd')}</span>
                </div>
                {!isVolunteer && (
                  <button className={styles.dayAddBtn} onClick={() => { setSelectedDay(day); setIsAddingService(true); }}>
                    <Plus size={14} />
                  </button>
                )}
              </div>
              <div className={styles.slots}>
                {rotaEntries
                  .filter(r => isSameDay(new Date(r.date), day))
                  .map(entry => {
                    const isUnassigned = entry.userName === 'Unassigned';
                    const isDragOver = dragOverId === entry._id;
                    
                    return (
                      <div 
                        key={entry._id} 
                        className={`
                          ${styles.card} 
                          ${entry.status === 'Confirmed' ? styles.confirmed : styles.pending}
                          ${isUnassigned ? styles.dropTarget : ''}
                          ${isDragOver ? styles.dropTargetActive : ''}
                        `}
                        style={isUnassigned ? { border: '2px dashed var(--accent)', background: 'var(--surface-hover)' } : {}}
                        onDragOver={(e) => {
                          if (isUnassigned) {
                            e.preventDefault();
                            setDragOverId(entry._id);
                          }
                        }}
                        onDragLeave={() => setDragOverId(null)}
                        onDrop={(e) => {
                          if (isUnassigned) {
                            const userId = e.dataTransfer.getData("userId");
                            if (userId) handleDrop(entry._id, userId);
                          }
                        }}
                      >
                        <div className={styles.cardHeader}>
                          <span className={styles.position}>{entry.position}</span>
                          <div className={styles.cardActions}>
                            {entry.userRole === "Probation" && (
                              <button onClick={() => setIsLoggingKpi(entry)} className={styles.kpiBtn} title="Log KPI">
                                <ClipboardList size={12} />
                              </button>
                            )}
                            {!isVolunteer && (
                              <button onClick={() => handleDelete(entry._id)} className={styles.deleteBtn} title="Remove Shift">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className={styles.serviceTag}>
                          {entry.serviceName} • {entry.subunitName || entry.departmentName}
                        </div>
                        <div className={styles.cardUser}>
                          <div className={styles.avatar} style={isUnassigned ? { background: 'var(--border)' } : {}}>{entry.userName[0]}</div>
                          <div className={styles.userName}>{entry.userName}</div>
                        </div>
                      </div>
                    );
                  })}
                {!isVolunteer && (
                  <button className={styles.emptySlot} onClick={() => setIsAssigning(true)}>
                    <Plus size={14} /> <span>Assign</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className={styles.monthGrid}>
        {days.map(day => {
          const dayServices = services?.filter(s => isSameDay(new Date(s.startTime), day)) || [];
          return (
            <div key={day.toString()} className={`
              ${styles.monthDay} 
              ${!isSameMonth(day, currentDate) ? styles.otherMonth : ''} 
              ${isSameDay(day, new Date()) ? styles.today : ''}
            `}>
              <div className={styles.monthDayHeader}>
                <span className={styles.monthDayNumber}>{format(day, 'd')}</span>
                {!isVolunteer && (
                  <button className={styles.dayAddBtn} onClick={() => { setSelectedDay(day); setIsAddingService(true); }}>
                    <Plus size={12} />
                  </button>
                )}
              </div>
              {dayServices.map(s => {
                const filled = rotaEntries?.filter(r => r.serviceId === s._id).length || 0;
                const coverageClass = filled === 0 ? styles.serviceInfoEmpty : filled < 3 ? styles.serviceInfoPartial : styles.serviceInfoFull;
                return (
                  <div key={s._id} className={`${styles.monthServiceItem} ${coverageClass}`}>
                    {s.name} ({filled})
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const renderYearView = () => {
    const months = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
    return (
      <div className={styles.yearContainer}>
        {months.map(month => {
          const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
          return (
            <div key={month.toString()} className={styles.miniMonth}>
              <h3 className={styles.miniMonthTitle}>{format(month, 'MMMM')}</h3>
              <div className={styles.miniGrid}>
                {days.map(day => {
                  const dayStat = coverageStats?.find(s => isSameDay(new Date(s.date), day));
                  const status = dayStat?.status || '';
                  return (
                    <div 
                      key={day.toString()} 
                      className={`${styles.miniDay} ${status ? styles.hasService : ''} ${status ? styles[status] : ''}`}
                      title={dayStat ? `${dayStat.filled} assigned` : ''}
                    >
                      {format(day, 'd')}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className={styles.legend}>
          <div className={styles.legendItem}><div className={`${styles.swatch} ${styles.full}`} /> Full Coverage</div>
          <div className={styles.legendItem}><div className={`${styles.swatch} ${styles.partial}`} /> Understaffed</div>
          <div className={styles.legendItem}><div className={`${styles.swatch} ${styles.empty}`} /> No Volunteers</div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Volunteer Rota</h1>
          <div className={styles.viewSwitcher}>
            {(['week', 'month', 'year'] as const).map(mode => (
              <button 
                key={mode} 
                className={`${styles.viewBtn} ${viewMode === mode ? styles.active : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.nav}>
            <button className={styles.navBtn} onClick={() => handleNav('prev')}><ChevronLeft size={20} /></button>
            <span className={styles.currentRange}>
              {viewMode === 'week' && `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`}
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
              {viewMode === 'year' && format(currentDate, 'yyyy')}
            </span>
            <button className={styles.navBtn} onClick={() => handleNav('next')}><ChevronRight size={20} /></button>
          </div>
          {!isVolunteer && (
            <button className={styles.addBtn} onClick={() => setIsAssigning(true)}>
              <Plus size={18} /> Add Shift
            </button>
          )}
        </div>
      </header>

      <div className={styles.contentArea}>
        <main>
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'year' && renderYearView()}
        </main>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}><Users size={18} /> Volunteer Roster</div>
            <div className={styles.searchBox}>
              <input 
                placeholder="Search volunteers..." 
                value={rosterSearch}
                onChange={e => setRosterSearch(e.target.value)}
              />
            </div>
            <p className={styles.hint} style={{ marginBottom: '1rem', fontSize: '0.75rem' }}>Drag a volunteer onto an unassigned shift.</p>
            <div className={styles.rosterList}>
              {filteredRoster?.map(u => (
                <div 
                  key={u._id} 
                  className={styles.volunteerDraggable}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("userId", u._id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <div className={styles.avatar}>{u.name?.[0] || u.email?.[0]}</div>
                  <div className={styles.volunteerInfo}>
                    <span className={styles.volunteerName}>{u.name || u.email}</span>
                    <span className={styles.volunteerDept}>{u.departmentName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}><AlertCircle size={18} /> Coverage Audit</div>
            <div className={styles.auditItem}>
              <span className={styles.auditLabel}>Weekly Statistics</span>
              <span className={styles.auditValue}>{rotaEntries.length} positions filled</span>
            </div>
            {viewMode === 'week' && services?.filter(s => isSameDay(new Date(s.startTime), currentDate)).length === 0 && (
              <div className={styles.auditWarning}>
                <p>No services scheduled for this range.</p>
              </div>
            )}
          </div>

          {sidebarStats && (
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarTitle}><Clock size={18} /> Shift & Swap Overview</div>
              <div className={styles.auditItem}>
                <span className={styles.auditLabel}>Open Shifts (Upcoming)</span>
                <span className={styles.auditValue} style={{ color: sidebarStats.openShifts > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
                  {sidebarStats.openShifts} open
                </span>
              </div>
              <div className={styles.auditItem}>
                <span className={styles.auditLabel}>Swaps Pending Approval</span>
                <span className={styles.auditValue} style={{ color: sidebarStats.pendingSwapApprovals > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                  {sidebarStats.pendingSwapApprovals} pending
                </span>
              </div>
              <div className={styles.auditItem}>
                <span className={styles.auditLabel}>Approved Swaps (This Week)</span>
                <span className={styles.auditValue}>{sidebarStats.approvedSwapsThisWeek} approved</span>
              </div>
              <div className={styles.auditItem}>
                <span className={styles.auditLabel}>Month Fill Rate</span>
                <span className={styles.auditValue} style={{ color: sidebarStats.monthFillRate > 85 ? '#10b981' : sidebarStats.monthFillRate > 65 ? '#f59e0b' : '#ef4444' }}>
                  {sidebarStats.monthFillRate}% filled
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Modals remain mostly the same but using updated classNames */}
      {isAddingService && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Schedule Service for {selectedDay && format(selectedDay, 'MMM d')}</h2>
              <button onClick={() => setIsAddingService(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateService} className={styles.form}>
              <div className={styles.field}>
                <label>Service Name</label>
                <input placeholder="e.g. Sunday Morning" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} required />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Start Time</label>
                  <input type="time" value={newService.time} onChange={e => setNewService({...newService, time: e.target.value})} required />
                </div>
                <div className={styles.field}>
                  <label>End Time</label>
                  <input type="time" value={newService.endTime} onChange={e => setNewService({...newService, endTime: e.target.value})} required />
                </div>
              </div>
              <div className={styles.field}>
                <label>QR Code Security</label>
                <select 
                  value={newService.qrType}
                  onChange={e => setNewService({...newService, qrType: e.target.value as any})}
                >
                  <option value="Unique">Unique (Secure)</option>
                  <option value="Generic">Generic (Fixed)</option>
                </select>
              </div>
              <button type="submit" className={styles.submitBtn}>Create Service</button>
            </form>
          </div>
        </div>
      )}

      {isAssigning && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Assign Shift</h2>
              <button onClick={() => setIsAssigning(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssign} className={styles.form}>
              <div className={styles.field}>
                <label>Service</label>
                <select value={newShift.serviceId} onChange={e => setNewShift({...newShift, serviceId: e.target.value})} required>
                  <option value="">Select Service</option>
                  {services?.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({format(s.startTime, 'MMM d')})</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Volunteer (Optional)</label>
                <select value={newShift.userId} onChange={e => setNewShift({...newShift, userId: e.target.value})}>
                  <option value="">Leave Unassigned (Open Shift)</option>
                  {allUsers?.map(u => (
                    <option key={u._id} value={u._id}>{u.name || u.email}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Department</label>
                <select value={newShift.departmentId} onChange={e => setNewShift({...newShift, departmentId: e.target.value, subunitId: ''})} required>
                  <option value="">Select Department</option>
                  {departments?.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Unit (Optional)</label>
                <select value={newShift.subunitId} onChange={e => setNewShift({...newShift, subunitId: e.target.value})} disabled={!newShift.departmentId}>
                  <option value="">General (No Subunit)</option>
                  {subunits?.filter(s => s.departmentId === newShift.departmentId).map(sub => (
                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Role</label>
                <input placeholder="e.g. Lead Vocals" value={newShift.role} onChange={e => setNewShift({...newShift, role: e.target.value})} required />
              </div>
              {!newShift.userId && (
                <div className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="allowCrossDept" 
                    checked={newShift.allowCrossDept} 
                    onChange={e => setNewShift({...newShift, allowCrossDept: e.target.checked})}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  <label htmlFor="allowCrossDept" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                    Allow volunteers from other departments to claim this shift
                  </label>
                </div>
              )}
              <button type="submit" className={styles.submitBtn}>
                {newShift.userId ? 'Assign Positions' : 'Create Open Shift'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isLoggingKpi && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Log Performance: {isLoggingKpi.userName}</h2>
              <button onClick={() => setIsLoggingKpi(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleLogKPI} className={styles.form}>
              <div className={styles.field}>
                <label>Punctuality & Execution</label>
                <select value={kpiForm.score} onChange={e => setKpiForm({...kpiForm, score: e.target.value})} required>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Needs Improvement">Needs Improvement</option>
                  <option value="Disapprove">Disapprove</option>
                </select>
                <p className={styles.hint}>Note: Marking "Disapprove" will automatically extend their probation period.</p>
              </div>
              <div className={styles.field}>
                <label>Leader's Note (Optional)</label>
                <textarea 
                  placeholder="Provide context for this score..."
                  value={kpiForm.note}
                  onChange={e => setKpiForm({...kpiForm, note: e.target.value})}
                  rows={3}
                />
              </div>
              <button type="submit" className={styles.submitBtn}>Save Log Entry</button>
            </form>
          </div>
        </div>
      )}

      {/* Global Confirm Modal — replaces all window.confirm/alert */}
      <UrgentConfirmModal
        isOpen={confirmModal.open}
        severity={confirmModal.severity}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
};
