
import React, { useState } from 'react';
import { ChatItem, ChatCategory, ScreenType } from '../types';

interface ChatListProps {
  onSelectChat: (chat: ChatItem) => void;
  onDiscovery: () => void;
  onNavClick: (screen: ScreenType) => void;
  activeScreen: ScreenType;
  hideFooter?: boolean;
  selectedChatId?: string;
}

const MOCK_CHATS: ChatItem[] = [
  { id: '1', name: 'Alex Rivera', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', lastMessage: 'Saat 8\'de görüşürüz, belgeleri unutma!', time: '12:45', unreadCount: 2, type: 'user', isOnline: true },
  { id: '2', name: 'Tasarım Ekibi 🚀', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Design', lastMessage: 'Caner: Yeni tasarımlar yüklendi...', time: '10:12', unreadCount: 0, type: 'group' },
  { id: '3', name: 'Haftalık Teknoloji', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=TN', lastMessage: 'Apple yeni işlemcisini duyurdu...', time: '09:30', unreadCount: 5, type: 'channel', isVerified: true },
  { id: '4', name: 'Sarah Jenkins', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', lastMessage: 'Toplantı ertelendi.', time: 'Dün', unreadCount: 0, type: 'user' },
  { id: '5', name: 'Marcus Aurelius', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus', lastMessage: 'Geri bildirim için teşekkürler!', time: 'Salı', unreadCount: 0, type: 'user' },
];

const ChatListScreen: React.FC<ChatListProps> = ({ onSelectChat, onDiscovery, onNavClick, activeScreen, hideFooter, selectedChatId }) => {
  const [activeTab, setActiveTab] = useState<ChatCategory>(ChatCategory.ALL);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = MOCK_CHATS.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (activeTab === ChatCategory.ALL) return true;
    if (activeTab === ChatCategory.GROUPS) return chat.type === 'group';
    if (activeTab === ChatCategory.CHANNELS) return chat.type === 'channel';
    return true;
  });

  return (
    <div className="h-full flex flex-col pt-6 border-r border-white/5 bg-background-dark">
      <header className="px-6 mb-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mesajlar</h1>
          <button onClick={() => onNavClick(ScreenType.CONTACTS)} className="text-primary material-icons-round bg-primary/10 p-2 rounded-xl hover:bg-primary/20 transition-colors">edit_note</button>
        </div>
        
        <div className="relative mb-6">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
          <input 
            type="text" 
            placeholder="Sohbetlerde ara"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-surface-dark border-none rounded-xl pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>

        <div className="flex justify-between relative border-b border-white/5">
          {[[ChatCategory.ALL, 'Tümü'], [ChatCategory.GROUPS, 'Gruplar'], [ChatCategory.CHANNELS, 'Kanallar']].map(([tab, label]) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as ChatCategory)}
              className={`flex-1 py-3 text-xs font-bold transition-colors relative ${activeTab === tab ? 'text-primary' : 'text-slate-500'}`}
            >
              {label}
              {activeTab === tab && <div className="absolute bottom-0 h-0.5 bg-primary rounded-full transition-all w-[33%] mx-auto" style={{ left: tab === ChatCategory.ALL ? '0%' : tab === ChatCategory.GROUPS ? '33.3%' : '66.6%' }}></div>}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-2">
        <div className="space-y-1">
          {filteredChats.map(chat => (
            <div 
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all ${selectedChatId === chat.id ? 'bg-primary/20 shadow-lg' : 'hover:bg-white/5'}`}
            >
              <div className="relative flex-shrink-0">
                <img src={chat.avatar} className="w-12 h-12 rounded-full border border-white/10 bg-slate-700" alt={chat.name} />
                {chat.isOnline && <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-stitch-green border-2 border-background-dark rounded-full"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className={`font-bold text-sm truncate flex items-center gap-1 ${selectedChatId === chat.id ? 'text-white' : 'text-slate-200'}`}>
                    {chat.name}
                    {chat.isVerified && <span className="material-icons-round text-primary text-[14px]">verified</span>}
                  </h3>
                  <span className="text-[10px] text-slate-500">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className="text-xs text-slate-400 truncate flex-1">{chat.lastMessage}</p>
                  {chat.unreadCount > 0 && (
                    <span className="bg-primary text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center animate-pulse">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {!hideFooter && (
        <footer className="h-20 bg-background-dark/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 pb-4">
          <NavButton icon="chat_bubble" label="Mesajlar" active={activeScreen === ScreenType.CHAT_LIST} onClick={() => onNavClick(ScreenType.CHAT_LIST)} />
          <NavButton icon="explore" label="Keşfet" active={activeScreen === ScreenType.DISCOVERY} onClick={() => onNavClick(ScreenType.DISCOVERY)} />
          <NavButton icon="people" label="Kişiler" active={activeScreen === ScreenType.CONTACTS} onClick={() => onNavClick(ScreenType.CONTACTS)} />
          <NavButton icon="settings" label="Ayarlar" active={activeScreen === ScreenType.SETTINGS} onClick={() => onNavClick(ScreenType.SETTINGS)} />
        </footer>
      )}
    </div>
  );
};

const NavButton: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
    <span className="material-icons-round">{icon}</span>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export default ChatListScreen;
