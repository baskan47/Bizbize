import React, { useState, useEffect } from 'react';
import { ScreenType } from '../types';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface SettingsProps {
  onNavClick: (screen: ScreenType) => void;
  activeScreen: ScreenType;
  hideFooter?: boolean;
  onLogout?: () => void;
}

interface UserProfile {
  name: string;
  phone: string;
  avatarSeed: string;
  status: string;
  userId?: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'John Doe',
  phone: '+90 (555) 123 4567',
  avatarSeed: 'John',
  status: 'bizbize ile güvende',
  userId: '@johndoe'
};

const SettingsScreen: React.FC<SettingsProps> = ({ onNavClick, activeScreen, hideFooter, onLogout }) => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('bizbize_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editStatus, setEditStatus] = useState(profile.status);
  const [editUserId, setEditUserId] = useState(profile.userId || '@');

  useEffect(() => {
    localStorage.setItem('bizbize_profile', JSON.stringify(profile));
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile = {
      name: editName.trim(),
      phone: editPhone.trim(),
      status: editStatus.trim(),
      avatarSeed: editName.trim(),
      userId: editUserId.trim().toLowerCase()
    };

    setProfile(updatedProfile);

    // Save to Firestore so other users can search by the new User ID
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          ...updatedProfile,
          uid: auth.currentUser.uid,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Firestore profil güncelleme hatası:", err);
      }
    }

    setShowEditModal(false);
  };

  const handleSignOut = () => {
    if (confirm("Güvenli oturumu kapatmak istediğinize emin misiniz? Tüm geçici anahtarlarınız silinecektir.")) {
      localStorage.removeItem('bizbize_profile');
      setProfile(DEFAULT_PROFILE);
      alert("Güvenli oturum kapatıldı.");
      if (onLogout) {
        onLogout();
      }
    }
  };

  return (
    <div className="h-full flex flex-col pt-8 bg-background-dark text-white">
      <header className="px-8 mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <button 
          onClick={() => {
            setEditName(profile.name);
            setEditPhone(profile.phone);
            setEditStatus(profile.status);
            setEditUserId(profile.userId || '@');
            setShowEditModal(true);
          }} 
          className="text-primary text-sm font-bold bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors"
        >
          Profili Düzenle
        </button>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-6 space-y-8 pb-10">
        <div className="flex items-center gap-5 p-6 bg-surface-dark rounded-[2rem] border border-white/5 shadow-2xl">
          <div className="relative">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.avatarSeed)}`} className="w-20 h-20 rounded-full border-4 border-primary/20 shadow-xl bg-slate-700" alt="Profilim" />
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-surface-dark shadow-lg">
              <span className="material-icons-round text-white text-[14px]">verified</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile.name}</h2>
            <div className="flex flex-col mt-0.5">
              <span className="text-xs font-mono text-primary font-bold">{profile.userId || '@isimsiz'}</span>
              <span className="text-xs text-slate-400 font-medium">{profile.phone}</span>
            </div>
            <p className="text-xs text-slate-500 italic mt-1">{profile.status}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-stitch-green font-bold bg-stitch-green/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Doğrulanmış Hesap</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <SectionTitle>Güvenlik & Gizlilik</SectionTitle>
          <div className="bg-surface-dark rounded-3xl overflow-hidden border border-white/5 shadow-xl">
            <SettingsItem icon="lock" label="Gizlilik Ayarları" detail="Sıkı" color="text-stitch-green" />
            <SettingsItem icon="fingerprint" label="Biyometrik Kilit" detail="Yüz Tanıma Açık" />
            <SettingsItem icon="history" label="Sohbeti Otomatik Sil" detail="30 Gün" />
            <SettingsItem icon="vpn_key" label="Güvenlik Anahtarlarım" detail="Yönetiliyor" />
          </div>

          <SectionTitle>Tercihler</SectionTitle>
          <div className="bg-surface-dark rounded-3xl overflow-hidden border border-white/5 shadow-xl">
            <SettingsItem icon="palette" label="Uygulama Teması" detail="Karanlık Nebula" />
            <SettingsItem icon="notifications_active" label="Bildirim Ayarları" detail="Özetler Açık" />
            <SettingsItem icon="language" label="Dil / Language" detail="Türkçe" />
          </div>

          <SectionTitle>Hesap İşlemleri</SectionTitle>
          <div className="bg-surface-dark rounded-3xl overflow-hidden border border-white/5 shadow-xl">
            <SettingsItem icon="devices" label="Bağlı Cihazlar" detail="4 Aktif" />
            <SettingsItem icon="cloud_download" label="Verilerimi Dışa Aktar" />
            <div onClick={handleSignOut}>
              <SettingsItem icon="logout" label="Güvenli Çıkış Yap" color="text-red-500" last />
            </div>
          </div>
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

      {showEditModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface-dark rounded-[2rem] p-8 max-w-sm w-full border border-white/10 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Profili Düzenle</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-white">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Ad Soyad</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-background-dark border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Telefon Numarası</label>
                <input 
                  type="tel" 
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full bg-background-dark border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Kullanıcı ID (örn: @can123)</label>
                <input 
                  type="text" 
                  value={editUserId}
                  onChange={e => setEditUserId(e.target.value.startsWith('@') ? e.target.value : '@' + e.target.value)}
                  className="w-full bg-background-dark border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Durum Mesajı</label>
                <input 
                  type="text" 
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full bg-background-dark border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all mt-4"
              >
                Değişiklikleri Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4">{children}</h3>
);

const SettingsItem: React.FC<{ icon: string; label: string; detail?: string; color?: string; last?: boolean }> = ({ icon, label, detail, color = "text-slate-200", last }) => (
  <div className={`flex items-center justify-between p-5 hover:bg-white/5 cursor-pointer transition-all active:bg-white/10 ${!last && 'border-b border-white/5'}`}>
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color === 'text-red-500' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
        <span className="material-icons-round text-[22px]">{icon}</span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {detail && <span className="text-xs text-slate-500 font-bold bg-white/5 px-2 py-1 rounded-lg">{detail}</span>}
      <span className="material-icons-round text-slate-600 text-[18px]">chevron_right</span>
    </div>
  </div>
);

const NavButton: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
    <span className="material-icons-round">{icon}</span>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export default SettingsScreen;
