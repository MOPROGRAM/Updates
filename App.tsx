import React, { useState, useEffect } from 'react';
import { Calendar, Lock, Save, FileText, History, User, Users, CheckCircle, AlertCircle, Clock3, LayoutDashboard, ChevronRight, ChevronDown, Activity, Globe, Shield, Trash2, Plus, Upload, X, MoreHorizontal, Download } from 'lucide-react';
import { Worker, WeeklyReport, StatusType, UpdateLog } from './types';
import { INITIAL_WORKERS, STATUS_COLUMNS } from './constants';

const App = () => {
  // State
  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState('');
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | number | null>(null);
  
  // Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  // Initialization
  useEffect(() => {
    loadData();
    updateCurrentWeek();
  }, []);

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
      const savedWorkers = localStorage.getItem('workers_data_v3');
      const savedReports = localStorage.getItem('weekly_reports_v3');
      const savedAuth = sessionStorage.getItem('is_authenticated');
      const savedUser = sessionStorage.getItem('current_user');
      
      if (savedWorkers) {
        setWorkers(JSON.parse(savedWorkers));
      }

      if (savedReports) {
        setWeeklyReports(JSON.parse(savedReports));
      }

      if (savedAuth === 'true' && savedUser) {
        setIsAuthenticated(true);
        setCurrentUser(savedUser);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setWorkers(INITIAL_WORKERS);
    }
    setIsLoading(false);
  };

  const saveData = (newWorkers: Worker[]) => {
    try {
      localStorage.setItem('workers_data_v3', JSON.stringify(newWorkers));
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const saveWeeklyReport = () => {
    const today = new Date();
    const report: WeeklyReport = {
      week: currentWeek,
      date: today.toISOString(),
      dateFormatted: today.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      workers: JSON.parse(JSON.stringify(workers)),
      summary: calculateSummary()
    };

    const newReports = [report, ...weeklyReports.filter(r => r.week !== currentWeek)].slice(0, 12);
    setWeeklyReports(newReports);
    
    try {
      localStorage.setItem('weekly_reports_v3', JSON.stringify(newReports));
      alert('✅ Weekly report archived successfully.');
    } catch (error) {
      console.error('Save report error:', error);
      alert('Error saving report');
    }
  };

  const handleDownloadReport = () => {
    // CSV Header
    const headers = ['ID', 'Name', ...STATUS_COLUMNS.map(c => c.label), 'Flight Date', 'Latest Note'];
    
    // CSV Rows
    const rows = workers.map((w, index) => {
      const statusValues = STATUS_COLUMNS.map(col => {
        const s = w.statuses[col.id];
        return s?.status === 'select' ? '-' : s?.status || '-';
      });
      
      const flightDate = w.statuses['booking']?.date || '';
      // Find the last note from any column or history
      const lastHistory = w.history && w.history.length > 0 ? w.history[0].note || w.history[0].action : '';

      return [
        index + 1,
        w.name,
        ...statusValues,
        flightDate,
        lastHistory
      ].map(cell => `"${String(cell || '').replace(/"/g, '""')}"`); // Escape quotes
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Worker_Report_${currentWeek}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateSummary = () => {
    let totalTasks = workers.length * STATUS_COLUMNS.length;
    let completed = 0;
    let issues = 0;
    let waiting = 0;

    workers.forEach(worker => {
      STATUS_COLUMNS.forEach(statusCol => {
        const statusData = worker.statuses[statusCol.id];
        if (statusData?.status === 'done') completed++;
        if (statusData?.status === 'issue') issues++;
        if (statusData?.status === 'waiting') waiting++;
      });
    });

    return { totalTasks, completed, issues, waiting };
  };

  const handleLogin = () => {
    if (password === 'admin123' && username.trim().length > 0) {
      setIsAuthenticated(true);
      setCurrentUser(username.trim());
      sessionStorage.setItem('is_authenticated', 'true');
      sessionStorage.setItem('current_user', username.trim());
    } else if (username.trim().length === 0) {
      alert('Please enter your name for the audit trail.');
    } else {
      alert('Incorrect Password');
    }
  };

  const updateStatus = (workerId: number | string, statusId: string, field: 'status' | 'date' | 'note', value: string) => {
    const newWorkers = workers.map(worker => {
      if (worker.id === workerId) {
        const currentStatusData = worker.statuses[statusId] || { status: 'select' };
        
        const newStatusData = {
          ...currentStatusData,
          [field]: value,
          updatedBy: currentUser,
          timestamp: new Date().toISOString()
        };

        let newHistory = [...(worker.history || [])];
        if (field === 'status' || (field === 'note' && value.length > 3)) {
          const statusLabel = STATUS_COLUMNS.find(c => c.id === statusId)?.label || statusId;
          const logEntry: UpdateLog = {
            id: Date.now().toString(),
            milestone: statusLabel,
            timestamp: new Date().toISOString(),
            user: currentUser,
            action: field === 'status' ? `Status changed to ${value}` : 'Note updated',
            note: field === 'note' ? value : undefined
          };
          newHistory = [logEntry, ...newHistory];
        }

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

  // --- NEW FEATURES ---

  const handleBulkImport = () => {
    if (!importText.trim()) return;

    const names = importText.split('\n').filter(line => line.trim().length > 0);
    const timestamp = Date.now();
    
    const newWorkers: Worker[] = names.map((name, index) => ({
      id: timestamp + index,
      name: name.trim(),
      statuses: {},
      history: [{
        id: (timestamp + index).toString(),
        milestone: 'System',
        timestamp: new Date().toISOString(),
        user: currentUser,
        action: 'Worker Profile Created'
      }]
    }));

    const updatedWorkers = [...workers, ...newWorkers];
    setWorkers(updatedWorkers);
    saveData(updatedWorkers);
    setImportText('');
    setShowImportModal(false);
  };

  const handleDeleteWorker = (id: string | number) => {
    if (confirm('Are you sure you want to remove this worker permanently?')) {
      const updatedWorkers = workers.filter(w => w.id !== id);
      setWorkers(updatedWorkers);
      saveData(updatedWorkers);
    }
  };

  const handleClearAll = () => {
    if (confirm('⚠️ WARNING: This will delete ALL workers.\n\nAre you sure you want to continue?')) {
      if (confirm('Final confirmation: All data will be lost. This cannot be undone.')) {
        setWorkers([]);
        saveData([]);
      }
    }
  };

  // --------------------

  const summary = calculateSummary();

  const toggleHistory = (id: number | string) => {
    setExpandedWorkerId(expandedWorkerId === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-emerald-50 text-emerald-900 border-emerald-400 font-bold';
      case 'waiting': return 'bg-amber-50 text-amber-900 border-amber-400 font-bold';
      case 'issue': return 'bg-rose-50 text-rose-900 border-rose-400 font-bold';
      default: return 'bg-white text-slate-900 border-slate-300 font-bold';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-slate-700 font-bold animate-pulse">Initializing System...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute inset-0 z-0 opacity-50">
           <div className="absolute top-0 -left-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
           <div className="absolute top-0 -right-10 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
           <div className="absolute -bottom-20 left-20 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-[420px] border border-white/50 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mb-5">
              <Shield className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-heading">Secure Portal</h1>
            <p className="text-slate-600 mt-2 text-sm font-medium">Log in to manage worker documentation.</p>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 ml-1">Operator Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-slate-600 w-4 h-4" />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition text-sm font-bold text-slate-900 placeholder-slate-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-600 w-4 h-4" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition text-sm font-bold text-slate-900 placeholder-slate-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 text-sm"
            >
              Access Dashboard
            </button>
          </div>
        </div>
        
        <div className="absolute bottom-6 text-center text-xs text-slate-600 font-bold">
          &copy; 2025 Worker Tracking System v3.0
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans relative">
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none" 
           style={{
             backgroundImage: `radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%), 
                               radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.15) 0px, transparent 50%), 
                               radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.15) 0px, transparent 50%)`
           }}>
      </div>
      
      {/* Top Navigation Bar */}
      <nav className="bg-white/90 backdrop-blur-lg border-b border-slate-200/60 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[66%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center py-2">
            {/* Logo Area */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-xl shadow-lg shadow-blue-500/30 ring-1 ring-blue-500/50">
                <Globe className="text-white w-6 h-6" />
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-extrabold text-slate-900 font-heading leading-none tracking-tight">UPDATES</h1>
                <p className="text-[11px] text-slate-600 font-bold tracking-widest uppercase mt-0.5 opacity-90">Worker Tracking System</p>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center bg-slate-50/80 rounded-full px-1.5 py-1.5 border border-slate-200/60 shadow-inner">
                <div className="px-3 py-1.5 bg-white rounded-full shadow-sm text-xs font-bold text-slate-800 flex items-center gap-2 border border-slate-100">
                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                  {currentWeek}
                </div>
                <div className="px-3 py-1.5 text-xs font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  {currentUser}
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 rounded-lg text-sm font-bold transition border border-rose-200 hover:border-rose-300"
                  title="Delete All Workers"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden md:inline">Delete All</span>
                </button>

                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 px-3 py-2 rounded-lg text-sm font-bold transition border border-slate-200 shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span className="hidden md:inline">Add</span>
                </button>
                
                <button
                  onClick={handleDownloadReport}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 px-3 py-2 rounded-lg text-sm font-bold transition border border-slate-200 shadow-sm hover:shadow-md"
                  title="Download CSV"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline">Export</span>
                </button>

                <button
                  onClick={saveWeeklyReport}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-lg hover:shadow-xl shadow-slate-900/20"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden md:inline">Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[66%] mx-auto px-2 sm:px-4 lg:px-6 py-6 relative z-10">
        
        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col justify-between h-28 relative overflow-hidden group hover:shadow-2xl hover:border-blue-300 transition-all duration-300">
            <div className="absolute right-0 top-0 p-3 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
              <LayoutDashboard className="w-16 h-16 text-slate-900" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">Total Tasks</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1 font-heading tracking-tight">{summary.totalTasks}</h3>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-auto">
               <div className="bg-slate-800 h-full w-full opacity-30"></div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col justify-between h-28 relative overflow-hidden group hover:shadow-2xl hover:border-emerald-300 transition-all duration-300">
             <div className="absolute right-0 top-0 p-3 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
              <CheckCircle className="w-16 h-16 text-emerald-700" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-emerald-700/90 uppercase tracking-widest">Completed</p>
              <h3 className="text-3xl font-black text-emerald-700 mt-1 font-heading tracking-tight">{summary.completed}</h3>
            </div>
            <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden mt-auto">
               <div className="bg-emerald-600 h-full transition-all duration-1000" style={{ width: summary.totalTasks > 0 ? `${(summary.completed/summary.totalTasks)*100}%` : '0%' }}></div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col justify-between h-28 relative overflow-hidden group hover:shadow-2xl hover:border-amber-300 transition-all duration-300">
            <div className="absolute right-0 top-0 p-3 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
              <Clock3 className="w-16 h-16 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-amber-700/90 uppercase tracking-widest">Waiting Action</p>
              <h3 className="text-3xl font-black text-amber-600 mt-1 font-heading tracking-tight">{summary.waiting}</h3>
            </div>
             <div className="w-full bg-amber-100 h-1.5 rounded-full overflow-hidden mt-auto">
               <div className="bg-amber-600 h-full transition-all duration-1000" style={{ width: summary.totalTasks > 0 ? `${(summary.waiting/summary.totalTasks)*100}%` : '0%' }}></div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col justify-between h-28 relative overflow-hidden group hover:shadow-2xl hover:border-rose-300 transition-all duration-300">
            <div className="absolute right-0 top-0 p-3 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
              <AlertCircle className="w-16 h-16 text-rose-600" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-rose-700/90 uppercase tracking-widest">Critical Issues</p>
              <h3 className="text-3xl font-black text-rose-600 mt-1 font-heading tracking-tight">{summary.issues}</h3>
            </div>
             <div className="w-full bg-rose-100 h-1.5 rounded-full overflow-hidden mt-auto">
               <div className="bg-rose-600 h-full transition-all duration-1000" style={{ width: summary.totalTasks > 0 ? `${(summary.issues/summary.totalTasks)*100}%` : '0%' }}></div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden mb-12 min-h-[400px]">
          {workers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-2 border-slate-200 shadow-inner">
                <Users className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Workers Found</h3>
              <p className="text-slate-600 max-w-sm mb-6 font-medium">Your worker list is currently empty. Use the Import button to add workers in bulk.</p>
              <button 
                onClick={() => setShowImportModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all text-sm"
              >
                Import Workers
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-700 font-extrabold font-heading">
                    <th className="px-3 py-4 w-12 text-center">#</th>
                    <th className="px-3 py-4 min-w-[220px]">Worker Profile & Actions</th>
                    {STATUS_COLUMNS.map(col => (
                      <th key={col.id} className="px-2 py-4 min-w-[180px]">
                        <div className="flex items-center gap-1.5 justify-center">
                          <span className="opacity-100 text-base">{col.icon}</span>
                          {col.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workers.map((worker, index) => (
                    <React.Fragment key={worker.id}>
                      <tr className={`group transition-all duration-200 ${expandedWorkerId === worker.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-3 text-center align-top pt-5">
                           <span className="font-mono text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">{(index + 1).toString().padStart(2, '0')}</span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-col gap-2 pt-1">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white flex-shrink-0">
                                {worker.name.charAt(0)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-900 text-sm leading-tight group-hover:text-blue-800 transition-colors truncate">{worker.name}</span>
                                {worker.isRec && (
                                  <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block w-fit mt-1 tracking-tight shadow-sm">
                                    RECOMMENDED
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Action Buttons Row */}
                            <div className="flex items-center gap-2 pl-12 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                                <button 
                                  onClick={() => toggleHistory(worker.id)}
                                  className="text-[9px] bg-white hover:bg-slate-100 text-slate-600 hover:text-blue-700 px-2 py-1 rounded-full transition-colors font-bold flex items-center gap-1 border border-slate-300 shadow-sm"
                                >
                                  <History className="w-3 h-3" />
                                  {expandedWorkerId === worker.id ? 'Close' : 'Log'}
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteWorker(worker.id)}
                                  className="text-[9px] bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 px-2 py-1 rounded-full transition-colors font-bold flex items-center gap-1 border border-slate-300 hover:border-rose-300 shadow-sm"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Del
                                </button>
                            </div>
                          </div>
                        </td>

                        {STATUS_COLUMNS.map(status => {
                          const statusData = worker.statuses[status.id] || { status: 'select' };
                          let statusValue = statusData.status || 'select';
                          if (statusValue as any === 'pending') statusValue = 'select';
                          
                          return (
                            <td key={status.id} className="px-2 py-3 align-top">
                              <div className="flex flex-col gap-1.5">
                                {/* Status Pill */}
                                <div className="relative">
                                  <select
                                    className={`
                                      w-full appearance-none pl-2 pr-6 py-2 text-xs font-bold rounded-lg border shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all
                                      ${getStatusColor(statusValue)}
                                    `}
                                    value={statusValue}
                                    onChange={(e) => updateStatus(worker.id, status.id, 'status', e.target.value as StatusType)}
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

                                {/* Contextual Inputs */}
                                <div className="min-h-[28px]">
                                  {statusValue === 'done' && (
                                    <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                      {/* Specific label for Flight column arrival date */}
                                      {status.id === 'booking' && (
                                        <label className="block text-[9px] font-bold text-slate-600 mb-0.5 ml-1">
                                          Arrival (Insha'Allah)
                                        </label>
                                      )}
                                       <input
                                        type="date"
                                        className="w-full text-[10px] font-bold bg-emerald-50 border border-emerald-300 rounded px-2 py-1.5 text-emerald-950 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none shadow-sm placeholder-emerald-700"
                                        value={statusData.date || ''}
                                        onChange={(e) => updateStatus(worker.id, status.id, 'date', e.target.value)}
                                      />
                                    </div>
                                  )}

                                  {statusValue === 'issue' && (
                                    <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                                      <input
                                        type="text"
                                        className="w-full text-[10px] font-semibold bg-rose-50 border border-rose-300 rounded px-2 py-1.5 text-rose-950 placeholder-rose-700 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none shadow-sm"
                                        value={statusData.note || ''}
                                        onChange={(e) => updateStatus(worker.id, status.id, 'note', e.target.value)}
                                        placeholder="Issue details..."
                                      />
                                    </div>
                                  )}
                                  
                                  {statusData.updatedBy && statusValue !== 'select' && (
                                     <div className="flex items-center justify-end gap-1 mt-1">
                                        <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate max-w-[80px]">
                                          {statusData.updatedBy}
                                        </span>
                                     </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      
                      {/* Expanded Audit Log */}
                      {expandedWorkerId === worker.id && (
                        <tr className="animate-in fade-in duration-200">
                          <td colSpan={STATUS_COLUMNS.length + 2} className="bg-slate-50 px-8 py-8 border-b border-slate-200 shadow-inner">
                            <div className="bg-white rounded-2xl border border-slate-300 shadow-xl shadow-slate-200/50 p-6 max-w-4xl mx-auto relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
                              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                                <h4 className="text-sm font-extrabold text-slate-900 font-heading flex items-center gap-2 uppercase tracking-wide">
                                  <Activity className="w-5 h-5 text-blue-700" />
                                  Audit Trail for {worker.name}
                                </h4>
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 font-bold">REF: {worker.id}</span>
                              </div>
                              
                              {(!worker.history || worker.history.length === 0) ? (
                                <div className="text-center py-10 text-slate-500 text-sm font-medium">
                                  No activity recorded yet.
                                </div>
                              ) : (
                                <div className="relative pl-3">
                                  <div className="absolute top-2 bottom-2 left-[20px] w-0.5 bg-slate-200"></div>
                                  <div className="space-y-6">
                                    {worker.history.map((log, idx) => (
                                      <div key={idx} className="relative pl-12 group">
                                        <div className="absolute left-[13.5px] top-4 w-3.5 h-3.5 rounded-full bg-white border-[3px] border-slate-300 group-hover:border-blue-600 transition-colors z-10 shadow-sm"></div>
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all shadow-sm hover:shadow-md">
                                          <div>
                                            <div className="flex items-center gap-3 mb-2">
                                              <span className="text-sm font-bold text-slate-900">{log.action}</span>
                                              <span className="text-[10px] px-2.5 py-1 rounded-full bg-white border border-slate-300 text-slate-600 font-bold uppercase tracking-wide shadow-sm">{log.milestone}</span>
                                            </div>
                                            {log.note && (
                                              <p className="text-sm text-slate-800 mt-2 bg-amber-50 border border-amber-200 p-3 rounded-xl font-medium inline-block shadow-sm">
                                                "{log.note}"
                                              </p>
                                            )}
                                          </div>
                                          <div className="text-right min-w-[140px]">
                                            <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-800">
                                              <div className="bg-slate-200 p-1 rounded-full"><User className="w-3 h-3 text-slate-600" /></div>
                                              {log.user}
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1.5 font-bold uppercase tracking-wider">
                                              {new Date(log.timestamp).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                              })}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
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

        {/* Weekly Reports Archive */}
        {weeklyReports.length > 0 && (
          <div className="mt-16 border-t border-slate-300 pt-10">
            <h2 className="text-xl font-black text-slate-900 mb-8 font-heading flex items-center gap-2">
              <FileText className="w-6 h-6 text-slate-500" />
              Report Archive
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {weeklyReports.map((report, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all group cursor-pointer relative overflow-hidden shadow-sm">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="font-bold text-slate-900 font-heading text-base">{report.week}</h3>
                      <p className="text-xs text-slate-600 mt-1 font-bold">{report.dateFormatted}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 group-hover:text-blue-700 group-hover:bg-blue-50 transition-colors border border-slate-200">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-5 border-t border-slate-100">
                    <div className="flex flex-col items-center">
                      <span className="font-black text-emerald-700 text-xl leading-none">{report.summary.completed}</span>
                      <span className="text-slate-500 text-[10px] mt-1.5 font-bold uppercase tracking-wider">Done</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                     <div className="flex flex-col items-center">
                      <span className="font-black text-rose-600 text-xl leading-none">{report.summary.issues}</span>
                      <span className="text-slate-500 text-[10px] mt-1.5 font-bold uppercase tracking-wider">Issues</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                     <div className="flex flex-col items-center">
                      <span className="font-black text-slate-800 text-xl leading-none">{report.summary.totalTasks}</span>
                      <span className="text-slate-500 text-[10px] mt-1.5 font-bold uppercase tracking-wider">Total</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-white/50 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-700" />
                Bulk Import Workers
              </h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-slate-500 hover:text-slate-700 transition-colors bg-white p-2 rounded-full shadow-sm border border-slate-200 hover:border-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-xs font-medium text-blue-900 flex gap-3 leading-relaxed">
                <AlertCircle className="w-5 h-5 shrink-0 text-blue-700" />
                <p>Paste your list of worker names below (one name per line). This will append them to your current list.</p>
              </div>
              <textarea
                className="w-full h-48 p-4 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none text-sm font-bold text-slate-900 resize-none shadow-inner placeholder-slate-400"
                placeholder="MARILYN GABRIEL&#10;FLORIDA PASION&#10;VICTORIA GUARDA BURCIA..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-5 py-2.5 text-slate-700 font-bold text-sm hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5"
                disabled={!importText.trim()}
              >
                Import Workers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;