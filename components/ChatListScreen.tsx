
import React, { useState, useEffect } from 'react';
import { ChatItem, ChatCategory, ScreenType } from '../types';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';

interface ChatListProps {
  onSelectChat: (chat: ChatItem) => void;
  onDiscovery: () => void;
  onNavClick: (screen: ScreenType) => void;
  activeScreen: ScreenType;
  hideFooter?: boolean;
  selectedChatId?: string;
}

const ChatListScreen: React.FC<ChatListProps> = ({ onSelectChat, onDiscovery, onNavClick, activeScreen, hideFooter, selectedChatId }) => {
  const [activeTab, setActiveTab] = useState<ChatCategory>(ChatCategory.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<ChatItem[]>([]);

  // Group creation modal states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<ChatItem[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState('');

  // Load contacts whenever modal is shown or screen mounts
  useEffect(() => {
    const saved = localStorage.getItem('bizbize_contacts');
    setContacts(saved ? JSON.parse(saved) : []);
  }, [showCreateGroupModal]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setCreateGroupError('Lütfen geçerli bir grup ismi girin.');
      return;
    }
    if (selectedContactIds.length === 0) {
      setCreateGroupError('Lütfen grupta yer alacak en az bir arkadaşınızı seçin.');
      return;
    }

    setIsCreatingGroup(true);
    setCreateGroupError('');

    const groupId = `group-${Math.random().toString(36).substr(2, 9)}`;
    const myProfile = JSON.parse(localStorage.getItem('bizbize_profile') || '{}');
    const myUid = auth?.currentUser?.uid || myProfile.uid || 'me';
    const membersList = [myUid, ...selectedContactIds];
    const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName.trim())}`;
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedTimeIso = new Date().toISOString();

    if (db) {
      try {
        // 1. Create the central group entry
        await setDoc(doc(db, 'groups', groupId), {
          id: groupId,
          name: groupName.trim(),
          avatar: avatarUrl,
          type: 'group',
          members: membersList,
          createdAt: updatedTimeIso
        });

        // 2. Link it inside active_chats for all members
        for (const memberId of membersList) {
          await setDoc(doc(db, 'users', memberId, 'active_chats', groupId), {
            id: groupId,
            name: groupName.trim(),
            avatar: avatarUrl,
            type: 'group',
            lastMessage: 'Grup oluşturuldu',
            time: timestampStr,
            updatedAt: updatedTimeIso,
            members: membersList
          }, { merge: true });
        }

        setShowCreateGroupModal(false);
        setGroupName('');
        setSelectedContactIds([]);
      } catch (err: any) {
        console.error("Firestore group creation error:", err);
        setCreateGroupError('Grup oluşturulurken bir hata oluştu: ' + (err.message || err));
      } finally {
        setIsCreatingGroup(false);
      }
    } else {
      // Mock mode fallback
      const newGroup: ChatItem = {
        id: groupId,
        name: groupName.trim(),
        avatar: avatarUrl,
        lastMessage: 'Grup oluşturuldu',
        time: timestampStr,
        unreadCount: 0,
        type: 'group',
        members: membersList
      };

      const savedChats = localStorage.getItem('bizbize_active_chats');
      const currentChats: ChatItem[] = savedChats ? JSON.parse(savedChats) : [];
      const updated = [newGroup, ...currentChats];
      localStorage.setItem('bizbize_active_chats', JSON.stringify(updated));
      setChats(updated);

      setShowCreateGroupModal(false);
      setGroupName('');
      setSelectedContactIds([]);
      setIsCreatingGroup(false);
    }
  };

  useEffect(() => {
    const myUid = auth?.currentUser?.uid;
    if (!myUid || !db) {
      // Fallback to local storage
      const saved = localStorage.getItem('bizbize_active_chats');
      setChats(saved ? JSON.parse(saved) : []);
      return;
    }

    const q = query(
      collection(db, 'users', myUid, 'active_chats'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeList: ChatItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        activeList.push({
          id: doc.id,
          name: data.name || 'Gizli Sohbet',
          avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.id}`,
          lastMessage: data.lastMessage || '',
          time: data.time || '',
          unreadCount: 0,
          type: data.type || 'user',
          members: data.members || []
        });
      });
      setChats(activeList);
      localStorage.setItem('bizbize_active_chats', JSON.stringify(activeList));
    }, (err) => {
      console.error("Firestore aktif sohbet dinleme hatası:", err);
    });

    return () => unsubscribe();
  }, []);

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    
    if (activeTab === ChatCategory.ALL) return true;
    if (activeTab === ChatCategory.GROUPS) return chat.type === 'group';
    if (activeTab === ChatCategory.CHANNELS) return chat.type === 'channel';
    return true;
  });

  return (
    <>
      <div className="h-full flex flex-col pt-6 border-r border-white/5 bg-background-dark">
        <header className="px-6 mb-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Mesajlar</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowCreateGroupModal(true)} 
                title="Grup Oluştur"
                className="text-primary material-icons-round bg-primary/10 p-2 rounded-xl hover:bg-primary/20 transition-colors"
              >
                group_add
              </button>
              <button 
                onClick={() => onNavClick(ScreenType.CONTACTS)} 
                className="text-primary material-icons-round bg-primary/10 p-2 rounded-xl hover:bg-primary/20 transition-colors"
              >
                edit_note
              </button>
            </div>
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

        <main className="flex-1 overflow-y-auto custom-scrollbar px-2 flex flex-col">
          {filteredChats.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-8">
              <div className="w-16 h-16 bg-surface-dark rounded-full flex items-center justify-center mb-4 border border-white/5">
                <span className="material-icons-round text-3xl text-slate-600">chat_bubble_outline</span>
              </div>
              <p className="text-sm font-bold text-slate-400">Henüz Sohbet Yok</p>
              <p className="text-xs text-slate-500 max-w-[220px] mt-2 leading-relaxed">
                Kişiler sekmesinden diğer kayıtlı kullanıcıları arayıp sohbet başlatabilirsiniz.
              </p>
            </div>
          ) : (
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
          )}
        </main>

        {!hideFooter && (
          <footer className="h-20 bg-background-dark/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 pb-4">
            <NavButton icon="chat_bubble" label="Mesajlar" active={activeScreen === ScreenType.CHAT_LIST} onClick={() => onNavClick(ScreenType.CHAT_LIST)} />
            <NavButton icon="call" label="Aramalar" active={activeScreen === ScreenType.CALL_LOGS} onClick={() => onNavClick(ScreenType.CALL_LOGS)} />
            <NavButton icon="people" label="Kişiler" active={activeScreen === ScreenType.CONTACTS} onClick={() => onNavClick(ScreenType.CONTACTS)} />
            <NavButton icon="settings" label="Ayarlar" active={activeScreen === ScreenType.SETTINGS} onClick={() => onNavClick(ScreenType.SETTINGS)} />
          </footer>
        )}
      </div>
        
      {showCreateGroupModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-surface-dark/95 border border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-scale-in text-white">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold">Yeni Grup Oluştur</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Katılımcı seçin ve isim verin</p>
              </div>
              <button onClick={() => { setShowCreateGroupModal(false); setGroupName(''); setSelectedContactIds([]); setCreateGroupError(''); }} className="text-slate-500 hover:text-white p-1 hover:bg-white/5 rounded-full transition-all">
                <span className="material-icons-round">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Grup Adı</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="Grup ismi girin..."
                  className="w-full bg-background-dark/80 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Arkadaşlar Seç ({selectedContactIds.length})</label>
                {contacts.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">Henüz ekli arkadaşınız bulunmuyor.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                    {contacts.map(contact => {
                      const isSelected = selectedContactIds.includes(contact.id);
                      return (
                        <div 
                          key={contact.id}
                          onClick={() => {
                            setSelectedContactIds(prev => 
                              isSelected 
                                ? prev.filter(id => id !== contact.id) 
                                : [...prev, contact.id]
                            );
                          }}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                        >
                          <img src={contact.avatar} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                          <span className="text-xs font-semibold flex-1 truncate">{contact.name}</span>
                          <span className={`material-icons-round text-sm ${isSelected ? 'text-primary' : 'text-slate-500'}`}>
                            {isSelected ? 'check_box' : 'check_box_outline_blank'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {createGroupError && <p className="text-xs text-red-500 font-bold">{createGroupError}</p>}

              <button 
                onClick={handleCreateGroup}
                disabled={isCreatingGroup || !groupName.trim() || selectedContactIds.length === 0}
                className="w-full bg-primary hover:bg-primary/95 disabled:bg-slate-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                {isCreatingGroup ? 'Oluşturuluyor...' : 'Grup Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const NavButton: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
    <span className="material-icons-round">{icon}</span>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export default ChatListScreen;
