import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ShiftSwapMarketplace } from '../components/ShiftSwapMarketplace';
import { RewardsMarketplace } from '../components/RewardsMarketplace';
import styles from './MarketplacePage.module.css';

export const MarketplacePage: React.FC = () => {
  const me = useQuery(api.users.me);
  const [activeTab, setActiveTab] = React.useState<'swaps' | 'rewards'>('swaps');

  if (!me) return null;

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button 
          className={activeTab === 'swaps' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('swaps')}
        >
          Shift Swaps
        </button>
        <button 
          className={activeTab === 'rewards' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('rewards')}
        >
          Redeem Rewards
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'swaps' ? (
          <ShiftSwapMarketplace 
            churchId={me.churchId!} 
            userSubunitId={me.subunitId} 
          />
        ) : (
          <RewardsMarketplace 
            churchId={me.churchId!} 
            userPoints={me.points || 0}
          />
        )}
      </div>
    </div>
  );
};
