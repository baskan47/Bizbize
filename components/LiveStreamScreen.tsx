
import React, { useState, useRef, useEffect } from 'react';

interface LiveStreamProps {
  onClose: () => void;
}

const LiveStreamScreen: React.FC<LiveStreamProps> = ({ onClose }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startScreenCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setIsSharing(true);
    } catch (err) {
      console.error("Screen capture failed:", err);
    }
  };

  const stopScreenCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsSharing(false);
  };

  const copyInviteLink = () => {
    const roomId = Math.random().toString(36).substr(2, 9).toUpperCase();
    navigator.clipboard.writeText(`https://stitch.secure/room/${roomId}`);
    alert("Invite link copied to clipboard!");
  };

  return (
    <div className="h-full bg-black relative flex flex-col overflow-hidden">
      {/* Dynamic Video Feed */}
      <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
        {isSharing ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="text-center">
            <span className="material-icons-round text-primary text-6xl animate-pulse mb-4">sensors</span>
            <h2 className="text-xl font-bold">Ready to Broadcast</h2>
            <p className="text-slate-500 text-xs">Waiting for stream initiation</p>
          </div>
        )}
      </div>

      <header className="relative z-20 px-6 pt-6 flex justify-between items-start">
        <div className="flex gap-3">
          <div className="bg-red-600 px-3 py-1 rounded flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase">Live</span>
          </div>
        </div>
        <button onClick={onClose} className="bg-black/40 p-2 rounded-full border border-white/5"><span className="material-icons-round">close</span></button>
      </header>

      <footer className="absolute bottom-10 left-6 right-6 z-30">
        <div className="bg-surface-dark/90 backdrop-blur-2xl rounded-3xl p-6 flex items-center justify-between border border-white/10 shadow-2xl">
          <button onClick={copyInviteLink} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-active:scale-90 transition-all">
              <span className="material-icons-round text-slate-400">person_add</span>
            </div>
            <span className="text-[8px] font-bold uppercase text-slate-500">Invite</span>
          </button>

          <button 
            onClick={isSharing ? stopScreenCapture : startScreenCapture}
            className={`w-20 h-20 -mt-16 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 ${isSharing ? 'bg-red-500 text-white' : 'bg-primary text-white pulse-glow'}`}
          >
            <span className="material-icons-round text-3xl">{isSharing ? 'stop' : 'screen_share'}</span>
            <span className="text-[9px] font-bold uppercase mt-1">{isSharing ? 'Stop' : 'Share'}</span>
          </button>

          <button onClick={onClose} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
              <span className="material-icons-round">call_end</span>
            </div>
            <span className="text-[8px] font-bold uppercase text-red-500">End</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LiveStreamScreen;
