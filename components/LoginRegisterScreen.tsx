import React, { useState } from 'react';
import { auth, db, hasFirebaseConfig } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface LoginRegisterScreenProps {
  onLoginSuccess: (profile: { name: string; phone: string; status: string; avatarSeed: string }) => void;
}

const LoginRegisterScreen: React.FC<LoginRegisterScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'credentials' | 'profile'>('credentials');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [statusText, setStatusText] = useState('bizbize ile güvende');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    if (hasFirebaseConfig && auth) {
      // ─── Real Firebase Email & Password Auth ───
      try {
        if (mode === 'register') {
          await createUserWithEmailAndPassword(auth, email.trim(), password);
          setIsLoading(false);
          setStep('profile');
        } else {
          const result = await signInWithEmailAndPassword(auth, email.trim(), password);
          let profile = {
            name: email.split('@')[0],
            phone: email.trim(),
            status: statusText.trim(),
            avatarSeed: email.split('@')[0],
            userId: '@' + email.split('@')[0].toLowerCase()
          };

          if (db) {
            try {
              const docSnap = await getDoc(doc(db, 'users', result.user.uid));
              if (docSnap.exists()) {
                const data = docSnap.data();
                profile = {
                  name: data.name || profile.name,
                  phone: data.phone || profile.phone,
                  status: data.status || profile.status,
                  avatarSeed: data.avatarSeed || profile.avatarSeed,
                  userId: data.userId || profile.userId
                };
              } else {
                // Create profile in Firestore if it doesn't exist to make sure they are searchable
                await setDoc(doc(db, 'users', result.user.uid), {
                  ...profile,
                  uid: result.user.uid,
                  createdAt: new Date().toISOString()
                });
              }
            } catch (err) {
              console.error("Firestore profil yükleme hatası:", err);
            }
          }
          setIsLoading(false);
          onLoginSuccess(profile);
        }
      } catch (err: any) {
        console.error("Firebase Auth Hatası:", err);
        setIsLoading(false);
        if (err.code === 'auth/user-not-found') {
          setErrorMsg('Kullanıcı bulunamadı. Lütfen kaydolun.');
        } else if (err.code === 'auth/wrong-password') {
          setErrorMsg('Hatalı şifre. Lütfen tekrar deneyin.');
        } else if (err.code === 'auth/email-already-in-use') {
          setErrorMsg('Bu e-posta adresi zaten kullanımda.');
        } else if (err.code === 'auth/weak-password') {
          setErrorMsg('Şifre en az 6 karakter olmalıdır.');
        } else if (err.code === 'auth/invalid-email') {
          setErrorMsg('Geçersiz e-posta formatı.');
        } else {
          setErrorMsg(`Giriş başarısız: ${err.message || 'Bilinmeyen Hata'}`);
        }
      }
    } else {
      // ─── Mock Fallback Flow (No Firebase Keys configured yet) ───
      setTimeout(() => {
        setIsLoading(false);
        if (mode === 'register') {
          setStep('profile');
        } else {
          onLoginSuccess({
            name: email.split('@')[0],
            phone: email.trim(),
            status: statusText.trim(),
            avatarSeed: email.split('@')[0]
          });
        }
      }, 1200);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Lütfen adınızı girin.');
      return;
    }
    
    setIsLoading(true);
    const profile = {
      name: name.trim(),
      phone: email.trim(),
      status: statusText.trim(),
      avatarSeed: name.trim(),
      userId: userId.trim().toLowerCase()
    };

    if (hasFirebaseConfig && db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          ...profile,
          uid: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Firestore profil kaydetme hatası:", err);
      }
    }

    setIsLoading(false);
    onLoginSuccess(profile);
  };

  return (
    <div className="h-screen w-screen bg-[#090f12] flex items-center justify-center p-6 relative overflow-hidden font-sans text-white">
      {/* Background Glows */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_center,rgba(0,136,204,0.25)_0%,transparent_70%)]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_center,rgba(0,237,100,0.15)_0%,transparent_70%)]"></div>
      </div>

      <div className="w-full max-w-md bg-surface-dark/60 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 animate-slide-up">
        {/* Logo and App Name */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4 animate-bounce">
            <span className="material-icons-round text-white text-3xl">bolt</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">bizbize</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Uçtan Uca Güvenli Sohbet</p>
        </div>

        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-bold font-sans">
                {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login' 
                  ? 'Sohbetlerinize erişmek için bilgilerinizi girin.' 
                  : 'Yeni bir güvenli hesap oluşturun.'}
              </p>
              {!hasFirebaseConfig && (
                <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 text-[10px] text-yellow-500 font-medium">
                  ⚠️ Çevrimdışı test modunda çalışıyor.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">E-posta Adresi</label>
                <div className="flex items-center bg-background-dark border border-white/5 rounded-2xl px-4 py-3 group focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                  <span className="material-icons-round text-slate-500 mr-2 text-lg">email</span>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ornek@bizbize.com"
                    className="bg-transparent border-none outline-none flex-1 text-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Şifre</label>
                <div className="flex items-center bg-background-dark border border-white/5 rounded-2xl px-4 py-3 group focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                  <span className="material-icons-round text-slate-500 mr-2 text-lg">lock</span>
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="bg-transparent border-none outline-none flex-1 text-white text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {errorMsg && <p className="text-xs text-red-500 font-bold text-center">{errorMsg}</p>}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="material-icons-round spin-slow text-xl">sync</span>
                  <span>İşlem Yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Giriş Yap' : 'Kaydol'}</span>
                  <span className="material-icons-round font-bold">arrow_forward</span>
                </>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setErrorMsg('');
                }}
                className="text-xs text-primary font-bold hover:underline"
              >
                {mode === 'login' ? 'Yeni hesap oluştur' : 'Zaten hesabım var, giriş yap'}
              </button>
            </div>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-bold">Profilini Kur</h2>
              <p className="text-xs text-slate-400 mt-1">Güvenli ağda görünecek bilgilerinizi belirleyin.</p>
            </div>

            <div className="flex justify-center mb-4">
              <div className="relative">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'bizbize')}`} 
                  className="w-24 h-24 rounded-full border-4 border-primary/20 shadow-xl bg-slate-700" 
                  alt="Profil" 
                />
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-surface-dark shadow-lg">
                  <span className="material-icons-round text-white text-[14px]">auto_awesome</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Ad Soyad</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Can Demir"
                  className="w-full bg-background-dark border border-white/5 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Kullanıcı ID (örn: @can123)</label>
                <input 
                  type="text" 
                  value={userId}
                  onChange={e => setUserId(e.target.value.startsWith('@') ? e.target.value : '@' + e.target.value)}
                  placeholder="@kullanici"
                  className="w-full bg-background-dark border border-white/5 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Durum / Biyografi</label>
                <input 
                  type="text" 
                  value={statusText}
                  onChange={e => setStatusText(e.target.value)}
                  placeholder="bizbize ile güvende"
                  className="w-full bg-background-dark border border-white/5 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
            </div>

            {errorMsg && <p className="text-xs text-red-500 font-bold">{errorMsg}</p>}

            <button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
            >
              Uygulamaya Giriş Yap
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginRegisterScreen;
