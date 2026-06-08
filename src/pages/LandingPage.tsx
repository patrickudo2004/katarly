import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Church, Calendar, ShieldCheck, Heart, Sparkles, ArrowRight, CheckCircle2, Video, MapPin } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import styles from './LandingPage.module.css';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoWrapper}>
          <span className={styles.logoText}>Katarly</span>
        </div>
        <div className={styles.navActions}>
          <ThemeToggle />
          <button onClick={() => navigate('/login')} className={styles.loginBtn}>
            Sign In
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>
            <Sparkles size={14} className={styles.sparkleIcon} />
            <span>Modern Church Volunteer Operations</span>
          </div>
          <h1 className={styles.title}>
            Equipping the Saints for <span className={styles.accentText}>Stewardship</span>
          </h1>
          <p className={styles.subtitle}>
            Replace chaotic sheets, WhatsApp groups, and paper rosters. 
            Katarly is a real-time volunteer management digital nervous system built for the house of God.
          </p>
          <div className={styles.ctaGroup}>
            <button onClick={() => navigate('/login')} className={styles.primaryCta}>
              Enter Sanctuary Portal <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/create-church')} className={styles.secondaryCta}>
              Register Your Church
            </button>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <h2>Why Churches Choose Katarly</h2>
          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardIconBox} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                <CheckCircle2 size={24} />
              </div>
              <h3>Verified Check-ins</h3>
              <p>Geofenced QR-code scans and physical NFC tap check-ins ensure volunteers are on-premise when serving.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIconBox} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <Calendar size={24} />
              </div>
              <h3>Automated Scheduling</h3>
              <p>Drag-and-drop calendars, availability preferences, and an integrated shift swap marketplace reduce administrative workload by 80%.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIconBox} style={{ background: 'rgba(30, 58, 95, 0.1)', color: '#1e3a5f' }}>
                <ShieldCheck size={24} />
              </div>
              <h3>Deacon Board Governance</h3>
              <p>Structured approvals for Pastoral Oversight escalations and a private, encrypted governing board discussion channel.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIconBox} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                <Heart size={24} />
              </div>
              <h3>Morale & Streaks</h3>
              <p>Build volunteer appreciation with automatic streaks, custom reward badges, and a church-wide Hall of Fame.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIconBox} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
                <Video size={24} />
              </div>
              <h3>Hybrid Meetings & Devotionals</h3>
              <p>Schedule workers' devotionals, rehearsal clusters, or training. Integrates MS Teams, Zoom, or Google Meet links and records online check-ins seamlessly.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIconBox} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <MapPin size={24} />
              </div>
              <h3>Multi-Campus Sanctuary Gate</h3>
              <p>Directs volunteers serving at multiple campuses to select their specific sanctuary upon login, keeping campus rota metrics isolated and clean.</p>
            </div>
          </div>
        </section>

        {/* Quote Section */}
        <section className={styles.quoteSection}>
          <div className={styles.quoteCard}>
            <p className={styles.quoteText}>
              "Katarly transformed how we schedule and check in our Sunday volunteers. We saved hours of back-and-forth WhatsApp planning."
            </p>
            <div className={styles.quoteAuthor}>
              <div className={styles.authorAvatar}>W</div>
              <div>
                <strong>Winners Chapel Manchester</strong>
                <span>Volunteer Leadership Team</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Katarly. All rights reserved.</p>
        <p className={styles.footerSub}>Equipping the saints for the work of ministry.</p>
      </footer>
    </div>
  );
};
