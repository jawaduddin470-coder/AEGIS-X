import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, SkipForward, ArrowLeft,
  Tv, Sparkles, Activity, AlertTriangle, Truck,
  CheckCircle2, Clock, Shield, MapPin, ListCollapse
} from 'lucide-react';
import { api } from '../utils/api';

interface PresentationModeProps {
  onBack: () => void;
}

interface Scenario {
  id: number;
  title: string;
  type: 'Fire' | 'Flood' | 'Building Collapse' | 'Chemical Leak' | 'Earthquake' | 'Traffic Accident' | 'Stampede';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  location_name: string;
  latitude: number;
  longitude: number;
}

const HYDERABAD_SCENARIOS: Scenario[] = [
  {
    id: 1,
    title: 'Gachibowli IT Corridor Fire',
    type: 'Fire',
    severity: 'Critical',
    description: 'Commercial fire breakout on the 14th floor of a high-rise office complex in Hitech City grid.',
    location_name: 'Phase 2, Gachibowli IT Corridor',
    latitude: 17.4447,
    longitude: 78.3498
  },
  {
    id: 2,
    title: 'Begumpet Metro Area Flash Flood',
    type: 'Flood',
    severity: 'High',
    description: 'Heavy precipitation causing flash flooding at Begumpet Metro station underpass. Vehicles stranded.',
    location_name: 'Begumpet Metro Junction',
    latitude: 17.4375,
    longitude: 78.4482
  },
  {
    id: 3,
    title: 'Patancheru Industrial Chemical Leak',
    type: 'Chemical Leak',
    severity: 'Critical',
    description: 'Hazardous gas cylinder rupture at chemical manufacturing facility. Downwind dispersion threat.',
    location_name: 'Industrial Sector, Patancheru',
    latitude: 17.5255,
    longitude: 78.2678
  },
  {
    id: 4,
    title: 'Charminar Pilgrimage Stampede',
    type: 'Stampede',
    severity: 'Critical',
    description: 'Crowd surge at historical plaza during peak gathering hours. Multiple citizens require immediate first-aid.',
    location_name: 'Charminar Area, Old City',
    latitude: 17.3616,
    longitude: 78.4747
  },
  {
    id: 5,
    title: 'Kukatpally Junction Multi-Vehicle Crash',
    type: 'Traffic Accident',
    severity: 'Medium',
    description: 'Chain-reaction collision involving cargo truck and multiple sedans. Severe traffic blockage on NH-65.',
    location_name: 'Kukatpally Y Junction',
    latitude: 17.4841,
    longitude: 78.3888
  }
];

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

