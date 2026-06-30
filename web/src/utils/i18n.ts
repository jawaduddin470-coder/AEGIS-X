/**
 * AEGIS X — i18n Multi-Language Support
 * Languages: English (en), Hindi (hi), Telugu (te)
 */

export type Language = 'en' | 'hi' | 'te';

export type TranslationKey =
  | 'command_center'
  | 'analytics'
  | 'resources'
  | 'shelters'
  | 'broadcast'
  | 'health'
  | 'admin'
  | 'logout'
  | 'active_incidents'
  | 'resolved'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'fire'
  | 'flood'
  | 'collapse'
  | 'medical'
  | 'loading'
  | 'no_incidents'
  | 'report_incident'
  | 'sos_emergency'
  | 'family_safety'
  | 'emergency_feed'
  | 'profile'
  | 'live'
  | 'search'
  | 'filter'
  | 'refresh'
  | 'save'
  | 'cancel'
  | 'add'
  | 'edit'
  | 'delete'
  | 'send'
  | 'all_systems_operational'
  | 'system_degraded'
  | 'uptime'
  | 'response_time'
  | 'dispatch_sos'
  | 'cancel_sos'
  | 'sos_sent'
  | 'evacuate_now'
  | 'stay_calm'
  | 'welcome'
  // Phase 6 Additional Keys
  | 'home'
  | 'alerts'
  | 'report'
  | 'copilot'
  | 'evacuation'
  | 'reports'
  | 'predict_simulate_respond'
  | 'active_emergencies'
  | 'dispatched_log'
  | 'twin_grid_health'
  | 'ai_copilot_core'
  | 'active_incident_log'
  | 'resource_grid_status'
  | 'launch_sim'
  | 'disaster_simulation_core'
  | 'twin_monitor_mode'
  | 'normal'
  | 'traffic'
  | 'emergency'
  | 'heatmap';

type Translations = Record<TranslationKey, string>;

