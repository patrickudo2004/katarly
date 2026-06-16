import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { User, Flame, Clock, Calendar, Award, Coins } from 'lucide-react';
import { BadgeDisplay } from './BadgeDisplay';
import styles from './VolunteerProfile.module.css';

interface VolunteerProfileProps {
  userId: any;
}

export const VolunteerProfile: React.FC<VolunteerProfileProps> = ({ userId }) => {
  const user = useQuery(api.users.getById, { userId });
  const stats = useQuery(api.recognition.getUserStats, { userId });
  const badges = useQuery(api.recognition.getUserBadges, { userId });

  if (!user || !stats || !badges) return <div className={styles.loading}>Loading profile...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {user.imageUrl ? <img src={user.imageUrl} alt={user.name} /> : <User size={48} />}
        </div>
        <div className={styles.headerInfo}>
          <h2 className={styles.name}>{user.name}</h2>
          <p className={styles.role}>
            {user.role}
            {user.departmentName && user.departmentName !== "None" && ` • ${user.departmentName}`}
            {user.subunitName && user.subunitName !== "None" && ` • ${user.subunitName}`}
          </p>
        </div>

      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <Flame className={styles.streakIcon} size={24} />
          <div className={styles.statValue}>{stats.streak}</div>
          <div className={styles.statLabel}>Current Streak</div>
        </div>
        <div className={styles.statCard}>
          <Calendar className={styles.servicesIcon} size={24} />
          <div className={styles.statValue}>{stats.totalServices}</div>
          <div className={styles.statLabel}>Total Services</div>
        </div>
        <div className={styles.statCard}>
          <Clock className={styles.hoursIcon} size={24} />
          <div className={styles.statValue}>{stats.totalHours}</div>
          <div className={styles.statLabel}>Total Hours</div>
        </div>
        <div className={styles.statCard}>
          <Coins className={styles.pointsIcon} size={24} />
          <div className={styles.statValue}>{user.points || 0}</div>
          <div className={styles.statLabel}>Service Points</div>
        </div>
      </div>

      <section className={styles.badgesSection}>
        <div className={styles.sectionHeader}>
          <Award size={20} />
          <h3>Badges & Achievements</h3>
        </div>
        
        {badges.length === 0 ? (
          <div className={styles.emptyBadges}>
            <p>No badges earned yet. Keep serving to unlock achievements!</p>
          </div>
        ) : (
          <div className={styles.badgeGrid}>
            {badges.map((ub: any) => (
              <BadgeDisplay key={ub._id} badge={ub.badge} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
