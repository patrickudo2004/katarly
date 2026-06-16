import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ShiftSwapMarketplace } from '../components/ShiftSwapMarketplace';
import { RewardsMarketplace } from '../components/RewardsMarketplace';
import styles from './MarketplacePage.module.css';

export const MarketplacePage: React.FC = () => {
  const me = useQuery(api.users.me);
  const church = useQuery(api.churches.getMyChurch);
  const [activeTab, setActiveTab] = React.useState<'swaps' | 'rewards'>('swaps');

  if (!me) return null;

  const showRewards = church?.settings?.enableRewardsMarketplace ?? true;
  const currentTab = showRewards ? activeTab : 'swaps';

  return (
    <div className={styles.container}>
      {showRewards && (
        <div className={styles.tabs}>
          <button 
            className={currentTab === 'swaps' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('swaps')}
          >
            Shift Swaps
          </button>
          <button 
            className={currentTab === 'rewards' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('rewards')}
          >
            Redeem Rewards
          </button>
        </div>
      )}

      <div className={styles.content}>
        {currentTab === 'swaps' ? (
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
