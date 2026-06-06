import React, { useState, useEffect } from 'react';
import { ScreenType, CallLog } from '../types';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface CallLogsScreenProps {
  onBack: () => void;
  onNavClick: (screen: ScreenType) => void;
  activeScreen: ScreenType;
  hideFooter?: boolean;
}

const CallLogsScreen: React.FC<CallLogsScreenProps> = ({ onBack, onNavClick, activeScreen, hideFooter }) => {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const myProfile = JSON.parse(localStorage.getItem('bizbize_profile') || '{}');
    const myUid = auth?.currentUser?.uid || myProfile.uid;

    if (!myUid) {
      setIsLoading(false);
      return;
    }

    if (db) {
      // Subscribe to real-time call logs from Firestore
      const q = query(
        collection(db, 'users', myUid, 'call_logs'),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: CallLog[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            peerId: data.peerId || '',
            peerName: data.peerName || 'Bilinmeyen Kullanıcı',
            peerAvatar: data.peerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.id}`,
            type: data.type || 'voice',
            direction: data.direction || 'incoming',
            status: data.status || 'answered',
            timestamp: data.timestamp || new Date().toISOString(),
            duration: data.duration
          });
        });
        setLogs(list);
        localStorage.setItem('bizbize_call_logs', JSON.stringify(list));
        setIsLoading(false);
      }, (err) => {
        console.error("Firestore call logs fetch error:", err);
        // Fallback to local storage
        const saved = localStorage.getItem('bizbize_call_logs');
        setLogs(saved ? JSON.parse(saved) : []);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Offline fallback
      const saved = localStorage.getItem('bizbize_call_logs');
      setLogs(saved ? JSON.parse(saved) : []);
      setIsLoading(false);
    }
  }, []);

  const handleClearLogs = async () => {
    if (!confirm("Tüm arama geçmişini silmek istediğinize emin misiniz?")) return;

    const myProfile = JSON.parse(localStorage.getItem('bizbize_profile') || '{}');
    const myUid = auth?.currentUser?.uid || myProfile.uid;

    if (db && myUid) {
      try {
        const ref = collection(db, 'users', myUid, 'call_logs');
        const snap = await getDocs(ref);
        for (const document of snap.docs) {
          await deleteDoc(doc(db, 'users', myUid, 'call_logs', document.id));
        }
      } catch (err) {
        console.error("Error clearing logs from firestore:", err);
      }
    }

    localStorage.removeItem('bizbize_call_logs');
    setLogs([]);
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return '0 saniye';
    if (secs < 60) return `${secs} sn`;
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins} dk ${remainingSecs} sn`;
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Bilinmeyen Tarih';
    }
  };

  const filteredLogs = logs.filter(log =>
    log.peerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col pt-6 bg-background-dark text-white animate-slide-in-right">
      <header className="px-6 mb-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-primary material-icons-round p-1 hover:bg-white/5 rounded-full mr-1">
              arrow_back
            </button>
            <h1 className="text-2xl font-bold">Aramalar</h1>
          </div>
          {logs.length > 0 && (
            <button 
              onClick={handleClearLogs}
              title="Geçmişi Temizle"
              className="text-red-500 material-icons-round bg-red-500/10 p-2 rounded-xl hover:bg-red-500/20 transition-colors"
            >
              delete_sweep
            </button>
          )}
        </div>

        <div className="relative mb-4">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
          <input 
            type="text" 
            placeholder="Arama geçmişinde ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-surface-dark border-none rounded-xl pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-2 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <span className="material-icons-round spin-slow text-3xl mr-2 text-primary">sync</span>
            <span>Arama kayıtları yükleniyor...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-8">
            <div className="w-16 h-16 bg-surface-dark rounded-full flex items-center justify-center mb-4 border border-white/5">
              <span className="material-icons-round text-3xl text-slate-600">call</span>
            </div>
            <p className="text-sm font-bold text-slate-400">Arama Kaydı Yok</p>
            <p className="text-xs text-slate-500 max-w-[220px] mt-2 leading-relaxed">
              Yaptığınız veya aldığınız uçtan uca şifreli aramaların kayıtları burada görünecektir.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map(log => {
              const isMissed = log.status === 'missed';
              const isIncoming = log.direction === 'incoming';
              
              let directionIcon = 'call_made';
              let directionColor = 'text-stitch-green';
              
              if (isIncoming) {
                directionIcon = isMissed ? 'call_missed' : 'call_received';
                directionColor = isMissed ? 'text-red-500' : 'text-primary';
              }

              return (
                <div 
                  key={log.id}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface-dark/40 hover:bg-white/5 border border-white/5 transition-all group"
                >
                  <img src={log.peerAvatar} className="w-11 h-11 rounded-full border border-white/10 bg-slate-700" alt="" />
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-sm truncate text-slate-200 group-hover:text-white`}>
                      {log.peerName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`material-icons-round text-sm ${directionColor}`}>{directionIcon}</span>
                      <span className="text-xs text-slate-500">{isIncoming ? (isMissed ? 'Cevapsız Arama' : 'Gelen Arama') : 'Giden Arama'}</span>
                      {log.status === 'answered' && log.duration && (
                        <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                          {formatDuration(log.duration)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold block">{formatDateTime(log.timestamp)}</span>
                    <span className="material-icons-round text-slate-500 mt-1 text-base">
                      {log.type === 'video' ? 'videocam' : 'call'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {!hideFooter && (
        <footer className="h-20 bg-background-dark/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 pb-4">
          <button onClick={() => onNavClick(ScreenType.CHAT_LIST)} className="flex flex-col items-center gap-0.5 text-slate-500">
            <span className="material-icons-round">chat_bubble</span>
            <span className="text-[10px] font-bold">Mesajlar</span>
          </button>
          <button onClick={() => onNavClick(ScreenType.CALL_LOGS)} className="flex flex-col items-center gap-0.5 text-primary">
            <span className="material-icons-round">call</span>
            <span className="text-[10px] font-bold">Aramalar</span>
          </button>
          <button onClick={() => onNavClick(ScreenType.CONTACTS)} className="flex flex-col items-center gap-0.5 text-slate-500">
            <span className="material-icons-round">people</span>
            <span className="text-[10px] font-bold">Kişiler</span>
          </button>
          <button onClick={() => onNavClick(ScreenType.SETTINGS)} className="flex flex-col items-center gap-0.5 text-slate-500">
            <span className="material-icons-round">settings</span>
            <span className="text-[10px] font-bold">Ayarlar</span>
          </button>
        </footer>
      )}
    </div>
  );
};

export default CallLogsScreen;
