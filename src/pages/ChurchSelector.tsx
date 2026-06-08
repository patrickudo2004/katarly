import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Church, Loader2, Sparkles, LogOut } from 'lucide-react';
import { useAuthActions } from "@convex-dev/auth/react";
import { ThemeToggle } from '../components/ThemeToggle';
import { RoleBadge } from '../components/RoleBadge';
import styles from './ChurchSelector.module.css';

export const ChurchSelector: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const memberships = useQuery(api.users.getMyMemberships);
  const switchChurch = useMutation(api.users.switchActiveChurch);
  const [selectingId, setSelectingId] = React.useState<string | null>(null);

  const handleSelect = async (churchId: any) => {
    setSelectingId(churchId);
    try {
      await switchChurch({ churchId });
      sessionStorage.setItem('sessionChurchId', churchId);
      navigate('/');
    } catch (error) {
      console.error("Failed to switch church:", error);
    } finally {
      setSelectingId(null);
    }
  };

  const handleSignOut = async () => {
    sessionStorage.removeItem('sessionChurchId');
    await signOut();
    navigate('/login');
  };

  if (memberships === undefined) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loadingWrapper}>
            <Loader2 className={styles.spinner} size={48} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading your sanctuaries...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <ThemeToggle />
        <button 
          onClick={handleSignOut} 
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '9999px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)' }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className="flex items-center justify-center gap-2">
            <Sparkles size={24} style={{ color: 'var(--accent)' }} />
            Select Your Sanctuary
          </h1>
          <p>You have access to multiple church campuses. Please select one to enter.</p>
        </div>

        <div className={styles.grid}>
          {memberships.map((m: any) => (
            <div 
              key={m._id} 
              className={styles.campusCard}
              onClick={() => selectingId === null && handleSelect(m.churchId)}
            >
              <div className={styles.logoWrapper}>
                {m.churchLogoUrl ? (
                  <img src={m.churchLogoUrl} alt={m.churchName} className={styles.logo} />
                ) : (
                  <Church size={32} className={styles.fallbackLogo} />
                )}
              </div>
              
              <div className={styles.campusInfo}>
                <span className={styles.campusName}>{m.churchName}</span>
                <div style={{ display: 'inline-flex', marginTop: '0.5rem' }}>
                  <RoleBadge role={m.role} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Need to add a campus?</span>
          <button 
            onClick={() => navigate('/create-church')} 
            className={styles.createLink}
          >
            Register Another Church
          </button>
        </div>
      </div>
    </div>
  );
};
