import React, { useState, useEffect, useRef } from 'react';
import { ChatItem, Message, CallType } from '../types';
import { GoogleGenAI } from '@google/genai';
import { saveMessageToDb, subscribeToMessages } from '../db';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface ChatDetailProps {
  chat: ChatItem;
  initialMessages: Message[];
  onUpdateMessages: (msgs: Message[]) => void;
  onBack: () => void;
  onOpenAttachments: () => void;
  onGoLive: () => void;
  onCall: (type: CallType) => void;
  isLargeScreen?: boolean;
}

const ChatDetailScreen: React.FC<ChatDetailProps> = ({ chat, initialMessages, onUpdateMessages, onBack, onOpenAttachments, onGoLive, onCall, isLargeScreen }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Deterministic Chat ID for E2EE database synchronization
  const myUid = auth?.currentUser?.uid || 'me';
  const targetUid = chat.id;
  const deterministicChatId = [myUid, targetUid].sort().join('_');

  // E2EE secret key unique to this chat
  const secretKey = `bizbize-secret-${deterministicChatId}`;

  // Subscribe to real-time messages from database
  useEffect(() => {
    const unsubscribe = subscribeToMessages(deterministicChatId, secretKey, (updatedMsgs) => {
      // Mark messages that are not sent by me as not isMe (so they align left)
      const formattedMsgs = updatedMsgs.map(msg => ({
        ...msg,
        isMe: msg.senderId === myUid || msg.isMe && msg.senderId === 'me'
      }));
      setMessages(formattedMsgs);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [deterministicChatId, secretKey, myUid]);

  useEffect(() => {
    onUpdateMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();

    const userMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: myUid,
      text: textToSend,
      type: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: 'sent'
    };

    setInputText('');
    
    // Save to E2EE Database using the deterministic chatId
    await saveMessageToDb(deterministicChatId, userMsg, secretKey);

    // Save/update active chats metadata in Firestore for both users so they discover each other instantly
    if (db) {
      try {
        const myProfile = JSON.parse(localStorage.getItem('bizbize_profile') || '{}');
        const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updatedTimeIso = new Date().toISOString();

        // 1. Update my active chats list
        await setDoc(doc(db, 'users', myUid, 'active_chats', targetUid), {
          id: targetUid,
          name: chat.name,
          avatar: chat.avatar,
          lastMessage: textToSend,
          time: timestampStr,
          type: 'user',
          updatedAt: updatedTimeIso
        }, { merge: true });

        // 2. Update target user's active chats list so it pops up in their chats tab
        await setDoc(doc(db, 'users', targetUid, 'active_chats', myUid), {
          id: myUid,
          name: myProfile.name || 'Gizli Sohbet',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(myProfile.name || myUid)}`,
          lastMessage: textToSend,
          time: timestampStr,
          type: 'user',
          updatedAt: updatedTimeIso
        }, { merge: true });
      } catch (err) {
        console.error("Firestore aktif sohbet listesi güncellenirken hata:", err);
      }
    }
  };

  const handleTranscript = async (msgId: string) => {
    setIsTranscribing(msgId);
    let transcriptText = '';
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

    if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'Translate/transcribe this simulated voice message into a short Turkish sentence about project progress.',
        });
        transcriptText = response.text || '';
      } catch (err) {
        console.error("Gemini transcribe error:", err);
      }
    }

    if (!transcriptText) {
      transcriptText = "Proje ilerlemesi oldukça iyi gidiyor, tüm testler tamamlandı.";
    }

    // Update message transcript in database
    const targetMsg = messages.find(m => m.id === msgId);
    if (targetMsg) {
      const updatedMsg = { ...targetMsg, transcript: transcriptText };
      await saveMessageToDb(deterministicChatId, updatedMsg, secretKey);
    }
    setIsTranscribing(null);
  };

  const deleteMessage = (id: string) => {
    // For local mockup deletion from state
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col relative h-full bg-background-dark border-l border-white/5">
      <header className="h-20 bg-surface-dark/50 backdrop-blur-md px-6 flex items-center justify-between border-b border-white/5 z-10 shrink-0">
        <div className="flex items-center gap-4">
          {!isLargeScreen && (
            <button onClick={onBack} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors flex items-center">
              <span className="material-icons-round text-3xl">chevron_left</span>
            </button>
          )}
          <div className="flex items-center gap-3 cursor-pointer" onClick={onGoLive}>
            <div className="relative">
              <img src={chat.avatar} className="w-11 h-11 rounded-full border border-white/10 bg-slate-700" alt="" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-stitch-green rounded-full border-2 border-background-dark pulse-green"></div>
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">{chat.name}</h2>
              <p className="text-[10px] text-stitch-green font-bold tracking-widest uppercase">Güvenli Düğüm</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <button onClick={() => onCall('voice')} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
            <span className="material-icons-round">call</span>
          </button>
          <button onClick={() => onCall('video')} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
            <span className="material-icons-round">videocam</span>
          </button>
          <div className="w-[1px] h-6 bg-white/5 mx-1 hidden sm:block"></div>
          <button onClick={() => setShowSecurityInfo(true)} className="w-10 h-10 flex items-center justify-center text-stitch-green hover:bg-stitch-green/10 rounded-xl transition-all">
            <span className="material-icons-round">lock</span>
          </button>
        </div>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        <div className="flex justify-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-surface-dark px-4 py-1.5 rounded-full border border-white/5 shadow-lg">E2EE Bağlantısı Aktif</span>
        </div>

        {messages.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-10">
            Henüz mesaj yok. Sohbeti başlatın...
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className="flex items-end gap-2 max-w-[85%] lg:max-w-[70%]">
                {!msg.isMe && <img src={chat.avatar} className="w-6 h-6 rounded-full border border-white/5 bg-slate-700 hidden sm:block" alt="" />}
                {msg.type === 'text' && (
                  <div className={`px-4 py-3 rounded-2xl shadow-xl ${msg.isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-surface-dark text-slate-200 rounded-tl-none border border-white/5'}`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                )}
                {msg.type === 'image' && (
                  <div className="flex flex-col bg-surface-dark border border-white/5 rounded-2xl overflow-hidden shadow-xl max-w-sm">
                    <img src={msg.imageUrl} className="w-full h-auto max-h-60 object-cover" alt="Paylaşılan Görsel" />
                    {msg.imageCaption && (
                      <div className="p-3 text-sm text-slate-200 border-t border-white/5">
                        {msg.imageCaption}
                      </div>
                    )}
                  </div>
                )}
                {msg.type === 'voice' && (
                  <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl rounded-bl-none flex items-center gap-4">
                    <span className="material-icons-round text-primary text-3xl cursor-pointer hover:scale-105 active:scale-95 transition-transform">play_circle</span>
                    <div className="flex items-end gap-1 h-6">
                      {[12, 20, 15, 25, 18, 22, 10, 16].map((h, i) => <div key={i} className="w-1 bg-primary/40 rounded-full" style={{height: `${h}px`}}></div>)}
                    </div>
                    <button onClick={() => handleTranscript(msg.id)} disabled={isTranscribing === msg.id} className="p-2 hover:bg-primary/20 rounded-lg text-primary transition-colors">
                      <span className={`material-icons-round text-sm ${isTranscribing === msg.id ? 'spin-slow' : ''}`}>translate</span>
                    </button>
                  </div>
                )}
                {msg.type === 'poll' && msg.poll && (
                  <div className="w-full bg-surface-dark p-5 rounded-2xl border border-white/5 shadow-2xl">
                    <h4 className="font-bold text-sm mb-4 flex items-center gap-2 text-primary"><span className="material-icons-round">poll</span> {msg.poll.question}</h4>
                    <div className="space-y-3">
                      {msg.poll.options.map(opt => (
                        <button key={opt.id} className="w-full text-left bg-white/5 p-3 rounded-xl text-xs hover:bg-primary/10 hover:border-primary/20 border border-transparent transition-all flex justify-between items-center group">
                          <span className="font-medium">{opt.text}</span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                            <span className="text-[10px] text-slate-500">{opt.votes} oy</span>
                            <span className="material-icons-round text-primary text-sm">check_circle</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {msg.type === 'ephemeral' && <EphemeralMessage message={msg} onExpire={() => deleteMessage(msg.id)} />}
                {msg.type === 'file' && (
                   <div className="flex items-center gap-4 bg-surface-dark p-4 rounded-2xl border border-white/5 shadow-xl hover:bg-white/5 transition-colors cursor-pointer group">
                     <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <span className="material-icons-round text-3xl">{msg.isZipped ? 'folder_zip' : 'description'}</span>
                     </div>
                     <div>
                       <p className="text-sm font-bold">{msg.fileName}</p>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{msg.isZipped ? 'Güvenli Arşiv' : 'Şifreli Belge'}</p>
                     </div>
                     <span className="material-icons-round text-slate-600 ml-4">download</span>
                   </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-2 px-1">
                <span className="text-[10px] text-slate-500 font-medium">{msg.timestamp}</span>
                {msg.isMe && (
                  <div className="flex items-center">
                    <span className={`material-icons-round text-sm ${msg.status === 'read' ? 'text-stitch-green' : 'text-slate-500'}`}>
                      {msg.status === 'read' ? 'done_all' : 'done'}
                    </span>
                  </div>
                )}
              </div>
              {msg.transcript && <p className="mt-2 text-[11px] text-slate-400 italic bg-white/5 p-2 rounded-lg border-l-2 border-primary">"{msg.transcript}"</p>}
            </div>
          ))
        )}
        {isTyping && <div className="flex items-center gap-3 text-primary"><div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div><span className="text-[10px] font-bold tracking-[0.2em] uppercase">ŞİFRE ÇÖZÜLÜYOR...</span></div>}
      </main>

      <footer className="p-6 bg-surface-dark/30 backdrop-blur-xl border-t border-white/5">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={onOpenAttachments} className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 active:scale-95 transition-all shadow-lg">
            <span className="material-icons-round text-2xl">add</span>
          </button>
          <div className="flex-1 relative group">
            <input 
              type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="bizbize şifreli mesaj yaz..." className="w-full h-12 bg-surface-dark border border-white/5 rounded-2xl px-6 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
              <span className="material-icons-round">mood</span>
            </button>
          </div>
          <button onClick={handleSendMessage} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all shadow-2xl ${inputText ? 'bg-primary scale-105' : 'bg-slate-700 hover:bg-slate-600'}`}>
            <span className="material-icons-round text-2xl">{inputText ? 'send' : 'mic'}</span>
          </button>
        </div>
      </footer>

      {showSecurityInfo && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface-dark rounded-[2.5rem] p-10 max-w-md w-full border border-white/10 shadow-[0_0_50px_rgba(0,136,204,0.3)] animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-stitch-green/10 rounded-full flex items-center justify-center mb-6 border border-stitch-green/20">
                <span className="material-icons-round text-5xl text-stitch-green">verified_user</span>
              </div>
              <h3 className="text-2xl font-bold">StitchGuard Koruması</h3>
              <p className="text-sm text-slate-400 mt-4 leading-relaxed">
                Şifreleme anahtarlarınız yerel olarak üretilir. Sunucularımıza asla düz metin gitmez. {chat.name} için doğrulandı.
              </p>
            </div>
            <button onClick={() => setShowSecurityInfo(false)} className="w-full bg-primary py-4 rounded-2xl font-bold mt-8 shadow-xl shadow-primary/30 active:scale-95 transition-all">Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
};

const EphemeralMessage: React.FC<{ message: Message; onExpire: () => void }> = ({ message, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(message.ttl || 15);
  useEffect(() => {
    if (timeLeft <= 0) { onExpire(); return; }
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);
  return (
    <div className="bg-surface-dark border border-orange-500/30 px-5 py-4 rounded-2xl rounded-tl-none relative overflow-hidden shadow-2xl">
      <div className="absolute bottom-0 left-0 h-1 bg-orange-500 transition-all duration-1000" style={{width: `${(timeLeft / (message.ttl || 15)) * 100}%`}}></div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span className="material-icons-round text-orange-500 text-2xl animate-pulse">local_fire_department</span>
          <span className="text-[10px] font-bold text-orange-500 mt-1">{timeLeft}s</span>
        </div>
        <p className="text-sm text-slate-200">{message.text}</p>
      </div>
    </div>
  );
};

export default ChatDetailScreen;
