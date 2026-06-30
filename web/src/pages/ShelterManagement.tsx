import React, { useState, useEffect, useCallback } from 'react';
import {
  Home, Plus, Edit2, Trash2, X, Search, Filter,
  Users, MapPin, CheckCircle2, AlertTriangle, RotateCcw,
  Shield, Wifi, WifiOff, ChevronDown,
} from 'lucide-react';

interface ShelterManagementProps {
  onBack: () => void;
}

interface Shelter {
  id: string;
  name: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  status: 'active' | 'full' | 'closed' | 'standby';
  type: 'primary' | 'secondary' | 'temporary';
  amenities: string[];
  contact: string;
  opened_at: string;
  has_medical: boolean;
  has_food: boolean;
  has_power: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dotColor: string }> = {
  active: { label: 'ACTIVE', color: 'text-success', bg: 'bg-success/10 border-success/20', dotColor: 'bg-success' },
  full: { label: 'FULL', color: 'text-danger', bg: 'bg-danger/10 border-danger/20', dotColor: 'bg-danger' },
  closed: { label: 'CLOSED', color: 'text-gray-400', bg: 'bg-gray-100 border-gray-200', dotColor: 'bg-gray-400' },
  standby: { label: 'STANDBY', color: 'text-warning', bg: 'bg-warning/10 border-warning/20', dotColor: 'bg-warning' },
};

const TYPE_LABELS: Record<string, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  temporary: 'Temporary',
};

const DEMO_SHELTERS: Shelter[] = [
  { id: '1', name: 'GHMC Community Hall — Banjara Hills', address: 'Road No. 12, Banjara Hills', area: 'Banjara Hills', lat: 17.4125, lng: 78.4428, capacity: 500, occupied: 320, status: 'active', type: 'primary', amenities: ['Water', 'Food', 'Medical', 'Power'], contact: '040-23456789', opened_at: '2024-07-01', has_medical: true, has_food: true, has_power: true },
  { id: '2', name: 'St. Ann\'s School — Secunderabad', address: 'SP Road, Secunderabad', area: 'Secunderabad', lat: 17.4399, lng: 78.4983, capacity: 800, occupied: 800, status: 'full', type: 'primary', amenities: ['Water', 'Food', 'Power'], contact: '040-27856781', opened_at: '2024-07-01', has_medical: false, has_food: true, has_power: true },
  { id: '3', name: 'Municipal Grounds — LB Nagar', address: 'ECIL Road, LB Nagar', area: 'LB Nagar', lat: 17.3492, lng: 78.5470, capacity: 300, occupied: 45, status: 'active', type: 'temporary', amenities: ['Water', 'Food'], contact: '040-24567890', opened_at: '2024-07-02', has_medical: false, has_food: true, has_power: false },
  { id: '4', name: 'Rajiv Gandhi Sports Complex', address: 'Necklace Road, Hussain Sagar', area: 'Hussain Sagar', lat: 17.4225, lng: 78.4736, capacity: 1200, occupied: 0, status: 'standby', type: 'secondary', amenities: ['Water', 'Power', 'Medical'], contact: '040-23876543', opened_at: '', has_medical: true, has_food: false, has_power: true },
  { id: '5', name: 'KPHB Colony Welfare Center', address: 'Phase 3, KPHB Colony', area: 'Kukatpally', lat: 17.4784, lng: 78.3920, capacity: 200, occupied: 178, status: 'active', type: 'secondary', amenities: ['Water', 'Food', 'Medical', 'Power'], contact: '040-23019876', opened_at: '2024-07-01', has_medical: true, has_food: true, has_power: true },
];

const defaultForm: Omit<Shelter, 'id'> = {
  name: '', address: '', area: '', lat: 17.385, lng: 78.487,
  capacity: 200, occupied: 0, status: 'standby', type: 'temporary',
  amenities: [], contact: '', opened_at: '', has_medical: false, has_food: false, has_power: false,
};

