import { useState, useEffect } from 'react';
import { AuthPages } from './pages/AuthPages';
import { CommandCenter } from './pages/CommandCenter';
import { AdminPanel } from './pages/AdminPanel';
import { AnalyticsCenter } from './pages/AnalyticsCenter';
import { ResourcesPanel } from './pages/ResourcesPanel';
import { PresentationMode } from './pages/PresentationMode';
import { ShelterManagement } from './pages/ShelterManagement';
import { BroadcastCenter } from './pages/BroadcastCenter';
import { SystemHealth } from './pages/SystemHealth';
import type { User } from './utils/api';
import { LayoutDashboard, Shield, LogOut } from 'lucide-react';

type ViewType = 'command' | 'admin' | 'analytics' | 'resources' | 'presentation' | 'shelters' | 'broadcast' | 'health';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>('command');

  // Restore session from localStorage if present
  useEffect(() => {
    const savedUser = localStorage.getItem('aegis_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('aegis_user');
      }
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('aegis_user', JSON.stringify(loggedInUser));
    // Default Operator / Admin users to Command view
    setView('command');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('aegis_user');
  };

  if (!user) {
    return <AuthPages onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdminOrOperator = user.role === 'Administrator' || user.role === 'Super Administrator' || user.role === 'Operator';

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-lightest overflow-hidden">
      {/* 1. If Admin or Operator, we show a sub-header bar when in Admin Panel to navigate back.
          When in Command Center, the header is built-in. We can toggle views using a top control panel inside App.tsx. */}
      
      {view === 'admin' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Admin Header */}
          <header className="h-16 glass-card-header glass-card px-6 flex items-center justify-between z-20 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-danger animate-pulse" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-primary tracking-wider text-base">AEGIS</span>
                  <span className="font-extrabold text-secondary tracking-wider text-base">X</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-danger/10 text-danger border border-danger/20 tracking-wider">ADMIN PANEL</span>
                </div>
              </div>
            </div>

            {/* Navigation tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setView('command')}
                className="btn-secondary py-1.5 px-3 text-xs font-bold uppercase flex items-center gap-1.5"
              >
                <LayoutDashboard size={14} />
                Command Center
              </button>
              <button
                className="bg-primary text-white py-1.5 px-3 text-xs font-bold uppercase rounded-lg flex items-center gap-1.5 cursor-default"
              >
                <Shield size={14} />
                Admin Console
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-primary">{user.full_name}</div>
                <div className="text-[9px] font-extrabold text-danger uppercase tracking-widest">{user.role}</div>
              </div>
              <button 
                onClick={handleLogout}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-gray-dark hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-all duration-300 active:scale-90"
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>

          <AdminPanel currentUser={user} />
        </div>
      ) : (
        <div className="flex-grow flex flex-col overflow-hidden relative">
          {/* We are in CommandCenter or other Operator view.
              If they are Admin/Operator, we render a larger floating pill to switch views. */}
          {isAdminOrOperator && view !== 'presentation' && (
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-30">
              <div className="glass-card px-3 py-1.5 rounded-full flex gap-1 shadow-glass-sm border border-white/60 flex-wrap justify-center">
                {([
                  { key: 'command', label: 'Twin Map' },
                  { key: 'analytics', label: 'Analytics' },
                  { key: 'resources', label: 'Resources' },
                  { key: 'shelters', label: 'Shelters' },
                  { key: 'broadcast', label: 'Broadcast' },
                  { key: 'health', label: 'Health' },
                  { key: 'admin', label: 'Admin' },
                ] as { key: ViewType; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className={`text-[10px] font-black uppercase px-3 py-1 rounded-full cursor-pointer transition-all ${
                      view === key ? 'bg-primary text-white' : 'hover:bg-slate-100 text-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === 'command' && (
            <CommandCenter 
              user={user} 
              onLogout={handleLogout} 
              onOpenPresentation={() => setView('presentation')}
            />
          )}
          {view === 'analytics' && (
            <AnalyticsCenter onBack={() => setView('command')} />
          )}
          {view === 'resources' && (
            <ResourcesPanel onBack={() => setView('command')} />
          )}
          {view === 'shelters' && (
            <ShelterManagement onBack={() => setView('command')} />
          )}
          {view === 'broadcast' && (
            <BroadcastCenter onBack={() => setView('command')} currentUser={user ?? undefined} />
          )}
          {view === 'health' && (
            <SystemHealth onBack={() => setView('command')} />
          )}
          {view === 'presentation' && (
            <PresentationMode onBack={() => setView('command')} />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
