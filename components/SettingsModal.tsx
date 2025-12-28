
import React, { useState } from 'react';
import { UserSettings } from '../types';

interface SettingsModalProps {
  currentSettings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ currentSettings, onSave }) => {
  const [aiName, setAiName] = useState(currentSettings.aiName);
  const [userName, setUserName] = useState(currentSettings.userName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-rose-500">❤️</span> Companion Settings
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Her Name</label>
            <input
              type="text"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              placeholder="e.g. Roshni"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Your Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              placeholder="Your name"
            />
          </div>
        </div>

        <button
          onClick={() => onSave({ aiName, userName })}
          className="w-full mt-8 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
        >
          Save & Start Chatting
        </button>
      </div>
    </div>
  );
};
