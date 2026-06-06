import React, { useState, useEffect, useRef } from 'react';
import { ScreenType, ChatItem, Message, CallType } from './types';
import ChatListScreen from './components/ChatListScreen';
import ChatDetailScreen from './components/ChatDetailScreen';
import LiveStreamScreen from './components/LiveStreamScreen';
import AttachmentScreen from './components/AttachmentScreen';
import SettingsScreen from './components/SettingsScreen';
import CallingScreen from './components/CallingScreen';
import ContactsScreen from './components/ContactsScreen';
import LoginRegisterScreen from './components/LoginRegisterScreen';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('bizbize_profile') !== null;
  });
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(ScreenType.CHAT_LIST);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [globalMessages, setGlobalMessages] = useState<Record<string, Message[]>>({});
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 768);
  const [activeCall, setActiveCall] = useState<{ type: CallType; chat: ChatItem; isIncoming?: boolean } | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const [incomingCallOffer, setIncomingCallOffer] = useState<any>(null);

  // Global WebSocket connection for incoming calls
  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    const savedProfile = JSON.parse(localStorage.getItem('bizbize_profile') || '{}');
    const myUid = savedProfile.uid;
    if (!myUid) return;

    const wsUrl = import.meta.env.VITE_SIGNALING_SERVER_URL || 'ws://localhost:3001';
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'register',
        userId: myUid
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'offer') {
          // Fetch caller details from Firestore
          let callerChat: ChatItem = {
            id: data.senderId,
            name: 'Gizli Arama',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.senderId}`,
            lastMessage: '',
            time: 'Şimdi',
            unreadCount: 0,
            type: 'user'
          };

          if (db) {
            try {
              const docSnap = await getDoc(doc(db, 'users', data.senderId));
              if (docSnap.exists()) {
                const docData = docSnap.data();
                callerChat.name = docData.name || callerChat.name;
                callerChat.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(docData.name || data.senderId)}`;
              }
            } catch (err) {
              console.error("Caller info fetch failed:", err);
            }
          }

          setIncomingCallOffer(data);
          setActiveCall({ type: data.callType || 'video', chat: callerChat, isIncoming: true });
          setCurrentScreen(ScreenType.CALLING);
        } else if (data.type === 'hangup') {
          setActiveCall(null);
          setIncomingCallOffer(null);
          setCurrentScreen(ScreenType.CHAT_LIST);
        }
      } catch (err) {
        console.error("Global socket message processing error:", err);
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleResize = () => {
      const large = window.innerWidth >= 768;
      setIsLargeScreen(large);
      if (large && !selectedChat && currentScreen === ScreenType.CHAT_DETAIL) {
        setCurrentScreen(ScreenType.CHAT_LIST);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedChat, currentScreen]);

  const handleLoginSuccess = (profile: { uid?: string; name: string; phone: string; status: string; avatarSeed: string; userId?: string }) => {
    localStorage.setItem('bizbize_profile', JSON.stringify(profile));
    setIsAuthenticated(true);
    setCurrentScreen(ScreenType.CHAT_LIST);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedChat(null);
  };

  const navigateToChat = (chat: ChatItem) => {
    setSelectedChat(chat);
    
    // Add to active chats list in localStorage
    const savedChats = localStorage.getItem('bizbize_active_chats');
    const activeChats: ChatItem[] = savedChats ? JSON.parse(savedChats) : [];
    if (!activeChats.some(c => c.id === chat.id)) {
      const updated = [chat, ...activeChats];
      localStorage.setItem('bizbize_active_chats', JSON.stringify(updated));
    }

    if (!isLargeScreen) {
      setCurrentScreen(ScreenType.CHAT_DETAIL);
    } else {
      setCurrentScreen(ScreenType.CHAT_LIST);
    }
  };

  const startCall = (type: CallType, chat: ChatItem) => {
    setActiveCall({ type, chat, isIncoming: false });
    setCurrentScreen(ScreenType.CALLING);
  };

  const handleNavClick = (screen: ScreenType) => {
    setCurrentScreen(screen);
  };

  const handleSendMessage = (chatId: string, message: Message) => {
    setGlobalMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), message]
    }));
  };

  if (!isAuthenticated) {
    return <LoginRegisterScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen bg-background-dark text-white overflow-hidden font-sans">
      {/* 1. SIDE NAVIGATION (Desktop Only) */}
      {isLargeScreen && (
        <aside className="w-20 bg-surface-dark border-r border-white/5 flex flex-col items-center py-8 gap-8 shrink-0">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4 cursor-pointer hover:rotate-12 transition-transform">
            <span className="material-icons-round text-white text-3xl">bolt</span>
          </div>
          <NavRailButton 
            icon="chat_bubble" 
            active={currentScreen === ScreenType.CHAT_LIST || currentScreen === ScreenType.CHAT_DETAIL} 
            onClick={() => handleNavClick(ScreenType.CHAT_LIST)} 
          />
          <NavRailButton 
            icon="explore" 
            active={currentScreen === ScreenType.DISCOVERY} 
            onClick={() => handleNavClick(ScreenType.DISCOVERY)} 
          />
          <NavRailButton 
            icon="people" 
            active={currentScreen === ScreenType.CONTACTS} 
            onClick={() => handleNavClick(ScreenType.CONTACTS)} 
          />
          <div className="mt-auto">
            <NavRailButton 
              icon="settings" 
              active={currentScreen === ScreenType.SETTINGS} 
              onClick={() => handleNavClick(ScreenType.SETTINGS)} 
            />
          </div>
        </aside>
      )}

      {/* 2. LEFT COLUMN (Chat List / Settings / Contacts / Discovery) */}
      <div className={`${isLargeScreen ? 'w-80 lg:w-96 border-r border-white/5' : (currentScreen === ScreenType.CHAT_LIST || currentScreen === ScreenType.SETTINGS || currentScreen === ScreenType.DISCOVERY || currentScreen === ScreenType.CONTACTS ? 'w-full' : 'hidden')} flex-shrink-0 bg-background-dark relative`}>
        {currentScreen === ScreenType.SETTINGS ? (
          <SettingsScreen onNavClick={handleNavClick} activeScreen={currentScreen} hideFooter={isLargeScreen} onLogout={handleLogout} />
        ) : currentScreen === ScreenType.DISCOVERY ? (
          <DiscoveryPlaceholder onBack={() => handleNavClick(ScreenType.CHAT_LIST)} onGoLive={() => setCurrentScreen(ScreenType.LIVE_STREAM)} />
        ) : currentScreen === ScreenType.CONTACTS ? (
          <ContactsScreen 
            onSelectContact={navigateToChat} 
            onBack={() => handleNavClick(ScreenType.CHAT_LIST)} 
            onNavClick={handleNavClick} 
            activeScreen={currentScreen} 
            hideFooter={isLargeScreen} 
          />
        ) : (
          <ChatListScreen
            onSelectChat={navigateToChat}
            onDiscovery={() => setCurrentScreen(ScreenType.DISCOVERY)}
            onNavClick={handleNavClick}
            activeScreen={currentScreen}
            hideFooter={isLargeScreen}
            selectedChatId={selectedChat?.id}
          />
        )}
      </div>

      {/* 3. MAIN AREA */}
      <main className={`flex-1 flex flex-col relative bg-background-dark ${!isLargeScreen && (currentScreen === ScreenType.CHAT_LIST || currentScreen === ScreenType.SETTINGS || currentScreen === ScreenType.DISCOVERY || currentScreen === ScreenType.CONTACTS) ? 'hidden' : 'flex'}`}>
        {currentScreen === ScreenType.CALLING && activeCall ? (
          <CallingScreen
            callType={activeCall.type}
            chat={activeCall.chat}
            isIncoming={activeCall.isIncoming}
            socket={socketRef.current}
            incomingOffer={incomingCallOffer}
            onEnd={() => {
              setActiveCall(null);
              setIncomingCallOffer(null);
              setCurrentScreen(isLargeScreen ? ScreenType.CHAT_LIST : ScreenType.CHAT_DETAIL);
            }}
          />
        ) : !selectedChat && isLargeScreen && currentScreen !== ScreenType.LIVE_STREAM ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-12 text-center">
            <div className="w-24 h-24 bg-surface-dark rounded-full flex items-center justify-center mb-6 border border-white/5">
              <span className="material-icons-round text-5xl text-primary/30">verified_user</span>
            </div>
            <h2 className="text-xl font-bold text-slate-300">bizbize Güvenliği Aktif</h2>
            <p className="max-w-xs mt-2 text-sm">Askeri düzeyde uçtan uca şifreleme (E2EE) etkindir. Sohbet başlatmak için bir kişi seçin veya Keşfet sekmesinden canlı yayın başlatın.</p>
          </div>
        ) : (
          <>
            {selectedChat && (currentScreen === ScreenType.CHAT_DETAIL || isLargeScreen) && currentScreen !== ScreenType.LIVE_STREAM && currentScreen !== ScreenType.ATTACHMENTS && (
              <ChatDetailScreen
                chat={selectedChat}
                initialMessages={globalMessages[selectedChat.id] || []}
                onUpdateMessages={(msgs) => setGlobalMessages(p => ({ ...p, [selectedChat.id]: msgs }))}
                onBack={() => isLargeScreen ? setSelectedChat(null) : setCurrentScreen(ScreenType.CHAT_LIST)}
                onOpenAttachments={() => setCurrentScreen(ScreenType.ATTACHMENTS)}
                onGoLive={() => setCurrentScreen(ScreenType.LIVE_STREAM)}
                onCall={(type) => startCall(type, selectedChat)}
                isLargeScreen={isLargeScreen}
              />
            )}

            {currentScreen === ScreenType.LIVE_STREAM && (
              <LiveStreamScreen 
                onClose={() => isLargeScreen ? setCurrentScreen(ScreenType.CHAT_LIST) : setCurrentScreen(ScreenType.CHAT_DETAIL)} 
                currentChatId={selectedChat ? [JSON.parse(localStorage.getItem('bizbize_profile') || '{}').uid, selectedChat.id].sort().join('_') : undefined}
                myUid={JSON.parse(localStorage.getItem('bizbize_profile') || '{}').uid}
                senderName={JSON.parse(localStorage.getItem('bizbize_profile') || '{}').name}
              />
            )}

            {currentScreen === ScreenType.ATTACHMENTS && selectedChat && (
              <AttachmentScreen
                onClose={() => setCurrentScreen(ScreenType.CHAT_DETAIL)}
                onSend={(msg) => {
                  handleSendMessage(selectedChat.id, msg);
                  setCurrentScreen(ScreenType.CHAT_DETAIL);
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

const NavRailButton: React.FC<{ icon: string; active: boolean; onClick: () => void }> = ({ icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
  >
    <span className="material-icons-round text-2xl">{icon}</span>
  </button>
);

const DiscoveryPlaceholder: React.FC<{ onBack: () => void, onGoLive: () => void }> = ({ onBack, onGoLive }) => (
  <div className="p-8 text-center h-full flex flex-col justify-center items-center bg-background-dark animate-in fade-in zoom-in-95 duration-300">
    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 border border-primary/20">
      <span className="material-icons-round text-5xl text-primary">explore</span>
    </div>
    <h2 className="text-2xl font-bold mb-2">Keşfet Portalı</h2>
    <p className="text-slate-400 mb-8 max-w-xs mx-auto text-sm leading-relaxed">Popüler genel yayınları ve doğrulanmış güvenlik kanallarını keşfedin.</p>
    <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
      <div onClick={onGoLive} className="bg-surface-dark p-5 rounded-2xl border border-white/5 flex items-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><span className="material-icons-round">campaign</span></div>
        <div className="text-left flex-1">
          <p className="font-bold text-sm">Genel Yayınlar</p>
          <p className="text-[10px] text-slate-500">Şu an 12 güvenli yayın aktif</p>
        </div>
        <span className="material-icons-round text-slate-600 text-lg group-hover:text-primary transition-colors">arrow_forward</span>
      </div>
      <div className="bg-surface-dark p-5 rounded-2xl border border-white/5 flex items-center gap-4 cursor-pointer hover:border-stitch-green/50 hover:bg-stitch-green/5 transition-all group">
        <div className="w-12 h-12 bg-stitch-green/20 rounded-xl flex items-center justify-center text-stitch-green group-hover:scale-110 transition-transform"><span className="material-icons-round">groups</span></div>
        <div className="text-left flex-1">
          <p className="font-bold text-sm">Güvenlik Merkezi</p>
          <p className="text-[10px] text-slate-500">Resmi geliştirici kanalı</p>
        </div>
        <span className="material-icons-round text-slate-600 text-lg group-hover:text-stitch-green transition-colors">arrow_forward</span>
      </div>
    </div>
    <button onClick={onBack} className="mt-10 text-slate-500 text-xs font-bold uppercase tracking-[0.2em] hover:text-white transition-colors">Sohbetlere Geri Dön</button>
  </div>
);

export default App;
