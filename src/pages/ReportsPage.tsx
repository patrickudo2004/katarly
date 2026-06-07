import React, { useState, useRef } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  BarChart3, 
  Download, 
  FileText, 
  ImageIcon, 
  Calendar,
  Filter,
  Users,
  PieChart as PieChartIcon,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Line, ComposedChart, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import styles from './ReportsPage.module.css';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trends' | 'services'>('trends');
  const [rangeDays, setRangeDays] = useState(28); // 4 weeks default
  const [deptId, setDeptId] = useState<string | null>(null);
  const [subunitId, setSubunitId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const me = useQuery(api.users.me);

  const isSuperAdmin = me?.role === 'SuperAdmin';
  const isDeptLevel = ['DeaconHead', 'PastoralOversight', 'DepartmentHead', 'DepartmentAssistant', 'DepartmentSecretary'].includes(me?.role || '');
  const isSubunitLevel = ['SubunitLead', 'SubunitAssistant'].includes(me?.role || '');

  // Automatically lock/initialize state based on role
  React.useEffect(() => {
    if (me) {
      if (isDeptLevel) {
        setDeptId(me.departmentId || null);
        setSubunitId(null);
      } else if (isSubunitLevel) {
        setDeptId(me.departmentId || null);
        setSubunitId(me.subunitId || null);
      }
    }
  }, [me, isDeptLevel, isSubunitLevel]);

  const departments = useQuery(api.departments.getDepartments);
  const services = useQuery(api.services.getRecentServices, { limit: 15 }) || [];
  
  const analytics = useQuery(api.churches.getAdvancedAnalytics, {
    rangeDays,
    departmentId: deptId as any,
    subunitId: subunitId as any,
    showComparison: true,
    showForecast: true
  });

  const rawAttendance = useQuery(api.attendance.getHistoricalAttendance, {
    departmentId: deptId as any,
    subunitId: subunitId as any,
    serviceId: selectedServiceId as any,
    limit: 500
  });

  const chartRef = useRef<HTMLDivElement>(null);

  // Set default selected service if services load and none is selected
  React.useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0]._id);
    }
  }, [services, selectedServiceId]);

  const exportAsImage = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#f8fafc', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `reports-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG', err);
    }
  };

  const exportAsPDF = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#f8fafc', pixelRatio: 2 });
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`reports-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
    }
  };

  const exportAsCSV = () => {
    if (!rawAttendance) return;
    const headers = ['Date', 'User', 'Service', 'Status'];
    const rows = rawAttendance.map(r => [
      format(r.timestamp, 'yyyy-MM-dd HH:mm'),
      r.userName,
      r.serviceName,
      r.status
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `raw-attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!me) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-purple-600" /></div>;

  const currentServiceInsights = () => {
    if (!rawAttendance) return { present: 0, late: 0, excused: 0, total: 0 };
    return {
      total: rawAttendance.length,
      present: rawAttendance.filter(r => r.status === 'Present').length,
      late: rawAttendance.filter(r => r.status === 'Late').length,
      excused: rawAttendance.filter(r => r.status === 'Excused').length,
    };
  };

  const insights = currentServiceInsights();
  const pieData = [
    { name: 'Present', value: insights.present, color: '#10b981' },
    { name: 'Late', value: insights.late, color: '#f59e0b' },
    { name: 'Excused', value: insights.excused, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <BarChart3 className={styles.headerIcon} />
          <div>
            <h1>Analytics & Reports</h1>
            <p>Comprehensive attendance trends and service-level data</p>
          </div>
        </div>
        
        <div className={styles.headerControls}>
          {isSuperAdmin ? (
            <div className={styles.filterGroup}>
              <Filter size={16} />
              <select value={deptId || ''} onChange={e => { setDeptId(e.target.value || null); setSubunitId(null); }}>
                <option value="">All Departments</option>
                {departments?.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
          ) : (
            <div className={styles.filterGroup} style={{ opacity: 0.85 }}>
              <Filter size={16} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Scoped: {isSubunitLevel ? 'Subunit' : 'Department'}
              </span>
            </div>
          )}
          
          <div className={styles.exportActions}>
            <button onClick={exportAsImage} title="Export PNG" className={styles.exportBtn}><ImageIcon size={18} /> PNG</button>
            <button onClick={exportAsPDF} title="Export PDF" className={styles.exportBtn}><FileText size={18} /> PDF</button>
            <button onClick={exportAsCSV} title="Export CSV" className={styles.exportBtn}><Download size={18} /> CSV</button>
          </div>
        </div>
      </header>

      <div className={styles.tabNav}>
        <button 
          className={activeTab === 'trends' ? styles.activeTab : ''} 
          onClick={() => setActiveTab('trends')}
        >
          <BarChart3 size={18} /> Growth Trends
        </button>
        <button 
          className={activeTab === 'services' ? styles.activeTab : ''} 
          onClick={() => setActiveTab('services')}
        >
          <PieChartIcon size={18} /> Service Drill-down
        </button>
      </div>

      <div className={styles.contentArea} ref={chartRef}>
        {activeTab === 'trends' && (
          <div className={styles.trendsView}>
            <div className={styles.kpiRow}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>Retention Rate</div>
                <div className={styles.kpiValue}>{analytics?.retentionRate || 0}%</div>
                <div className={styles.kpiTrend}>Active workforce participation</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>Consistency Score</div>
                <div className={styles.kpiValue}>{analytics?.consistencyScore || 0}%</div>
                <div className={styles.kpiTrend}>Average attendance reliability</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>Timeframe</div>
                <div className={styles.kpiSelect}>
                  <select value={rangeDays} onChange={e => setRangeDays(Number(e.target.value))}>
                    <option value={7}>Last 7 Days</option>
                    <option value={28}>Last 4 Weeks</option>
                    <option value={90}>Last 3 Months</option>
                    <option value={180}>Last 6 Months</option>
                    <option value={365}>Last 1 Year</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.chartBox}>
              <div className={styles.chartTitle}>Attendance Volume & Forecast</div>
              {analytics?.trends && analytics.trends.length > 0 ? (
                <div className={styles.chartWrapper}>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={analytics.trends} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="var(--text-secondary)" 
                        fontSize={12}
                        tickMargin={10}
                        axisLine={{ stroke: 'var(--border-color)' }}
                        label={{ 
                          value: 'Timeline', 
                          position: 'insideBottom', 
                          offset: -5, 
                          fill: 'var(--text-secondary)', 
                          fontSize: 12, 
                          fontWeight: 500 
                        }}
                      />
                      <YAxis 
                        stroke="var(--text-secondary)" 
                        fontSize={12}
                        tickMargin={10}
                        axisLine={{ stroke: 'var(--border-color)' }}
                        tickFormatter={(value) => `${value}`}
                        label={{ 
                          value: 'Volunteers Checked In', 
                          angle: -90, 
                          position: 'insideLeft', 
                          offset: 15, 
                          style: { textAnchor: 'middle' }, 
                          fill: 'var(--text-secondary)', 
                          fontSize: 12, 
                          fontWeight: 500 
                        }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--card-bg)', 
                          borderColor: 'var(--border-color)', 
                          borderRadius: '12px', 
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)' 
                        }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                        labelStyle={{ color: 'var(--text-secondary)' }}
                      />
                      <Legend verticalAlign="top" height={36}/>
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        name="Current Period"
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        fill="url(#colorTotal)" 
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="comparison" 
                        name="Previous Period"
                        stroke="#cbd5e1" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={styles.emptyChart}>
                  <Calendar size={48} className="text-gray-300 mb-4" />
                  <p>Not enough data to display trends for this period.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className={styles.servicesView}>
            <div className={styles.serviceSidebar}>
              <h3>Select Service</h3>
              <div className={styles.serviceList}>
                {services.map(s => (
                  <button 
                    key={s._id}
                    className={`${styles.serviceBtn} ${selectedServiceId === s._id ? styles.activeService : ''}`}
                    onClick={() => setSelectedServiceId(s._id)}
                  >
                    <div className={styles.sName}>{s.name}</div>
                    <div className={styles.sTime}>{format(s.startTime, 'MMM dd, HH:mm')}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.serviceDetails}>
              {selectedServiceId ? (
                <>
                  <div className={styles.drillTop}>
                    <div className={styles.pieCard}>
                      <h4>Attendance Distribution</h4>
                      {insights.total > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              contentStyle={{ 
                                backgroundColor: 'var(--card-bg)', 
                                borderColor: 'var(--border-color)', 
                                borderRadius: '12px', 
                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)' 
                              }}
                              itemStyle={{ color: 'var(--text-primary)' }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className={styles.emptyPie}>No check-ins yet</div>
                      )}
                    </div>
                    
                    <div className={styles.statsSummary}>
                      <div className={`${styles.statPill} ${styles.pillPresent}`}>
                        <CheckCircle size={20} />
                        <div>
                          <div className={styles.pillLabel}>Present</div>
                          <div className={styles.pillValue}>{insights.present}</div>
                        </div>
                      </div>
                      <div className={`${styles.statPill} ${styles.pillLate}`}>
                        <Clock size={20} />
                        <div>
                          <div className={styles.pillLabel}>Late</div>
                          <div className={styles.pillValue}>{insights.late}</div>
                        </div>
                      </div>
                      <div className={`${styles.statPill} ${styles.pillExcused}`}>
                        <AlertCircle size={20} />
                        <div>
                          <div className={styles.pillLabel}>Excused</div>
                          <div className={styles.pillValue}>{insights.excused}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.rawTableCard}>
                    <h4>Raw Check-in Data</h4>
                    <div className={styles.tableWrapper}>
                      <table className={styles.rawTable}>
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Time</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rawAttendance?.map((record, i) => (
                            <tr key={i}>
                              <td>{record.userName}</td>
                              <td>{format(record.timestamp, 'HH:mm')}</td>
                              <td>
                                <span className={`${styles.statusBadge} ${styles['status' + record.status]}`}>
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(!rawAttendance || rawAttendance.length === 0) && (
                            <tr>
                              <td colSpan={3} className={styles.emptyRow}>No records found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.emptyChart}>
                  <p>Select a service from the left to view drill-down data.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
