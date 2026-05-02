import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { VolunteerProfile } from '../components/VolunteerProfile';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from 'react-router-dom';
import styles from './ProfilePage.module.css';

export const ProfilePage: React.FC = () => {
  const me = useQuery(api.users.me);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!me) return null;

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      navigate('/login');
    } catch (error: any) {
      alert(error.message || "Failed to delete account");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4" style={{ paddingBottom: '100px' }}>
      <VolunteerProfile userId={me._id} />
      
      <div className={styles.dangerZone}>
        <h3>Danger Zone</h3>
        <p>Once you delete your account, there is no going back. Please be certain.</p>
        
        <button 
          className={styles.deleteBtn}
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 size={18} />
          Delete Account
        </button>
      </div>

      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle size={32} />
              <h2>Permanently delete account?</h2>
            </div>
            <p>
              This will remove your profile and personal data from <strong>{me.name}</strong>. 
              Historical service logs may be anonymized but cannot be fully recovered.
            </p>
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn} 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
