import React, { useState, useEffect } from 'react';
import { meterAPI } from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, BarChart, Bar, Legend
} from 'recharts';
import { MdTimeline, MdCalendarToday, MdAutorenew } from 'react-icons/md';
import './Analytics.css';

const Analytics = () => {
  const [range, setRange] = useState('day'); // 'day', 'week', 'raw'
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const data = await meterAPI.getCharts(range);
      
      // Post-process labels for user readability
      const formatted = data.map(item => {
        let label = item.time_label || '';
        if (range === 'day') {
          // Format as time "HH:MM"
          const date = new Date(item.time_label);
          label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (range === 'week') {
          // Format as "MM-DD"
          const date = new Date(item.time_label);
          label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } else {
          // Raw readings - use simple time
          const date = new Date(item.timestamp);
          label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        return {
          ...item,
          displayName: label,
          // Handle falls if null
          power: item.power !== undefined ? item.power : item.avg_power || 0,
          voltage: item.voltage !== undefined ? item.voltage : item.avg_voltage || 0,
          current: item.current !== undefined ? item.current : item.avg_current || 0,
          energy: item.energy_consumed !== undefined ? item.energy_consumed : 0,
          bill: item.bill_incurred !== undefined ? item.bill_incurred : 0
        };
      });
      
      setChartData(formatted);
    } catch (e) {
      console.error('Error fetching chart analytics:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [range]);

  const CustomTooltip = ({ active, payload, label, unit = "" }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip glass-panel">
          <p className="tooltip-label">{label}</p>
          {payload.map((item, index) => (
            <p key={index} className="tooltip-value" style={{ color: item.color || '#00f2fe' }}>
              {item.name}: <strong>{parseFloat(item.value).toFixed(2)}</strong> {unit || item.unit || ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-container">
      {/* Filters/Toolbar */}
      <div className="analytics-header glass-panel">
        <div className="header-title">
          <MdTimeline className="header-icon" />
          <div>
            <h2>Energy Analytics</h2>
            <p>Historical trends and load signatures</p>
          </div>
        </div>
        <div className="range-selector">
          <button 
            className={`btn-range ${range === 'raw' ? 'active' : ''}`}
            onClick={() => setRange('raw')}
          >
            Real-time (50 pts)
          </button>
          <button 
            className={`btn-range ${range === 'day' ? 'active' : ''}`}
            onClick={() => setRange('day')}
          >
            Last 24 Hours
          </button>
          <button 
            className={`btn-range ${range === 'week' ? 'active' : ''}`}
            onClick={() => setRange('week')}
          >
            Last 7 Days
          </button>
          <button onClick={fetchChartData} className="btn-refresh" title="Reload Charts">
            <MdAutorenew />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="analytics-loading">
          <div className="loader"></div>
          <p>Compiling historical energy trends...</p>
        </div>
      ) : (
        <div className="charts-grid">
          {/* Chart 1: Active Power Profile */}
          <div className="chart-card glass-panel">
            <h3>Active Power Signature</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7f00ff" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#7f00ff" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="displayName" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip content={<CustomTooltip unit=" W" />} />
                  <Area type="monotone" dataKey="power" name="Power" stroke="#7f00ff" fillOpacity={1} fill="url(#colorPower)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Grid Voltage vs Load Current */}
          <div className="chart-card glass-panel">
            <h3>Voltage & Current Balance</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="displayName" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Line yAxisId="left" type="monotone" dataKey="voltage" name="Voltage (V)" stroke="#00f2fe" activeDot={{ r: 6 }} strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="current" name="Current (A)" stroke="#ffd200" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Energy Consumed */}
          <div className="chart-card glass-panel">
            <h3>Energy Consumed</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="displayName" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip content={<CustomTooltip unit=" kWh" />} />
                  <Bar dataKey="energy" name="Energy Consumed" fill="#00f5a0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Accrued Cost */}
          <div className="chart-card glass-panel">
            <h3>Calculated Cost Increment</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff5858" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ff5858" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="displayName" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip content={<CustomTooltip unit=" $" />} />
                  <Area type="monotone" dataKey="bill" name="Incurred Cost" stroke="#ff5858" fillOpacity={1} fill="url(#colorBill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
