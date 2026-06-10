import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Search, 
  Award, 
  AlertCircle, 
  Users, 
  TrendingUp, 
  ArrowUpDown, 
  Loader2, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { MemberProfileModal } from '../components/MemberProfileModal';
import styles from './ProbationPage.module.css';

export const ProbationPage: React.FC = () => {
  const me = useQuery(api.users.me);
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<any>(null);

  // Fetch all probationers for this church
  const probationers = useQuery(
    api.probation.listProbationers,
    me?.churchId ? { churchId: me.churchId } : "skip"
  );

  const departments = useQuery(api.departments.getDepartments);

  // Authorization check
  const isAuthorized = useMemo(() => {
    if (!me) return false;
    return ['SuperAdmin', 'DeaconHead', 'PastoralOversight', 'DepartmentHead', 'SubunitLead'].includes(me.role || '');
  }, [me]);

  // Filter and Search Logic
  const filteredProbationers = useMemo(() => {
    if (!probationers) return [];
    
    return probationers.filter(p => {
      // 1. Search filter
      const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      
      // 2. Department filter
      const matchesDept = deptFilter === 'all' || p.departmentId === deptFilter;
      
      // 3. Sentiment filter
      const lastSentiment = p.lastRemark?.sentiment || 'None';
      const matchesSentiment = sentimentFilter === 'all' || 
        (sentimentFilter === 'Good' && lastSentiment === 'Good') ||
        (sentimentFilter === 'Fair' && lastSentiment === 'Fair') ||
        (sentimentFilter === 'Concern' && lastSentiment === 'Concern') ||
        (sentimentFilter === 'None' && lastSentiment === 'None');

      return matchesSearch && matchesDept && matchesSentiment;
    });
  }, [probationers, searchTerm, deptFilter, sentimentFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (!probationers) return { total: 0, concerns: 0, good: 0 };
    
    let concerns = 0;
    let good = 0;
    
    probationers.forEach(p => {
      const sentiment = p.lastRemark?.sentiment;
      if (sentiment === 'Concern') {
        concerns++;
      } else if (sentiment === 'Good') {
        good++;
      }
    });

    return {
      total: probationers.length,
      concerns,
      good
    };
  }, [probationers]);

  if (!me || probationers === undefined) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className={styles.spinner} size={36} />
        <span>Loading Growth Tracks...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <AlertCircle size={48} className={styles.sentimentConcern} />
          <h3>Access Denied</h3>
          <p>You do not have the required leadership permissions to view this growth track page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Restorative Growth Track</h1>
          <p>Support, track, and restore volunteers back to active service through dynamic subunit rotations and weekly KPIs.</p>
        </div>
      </header>

      {/* Aggregate Stats Cards */}
      <section className={styles.statsOverview}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.total}`}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <label>Active Growth Tracks</label>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.good}`}>
            <CheckCircle size={24} />
          </div>
          <div className={styles.statInfo}>
            <label>Consistent Progress</label>
            <strong>{stats.good}</strong>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.concern}`}>
            <AlertCircle size={24} />
          </div>
          <div className={styles.statInfo}>
            <label>Attention Required</label>
            <strong>{stats.concerns}</strong>
          </div>
        </div>
      </section>

      {/* Search & Filtering Controls */}
      <section className={styles.controlsRow}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search volunteers on growth track..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          {/* Department Filter */}
          <select
            className={styles.filterSelect}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            {departments?.map(d => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>

          {/* Sentiment Filter */}
          <select
            className={styles.filterSelect}
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
          >
            <option value="all">All Journal Statuses</option>
            <option value="Good">Encouraging (Good)</option>
            <option value="Fair">Fair (Needs Focus)</option>
            <option value="Concern">Concern (Attention Needed)</option>
            <option value="None">No Journal Entry</option>
          </select>
        </div>
      </section>

      {/* Roster / Grid of cards */}
      {filteredProbationers.length === 0 ? (
        <div className={styles.emptyState}>
          <Award size={48} style={{ color: 'var(--accent)' }} />
          <h3>All Clear!</h3>
          <p>No volunteers match the current filters or are currently assigned to a growth track.</p>
        </div>
      ) : (
        <div className={styles.probationGrid}>
          {filteredProbationers.map(user => {
            const hasActivePeriod = !!user.activePeriod;
            const threshold = user.probationMetadata?.threshold || 80;
            
            // Format remaining duration dynamically
            const endDateString = user.probationMetadata?.endDate
              ? new Date(user.probationMetadata.endDate).toLocaleDateString()
              : 'Ongoing';

            const sentiment = user.lastRemark?.sentiment || 'None';
            const sentimentClass = sentiment === 'Good' 
              ? styles.sentimentGood 
              : sentiment === 'Fair' 
              ? styles.sentimentFair 
              : sentiment === 'Concern' 
              ? styles.sentimentConcern 
              : '';

            return (
              <div 
                key={user._id} 
                className={styles.probationCard}
                onClick={() => setSelectedUserId(user._id)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>
                    {user.name?.[0] || 'U'}
                  </div>
                  <div className={styles.metaInfo}>
                    <h3>{user.name}</h3>
                    <span>{user.departmentName} • {user.subunitName}</span>
                  </div>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressLabel}>
                    <span>Milestone Threshold</span>
                    <span>Target: {threshold}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${threshold}%` }} 
                    />
                  </div>
                </div>

                <div className={styles.metricsSummary}>
                  <div className={styles.metricItem}>
                    <label>Remarks</label>
                    <span>{user.remarkCount} entries</span>
                  </div>
                  <div className={styles.metricItem}>
                    <label>Last Journal</label>
                    <span className={sentimentClass}>{sentiment}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <label>Target Date</label>
                    <span>{endDateString}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Universal Floating Modal Drawer */}
      {selectedUserId && (
        <MemberProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
};
