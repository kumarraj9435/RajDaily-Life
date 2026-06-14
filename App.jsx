import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import LockScreen from './components/LockScreen';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import Tasks from './pages/Tasks';
import Goals from './pages/Goals';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Birthdays from './pages/Birthdays';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isLocked, unlock, syncing, lastSynced, syncFromSheet, currentMonth, availableMonths, changeMonth, handleCreateMonth, reminders, birthdayReminders, password, passwordLoaded } = useApp();
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showBirthdayAlert, setShowBirthdayAlert] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState('');

  // Show reminder popups on unlock
  useEffect(() => {
    if (!isLocked) {
      if (reminders.length > 0) setShowReminders(true);
      if (birthdayReminders.length > 0) setShowBirthdayAlert(true);
    }
  }, [isLocked, reminders, birthdayReminders]);

  if (isLocked) {
    return <LockScreen onUnlock={unlock} currentPassword={password} />;
  }

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: '📊' },
    { id: 'finance', label: 'Finance', icon: '💰' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id: 'goals', label: 'Goals', icon: '🎯' },
    { id: 'payments', label: 'Bills', icon: '💸' },
    { id: 'birthdays', label: 'Bdays', icon: '🎂' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'finance': return <Finance />;
      case 'tasks': return <Tasks />;
      case 'goals': return <Goals />;
      case 'payments': return <Payments />;
      case 'birthdays': return <Birthdays />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  const generateMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = -3; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
    }
    const allMonths = new Set([...months, ...availableMonths]);
    return Array.from(allMonths).sort((a, b) => {
      const parseMonth = (s) => {
        const [m, y] = s.split(' ');
        const mi = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m);
        return new Date(Number(y), mi, 1);
      };
      return parseMonth(b) - parseMonth(a);
    });
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-20">

      {/* Birthday Alert Modal */}
      {showBirthdayAlert && birthdayReminders.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowBirthdayAlert(false)}>
          <div className="glass-card p-6 w-full max-w-sm space-y-4 border-l-4 border-pink-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">🎂</span>
              <div>
                <h3 className="text-lg font-bold text-pink-400">Birthday Reminder!</h3>
                <p className="text-xs text-slate-400">Agle 7 din mein birthdays hain</p>
              </div>
            </div>
            <div className="space-y-2">
              {birthdayReminders.map(b => (
                <div key={b.id} className="p-3 rounded-xl bg-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">🎉 {b.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${b.daysLeft === 0 ? 'text-pink-400' : 'text-amber-400'}`}>
                    {b.daysLeft === 0 ? 'Aaj! 🎊' : `${b.daysLeft} din baad`}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowBirthdayAlert(false); setActiveTab('birthdays'); }}
              className="glow-button w-full py-3 rounded-xl text-white font-semibold"
            >
              🎂 Birthdays Dekho
            </button>
            <button onClick={() => setShowBirthdayAlert(false)} className="w-full text-xs text-slate-500 hover:text-slate-400">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Payment Reminder Modal */}
      {showReminders && reminders.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowReminders(false)}>
          <div className="glass-card p-6 w-full max-w-sm space-y-4 border-l-4 border-amber-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-lg font-bold text-amber-400">Payment Reminder!</h3>
                <p className="text-xs text-slate-400">These payments are due in next 3 days</p>
              </div>
            </div>
            <div className="space-y-2">
              {reminders.map(p => (
                <div key={p.id} className="p-3 rounded-xl bg-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{p.title}</p>
                    <p className="text-xs text-slate-400">Due: {new Date(p.dueDate).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className="text-sm font-bold text-orange-400">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowReminders(false)} className="glow-button w-full py-3 rounded-xl text-white font-semibold">
              Got it! 👍
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-0 border-b border-indigo-500/20 px-4 py-3 md:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold gradient-text">✨ Raj Life</h1>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="text-[10px] md:text-sm px-2 md:px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all"
            >
              📅 {currentMonth}
            </button>
            <button
              onClick={() => syncFromSheet()}
              className={`text-xs px-2 py-1.5 rounded-lg transition-all ${syncing ? 'bg-amber-500/20 text-amber-300 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
              disabled={syncing}
              title={lastSynced ? `Last: ${lastSynced}` : 'Sync'}
            >
              {syncing ? '🔄' : '☁️'}
            </button>
          </div>
        </div>
        {lastSynced && <p className="text-[10px] text-slate-500 text-right mt-1">Synced: {lastSynced}</p>}
      </header>

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowMonthPicker(false)}>
          <div className="glass-card p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">📅 Select Month</h3>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {generateMonthOptions().map(month => (
                <button
                  key={month}
                  onClick={() => { changeMonth(month); setShowMonthPicker(false); }}
                  className={`p-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentMonth === month
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-700 pt-3">
              <p className="text-xs text-slate-400 mb-2">Create new month:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMonthInput}
                  onChange={(e) => setNewMonthInput(e.target.value)}
                  placeholder="e.g., Jun 2026"
                  className="flex-1 p-2 rounded-lg bg-slate-800/80 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (newMonthInput.trim()) {
                      handleCreateMonth(newMonthInput.trim());
                      setNewMonthInput('');
                      setShowMonthPicker(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {renderPage()}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-0 border-t border-indigo-500/20 md:hidden">
        <div className="flex justify-around items-center py-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-item flex flex-col items-center py-1.5 px-1.5 rounded-xl ${
                activeTab === tab.id ? 'active text-white' : 'text-slate-400'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="text-[7px] mt-0.5">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Side Navigation - Desktop */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 w-20 glass-card border-0 border-r border-indigo-500/20 flex-col items-center py-6 gap-2">
        <div className="text-2xl mb-4">✨</div>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-item flex flex-col items-center py-2.5 px-3 rounded-xl ${
              activeTab === tab.id ? 'active text-white' : 'text-slate-400 hover:text-white'
            }`}
            title={tab.label}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[8px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
