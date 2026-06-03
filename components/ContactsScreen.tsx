import React, { useState, useEffect } from 'react';
import { ChatItem, ScreenType } from '../types';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

interface ContactsScreenProps {
  onSelectContact: (chat: ChatItem) => void;
  onBack: () => void;
  onNavClick: (screen: ScreenType) => void;
  activeScreen: ScreenType;
  hideFooter?: boolean;
}

const ContactsScreen: React.FC<ContactsScreenProps> = ({ onSelectContact, onBack, onNavClick, activeScreen, hideFooter }) => {
  const [contacts, setContacts] = useState<ChatItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch registered users dynamically from Firestore
  const fetchUsers = async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const q = collection(db, 'users');
      const querySnapshot = await getDocs(q);
      const userList: ChatItem[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Exclude the current logged-in user
        if (auth?.currentUser && doc.id === auth.currentUser.uid) {
          return;
        }
        userList.push({
          id: doc.id,
          name: data.name || 'İsimsiz Kullanıcı',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name || doc.id)}`,
          lastMessage: data.status || 'bizbize ile güvende',
          time: '',
          unreadCount: 0,
          type: 'user',
          isOnline: true // Treat as online or customize
        });
      });
      setContacts(userList);
    } catch (err) {
      console.error("Kişiler yüklenirken hata:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.lastMessage && contact.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactEmail.trim() || !newContactName.trim()) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    // When adding a contact, if we have firebase config, we can check if they exist or register them locally
    const customContactId = `contact-${Math.random().toString(36).substr(2, 9)}`;
    const newContact: ChatItem = {
      id: customContactId,
      name: newContactName.trim(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newContactName.trim())}`,
      lastMessage: 'Sohbeti başlatın...',
      time: 'Şimdi',
      unreadCount: 0,
      type: 'user',
      isOnline: true
    };

    setContacts(prev => [newContact, ...prev]);
    setNewContactName('');
    setNewContactEmail('');
    setShowAddModal(false);
    setIsLoading(false);
  };

  return (
    <div className="h-full flex flex-col pt-6 bg-background-dark text-white animate-slide-in-right">
      <header className="px-6 mb-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-primary material-icons-round p-1 hover:bg-white/5 rounded-full mr-1">
              arrow_back
            </button>
            <h1 className="text-2xl font-bold">Kişiler</h1>
          </div>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="text-primary material-icons-round bg-primary/10 p-2 rounded-xl hover:bg-primary/20 transition-colors"
          >
            person_add
          </button>
        </div>

        <div className="relative mb-4">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
          <input 
            type="text" 
            placeholder="Kullanıcı adı veya durum ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-surface-dark border-none rounded-xl pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-2 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
            <span className="material-icons-round spin-slow text-3xl text-primary">sync</span>
            <span className="text-xs">Kişiler yükleniyor...</span>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-8">
            <div className="w-16 h-16 bg-surface-dark rounded-full flex items-center justify-center mb-4 border border-white/5">
              <span className="material-icons-round text-3xl text-slate-600">people_outline</span>
            </div>
            <p className="text-sm font-bold text-slate-400">Henüz Kayıtlı Kullanıcı Yok</p>
            <p className="text-xs text-slate-500 max-w-[220px] mt-2 leading-relaxed">
              Farklı bir cihaz veya tarayıcıdan yeni bir hesap oluşturulduğunda burada görünecektir.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredContacts.map(contact => (
              <div 
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:bg-white/5 transition-all group"
              >
                <div className="relative flex-shrink-0">
                  <img src={contact.avatar} className="w-12 h-12 rounded-full border border-white/10 bg-slate-700" alt={contact.name} />
                  {contact.isOnline && (
                    <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-stitch-green border-2 border-background-dark rounded-full pulse-green"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-slate-200 truncate group-hover:text-white transition-colors">
                    {contact.name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-[180px]">
                    {contact.lastMessage || 'bizbize ile güvende'}
                  </p>
                </div>
                <span className="material-icons-round text-slate-600 group-hover:text-primary transition-colors text-xl">
                  chevron_right
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {!hideFooter && (
        <footer className="h-20 bg-background-dark/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 pb-4">
          <button onClick={() => onNavClick(ScreenType.CHAT_LIST)} className="flex flex-col items-center gap-0.5 text-slate-500">
            <span className="material-icons-round">chat_bubble</span>
            <span className="text-[10px] font-bold">Mesajlar</span>
          </button>
          <button onClick={() => onNavClick(ScreenType.DISCOVERY)} className="flex flex-col items-center gap-0.5 text-slate-500">
            <span className="material-icons-round">explore</span>
            <span className="text-[10px] font-bold">Keşfet</span>
          </button>
          <button onClick={() => onNavClick(ScreenType.CONTACTS)} className="flex flex-col items-center gap-0.5 text-primary">
            <span className="material-icons-round">people</span>
            <span className="text-[10px] font-bold">Kişiler</span>
          </button>
          <button onClick={() => onNavClick(ScreenType.SETTINGS)} className="flex flex-col items-center gap-0.5 text-slate-500">
            <span className="material-icons-round">settings</span>
            <span className="text-[10px] font-bold">Ayarlar</span>
          </button>
        </footer>
      )}

      {showAddModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface-dark rounded-[2rem] p-8 max-w-sm w-full border border-white/10 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Yeni Sohbet Başlat</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Kullanıcı Adı</label>
                <input 
                  type="text" 
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  placeholder="Can Demir"
                  className="w-full bg-background-dark border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">E-posta</label>
                <input 
                  type="email" 
                  value={newContactEmail}
                  onChange={e => setNewContactEmail(e.target.value)}
                  placeholder="can@bizbize.com"
                  className="w-full bg-background-dark border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>
              {errorMsg && <p className="text-xs text-red-500 font-bold">{errorMsg}</p>}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all mt-4 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Ekleniyor...' : 'Sohbet Başlat'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsScreen;
