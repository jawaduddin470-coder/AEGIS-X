import React, { useState } from 'react';
import {
  X, Radio, Send, Bell, AlertTriangle, Info,
  CheckCircle2, Clock, Plus, Trash2, Megaphone,
  Globe, Smartphone, Monitor,
} from 'lucide-react';

interface BroadcastCenterProps {
  onBack: () => void;
  currentUser?: { full_name: string; role: string };
}

type MessageType = 'info' | 'warning' | 'critical' | 'resolved';
type Channel = 'web' | 'mobile' | 'all';

interface Broadcast {
  id: string;
  title: string;
  body: string;
  type: MessageType;
  channel: Channel;
  sent_by: string;
  sent_at: string;
  reach: number;
  pinned: boolean;
}

const TYPE_CONFIG: Record<MessageType, { label: string; color: string; bg: string; icon: React.ReactNode; dotColor: string }> = {
  info: { label: 'Information', color: 'text-[#5DADE2]', bg: 'bg-[#5DADE2]/10 border-[#5DADE2]/20', icon: <Info size={14} />, dotColor: 'bg-[#5DADE2]' },
  warning: { label: 'Warning', color: 'text-warning', bg: 'bg-warning/10 border-warning/20', icon: <AlertTriangle size={14} />, dotColor: 'bg-warning' },
  critical: { label: 'Critical Alert', color: 'text-danger', bg: 'bg-danger/10 border-danger/20', icon: <AlertTriangle size={14} />, dotColor: 'bg-danger animate-pulse' },
  resolved: { label: 'Resolved', color: 'text-success', bg: 'bg-success/10 border-success/20', icon: <CheckCircle2 size={14} />, dotColor: 'bg-success' },
};

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: React.ReactNode }> = {
  all: { label: 'All Platforms', icon: <Globe size={13} /> },
  web: { label: 'Web Only', icon: <Monitor size={13} /> },
  mobile: { label: 'Mobile Only', icon: <Smartphone size={13} /> },
};

const DEMO_BROADCASTS: Broadcast[] = [
  { id: '1', title: 'Flash Flood Warning — Musi River Basin', body: 'Water levels in the Musi River have exceeded safe thresholds. Residents in low-lying areas of Amberpet, Malakpet, and Uppal are advised to evacuate immediately to designated shelters.', type: 'critical', channel: 'all', sent_by: 'Superintendent Rajesh Kumar', sent_at: '2024-07-02T14:30:00', reach: 45231, pinned: true },
  { id: '2', title: 'Shelter Activation — Banjara Hills Community Hall', body: 'The GHMC Community Hall at Banjara Hills Road No. 12 is now open as an emergency shelter. Capacity: 500 persons. Medical aid and food available.', type: 'info', channel: 'all', sent_by: 'GHMC Control Room', sent_at: '2024-07-02T12:15:00', reach: 32100, pinned: true },
  { id: '3', title: 'Power Restoration Update', body: 'TSSPDCL has restored power to 73% of affected areas in Secunderabad. Remaining outages expected to be resolved by 6:00 PM today.', type: 'resolved', channel: 'web', sent_by: 'Operations Team', sent_at: '2024-07-02T10:00:00', reach: 18500, pinned: false },
  { id: '4', title: 'Road Closure — Necklace Road', body: 'Necklace Road near Hussain Sagar Lake has been closed to traffic due to flooding. Use alternate routes via MG Road and Tank Bund.', type: 'warning', channel: 'mobile', sent_by: 'Traffic Police Control', sent_at: '2024-07-02T09:30:00', reach: 22750, pinned: false },
];

