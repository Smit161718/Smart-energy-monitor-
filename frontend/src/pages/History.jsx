// src/pages/History.jsx
// Searchable, sortable, paginated meter readings table with CSV & PDF export

import { useState, useEffect, useCallback } from 'react';
import { Search, Download, FileText, ChevronUp, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';

const columns = [
  { key: 'created_at',  label: 'Date & Time',   sortable: true },
  { key: 'voltage',     label: 'Voltage (V)',    sortable: true },
  { key: 'current_amp', label: 'Current (A)',    sortable: true },
  { key: 'power',       label: 'Power (W)',      sortable: true },
  { key: 'energy',      label: 'Energy (kWh)',   sortable: true },
  { key: 'frequency',   label: 'Frequency (Hz)', sortable: true },
  { key: 'power_factor',label: 'Power Factor',   sortable: true },
  { key: 'bill',        label: 'Bill (₹)',       sortable: true },
];

const fmt = (v, d = 2) => (v !== null && v !== undefined ? parseFloat(v).toFixed(d) : '—');

const formatDate = (ts) => {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-IN'),
    time: d.toLocaleTimeString('en-IN'),
  };
};

export default function History() {
  const [data,        setData]        = useState([]);
  const [pagination,  setPagination]  = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search,      setSearch]      = useState('');
  const [sort,        setSort]        = useState('created_at');
  const [order,       setOrder]       = useState('desc');
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: pagination.limit, sort, order });
      if (search) params.set('search', search);
      const { data: res } = await api.get(`/meter/history?${params}`);
      if (res.success) {
        setData(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, sort, order, pagination.limit]);

  useEffect(() => { fetchData(1); }, [sort, order]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData(1);
  };

  const handleSort = (key) => {
    if (sort === key) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setOrder('desc'); }
  };

  // ── CSV Export ───────────────────────────────────────────────
  const exportCSV = async () => {
    setDownloading(true);
    try {
      const { data: res } = await api.get('/meter/history?page=1&limit=10000');
      const rows = res.data;
      const headers = ['Date', 'Time', 'Voltage(V)', 'Current(A)', 'Power(W)', 'Energy(kWh)', 'Frequency(Hz)', 'PowerFactor', 'Bill(Rs)'];
      const csvRows = rows.map(r => {
        const { date, time } = formatDate(r.created_at);
        return [date, time, fmt(r.voltage), fmt(r.current_amp, 4), fmt(r.power), fmt(r.energy, 4), fmt(r.frequency), fmt(r.power_factor, 4), fmt(r.bill, 4)].join(',');
      });
      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `energy_history_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    finally { setDownloading(false); }
  };

  // ── PDF Export ───────────────────────────────────────────────
  const exportPDF = async () => {
    setDownloading(true);
    try {
      const { data: res } = await api.get('/meter/history?page=1&limit=500');
      const rows = res.data;
      const doc  = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text('Smart Energy Monitor — Reading History', 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 23);
      autoTable(doc, {
        startY: 28,
        head: [['Date', 'Time', 'Voltage(V)', 'Current(A)', 'Power(W)', 'Energy(kWh)', 'Freq(Hz)', 'PF', 'Bill(₹)']],
        body: rows.map(r => {
          const { date, time } = formatDate(r.created_at);
          return [date, time, fmt(r.voltage), fmt(r.current_amp, 4), fmt(r.power), fmt(r.energy, 4), fmt(r.frequency), fmt(r.power_factor, 4), fmt(r.bill, 4)];
        }),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235] },
        alternateRowStyles: { fillColor: [245, 247, 255] },
      });
      doc.save(`energy_history_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch { /* silent */ }
    finally { setDownloading(false); }
  };

  const SortIcon = ({ col }) => {
    if (sort !== col) return <ChevronUp size={12} style={{ opacity: 0.3 }} />;
    return order === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const goToPage = (p) => {
    if (p >= 1 && p <= pagination.totalPages) fetchData(p);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Reading History</h2>
          <p className="page-subtitle">All sensor readings from your ESP32 device · {pagination.total} total records</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button id="export-csv-btn" className="btn btn-outline btn-sm" onClick={exportCSV} disabled={downloading}>
            <Download size={14} /> CSV
          </button>
          <button id="export-pdf-btn" className="btn btn-primary btn-sm" onClick={exportPDF} disabled={downloading}>
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              id="history-search-input"
              placeholder="Search by date (YYYY-MM-DD)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button id="history-search-btn" type="submit" className="btn btn-primary btn-sm">Search</button>
          {search && <button type="button" className="btn btn-outline btn-sm" onClick={() => { setSearch(''); fetchData(1); }}>Clear</button>}
        </form>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                {columns.map(col => (
                  <th key={col.key} onClick={() => col.sortable && handleSort(col.key)} style={{ cursor: col.sortable ? 'pointer' : 'default' }}>
                    {col.label} {col.sortable && <SortIcon col={col.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, width: j === 0 ? 30 : 70, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                    No readings found. Make sure your ESP32 is connected and posting data.
                  </td>
                </tr>
              ) : data.map((row, i) => {
                const { date, time } = formatDate(row.created_at);
                const rowNum = (pagination.page - 1) * pagination.limit + i + 1;
                return (
                  <tr key={row.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{rowNum}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{date}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{time}</div>
                    </td>
                    <td><span className="badge badge-blue">{fmt(row.voltage)} V</span></td>
                    <td>{fmt(row.current_amp, 4)} A</td>
                    <td>
                      <span className={`badge ${parseFloat(row.power) > 2000 ? 'badge-danger' : parseFloat(row.power) > 1000 ? 'badge-warning' : 'badge-success'}`}>
                        {fmt(row.power, 0)} W
                      </span>
                    </td>
                    <td>{fmt(row.energy, 4)} kWh</td>
                    <td>{fmt(row.frequency)} Hz</td>
                    <td>
                      <span className={`badge ${parseFloat(row.power_factor) >= 0.9 ? 'badge-success' : parseFloat(row.power_factor) >= 0.7 ? 'badge-warning' : 'badge-danger'}`}>
                        {fmt(row.power_factor, 4)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{fmt(row.bill, 4)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div className="pagination">
            <span className="pagination-info">
              Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
            </span>
            <div className="pagination-controls">
              <button id="page-first-btn" className="page-btn" onClick={() => goToPage(1)} disabled={pagination.page === 1}><ChevronsLeft size={14} /></button>
              <button id="page-prev-btn"  className="page-btn" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1}><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
                const p = start + i;
                return p <= pagination.totalPages ? (
                  <button key={p} className={`page-btn ${pagination.page === p ? 'active' : ''}`} onClick={() => goToPage(p)}>{p}</button>
                ) : null;
              })}
              <button id="page-next-btn" className="page-btn" onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}><ChevronRight size={14} /></button>
              <button id="page-last-btn" className="page-btn" onClick={() => goToPage(pagination.totalPages)} disabled={pagination.page === pagination.totalPages}><ChevronsRight size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
