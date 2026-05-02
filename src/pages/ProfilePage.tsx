import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { VolunteerProfile } from '../components/VolunteerProfile';
import { Trash2, AlertTriangle, Loader2, Edit2, Camera, Save, X as CloseIcon } from 'lucide-react';
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from 'react-router-dom';
import styles from './ProfilePage.module.css';

export const ProfilePage: React.FC = () => {
  const me = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: '',
    phone: ''
  });

  if (!me) return null;

  const handleEditInit = () => {
    setEditForm({
      name: me.name || '',
      phone: me.phone || ''
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        name: editForm.name,
        phone: editForm.phone
      });
      setIsEditing(false);
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await updateProfile({ image: storageId });
    } catch (error: any) {
      alert("Photo upload failed: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

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
      <div className={styles.profileHeader}>
        <h1>Your Profile</h1>
        {!isEditing && (
          <button className={styles.editBtn} onClick={handleEditInit}>
            <Edit2 size={18} /> Edit Profile
          </button>
        )}
      </div>

      {isEditing ? (
        <div className={styles.editCard}>
          <form onSubmit={handleSave}>
            <div className={styles.photoEdit}>
              <div className={styles.avatarLarge}>
                {isUploading ? <Loader2 className="animate-spin" /> : 
                  (me.imageUrl ? <img src={me.imageUrl} alt="Profile" /> : me.name?.[0])
                }
              </div>
              <label className={styles.cameraBtn}>
                <Camera size={16} />
                <input type="file" hidden onChange={handlePhotoUpload} disabled={isUploading} />
              </label>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Display Name</label>
                <input 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  required
                  placeholder="Your full name"
                />
              </div>
              <div className={styles.field}>
                <label>Phone Number</label>
                <input 
                  value={editForm.phone} 
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div className={styles.editActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setIsEditing(false)}>
                <CloseIcon size={18} /> Cancel
              </button>
              <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : (
        <VolunteerProfile userId={me._id} />
      )}
      
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
