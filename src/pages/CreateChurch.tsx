import React, { useState } from 'react';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Church, MapPin, Globe, Loader2, Check } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from 'react-router-dom';
import styles from './CreateChurch.module.css';

export const CreateChurch: React.FC = () => {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const me = useQuery(api.users.me);
  const createChurch = useMutation(api.churches.createChurch);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [logoStorageId, setLogoStorageId] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const autoCompleteRef = React.useRef<any>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const acceptInvite = useMutation(api.invites.acceptInvite);
  const [isJoining, setIsJoining] = useState(false);

  React.useEffect(() => {
    const pendingToken = localStorage.getItem('pending_invite_token');
    if (pendingToken) {
      const autoAccept = async () => {
        setIsJoining(true);
        try {
          await acceptInvite({ token: pendingToken });
          localStorage.removeItem('pending_invite_token');
          window.location.href = '/';
        } catch (error) {
          console.error("Auto-accept failed:", error);
          localStorage.removeItem('pending_invite_token');
          setIsJoining(false);
        }
      };
      autoAccept();
    }
  }, [acceptInvite]);

  React.useEffect(() => {
    if (window.google && inputRef.current && !autoCompleteRef.current) {
      autoCompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["address_components", "geometry", "name"],
        types: ["address"],
      });

      autoCompleteRef.current.addListener("place_changed", () => {
        const place = autoCompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
          setAddress(place.name || "");
          setLocation({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });
    }
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setLogoStorageId(storageId);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createChurch({ 
        name, 
        slug, 
        address, 
        logoStorageId: logoStorageId as any,
        location
      });
      window.location.href = '/';
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  if (isJoining) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
            <h1>Joining Church</h1>
            <p>Setting up your membership access...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <ThemeToggle />
      </div>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconBox}>
            <Church size={32} />
          </div>
          <h1>Create your church</h1>
          <p>Set up your Katarly tenant in seconds.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Church Name</label>
            <input 
              type="text" 
              placeholder="e.g. City Light Church" 
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
              }}
              required
            />
          </div>

          <div className={styles.field}>
            <label>Church URL</label>
            <div className={styles.slugInput}>
              <span>katarly.app/</span>
              <input 
                type="text" 
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Church Address</label>
            <div className={styles.inputWithIcon}>
              <MapPin size={18} />
              <input 
                ref={inputRef}
                type="text" 
                placeholder="123 Faith St, City, Country" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Church Logo</label>
            <label className={styles.uploadBtn}>
              {isUploading ? <Loader2 className={styles.spinner} /> : (
                logoStorageId ? <><Check size={18} /> Logo Uploaded</> : "Upload Logo"
              )}
              <input type="file" hidden onChange={handleLogoUpload} disabled={isUploading} />
            </label>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className={styles.spinner} /> : "Create Church"}
          </button>
        </form>

        {me && (
          <div className={styles.switchAccountZone}>
            <span className={styles.loggedInAs}>
              Signed in as <strong>{me.email}</strong>
            </span>
            <button 
              type="button" 
              onClick={handleSignOut} 
              className={styles.signOutBtn}
            >
              Sign Out & Switch Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
