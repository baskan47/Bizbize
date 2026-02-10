
import React, { useState, useEffect, useRef } from 'react';
import { ChatItem, CallType } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface CallingScreenProps {
  callType: CallType;
  chat: ChatItem;
  isIncoming?: boolean;
  onEnd: () => void;
}

const CallingScreen: React.FC<CallingScreenProps> = ({ callType, chat, isIncoming = false, onEnd }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(callType === 'voice');
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'secure' | 'ending'>(isIncoming ? 'ringing' : 'connecting');
  const [isLiveAiActive, setIsLiveAiActive] = useState(false);
  const [aiTranscription, setAiTranscription] = useState('');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);

  useEffect(() => {
    let timer: number;
    if (callStatus === 'secure') {
      timer = window.setInterval(() => setCallDuration(p => p + 1), 1000);
    }

    if (!isIncoming && callStatus === 'connecting') {
      // Simulate connecting delay
      const connTimer = setTimeout(() => setCallStatus('secure'), 3000);
      return () => {
        clearTimeout(connTimer);
        if (timer) clearInterval(timer);
      };
    }

    return () => {
      if (timer) clearInterval(timer);
      stopLiveAi();
    };
  }, [callStatus]);

  // Request hardware access when call goes live
  useEffect(() => {
    if (callStatus === 'secure' && callType === 'video') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }).catch(err => console.error("Media failed", err));
    }
  }, [callStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startLiveAi = async () => {
    if (isLiveAiActive) {
      stopLiveAi();
      return;
    }

    setIsLiveAiActive(true);
    setAiTranscription('Connecting to AI Assistant...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      const outputNode = audioContext.createGain();
      outputNode.connect(audioContext.destination);
      let nextStartTime = 0;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are a helpful AI assistant integrated into a secure E2EE phone call. Keep your responses short and supportive. You can hear the user and the environment.',
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setAiTranscription('AI Assistant Active. Speak now.');
            // Stream mic data to session
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
              const source = audioContext.createMediaStreamSource(stream);
              const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
                const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
                sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContext.destination);
            });
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) {
              setAiTranscription(prev => (prev + ' ' + msg.serverContent?.outputTranscription?.text).slice(-100));
            }
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const binary = atob(audioData);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              
              const ctx = audioContextRef.current;
              const dataInt16 = new Int16Array(bytes.buffer);
              const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
              const channelData = buffer.getChannelData(0);
              for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

              nextStartTime = Math.max(nextStartTime, ctx.currentTime);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputNode);
              source.start(nextStartTime);
              nextStartTime += buffer.duration;
            }
          },
          onerror: (e) => console.error("Live AI Error", e),
          onclose: () => setIsLiveAiActive(false)
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Live AI initiation failed", err);
      setIsLiveAiActive(false);
    }
  };

  const stopLiveAi = () => {
    if (liveSessionRef.current) {
      // In a real implementation we'd call close
      liveSessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsLiveAiActive(false);
    setAiTranscription('');
  };

  const acceptCall = () => {
    setCallStatus('connecting');
  };

  return (
    <div className="h-full bg-[#050a0d] relative flex flex-col overflow-hidden animate-in fade-in duration-700">
      {/* Dynamic Security Visualizer Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(0,136,204,0.15)_0%,transparent_70%)] animate-pulse"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      {/* Ringing / Connecting State UI */}
      {(callStatus === 'ringing' || callStatus === 'connecting') && (
        <div className="flex-1 flex flex-col items-center justify-center z-20 px-10 text-center">
          <div className="relative mb-12">
            <div className="absolute inset-[-40px] border-2 border-primary/20 rounded-full animate-ping opacity-50"></div>
            <div className="absolute inset-[-20px] border-2 border-primary/40 rounded-full animate-ping delay-700 opacity-30"></div>
            <img src={chat.avatar} className="w-32 h-32 rounded-full border-4 border-primary/30 shadow-[0_0_50px_rgba(0,136,204,0.4)] relative z-10" alt="" />
            <div className="absolute bottom-1 right-1 bg-primary p-1.5 rounded-full border-4 border-[#050a0d] z-20">
              <span className="material-icons-round text-white text-sm">security</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-extrabold mb-2 tracking-tight text-white">{chat.name}</h2>
          <p className="text-primary font-bold uppercase tracking-[0.3em] text-xs mb-8">
            {callStatus === 'ringing' ? 'Incoming Secure Call' : 'Establishing Encryption Keys...'}
          </p>
          
          <div className="flex items-center gap-12 mt-12">
            {callStatus === 'ringing' ? (
              <>
                <button onClick={onEnd} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-90 transition-all">
                  <span className="material-icons-round text-3xl">call_end</span>
                </button>
                <button onClick={acceptCall} className="w-20 h-20 bg-stitch-green rounded-full flex items-center justify-center text-background-dark shadow-2xl hover:scale-110 active:scale-90 transition-all pulse-glow">
                  <span className="material-icons-round text-4xl">call</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 italic text-sm animate-pulse">
                <span className="material-icons-round spin">sync</span>
                Handshaking via AES-256...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Secure Active Call UI */}
      {callStatus === 'secure' && (
        <>
          {/* Video Layer */}
          {callType === 'video' && (
            <div className="absolute inset-0 bg-slate-900 z-0">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover opacity-50" poster={chat.avatar} />
              <div className="absolute top-10 right-10 w-32 h-48 bg-black/50 rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-20 group">
                {!isCameraOff ? (
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-500">
                    <span className="material-icons-round text-3xl mb-2">videocam_off</span>
                    <span className="text-[8px] font-bold uppercase">Cam Off</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Call Info Header */}
          <header className="relative z-10 p-10 flex flex-col items-center">
            <div className="flex items-center gap-3 bg-surface-dark/40 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/5 shadow-2xl mb-4">
              <span className="w-2 h-2 bg-stitch-green rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Secure Node Connected • {formatTime(callDuration)}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">{chat.name}</h2>
            <div className="flex items-center gap-2 text-stitch-green/60">
              <span className="material-icons-round text-sm">lock</span>
              <span className="text-[9px] font-bold uppercase tracking-tighter">Verified Device Fingerprint: A7X-2024</span>
            </div>
          </header>

          {/* AI Assistant Visualization */}
          <div className="flex-1 relative z-10 px-8 flex flex-col justify-center items-center">
            {isLiveAiActive && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-6 duration-500 max-w-sm w-full">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 border-2 border-primary/40 rounded-full animate-ping"></div>
                  <span className="material-icons-round text-primary text-4xl animate-bounce">auto_awesome</span>
                </div>
                <div className="bg-primary/10 backdrop-blur-3xl border border-primary/20 p-6 rounded-[2rem] text-center shadow-2xl w-full">
                  <p className="text-[9px] font-black uppercase text-primary tracking-[0.3em] mb-3">Stitch AI Real-Time Assistant</p>
                  <p className="text-sm text-slate-200 leading-relaxed italic line-clamp-3">"{aiTranscription || 'Listening to conversation context...'}"</p>
                </div>
              </div>
            )}
          </div>

          {/* Call Control Bar */}
          <footer className="relative z-20 p-10">
            <div className="max-w-md mx-auto bg-[#1a2b35]/80 backdrop-blur-3xl rounded-[2.5rem] p-6 flex items-center justify-around border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
              >
                <span className="material-icons-round text-2xl">{isMuted ? 'mic_off' : 'mic'}</span>
              </button>

              <button 
                onClick={startLiveAi}
                className={`w-16 h-16 rounded-3xl flex flex-col items-center justify-center transition-all shadow-xl ${isLiveAiActive ? 'bg-primary text-white scale-110 shadow-primary/40' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
              >
                <span className="material-icons-round text-2xl mb-1">{isLiveAiActive ? 'hearing' : 'auto_awesome'}</span>
                <span className="text-[7px] font-bold uppercase tracking-tighter">AI Help</span>
              </button>

              {callType === 'video' && (
                <button 
                  onClick={() => setIsCameraOff(!isCameraOff)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isCameraOff ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                  <span className="material-icons-round text-2xl">{isCameraOff ? 'videocam_off' : 'videocam'}</span>
                </button>
              )}

              <button 
                onClick={onEnd}
                className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-90 transition-all rotate-135"
              >
                <span className="material-icons-round text-3xl">call_end</span>
              </button>
            </div>
          </footer>
        </>
      )}

      {/* Transition Overlay */}
      {callStatus === 'ending' && (
        <div className="absolute inset-0 bg-background-dark/95 backdrop-blur-lg z-50 flex items-center justify-center animate-in fade-in duration-300">
           <div className="flex flex-col items-center gap-4">
              <span className="material-icons-round text-slate-500 text-6xl animate-pulse">lock_clock</span>
              <p className="font-bold text-slate-500 uppercase tracking-widest">Wiping Temporary Session Keys...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default CallingScreen;
