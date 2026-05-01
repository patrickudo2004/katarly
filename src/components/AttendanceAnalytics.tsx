import React, { useState, useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';
import { 
  Calendar, 
  Filter, 
  TrendingUp, 
  Users, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronDown,
  Edit2
} from 'lucide-react';
import styles from './AttendanceAnalytics.module.css';

interface Props {
  departmentId?: string;
}

export const AttendanceAnalytics: React.FC<Props> = ({ departmentId: initialDeptId }) => {
  const [range, setRange] = useState<{ value: number; unit: string }>({ value: 4, unit: 'W' });
  const [deptId, setDeptId] = useState<string | null>(initialDeptId || null);
  const [showComparison, setShowComparison] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [isEditingRange, setIsEditingRange] = useState(false);
  const [tempRangeValue, setTempRangeValue] = useState('4');

  const departments = useQuery(api.departments.getDepartments);
  
  // Convert range to days for Convex
  const rangeDays = useMemo(() => {
    const val = range.value;
    switch(range.unit) {
      case 'D': return val;
      case 'W': return val * 7;
      case 'M': return val * 30;
      case 'Y': return val * 365;
      default: return val * 7;
    }
  }, [range]);

  const analytics = useQuery(api.churches.getAdvancedAnalytics, {
    rangeDays,
    departmentId: deptId as any,
    showComparison,
    showForecast
  });

  const presets = [
    { label: '7D', value: 7, unit: 'D' },
    { label: '4W', value: 4, unit: 'W' },
    { label: '6M', value: 6, unit: 'M' },
    { label: '1Y', value: 1, unit: 'Y' },
  ];

  const handleRangeUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(tempRangeValue);
    if (!isNaN(val) && val > 0) {
      setRange({ ...range, value: val });
    }
    setIsEditingRange(false);
  };

  return (
    <div className={styles.container}>
      {/* Header with Filters */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <TrendingUp className={styles.mainIcon} size={24} />
          <div>
            <h3>Attendance Analytics</h3>
            <p>Strategic growth & participation trends</p>
          </div>
        </div>

        <div className={styles.controls}>
          {/* Time Selector */}
          <div className={styles.rangeSelector}>
            {presets.map(p => (
              <button 
                key={p.label}
                className={range.unit === p.unit && !isEditingRange ? styles.activeRange : ''}
                onClick={() => {
                  setRange({ value: p.value, unit: p.unit });
                  setTempRangeValue(p.value.toString());
                  setIsEditingRange(false);
                }}
              >
                {p.label}
              </button>
            ))}
            
            <div className={styles.customRange}>
              {isEditingRange ? (
                <form onSubmit={handleRangeUpdate} className={styles.rangeForm}>
                  <input 
                    type="number" 
                    value={tempRangeValue} 
                    onChange={e => setTempRangeValue(e.target.value)}
                    autoFocus
                    onBlur={() => setIsEditingRange(false)}
                  />
                  <span>{range.unit === 'W' ? 'Wks' : range.unit === 'M' ? 'Mths' : 'Days'}</span>
                </form>
              ) : (
                <button onClick={() => setIsEditingRange(true)} className={styles.editRangeBtn}>
                  <Edit2 size={12} />
                  <span>Custom</span>
                </button>
              )}
            </div>
          </div>

          {/* Dept Filter */}
          <div className={styles.dropdownWrapper}>
            <Filter size={16} />
            <select value={deptId || ''} onChange={e => setDeptId(e.target.value || null)}>
              <option value="">All Departments</option>
              {departments?.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <Target size={18} />
            <span>Retention Rate</span>
          </div>
          <div className={styles.kpiValue}>
            {analytics?.retentionRate}%
            <span className={analytics?.retentionRate || 0 > 70 ? styles.positive : styles.warning}>
              {analytics?.retentionRate || 0 > 70 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            </span>
          </div>
          <p>Of workforce remaining active</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <Users size={18} />
            <span>Consistency Score</span>
          </div>
          <div className={styles.kpiValue}>
            {analytics?.consistencyScore}%
          </div>
          <p>Avg attendance reliability</p>
        </div>

        <div className={styles.toggleGroup}>
          <label className={styles.toggle}>
            <input type="checkbox" checked={showComparison} onChange={e => setShowComparison(e.target.checked)} />
            <span className={styles.slider} />
            <span>Compare to Last Year</span>
          </label>
          <label className={styles.toggle}>
            <input type="checkbox" checked={showForecast} onChange={e => setShowForecast(e.target.checked)} />
            <span className={styles.slider} />
            <span>Predictive Forecast</span>
          </label>
        </div>
      </div>

      {/* Main Chart */}
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={analytics?.trends || []}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--border-color)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }}
              itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
            />
            
            {/* Main Area */}
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#8b5cf6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorTotal)" 
            />

            {/* Comparison Line (Last Year) */}
            {showComparison && (
              <Line 
                type="monotone" 
                dataKey="comparison" 
                stroke="#94a3b8" 
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                name="Last Year"
              />
            )}

            {/* Forecast Line */}
            {showForecast && (
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#10b981" 
                strokeDasharray="3 3"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981' }}
                data={analytics?.trends.filter((t: any) => t.isForecast)}
                name="Forecast"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
