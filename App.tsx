
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
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    aiName: 'Roshni',
    userName: 'Babu'
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Small delay to ensure DOM is ready after loading/message updates
      const timer = setTimeout(() => scrollToBottom('smooth'), 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading, isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '2026') {
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
        // Start conversation with a natural greeting informed by current Dhaka time
        const { text, audioData } = await generateRoshniResponse([], "জান, কি খবর?", newSettings, isVoiceMode);
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
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#020617] text-white px-6">
        <div className="glass p-8 rounded-[2.5rem] w-full max-w-sm border border-rose-500/20 shadow-2xl text-center space-y-6 animate-fade-in">
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
              className={`w-full bg-slate-800/50 border ${passwordError ? 'border-rose-500' : 'border-white/10'} rounded-2xl px-4 py-4 text-center text-lg font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all`}
              placeholder="••••••"
              autoFocus
            />
            {passwordError && <p className="text-rose-500 text-xs font-bold uppercase animate-bounce">Wrong Password, Babu!</p>}
            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95"
            >
              ENTER MY HEART
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden text-slate-100 bg-transparent">
      {/* Header */}
      <header className="px-4 py-3 border-b border-white/5 bg-slate-900/60 backdrop-blur-2xl flex items-center justify-between sticky top-0 z-30 shadow-xl flex-shrink-0 safe-top">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center font-black text-lg shadow-xl animate-heartbeat ring-2 ring-rose-500/30">
              {settings.aiName.charAt(0)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-none tracking-tight text-white truncate">{settings.aiName}</h1>
            <p className="text-[9px] text-rose-400 font-black uppercase tracking-[0.15em] mt-1 flex items-center gap-1">
              <span className="w-1 h-1 bg-rose-500 rounded-full animate-pulse"></span>
              Feeling Passionate
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsVoiceMode(!isVoiceMode)}
            className={`px-3 py-2 rounded-full text-[9px] font-black transition-all border ${
              isVoiceMode 
                ? 'bg-rose-500 border-rose-400 text-white shadow-lg' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {isVoiceMode ? 'VOICE ON' : 'VOICE OFF'}
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 flex items-center justify-center bg-slate-800/50 hover:bg-slate-700 rounded-full transition-all text-slate-300 border border-white/5"
          >
            {/* Fixed: changed class to className */}
            <i className='bx bx-cog text-xl'></i>
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar chat-container">
        <div className="max-w-2xl mx-auto space-y-1">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-[60vh] opacity-20 text-center">
              <div className="w-20 h-20 rounded-full bg-rose-900/20 border border-rose-500/10 flex items-center justify-center text-4xl mb-6">❤️</div>
              <p className="text-xs font-black tracking-widest uppercase italic">She's waiting for your words...</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} aiName={settings.aiName} />
          ))}

          {isLoading && (
            <div className="flex justify-start mb-4 animate-fade-in">
              <div className="glass px-4 py-3 rounded-2xl rounded-tl-none border border-rose-500/10">
                <div className="flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <span className="text-[9px] text-rose-400 font-black uppercase tracking-widest ml-2 opacity-60">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-4" />
        </div>
      </main>

      {/* Input Area */}
      <footer className="px-3 py-3 bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 relative z-40 safe-bottom">
        {isRecording && (
          <div className="absolute top-0 left-0 right-0 -translate-y-full p-4 bg-gradient-to-r from-rose-600 to-pink-600 flex items-center justify-between shadow-2xl z-50">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
              <span className="text-[10px] font-black text-white tracking-widest uppercase">Listening to your heart...</span>
            </div>
            <button 
              onClick={stopRecording} 
              className="text-[10px] font-black bg-white text-rose-600 px-4 py-2 rounded-full active:scale-95 transition-transform"
            >
              SEND
            </button>
          </div>
        )}

        <form 
          onSubmit={handleSendMessage}
          className="max-w-2xl mx-auto flex items-end gap-2"
        >
          <div className="flex-1 flex items-center gap-1.5 bg-slate-800/40 p-1.5 rounded-[2rem] border border-white/5 transition-all focus-within:bg-slate-800/60 focus-within:border-rose-500/30">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${
                isRecording 
                  ? 'bg-white text-rose-600 animate-pulse' 
                  : 'bg-slate-800 text-rose-400 hover:text-rose-300'
              }`}
            >
              {/* Fixed: changed class to className */}
              <i className={`bx ${isRecording ? 'bx-microphone-off' : 'bx-microphone'} text-2xl`}></i>
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecording ? "Listening..." : "কিছু বলো জান..."}
              disabled={isRecording}
              className="flex-1 bg-transparent border-none px-2 py-2.5 text-white placeholder:text-slate-600 focus:outline-none text-base"
            />
            
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading || isRecording}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${
                inputText.trim() && !isLoading && !isRecording
                  ? 'bg-rose-500 text-white shadow-lg active:scale-90' 
                  : 'bg-slate-800 text-slate-700 opacity-40'
              }`}
            >
              {/* Fixed: changed class to className */}
              <i className='bx bxs-send text-xl'></i>
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
