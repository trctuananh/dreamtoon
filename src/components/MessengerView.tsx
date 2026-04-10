import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, User, ChevronLeft, MoreVertical, Image as ImageIcon, Smile, MessageCircle } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Conversation, Message } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';

export function MessengerView({ 
  user, 
  profile, 
  lang, 
  onBack,
  chatTarget,
  onChatTargetHandled
}: { 
  user: any, 
  profile: UserProfile | null, 
  lang: Language, 
  onBack: () => void,
  chatTarget?: UserProfile | null,
  onChatTargetHandled?: () => void
}) {
  const { t } = useTranslation(lang);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle chat target from props
  useEffect(() => {
    if (chatTarget && user) {
      startConversation(chatTarget);
      onChatTargetHandled?.();
    }
  }, [chatTarget, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen to conversations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
      setConversations(convs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    });

    return () => unsubscribe();
  }, [user]);

  // Listen to messages in selected conversation
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'conversations', selectedConversation.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `conversations/${selectedConversation.id}/messages`);
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  const handleSearch = async (queryStr: string) => {
    setSearchQuery(queryStr);
    if (queryStr.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'profiles'),
        where('handle', '>=', queryStr.toLowerCase()),
        where('handle', '<=', queryStr.toLowerCase() + '\uf8ff'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
        .filter(p => p.uid !== user.uid);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const startConversation = async (otherUser: UserProfile) => {
    if (!user) return;

    // Check if conversation already exists
    const existing = conversations.find(c => c.participants.includes(otherUser.uid));
    if (existing) {
      setSelectedConversation(existing);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    try {
      const convId = [user.uid, otherUser.uid].sort().join('_');
      const convData: Partial<Conversation> = {
        id: convId,
        participants: [user.uid, otherUser.uid],
        participantProfiles: {
          [user.uid]: { displayName: profile?.displayName || 'User', photoURL: profile?.photoURL || '' },
          [otherUser.uid]: { displayName: otherUser.displayName, photoURL: otherUser.photoURL }
        },
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'conversations'), convData);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'conversations');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation || !newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const messageData: Partial<Message> = {
        conversationId: selectedConversation.id,
        senderId: user.uid,
        content,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'conversations', selectedConversation.id, 'messages'), messageData);
      
      // Update conversation last message
      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `conversations/${selectedConversation.id}/messages`);
    }
  };

  const getOtherParticipant = (conv: Conversation) => {
    const otherId = conv.participants.find(id => id !== user?.uid);
    return conv.participantProfiles?.[otherId || ''] || { displayName: 'Unknown', photoURL: '' };
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-6 text-center">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
          <MessageCircle size={40} className="text-zinc-400" />
        </div>
        <h2 className="text-2xl font-black mb-2">{t('loginToJoin')}</h2>
        <p className="text-zinc-500 max-w-xs">{t('loginToContinue')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden bg-white">
      {/* Sidebar - Conversation List */}
      <div className={`w-full md:w-80 flex-shrink-0 border-r border-zinc-100 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black tracking-tight">{t('messenger')}</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchQuery.length >= 2 ? (
            <div className="p-2 space-y-1">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2">Search Results</p>
              {searchResults.map(result => (
                <button
                  key={result.uid}
                  onClick={() => startConversation(result)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 rounded-2xl transition-colors"
                >
                  <img src={result.photoURL} className="w-10 h-10 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                  <div className="text-left">
                    <p className="font-bold text-sm">{result.displayName}</p>
                    <p className="text-xs text-zinc-500">@{result.handle}</p>
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && !isSearching && (
                <p className="text-center py-8 text-zinc-400 text-sm">No users found</p>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map(conv => {
                const other = getOtherParticipant(conv);
                const isActive = selectedConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${isActive ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}
                  >
                    <div className="relative">
                      <img src={other.photoURL} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" alt="" referrerPolicy="no-referrer" />
                      {/* Status indicator could go here */}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <p className={`font-bold text-sm truncate ${isActive ? 'text-blue-600' : 'text-zinc-900'}`}>{other.displayName}</p>
                        <span className="text-[10px] text-zinc-400">
                          {conv.lastMessageAt?.toDate ? conv.lastMessageAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{conv.lastMessage || 'Start a conversation'}</p>
                    </div>
                  </button>
                );
              })}
              {conversations.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-zinc-400 text-sm">{t('noConversations')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-zinc-50/30 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedConversation(null)} className="p-2 hover:bg-zinc-100 rounded-full md:hidden">
                  <ChevronLeft size={20} />
                </button>
                <img src={getOtherParticipant(selectedConversation).photoURL} className="w-10 h-10 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                <div>
                  <p className="font-bold text-sm">{getOtherParticipant(selectedConversation).displayName}</p>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</p>
                </div>
              </div>
              <button className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400">
                <MoreVertical size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user.uid;
                const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {!isMe && (
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && (
                          <img src={getOtherParticipant(selectedConversation).photoURL} className="w-8 h-8 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                        )}
                      </div>
                    )}
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                      isMe 
                        ? 'bg-blue-500 text-white rounded-br-none' 
                        : 'bg-white text-zinc-900 rounded-bl-none border border-zinc-100'
                    }`}>
                      {msg.content}
                      <p className={`text-[8px] mt-1 ${isMe ? 'text-blue-100' : 'text-zinc-400'}`}>
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-zinc-100">
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <button type="button" className="p-2 text-zinc-400 hover:text-blue-500 transition-colors">
                  <ImageIcon size={20} />
                </button>
                <button type="button" className="p-2 text-zinc-400 hover:text-blue-500 transition-colors">
                  <Smile size={20} />
                </button>
                <input 
                  type="text"
                  placeholder={t('typeAMessage')}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-zinc-50 border border-zinc-100 rounded-full py-2 px-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
              <MessageCircle size={40} className="text-zinc-200" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('messenger')}</h3>
            <p className="text-zinc-400 max-w-xs text-sm">{t('selectAConversation')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
