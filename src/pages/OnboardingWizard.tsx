import React, { useState } from 'react';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Camera, Phone, Calendar, ChevronRight, Loader2, Check } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import styles from './OnboardingWizard.module.css';

export const OnboardingWizard: React.FC = () => {
  const me = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // In a real app, you'd get the public URL or use a helper
      await updateProfile({ image: storageId });
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);

  const completeOnboarding = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({ 
        phone, 
        onboardingCompleted: true 
      });
      window.location.href = '/';
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <ThemeToggle />
      </div>
      <div className={styles.wizardCard}>
        <div className={styles.progress}>
          {[1, 2].map(i => (
            <div key={i} className={`${styles.dot} ${step >= i ? styles.active : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <div className={styles.step}>
            <div className={styles.iconCircle}>
              <Camera size={32} />
            </div>
            <h2>Add a profile photo</h2>
            <p>Help your team recognize you. A clear headshot works best.</p>
            
            <div className={styles.uploadArea}>
              {me?.imageUrl ? (
                <div className={styles.preview}>
                  <img src={me.imageUrl} alt="Profile" />
                  <label className={styles.changeBtn}>
                    Change
                    <input type="file" hidden onChange={handlePhotoUpload} />
                  </label>
                </div>
              ) : (
                <label className={styles.uploadBtn}>
                  {isUploading ? <Loader2 className={styles.spinner} /> : "Choose Photo"}
                  <input type="file" hidden onChange={handlePhotoUpload} disabled={isUploading} />
                </label>
              )}
            </div>

            <button onClick={nextStep} className={styles.nextBtn}>
              Continue <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.step}>
            <div className={styles.iconCircle}>
              <Phone size={32} />
            </div>
            <h2>Stay connected</h2>
            <p>Add your phone number for urgent shift updates (optional).</p>
            
            <div className={styles.inputGroup}>
              <input 
                type="tel" 
                placeholder="+1 (555) 000-0000" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button onClick={completeOnboarding} className={styles.finishBtn} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className={styles.spinner} /> : (
                <>Finish Setup <Check size={18} /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
