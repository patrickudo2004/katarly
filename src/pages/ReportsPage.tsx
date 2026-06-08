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
  AlertCircle,
  Shield,
  Activity,
  Award,
  LayoutGrid,
  ChevronUp,
  ChevronDown,
  AlertTriangle
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
  const [activeTab, setActiveTab] = useState<'trends' | 'services' | 'floor' | 'wellness' | 'compliance' | 'leaderboard' | 'probation'>('trends');
  const [rangeDays, setRangeDays] = useState(28); // 4 weeks default
  const [deptId, setDeptId] = useState<string | null>(null);
  const [subunitId, setSubunitId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const me = useQuery(api.users.me);

  const isSuperAdmin = me?.role === 'SuperAdmin';
  const isDeptLevel = ['DeaconHead', 'PastoralOversight', 'DepartmentHead', 'DepartmentAssistant', 'DepartmentSecretary'].includes(me?.role || '');
  const isSubunitLevel = ['SubunitLead', 'SubunitAssistant'].includes(me?.role || '');

  // Fetch new operational report data
  const liveCoverage = useQuery(api.reports.getLiveFloorCoverage, { departmentId: deptId as any });
  const burnoutAlerts = useQuery(api.reports.getBurnoutAlerts, { departmentId: deptId as any, subunitId: subunitId as any });
  const safeguardingLogs = useQuery(api.reports.getSafeguardingAudit, { departmentId: deptId as any });
  const leaderboards = useQuery(api.reports.getSubunitLeaderboards);
  const probationList = useQuery(api.reports.getProbationStatusList, { departmentId: deptId as any });

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

  const exportCompliancePDF = () => {
    if (!safeguardingLogs) return;
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Katarly Safeguarding & Compliance Audit Trail", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 27);
      doc.text(`Scope: ${isSuperAdmin ? 'Church-wide' : 'Department Scoped'}`, 14, 32);
      
      let y = 42;
      doc.setFontSize(11);
      doc.setFillColor(243, 244, 246);
      doc.rect(14, y, 182, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.text("Volunteer Name", 16, y + 6);
      doc.text("Service", 65, y + 6);
      doc.text("Check-in Time", 110, y + 6);
      doc.text("Verification stamp", 145, y + 6);
      
      y += 8;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);

      for (const log of safeguardingLogs) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        // Obfuscate username slightly for GDPR compliance (extract name part before email sign)
        const namePart = log.volunteerName.split('@')[0];
        doc.text(namePart, 16, y + 5);
        doc.text(log.serviceName, 65, y + 5);
        doc.text(format(log.timestamp, 'yyyy-MM-dd HH:mm'), 110, y + 5);
        doc.text(log.verifiedBy, 145, y + 5);
        
        doc.setDrawColor(229, 231, 235);
        doc.line(14, y + 8, 196, y + 8);
        y += 9;
      }
      
      doc.save(`safeguarding-audit-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF audit trail.");
    }
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

      <div className={styles.tabNav} style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
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
        <button 
          className={activeTab === 'floor' ? styles.activeTab : ''} 
          onClick={() => setActiveTab('floor')}
        >
          <LayoutGrid size={18} /> Floor Coverage
        </button>
        <button 
          className={activeTab === 'wellness' ? styles.activeTab : ''} 
          onClick={() => setActiveTab('wellness')}
        >
          <Activity size={18} /> Wellness Warnings
        </button>
        <button 
          className={activeTab === 'compliance' ? styles.activeTab : ''} 
          onClick={() => setActiveTab('compliance')}
        >
          <Shield size={18} /> Compliance Logs
        </button>
        <button 
          className={activeTab === 'leaderboard' ? styles.activeTab : ''} 
          onClick={() => setActiveTab('leaderboard')}
        >
          <Award size={18} /> Leaderboards
        </button>
        <button 
          className={activeTab === 'probation' ? styles.activeTab : ''} 
          onClick={() => setActiveTab('probation')}
        >
          <Users size={18} /> Probation Tracker
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

        {activeTab === 'floor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Real-time Floor Coverage</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Live volunteer check-in ratios compared to today's scheduled rota.</p>
            </div>
            {liveCoverage && liveCoverage.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {liveCoverage.map((item) => (
                  <div key={item.subunitId} style={{ 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px', 
                    padding: '1.25rem',
                    borderLeft: `4px solid ${item.status === 'red' ? '#ef4444' : item.status === 'amber' ? '#f59e0b' : '#10b981'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{item.subunitName}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.departmentName}</span>
                      </div>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        textTransform: 'uppercase', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        background: item.status === 'red' ? 'rgba(239, 68, 68, 0.15)' : item.status === 'amber' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: item.status === 'red' ? '#ef4444' : item.status === 'amber' ? '#f59e0b' : '#10b981'
                      }}>{item.status === 'red' ? 'Critical' : item.status === 'amber' ? 'Warning' : 'Good'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Coverage:</span>
                      <strong style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}>{item.checkedIn} / {item.required} Checked-in</strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', marginTop: '0.75rem', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${Math.min((item.checkedIn / item.required) * 100, 100)}%`, 
                        height: '100%', 
                        background: item.status === 'red' ? '#ef4444' : item.status === 'amber' ? '#f59e0b' : '#10b981' 
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <Calendar size={48} style={{ opacity: 0.5, marginBottom: '1rem', color: 'var(--text-secondary)' }} />
                <p>No active services running at this time.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wellness' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Volunteer Wellness & Burnout Warnings</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Servants flagged for exceeding monthly shift limits or consecutive week limits.</p>
            </div>
            {burnoutAlerts && burnoutAlerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {burnoutAlerts.map((alert) => (
                  <div key={alert.userId} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px', 
                    padding: '1.25rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{alert.name}</h4>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          background: alert.riskLevel === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: alert.riskLevel === 'high' ? '#ef4444' : '#f59e0b'
                        }}>{alert.riskLevel === 'high' ? 'High Risk' : 'Medium Risk'}</span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {alert.departmentName} &bull; {alert.subunitName}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Monthly Shifts</div>
                        <strong style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}>{alert.shiftsCount}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Sundays Served</div>
                        <strong style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}>{alert.consecutiveWeeks} consecutive</strong>
                      </div>
                      <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {alert.reasons.map((reason: string, idx: number) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: 500 }}>
                            <AlertTriangle size={12} />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <CheckCircle size={48} style={{ opacity: 0.5, color: '#10b981', marginBottom: '1rem' }} />
                <p>All clear! No volunteers currently exceeding wellness thresholds.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compliance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Safeguarding & Compliance Audit Logs</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Verified placement logs and background check credentials for children's safety compliance.</p>
              </div>
              <button 
                onClick={exportCompliancePDF} 
                className={styles.exportBtn}
                style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
              >
                <FileText size={18} /> Export PDF Audit Trail
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.rawTable}>
                <thead>
                  <tr>
                    <th>Volunteer</th>
                    <th>Safety Status</th>
                    <th>Service & Dept</th>
                    <th>Logged Stamp</th>
                    <th>Verified By</th>
                  </tr>
                </thead>
                <tbody>
                  {safeguardingLogs?.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.volunteerName}</td>
                      <td>
                        {!log.requiresSafeguarding ? (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 600, 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '9999px',
                            background: 'rgba(148, 163, 184, 0.15)',
                            color: '#94a3b8'
                          }}>
                            Not Required
                          </span>
                        ) : (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 600, 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '9999px',
                            background: log.hasBackgroundCheck ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: log.hasBackgroundCheck ? '#10b981' : '#ef4444'
                          }}>
                            {log.hasBackgroundCheck ? '✓ Safeguarded' : '✗ Unverified'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-primary)' }}>{log.serviceName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.departmentName}</div>
                      </td>
                      <td>{format(log.timestamp, 'HH:mm')} &bull; <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.locationAccuracy}</span></td>
                      <td>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                          {log.verifiedBy}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!safeguardingLogs || safeguardingLogs.length === 0) && (
                    <tr>
                      <td colSpan={5} className={styles.emptyRow}>No records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Subunit Consistency Leaderboards</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Church rankings by average attendance consistency and punctuality in the last 30 days.</p>
            </div>
            
            <div className={styles.tableWrapper}>
              <table className={styles.rawTable}>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Rank</th>
                    <th>Subunit</th>
                    <th>Department</th>
                    <th>Consistency Score</th>
                    <th>Avg Punctuality</th>
                    <th style={{ width: '100px' }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboards?.map((item, idx) => (
                    <tr key={item.subunitId}>
                      <td style={{ fontSize: '1.125rem', fontWeight: 700, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'var(--text-secondary)' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.subunitName}</td>
                      <td>{item.departmentName}</td>
                      <td style={{ fontWeight: 700, color: item.consistencyScore > 85 ? '#10b981' : item.consistencyScore > 65 ? '#f59e0b' : '#ef4444' }}>
                        {item.consistencyScore}%
                      </td>
                      <td>{item.avgLatenessMinutes <= 5 ? 'On Time (<5m)' : `+${item.avgLatenessMinutes} mins avg`}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: item.trend === 'up' ? '#10b981' : item.trend === 'down' ? '#ef4444' : 'var(--text-secondary)' }}>
                          {item.trend === 'up' ? <ChevronUp size={16} /> : item.trend === 'down' ? <ChevronDown size={16} /> : null}
                          <span style={{ textTransform: 'capitalize', fontSize: '0.75rem', fontWeight: 600 }}>{item.trend}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!leaderboards || leaderboards.length === 0) && (
                    <tr>
                      <td colSpan={6} className={styles.emptyRow}>No leaderboard stats calculated yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'probation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Probation & Rehabilitation Graduation Tracker</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Track volunteers on warning or probation status as they progress toward full restoration.</p>
            </div>

            {probationList && probationList.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {probationList.map((item) => (
                  <div key={item.userId} style={{ 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px', 
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{item.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.departmentName} &bull; {item.subunitName}</span>
                        </div>
                        {item.isGraduationReady && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 600, 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981'
                          }}>Ready to Graduate</span>
                        )}
                      </div>
                      
                      <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          <span>Latest supervisor review:</span>
                          <span style={{ 
                            fontWeight: 600, 
                            color: item.remarkSentiment === 'Good' ? '#10b981' : item.remarkSentiment === 'Fair' ? '#f59e0b' : '#ef4444' 
                          }}>{item.remarkSentiment}</span>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', margin: 0, fontStyle: 'italic' }}>
                          "{item.lastRemark}"
                        </p>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        <span>Consecutive On-time Shifts Streak:</span>
                        <strong>{item.streakCount} / {item.requiredStreak}</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${Math.min((item.streakCount / item.requiredStreak) * 100, 100)}%`, 
                          height: '100%', 
                          background: item.isGraduationReady ? '#10b981' : '#8b5cf6' 
                        }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <CheckCircle size={48} style={{ opacity: 0.5, color: '#10b981', marginBottom: '1rem' }} />
                <p>No volunteers currently on probation in this department.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
