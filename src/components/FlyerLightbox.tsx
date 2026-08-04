import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './FlyerLightbox.module.css';

interface FlyerLightboxProps {
  imageUrl: string;
  title?: string;
  onClose: () => void;
}

export const FlyerLightbox: React.FC<FlyerLightboxProps> = ({ imageUrl, title, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.header} onClick={(e) => e.stopPropagation()}>
        <span className={styles.title}>{title || 'Service Flyer'}</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close flyer preview">
          <X size={22} />
        </button>
      </div>

      <div className={styles.imageContainer} onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl} 
          alt={title || 'Service Flyer'} 
          className={styles.lightboxImage}
          loading="eager"
        />
      </div>
      <p className={styles.hint}>Pinch or zoom on mobile to view fine print</p>
    </div>
  );
};
