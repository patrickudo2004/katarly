import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Settings, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Save, 
  Loader2,
  ChevronLeft,
  Activity,
  UserCheck,
  Palette,
  Layers,
  Info,
  Upload,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminNfcManager } from '../components/AdminNfcManager';
import styles from './AdminSettings.module.css';

declare global {
  interface Window {
    google: any;
  }
}

export const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const church = useQuery(api.churches.getMyChurch);
  const updateSettings = useMutation(api.churches.updateExtendedSettings);
  const generateUploadUrl = useMutation(api.churches.generateLogoUploadUrl);
  const updateLogo = useMutation(api.churches.updateLogo);
  
  const [activeTab, setActiveTab] = useState<'general' | 'geofence' | 'rules' | 'nfc'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocomplete = useRef<any>(null);
  
  const [formData, setFormData] = useState({
    attendanceWindowMinutes: 30,
    geofenceRadius: 100,
    requireLeadApprovalForSwaps: false,
    lat: 0,
    lng: 0,
    lateThresholdMinutes: 15,
    autoCheckoutHours: 4,
    burnoutLimitShiftsPerMonth: 8,
    burnoutLimitConsecutiveSundays: 4,
    enableBurnoutAlerts: true,
    swapDeadlineHours: 24,
    radiusUnit: 'meters' as 'meters' | 'miles',
    accentColor: '#8b5cf6',
    name: '',
    address: ''
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMap = useRef<any>(null);
  const marker = useRef<any>(null);
  const circle = useRef<any>(null);

  useEffect(() => {
    if (church) {
      setFormData({
        attendanceWindowMinutes: church.settings?.attendanceWindowMinutes ?? 30,
        geofenceRadius: church.settings?.geofenceRadius ?? 100,
        requireLeadApprovalForSwaps: church.settings?.requireLeadApprovalForSwaps ?? false,
        lat: church.location?.lat ?? 0,
        lng: church.location?.lng ?? 0,
        lateThresholdMinutes: church.settings?.lateThresholdMinutes ?? 15,
        autoCheckoutHours: church.settings?.autoCheckoutHours ?? 4,
        burnoutLimitShiftsPerMonth: church.settings?.burnoutLimitShiftsPerMonth ?? 8,
        burnoutLimitConsecutiveSundays: church.settings?.burnoutLimitConsecutiveSundays ?? 4,
        enableBurnoutAlerts: church.settings?.enableBurnoutAlerts ?? true,
        swapDeadlineHours: church.settings?.swapDeadlineHours ?? 24,
        radiusUnit: church.settings?.radiusUnit ?? 'meters',
        accentColor: church.settings?.accentColor ?? '#8b5cf6',
        name: church.name ?? '',
        address: church.address ?? ''
      });
    }
  }, [church]);

  // Map Initialization & Updates
  useEffect(() => {
    if (activeTab === 'geofence' && mapRef.current && window.google) {
      const center = { lat: formData.lat || 6.5244, lng: formData.lng || 3.3792 }; // Default Lagos if 0
      
      if (!googleMap.current) {
        googleMap.current = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          disableDefaultUI: false,
          styles: [
            {
              "featureType": "poi",
              "elementType": "labels",
              "stylers": [{ "visibility": "off" }]
            }
          ]
        });

        marker.current = new window.google.maps.Marker({
          position: center,
          map: googleMap.current,
          draggable: true,
          title: "Church Location"
        });

        circle.current = new window.google.maps.Circle({
          strokeColor: "#8b5cf6",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#8b5cf6",
          fillOpacity: 0.2,
          map: googleMap.current,
          center: center,
          radius: getMetersFromRadius(formData.geofenceRadius, formData.radiusUnit)
        });

        window.google.maps.event.addListener(marker.current, 'dragend', () => {
          const pos = marker.current.getPosition();
          const lat = pos.lat();
          const lng = pos.lng();
          setFormData(prev => ({ ...prev, lat, lng }));
          
          // Reverse geocode to update address field
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
              setFormData(prev => ({ ...prev, address: results[0].formatted_address }));
            }
          });
        });
      }

      // Initialize Autocomplete
      if (addressInputRef.current && !autocomplete.current) {
        autocomplete.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          fields: ['formatted_address', 'geometry'],
          types: ['address']
        });

        autocomplete.current.addListener('place_changed', () => {
          const place = autocomplete.current.getPlace();
          if (place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const address = place.formatted_address;
            setFormData(prev => ({ ...prev, lat, lng, address }));
          }
        });
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (googleMap.current && marker.current && circle.current) {
      const newPos = { lat: formData.lat, lng: formData.lng };
      marker.current.setPosition(newPos);
      circle.current.setCenter(newPos);
      circle.current.setRadius(getMetersFromRadius(formData.geofenceRadius, formData.radiusUnit));
      googleMap.current.setCenter(newPos);
    }
  }, [formData.lat, formData.lng, formData.geofenceRadius, formData.radiusUnit]);

  function getMetersFromRadius(val: number, unit: 'meters' | 'miles') {
    return unit === 'miles' ? val * 1609.34 : val;
  }

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
      await updateLogo({ storageId });
      alert('Logo updated successfully!');
    } catch (err: any) {
      alert('Failed to upload logo: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        ...formData
      });
      alert('Church Settings successfully saved!');
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!church) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" size={48} /></div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => navigate(-1)} className={styles.backBtn}>
            <ChevronLeft size={20} />
          </button>
          <div className={styles.titleGroup}>
            <Settings className={styles.icon} size={28} />
            <div>
              <h1>Major Church Settings</h1>
              <p>Configure your sanctuary's infrastructure and attendance rules.</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={handleSave} disabled={isSaving} className={styles.saveBtn}>
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Save Changes
        </button>
      </header>

      <nav className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'general' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <Palette size={18} /> General & Branding
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'geofence' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('geofence')}
        >
          <MapPin size={18} /> Location & Geofence
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'rules' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <ShieldCheck size={18} /> Operational Rules
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'nfc' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('nfc')}
        >
          <Layers size={18} /> NFC & QR Toolkit
        </button>
      </nav>

      <main className={styles.main}>
        {activeTab === 'general' && (
          <div className={styles.panel}>
            <section className={styles.section}>
              <h3><Palette size={20} /> Church Branding</h3>
              
              <div className={styles.field}>
                <label>Church Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter church name"
                  className={styles.textInput}
                />
              </div>

              <div className={styles.field}>
                <label>Church Logo</label>
                <div className={styles.logoUploadArea}>
                  {church.logoUrl ? (
                    <div className={styles.logoPreview}>
                      <img src={church.logoUrl} alt="Church Logo" />
                      <button 
                        className={styles.changeLogoBtn}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={16} /> Change Logo
                      </button>
                    </div>
                  ) : (
                    <div 
                      className={styles.uploadPlaceholder}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="animate-spin" size={32} />
                      ) : (
                        <>
                          <Upload size={32} />
                          <span>Click to upload logo</span>
                        </>
                      )}
                    </div>
                  )}
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>Accent Color</label>
                <div className={styles.colorPicker}>
                  <input 
                    type="color" 
                    value={formData.accentColor}
                    onChange={e => setFormData({...formData, accentColor: e.target.value})}
                  />
                  <code>{formData.accentColor}</code>
                </div>
                <p className={styles.hint}>This color will be used for printed tickets and high-priority UI elements.</p>
              </div>
            </section>

            <section className={styles.section}>
              <h3><Clock size={20} /> Attendance Defaults</h3>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Attendance Window</label>
                  <div className={styles.inputWithUnit}>
                    <input 
                      type="number" 
                      value={formData.attendanceWindowMinutes}
                      onChange={e => setFormData({...formData, attendanceWindowMinutes: parseInt(e.target.value)})}
                    />
                    <span>minutes</span>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Auto-Checkout</label>
                  <div className={styles.inputWithUnit}>
                    <input 
                      type="number" 
                      value={formData.autoCheckoutHours}
                      onChange={e => setFormData({...formData, autoCheckoutHours: parseInt(e.target.value)})}
                    />
                    <span>hours</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'geofence' && (
          <div className={styles.geofencePanel}>
            <div className={styles.mapControls}>
              <section className={styles.section}>
                <h3><Info size={20} /> Configure Geofence</h3>
                <p className={styles.desc}>Drag the marker to your church entrance or use the button below.</p>
                
                <div className={styles.field}>
                  <label>Distance Unit</label>
                  <select 
                    value={formData.radiusUnit}
                    onChange={e => setFormData({...formData, radiusUnit: e.target.value as any})}
                    className={styles.select}
                  >
                    <option value="meters">Meters</option>
                    <option value="miles">Miles</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label>Geofence Radius ({formData.radiusUnit})</label>
                  <input 
                    type="range"
                    min="10"
                    max={formData.radiusUnit === 'meters' ? 1000 : 5}
                    step={formData.radiusUnit === 'meters' ? 10 : 0.1}
                    value={formData.geofenceRadius}
                    onChange={e => setFormData({...formData, geofenceRadius: parseFloat(e.target.value)})}
                  />
                  <div className={styles.radiusDisplay}>
                    <strong>{formData.geofenceRadius}</strong> {formData.radiusUnit}
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Church Physical Address</label>
                  <input 
                    type="text" 
                    ref={addressInputRef}
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="Search or enter physical address"
                    className={styles.textInput}
                  />
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Latitude</label>
                    <input 
                      type="number" 
                      step="any"
                      value={formData.lat} 
                      onChange={e => setFormData({...formData, lat: parseFloat(e.target.value)})}
                      className={styles.textInput}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Longitude</label>
                    <input 
                      type="number" 
                      step="any"
                      value={formData.lng} 
                      onChange={e => setFormData({...formData, lng: parseFloat(e.target.value)})}
                      className={styles.textInput}
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(pos => {
                        setFormData(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
                      });
                    }
                  }}
                  className={styles.locationBtn}
                >
                  Sync to My Location
                </button>
              </section>
            </div>
            <div ref={mapRef} className={styles.mapContainer}></div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className={styles.panel}>
            <section className={styles.section}>
              <h3><Activity size={20} /> Burnout & Capacity</h3>
              <div className={styles.field}>
                <label>Volunteer Monthly Shift Limit</label>
                <div className={styles.inputWithUnit}>
                  <input 
                    type="number" 
                    value={formData.burnoutLimitShiftsPerMonth}
                    onChange={e => setFormData({...formData, burnoutLimitShiftsPerMonth: parseInt(e.target.value)})}
                  />
                  <span>shifts per month</span>
                </div>
                <p className={styles.hint}>Rota will flag a warning if a volunteer is assigned more shifts than this.</p>
              </div>

              <div className={styles.field} style={{ marginTop: '1.5rem' }}>
                <label>Consecutive Sunday Service Limit</label>
                <div className={styles.inputWithUnit}>
                  <input 
                    type="number" 
                    value={formData.burnoutLimitConsecutiveSundays}
                    onChange={e => setFormData({...formData, burnoutLimitConsecutiveSundays: parseInt(e.target.value)})}
                  />
                  <span>Sundays in a row</span>
                </div>
                <p className={styles.hint}>Flag a warning if a volunteer serves this many consecutive Sundays without rest.</p>
              </div>

              <label className={styles.checkboxLabel} style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <input 
                  type="checkbox"
                  checked={formData.enableBurnoutAlerts}
                  onChange={(e) => setFormData({...formData, enableBurnoutAlerts: e.target.checked})}
                />
                <div className={styles.checkboxInfo} style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '0.875rem' }}>Enable Burnout Warnings</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Display burnout alerts and stats on the reports dashboard page.</span>
                </div>
              </label>
            </section>

            <section className={styles.section}>
              <h3><UserCheck size={20} /> Governance & Swaps</h3>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Late Threshold</label>
                  <div className={styles.inputWithUnit}>
                    <input 
                      type="number" 
                      value={formData.lateThresholdMinutes}
                      onChange={e => setFormData({...formData, lateThresholdMinutes: parseInt(e.target.value)})}
                    />
                    <span>minutes</span>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Swap Request Deadline</label>
                  <div className={styles.inputWithUnit}>
                    <input 
                      type="number" 
                      value={formData.swapDeadlineHours}
                      onChange={e => setFormData({...formData, swapDeadlineHours: parseInt(e.target.value)})}
                    />
                    <span>hours before shift</span>
                  </div>
                </div>
              </div>
              
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox"
                  checked={formData.requireLeadApprovalForSwaps}
                  onChange={(e) => setFormData({...formData, requireLeadApprovalForSwaps: e.target.checked})}
                />
                <div className={styles.checkboxInfo}>
                  <strong>Require Staff Approval</strong>
                  <span>Leads must approve all swap requests manually.</span>
                </div>
              </label>
            </section>
          </div>
        )}

        {activeTab === 'nfc' && (
          <AdminNfcManager />
        )}
      </main>
    </div>
  );
};
