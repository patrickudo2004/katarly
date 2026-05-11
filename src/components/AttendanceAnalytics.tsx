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
  Edit2,
  Download,
  FileText,
  ImageIcon,
  PieChart as PieChartIcon,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
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
  const [activeView, setActiveView] = useState<'trends' | 'services'>('trends');

  const chartRef = React.useRef<HTMLDivElement>(null);

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

  // Export Logic
  const exportAsImage = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `attendance-report-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG', err);
    }
  };

  const exportAsPDF = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`attendance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
    }
  };

  const exportAsCSV = () => {
    if (!analytics?.trends) return;
    const headers = ['Date', 'Total Present', 'Status'];
    const rows = analytics.trends.map((t: any) => [
      t.date,
      t.total,
      t.isForecast ? 'Forecast' : 'Actual'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-data-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const services = useQuery(api.services.getDailyServices) || [];
  const serviceInsights = useQuery(api.attendance.getAttendanceInsights, {
    departmentId: deptId as any,
  });

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

          {/* Export Actions */}
          <div className={styles.exportActions}>
            <button onClick={exportAsImage} title="Export PNG"><ImageIcon size={18} /></button>
            <button onClick={exportAsPDF} title="Export PDF"><FileText size={18} /></button>
            <button onClick={exportAsCSV} title="Export CSV"><Download size={18} /></button>
          </div>
        </div>
      </div>

      <div className={styles.viewTabs}>
        <button 
          className={activeView === 'trends' ? styles.activeTab : ''} 
          onClick={() => setActiveView('trends')}
        >
          <TrendingUp size={16} /> Trends
        </button>
        <button 
          className={activeView === 'services' ? styles.activeTab : ''} 
          onClick={() => setActiveView('services')}
        >
          <PieChartIcon size={16} /> Service Drill-down
        </button>
      </div>

      <div ref={chartRef} className={styles.exportableArea}>

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

      {activeView === 'trends' ? (
        <div className={styles.chartWrapper}>
        {analytics?.trends && analytics.trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={analytics.trends}>
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
                  data={analytics.trends.filter((t: any) => t.isForecast)}
                  name="Forecast"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className={styles.emptyState}>
            <Calendar size={40} />
            <p>No attendance records found for this timeframe.</p>
            <span>Try selecting a longer range or another department.</span>
          </div>
        )}
        </div>
      ) : (
        <div className={styles.serviceDrilldown}>
          <div className={styles.serviceGrid}>
            {services.map(service => (
              <ServiceStats key={service._id} service={service} departmentId={deptId} />
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

const ServiceStats: React.FC<{ service: any, departmentId: string | null }> = ({ service, departmentId }) => {
  const insights = useQuery(api.attendance.getAttendanceInsights, {
    serviceId: service._id,
    departmentId: departmentId as any,
  });

  if (!insights) return <div className={styles.loadingStats}><Loader2 className="animate-spin" /></div>;

  return (
    <div className={styles.serviceStatCard}>
      <div className={styles.serviceHeader}>
        <h4>{service.name}</h4>
        <span>{format(service.startTime, 'HH:mm')}</span>
      </div>
      <div className={styles.serviceValues}>
        <div className={styles.vCol}>
          <span className={styles.vLabel}>Present</span>
          <span className={styles.vValue}>{insights.present}</span>
        </div>
        <div className={styles.vCol}>
          <span className={styles.vLabel}>Late</span>
          <span className={styles.vValue} style={{ color: '#f59e0b' }}>{insights.late}</span>
        </div>
        <div className={styles.vCol}>
          <span className={styles.vLabel}>Excused</span>
          <span className={styles.vValue} style={{ color: '#94a3b8' }}>{insights.excused}</span>
        </div>
      </div>
      <div className={styles.totalRow}>
        <span>Total Workforce</span>
        <strong>{insights.total}</strong>
      </div>
    </div>
  );
};
