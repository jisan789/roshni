
import React, { useState } from 'react';
import { Message } from '../types';
import { decodeBase64, decodeAudioData } from '../services/gemini';

interface ChatBubbleProps {
  message: Message;
  aiName: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, aiName }) => {
  const isUser = message.role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);

  const playAudio = async () => {
    if (!message.audioData || isPlaying) return;
    
    setIsPlaying(true);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    try {
      const decoded = decodeBase64(message.audioData);
      const audioBuffer = await decodeAudioData(decoded, audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        setIsPlaying(false);
        audioContext.close();
      };
      source.start();
    } catch (e) {
      console.error("Playback error", e);
      setIsPlaying(false);
    }
  };

  return (
    <div className={`flex w-full mb-3 ${isUser ? 'justify-end' : 'justify-start animate-fade-in'}`}>
      <div className={`max-w-[88%] sm:max-w-[82%] px-4 py-3 rounded-[1.25rem] message-shadow relative transition-all duration-300 ${
        isUser 
          ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-tr-none' 
          : 'glass text-slate-100 rounded-tl-none border-rose-500/10'
      }`}>
        {!isUser && (
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 opacity-80">
              {aiName}
            </span>
          </div>
        )}
        
        <p className={`text-[15px] leading-[1.55] font-medium ${isUser ? 'selection:bg-white/20' : 'selection:bg-rose-500/20'}`}>
          {message.text}
        </p>
        
        {message.audioData && !isUser && (
          <button 
            onClick={playAudio}
            className={`mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                isPlaying 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            {isPlaying ? (
               <div className="flex gap-1 items-end h-2.5 mb-0.5">
                 <div className="w-0.5 bg-current animate-[bounce_1s_infinite] h-full"></div>
                 <div className="w-0.5 bg-current animate-[bounce_1.2s_infinite] h-2/3"></div>
                 <div className="w-0.5 bg-current animate-[bounce_0.8s_infinite] h-full"></div>
               </div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm36.44-94.66-48-32A8,8,0,0,0,104,96v64a8,8,0,0,0,12.44,6.66l48-32a8,8,0,0,0,0-13.32Z"></path></svg>
            )}
            <span className="uppercase tracking-widest">{isPlaying ? 'Playing...' : 'Play Voice'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
