import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, Send, X } from 'lucide-react';
import { FirebaseUser as User } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface TextChatProps {
  roomId: string;
  user: User;
}

interface ChatMessage {
  id: string;
  uid: string;
  senderName: string;
  text: string;
  createdAt: any;
}

export function TextChat({ roomId, user }: TextChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, `rooms/${roomId}/messages`),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMsgs: ChatMessage[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedMsgs.push({
          id: doc.id,
          uid: data.uid,
          senderName: data.senderName,
          text: data.text,
          createdAt: data.createdAt
        });
      });
      fetchedMsgs.reverse();
      setMessages(fetchedMsgs);

      // Increment unread if closed and initial load is done (simulated by checking if we had messages before)
      if (!isOpen && fetchedMsgs.length > messages.length && messages.length > 0) {
        setUnreadCount(prev => prev + 1);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/messages`);
    });

    return () => unsubscribe();
  }, [roomId, isOpen, messages.length]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, `rooms/${roomId}/messages`), {
        uid: user.uid,
        senderName: user.displayName || 'Jogador',
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rooms/${roomId}/messages`);
    }
  };

  return (
    <div className="flex z-50">
      {/* Botão de abrir chat */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-stone-800 border-2 border-stone-600 flex justify-center items-center text-white hover:bg-stone-700 hover:border-amber-500 transition-all shadow-xl relative mt-2"
        title="Chat de Texto"
      >
        <MessageSquare className="w-5 h-5 text-amber-500" />
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-stone-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Janela do Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-16 right-0 w-80 sm:w-96 h-[400px] max-h-[70vh] bg-stone-900/95 backdrop-blur-xl border-2 border-amber-500/30 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-stone-800/80 p-3 flex justify-between items-center border-b border-amber-500/20">
              <span className="text-amber-500 font-bold font-serif italic text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Chat da Mesa
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-white transition-colors"
                title="Fechar Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 ? (
                <div className="text-center text-stone-500 text-sm italic mt-10">
                  Nenhuma mensagem ainda. Puxe assunto!
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.uid === user.uid;
                  const showName = index === 0 || messages[index - 1].uid !== msg.uid;
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showName && !isMe && (
                        <span className="text-[10px] text-stone-400 ml-1 mb-1 font-bold">{msg.senderName}</span>
                      )}
                      <div 
                        className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm shadow-md ${
                          isMe 
                            ? 'bg-amber-600 text-white rounded-br-sm' 
                            : 'bg-stone-800 border border-stone-700 text-stone-200 rounded-bl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-stone-800 border-t border-stone-700 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escreva algo..."
                className="flex-1 bg-stone-900 border border-stone-600 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                autoComplete="off"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="w-10 h-10 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg"
              >
                <Send className="w-4 h-4 ml-1" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
