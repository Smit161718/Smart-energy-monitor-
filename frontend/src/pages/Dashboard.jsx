// src/pages/Dashboard.jsx
// Main dashboard: live metric cards + charts + bill cards

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Zap, Activity, Radio, Battery, Gauge, Clock, IndianRupee,
  TrendingUp, Wifi, WifiOff, AlertTriangle, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import api from '../api';
import { useDevice } from '../context/DeviceContext';

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, icon: Icon, color, footer, loading }) {
  return (
    <div className={`metric-card ${color}`}>
      <div className="metric-header">
        <div>
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ marginTop: 8 }}>
            {loading ? <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 6 }} /> : (
              <>{value}<span className="metric-unit">{unit}</span></>
            )}
          </div>
        </div>
        <div className={`metric-icon ${color}`}>
          <Icon size={22} />
        </div>
      </div>
      <div className="metric-footer">{footer}</div>
    </div>
  );
}

// ── Bill Card ──────────────────────────────────────────────────────────────────
function BillCard({ label, amount, sub, color }) {
  return (
    <div className="bill-card">
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div className="bill-amount" style={{ color }}>{amount}</div>
      <div className="bill-sub">{sub}</div>
    </div>
  );
}

// ── Custom Chart Tooltip ───────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
}

const REFRESH_INTERVAL = 5000; // 5 seconds

export default function Dashboard() {
  const [latest,     setLatest]     = useState(null);
  const [chartData,  setChartData]  = useState([]);
  const [bill,       setBill]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [backendUp,  setBackendUp]  = useState(true);  // tracks if server is reachable
  const intervalRef = useRef(null);

  const fetchLatest = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [latRes, chartRes, billRes] = await Promise.all([
        api.get('/meter/latest'),
        api.get('/meter/chart?limit=50'),
        api.get('/meter/bill'),
      ]);

      setBackendUp(true); // server responded successfully

      // Always update latest (including null when no readings yet)
      if (latRes.data.success) setLatest(latRes.data.data);
      else setLatest(null);

      if (billRes.data.success) setBill(billRes.data.data);

      if (chartRes.data.success) {
        setChartData(chartRes.data.data.map(r => ({
          time:        new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          voltage:     parseFloat(r.voltage),
          current:     parseFloat(r.current_amp),
          power:       parseFloat(r.power),
          energy:      parseFloat(r.energy),
          powerFactor: parseFloat(r.power_factor),
        })));
      }
      setLastUpdate(new Date());
    } catch (err) {
      // Server is down or network error — immediately mark device as offline
      console.error('Dashboard fetch error:', err);
      setBackendUp(false);
      setLatest(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + polling every 5s
  useEffect(() => {
    fetchLatest(false);
    intervalRef.current = setInterval(() => fetchLatest(true), REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchLatest]);

  // Derive device status:
  // - If backend is unreachable → offline
  // - If backend has no readings yet → offline
  // - Otherwise use what the backend reports (online / offline / power_cut)
  const deviceStatus = (!backendUp || !latest) ? 'offline' : (latest.deviceStatus || 'offline');
  const isPowerCut   = deviceStatus === 'power_cut';
  const isOnline     = deviceStatus === 'online';

  // Push live device status into shared context so Sidebar badge stays in sync
  const { setDeviceStatus } = useDevice();
  useEffect(() => { setDeviceStatus(deviceStatus); }, [deviceStatus, setDeviceStatus]);

  const fmt = (v, d = 2) => (v !== undefined && v !== null ? parseFloat(v).toFixed(d) : '—');

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Live Dashboard</h2>
          <p className="page-subtitle">
            Real-time ESP32 + PZEM-004T readings · Auto-refresh every 5s
            {lastUpdate && ` · Last updated: ${lastUpdate.toLocaleTimeString('en-IN')}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Device status badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            background: isPowerCut ? 'var(--danger-bg)' : isOnline ? 'var(--success-bg)' : 'var(--warning-bg)',
            border: `1px solid ${isPowerCut ? 'rgba(239,68,68,0.3)' : isOnline ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
          }}>
            {isPowerCut ? <AlertTriangle size={14} color="var(--danger)" /> :
             isOnline   ? <Wifi size={14} color="var(--success)" /> :
                          <WifiOff size={14} color="var(--warning)" />}
            <span style={{ fontSize: 12, fontWeight: 600, color: isPowerCut ? 'var(--danger)' : isOnline ? 'var(--success)' : 'var(--warning)' }}>
              {isPowerCut ? 'Power Cut!' : isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <button
            id="manual-refresh-btn"
            className="btn btn-outline btn-sm"
            onClick={() => fetchLatest(false)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} style={{ animation: refreshing ? 'spin 0.5s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Power cut banner */}
      {isPowerCut && (
        <div className="power-cut-banner">
          <AlertTriangle size={20} />
          <span>⚠️ Power Cut Detected! Voltage and Power are both zero. Check your connection.</span>
        </div>
      )}

      {/* ── Metric Cards ── */}
      <div className="metrics-grid mb-24">
        <MetricCard label="Voltage"       value={fmt(latest?.voltage)}      unit="V"    icon={Zap}         color="blue"   loading={loading} footer={<><Clock size={11} /> Grid voltage</>} />
        <MetricCard label="Energy"        value={fmt(latest?.energy, 3)}    unit="kWh"  icon={Battery}     color="cyan"   loading={loading} footer={<><Clock size={11} /> Cumulative</>} />
        <MetricCard label="Frequency"     value={fmt(latest?.frequency)}    unit="Hz"   icon={Gauge}       color="purple" loading={loading} footer={<><Clock size={11} /> AC frequency</>} />
        <MetricCard label="Today's Bill"  value={`₹${fmt(bill?.todayBill)}`} unit=""   icon={IndianRupee} color="orange" loading={loading} footer={`${fmt(bill?.todayEnergy, 3)} kWh used`} />
        <MetricCard label="Monthly Bill"  value={`₹${fmt(bill?.monthBill)}`} unit=""   icon={IndianRupee} color="red"    loading={loading} footer={`Predicted: ₹${fmt(bill?.predictedBill)}`} />
      </div>

      {/* ── Bill Summary Cards ── */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Bill Estimation</h3>
        <div className="three-col" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <BillCard label="Today"        amount={`₹${fmt(bill?.todayBill)}`}     sub={`${fmt(bill?.todayEnergy, 4)} kWh`}     color="var(--primary)" />
          <BillCard label="Yesterday"    amount={`₹${fmt(bill?.yesterdayBill)}`} sub={`${fmt(bill?.yesterdayEnergy, 4)} kWh`} color="var(--info)" />
          <BillCard label="This Month"   amount={`₹${fmt(bill?.monthBill)}`}     sub={`${fmt(bill?.monthEnergy, 4)} kWh`}     color="var(--success)" />
          <BillCard label="Predicted EOM" amount={`₹${fmt(bill?.predictedBill)}`} sub={`Est. ${fmt(bill?.predictedEnergy, 2)} kWh`} color="var(--warning)" />
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="charts-grid">
        {/* Voltage */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title"><Zap size={16} color="var(--primary)" /> Voltage vs Time</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="voltageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="voltage" name="Voltage (V)" stroke="#2563EB" strokeWidth={2} fill="url(#voltageGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Energy */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title"><Battery size={16} color="var(--info)" /> Energy Consumption</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="energy" name="Energy (kWh)" stroke="#06B6D4" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
