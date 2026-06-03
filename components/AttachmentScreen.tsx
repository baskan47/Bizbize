import React, { useState } from 'react';
import { Message, PollData } from '../types';

interface AttachmentProps {
  onClose: () => void;
  onSend: (msg: Message) => void;
}

const MOCK_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80', name: 'Soyut Sanat' },
  { url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500&q=80', name: 'Renk Gradyanı' },
  { url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=500&q=80', name: 'Kozmik Uzay' }
];

const AttachmentScreen: React.FC<AttachmentProps> = ({ onClose, onSend }) => {
  const [zipActive, setZipActive] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const handleSendFile = () => {
    const fileMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: 'me',
      type: 'file',
      fileName: zipActive ? 'Proje_Yedegi.zip' : 'Güvenlik_Raporu.pdf',
      isZipped: zipActive,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: 'sent'
    };
    onSend(fileMsg);
  };

  const handleSendImage = () => {
    if (!selectedImage) return;
    const imgMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: 'me',
      type: 'image',
      imageUrl: selectedImage,
      imageCaption: imageCaption.trim() || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: 'sent'
    };
    onSend(imgMsg);
  };

  const handleCreatePoll = () => {
    if (!pollQuestion.trim()) return;
    const pollData: PollData = {
      question: pollQuestion,
      options: pollOptions.filter(o => o.trim()).map(o => ({ id: Math.random().toString(), text: o, votes: 0 })),
      isAnonymous: true
    };
    const pollMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: 'me',
      type: 'poll',
      poll: pollData,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: 'sent'
    };
    onSend(pollMsg);
  };

  return (
    <div className="h-full bg-black/40 backdrop-blur-md flex flex-col justify-end">
      {!showPollCreator && !showImageSelector ? (
        <div className="bg-surface-dark rounded-t-[2.5rem] p-8 space-y-8 animate-slide-up relative border-t border-white/10">
          <button onClick={onClose} className="absolute right-6 top-6 text-slate-500 hover:text-white transition-colors">
            <span className="material-icons-round">close</span>
          </button>
          <h2 className="text-xl font-bold">Ek Gönder</h2>
          <div className="grid grid-cols-3 gap-6">
            <div onClick={() => setShowImageSelector(true)} className="flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-all group">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-white/5 group-hover:bg-primary/30 group-hover:border-primary/30 transition-all">
                <span className="material-icons-round text-3xl">image</span>
              </div>
              <span className="text-xs text-slate-400">Galeri</span>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border transition-all ${zipActive ? 'bg-stitch-green/20 border-stitch-green/50' : 'bg-primary/20 border-white/5'}`}>
                <span className={`material-icons-round text-2xl ${zipActive ? 'text-stitch-green' : 'text-primary'}`}>description</span>
                <button onClick={() => setZipActive(!zipActive)} className={`w-6 h-3.5 rounded-full relative mt-1 ${zipActive ? 'bg-stitch-green' : 'bg-slate-700'}`}>
                  <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${zipActive ? 'left-3' : 'left-0.5'}`}></div>
                </button>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Güvenli Zip</span>
            </div>

            <div onClick={() => setShowPollCreator(true)} className="flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-all group">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-white/5 group-hover:bg-primary/30 group-hover:border-primary/30 transition-all">
                <span className="material-icons-round text-3xl">poll</span>
              </div>
              <span className="text-xs text-slate-400">Anket</span>
            </div>
          </div>
          <button onClick={handleSendFile} className="w-full bg-primary py-4 rounded-2xl text-white font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-primary/95">
            <span>Dosyayı Gönder</span><span className="material-icons-round">send</span>
          </button>
        </div>
      ) : showImageSelector ? (
        <div className="absolute inset-0 bg-background-dark p-6 z-50 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setShowImageSelector(false)} className="text-primary font-bold">Vazgeç</button>
              <h3 className="text-lg font-bold">Görsel Seç</h3>
              <button 
                onClick={handleSendImage} 
                disabled={!selectedImage} 
                className={`font-bold transition-opacity ${selectedImage ? 'text-primary' : 'text-slate-700'}`}
              >
                Gönder
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              {MOCK_IMAGES.map((img, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedImage(img.url)}
                  className={`relative rounded-xl overflow-hidden cursor-pointer h-24 border-2 transition-all ${selectedImage === img.url ? 'border-primary scale-95 shadow-lg shadow-primary/20' : 'border-transparent hover:scale-95'}`}
                >
                  <img src={img.url} className="w-full h-full object-cover" alt={img.name} />
                  {selectedImage === img.url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <span className="material-icons-round text-white bg-primary rounded-full p-0.5 text-sm">check</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedImage && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase">Açıklama Ekle</label>
                <input 
                  type="text" 
                  value={imageCaption}
                  onChange={e => setImageCaption(e.target.value)}
                  placeholder="Görsel hakkında bir şeyler yazın..."
                  className="w-full bg-surface-dark border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            )}
          </div>
          
          {selectedImage && (
            <button 
              onClick={handleSendImage}
              className="w-full bg-primary py-4 rounded-xl font-bold shadow-xl shadow-primary/20 hover:bg-primary/95 active:scale-95 transition-all mb-4"
            >
              Görseli Gönder
            </button>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 bg-background-dark p-6 z-50 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => setShowPollCreator(false)} className="text-primary font-bold">Vazgeç</button>
            <h3 className="text-lg font-bold">Yeni Anket</h3>
            <button onClick={handleCreatePoll} className={`font-bold transition-opacity ${pollQuestion.trim() ? 'text-primary' : 'text-slate-700'}`}>Oluştur</button>
          </div>
          <div className="space-y-6">
            <input 
              autoFocus placeholder="Anket Sorusu" 
              value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
              className="w-full bg-transparent border-b border-white/10 py-3 text-xl outline-none focus:border-primary"
            />
            <div className="space-y-3">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-3 bg-surface-dark p-3 rounded-xl border border-white/5">
                  <span className="material-icons-round text-slate-600">radio_button_unchecked</span>
                  <input 
                    placeholder={`Seçenek ${i+1}`} value={opt} onChange={e => {
                      const newOpts = [...pollOptions]; newOpts[i] = e.target.value; setPollOptions(newOpts);
                    }}
                    className="bg-transparent border-none outline-none flex-1 text-sm text-white"
                  />
                </div>
              ))}
              <button 
                onClick={() => setPollOptions([...pollOptions, ''])}
                className="text-primary text-xs font-bold flex items-center gap-1 p-2 hover:bg-primary/5 rounded-lg transition-colors"
              ><span className="material-icons-round text-sm">add</span> Seçenek Ekle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentScreen;
