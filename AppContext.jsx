import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentMonth } from '../config';
import {
  getAllData,
  addItemToSheet,
  deleteItemFromSheet,
  updateItemInSheet,
  getAvailableMonths,
  createNewMonth,
  setupSheets,
  getPasswordFromSheet,
  savePasswordToSheet
} from '../services/googleSheets';

const AppContext = createContext();

const CACHE_KEY = 'rajlife_cache';
const CACHE_MONTH_KEY = 'rajlife_cache_month';

const defaultData = {
  finance: {
    income: [],
    expenses: [],
    loans: [],
    creditCards: [],
    otherIncome: []
  },
  tasks: [],
  goals: [],
  payments: [],
  birthdays: []
};

// Load cached data from localStorage
const loadCache = (month) => {
  try {
    const cachedMonth = localStorage.getItem(CACHE_MONTH_KEY);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached && cachedMonth === month) {
      const parsed = JSON.parse(cached);
      // Merge with defaultData to ensure all keys exist
      return {
        finance: {
          income: parsed.finance?.income || [],
          expenses: parsed.finance?.expenses || [],
          loans: parsed.finance?.loans || [],
          creditCards: parsed.finance?.creditCards || [],
          otherIncome: parsed.finance?.otherIncome || []
        },
        tasks: parsed.tasks || [],
        goals: parsed.goals || [],
        payments: parsed.payments || [],
        birthdays: parsed.birthdays || []
      };
    }
  } catch (e) {}
  return null;
};

// Save data to localStorage cache
const saveCache = (data, month) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_MONTH_KEY, month);
  } catch (e) {}
};

