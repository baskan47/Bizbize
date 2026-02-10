
import React, { useState } from 'react';
import { Message, PollData } from '../types';

interface AttachmentProps {
  onClose: () => void;
  onSend: (msg: Message) => void;
}

const AttachmentScreen: React.FC<AttachmentProps> = ({ onClose, onSend }) => {
  const [zipActive, setZipActive] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const handleSendFile = () => {
    const fileMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: 'me',
      type: 'file',
      fileName: zipActive ? 'Project_Backup.zip' : 'Security_Audit.pdf',
      isZipped: zipActive,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: 'sent'
    };
    onSend(fileMsg);
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
      {!showPollCreator ? (
        <div className="bg-surface-dark rounded-t-[2.5rem] p-8 space-y-8 animate-slide-up relative border-t border-white/10">
          <button onClick={onClose} className="absolute right-6 top-6 text-slate-500"><span className="material-icons-round">close</span></button>
          <h2 className="text-xl font-bold">Attachment</h2>
          <div className="grid grid-cols-3 gap-6">
            <div onClick={handleSendFile} className="flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-all">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-white/5"><span className="material-icons-round text-3xl">image</span></div>
              <span className="text-xs text-slate-400">Gallery</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border transition-all ${zipActive ? 'bg-stitch-green/20 border-stitch-green/50' : 'bg-primary/20 border-white/5'}`}>
                <span className={`material-icons-round text-2xl ${zipActive ? 'text-stitch-green' : 'text-primary'}`}>description</span>
                <button onClick={() => setZipActive(!zipActive)} className={`w-6 h-3.5 rounded-full relative mt-1 ${zipActive ? 'bg-stitch-green' : 'bg-slate-700'}`}>
                  <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${zipActive ? 'left-3' : 'left-0.5'}`}></div>
                </button>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Secure Zip</span>
            </div>
            <div onClick={() => setShowPollCreator(true)} className="flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-all">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-white/5"><span className="material-icons-round text-3xl">poll</span></div>
              <span className="text-xs text-slate-400">Polls</span>
            </div>
          </div>
          <button onClick={handleSendFile} className="w-full bg-primary py-4 rounded-2xl text-white font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3">
            <span>Send Selected</span><span className="material-icons-round">send</span>
          </button>
        </div>
      ) : (
        <div className="absolute inset-0 bg-background-dark p-6 z-50 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => setShowPollCreator(false)} className="text-primary font-bold">Cancel</button>
            <h3 className="text-lg font-bold">New Poll</h3>
            <button onClick={handleCreatePoll} className={`font-bold transition-opacity ${pollQuestion ? 'text-primary' : 'text-slate-700'}`}>Create</button>
          </div>
          <div className="space-y-6">
            <input 
              autoFocus placeholder="Poll Question" 
              value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
              className="w-full bg-transparent border-b border-white/10 py-3 text-xl outline-none focus:border-primary"
            />
            <div className="space-y-3">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-3 bg-surface-dark p-3 rounded-xl border border-white/5">
                  <span className="material-icons-round text-slate-600">radio_button_unchecked</span>
                  <input 
                    placeholder={`Option ${i+1}`} value={opt} onChange={e => {
                      const newOpts = [...pollOptions]; newOpts[i] = e.target.value; setPollOptions(newOpts);
                    }}
                    className="bg-transparent border-none outline-none flex-1 text-sm"
                  />
                </div>
              ))}
              <button 
                onClick={() => setPollOptions([...pollOptions, ''])}
                className="text-primary text-xs font-bold flex items-center gap-1 p-2"
              ><span className="material-icons-round text-sm">add</span> Add Option</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentScreen;