const translations: Record<Language, Translations> = {
  en: {
    command_center: 'Command Center',
    analytics: 'Analytics',
    resources: 'Resources',
    shelters: 'Shelters',
    broadcast: 'Broadcast',
    health: 'Health',
    admin: 'Admin',
    logout: 'Logout',
    active_incidents: 'Active Incidents',
    resolved: 'Resolved',
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    fire: 'Fire',
    flood: 'Flood',
    collapse: 'Building Collapse',
    medical: 'Medical Emergency',
    loading: 'Loading...',
    no_incidents: 'No incidents found',
    report_incident: 'Report Incident',
    sos_emergency: 'SOS Emergency',
    family_safety: 'Family Safety',
    emergency_feed: 'Emergency Feed',
    profile: 'Profile',
    live: 'LIVE',
    search: 'Search...',
    filter: 'Filter',
    refresh: 'Refresh',
    save: 'Save',
    cancel: 'Cancel',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    send: 'Send',
    all_systems_operational: 'All Systems Operational',
    system_degraded: 'System Degraded',
    uptime: 'Uptime',
    response_time: 'Response Time',
    dispatch_sos: 'Dispatch SOS',
    cancel_sos: 'Cancel SOS',
    sos_sent: 'SOS Sent',
    evacuate_now: 'Evacuate Now',
    stay_calm: 'Stay Calm',
    welcome: 'Welcome',
    home: 'Home',
    alerts: 'Alerts',
    report: 'Report',
    copilot: 'Copilot',
    evacuation: 'Evacuation',
    reports: 'Reports',
    predict_simulate_respond: 'Predict • Simulate • Respond',
    active_emergencies: 'Active Emergencies',
    dispatched_log: 'Dispatched Log',
    twin_grid_health: 'Twin Grid Health',
    ai_copilot_core: 'AI Copilot Core',
    active_incident_log: 'Active Incident Log',
    resource_grid_status: 'Resource Grid Status',
    launch_sim: 'Launch Sim',
    disaster_simulation_core: 'Disaster Simulation Core',
    twin_monitor_mode: 'Twin Monitor Mode',
    normal: 'Normal',
    traffic: 'Traffic',
    emergency: 'Emergency',
    heatmap: 'Heatmap',
  },
  hi: {
    command_center: 'कमांड सेंटर',
    analytics: 'विश्लेषण',
    resources: 'संसाधन',
    shelters: 'आश्रय',
    broadcast: 'प्रसारण',
    health: 'स्वास्थ्य',
    admin: 'प्रशासन',
    logout: 'लॉगआउट',
    active_incidents: 'सक्रिय घटनाएं',
    resolved: 'हल किया गया',
    critical: 'गंभीर',
    high: 'उच्च',
    medium: 'मध्यम',
    low: 'कम',
    fire: 'आग',
    flood: 'बाढ़',
    collapse: 'भवन पतन',
    medical: 'चिकित्सा आपात',
    loading: 'लोड हो रहा है...',
    no_incidents: 'कोई घटना नहीं मिली',
    report_incident: 'घटना रिपोर्ट करें',
    sos_emergency: 'एसओएस आपातकाल',
    family_safety: 'परिवार सुरक्षा',
    emergency_feed: 'आपातकाल फीड',
    profile: 'प्रोफाइल',
    live: 'लाइव',
    search: 'खोजें...',
    filter: 'फ़िल्टर',
    refresh: 'ताज़ा करें',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    add: 'जोड़ें',
    edit: 'संपादित करें',
    delete: 'हटाएं',
    send: 'भेजें',
    all_systems_operational: 'सभी सिस्टम चालू हैं',
    system_degraded: 'सिस्टम अवरुद्ध',
    uptime: 'अपटाइम',
    response_time: 'प्रतिक्रिया समय',
    dispatch_sos: 'एसओएस भेजें',
    cancel_sos: 'एसओएस रद्द करें',
    sos_sent: 'एसओएस भेजा गया',
    evacuate_now: 'अभी निकासी करें',
    stay_calm: 'शांत रहें',
    welcome: 'स्वागत',
    home: 'होम',
    alerts: 'अलर्ट',
    report: 'रिपोर्ट',
    copilot: 'कोपायलट',
    evacuation: 'निकासी',
    reports: 'रिपोर्ट्स',
    predict_simulate_respond: 'भविष्यवाणी • अनुकरण • प्रतिक्रिया',
    active_emergencies: 'सक्रिय आपात स्थिति',
    dispatched_log: 'भेजा गया लॉग',
    twin_grid_health: 'ट्विन ग्रिड स्वास्थ्य',
    ai_copilot_core: 'एआई कोपायलट कोर',
    active_incident_log: 'सक्रिय घटना लॉग',
    resource_grid_status: 'संसाधन ग्रिड स्थिति',
    launch_sim: 'सिमुलेशन शुरू करें',
    disaster_simulation_core: 'आपदा सिमुलेशन कोर',
    twin_monitor_mode: 'ट्विन मॉनिटर मोड',
    normal: 'सामान्य',
    traffic: 'यातायात',
    emergency: 'आपातकाल',
    heatmap: 'हीटमैप',
  },
  te: {
    command_center: 'కమాండ్ సెంటర్',
    analytics: 'విశ్లేషణ',
    resources: 'వనరులు',
    shelters: 'ఆశ్రయాలు',
    broadcast: 'ప్రసారం',
    health: 'ఆరోగ్యం',
    admin: 'నిర్వాహకుడు',
    logout: 'లాగ్అవుట్',
    active_incidents: 'క్రియాశీల సంఘటనలు',
    resolved: 'పరిష్కరించబడింది',
    critical: 'క్లిష్టమైనది',
    high: 'అధిక',
    medium: 'మధ్యమ',
    low: 'తక్కువ',
    fire: 'అగ్ని',
    flood: 'వరద',
    collapse: 'భవన పతనం',
    medical: 'వైద్య అత్యవసర',
    loading: 'లోడ్ అవుతోంది...',
    no_incidents: 'సంఘటనలు కనుగొనబడలేదు',
    report_incident: 'సంఘటన నివేదించండి',
    sos_emergency: 'SOS అత్యవసర',
    family_safety: 'కుటుంబ భద్రత',
    emergency_feed: 'అత్యవసర ఫీడ్',
    profile: 'ప్రొఫైల్',
    live: 'లైవ్',
    search: 'వెతకండి...',
    filter: 'వడపోత',
    refresh: 'రిఫ్రెష్',
    save: 'సేవ్ చేయి',
    cancel: 'రద్దు చేయి',
    add: 'జోడించు',
    edit: 'సవరించు',
    delete: 'తొలగించు',
    send: 'పంపు',
    all_systems_operational: 'అన్ని సిస్టమ్‌లు పని చేస్తున్నాయి',
    system_degraded: 'సిస్టమ్ క్షీణించింది',
    uptime: 'అప్‌టైమ్',
    response_time: 'ప్రతిస్పందన సమయం',
    dispatch_sos: 'SOS పంపండి',
    cancel_sos: 'SOS రద్దు చేయి',
    sos_sent: 'SOS పంపబడింది',
    evacuate_now: 'ఇప్పుడే తరలించండి',
    stay_calm: 'శాంతంగా ఉండండి',
    welcome: 'స్వాగతం',
    home: 'హోమ్',
    alerts: 'హెచ్చరికలు',
    report: 'నివేదిక',
    copilot: 'కోపైలట్',
    evacuation: 'తరలింపు',
    reports: 'నివేదికలు',
    predict_simulate_respond: 'అంచనా • అనుకరణ • ప్రతిస్పందన',
    active_emergencies: 'క్రియాశీల అత్యవసరాలు',
    dispatched_log: 'పంపబడిన లాగ్',
    twin_grid_health: 'ట్విన్ గ్రిడ్ ఆరోగ్యం',
    ai_copilot_core: 'AI కోపైలట్ కోర్',
    active_incident_log: 'క్రియాశీల సంఘటన లాగ్',
    resource_grid_status: 'వనరుల గ్రిడ్ స్థితి',
    launch_sim: 'సిమ్యులేషన్ ప్రారంభించు',
    disaster_simulation_core: 'విపత్తు సిమ్యులేషన్ కోర్',
    twin_monitor_mode: 'ట్విన్ మానిటర్ మోడ్',
    normal: 'సాధారణ',
    traffic: 'ట్రాఫిక్',
    emergency: 'అత్యవసర పరిస్థితి',
    heatmap: 'హీట్ మ్యాప్',
  },
};

// Simple reactive i18n store
let currentLanguage: Language = (localStorage.getItem('aegis_lang') as Language) || 'en';
const listeners: Set<() => void> = new Set();

export const i18n = {
  get lang(): Language {
    return currentLanguage;
  },

  setLang(lang: Language) {
    currentLanguage = lang;
    localStorage.setItem('aegis_lang', lang);
    listeners.forEach(fn => fn());
  },

  t(key: TranslationKey): string {
    return translations[currentLanguage][key] ?? translations.en[key] ?? key;
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// React hook for i18n
import { useState, useEffect } from 'react';

export function useTranslation() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubscribe = i18n.subscribe(() => forceUpdate(n => n + 1));
    return unsubscribe;
  }, []);

  return {
    t: (key: TranslationKey) => i18n.t(key),
    lang: i18n.lang,
    setLang: (l: Language) => i18n.setLang(l),
  };
}

export const LANGUAGE_OPTIONS: { value: Language; label: string; nativeLabel: string; flag: string }[] = [
  { value: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { value: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', flag: '🇮🇳' },
  { value: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', flag: '🇮🇳' },
];
