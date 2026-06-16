import React, { useEffect } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import styles from './UrgentConfirmModal.module.css';

interface UrgentConfirmModalProps {
  isOpen: boolean;
  severity?: 'urgent' | 'warning' | 'danger';
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const UrgentConfirmModal: React.FC<UrgentConfirmModalProps> = ({
  isOpen,
  severity = 'warning',
  title,
  message,
  detail,
  confirmLabel = 'Proceed',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  // Trap focus and prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const iconMap = {
    urgent: <ShieldAlert size={28} />,
    warning: <AlertTriangle size={28} />,
    danger: <ShieldAlert size={28} />,
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ucm-title"
      aria-describedby="ucm-message"
      onClick={onCancel}
    >
      <div
        className={`${styles.modal} ${styles[severity]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button className={styles.closeBtn} onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>

        {/* Icon */}
        <div className={`${styles.iconWrap} ${styles[`icon_${severity}`]}`}>
          {iconMap[severity]}
        </div>

        {/* Content */}
        <h3 id="ucm-title" className={styles.title}>{title}</h3>
        <p id="ucm-message" className={styles.message}>{message}</p>
        {detail && <p className={styles.detail}>{detail}</p>}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={onCancel}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            className={`${styles.confirmBtn} ${styles[`confirm_${severity}`]}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