export const ShelterManagement: React.FC<ShelterManagementProps> = ({ onBack }) => {
  const [shelters, setShelters] = useState<Shelter[]>(DEMO_SHELTERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Shelter, 'id'>>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const filtered = shelters.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.area.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0);
  const totalOccupied = shelters.reduce((sum, s) => sum + s.occupied, 0);
  const activeCount = shelters.filter(s => s.status === 'active').length;

  const handleSubmit = () => {
    if (!form.name.trim() || !form.address.trim()) return;
    if (editingId) {
      setShelters(prev => prev.map(s => s.id === editingId ? { ...form, id: editingId } : s));
    } else {
      setShelters(prev => [...prev, { ...form, id: Date.now().toString() }]);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleEdit = (shelter: Shelter) => {
    const { id, ...rest } = shelter;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setShelters(prev => prev.filter(s => s.id !== id));
    setDeleteConfirm(null);
  };

  const occupancyPct = (s: Shelter) => Math.round((s.occupied / s.capacity) * 100);

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col">
      {/* Header */}
      <header className="h-16 glass-card-header glass-card px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-[#D6EAF8] transition-all">
            <X size={14} className="text-[#1E3A5F]" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
            <Home size={16} className="text-[#1E3A5F]" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-[#1E3A5F] tracking-wider">SHELTER MANAGEMENT</h1>
            <p className="text-[9px] text-[#64748B] font-medium uppercase tracking-widest">Hyderabad Emergency Shelter Network</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#64748B]">Updated {lastRefresh.toLocaleTimeString()}</span>
          <button
            onClick={() => setLastRefresh(new Date())}
            className="flex items-center gap-1.5 text-[10px] font-bold text-[#5DADE2] hover:text-[#1E3A5F] transition-all"
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}
            className="flex items-center gap-1.5 bg-[#1E3A5F] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#2C5282] transition-all"
          >
            <Plus size={12} />
            Add Shelter
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Shelters', value: shelters.length, icon: <Home size={18} />, color: 'text-[#1E3A5F]', bg: 'bg-[#1E3A5F]/10' },
            { label: 'Active Now', value: activeCount, icon: <CheckCircle2 size={18} />, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Total Capacity', value: totalCapacity.toLocaleString(), icon: <Users size={18} />, color: 'text-[#5DADE2]', bg: 'bg-[#5DADE2]/10' },
            { label: 'Currently Occupied', value: `${totalOccupied.toLocaleString()} (${Math.round(totalOccupied / totalCapacity * 100)}%)`, icon: <Shield size={18} />, color: 'text-warning', bg: 'bg-warning/10' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white border border-[#E6EEF5] rounded-xl p-4 flex items-center gap-3 shadow-glass-sm">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${kpi.bg} ${kpi.color}`}>{kpi.icon}</div>
              <div>
                <div className="text-lg font-black text-[#1E3A5F]">{kpi.value}</div>
                <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search shelters..."
              className="w-full h-9 pl-8 pr-3 text-xs border border-[#E6EEF5] rounded-lg bg-white focus:outline-none focus:border-[#5DADE2] text-[#1E3A5F]"
            />
          </div>
          {['all', 'active', 'full', 'standby', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                statusFilter === s
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                  : 'bg-white text-[#64748B] border-[#E6EEF5] hover:border-[#5DADE2]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Shelter Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(shelter => {
            const cfg = STATUS_CONFIG[shelter.status];
            const pct = occupancyPct(shelter);
            return (
              <div key={shelter.id} className="bg-white border border-[#E6EEF5] rounded-xl p-5 shadow-glass-sm hover-elevation animate-fade-in-up">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-extrabold border ${cfg.bg} ${cfg.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                        {cfg.label}
                      </span>
                      <span className="text-[8px] font-bold text-[#64748B] uppercase bg-[#F1F5F9] px-2 py-0.5 rounded">
                        {TYPE_LABELS[shelter.type]}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-[#1E3A5F] leading-tight">{shelter.name}</h3>
                    <p className="text-[10px] text-[#64748B] mt-0.5 flex items-center gap-1">
                      <MapPin size={10} />
                      {shelter.address}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => handleEdit(shelter)} className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-[#D6EAF8] transition-all">
                      <Edit2 size={11} className="text-[#5DADE2]" />
                    </button>
                    <button onClick={() => setDeleteConfirm(shelter.id)} className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-danger/10 transition-all">
                      <Trash2 size={11} className="text-danger" />
                    </button>
                  </div>
                </div>

                {/* Occupancy Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Occupancy</span>
                    <span className="text-[10px] font-extrabold text-[#1E3A5F]">{shelter.occupied} / {shelter.capacity} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 90 ? '#E63946' : pct >= 70 ? '#F4A261' : '#2E8B57',
                      }}
                    />
                  </div>
                </div>

                {/* Amenities */}
                <div className="flex items-center gap-2 flex-wrap">
                  {shelter.has_medical && (
                    <span className="text-[8px] font-bold text-[#5DADE2] bg-[#5DADE2]/10 px-2 py-0.5 rounded border border-[#5DADE2]/20">🏥 Medical</span>
                  )}
                  {shelter.has_food && (
                    <span className="text-[8px] font-bold text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">🍲 Food</span>
                  )}
                  {shelter.has_power && (
                    <span className="text-[8px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20">⚡ Power</span>
                  )}
                  <span className="text-[8px] font-medium text-[#64748B] ml-auto">📞 {shelter.contact}</span>
                </div>

                {/* Delete Confirm */}
                {deleteConfirm === shelter.id && (
                  <div className="mt-3 p-3 bg-danger/5 border border-danger/20 rounded-lg flex items-center gap-2">
                    <AlertTriangle size={13} className="text-danger flex-shrink-0" />
                    <span className="text-[10px] text-danger font-bold flex-1">Remove this shelter?</span>
                    <button onClick={() => handleDelete(shelter.id)} className="text-[9px] font-extrabold text-white bg-danger px-2 py-1 rounded">Yes, Remove</button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-[9px] font-extrabold text-[#64748B] px-2 py-1 rounded border border-[#E6EEF5]">Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#64748B]">
            <Home size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">No shelters found</p>
            <p className="text-xs">Adjust your filters or add a new shelter</p>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-[#E6EEF5] flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-sm font-extrabold text-[#1E3A5F]">{editingId ? 'Edit Shelter' : 'Add New Shelter'}</h2>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-[#D6EAF8]">
                <X size={13} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Shelter Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-9 px-3 text-xs border border-[#E6EEF5] rounded-lg focus:outline-none focus:border-[#5DADE2] text-[#1E3A5F]"
                  placeholder="e.g. GHMC Community Hall" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Address *</label>
                  <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full h-9 px-3 text-xs border border-[#E6EEF5] rounded-lg focus:outline-none focus:border-[#5DADE2] text-[#1E3A5F]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Area</label>
                  <input type="text" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                    className="w-full h-9 px-3 text-xs border border-[#E6EEF5] rounded-lg focus:outline-none focus:border-[#5DADE2] text-[#1E3A5F]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Capacity</label>
                  <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))}
                    className="w-full h-9 px-3 text-xs border border-[#E6EEF5] rounded-lg focus:outline-none focus:border-[#5DADE2] text-[#1E3A5F]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Currently Occupied</label>
                  <input type="number" value={form.occupied} onChange={e => setForm(f => ({ ...f, occupied: +e.target.value }))}
                    className="w-full h-9 px-3 text-xs border border-[#E6EEF5] rounded-lg focus:outline-none focus:border-[#5DADE2] text-[#1E3A5F]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full h-9 px-3 text-xs border border-[#E6EEF5] rounded-lg focus:outline-none focus:border-[#5DADE2] text-[#1E3A5F] bg-white">
                    <option value="standby">Standby</option>
                    <option value="active">Active</option>
                    <option value="full">Full</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full h-9 px-3 text-xs border border-[#E6EEF5] rounded-lg focus:outline-none focus:border-[#5DADE2] text-[#1E3A5F] bg-white">
                    <option value="temporary">Temporary</option>
                    <option value="secondary">Secondary</option>
                    <option value="primary">Primary</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Contact Number</label>
                <input type="text" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                  className="w-full h-9 px-3 text-xs border border-[#E6EEF5] rounded-lg focus:outline-none focus:border-[#5DADE2] text-[#1E3A5F]" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.has_medical} onChange={e => setForm(f => ({ ...f, has_medical: e.target.checked }))} className="rounded" />
                  <span className="text-xs font-bold text-[#1E3A5F]">🏥 Medical</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.has_food} onChange={e => setForm(f => ({ ...f, has_food: e.target.checked }))} className="rounded" />
                  <span className="text-xs font-bold text-[#1E3A5F]">🍲 Food</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.has_power} onChange={e => setForm(f => ({ ...f, has_power: e.target.checked }))} className="rounded" />
                  <span className="text-xs font-bold text-[#1E3A5F]">⚡ Power</span>
                </label>
              </div>
              <button onClick={handleSubmit} className="w-full h-10 bg-[#1E3A5F] text-white text-xs font-extrabold rounded-xl hover:bg-[#2C5282] transition-all tracking-wider">
                {editingId ? 'Save Changes' : 'Create Shelter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