const QUICK_TEMPLATES = [
  { title: 'Evacuate Immediately', body: 'An emergency has been declared. Please evacuate to the nearest designated shelter immediately. Follow instructions from emergency personnel.', type: 'critical' as MessageType },
  { title: 'All Clear', body: 'The emergency situation has been resolved. It is now safe to return to your homes. Please exercise caution and follow official guidelines.', type: 'resolved' as MessageType },
  { title: 'Shelter Open', body: 'Emergency shelters are now open in your area. Capacity is available. Bring essential medications, documents, and clothing for 48 hours.', type: 'info' as MessageType },
  { title: 'Stay Indoors', body: 'Due to ongoing emergency conditions, residents are advised to stay indoors. Avoid unnecessary travel until further notice.', type: 'warning' as MessageType },
];

export const BroadcastCenter: React.FC<BroadcastCenterProps> = ({ onBack, currentUser }) => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(DEMO_BROADCASTS);
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [msgType, setMsgType] = useState<MessageType>('info');
  const [channel, setChannel] = useState<Channel>('all');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    const newBroadcast: Broadcast = {
      id: Date.now().toString(),
      title: title.trim(),
      body: body.trim(),
      type: msgType,
      channel,
      sent_by: currentUser?.full_name ?? 'Admin',
      sent_at: new Date().toISOString(),
      reach: Math.floor(Math.random() * 15000) + 5000,
      pinned: false,
    };
    setBroadcasts(prev => [newBroadcast, ...prev]);
    setSending(false);
    setSent(true);
    setTitle('');
    setBody('');
    setMsgType('info');
    setChannel('all');
    setTimeout(() => { setSent(false); setShowCompose(false); }, 2000);
  };

  const handleTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    setTitle(t.title);
    setBody(t.body);
    setMsgType(t.type);
    setShowCompose(true);
  };

  const pinnedCount = broadcasts.filter(b => b.pinned).length;
  const totalReach = broadcasts.reduce((sum, b) => sum + b.reach, 0);

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col">
      {/* Header */}
      <header className="h-16 glass-card-header glass-card px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-[#D6EAF8] transition-all">
            <X size={14} className="text-[#1E3A5F]" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
            <Radio size={16} className="text-[#1E3A5F]" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-[#1E3A5F] tracking-wider">BROADCAST CENTER</h1>
            <p className="text-[9px] text-[#64748B] font-medium uppercase tracking-widest">Emergency Public Notification System</p>
          </div>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 bg-danger text-white text-[10px] font-extrabold px-4 py-2 rounded-xl hover:bg-red-700 transition-all shadow-lg"
        >
          <Megaphone size={13} />
          New Broadcast
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Broadcasts', value: broadcasts.length, icon: <Radio size={18} />, color: 'text-[#1E3A5F]', bg: 'bg-[#1E3A5F]/10' },
            { label: 'Pinned Alerts', value: pinnedCount, icon: <Bell size={18} />, color: 'text-danger', bg: 'bg-danger/10' },
            { label: 'Total Reach', value: totalReach.toLocaleString(), icon: <Globe size={18} />, color: 'text-[#5DADE2]', bg: 'bg-[#5DADE2]/10' },
            { label: 'Critical Active', value: broadcasts.filter(b => b.type === 'critical').length, icon: <AlertTriangle size={18} />, color: 'text-warning', bg: 'bg-warning/10' },
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

        {/* Quick Templates */}
        <div className="bg-white border border-[#E6EEF5] rounded-xl p-5 shadow-glass-sm">
          <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider mb-3">⚡ Quick Templates</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_TEMPLATES.map(t => {
              const cfg = TYPE_CONFIG[t.type];
              return (
                <button
                  key={t.title}
                  onClick={() => handleTemplate(t)}
                  className={`text-left p-3 rounded-xl border ${cfg.bg} ${cfg.color} hover:opacity-80 transition-all`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {cfg.icon}
                    <span className="text-[9px] font-extrabold uppercase tracking-wider">{cfg.label}</span>
                  </div>
                  <p className="text-[10px] font-bold leading-tight">{t.title}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Broadcasts List */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">Recent Broadcasts</h3>
          {broadcasts.map(b => {
            const cfg = TYPE_CONFIG[b.type];
            const channelCfg = CHANNEL_CONFIG[b.channel];
            return (
              <div key={b.id} className={`bg-white border rounded-xl p-5 shadow-glass-sm animate-fade-in-up ${b.pinned ? 'border-[#5DADE2]/40 ring-1 ring-[#5DADE2]/20' : 'border-[#E6EEF5]'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-extrabold border ${cfg.bg} ${cfg.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                      {cfg.label.toUpperCase()}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[8px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                      {channelCfg.icon}
                      {channelCfg.label}
                    </span>
                    {b.pinned && <span className="text-[8px] font-bold text-[#5DADE2] bg-[#5DADE2]/10 px-2 py-0.5 rounded border border-[#5DADE2]/20">📌 PINNED</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[9px] text-[#64748B]">👥 {b.reach.toLocaleString()} reached</span>
                    <button
                      onClick={() => setBroadcasts(prev => prev.filter(br => br.id !== b.id))}
                      className="h-6 w-6 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-danger/10 ml-1"
                    >
                      <Trash2 size={10} className="text-danger" />
                    </button>
                  </div>
                </div>
                <h4 className="text-sm font-extrabold text-[#1E3A5F] mb-1">{b.title}</h4>
                <p className="text-[11px] text-[#64748B] leading-relaxed">{b.body}</p>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F1F5F9]">
                  <Clock size={11} className="text-[#94A3B8]" />
                  <span className="text-[10px] text-[#94A3B8]">{new Date(b.sent_at).toLocaleString()}</span>
                  <span className="text-[10px] text-[#94A3B8]">by {b.sent_by}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-5 border-b border-[#E6EEF5] flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#1E3A5F] flex items-center gap-2">
                <Megaphone size={16} className="text-danger" />
                Compose Broadcast
              </h2>
              <button onClick={() => setShowCompose(false)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-[#D6EAF8]">
                <X size={13} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Alert Type</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(TYPE_CONFIG) as MessageType[]).map(t => {
                    const cfg = TYPE_CONFIG[t];
                    return (
                      <button key={t} onClick={() => setMsgType(t)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border flex items-center gap-1 transition-all ${
                          msgType === t ? `${cfg.bg} ${cfg.color} ring-1` : 'bg-white text-[#64748B] border-[#E6EEF5]'
                        }`}
                      >
                        {cfg.icon} {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Channel */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Broadcast Channel</label>
                <div className="flex gap-2">
                  {(Object.keys(CHANNEL_CONFIG) as Channel[]).map(c => (
                    <button key={c} onClick={() => setChannel(c)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border flex items-center gap-1 transition-all ${
                        channel === c ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-[#64748B] border-[#E6EEF5]'
                      }`}
                    >
                      {CHANNEL_CONFIG[c].icon} {CHANNEL_CONFIG[c].label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Headline *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  maxLength={80} placeholder="Brief alert headline..."
                  className="w-full h-9 px-3 text-xs border border-[#E6EEF5] rounded-lg focus:outline-none focus:border-[#5DADE2] text-[#1E3A5F]" />
              </div>
              {/* Body */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Message Body *</label>
                <textarea value={body} onChange={e => setBody(e.target.value)}
                  rows={4} maxLength={500} placeholder="Detailed emergency message..."
                  className="w-full px-3 py-2 text-xs border border-[#E6EEF5] rounded-lg focus:outline-none focus:border-[#5DADE2] text-[#1E3A5F] resize-none"
                />
                <p className="text-[9px] text-[#94A3B8] text-right">{body.length}/500</p>
              </div>

              {sent ? (
                <div className="w-full h-10 bg-success text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} />
                  Broadcast Sent Successfully!
                </div>
              ) : (
                <button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()}
                  className="w-full h-10 bg-danger text-white text-xs font-extrabold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <><span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                  ) : (
                    <><Send size={13} /> Send Broadcast to All</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
