import React, { useState } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { Mail, Loader2, Church } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import styles from './Login.module.css';

export const Login: React.FC = () => {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google");
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn("magic-link", { email });
      setIsEmailSent(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <Mail size={48} className={styles.accent} />
          </div>
          <h1>Check your email</h1>
          <p>We've sent a magic link to <strong>{email}</strong>. Click the link to sign in instantly.</p>
          <button onClick={() => setIsEmailSent(false)} className={styles.secondaryBtn}>
            Try another email
          </button>
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
        <div className={styles.logoWrapper}>
          <span className={styles.logoText}>Katarly</span>
        </div>
        
        <div className={styles.header}>
          <h1>Equipping the Saints</h1>
          <p>The modern stewardship platform for church ministry.</p>
        </div>

        <div className={styles.actions}>
          <button 
            onClick={handleGoogleSignIn} 
            className={styles.googleBtn}
            disabled={isLoading}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            <span>Continue with Google</span>
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <form onSubmit={handleEmailSignIn} className={styles.emailForm}>
            <div className={styles.inputGroup}>
              <Mail size={18} className={styles.inputIcon} />
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? <Loader2 className={styles.spinner} /> : "Continue with Email"}
            </button>
          </form>
        </div>

        <div className={styles.footer}>
          <p>By signing in, you agree to our Terms of Service.</p>
          <a href="/create-church" className={styles.createLink}>Create My Church</a>
        </div>
      </div>
    </div>
  );
};
