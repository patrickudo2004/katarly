import React, { useEffect, useState, useRef } from 'react';
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
  selectedRequestId?: string | null;
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
  selectedRequestId,
}) => {
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const isDragEligibleRef = useRef(false);

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTranslateY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;

    const bodyEl = e.currentTarget.querySelector(`.${styles.body}`);
    const isAtTop = bodyEl ? bodyEl.scrollTop <= 0 : true;
    const isTouchingBody = e.target instanceof Element && e.target.closest(`.${styles.body}`);

    // If touching inside the scrollable body but not scrolled to the top, do not drag
    if (isTouchingBody && !isAtTop) {
      isDragEligibleRef.current = false;
      return;
    }

    startYRef.current = touch.clientY;
    isDragEligibleRef.current = true;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragEligibleRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - startYRef.current;
    // Only allow dragging downwards (positive values)
    if (deltaY > 0) {
      if (e.cancelable) {
        e.preventDefault();
      }
      setTranslateY(deltaY);
    } else {
      setTranslateY(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragEligibleRef.current) return;
    isDragEligibleRef.current = false;
    setIsDragging(false);

    // If dragged down past the threshold (100px), close the sheet
    if (translateY > 100) {
      onClose();
    } else {
      setTranslateY(0);
    }
  };

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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: translateY > 0 ? `translateY(${translateY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
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
          {mode === 'approval' && <BorrowApprovalPanel initialRequestId={selectedRequestId} />}
          {mode === 'assignment' && <BorrowAssignmentCard />}
          {mode === 'request' && <BorrowRequestForm />}
        </div>
      </div>
    </>
  );
};

