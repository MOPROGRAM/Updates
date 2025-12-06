
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Lock, Save, FileText, History, User, Users, CheckCircle, AlertCircle, Clock3, LayoutDashboard, ChevronRight, ChevronDown, Activity, Globe, Shield, Trash2, Plus, Upload, X, MoreHorizontal, Download, Printer, PieChart, ArrowRight, MessageSquare, Send, LogOut, UserPlus } from 'lucide-react';
import { Worker, WeeklyReport, StatusType, UpdateLog, DetailedStats, ReportCategory, ReportItem, UserProfile, ChatMessage, StatusData } from './types';
import { INITIAL_WORKERS, STATUS_COLUMNS } from './constants';
import * as XLSX from 'xlsx';

// --- SUB-COMPONENT: Status Cell (Handles Smart Save Logic) ---
const StatusCell = ({ 
  workerId, 
  statusId, 
  columnLabel,
  data, 
  onUpdate 
}: { 
  workerId: string | number, 
  statusId: string, 
  columnLabel: string,
  data: StatusData, 
  onUpdate: (field: 'status' | 'date' | 'note', value: string) => void 
}) => {
  const [localNote, setLocalNote] = useState(data.note || '');
  const [localDate, setLocalDate] = useState(data.date || '');

  // Sync local state when prop changes (e.g. from external update)
  useEffect(() => {
    setLocalNote(data.note || '');
    setLocalDate(data.date || '');
  }, [data.note, data.date]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-emerald-50 text-emerald-900 border-emerald-400 font-bold';
      case 'waiting': return 'bg-amber-50 text-amber-900 border-amber-400 font-bold';
      case 'issue': return 'bg-rose-50 text-rose-900 border-rose-400 font-bold';
      default: return 'bg-white text-slate-900 border-slate-300 font-bold';
    }
  };

  const statusValue = (data.status as string) === 'pending' ? 'select' : (data.status || 'select');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <select
          className={`w-full appearance-none pl-2 pr-6 py-2 text-xs font-bold rounded-lg border shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all ${getStatusColor(statusValue)}`}
          value={statusValue}
          onChange={(e) => onUpdate('status', e.target.value)}
        >
          <option value="select" className="text-slate-600 font-bold">Select...</option>
          <option value="waiting" className="text-amber-800 font-bold">⏳ Waiting</option>
          <option value="done" className="text-emerald-800 font-bold">✓ Done</option>
          <option value="issue" className="text-rose-800 font-bold">⚠ Issue</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-60">
          <ChevronDown className="h-3 w-3 stroke-[3]" />
        </div>
      </div>

      <div className="min-h-[28px]">
        {/* Universal Date Input: Visible for all active statuses */}
        {statusValue !== 'select' && (
          <div className="relative animate-in fade-in slide-in-from-top-1 duration-200 mb-1">
            {statusId === 'booking' && statusValue === 'done' && (
              <label className="block text-[9px] font-bold text-slate-600 mb-0.5 ml-1">Arrival (Insha'Allah)</label>
            )}
            <input
              type="date"
              className={`w-full text-[10px] font-bold border rounded px-2 py-1.5 outline-none shadow-sm 
                ${statusValue === 'done' ? 'bg-emerald-50 border-emerald-300 text-emerald-950 focus:border-emerald-600' : 
                  statusValue === 'issue' ? 'bg-rose-50 border-rose-300 text-rose-950 focus:border-rose-600' :
                  'bg-amber-50 border-amber-300 text-amber-950 focus:border-amber-600'
                }`}
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              onBlur={() => {
                if (localDate !== data.date) onUpdate('date', localDate);
              }}
            />
          </div>
        )}

        {/* Note Input: Always visible if issue, or if there is a note */}
        {(statusValue === 'issue' || localNote) && (
          <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
            <input
              type="text"
              className="w-full text-[10px] font-semibold bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-700 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none shadow-sm"
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              onBlur={() => {
                 // Only save if changed and length is sufficient to avoid empty spam
                 if (localNote !== data.note) onUpdate('note', localNote);
              }}
              placeholder="Add note..."
            />
          </div>
        )}
        
        {data.updatedBy && statusValue !== 'select' && (
            <div className="flex items-center justify-end gap-1 mt-1">
              <div className="w-1 h-1 rounded-full bg-slate-400"></div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate max-w-[80px]" title={`Updated by ${data.updatedBy} at ${new Date(data.timestamp!).toLocaleString()}`}>
                {data.updatedBy}
              </span>
            </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  // State
  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);

  // App State
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState('');
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | number | null>(null);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);

  // Initialization
  useEffect(() => {
    loadData();
    updateCurrentWeek();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatOpen]);

  const getWeekNumber = (date: Date) => {
    const d = new Date(date.valueOf());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `Week ${weekNo} - ${d.getFullYear()}`;
  };

  const updateCurrentWeek = () => {
    const today = new Date();
    const weekStr = getWeekNumber(today);
    setCurrentWeek(weekStr);
  };

  const loadData = () => {
    try {
      const savedWorkers = localStorage.getItem('workers_data_v4');
      const savedReports = localStorage.getItem('weekly_reports_v4');
      const savedUsers = localStorage.getItem('app_users');
      const savedChat = localStorage.getItem('app_chat');
      
      // Load Users
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      }

      // Load Chat
      if (savedChat) {
        setChatMessages(JSON.parse(savedChat));
      }

      // Persistent Auth Check (No expiry)
      const savedAuthUser = localStorage.getItem('auth_user_profile');
      if (savedAuthUser) {
         setIsAuthenticated(true);
         setCurrentUser(JSON.parse(savedAuthUser));
      }
      
      if (savedWorkers) {
        setWorkers(JSON.parse(savedWorkers));
      }

      if (savedReports) {
        setWeeklyReports(JSON.parse(savedReports));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setWorkers(INITIAL_WORKERS);
    }
    setIsLoading(false);
  };

  const saveData = (newWorkers: Worker[]) => {
    try {
      localStorage.setItem('workers_data_v4', JSON.stringify(newWorkers));
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  // --- ANALYTICS ENGINE (Same as before) ---
  const generateDetailedStats = (currentWorkers: Worker[]): DetailedStats => {
    const stats: DetailedStats = {
      recentCompletions: [],
      bottlenecks: [],
      criticalIssues: [],
      upcomingArrivals: []
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const addToCategory = (list: ReportCategory[], categoryName: string, item: ReportItem) => {
      let cat = list.find(c => c.categoryName === categoryName);
      if (!cat) {
        cat = { categoryName, count: 0, items: [] };
        list.push(cat);
      }
      cat.count++;
      cat.items.push(item);
    };

    currentWorkers.forEach(w => {
      STATUS_COLUMNS.forEach(col => {
        const data = w.statuses[col.id];
        if (!data) return;

        if (data.status === 'done' && data.timestamp) {
          const updateDate = new Date(data.timestamp);
          if (updateDate >= sevenDaysAgo) {
            addToCategory(stats.recentCompletions, col.label, {
              workerName: w.name,
              detail: data.date ? `Date: ${data.date}` : undefined,
              timestamp: data.timestamp
            });
          }
        }

        if (data.status === 'waiting') {
          addToCategory(stats.bottlenecks, col.label, {
            workerName: w.name,
            timestamp: data.timestamp
          });
        }

        if (data.status === 'issue') {
          addToCategory(stats.criticalIssues, col.label, {
            workerName: w.name,
            detail: data.note || 'No details provided',
            timestamp: data.timestamp
          });
        }

        if (col.id === 'booking' && data.status === 'done' && data.date) {
             stats.upcomingArrivals.push({
               workerName: w.name,
               detail: data.date
             });
        }
      });
    });

    stats.upcomingArrivals.sort((a, b) => (a.detail || '').localeCompare(b.detail || ''));
    return stats;
  };

  const saveWeeklyReport = () => {
    const today = new Date();
    const detailedStats = generateDetailedStats(workers);
    
    const report: WeeklyReport = {
      week: currentWeek,
      date: today.toISOString(),
      dateFormatted: today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      workers: JSON.parse(JSON.stringify(workers)),
      summary: calculateSummary(),
      detailedStats: detailedStats
    };

    const newReports = [report, ...weeklyReports.filter(r => r.week !== currentWeek)].slice(0, 12);
    setWeeklyReports(newReports);
    
    try {
      localStorage.setItem('weekly_reports_v4', JSON.stringify(newReports));
      alert('✅ Weekly report analyzed and archived successfully.');
    } catch (error) {
      console.error('Save report error:', error);
      alert('Error saving report');
    }
  };

  const handleExportExcel = () => {
    const headers = ['ID', 'Worker Name', ...STATUS_COLUMNS.map(c => c.label), 'Flight Arrival', 'Latest Update'];
    const data = workers.map((w, index) => {
      const row: any = { 'ID': index + 1, 'Worker Name': w.name };
      STATUS_COLUMNS.forEach(col => {
        const s = w.statuses[col.id];
        let val = '-';
        if (s?.status === 'done') val = `Done ${s.date ? `(${s.date})` : ''}`;
        if (s?.status === 'waiting') val = `Waiting ${s.date ? `(${s.date})` : ''}`;
        if (s?.status === 'issue') val = `Issue: ${s.note || ''}`;
        row[col.label] = val;
      });
      row['Flight Arrival'] = w.statuses['booking']?.date || '-';
      const lastHistory = w.history && w.history.length > 0 ? w.history[0] : null;
      row['Latest Update'] = lastHistory ? `${lastHistory.action} (${lastHistory.user})` : '-';
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const wscols = headers.map(h => ({ wch: h.length + 10 }));
    wscols[1] = { wch: 30 }; 
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Worker Status");
    XLSX.writeFile(workbook, `Worker_Report_${currentWeek}.xlsx`);
  };

  const calculateSummary = () => {
    const totalWorkers = workers.length;
    const totalSlots = workers.length * STATUS_COLUMNS.length;
    let completed = 0;
    let issues = 0;
    let waiting = 0;
    const breakdown: any = {};

    STATUS_COLUMNS.forEach(col => {
      breakdown[col.id] = { waiting: 0, done: 0, issue: 0 };
    });

    workers.forEach(worker => {
      STATUS_COLUMNS.forEach(statusCol => {
        const statusData = worker.statuses[statusCol.id];
        if (statusData?.status === 'done') { completed++; breakdown[statusCol.id].done++; }
        if (statusData?.status === 'issue') { issues++; breakdown[statusCol.id].issue++; }
        if (statusData?.status === 'waiting') { waiting++; breakdown[statusCol.id].waiting++; }
      });
    });

    return { totalWorkers, totalSlots, completed, issues, waiting, breakdown };
  };

  // --- AUTH SYSTEM ---

  const handleRegister = () => {
    if (!loginUsername || !loginPassword) {
      alert("Please fill in all fields");
      return;
    }
    const userExists = users.find(u => u.username === loginUsername);
    if (userExists) {
      alert("Username already exists");
      return;
    }
    
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'];
    const newUser: UserProfile = {
      username: loginUsername,
      password: loginPassword,
      color: colors[Math.floor(Math.random() * colors.length)]
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('app_users', JSON.stringify(updatedUsers));
    
    // Auto login
    completeLogin(newUser);
  };

  const handleLogin = () => {
    const user = users.find(u => u.username === loginUsername && u.password === loginPassword);
    if (user) {
      completeLogin(user);
    } else {
      alert("Invalid username or password");
    }
  };

  const handleGoogleLogin = () => {
    // Simulated Google Login
    const googleUser: UserProfile = {
      username: "Google User",
      isGoogle: true,
      color: "bg-red-500"
    };
    completeLogin(googleUser);
  };

  const completeLogin = (user: UserProfile) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    localStorage.setItem('auth_user_profile', JSON.stringify(user));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('auth_user_profile');
    setLoginUsername('');
    setLoginPassword('');
  };

  // --- CHAT SYSTEM ---
  const handleSendMessage = () => {
    if (!chatInput.trim() || !currentUser) return;
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: currentUser.username,
      text: chatInput,
      timestamp: new Date().toISOString(),
      userColor: currentUser.color
    };

    const updatedMessages = [...chatMessages, newMessage];
    setChatMessages(updatedMessages);
    localStorage.setItem('app_chat', JSON.stringify(updatedMessages));
    setChatInput('');
  };

  // --- DATA UPDATE LOGIC ---
  const updateStatus = (workerId: number | string, statusId: string, field: 'status' | 'date' | 'note', value: string) => {
    const newWorkers = workers.map(worker => {
      if (worker.id === workerId) {
        const currentStatusData = worker.statuses[statusId] || { status: 'select' };
        
        const newStatusData = {
          ...currentStatusData,
          [field]: value,
          updatedBy: currentUser?.username || 'Unknown',
          timestamp: new Date().toISOString()
        };

        let newHistory = [...(worker.history || [])];
        // Only log if status changed or note/date changed significantly (avoid spam handled by component, but double check)
        const statusLabel = STATUS_COLUMNS.find(c => c.id === statusId)?.label || statusId;
        
        const logEntry: UpdateLog = {
            id: Date.now().toString(),
            milestone: statusLabel,
            timestamp: new Date().toISOString(),
            user: currentUser?.username || 'Unknown',
            action: field === 'status' ? `Status: ${value}` : `${field === 'date' ? 'Date' : 'Note'} updated`,
            note: field === 'note' ? value : field === 'date' ? `Set to ${value}` : undefined
        };
        newHistory = [logEntry, ...newHistory];

        return {
          ...worker,
          statuses: {
            ...worker.statuses,
            [statusId]: newStatusData
          },
          history: newHistory
        };
      }
      return worker;
    });
    setWorkers(newWorkers);
    saveData(newWorkers);
  };

  // ... (Bulk Import, Delete, Clear All logic remains same as previous, just compacted)
  const handleBulkImport = () => {
    if (!importText.trim()) return;
    const names = importText.split('\n').filter(line => line.trim().length > 0);
    const timestamp = Date.now();
    const newWorkers = names.map((name, index) => ({
      id: timestamp + index, name: name.trim(), statuses: {},
      history: [{ id: (timestamp+index).toString(), milestone: 'System', timestamp: new Date().toISOString(), user: currentUser?.username || 'Admin', action: 'Created' }]
    }));
    const updated = [...workers, ...newWorkers];
    setWorkers(updated);
    saveData(updated);
    setImportText(''); setShowImportModal(false);
  };

  const handleDeleteWorker = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    const reason = prompt('Please enter a reason for deletion:');
    if (reason && reason.trim()) {
      const updated = workers.filter(w => w.id !== id);
      setWorkers(updated); saveData(updated);
    }
  };

  const handleClearAll = () => {
    if (prompt('Type "DELETE ALL" to confirm:') === 'DELETE ALL') {
      setWorkers([]); saveData([]);
    }
  };

  // --- RENDER HELPERS ---
  const summary = calculateSummary();
  const toggleHistory = (id: number | string) => setExpandedWorkerId(expandedWorkerId === id ? null : id);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-100">Loading...</div>;

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-[420px] border border-white/50 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mb-5">
              <Shield className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-heading">
              {isRegistering ? 'Create Account' : 'Secure Login'}
            </h1>
            <p className="text-slate-600 mt-2 text-sm font-medium">Worker Tracking System v4.0</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-slate-600 w-4 h-4" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-900"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-600 w-4 h-4" />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-900"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              onClick={isRegistering ? handleRegister : handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
            >
              {isRegistering ? 'Register & Login' : 'Login'}
            </button>
            
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-400">OR</span>
                <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign in with Google
            </button>

            <div className="text-center mt-4">
              <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm font-bold text-blue-600 hover:text-blue-800"
              >
                {isRegistering ? 'Already have an account? Login' : 'New here? Create Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-100 font-sans relative pb-20">
      
      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur-lg border-b border-slate-200/60 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[66%] mx-auto px-4">
          <div className="flex justify-between h-20 items-center py-2">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-xl shadow-lg">
                <Globe className="text-white w-6 h-6" />
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-extrabold text-slate-900 font-heading">UPDATES</h1>
                <p className="text-[11px] text-slate-600 font-bold tracking-widest uppercase">Worker Tracking System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-200">
                 <div className={`w-2 h-2 rounded-full ${currentUser?.color || 'bg-slate-400'}`}></div>
                 <span className="text-sm font-bold text-slate-700">{currentUser?.username}</span>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 transition-colors" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="flex items-center gap-2">
                 <button onClick={handleClearAll} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                 <button onClick={() => setShowImportModal(true)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"><Plus className="w-5 h-5" /></button>
                 <button onClick={handleExportExcel} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"><Download className="w-5 h-5" /></button>
                 <button onClick={saveWeeklyReport} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition shadow-lg">Save</button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-[66%] mx-auto px-2 sm:px-4 py-6">
        {/* Summary Cards (Same layout as before) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="text-[10px] font-extrabold text-slate-500 uppercase">Total Workers</div>
             <div className="text-3xl font-black text-slate-900 mt-1">{summary.totalWorkers}</div>
           </div>
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="text-[10px] font-extrabold text-emerald-600 uppercase">Completed</div>
             <div className="text-3xl font-black text-emerald-700 mt-1">{summary.completed}</div>
              <div className="mt-2 flex gap-1 text-[9px] font-bold text-slate-400">
                 {STATUS_COLUMNS.map(c => summary.breakdown?.[c.id]?.done > 0 && <span key={c.id} className="text-emerald-600">{c.label.substring(0,3)}:{summary.breakdown[c.id].done}</span>)}
             </div>
           </div>
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="text-[10px] font-extrabold text-amber-600 uppercase">Waiting</div>
             <div className="text-3xl font-black text-amber-600 mt-1">{summary.waiting}</div>
             <div className="mt-2 flex gap-1 text-[9px] font-bold text-slate-400">
                 {STATUS_COLUMNS.map(c => summary.breakdown?.[c.id]?.waiting > 0 && <span key={c.id} className="text-amber-600">{c.label.substring(0,3)}:{summary.breakdown[c.id].waiting}</span>)}
             </div>
           </div>
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="text-[10px] font-extrabold text-rose-600 uppercase">Issues</div>
             <div className="text-3xl font-black text-rose-600 mt-1">{summary.issues}</div>
             <div className="mt-2 flex gap-1 text-[9px] font-bold text-slate-400">
                 {STATUS_COLUMNS.map(c => summary.breakdown?.[c.id]?.issue > 0 && <span key={c.id} className="text-rose-600">{c.label.substring(0,3)}:{summary.breakdown[c.id].issue}</span>)}
             </div>
           </div>
        </div>

        {/* Main Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden min-h-[400px]">
          {workers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Users className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No Workers</h3>
              <button onClick={() => setShowImportModal(true)} className="mt-4 text-blue-600 font-bold hover:underline">Import Data</button>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-700 font-extrabold font-heading">
                    <th className="px-3 py-4 w-12 text-center">#</th>
                    <th className="px-3 py-4 min-w-[220px]">Worker Profile</th>
                    {STATUS_COLUMNS.map(col => (
                      <th key={col.id} className="px-2 py-4 min-w-[180px]">
                        <div className="flex items-center gap-1.5 justify-center">
                          <span className="text-base">{col.icon}</span> {col.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-300">
                  {workers.map((worker, index) => (
                    <React.Fragment key={worker.id}>
                      <tr className={`group ${expandedWorkerId === worker.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-3 text-center align-top pt-5">
                           <span className="font-mono text-xs font-bold text-slate-500">{(index + 1).toString().padStart(2, '0')}</span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-col gap-2 pt-1">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold">{worker.name.charAt(0)}</div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{worker.name}</div>
                                {worker.isRec && <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-bold">REC</span>}
                              </div>
                            </div>
                            <div className="flex gap-2 pl-12 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => toggleHistory(worker.id)} className="text-[9px] bg-white border px-2 py-1 rounded shadow-sm font-bold flex items-center gap-1">
                                  <History className="w-3 h-3" /> Log
                                </button>
                                <button onClick={(e) => handleDeleteWorker(e, worker.id)} className="text-[9px] bg-white border border-rose-200 text-rose-600 px-2 py-1 rounded shadow-sm font-bold flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" /> Del
                                </button>
                            </div>
                          </div>
                        </td>

                        {STATUS_COLUMNS.map(status => (
                          <td key={status.id} className="px-2 py-3 align-top">
                            <StatusCell 
                                workerId={worker.id}
                                statusId={status.id}
                                columnLabel={status.label}
                                data={worker.statuses[status.id] || { status: 'select' }}
                                onUpdate={(field, value) => updateStatus(worker.id, status.id, field, value)}
                            />
                          </td>
                        ))}
                      </tr>
                      
                      {/* Audit Log Panel */}
                      {expandedWorkerId === worker.id && (
                        <tr>
                          <td colSpan={STATUS_COLUMNS.length + 2} className="bg-slate-50 p-6 border-b border-slate-200 shadow-inner">
                            <div className="max-w-4xl mx-auto">
                               <h4 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2"><Activity className="w-4 h-4" /> Audit Trail</h4>
                               <div className="space-y-3">
                                  {worker.history?.map((log, i) => (
                                      <div key={i} className="flex gap-4 text-sm bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                          <div className="font-bold text-slate-700 min-w-[120px]">{new Date(log.timestamp).toLocaleString()}</div>
                                          <div className="font-bold text-blue-600 min-w-[100px]">{log.user}</div>
                                          <div className="flex-1">
                                              <span className="font-bold text-slate-900">{log.action}</span>
                                              <span className="mx-2 text-slate-300">|</span>
                                              <span className="text-slate-500 font-semibold">{log.milestone}</span>
                                              {log.note && <div className="mt-1 text-slate-600 italic bg-slate-50 p-1.5 rounded">"{log.note}"</div>}
                                          </div>
                                      </div>
                                  ))}
                                  {(!worker.history || worker.history.length === 0) && <div className="text-slate-400 italic">No history.</div>}
                               </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* --- CHAT WIDGET --- */}
      <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end ${isChatOpen ? 'w-80' : 'w-auto'}`}>
        {isChatOpen && (
           <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full mb-4 overflow-hidden animate-in slide-in-from-bottom-5">
              <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
                 <h3 className="font-bold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4"/> Team Chat</h3>
                 <button onClick={() => setIsChatOpen(false)}><X className="w-4 h-4"/></button>
              </div>
              <div ref={chatScrollRef} className="h-64 overflow-y-auto p-3 bg-slate-50 space-y-3">
                 {chatMessages.length === 0 && <div className="text-center text-xs text-slate-400 mt-10">No messages yet. Say hi!</div>}
                 {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.user === currentUser?.username ? 'items-end' : 'items-start'}`}>
                       <div className="flex items-center gap-1 mb-1">
                          <div className={`w-2 h-2 rounded-full ${msg.userColor}`}></div>
                          <span className="text-[10px] font-bold text-slate-500">{msg.user}</span>
                       </div>
                       <div className={`px-3 py-2 rounded-xl text-xs font-medium max-w-[85%] ${msg.user === currentUser?.username ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                          {msg.text}
                       </div>
                       <span className="text-[9px] text-slate-300 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                 ))}
              </div>
              <div className="p-2 bg-white border-t border-slate-200 flex gap-2">
                 <input 
                    className="flex-1 bg-slate-100 rounded-full px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                 />
                 <button onClick={handleSendMessage} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"><Send className="w-3 h-3" /></button>
              </div>
           </div>
        )}
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg shadow-blue-600/30 transition-all transform hover:scale-110"
        >
           <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {/* --- REPORT LIST & IMPORT MODALS (Kept same logic as previous) --- */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <h3 className="font-bold text-lg mb-4">Bulk Import Workers</h3>
              <textarea 
                className="w-full h-40 border rounded-xl p-3 text-sm font-bold" 
                placeholder="Paste names here..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="flex justify-end gap-3 mt-4">
                 <button onClick={() => setShowImportModal(false)} className="text-sm font-bold text-slate-500">Cancel</button>
                 <button onClick={handleBulkImport} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Import</button>
              </div>
           </div>
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden flex flex-col">
             <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h2 className="font-black text-xl">Weekly Report: {selectedReport.week}</h2>
                <button onClick={() => setSelectedReport(null)}><X className="w-6 h-6 text-slate-400" /></button>
             </div>
             <div className="flex-1 overflow-auto p-8">
                 {/* Reused Report UI from previous iteration */}
                 <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-slate-100 rounded-lg text-center"><div className="text-2xl font-black">{selectedReport.summary.totalWorkers}</div><div className="text-xs font-bold text-slate-500">WORKERS</div></div>
                    <div className="p-4 bg-emerald-100 rounded-lg text-center"><div className="text-2xl font-black text-emerald-700">{selectedReport.summary.completed}</div><div className="text-xs font-bold text-emerald-600">DONE</div></div>
                    <div className="p-4 bg-amber-100 rounded-lg text-center"><div className="text-2xl font-black text-amber-700">{selectedReport.summary.waiting}</div><div className="text-xs font-bold text-amber-600">WAITING</div></div>
                    <div className="p-4 bg-rose-100 rounded-lg text-center"><div className="text-2xl font-black text-rose-700">{selectedReport.summary.issues}</div><div className="text-xs font-bold text-rose-600">ISSUES</div></div>
                 </div>
                 {/* Detailed lists... */}
                 <div className="space-y-6">
                    <div>
                       <h3 className="font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-2">Recent Completions</h3>
                       {selectedReport.detailedStats?.recentCompletions.map((c, i) => (
                          <div key={i} className="mb-2"><span className="font-bold text-emerald-600">{c.categoryName}:</span> {c.items.map(it => it.workerName).join(', ')}</div>
                       ))}
                    </div>
                    <div>
                       <h3 className="font-bold text-amber-800 border-b border-amber-200 pb-2 mb-2">Bottlenecks</h3>
                       {selectedReport.detailedStats?.bottlenecks.map((c, i) => (
                          <div key={i} className="mb-2"><span className="font-bold text-amber-600">{c.categoryName} ({c.count}):</span> <span className="text-xs text-slate-600">{c.items.map(it => it.workerName).join(', ')}</span></div>
                       ))}
                    </div>
                 </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
