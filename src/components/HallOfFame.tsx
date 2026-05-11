import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Trophy, Medal, Star, Filter } from 'lucide-react';
import { BadgeDisplay } from './BadgeDisplay';
import styles from './HallOfFame.module.css';

interface HallOfFameProps {
  churchId: any;
}

export const HallOfFame: React.FC<HallOfFameProps> = ({ churchId }) => {
  const [selectedDept, setSelectedDept] = React.useState<string | undefined>();
  const departments = useQuery(api.departments.getDepartments);
  const leaderboard = useQuery(api.recognition.getHallOfFame, { churchId, department: selectedDept });

  if (!leaderboard || !departments) return <div className={styles.loading}>Loading Hall of Fame...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <Trophy className={styles.trophyIcon} size={32} />
          <h1>Hall of Fame</h1>
        </div>
        <p className={styles.subtitle}>Celebrating our most dedicated volunteers</p>
      </header>

      <div className={styles.filters}>
        <Filter size={18} />
        <select 
          value={selectedDept || ''} 
          onChange={(e) => setSelectedDept(e.target.value || undefined)}
          className={styles.select}
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept._id} value={dept.name}>{dept.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.grid}>
        {leaderboard.map((entry, index) => (
          <div key={entry.userId} className={styles.card}>
            <div className={styles.rank}>
              {index === 0 ? <Trophy color="#f59e0b" /> : 
               index === 1 ? <Medal color="#94a3b8" /> : 
               index === 2 ? <Medal color="#b45309" /> : 
               <span className={styles.rankNumber}>{index + 1}</span>}
            </div>
            
            <div className={styles.userInfo}>
              <h3 className={styles.userName}>{entry.name}</h3>
              <span className={styles.userDept}>{entry.department}</span>
            </div>

            <div className={styles.stats}>
              <div className={styles.statItem}>
                <Star size={14} />
                <span>{entry.badgeCount} Badges</span>
              </div>
              <div className={styles.statItem}>
                <Star size={14} />
                <span>{entry.attendanceCount} Services</span>
              </div>
            </div>

            <div className={styles.badges}>
              {entry.badges.map((badge: any) => (
                badge && <BadgeDisplay key={badge._id} badge={badge} size="sm" showLabel={false} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