export function AppProvider({ children }) {
  const [data, setData] = useState(defaultData);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [availableMonths, setAvailableMonths] = useState([getCurrentMonth()]);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('1234');
  const [passwordLoaded, setPasswordLoaded] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [birthdayReminders, setBirthdayReminders] = useState([]);

  // Load password from Google Sheets on app start
  useEffect(() => {
    const loadPassword = async () => {
      const sheetPass = await getPasswordFromSheet();
      if (sheetPass) setPassword(sheetPass);
      setPasswordLoaded(true);
    };
    loadPassword();
  }, []);

  // On app start: load from localStorage cache immediately (so app shows data even before sync)
  useEffect(() => {
    const cached = loadCache(currentMonth);
    if (cached) {
      setData(cached);
    }
  }, []);

  const changePassword = async (newPass) => {
    setPassword(newPass);
    await savePasswordToSheet(newPass);
  };

  const unlock = (inputPass) => {
    if (inputPass === password) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  // After unlock: setup + sync from Sheets (fresh data from server)
  useEffect(() => {
    if (!isLocked) {
      const init = async () => {
        await setupSheets();
        await syncFromSheet();
        const months = await getAvailableMonths();
        if (months && months.length > 0) setAvailableMonths(months);
      };
      init();
    }
  }, [isLocked]);

  // Payment reminders (3 days)
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const upcoming = data.payments.filter(p => {
      if (p.done) return false;
      const payDate = new Date(p.dueDate);
      payDate.setHours(0, 0, 0, 0);
      return payDate >= today && payDate <= threeDaysLater;
    });
    setReminders(upcoming);
  }, [data.payments]);

  // Birthday reminders (today + next 7 days)
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const upcoming = data.birthdays.filter(b => {
      if (!b.date) return false;
      // Get month-day portion only (ignore year for yearly repeat)
      const bDate = new Date(b.date);
      // Check this year's birthday
      const thisYearBday = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
      const diffMs = thisYearBday - today;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }).map(b => {
      const bDate = new Date(b.date);
      const thisYearBday = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
      const diffMs = thisYearBday - today;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...b, daysLeft: diffDays };
    });

    setBirthdayReminders(upcoming);
  }, [data.birthdays]);

  // Sync from Google Sheets
  const syncFromSheet = useCallback(async (month) => {
    setSyncing(true);
    setSyncError(null);
    try {
      const targetMonth = month || currentMonth;
      const sheetData = await getAllData(targetMonth);
      if (sheetData) {
        const newData = {
          finance: {
            income: sheetData.income || [],
            expenses: sheetData.expenses || [],
            loans: sheetData.loans || [],
            creditCards: sheetData.creditCards || [],
            otherIncome: sheetData.otherIncome || []
          },
          tasks: sheetData.tasks || [],
          goals: sheetData.goals || [],
          payments: sheetData.payments || [],
          birthdays: sheetData.birthdays || []
        };
        setData(newData);
        saveCache(newData, targetMonth); // Save to localStorage for next app open
        setLastSynced(new Date().toLocaleTimeString('en-IN'));
        setSyncError(null);
      } else {
        setSyncError('Could not load data');
      }
    } catch (err) {
      setSyncError('Sync failed');
      console.error('Sync error:', err);
    }
    setSyncing(false);
  }, [currentMonth]);

  const changeMonth = async (month) => {
    setCurrentMonth(month);
    // Load cache for new month immediately
    const cached = loadCache(month);
    if (cached) setData(cached);
    await syncFromSheet(month);
  };

  const handleCreateMonth = async (month) => {
    await createNewMonth(month);
    const months = await getAvailableMonths();
    if (months) setAvailableMonths(months);
    setCurrentMonth(month);
    await syncFromSheet(month);
  };

  // Helper: update state + cache
  const updateDataAndCache = (updater) => {
    setData(prev => {
      const next = updater(prev);
      saveCache(next, currentMonth);
      return next;
    });
  };

  // Finance
  const addFinanceItem = async (category, item) => {
    const newItem = { ...item, id: Date.now(), createdAt: new Date().toISOString(), month: currentMonth };
    updateDataAndCache(prev => ({
      ...prev,
      finance: { ...prev.finance, [category]: [...prev.finance[category], newItem] }
    }));
    await addItemToSheet(category, item, currentMonth);
  };

  const deleteFinanceItem = async (category, id) => {
    updateDataAndCache(prev => ({
      ...prev,
      finance: { ...prev.finance, [category]: prev.finance[category].filter(item => item.id !== id) }
    }));
    await deleteItemFromSheet(category, id);
  };

  // Tasks
  const addTask = async (task) => {
    const newTask = { ...task, id: Date.now(), done: false, createdAt: new Date().toISOString(), month: currentMonth };
    updateDataAndCache(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    await addItemToSheet('tasks', task, currentMonth);
  };

  const toggleTask = async (id) => {
    let newDone;
    updateDataAndCache(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id === id) { newDone = !t.done; return { ...t, done: newDone }; }
        return t;
      })
    }));
    // Use timeout to ensure newDone is set after state update
    setTimeout(() => updateItemInSheet('tasks', id, { done: newDone }), 0);
  };

  const deleteTask = async (id) => {
    updateDataAndCache(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
    await deleteItemFromSheet('tasks', id);
  };

  // Goals
  const addGoal = async (goal) => {
    const newGoal = { ...goal, id: Date.now(), done: false, progress: 0, createdAt: new Date().toISOString(), month: currentMonth };
    updateDataAndCache(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
    await addItemToSheet('goals', goal, currentMonth);
  };

  const updateGoalProgress = async (id, progress) => {
    const done = progress >= 100;
    updateDataAndCache(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, progress, done } : g)
    }));
    await updateItemInSheet('goals', id, { progress, done });
  };

  const toggleGoal = async (id) => {
    let newDone, newProgress;
    updateDataAndCache(prev => ({
      ...prev,
      goals: prev.goals.map(g => {
        if (g.id === id) {
          newDone = !g.done;
          newProgress = newDone ? 100 : g.progress;
          return { ...g, done: newDone, progress: newProgress };
        }
        return g;
      })
    }));
    setTimeout(() => updateItemInSheet('goals', id, { done: newDone, progress: newProgress }), 0);
  };

  const deleteGoal = async (id) => {
    updateDataAndCache(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
    await deleteItemFromSheet('goals', id);
  };

  // Payments
  const addPayment = async (payment) => {
    const newPayment = { ...payment, id: Date.now(), done: false, createdAt: new Date().toISOString(), month: currentMonth };
    updateDataAndCache(prev => ({ ...prev, payments: [...prev.payments, newPayment] }));
    await addItemToSheet('payments', payment, currentMonth);
  };

  const togglePayment = async (id) => {
    let newDone;
    updateDataAndCache(prev => ({
      ...prev,
      payments: prev.payments.map(p => {
        if (p.id === id) { newDone = !p.done; return { ...p, done: newDone }; }
        return p;
      })
    }));
    setTimeout(() => updateItemInSheet('payments', id, { done: newDone }), 0);
  };

  const deletePayment = async (id) => {
    updateDataAndCache(prev => ({ ...prev, payments: prev.payments.filter(p => p.id !== id) }));
    await deleteItemFromSheet('payments', id);
  };

  // Birthdays
  const addBirthday = async (birthday) => {
    const newBirthday = { ...birthday, id: Date.now(), createdAt: new Date().toISOString() };
    updateDataAndCache(prev => ({ ...prev, birthdays: [...prev.birthdays, newBirthday] }));
    await addItemToSheet('birthdays', birthday, currentMonth);
  };

  const deleteBirthday = async (id) => {
    updateDataAndCache(prev => ({ ...prev, birthdays: prev.birthdays.filter(b => b.id !== id) }));
    await deleteItemFromSheet('birthdays', id);
  };

  return (
    <AppContext.Provider value={{
      data,
      currentMonth,
      availableMonths,
      syncing,
      lastSynced,
      syncError,
      isLocked,
      reminders,
      birthdayReminders,
      password,
      passwordLoaded,
      unlock,
      changePassword,
      changeMonth,
      handleCreateMonth,
      syncFromSheet,
      addFinanceItem,
      deleteFinanceItem,
      addTask,
      toggleTask,
      deleteTask,
      addGoal,
      updateGoalProgress,
      toggleGoal,
      deleteGoal,
      addPayment,
      togglePayment,
      deletePayment,
      addBirthday,
      deleteBirthday
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
