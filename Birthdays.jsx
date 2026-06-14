import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

function Birthdays() {
  const { data, addBirthday, deleteBirthday } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', date: '', relation: 'friend', note: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.date) return;
    addBirthday(formData);
    setFormData({ name: '', date: '', relation: 'friend', note: '' });
    setShowForm(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getBirthdayInfo = (dateStr) => {
    const bDate = new Date(dateStr);
    const thisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
    const nextYear = new Date(today.getFullYear() + 1, bDate.getMonth(), bDate.getDate());
    const target = thisYear >= today ? thisYear : nextYear;
    const diffMs = target - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const age = target.getFullYear() - bDate.getFullYear();

    if (diffDays === 0) return { text: '🎂 Today!', color: 'text-pink-400', bg: 'bg-pink-500/20', days: 0, age };
    if (diffDays <= 3) return { text: `🎈 ${diffDays} din baad!`, color: 'text-amber-400', bg: 'bg-amber-500/20', days: diffDays, age };
    if (diffDays <= 7) return { text: `${diffDays} days`, color: 'text-indigo-400', bg: 'bg-indigo-500/20', days: diffDays, age };
    return { text: `${diffDays} days`, color: 'text-slate-400', bg: 'bg-slate-700/50', days: diffDays, age };
  };

  const relationIcons = {
    friend: '👫',
    family: '👨‍👩‍👧',
    parent: '👴',
    sibling: '👦',
    partner: '❤️',
    colleague: '💼',
    other: '⭐'
  };

  // Sort by upcoming birthday
  const sorted = [...(data.birthdays || [])].sort((a, b) => {
    const aInfo = getBirthdayInfo(a.date);
    const bInfo = getBirthdayInfo(b.date);
    return aInfo.days - bInfo.days;
  });

  const todayBirthdays = sorted.filter(b => getBirthdayInfo(b.date).days === 0);
  const upcomingBirthdays = sorted.filter(b => {
    const d = getBirthdayInfo(b.date).days;
    return d > 0 && d <= 7;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-full -mr-20 -mt-20"></div>
        <h2 className="text-2xl font-bold gradient-text mb-1">🎂 Birthdays</h2>
        <p className="text-slate-400 text-sm">Kabhi kisi ka birthday mat bhoolna!</p>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pink-400"></span>
            <span className="text-sm text-slate-400">Total: {(data.birthdays || []).length}</span>
          </div>
          {todayBirthdays.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-sm text-amber-400 font-medium">Aaj {todayBirthdays.length} birthday!</span>
            </div>
          )}
        </div>
      </div>

      {/* Today's Birthdays Alert */}
      {todayBirthdays.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-pink-500 bg-pink-500/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl animate-bounce">🎉</span>
            <span className="text-pink-400 font-bold">Aaj Birthday Hai!</span>
          </div>
          {todayBirthdays.map(b => (
            <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg bg-pink-500/10">
              <span className="text-2xl">{relationIcons[b.relation] || '⭐'}</span>
              <div>
                <p className="text-white font-semibold">{b.name}</p>
                {b.note && <p className="text-xs text-slate-400">{b.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming (next 7 days) */}
      {upcomingBirthdays.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-amber-500 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⏰</span>
            <span className="text-amber-400 font-semibold text-sm">Agle 7 din mein</span>
          </div>
          <div className="space-y-2">
            {upcomingBirthdays.map(b => {
              const info = getBirthdayInfo(b.date);
              return (
                <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10">
                  <div className="flex items-center gap-2">
                    <span>{relationIcons[b.relation] || '⭐'}</span>
                    <span className="text-sm text-white">{b.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${info.bg} ${info.color}`}>{info.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="glow-button w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
      >
        {showForm ? '✕ Cancel' : '+ Add Birthday'}
      </button>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Kiska birthday? e.g., Rahul, Maa"
              className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-600 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Date of Birth *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-600 text-white focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Relation</label>
              <select
                value={formData.relation}
                onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-600 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="friend">👫 Friend</option>
                <option value="family">👨‍👩‍👧 Family</option>
                <option value="parent">👴 Parent</option>
                <option value="sibling">👦 Sibling</option>
                <option value="partner">❤️ Partner</option>
                <option value="colleague">💼 Colleague</option>
                <option value="other">⭐ Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Note (Optional)</label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Gift idea, yaad karna, etc."
              className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-600 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="glow-button w-full py-3 rounded-xl text-white font-semibold"
          >
            🎂 Save Birthday
          </button>
        </form>
      )}

      {/* Birthday List */}
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-5xl mb-3">🎂</p>
            <p className="text-slate-400 text-lg">Koi birthday nahi add ki abhi</p>
            <p className="text-slate-500 text-sm mt-1">Apne dosto aur family ke birthdays save karo!</p>
          </div>
        ) : (
          sorted.map(b => {
            const info = getBirthdayInfo(b.date);
            const bDate = new Date(b.date);
            return (
              <div
                key={b.id}
                className={`glass-card p-4 flex items-center gap-3 group hover:border-indigo-500/40 transition-all ${
                  info.days === 0 ? 'border border-pink-500/40' : ''
                }`}
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  info.days === 0
                    ? 'bg-gradient-to-br from-pink-500 to-rose-600'
                    : info.days <= 3
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                }`}>
                  <span className="text-xl">{relationIcons[b.relation] || '⭐'}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{b.name}</p>
                    {info.days === 0 && <span className="text-xs animate-bounce">🎉</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    📅 {bDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                    {bDate.getFullYear() > 1900 && ` · Age: ${info.age}`}
                  </p>
                  {b.note && <p className="text-xs text-slate-500 mt-0.5">📝 {b.note}</p>}
                </div>

                {/* Days left + Delete */}
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${info.bg} ${info.color} whitespace-nowrap`}>
                    {info.text}
                  </span>
                  <button
                    onClick={() => deleteBirthday(b.id)}
                    className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/40 transition-all opacity-0 group-hover:opacity-100 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Birthdays;
