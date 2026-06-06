import React, { useState, useEffect, useRef } from 'react';
import { ChatItem, CallType } from '../types';

interface CallingScreenProps {
  callType: CallType;
  chat: ChatItem;
  isIncoming?: boolean;
  socket: WebSocket | null;
  incomingOffer?: any;
  onEnd: () => void;
}

const CallingScreen: React.FC<CallingScreenProps> = ({ callType, chat, isIncoming = false, socket, incomingOffer, onEnd }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(callType === 'voice');
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'secure' | 'ending'>(isIncoming ? 'ringing' : 'connecting');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Initialize call timer when call goes secure
  useEffect(() => {
    let timer: number;
    if (callStatus === 'secure') {
      timer = window.setInterval(() => setCallDuration(p => p + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callStatus]);

  // Clean up streams and socket on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, []);

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    // Do not close socketRef.current since it references the global socket in App.tsx
  };



  // Attach socketRef to global socket prop
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  const setupMediaAndWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize Peer Connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setCallStatus('secure');
        }
      };

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.send(JSON.stringify({
            type: 'candidate',
            targetId: chat.id,
            candidate: event.candidate
          }));
        }
      };

      if (!isIncoming) {
        // Send WebRTC Offer to target user
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.send(JSON.stringify({
          type: 'offer',
          targetId: chat.id,
          callType: callType,
          offer: offer
        }));
      } else if (incomingOffer) {
        // Process existing incoming offer
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket?.send(JSON.stringify({
          type: 'answer',
          targetId: chat.id,
          answer: answer
        }));
        setCallStatus('connecting'); // Wait for WebRTC connection to handshake to go secure
      }
    } catch (err) {
      console.error("Kamera/Mikrofon erişim hatası veya WebRTC kurulum hatası:", err);
      // Let it stay in ringing or connecting rather than forcing 'secure' if there's an error
    }
  };

  useEffect(() => {
    if (!socket) return;

    if (!isIncoming) {
      setupMediaAndWebRTC();
    }

    // Listen to signaling via the global socket
    const originalOnMessage = socket.onmessage;
    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const pc = peerConnectionRef.current;

        switch (data.type) {
          case 'offer':
            if (isIncoming) {
              // Store offer data to respond later upon accept
              // This case shouldn't generally happen here if offer was already stored in App.tsx
            }
            break;

          case 'answer':
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              setCallStatus('secure');
            }
            break;

          case 'candidate':
            if (pc && data.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
            break;

          case 'hangup':
            handleEndCall();
            break;
            
          case 'error':
            console.warn("Sinyalleşme Hatası:", data.message);
            setCallStatus('secure');
            break;
        }
      } catch (err) {
        console.error("Sinyalleşme mesajı işleme hatası:", err);
      }

      if (originalOnMessage) {
        originalOnMessage.call(socket, event);
      }
    };

    return () => {
      socket.onmessage = originalOnMessage;
    };
  }, [chat.id, isIncoming, callType, socket, incomingOffer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const acceptCall = async () => {
    setCallStatus('connecting');
    await setupMediaAndWebRTC();
  };

  const handleEndCall = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'hangup',
        targetId: chat.id
      }));
    }
    setCallStatus('ending');
    setTimeout(() => {
      cleanupCall();
      onEnd();
    }, 1000);
  };


  return (
    <div className="h-full bg-[#050a0d] relative flex flex-col overflow-hidden animate-in fade-in duration-700">
      {/* Dynamic Security Visualizer Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(0,136,204,0.15)_0%,transparent_70%)] animate-pulse"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      {/* Ringing / Connecting State UI */}
      {(callStatus === 'ringing' || callStatus === 'connecting') && (
        <div className="flex-1 flex flex-col items-center justify-center z-20 px-10 text-center">
          <div className="relative mb-12">
            <div className="absolute inset-[-40px] border-2 border-primary/20 rounded-full animate-ping opacity-50"></div>
            <div className="absolute inset-[-20px] border-2 border-primary/40 rounded-full animate-ping delay-700 opacity-30"></div>
            <img src={chat.avatar} className="w-32 h-32 rounded-full border-4 border-primary/30 shadow-[0_0_50px_rgba(0,136,204,0.4)] relative z-10" alt="" />
            <div className="absolute bottom-1 right-1 bg-primary p-1.5 rounded-full border-4 border-[#050a0d] z-20">
              <span className="material-icons-round text-white text-sm">security</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-extrabold mb-2 tracking-tight text-white">{chat.name}</h2>
          <p className="text-primary font-bold uppercase tracking-[0.3em] text-xs mb-8">
            {callStatus === 'ringing' ? 'Gelen Güvenli Arama' : 'Bağlantı Kuruluyor...'}
          </p>
          
          <div className="flex items-center gap-12 mt-12">
            {callStatus === 'ringing' ? (
              <>
                <button onClick={handleEndCall} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-90 transition-all">
                  <span className="material-icons-round text-3xl">call_end</span>
                </button>
                <button onClick={acceptCall} className="w-20 h-20 bg-stitch-green rounded-full flex items-center justify-center text-background-dark shadow-2xl hover:scale-110 active:scale-90 transition-all pulse-glow">
                  <span className="material-icons-round text-4xl text-[#0b1217]">call</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 italic text-sm animate-pulse">
                <span className="material-icons-round spin-slow">sync</span>
                Güvenli Kanallar Eşleştiriliyor...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Secure Active Call UI */}
      {callStatus === 'secure' && (
        <>
          {/* Video Layer */}
          <div className="absolute inset-0 bg-slate-900 z-0">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" poster={chat.avatar} />
            <div className="absolute top-10 right-10 w-32 h-48 bg-black/50 rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-20 group">
              {!isCameraOff ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-500">
                  <span className="material-icons-round text-3xl mb-2">videocam_off</span>
                  <span className="text-[8px] font-bold uppercase">Kamera Kapalı</span>
                </div>
              )}
            </div>
          </div>

          {/* Call Info Header */}
          <header className="relative z-10 p-10 flex flex-col items-center">
            <div className="flex items-center gap-3 bg-surface-dark/40 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/5 shadow-2xl mb-4">
              <span className="w-2 h-2 bg-stitch-green rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Güvenli Görüşme • {formatTime(callDuration)}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-1 text-white">{chat.name}</h2>
            <div className="flex items-center gap-2 text-stitch-green/60">
              <span className="material-icons-round text-sm">lock</span>
              <span className="text-[9px] font-bold uppercase tracking-tighter">Google STUN Eşleşmesi Etkin</span>
            </div>
          </header>

          {/* Call Control Bar */}
          <footer className="relative z-20 mt-auto p-10">
            <div className="max-w-md mx-auto bg-[#1a2b35]/80 backdrop-blur-3xl rounded-[2.5rem] p-6 flex items-center justify-around border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <button 
                onClick={() => {
                  if (localStreamRef.current) {
                    const audioTrack = localStreamRef.current.getAudioTracks()[0];
                    if (audioTrack) {
                      audioTrack.enabled = isMuted;
                      setIsMuted(!isMuted);
                    }
                  }
                }}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
              >
                <span className="material-icons-round text-2xl">{isMuted ? 'mic_off' : 'mic'}</span>
              </button>

              {callType === 'video' && (
                <button 
                  onClick={() => {
                    if (localStreamRef.current) {
                      const videoTrack = localStreamRef.current.getVideoTracks()[0];
                      if (videoTrack) {
                        videoTrack.enabled = isCameraOff;
                        setIsCameraOff(!isCameraOff);
                      }
                    }
                  }}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isCameraOff ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                  <span className="material-icons-round text-2xl">{isCameraOff ? 'videocam_off' : 'videocam'}</span>
                </button>
              )}

              <button 
                onClick={handleEndCall}
                className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-90 transition-all"
              >
                <span className="material-icons-round text-3xl">call_end</span>
              </button>
            </div>
          </footer>
        </>
      )}

      {/* Transition Overlay */}
      {callStatus === 'ending' && (
        <div className="absolute inset-0 bg-background-dark/95 backdrop-blur-lg z-50 flex items-center justify-center animate-in fade-in duration-300">
           <div className="flex flex-col items-center gap-4">
              <span className="material-icons-round text-slate-500 text-6xl animate-pulse spin-slow">lock_clock</span>
              <p className="font-bold text-slate-500 uppercase tracking-widest">Geçici Oturum Anahtarları Siliniyor...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default CallingScreen;
