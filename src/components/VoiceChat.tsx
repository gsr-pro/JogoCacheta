import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, collection, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceChatProps {
  roomId: string;
  userId: string;
  playerIds: string[];
}

export const VoiceChat: React.FC<VoiceChatProps> = ({ roomId, userId, playerIds }) => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<{ [uid: string]: RTCPeerConnection }>({});
  const remoteStreams = useRef<{ [uid: string]: MediaStream }>({});
  const audioElements = useRef<{ [uid: string]: HTMLAudioElement }>({});

  const iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const cleanup = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    Object.values(peerConnections.current).forEach(pc => pc.close());
    try {
      await deleteDoc(doc(db, `rooms/${roomId}/voice`, userId));
    } catch (e) {}
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const toggleMic = async () => {
    if (!isMicOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setIsMicOn(true);
        
        // Signal presence
        await setDoc(doc(db, `rooms/${roomId}/voice`, userId), {
          userId,
          joinedAt: serverTimestamp(),
        });

        // Setup connections to others who are already in voice
        playerIds.forEach(pid => {
          if (pid !== userId && pid !== 'bot_1') {
            createPeerConnection(pid, stream);
          }
        });
      } catch (err: any) {
        console.error("Erro ao acessar microfone:", err);
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          setMicError("Permissão negada. Se estiver no preview, abra o app em uma nova aba para usar o microfone.");
        } else {
          setMicError("Erro ao acessar o microfone.");
        }
      }
    } else {
      cleanup();
      setIsMicOn(false);
    }
  };

  const createPeerConnection = (remoteUid: string, stream: MediaStream) => {
    if (peerConnections.current[remoteUid]) return;

    const pc = new RTCPeerConnection(iceConfig);
    peerConnections.current[remoteUid] = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      remoteStreams.current[remoteUid] = remoteStream;
      
      if (!audioElements.current[remoteUid]) {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audioElements.current[remoteUid] = audio;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateDoc = doc(collection(db, `rooms/${roomId}/voice/${remoteUid}/candidates`));
        setDoc(candidateDoc, {
          from: userId,
          candidate: event.candidate.toJSON(),
          timestamp: serverTimestamp(),
        });
      }
    };

    // Create offer if I joined later or based on UID comparison to avoid double connections
    if (userId > remoteUid) {
      pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);
        await setDoc(doc(db, `rooms/${roomId}/voice/${remoteUid}/offers`, userId), {
          from: userId,
          sdp: offer.sdp,
          type: offer.type,
        });
      });
    }

    return pc;
  };

  // Listen for offers and candidates
  useEffect(() => {
    if (!isMicOn || !localStreamRef.current) return;

    const unsubscribeOffers = onSnapshot(collection(db, `rooms/${roomId}/voice/${userId}/offers`), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const remoteUid = data.from;
          
          let pc = peerConnections.current[remoteUid];
          if (!pc) {
            pc = createPeerConnection(remoteUid, localStreamRef.current!);
          }

          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data as RTCSessionDescriptionInit));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await setDoc(doc(db, `rooms/${roomId}/voice/${remoteUid}/answers`, userId), {
              from: userId,
              sdp: answer.sdp,
              type: answer.type,
            });
          }
        }
      });
    });

    const unsubscribeAnswers = onSnapshot(collection(db, `rooms/${roomId}/voice/${userId}/answers`), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const remoteUid = data.from;
          const pc = peerConnections.current[remoteUid];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data as RTCSessionDescriptionInit));
          }
        }
      });
    });

    const unsubscribeCandidates = onSnapshot(collection(db, `rooms/${roomId}/voice/${userId}/candidates`), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const remoteUid = data.from;
          const pc = peerConnections.current[remoteUid];
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      });
    });

    return () => {
      unsubscribeOffers();
      unsubscribeAnswers();
      unsubscribeCandidates();
    };
  }, [isMicOn]);

  return (
    <div className="flex flex-col items-end gap-2 relative">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full transition-all ${isMicOn ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
          title={isMicOn ? "Desligar Microfone" : "Ligar Microfone"}
        >
          {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setIsAudioEnabled(!isAudioEnabled)}
          className={`p-3 rounded-full transition-all ${isAudioEnabled ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60'}`}
          title={isAudioEnabled ? "Mutar Áudio" : "Ativar Áudio"}
        >
          {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
        {isMicOn && <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Voz Ativa</span>}
      </div>
      {micError && (
        <div className="absolute top-full mt-2 right-0 w-64 p-3 bg-red-900/90 border border-red-500/50 rounded-xl text-xs text-red-200 shadow-xl z-50">
          <p>{micError}</p>
          <button onClick={() => setMicError(null)} className="mt-2 text-white/50 hover:text-white underline">Fechar</button>
        </div>
      )}
    </div>
  );
};
