import React, { useState, useEffect } from 'react';
import { ChatItem, ScreenType } from '../types';

interface ContactsScreenProps {
  onSelectContact: (chat: ChatItem) => void;
  onBack: () => void;
  onNavClick: (screen: ScreenType) => void;
  activeScreen: ScreenType;
  hideFooter?: boolean;
}

const DEFAULT_CONTACTS: ChatItem[] = [
  { id: '1', name: 'Alex Rivera', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', lastMessage: 'Görüşmek üzere!', time: '12:45', unreadCount: 0, type: 'user', isOnline: true },
  { id: '4', name: 'Sarah Jenkins', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', lastMessage: 'Toplantı ertelendi.', time: 'Dün', unreadCount: 0, type: 'user', isOnline: false },
  { id: '5', name: 'Marcus Aurelius', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus', lastMessage: 'Geri bildirim için teşekkürler!', time: 'Salı', unreadCount: 0, type: 'user', isOnline: true },
  { id: 'contact-6', name: 'Ayşe Yılmaz', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse', lastMessage: 'Merhaba!', time: 'Çarşamba', unreadCount: 0, type: 'user', isOnline: true },
  { id: 'contact-7', name: 'Can Demir', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Can', lastMessage: 'Dosyayı gönderdim.', time: 'Pazartesi', unreadCount: 0, type: 'user', isOnline: false },
];

const ContactsScreen: React.FC<ContactsScreenProps> = ({ onSelectContact, onBack, onNavClick, activeScreen, hideFooter }) => {
  const [contacts, setContacts] = useState<ChatItem[]>(() => {
    const saved = localStorage.getItem('bizbize_contacts');
    return saved ? JSON.parse(saved) : DEFAULT_CONTACTS;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    localStorage.setItem('bizbize_contacts', JSON.stringify(contacts));
  }, [contacts]);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      setErrorMsg('Lütfen isim girin.');
      return;
    }

    const newContact: ChatItem = {
      id: `contact-${Math.random().toString(36).substr(2, 9)}`,
      name: newContactName.trim(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newContactName.trim())}`,
      lastMessage: 'Sohbeti başlatın...',
      time: 'Şimdi',
      unreadCount: 0,
      type: 'user',
      isOnline: Math.random() > 0.5
    };

    setContacts(prev => [newContact, ...prev]);
    setNewContactName('');
    setNewContactPhone('');
    setErrorMsg('');
    setShowAddModal(false);
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
            placeholder="Kişilerde ara"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-surface-dark border-none rounded-xl pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            Kişi bulunamadı.
          </div>
        ) : (
          filteredContacts.map(contact => (
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
                <p className="text-xs text-slate-500 font-medium">
                  {contact.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                </p>
              </div>
              <span className="material-icons-round text-slate-600 group-hover:text-primary transition-colors text-xl">
                chevron_right
              </span>
            </div>
          ))
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
              <h3 className="text-lg font-bold">Yeni Kişi Ekle</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Ad Soyad</label>
                <input 
                  type="text" 
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  className="w-full bg-background-dark border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Telefon Numarası (Opsiyonel)</label>
                <input 
                  type="tel" 
                  value={newContactPhone}
                  onChange={e => setNewContactPhone(e.target.value)}
                  placeholder="+90 (555) 000 0000"
                  className="w-full bg-background-dark border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              {errorMsg && <p className="text-xs text-red-500 font-bold">{errorMsg}</p>}
              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all mt-4"
              >
                Kişiyi Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsScreen;
