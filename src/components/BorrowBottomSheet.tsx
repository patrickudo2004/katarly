import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { BorrowApprovalPanel } from './BorrowApprovalPanel';
import { BorrowAssignmentCard } from './BorrowAssignmentCard';
import { BorrowRequestForm } from './BorrowRequestForm';
import styles from './BorrowBottomSheet.module.css';

export type BorrowSheetMode = 'approval' | 'assignment' | 'request';

interface BorrowBottomSheetProps {
  isOpen: boolean;
  mode: BorrowSheetMode;
  onClose: () => void;
}

const TITLES: Record<BorrowSheetMode, string> = {
  approval: 'Incoming Requests',
  assignment: 'Your Assignments',
  request: 'Request Team Help',
};

export const BorrowBottomSheet: React.FC<BorrowBottomSheetProps> = ({
  isOpen,
  mode,
  onClose,
}) => {
  // Lock body scroll while sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={styles.backdrop}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[mode]}
      >
        {/* Drag handle */}
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>{TITLES[mode]}</h3>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.body}>
          {mode === 'approval' && <BorrowApprovalPanel />}
          {mode === 'assignment' && <BorrowAssignmentCard />}
          {mode === 'request' && <BorrowRequestForm />}
        </div>
      </div>
    </>
  );
};