export const PresentationMode: React.FC<PresentationModeProps> = ({ onBack }) => {
  const [activeStep, setActiveStep] = useState<number>(-1); // -1 means demo idle
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(30); // 30s per scenario
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [triggeringScenarioId, setTriggeringScenarioId] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [
      ...prev,
      { id: Math.random().toString(), timestamp: timeStr, message, type }
    ]);
  }, []);

  // Scroll to bottom of activity logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle triggering a single scenario manually
  const triggerScenario = useCallback(async (scenario: Scenario) => {
    setTriggeringScenarioId(scenario.id);
    addLog(`Initiating scenario: "${scenario.title}"...`, 'info');
    try {
      // 1. Create incident
      const payload = {
        type: scenario.type,
        severity: scenario.severity,
        description: scenario.description,
        latitude: scenario.latitude,
        longitude: scenario.longitude,
        location_name: scenario.location_name
      };
      const incident = await api.createIncident(payload);
      addLog(`[System] Created Incident #${incident.id} - ${incident.type} (${incident.severity})`, 'success');

      // 2. Start simulation
      await api.startSimulation(scenario.type, scenario.latitude, scenario.longitude);
      addLog(`[Simulation] Launched real-time simulation model at coordinates ${scenario.latitude}, ${scenario.longitude}`, 'warning');

      // 3. Smart Resource Allocation suggestion log
      addLog(`[AI Engine] Calculating unit allocation matrix for ${scenario.type} in ${scenario.location_name}...`, 'info');
      setTimeout(() => {
        addLog(`[AI Engine] Recommendations ready: Dispatch Fire Crew, Medical team and Support Squad.`, 'success');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      addLog(`Failed to trigger scenario: ${err?.message || 'Server error'}`, 'danger');
    } finally {
      setTriggeringScenarioId(null);
    }
  }, [addLog]);

  // Sequencer auto-run step logic
  const advanceSequencer = useCallback(() => {
    setActiveStep(prev => {
      const nextStep = prev + 1;
      if (nextStep >= HYDERABAD_SCENARIOS.length) {
        addLog('★ Demo cycle complete. Auto-Presentation finished.', 'success');
        setIsPlaying(false);
        return -1;
      }
      const nextScenario = HYDERABAD_SCENARIOS[nextStep];
      addLog(`[Auto-Presenter] Advancing to Scenario ${nextStep + 1}: ${nextScenario.title}`, 'info');
      triggerScenario(nextScenario);
      setTimeLeft(30);
      return nextStep;
    });
  }, [triggerScenario, addLog]);

  // Timer loop for Auto-Demo Sequencer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            advanceSequencer();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, advanceSequencer]);

  const handleStartDemo = () => {
    if (activeStep === -1) {
      // Start from first scenario
      addLog('🚀 Starting Full Auto-Presentation Demo...', 'info');
      const firstScenario = HYDERABAD_SCENARIOS[0];
      setActiveStep(0);
      triggerScenario(firstScenario);
      setTimeLeft(30);
    } else {
      addLog('▶ Resuming Demo Sequencer', 'info');
    }
    setIsPlaying(true);
  };

  const handlePauseDemo = () => {
    setIsPlaying(false);
    addLog('⏸ Demo Sequencer Paused', 'warning');
  };

  const handleSkipDemo = () => {
    addLog('⏭ Skipping to next scenario...', 'info');
    advanceSequencer();
  };

  const handleResetDemo = () => {
    setIsPlaying(false);
    setActiveStep(-1);
    setTimeLeft(30);
    setLogs([]);
    api.stopSimulation().catch(() => {});
    addLog('🔄 Demo Reset. All simulation modules halted.', 'info');
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col">
      {/* Header */}
      <header className="h-16 glass-card px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E6EEF5] hover:bg-[#D6EAF8] transition-all">
            <ArrowLeft size={14} className="text-[#1E3A5F]" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
            <Tv size={16} className="text-[#1E3A5F]" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-[#1E3A5F] tracking-wider">EXPO PRESENTATION MODE</h1>
            <p className="text-[9px] text-[#64748B] font-medium uppercase tracking-widest">Automatic Scenario Sequencer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-extrabold text-[#5DADE2] bg-[#5DADE2]/10 px-2 py-0.5 rounded border border-[#5DADE2]/20">PRESENTATION RUNTIME</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white border border-[#E6EEF5] rounded-xl p-5 shadow-glass-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isPlaying ? 'bg-[#5DADE2]/10 text-[#5DADE2]' : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'}`}>
              {isPlaying ? <Activity className="animate-pulse" size={20} /> : <Tv size={20} />}
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">Auto-Demo Sequencer</h3>
              <p className="text-[10px] text-[#64748B] mt-0.5">
                {activeStep === -1 
                  ? 'Ready to run automatic end-to-end simulation sequence.' 
                  : `Currently running: Scenario ${activeStep + 1} / ${HYDERABAD_SCENARIOS.length}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isPlaying ? (
              <button
                onClick={handlePauseDemo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-warning text-white text-[10px] font-bold rounded-lg uppercase tracking-wider hover:opacity-90 transition-all"
              >
                <Pause size={12} /> Pause
              </button>
            ) : (
              <button
                onClick={handleStartDemo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] text-white text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-[#2C5282] transition-all"
              >
                <Play size={12} /> {activeStep === -1 ? 'Run Full Demo' : 'Resume Demo'}
              </button>
            )}

            <button
              onClick={handleSkipDemo}
              disabled={activeStep === -1}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E6EEF5] text-[#1E3A5F] hover:bg-[#F7FAFC] disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all"
            >
              <SkipForward size={12} /> Skip
            </button>

            <button
              onClick={handleResetDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E6EEF5] text-danger hover:bg-danger/5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* Sequencer Timer Progress */}
        {activeStep !== -1 && (
          <div className="bg-white border border-[#E6EEF5] rounded-xl p-4 shadow-glass-sm space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-[9px] font-bold text-[#64748B] uppercase tracking-wider">
              <span>Time remaining for scenario</span>
              <span className="font-mono text-[#5DADE2]">{timeLeft}s</span>
            </div>
            <div className="w-full h-2 bg-[#E6EEF5] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#5DADE2] transition-all duration-1000"
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scenario Catalog */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#5DADE2]" />
              <h2 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">Hyderabad Crisis Library</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {HYDERABAD_SCENARIOS.map((scenario, index) => {
                const isActive = activeStep === index;
                const isTriggering = triggeringScenarioId === scenario.id;

                return (
                  <div
                    key={scenario.id}
                    className={`bg-white border rounded-xl p-4 shadow-glass-sm flex flex-col justify-between transition-all ${
                      isActive 
                        ? 'border-[#5DADE2] ring-2 ring-[#5DADE2]/10 bg-[#5DADE2]/5' 
                        : 'border-[#E6EEF5]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[8px] font-mono text-[#64748B] font-bold">SCENARIO #0{scenario.id}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                          scenario.severity === 'Critical' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                        }`}>{scenario.severity}</span>
                      </div>
                      <h4 className="text-xs font-extrabold text-[#1E3A5F] mb-1">{scenario.title}</h4>
                      <p className="text-[10px] text-[#64748B] leading-relaxed mb-3">{scenario.description}</p>
                    </div>

                    <div className="border-t border-[#E6EEF5] pt-3 mt-auto flex items-center justify-between">
                      <span className="text-[8px] font-semibold text-[#64748B] flex items-center gap-0.5"><MapPin size={8} />{scenario.location_name}</span>
                      <button
                        onClick={() => triggerScenario(scenario)}
                        disabled={isTriggering || isPlaying}
                        className={`px-2.5 py-1 text-[8px] font-bold uppercase rounded-lg border transition-all ${
                          isTriggering
                            ? 'bg-[#E6EEF5] border-[#E6EEF5] text-[#64748B] cursor-not-allowed'
                            : 'border-[#5DADE2] text-[#5DADE2] hover:bg-[#5DADE2] hover:text-white'
                        }`}
                      >
                        {isTriggering ? 'Triggering...' : 'Trigger Now'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="bg-[#1E3A5F] rounded-xl border border-white/10 p-5 shadow-glass-lg flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ListCollapse size={14} className="text-[#5DADE2]" />
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Live Activity Log</h3>
              </div>
              <button
                onClick={handleClearLogs}
                className="text-[8px] font-bold text-white/50 hover:text-white uppercase tracking-wider"
              >
                Clear
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono text-[9px] leading-relaxed">
              {logs.length === 0 ? (
                <div className="text-white/40 text-center py-16">No events recorded. Start the sequencer or trigger a scenario to stream logs.</div>
              ) : (
                logs.map(log => {
                  let textClass = 'text-white/80';
                  if (log.type === 'success') textClass = 'text-green-400 font-bold';
                  if (log.type === 'warning') textClass = 'text-yellow-400 font-bold';
                  if (log.type === 'danger') textClass = 'text-red-400 font-bold';

                  return (
                    <div key={log.id} className="border-b border-white/5 pb-1.5">
                      <span className="text-[#5DADE2] mr-1.5">[{log.timestamp}]</span>
                      <span className={textClass}>{log.message}</span>
                    </div>
                  );
                })
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
