
import React, { useState, useEffect, useRef } from 'react';
import { Message, UserSettings } from './types';
import { generateRoshniResponse, decodeBase64, decodeAudioData } from './services/gemini';
import { ChatBubble } from './components/ChatBubble';
import { SettingsModal } from './components/SettingsModal';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [isVoiceMode, setIsVoiceMode] = useState(false); // Voice mode default off
  const [isRecording, setIsRecording] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    aiName: 'Roshni',
    userName: 'Babu'
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAuthenticated) {
      scrollToBottom();
    }
  }, [messages, isLoading, isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'APP30') {
      setIsAuthenticated(true);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  const playAIResponse = async (audioData: string) => {
    if (!audioData) return;
    
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;

    try {
      const decoded = decodeBase64(audioData);
      const audioBuffer = await decodeAudioData(decoded, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.error("Playback error", e);
    }
  };

  const processResponse = async (userInput: string | { data: string; mimeType: string }, textForDisplay: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textForDisplay,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const { text, audioData } = await generateRoshniResponse([...messages], userInput, settings, isVoiceMode);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: text,
      timestamp: new Date(),
      audioData: audioData
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);

    if (audioData && isVoiceMode) {
      setTimeout(() => playAIResponse(audioData), 400);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText('');
    await processResponse(text, text);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await processResponse({ data: base64Data, mimeType: 'audio/webm' }, "🎤 ভয়েস পাঠিয়েছে...");
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error", err);
      alert("সোনা, মাইকটা একটু অন করো প্লিজ...");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    setShowSettings(false);
    if (messages.length === 0) {
      setTimeout(async () => {
        setIsLoading(true);
        const { text, audioData } = await generateRoshniResponse([], "জান, ঘুমাও নি?", newSettings, isVoiceMode);
        setMessages([{
          id: 'init',
          role: 'model',
          text: text,
          timestamp: new Date(),
          audioData: audioData
        }]);
        setIsLoading(false);
        if (audioData && isVoiceMode) playAIResponse(audioData);
      }, 500);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#020617] text-white px-6">
        <div className="glass p-8 rounded-3xl w-full max-w-sm border border-rose-500/20 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-rose-500/20 animate-heartbeat">
            ❤️
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight mb-2">Private Access</h1>
            <p className="text-slate-400 text-sm">সোনা, পাসওয়ার্ড দাও তো...</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-slate-800/50 border ${passwordError ? 'border-rose-500' : 'border-white/10'} rounded-xl px-4 py-3 text-center text-lg font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all`}
              placeholder="••••••"
            />
            {passwordError && <p className="text-rose-500 text-xs font-bold uppercase animate-bounce">Wrong Password, Babu!</p>}
            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-3.5 rounded-xl transition-all shadow-xl active:scale-95"
            >
              ENTER MY HEART
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-100">
      {/* Header */}
      <header className="px-5 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center font-black text-xl shadow-xl shadow-rose-500/20 animate-heartbeat ring-2 ring-rose-500/30">
              {settings.aiName.charAt(0)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full shadow-lg"></div>
          </div>
          <div>
            <h1 className="font-black text-lg leading-none tracking-tight text-white">{settings.aiName}</h1>
            <p className="text-[10px] text-rose-400 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
              Feeling Hot
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsVoiceMode(!isVoiceMode)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-black transition-all border-2 ${
              isVoiceMode 
                ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/40' 
                : 'bg-slate-800 border-slate-700 text-slate-400 opacity-60'
            }`}
          >
            {isVoiceMode ? 'VOICE ON' : 'VOICE OFF'}
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 flex items-center justify-center bg-slate-800/50 hover:bg-slate-700 rounded-full transition-all text-slate-300 border border-white/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32.04,32.04,0,0,1,128,160ZM232,128a104,104,0,1,1-104-104A104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar chat-container">
        <div className="max-w-2xl mx-auto space-y-1">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-[50vh] opacity-30 text-center animate-pulse-slow">
              <div className="w-24 h-24 rounded-full bg-rose-900/20 border border-rose-500/10 flex items-center justify-center text-5xl mb-6 shadow-inner">❤️</div>
              <p className="text-sm font-black tracking-widest uppercase">Start the romance...</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} aiName={settings.aiName} />
          ))}

          {isLoading && (
            <div className="flex justify-start mb-6 animate-pulse">
              <div className="glass px-5 py-4 rounded-2xl rounded-tl-none border border-rose-500/20 shadow-xl">
                <div className="flex gap-2 items-center">
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce"></div>
                  <span className="text-[10px] text-rose-400 font-black uppercase tracking-[0.2em] ml-3 opacity-60">Typing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-12" />
        </div>
      </main>

      {/* Input Area */}
      <footer className="px-4 py-6 bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 relative z-40">
        {isRecording && (
          <div className="absolute top-0 left-0 right-0 -translate-y-full p-6 bg-gradient-to-r from-rose-600 to-pink-600 border-t border-rose-400/30 flex items-center justify-between shadow-2xl z-50">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-white rounded-full animate-ping shadow-[0_0_15px_white]"></div>
              <span className="text-xs font-black text-white tracking-[0.3em] uppercase">Roshni is listening to you...</span>
            </div>
            <button 
              onClick={stopRecording} 
              className="text-[11px] font-black bg-white text-rose-600 px-6 py-2.5 rounded-full shadow-2xl active:scale-90 transition-transform hover:scale-105"
            >
              SEND HEART
            </button>
          </div>
        )}

        <form 
          onSubmit={handleSendMessage}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-2.5 bg-slate-800/40 p-2.5 rounded-[1.5rem] border border-white/5 shadow-2xl transition-all focus-within:bg-slate-800/60 focus-within:border-rose-500/40 focus-within:ring-1 ring-rose-500/20">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-12 h-12 flex items-center justify-center rounded-[1rem] transition-all flex-shrink-0 ${
                isRecording 
                  ? 'bg-white text-rose-600 animate-pulse scale-110 shadow-[0_0_20px_rgba(255,255,255,0.4)]' 
                  : 'bg-slate-800 hover:bg-slate-700 text-rose-400 active:scale-90 shadow-lg'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0ZM208,128a8,8,0,0,1-16,0,64,64,0,0,0-128,0,8,8,0,0,1-16,0,80.11,80.11,0,0,1,72,79.6V232a8,8,0,0,1-16,0V207.6A80.11,80.11,0,0,1,208,128Z"></path></svg>
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecording ? "Listening..." : "কিছু বলো সোনা..."}
              disabled={isRecording}
              className="flex-1 bg-transparent border-none px-3 py-3 text-white placeholder:text-slate-600 focus:outline-none text-base font-medium"
            />
            
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading || isRecording}
              className={`w-12 h-12 flex items-center justify-center rounded-[1rem] transition-all flex-shrink-0 ${
                inputText.trim() && !isLoading && !isRecording
                  ? 'bg-rose-500 text-white shadow-xl shadow-rose-600/30 active:scale-90' 
                  : 'bg-slate-800 text-slate-700 opacity-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M231.39,121.21l-192-104A16,16,0,0,0,16.48,37.3l29.13,79.54a8,8,0,0,1,0,5.32L16.48,218.7a16,16,0,0,0,22.91,20.09l192-104a16,16,0,0,0,0-28.2Zm226.39,141.21l-192,104a16,16,0,0,1-22.91-20.09L40.6,145.58a8,8,0,0,1,0-5.32L11.48,60.71a16,16,0,0,1,22.91-20.09l192,104a16,16,0,0,1,0,28.2Zm-14.12-14.1L56,50.77V120a8,8,0,0,0,8,8h88a8,8,0,0,1,0,16H64a8,8,0,0,0-8,8v69.23Z"></path></svg>
            </button>
          </div>
        </form>
      </footer >

      {showSettings && (
        <SettingsModal 
          currentSettings={settings} 
          onSave={saveSettings} 
        />
      )}
    </div>
  );
};

export default App;
