import React, { useState, useMemo } from 'react';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Send, Users, Calendar, Loader2, Check, Briefcase,
  FileText, ArrowLeftRight, Layers, AlertCircle, X
} from 'lucide-react';
import styles from './BorrowRequestForm.module.css';

export const BorrowRequestForm: React.FC = () => {
  const createBorrowRequest = useMutation(api.borrow.createBorrowRequest);
  const me = useQuery(api.users.me);
  const allDepartments = useQuery(api.departments.getDepartments);
  const allSubunits = useQuery(api.subunits.getSubunits);

  const [borrowType, setBorrowType] = useState<'inter_dept' | 'intra_dept'>('inter_dept');
  const [targetDeptId, setTargetDeptId] = useState<string>('');
  const [targetSubunitId, setTargetSubunitId] = useState<string>('');
  const [role, setRole] = useState('');
  const [count, setCount] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isTargeted, setIsTargeted] = useState(false);
  const [targetVolunteerId, setTargetVolunteerId] = useState<string>('');

  const parseDateTimestamp = (dateStr: string): number | undefined => {
    if (!dateStr) return undefined;
    const ts = new Date(dateStr).getTime();
    return isNaN(ts) ? undefined : ts;
  };

  const startTimestamp = parseDateTimestamp(startDate);
  const endTimestamp = parseDateTimestamp(endDate);

  const availableVolunteers = useQuery(
    api.borrow.getAvailableVolunteers,
    targetDeptId && startTimestamp !== undefined && endTimestamp !== undefined
      ? {
          deptId: targetDeptId as Id<'departments'>,
          subunitId: targetSubunitId ? (targetSubunitId as Id<'subunits'>) : undefined,
          startDate: startTimestamp,
          endDate: endTimestamp,
        }
      : "skip"
  );


  const isSubunitLead =
    me?.role === 'SubunitLead' || me?.role === 'SubunitAssistant';

  // Departments to show in dropdown — exclude own dept for inter_dept
  const targetDepartments = useMemo(() => {
    if (!allDepartments || !me) return [];
    if (borrowType === 'intra_dept') {
      // For intra-dept, the target dept is always own dept
      return allDepartments.filter((d) => d._id === me.departmentId);
    }
    return allDepartments.filter((d) => d._id !== me.departmentId);
  }, [allDepartments, me, borrowType]);

  // Subunits for the selected target dept — exclude own subunit for intra_dept
  const targetSubunits = useMemo(() => {
    if (!allSubunits || !targetDeptId) return [];
    return allSubunits.filter(
      (s) => s.departmentId === targetDeptId && s._id !== me?.subunitId
    );
  }, [allSubunits, targetDeptId, me]);

  // When borrowType switches to intra_dept, auto-set the dept to own dept
  const handleBorrowTypeChange = (type: 'inter_dept' | 'intra_dept') => {
    setBorrowType(type);
    setTargetSubunitId('');
    if (type === 'intra_dept' && me?.departmentId) {
      setTargetDeptId(me.departmentId);
    } else {
      setTargetDeptId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !targetDeptId || !role.trim()) return;
    if (borrowType === 'intra_dept' && !targetSubunitId) {
      setError('Please select the target subunit for an intra-department request.');
      return;
    }
    if (isTargeted && !targetVolunteerId) {
      setError('Please select the specific volunteer you wish to borrow.');
      return;
    }

    const startTs = parseDateTimestamp(startDate);
    const endTs = parseDateTimestamp(endDate);
    if (!startTs || !endTs) {
      setError('Please select valid start and end dates.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createBorrowRequest({
        targetDeptId: targetDeptId as Id<'departments'>,
        targetSubunitId: targetSubunitId ? (targetSubunitId as Id<'subunits'>) : undefined,
        targetVolunteerId: isTargeted && targetVolunteerId ? (targetVolunteerId as Id<'users'>) : undefined,
        borrowType,
        role: role.trim(),
        count: isTargeted ? 1 : count,
        startDate: startTs,
        endDate: endTs,
        note: note.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
      // Reset form
      setTargetDeptId('');
      setTargetSubunitId('');
      setRole('');
      setCount(1);
      setStartDate('');
      setEndDate('');
      setNote('');
      setIsTargeted(false);
      setTargetVolunteerId('');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!me || !allDepartments || !allSubunits) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader2 className={styles.spinner} size={24} />
          <span>Loading department data…</span>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}><Check size={28} /></div>
          <h3>Request Sent!</h3>
          <p>The team lead has been notified and will review your request shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconBox}>
          <Briefcase size={24} />
        </div>
        <div>
          <h3>Request Help from Another Team</h3>
          <p>Borrow volunteers from another department or subunit for a specific period.</p>
        </div>
      </div>

      {/* Borrow Type Toggle — only show intra_dept option for SubunitLeads+ */}
      <div className={styles.typeToggle}>
        <button
          type="button"
          className={`${styles.typeBtn} ${borrowType === 'inter_dept' ? styles.typeActive : ''}`}
          onClick={() => handleBorrowTypeChange('inter_dept')}
        >
          <ArrowLeftRight size={16} />
          Inter-Department
        </button>
        <button
          type="button"
          className={`${styles.typeBtn} ${borrowType === 'intra_dept' ? styles.typeActive : ''}`}
          onClick={() => handleBorrowTypeChange('intra_dept')}
        >
          <Layers size={16} />
          Within My Department
        </button>
      </div>

      <p className={styles.typeHint}>
        {borrowType === 'inter_dept'
          ? '📦 Borrowing from a different department. The target department head will receive this request.'
          : '👥 Borrowing from another subunit within your department. The target subunit lead will receive this request.'}
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={16} />
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className={styles.errorClose}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className={styles.row}>
          {/* Target Department — hidden for intra_dept (auto-set to own dept) */}
          {borrowType === 'inter_dept' && (
            <div className={styles.field}>
              <label><Users size={14} /> Target Department</label>
              <select
                value={targetDeptId}
                onChange={(e) => { setTargetDeptId(e.target.value); setTargetSubunitId(''); }}
                required
              >
                <option value="">Select Department…</option>
                {targetDepartments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Target Subunit — always shown for intra_dept, optional for inter_dept when dept chosen */}
          {(borrowType === 'intra_dept' || (borrowType === 'inter_dept' && targetDeptId)) && (
            <div className={styles.field}>
              <label>
                <Layers size={14} />
                {borrowType === 'intra_dept' ? 'Target Subunit *' : 'Target Subunit (optional)'}
              </label>
              {targetSubunits.length === 0 ? (
                <p className={styles.emptyHint}>
                  {borrowType === 'intra_dept'
                    ? 'No other subunits in your department.'
                    : 'No subunits in this department — the whole dept will be borrowed from.'}
                </p>
              ) : (
                <select
                  value={targetSubunitId}
                  onChange={(e) => setTargetSubunitId(e.target.value)}
                >
                  <option value="">
                    {borrowType === 'intra_dept' ? 'Select Subunit…' : 'Any subunit (dept-wide)'}
                  </option>
                  {targetSubunits.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {targetDeptId && (
          <div className={styles.field} style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={isTargeted}
                onChange={(e) => {
                  setIsTargeted(e.target.checked);
                  if (!e.target.checked) {
                    setTargetVolunteerId('');
                    setCount(1);
                  }
                }}
                style={{ width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Borrow a Specific Volunteer (Matrix Assignment)
              </span>
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '1.5rem', marginTop: '0.25rem' }}>
              Enable this if you want to request a specific individual by name. Otherwise, request a general count.
            </p>
          </div>
        )}

        <div className={styles.row}>
          <div className={styles.field}>
            <label><Briefcase size={14} /> Role Needed</label>
            <input
              type="text"
              placeholder="e.g. Sound Engineer, Camera Operator…"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
            <div className={styles.chipsContainer}>
              {['Leader', 'Assistant', 'Operator', 'Supervisor', 'Support'].map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  className={`${styles.chip} ${role === suggestion ? styles.chipActive : ''}`}
                  onClick={() => setRole(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <p className={styles.roleHelpText}>
              💡 <strong>Cross-Department Access:</strong> Borrowed volunteers are temporarily added to your team. They can view, swap, and accept shifts in your department, and their home leads must approve their release.
            </p>
          </div>
          <div className={styles.field}>
            {!isTargeted ? (
              <>
                <label><Users size={14} /> Number of People</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  required
                />
              </>
            ) : (
              <>
                <label><Users size={14} /> Target Volunteer *</label>
                {!targetDeptId || !startDate || !endDate ? (
                  <p className={styles.emptyHint} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', padding: '0.5rem', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                    Select department & dates first to load volunteers.
                  </p>
                ) : availableVolunteers === undefined ? (
                  <p className={styles.emptyHint} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', padding: '0.5rem', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                    Loading available volunteers…
                  </p>
                ) : availableVolunteers.length === 0 ? (
                  <p className={styles.emptyHint} style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600, padding: '0.5rem', border: '1px dashed var(--accent)', borderRadius: '8px', textAlign: 'center' }}>
                    No available volunteers found.
                  </p>
                ) : (
                  <select
                    value={targetVolunteerId}
                    onChange={(e) => {
                      setTargetVolunteerId(e.target.value);
                      const selectedVol = availableVolunteers.find((v: any) => v._id === e.target.value);
                      if (selectedVol && selectedVol.role) {
                        setRole(selectedVol.role);
                      }
                    }}
                    required
                  >
                    <option value="">Select volunteer…</option>
                    {availableVolunteers.map((v: any) => (
                      <option key={v._id} value={v._id}>
                        {v.name ?? 'Unknown'} ({v.email ?? ''}) - {v.role}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label><Calendar size={14} /> Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setEndDate('');
              }}
              required
            />
          </div>
          <div className={styles.field}>
            <label><Calendar size={14} /> End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {startDate && (
          <div className={styles.presetsRow} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', marginTop: '-0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '0.25rem' }}>Preset Duration:</span>
            {[
              { label: '2 Weeks', days: 14 },
              { label: '1 Month', months: 1 },
              { label: '3 Months', months: 3 },
              { label: '6 Months', months: 6 },
              { label: '1 Year', months: 12 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={styles.chip}
                style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', borderRadius: '9999px', height: 'auto', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer' }}
                onClick={() => {
                  const start = new Date(startDate);
                  if ('days' in preset) {
                    start.setDate(start.getDate() + preset.days);
                  } else if ('months' in preset) {
                    start.setMonth(start.getMonth() + preset.months);
                  }
                  setEndDate(start.toISOString().split('T')[0]);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        <div className={styles.field}>
          <label><FileText size={14} /> Note (optional)</label>
          <textarea
            placeholder="Any context or specific requirements for this request…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className={styles.textarea}
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className={styles.spinner} size={18} />
          ) : (
            <>
              <Send size={18} />
              Send Help Request
            </>
          )}
        </button>
      </form>
    </div>
  );
};
