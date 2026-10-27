import React, { useState, useEffect } from 'react';
import { Calendar, Check, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import styles from './AvailabilityMatrix.module.css';

export interface AvailabilityMatrixProps {
  initialAvailability?: Record<string, boolean>;
  onSave?: (availability: Record<string, boolean>) => Promise<void> | void;
  isSaving?: boolean;
  readOnly?: boolean;
  title?: string;
  subtitle?: string;
}

const WEEKS = [
  { id: 'w1', label: 'Week 1' },
  { id: 'w2', label: 'Week 2' },
  { id: 'w3', label: 'Week 3' },
  { id: 'w4', label: 'Week 4' },
];

const SLOTS = [
  { id: 'sun_am', label: 'Sunday AM' },
  { id: 'sun_pm', label: 'Sunday PM' },
  { id: 'midweek', label: 'Midweek' },
];

export const AvailabilityMatrix: React.FC<AvailabilityMatrixProps> = ({
  initialAvailability = {},
  onSave,
  isSaving = false,
  readOnly = false,
  title = "Serving Availability Rhythm",
  subtitle = "Indicate which services you are normally available to serve each month.",
}) => {
  const [availability, setAvailability] = useState<Record<string, boolean>>(initialAvailability);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (initialAvailability) {
      setAvailability(initialAvailability);
    }
  }, [initialAvailability]);

  const toggleSlot = (slotKey: string) => {
    if (readOnly) return;
    setAvailability(prev => {
      const next = { ...prev, [slotKey]: !prev[slotKey] };
      setHasChanges(true);
      return next;
    });
  };

  const applyPreset = (presetType: 'all_sundays' | 'first_third' | 'second_fourth' | 'all_midweeks' | 'clear') => {
    if (readOnly) return;
    const next: Record<string, boolean> = { ...availability };

    if (presetType === 'clear') {
      WEEKS.forEach(w => {
        SLOTS.forEach(s => {
          next[`${w.id}_${s.id}`] = false;
        });
      });
    } else if (presetType === 'all_sundays') {
      WEEKS.forEach(w => {
        next[`${w.id}_sun_am`] = true;
        next[`${w.id}_sun_pm`] = true;
      });
    } else if (presetType === 'first_third') {
      ['w1', 'w3'].forEach(w => {
        next[`${w}_sun_am`] = true;
        next[`${w}_sun_pm`] = true;
      });
      ['w2', 'w4'].forEach(w => {
        next[`${w}_sun_am`] = false;
        next[`${w}_sun_pm`] = false;
      });
    } else if (presetType === 'second_fourth') {
      ['w2', 'w4'].forEach(w => {
        next[`${w}_sun_am`] = true;
        next[`${w}_sun_pm`] = true;
      });
      ['w1', 'w3'].forEach(w => {
        next[`${w}_sun_am`] = false;
        next[`${w}_sun_pm`] = false;
      });
    } else if (presetType === 'all_midweeks') {
      WEEKS.forEach(w => {
        next[`${w.id}_midweek`] = true;
      });
    }

    setAvailability(next);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!onSave || readOnly) return;
    await onSave(availability);
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="#8b5cf6" />
          <h3 className={styles.title}>{title}</h3>
        </div>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      {!readOnly && (
        <div className={styles.presets}>
          <button
            type="button"
            onClick={() => applyPreset('all_sundays')}
            className={styles.presetBtn}
          >
            <Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} />
            All Sundays
          </button>
          <button
            type="button"
            onClick={() => applyPreset('first_third')}
            className={styles.presetBtn}
          >
            1st & 3rd Sundays
          </button>
          <button
            type="button"
            onClick={() => applyPreset('second_fourth')}
            className={styles.presetBtn}
          >
            2nd & 4th Sundays
          </button>
          <button
            type="button"
            onClick={() => applyPreset('all_midweeks')}
            className={styles.presetBtn}
          >
            All Midweeks
          </button>
          <button
            type="button"
            onClick={() => applyPreset('clear')}
            className={styles.presetBtn}
            style={{ color: 'var(--text-secondary)' }}
          >
            <RotateCcw size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Clear
          </button>
        </div>
      )}

      <div className={styles.grid}>
        {WEEKS.map(week => (
          <div key={week.id} className={styles.weekRow}>
            <span className={styles.weekLabel}>{week.label}</span>
            <div className={styles.slots}>
              {SLOTS.map(slot => {
                const key = `${week.id}_${slot.id}`;
                const isActive = !!availability[key];
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={readOnly}
                    aria-pressed={isActive}
                    onClick={() => toggleSlot(key)}
                    className={`${styles.slotBtn} ${isActive ? styles.slotBtnActive : ''}`}
                  >
                    {isActive && <Check size={14} />}
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {onSave && !readOnly && (
        <div className={styles.actions}>
          {saveSuccess && (
            <span style={{ fontSize: '0.8125rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <Check size={16} /> Saved successfully!
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={styles.saveBtn}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save Availability
          </button>
        </div>
      )}
    </div>
  );
};
