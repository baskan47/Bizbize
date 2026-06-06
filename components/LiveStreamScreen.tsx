import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { saveMessageToDb } from '../db';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface LiveStreamProps {
  onClose: () => void;
  currentChatId?: string;
  myUid?: string;
  senderName?: string;
}

const LiveStreamScreen: React.FC<LiveStreamProps> = ({ onClose, currentChatId, myUid, senderName }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [roomId, setRoomId] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Generate a fixed or random room ID for the session
    setRoomId(Math.random().toString(36).substr(2, 9).toUpperCase());
  }, []);

  const startScreenCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setIsSharing(true);

      // Broadcast livestream message if in a chat
      if (currentChatId && myUid) {
        const secretKey = `bizbize-secret-${currentChatId}`;
        const userMsg: Message = {
          id: Math.random().toString(36).substr(2, 9),
          senderId: myUid,
          text: `${senderName || 'Bir kullanıcı'} görüntülü canlı yayın başlattı! Katılmak için tıklayın.`,
          type: 'livestream',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: true,
          status: 'sent',
          livestreamRoomId: roomId,
          livestreamSenderName: senderName || 'Kullanıcı'
        };
        await saveMessageToDb(currentChatId, userMsg, secretKey);

        // Also update the last active chats in Firestore if db is active
        if (db) {
          const parts = currentChatId.split('_');
          const targetUid = parts.find(uid => uid !== myUid) || '';
          if (targetUid) {
            const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const updatedTimeIso = new Date().toISOString();

            await setDoc(doc(db, 'users', myUid, 'active_chats', targetUid), {
              lastMessage: '📹 Canlı Yayın Başlatıldı',
              time: timestampStr,
              updatedAt: updatedTimeIso
            }, { merge: true });

            await setDoc(doc(db, 'users', targetUid, 'active_chats', myUid), {
              lastMessage: '📹 Canlı Yayın Başlatıldı',
              time: timestampStr,
              updatedAt: updatedTimeIso
            }, { merge: true });
          }
        }
      }
    } catch (err) {
      console.error("Screen capture failed:", err);
    }
  };

  const stopScreenCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsSharing(false);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`https://stitch.secure/room/${roomId}`);
    alert("Davet linki kopyalandı!");
  };

  return (
    <div className="h-full bg-black relative flex flex-col overflow-hidden">
      {/* Dynamic Video Feed */}
      <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
        {isSharing ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="text-center">
            <span className="material-icons-round text-primary text-6xl animate-pulse mb-4">sensors</span>
            <h2 className="text-xl font-bold">Canlı Yayına Hazır</h2>
            <p className="text-slate-500 text-xs">Yayın başlatmak için paylaşım butonuna tıklayın</p>
          </div>
        )}
      </div>

      <header className="relative z-20 px-6 pt-6 flex justify-between items-start">
        <div className="flex gap-3">
          <div className="bg-red-600 px-3 py-1 rounded flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase">Canlı</span>
          </div>
        </div>
        <button onClick={onClose} className="bg-black/40 p-2 rounded-full border border-white/5"><span className="material-icons-round">close</span></button>
      </header>

      <footer className="absolute bottom-10 left-6 right-6 z-30">
        <div className="bg-surface-dark/90 backdrop-blur-2xl rounded-3xl p-6 flex items-center justify-between border border-white/10 shadow-2xl">
          <button onClick={copyInviteLink} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-active:scale-90 transition-all">
              <span className="material-icons-round text-slate-400">person_add</span>
            </div>
            <span className="text-[8px] font-bold uppercase text-slate-500">Davet Et</span>
          </button>

          <button 
            onClick={isSharing ? stopScreenCapture : startScreenCapture}
            className={`w-20 h-20 -mt-16 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 ${isSharing ? 'bg-red-500 text-white' : 'bg-primary text-white pulse-glow'}`}
          >
            <span className="material-icons-round text-3xl">{isSharing ? 'stop' : 'screen_share'}</span>
            <span className="text-[9px] font-bold uppercase mt-1">{isSharing ? 'Durdur' : 'Başlat'}</span>
          </button>

          <button onClick={onClose} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
              <span className="material-icons-round">call_end</span>
            </div>
            <span className="text-[8px] font-bold uppercase text-red-500">Bitir</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LiveStreamScreen;

