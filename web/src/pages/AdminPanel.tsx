import React, { useState, useEffect } from 'react';
import { 
  Users, Cpu, ListCollapse, Database, 
  Trash2, ShieldCheck, Plus, RefreshCw 
} from 'lucide-react';
import { api } from '../utils/api';
import type { User, Resource } from '../utils/api';

interface AdminPanelProps {
  currentUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'resources' | 'system' | 'logs'>('users');
  
  // Data lists
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  // Stats
  const [loading, setLoading] = useState(false);
  
  // Resource addition modal/fields
  const [newResName, setNewResName] = useState('');
  const [newResType, setNewResType] = useState('Ambulance');
  const [newResLat, setNewResLat] = useState(40.7580);
  const [newResLng, setNewResLng] = useState(-73.9855);

  // Load lists
  const loadData = async () => {
    setLoading(true);
    try {
      // Mock Users list since backend doesn't have a direct GET all users (except via login seed)
      // We will fetch resources and incidents from api, and seed users mock list locally
      const ress = await api.fetchResources();
      setResources(ress);
      
      // Localized user state to mock User Management
      setUsers([
        { id: 1, email: 'citizen@aegis.com', full_name: 'Alex Mercer', role: 'Citizen' },
        { id: 2, email: 'responder@aegis.com', full_name: 'Captain Jack Vance', role: 'Responder' },
        { id: 3, email: 'operator@aegis.com', full_name: 'Sarah Connor', role: 'Operator' },
        { id: 4, email: 'admin@aegis.com', full_name: 'Director Vance', role: 'Administrator' },
        { id: 5, email: 'super@aegis.com', full_name: 'SuperAdmin Marcus', role: 'Super Administrator' },
      ]);

      // Seed mock audit logs
      setLogs([
        { id: 1, action: 'User Registration', detail: 'Alex Mercer registered via Citizen Portal', timestamp: '2026-06-26 23:28:10', user: 'System' },
        { id: 2, action: 'Resource Dispatched', detail: 'Ambulance Medic-12 assigned to Bryant Park Fire', timestamp: '2026-06-26 23:28:44', user: 'Operator Sarah' },
        { id: 3, action: 'Role Update', detail: 'Sarah Connor updated to Operator role privileges', timestamp: '2026-06-26 23:29:12', user: 'Director Vance' },
        { id: 4, action: 'Simulation Start', detail: 'Fire propagation simulation run at 40.7536, -73.9832', timestamp: '2026-06-26 23:30:05', user: 'Operator Sarah' },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update user role
  const handleUpdateRole = (userId: number, newRole: any) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    // Add to audit logs
    const u = users.find(x => x.id === userId);
    setLogs(prev => [
      {
        id: prev.length + 1,
        action: 'Role Modification',
        detail: `Updated role of ${u?.full_name} to ${newRole}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        user: currentUser.full_name
      },
      ...prev
    ]);
  };

  // Add a resource
  const handleAddResource = async () => {
    if (!newResName.trim()) return;
    try {
      // Mock create resource locally for preview
      const newRes: Resource = {
        id: resources.length + 1,
        name: newResName,
        type: newResType as any,
        capacity: 0,
        max_capacity: 4,
        latitude: newResLat,
        longitude: newResLng,
        status: 'Available'
      };
      setResources(prev => [...prev, newRes]);
      setNewResName('');
      
      // Add log
      setLogs(prev => [
        {
          id: prev.length + 1,
          action: 'Resource Created',
          detail: `Added new ${newResType}: ${newResName}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          user: currentUser.full_name
        },
        ...prev
      ]);
    } catch (e) {}
  };

  // Delete a resource
  const handleDeleteResource = (id: number) => {
    const res = resources.find(r => r.id === id);
    setResources(prev => prev.filter(r => r.id !== id));
    setLogs(prev => [
      {
        id: prev.length + 1,
        action: 'Resource Removed',
        detail: `Deleted resource: ${res?.name}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        user: currentUser.full_name
      },
      ...prev
    ]);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50">
      
      {/* Sidebar navigation */}
      <nav className="w-64 border-r border-slate-200 bg-white flex flex-col p-4 gap-2 flex-shrink-0">
        <div className="px-3 py-2 text-xs font-bold text-gray-medium uppercase tracking-wider mb-2">
          Admin Operations
        </div>
        
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'users'
              ? 'bg-primary text-white'
              : 'text-gray-dark hover:bg-slate-100'
          }`}
        >
          <Users size={16} />
          User & Role Control
        </button>

        <button
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'resources'
              ? 'bg-primary text-white'
              : 'text-gray-dark hover:bg-slate-100'
          }`}
        >
          <Database size={16} />
          Resource Registry
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'system'
              ? 'bg-primary text-white'
              : 'text-gray-dark hover:bg-slate-100'
          }`}
        >
          <Cpu size={16} />
          System Monitoring
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'logs'
              ? 'bg-primary text-white'
              : 'text-gray-dark hover:bg-slate-100'
          }`}
        >
          <ListCollapse size={16} />
          Security Audit Logs
        </button>

        <div className="mt-auto border-t border-slate-100 pt-4 px-3 text-[10px] text-gray-medium">
          <div>Admin Terminal Session</div>
          <div className="font-bold text-primary mt-1">Uptime: 99.98%</div>
        </div>
      </nav>

      {/* Main Admin Content Tab */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">
        
        {/* Module Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-primary">
              {activeTab === 'users' && 'User Access & Privilege Control'}
              {activeTab === 'resources' && 'Logistics & Resource Registry'}
              {activeTab === 'system' && 'Geospatial Server Telemetry'}
              {activeTab === 'logs' && 'System Transaction Audit Logs'}
            </h2>
            <p className="text-xs text-gray-medium mt-0.5">
              Secure municipal portal managed by {currentUser.full_name}
            </p>
          </div>
          <button 
            onClick={loadData}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
            disabled={loading}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh Module
          </button>
        </div>

        {/* Tab 1: User Management Table */}
        {activeTab === 'users' && (
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-bold uppercase text-primary">Operator ID</th>
                  <th className="p-4 text-xs font-bold uppercase text-primary">Full Name</th>
                  <th className="p-4 text-xs font-bold uppercase text-primary">Agency Email</th>
                  <th className="p-4 text-xs font-bold uppercase text-primary">Active Privilege Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-4 text-xs font-mono font-bold text-slate-500">#00{u.id}</td>
                    <td className="p-4 text-xs font-bold text-primary">{u.full_name}</td>
                    <td className="p-4 text-xs text-slate-600">{u.email}</td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1 font-bold text-primary focus:outline-none focus:ring-1 focus:ring-secondary"
                      >
                        <option value="Citizen">Citizen</option>
                        <option value="Responder">First Responder</option>
                        <option value="Operator">Operator</option>
                        <option value="Administrator">Administrator</option>
                        <option value="Super Administrator">Super Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Resource Inventory & Editor */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            {/* Add Resource Drawer */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200/60 bg-white">
              <h3 className="text-xs font-black uppercase text-primary tracking-wider mb-4 flex items-center gap-1">
                <Plus size={14} className="text-secondary" />
                Register New Dispatch Asset
              </h3>
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold text-gray-medium uppercase tracking-wider mb-1">Asset Name</label>
                  <input
                    type="text"
                    value={newResName}
                    onChange={(e) => setNewResName(e.target.value)}
                    placeholder="e.g. Squad-24 (Heavy Rescue)"
                    className="w-full text-xs border border-slate-200 rounded px-3 py-2 focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-medium uppercase tracking-wider mb-1">Asset Type</label>
                  <select
                    value={newResType}
                    onChange={(e) => setNewResType(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded px-3 py-2 focus:outline-none focus:border-secondary"
                  >
                    <option value="Ambulance">Ambulance</option>
                    <option value="Fire Truck">Fire Truck</option>
                    <option value="Police Vehicle">Police Vehicle</option>
                    <option value="Shelter">Shelter</option>
                    <option value="Hospital">Hospital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-medium uppercase tracking-wider mb-1">Deploy Lat</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newResLat}
                    onChange={(e) => setNewResLat(parseFloat(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded px-3 py-2 focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-medium uppercase tracking-wider mb-1">Deploy Lng</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newResLng}
                    onChange={(e) => setNewResLng(parseFloat(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded px-3 py-2 focus:outline-none focus:border-secondary"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddResource}
                    className="w-full btn-primary py-2 text-xs font-bold uppercase"
                  >
                    Register Asset
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold uppercase text-primary">Asset ID</th>
                    <th className="p-4 text-xs font-bold uppercase text-primary">Name</th>
                    <th className="p-4 text-xs font-bold uppercase text-primary">Type</th>
                    <th className="p-4 text-xs font-bold uppercase text-primary">Availability Status</th>
                    <th className="p-4 text-xs font-bold uppercase text-primary">Current Location</th>
                    <th className="p-4 text-xs font-bold uppercase text-primary text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resources.map(res => (
                    <tr key={res.id} className="hover:bg-slate-50/50">
                      <td className="p-4 text-xs font-mono font-bold text-slate-500">#RES-0{res.id}</td>
                      <td className="p-4 text-xs font-bold text-primary">{res.name}</td>
                      <td className="p-4 text-xs text-slate-600">{res.type}</td>
                      <td className="p-4">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          res.status === 'Available' ? 'bg-success/15 text-success-dark' : 'bg-warning/15 text-warning-dark'
                        }`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-500">{res.latitude.toFixed(4)}, {res.longitude.toFixed(4)}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteResource(res.id)}
                          className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors"
                          title="Delete resource"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: System Performance Charts Mocked */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Telemetry metrics */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200/60 bg-white">
              <h3 className="text-xs font-black uppercase text-primary tracking-wider mb-4">
                Active Telemetry & Health
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>CPU Core Allocation</span>
                    <span className="text-secondary">32%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: '32%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Memory Utilization (RAM)</span>
                    <span className="text-secondary">5.2 GB / 16 GB</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: '42%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>WebSocket Sync Latency</span>
                    <span className="text-success">14 ms (Optimized)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-success h-full rounded-full transition-all duration-500" style={{ width: '12%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Server statistics */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200/60 bg-white">
              <h3 className="text-xs font-black uppercase text-primary tracking-wider mb-4">
                Geospatial Cache & Database
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-[10px] font-bold text-gray-medium uppercase tracking-wider">Spatial Index Status</div>
                  <div className="text-sm font-black text-success mt-1 flex items-center gap-1">
                    <ShieldCheck size={14} />
                    OK (R-Tree)
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-[10px] font-bold text-gray-medium uppercase tracking-wider">WebSocket Listeners</div>
                  <div className="text-sm font-black text-primary mt-1">4 Active Connections</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-[10px] font-bold text-gray-medium uppercase tracking-wider">OpenRouter API Budget</div>
                  <div className="text-sm font-black text-primary mt-1">Free Tier ($0.00 Spent)</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-[10px] font-bold text-gray-medium uppercase tracking-wider">Database Mode</div>
                  <div className="text-sm font-black text-secondary mt-1">SQLite Development</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === 'logs' && (
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-bold uppercase text-primary">Timestamp</th>
                  <th className="p-4 text-xs font-bold uppercase text-primary">Operator</th>
                  <th className="p-4 text-xs font-bold uppercase text-primary">Transaction Node</th>
                  <th className="p-4 text-xs font-bold uppercase text-primary">Operational Action details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono text-slate-500">{log.timestamp}</td>
                    <td className="p-4 font-bold text-slate-700">{log.user}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        log.action.includes('Start') || log.action.includes('Created')
                          ? 'bg-secondary/10 text-secondary-dark'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
};
export default AdminPanel;
