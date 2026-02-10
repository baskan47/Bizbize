
import React from 'react';
import { ScreenType } from '../types';

interface SettingsProps {
  onNavClick: (screen: ScreenType) => void;
  activeScreen: ScreenType;
  hideFooter?: boolean;
}

const SettingsScreen: React.FC<SettingsProps> = ({ onNavClick, activeScreen, hideFooter }) => {
  return (
    <div className="h-full flex flex-col pt-8 bg-background-dark">
      <header className="px-8 mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button className="text-primary text-sm font-bold bg-primary/10 px-4 py-2 rounded-xl">Edit Profile</button>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-6 space-y-8 pb-10">
        <div className="flex items-center gap-5 p-6 bg-surface-dark rounded-[2rem] border border-white/5 shadow-2xl">
          <div className="relative">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Me" className="w-20 h-20 rounded-full border-4 border-primary/20 shadow-xl" alt="Me" />
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-surface-dark shadow-lg">
              <span className="material-icons-round text-white text-[14px]">camera_alt</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">John Doe</h2>
            <p className="text-sm text-slate-400 font-medium">+1 (555) 000-1234</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-stitch-green font-bold bg-stitch-green/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Verified User</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <SectionTitle>Security & Privacy</SectionTitle>
          <div className="bg-surface-dark rounded-3xl overflow-hidden border border-white/5 shadow-xl">
            <SettingsItem icon="lock" label="Privacy Settings" detail="Strict" color="text-stitch-green" />
            <SettingsItem icon="fingerprint" label="Biometric Unlock" detail="FaceID On" />
            <SettingsItem icon="history" label="Auto-Delete History" detail="30 Days" />
            <SettingsItem icon="vpn_key" label="Secret Keys" detail="Managed" />
          </div>

          <SectionTitle>Preferences</SectionTitle>
          <div className="bg-surface-dark rounded-3xl overflow-hidden border border-white/5 shadow-xl">
            <SettingsItem icon="palette" label="App Theme" detail="Dark Nebula" />
            <SettingsItem icon="notifications_active" label="Push Notifications" detail="Summary" />
            <SettingsItem icon="language" label="Language" detail="Turkish" />
          </div>

          <SectionTitle>Account Actions</SectionTitle>
          <div className="bg-surface-dark rounded-3xl overflow-hidden border border-white/5 shadow-xl">
            <SettingsItem icon="devices" label="Linked Devices" detail="4 active" />
            <SettingsItem icon="cloud_download" label="Export My Data" />
            <SettingsItem icon="logout" label="Secure Sign Out" color="text-red-500" last />
          </div>
        </div>
      </main>

      {!hideFooter && (
        <footer className="h-20 bg-background-dark/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 pb-4">
          <NavButton icon="chat_bubble" label="Chats" active={activeScreen === ScreenType.CHAT_LIST} onClick={() => onNavClick(ScreenType.CHAT_LIST)} />
          <NavButton icon="explore" label="Discovery" active={activeScreen === ScreenType.DISCOVERY} onClick={() => onNavClick(ScreenType.DISCOVERY)} />
          <NavButton icon="people" label="Contacts" active={false} onClick={() => {}} />
          <NavButton icon="settings" label="Settings" active={activeScreen === ScreenType.SETTINGS} onClick={() => onNavClick(ScreenType.SETTINGS)} />
        </footer>
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
  <button onClick={onClick} className={`flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-primary' : 'text-slate-500'}`}>
    <span className="material-icons-round">{icon}</span>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export default SettingsScreen;
