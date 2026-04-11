import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, User, ChevronLeft, MoreVertical, Image as ImageIcon, Smile, MessageCircle, Trash2, ImagePlus, X, Loader2 } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc,
  serverTimestamp, 
  doc, 
  updateDoc,
  getDocs,
  limit,
  increment,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Conversation, Message } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import { validateImage, compressImage } from '../lib/utils';

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const emojis = ['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '❤️', '🔥', '✨', '🙌', '👏', '🎉', '💯', '🙏', '💪', '👀', '🚀'];

  // Handle click outside emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle chat target from props
  useEffect(() => {
    if (chatTarget && user) {
      startConversation(chatTarget);
      onChatTargetHandled?.();
    }
  }, [chatTarget, user]);

  // Scroll to bottom when messages change - only if already near bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      
      // If near bottom, scroll to bottom. Otherwise stay fixed.
      if (isNearBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'instant'
        });
      }
    }
  }, [messages]);

  // Scroll to bottom immediately when switching conversations
  useEffect(() => {
    if (selectedConversation && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [selectedConversation?.id]);

  // Listen to conversations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs: Conversation[] = [];
      const seenIds = new Set();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = data.id || doc.id; // Prefer data.id if it exists (deterministic)
        if (!seenIds.has(id)) {
          seenIds.add(id);
          convs.push({ id, ...data } as Conversation);
        }
      });
      
      setConversations(convs);

      // Update selected conversation if it changed in the background
      if (selectedConversation) {
        const updated = convs.find(c => c.id === selectedConversation.id);
        if (updated) {
          setSelectedConversation(updated);
          // If we are currently viewing this conversation, mark as read
          if (updated.unreadCount?.[user.uid]) {
            markAsRead(updated.id);
          }
        }
      }
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
      orderBy('createdAt', 'asc'),
      limit(100)
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

  const markAsRead = async (convId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'conversations', convId), {
        [`unreadCount.${user.uid}`]: 0
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const startConversation = async (otherUser: UserProfile) => {
    if (!user) return;

    // Check if conversation already exists
    const existing = conversations.find(c => c.participants.includes(otherUser.uid));
    if (existing) {
      setSelectedConversation(existing);
      if (existing.unreadCount?.[user.uid]) {
        markAsRead(existing.id);
      }
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
          [otherUser.uid]: { displayName: otherUser.displayName || 'User', photoURL: otherUser.photoURL || '' }
        },
        unreadCount: {
          [user.uid]: 0,
          [otherUser.uid]: 0
        },
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'conversations', convId), convData);
      setSearchQuery('');
      setSearchResults([]);
      
      // Select it immediately
      setSelectedConversation({ id: convId, ...convData } as Conversation);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'conversations');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation || (!newMessage.trim() && !selectedImage)) return;

    const content = newMessage.trim();
    const imageUrl = selectedImage;
    setNewMessage('');
    setSelectedImage(null);
    setShowEmojiPicker(false);

    try {
      const messageData: any = {
        conversationId: selectedConversation.id,
        senderId: user.uid,
        content: content || (imageUrl ? 'Sent a photo' : ''),
        createdAt: serverTimestamp()
      };

      if (imageUrl) {
        messageData.imageUrl = imageUrl;
      }

      await addDoc(collection(db, 'conversations', selectedConversation.id, 'messages'), messageData);
      
      // Update conversation last message and increment unread for other participant
      const otherId = selectedConversation.participants.find(id => id !== user.uid);
      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        lastMessage: content || 'Sent a photo',
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        [`unreadCount.${otherId}`]: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `conversations/${selectedConversation.id}/messages`);
    }
  };

  const deleteConversation = async (convId: string) => {
    if (!user) return;
    try {
      // In a real app, we might want to just "hide" it for this user
      // but the request says "delete conversation", so we'll delete it for both
      // or at least the document.
      
      // First, delete all messages (optional but cleaner)
      const messagesSnap = await getDocs(collection(db, 'conversations', convId, 'messages'));
      
      // Firestore batches are limited to 500 operations
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      messagesSnap.docs.forEach(msgDoc => {
        currentBatch.delete(msgDoc.ref);
        operationCount++;
        
        if (operationCount === 500) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });
      
      if (operationCount > 0) {
        batches.push(currentBatch.commit());
      }
      
      await Promise.all(batches);

      // Then delete the conversation document
      await deleteDoc(doc(db, 'conversations', convId));
      
      if (selectedConversation?.id === convId) {
        setSelectedConversation(null);
      }
      setShowDeleteConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `conversations/${convId}`);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await validateImage(file);
    if (!result.valid) {
      alert(result.error);
      return;
    }

    setIsUploadingImage(true);
    try {
      // No pixel limit (undefined), standard web quality (0.7)
      const compressed = await compressImage(file, undefined, 0.7);
      
      // Check if base64 string length is > 1048576 (Firestore rule limit)
      if (compressed.length > 1048576) {
        alert('Image is too complex and exceeds the 1MB limit after compression. Please try a simpler image.');
        return;
      }
      
      setSelectedImage(compressed);
    } catch (err) {
      console.error('Image processing failed:', err);
    } finally {
      setIsUploadingImage(false);
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
                  <img src={result.photoURL || undefined} className="w-10 h-10 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
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
                    onClick={() => {
                      setSelectedConversation(conv);
                      if (conv.unreadCount?.[user.uid]) markAsRead(conv.id);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${isActive ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}
                  >
                    <div className="relative">
                      <img src={other.photoURL || undefined} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" alt="" referrerPolicy="no-referrer" />
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
                    {conv.unreadCount?.[user.uid] > 0 && (
                      <div className="w-5 h-5 bg-blue-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                        {conv.unreadCount[user.uid]}
                      </div>
                    )}
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
                <img src={getOtherParticipant(selectedConversation).photoURL || undefined} className="w-10 h-10 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                <div>
                  <p className="font-bold text-sm">{getOtherParticipant(selectedConversation).displayName}</p>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 hover:bg-red-50 rounded-full text-zinc-400 hover:text-red-500 transition-colors"
                  title="Delete Conversation"
                >
                  <Trash2 size={20} />
                </button>
                <button className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                  >
                    <h3 className="text-xl font-black mb-2">Delete Conversation?</h3>
                    <p className="text-zinc-500 text-sm mb-6">This will permanently delete this conversation and all messages for both participants.</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => deleteConversation(selectedConversation.id)}
                        className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user.uid;
                const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {!isMe && (
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && (
                          <img src={getOtherParticipant(selectedConversation).photoURL || undefined} className="w-8 h-8 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                        )}
                      </div>
                    )}
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                      isMe 
                        ? 'bg-blue-500 text-white rounded-br-none' 
                        : 'bg-white text-zinc-900 rounded-bl-none border border-zinc-100'
                    }`}>
                      {msg.imageUrl && (
                        <div 
                          className="mb-2 rounded-lg overflow-hidden border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setFullscreenImage(msg.imageUrl!)}
                        >
                          <img src={msg.imageUrl} alt="Sent photo" className="w-full h-auto max-h-60 object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      {msg.content && <p>{msg.content}</p>}
                      <p className={`text-[8px] mt-1 ${isMe ? 'text-blue-100' : 'text-zinc-400'}`}>
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-zinc-100">
              {selectedImage && (
                <div className="mb-3 relative inline-block">
                  <img src={selectedImage} className="h-20 w-20 object-cover rounded-xl border border-zinc-200" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <label className={`p-2 transition-colors cursor-pointer ${isUploadingImage ? 'text-blue-500 animate-pulse' : 'text-zinc-400 hover:text-blue-500'}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} disabled={isUploadingImage} />
                  {isUploadingImage ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
                </label>
                <div className="relative" ref={emojiPickerRef}>
                  <button 
                    type="button" 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 transition-colors ${showEmojiPicker ? 'text-blue-500' : 'text-zinc-400 hover:text-blue-500'}`}
                  >
                    <Smile size={20} />
                  </button>
                  
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-2xl shadow-xl border border-zinc-100 grid grid-cols-5 gap-1 z-50 w-48"
                      >
                        {emojis.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setNewMessage(prev => prev + emoji);
                              // Keep picker open for multiple emojis
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-zinc-50 rounded-lg transition-colors text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <input 
                  type="text"
                  placeholder={t('typeAMessage')}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-zinc-50 border border-zinc-100 rounded-full py-2 px-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() && !selectedImage}
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

      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 md:p-10"
            onClick={() => setFullscreenImage(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white/70 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
              onClick={() => setFullscreenImage(null)}
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={fullscreenImage}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              alt="Fullscreen"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
