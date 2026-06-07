import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Nfc, 
  Copy, 
  Check, 
  Smartphone, 
  ShieldCheck, 
  Zap, 
  AlertCircle,
  RotateCw,
  Lock
} from 'lucide-react';
import styles from './AdminNfcManager.module.css';

export const AdminNfcManager: React.FC = () => {
  const nfcConfig = useQuery(api.nfc.getNfcConfig);
  const initializeNfc = useMutation(api.nfc.initializeNfc);
  const updateSettings = useMutation(api.churches.updateExtendedSettings);
  
  const [isWriting, setIsWriting] = useState(false);
  const [writeStatus, setWriteStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if Web NFC is supported
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    } else {
      setNfcSupported(false);
    }
  }, []);

  if (!nfcConfig) {
    return (
      <div className={styles.container}>
        <div className={styles.section}>
          <button className={styles.writeBtn} onClick={() => initializeNfc()}>
            Initialize NFC Settings
          </button>
        </div>
      </div>
    );
  }

  const universalLink = `${nfcConfig.baseUrl}/tap?c=${nfcConfig.churchId}&s=${nfcConfig.nfcSecret}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(universalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startWriting = async () => {
    if (!nfcSupported) return;

    try {
      setIsWriting(true);
      setWriteStatus('scanning');
      setErrorMsg(null);

      const ndef = new (window as any).NDEFReader();
      await ndef.write({
        records: [
          { recordType: "url", data: universalLink }
        ]
      });

      setWriteStatus('success');
      setTimeout(() => setWriteStatus('idle'), 3000);
    } catch (error: any) {
      console.error(error);
      setWriteStatus('error');
      setErrorMsg(error.message || "Failed to write to tag. Try again.");
    } finally {
      setIsWriting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Toolkit & Instructions */}
      <div className={styles.section}>
        <div className={styles.header}>
          <Nfc className={styles.icon} size={24} />
          <h3>NFC & QR Toolkit</h3>
        </div>

        <div className={styles.tagOptions}>
          <div className={styles.optionRow}>
            <div>
              <strong>Enable Auto-Check-In</strong>
              <p className={styles.subText}>Process check-ins instantly when a tag is tapped (requires GPS).</p>
            </div>
            <label className={styles.toggle}>
              <input 
                type="checkbox" 
                checked={nfcConfig.autoCheckin}
                onChange={(e) => updateSettings({ nfcAutoCheckinEnabled: e.target.checked })}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>

        <div className={styles.infoBox}>
          <p>
            NFC Tags allow for "One-Tap" check-ins. Volunteers just tap their phone against 
            a physical sticker to be automatically checked in after GPS verification.
          </p>
        </div>

        <div className={styles.linkArea}>
          <span className={styles.label}>Your Church NFC Link</span>
          <div className={styles.copyInput}>
            <input type="text" readOnly value={universalLink} />
            <button className={styles.copyBtn} onClick={copyToClipboard}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className={styles.subText}>
            Use this link if you are using a 3rd party app (like "NFC Tools") on iPhone.
          </p>
        </div>

        <div className={styles.supportGrid}>
          <div className={styles.supportCard}>
            <ShieldCheck size={20} color="#10b981" />
            <span>Password Protected Tags</span>
          </div>
          <div className={styles.supportCard}>
            <Smartphone size={20} color="#3b82f6" />
            <span>Android & iOS Compatible</span>
          </div>
        </div>
      </div>

      {/* 2. NFC Writer (The Magic Tool) */}
      <div className={styles.section}>
        <div className={styles.header}>
          <Zap className={styles.icon} size={24} />
          <h3>NFC Writer Tool</h3>
        </div>

        {!nfcSupported ? (
          <div className={styles.notSupported}>
            <AlertCircle size={20} />
            <span>
              Web NFC is not supported on this browser/device. 
              Writing tags requires <strong>Chrome on Android</strong>.
            </span>
          </div>
        ) : (
          <div className={styles.writerArea}>
            {writeStatus === 'idle' && (
              <>
                <Smartphone className={styles.writerIcon} />
                <div>
                  <h4>Program a New Tag</h4>
                  <p className={styles.subText}>
                    Ready to encode a check-in sticker? Click below and tap the tag.
                  </p>
                </div>
                <button 
                  className={styles.writeBtn} 
                  onClick={startWriting}
                  disabled={isWriting}
                >
                  <Nfc size={20} /> Start Programming
                </button>
              </>
            )}

            {writeStatus === 'scanning' && (
              <div className={styles.scanningState}>
                <RotateCw className={`${styles.writerIcon} animate-spin`} />
                <h4>Waiting for Tag...</h4>
                <p>Hold the back of your phone against the NFC sticker.</p>
              </div>
            )}

            {writeStatus === 'success' && (
              <div className={styles.successState}>
                <Check className={styles.successIcon} size={48} />
                <h4>Tag Programmed Successfully!</h4>
                <p className={styles.subText}>This sticker is now a Katarly Check-In point.</p>
              </div>
            )}

            {writeStatus === 'error' && (
              <div className={styles.errorState}>
                <AlertCircle className={styles.errorIcon} size={48} />
                <h4>Write Failed</h4>
                <p className={styles.errorMsg}>{errorMsg}</p>
                <button className={styles.retryBtn} onClick={startWriting}>
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        <div className={styles.tagSecurity}>
          <div className={styles.securityHeader}>
            <Lock size={16} />
            <span>Security & Protection</span>
          </div>
          <p className={styles.subText}>
            Tags written here are automatically password-protected with your church's 
            secret key: <strong>{nfcConfig.nfcSecret}</strong>. This prevents unauthorized overwriting.
          </p>
        </div>
      </div>
    </div>
  );
};
