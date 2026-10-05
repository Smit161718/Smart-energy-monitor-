// src/pages/Reports.jsx
// Daily / Weekly / Monthly consumption reports with charts + PDF export

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { FileText, BarChart2, TrendingUp, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';

const fmt = (v, d = 2) => (v !== null && v !== undefined ? parseFloat(v).toFixed(d) : '0.00');

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</div>)}
    </div>
  );
}

export default function Reports() {
  const [tab,      setTab]      = useState('daily');
  const [daily,    setDaily]    = useState([]);
  const [weekly,   setWeekly]   = useState([]);
  const [monthly,  setMonthly]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [d, w, m] = await Promise.all([
          api.get('/meter/daily'),
          api.get('/meter/weekly'),
          api.get('/meter/monthly'),
        ]);
        if (d.data.success) setDaily(d.data.data.map(r => ({
          hour: r.hour,
          voltage: parseFloat(fmt(r.avg_voltage)),
          current: parseFloat(fmt(r.avg_current, 4)),
          power:   parseFloat(fmt(r.avg_power, 0)),
          pf:      parseFloat(fmt(r.avg_pf, 3)),
        })));
        if (w.data.success) setWeekly(w.data.data.map(r => ({
          day:     r.day_name?.slice(0, 3) || r.date,
          power:   parseFloat(fmt(r.avg_power, 0)),
          energy:  parseFloat(fmt(r.energy_consumed, 4)),
          voltage: parseFloat(fmt(r.avg_voltage)),
        })));
        if (m.data.success) setMonthly(m.data.data.map(r => ({
          date:   r.date?.slice(5) || r.date,
          energy: parseFloat(fmt(r.energy_consumed, 4)),
          power:  parseFloat(fmt(r.avg_power, 0)),
        })));
      } catch (err) { console.error('Reports fetch error:', err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Smart Energy Monitor — Consumption Report', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}  |  Period: ${tab.toUpperCase()}`, 14, 23);

    if (tab === 'daily') {
      autoTable(doc, {
        startY: 28,
        head: [['Hour', 'Avg Voltage (V)', 'Avg Current (A)', 'Avg Power (W)', 'Power Factor']],
        body: daily.map(r => [r.hour, r.voltage, r.current, r.power, r.pf]),
        headStyles: { fillColor: [37, 99, 235] },
      });
    } else if (tab === 'weekly') {
      autoTable(doc, {
        startY: 28,
        head: [['Day', 'Avg Power (W)', 'Energy Consumed (kWh)', 'Avg Voltage (V)']],
        body: weekly.map(r => [r.day, r.power, r.energy, r.voltage]),
        headStyles: { fillColor: [16, 185, 129] },
      });
    } else {
      autoTable(doc, {
        startY: 28,
        head: [['Date', 'Energy Consumed (kWh)', 'Avg Power (W)']],
        body: monthly.map(r => [r.date, r.energy, r.power]),
        headStyles: { fillColor: [245, 158, 11] },
      });
    }
    doc.save(`energy_report_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const chartData   = tab === 'daily' ? daily : tab === 'weekly' ? weekly : monthly;
  const xKey        = tab === 'daily' ? 'hour' : tab === 'weekly' ? 'day' : 'date';

  // Summary stats
  const totalEnergy = tab === 'daily'
    ? '— (use kWh on monthly)'
    : (tab === 'weekly' ? weekly : monthly).reduce((s, r) => s + (r.energy || 0), 0).toFixed(3) + ' kWh';

  const avgPower = tab === 'daily'
    ? (daily.reduce((s, r) => s + r.power, 0) / (daily.length || 1)).toFixed(0) + ' W'
    : tab === 'weekly'
    ? (weekly.reduce((s, r) => s + r.power, 0) / (weekly.length || 1)).toFixed(0) + ' W'
    : (monthly.reduce((s, r) => s + r.power, 0) / (monthly.length || 1)).toFixed(0) + ' W';

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Energy Reports</h2>
          <p className="page-subtitle">Daily, weekly, and monthly consumption analytics</p>
        </div>
        <button id="report-pdf-btn" className="btn btn-primary btn-sm" onClick={exportPDF}>
          <FileText size={14} /> Export PDF
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ marginBottom: 24 }}>
        <div className="tab-bar" style={{ width: 'fit-content' }}>
          {['daily', 'weekly', 'monthly'].map(t => (
            <button key={t} id={`tab-${t}`} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="three-col mb-24">
        {[
          { label: 'Total Energy', value: totalEnergy, icon: BarChart2, color: 'var(--primary)' },
          { label: 'Avg Power',    value: avgPower,    icon: TrendingUp, color: 'var(--warning)' },
          { label: 'Data Points',  value: `${chartData.length} ${tab === 'daily' ? 'hours' : tab === 'weekly' ? 'days' : 'days'}`, icon: Calendar, color: 'var(--success)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginTop: 2 }}>{loading ? '...' : value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {loading ? (
        <div className="flex-center" style={{ padding: 80 }}>
          <div className="spinner" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="card flex-center" style={{ padding: 60, flexDirection: 'column', gap: 12 }}>
          <BarChart2 size={40} color="var(--text-muted)" />
          <p style={{ color: 'var(--text-muted)' }}>No data available for this period. Connect your ESP32 to start collecting data.</p>
        </div>
      ) : (
        <div className="charts-grid">
          {/* Power chart */}
          <div className="chart-card">
            <div className="chart-header">
              <span className="chart-title"><TrendingUp size={16} color="var(--warning)" /> Average Power — {tab}</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barSize={tab === 'monthly' ? 8 : 20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="power" name="Power (W)" fill="#F59E0B" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Energy/voltage chart */}
          <div className="chart-card">
            <div className="chart-header">
              <span className="chart-title">
                {tab === 'daily'
                  ? <><span style={{ color: 'var(--primary)' }}>●</span> Voltage Trend</>
                  : <><span style={{ color: 'var(--info)' }}>●</span> Energy Consumed (kWh)</>}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              {tab === 'daily' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="voltage" name="Voltage (V)" stroke="#2563EB" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              ) : (
                <BarChart data={chartData} barSize={tab === 'monthly' ? 8 : 20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="energy" name="Energy (kWh)" fill="#06B6D4" radius={[4,4,0,0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
