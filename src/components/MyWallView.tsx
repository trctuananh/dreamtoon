import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Trash2, Heart, ArrowLeft, PenTool, X, Save, DollarSign, Briefcase, Upload, Camera, Share2, Copy, Check } from 'lucide-react';
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Post, UserProfile } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';

export function MyWallView({ user, profile, lang, onBack }: { user: any, profile: UserProfile | null, lang: Language, onBack: () => void }) {
  const { t } = useTranslation(lang);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Info Modal State
  const [activeInfoModal, setActiveInfoModal] = useState<'donate' | 'commission' | null>(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoText, setInfoText] = useState('');
  const [infoImage, setInfoImage] = useState<string | null>(null);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const infoFileInputRef = useRef<HTMLInputElement>(null);

  // Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'posts'),
      where('authorUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(newPosts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, target: 'post' | 'info') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (target === 'post') {
        setSelectedImage(reader.result as string);
      } else {
        setInfoImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedImage) return;

    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorUid: user.uid,
        authorName: profile?.displayName || user.displayName,
        authorPhoto: profile?.photoURL || user.photoURL,
        content: content.trim(),
        imageUrl: selectedImage,
        type: 'twit', // Default to twit since buttons are removed
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp()
      });
      setContent('');
      setSelectedImage(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setIsPosting(false);
    }
  };

  const handleSaveInfo = async () => {
    if (!user || !activeInfoModal) return;
    setIsSavingInfo(true);
    try {
      const field = activeInfoModal === 'donate' ? 'donateInfo' : 'commissionInfo';
      await updateDoc(doc(db, 'users', user.uid), {
        [field]: {
          text: infoText,
          imageUrl: infoImage
        }
      });
      setIsEditingInfo(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSavingInfo(false);
    }
  };

  const openInfoModal = (type: 'donate' | 'commission') => {
    setActiveInfoModal(type);
    const info = type === 'donate' ? profile?.donateInfo : profile?.commissionInfo;
    setInfoText(info?.text || '');
    setInfoImage(info?.imageUrl || null);
    setIsEditingInfo(false);
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await updateDoc(doc(db, 'posts', postId), {
        likes: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const shareUrl = `${window.location.origin}/?artist=${profile?.handle || user.uid}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnSocial = (platform: 'facebook' | 'twitter' | 'telegram') => {
    const text = `Check out ${profile?.displayName || user.displayName}'s wall on DreamToon!`;
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
    };
    window.open(urls[platform], '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-900">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900">{t('myWall')}</h2>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => openInfoModal('donate')}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
          >
            <DollarSign size={14} />
            {t('donate')}
          </button>
          <button 
            onClick={() => openInfoModal('commission')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
          >
            <Briefcase size={14} />
            {t('commission')}
          </button>
          <button 
            onClick={() => setShowShareModal(true)}
            className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-all"
            title={t('share')}
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Post Form */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm mb-8">
        <form onSubmit={handlePost}>
          <div className="flex gap-4 mb-4">
            <img 
              src={user.photoURL || ''} 
              alt={user.displayName || ''} 
              className="w-12 h-12 rounded-full border-2 border-blue-500"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                rows={3}
              />
            </div>
          </div>

          {selectedImage && (
            <div className="relative w-full max-h-48 mb-4 rounded-2xl overflow-hidden group">
              <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleImageSelect(e, 'post')}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
              >
                <Camera size={16} />
                {t('upload')}
              </button>
            </div>
            <button
              type="submit"
              disabled={isPosting || (!content.trim() && !selectedImage)}
              className="bg-zinc-900 text-white px-8 py-2 rounded-full text-sm font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={16} />
              {isPosting ? '...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-6 border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-500 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={post.authorPhoto} 
                      alt={post.authorName} 
                      className="w-12 h-12 rounded-2xl border-2 border-white shadow-md object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-900 text-sm tracking-tight">{post.authorName}</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">
                      {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : '...'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(post.id)}
                  className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="text-zinc-700 text-[15px] leading-relaxed mb-5 font-medium whitespace-pre-wrap">
                {post.content}
              </div>

              {post.imageUrl && (
                <div className="rounded-3xl overflow-hidden mb-5 border border-zinc-100 shadow-sm group/img relative">
                  <img 
                    src={post.imageUrl} 
                    alt="Post content" 
                    className="w-full h-auto max-h-[600px] object-cover group-hover/img:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors duration-700" />
                </div>
              )}

              <div className="flex items-center gap-6 pt-5 border-t border-zinc-50">
                <button 
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-2 text-zinc-400 hover:text-red-500 transition-all text-xs font-black uppercase tracking-wider"
                >
                  <div className="p-2 rounded-full hover:bg-red-50 transition-colors">
                    <Heart size={18} />
                  </div>
                  {post.likes || 0}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {posts.length === 0 && (
          <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <PenTool size={48} className="mx-auto text-zinc-300 mb-4" />
            <p className="text-zinc-500 font-medium">Your wall is empty. Start posting!</p>
          </div>
        )}
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {activeInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className={`p-6 flex items-center justify-between text-white ${activeInfoModal === 'donate' ? 'bg-green-500' : 'bg-orange-500'}`}>
                <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                  {activeInfoModal === 'donate' ? <DollarSign size={20} /> : <Briefcase size={20} />}
                  {t(activeInfoModal as any)}
                </h3>
                <button onClick={() => setActiveInfoModal(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                {isEditingInfo ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('infoText')}</label>
                      <textarea
                        value={infoText}
                        onChange={(e) => setInfoText(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        rows={4}
                        placeholder={activeInfoModal === 'donate' ? t('donateInfo') : t('commissionInfo')}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('infoImageUrl')}</label>
                      <div className="flex items-center gap-4">
                        {infoImage && (
                          <div className="w-20 h-20 rounded-xl overflow-hidden border border-zinc-100 flex-shrink-0">
                            <img src={infoImage} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <input
                          type="file"
                          ref={infoFileInputRef}
                          onChange={(e) => handleImageSelect(e, 'info')}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => infoFileInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-100 text-zinc-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                        >
                          <Upload size={16} />
                          {t('upload')}
                        </button>
                        {infoImage && (
                          <button 
                            type="button"
                            onClick={() => setInfoImage(null)}
                            className="p-3 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSaveInfo}
                        disabled={isSavingInfo}
                        className="flex-1 bg-zinc-900 text-white py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                      >
                        <Save size={16} />
                        {isSavingInfo ? '...' : t('saveInfo')}
                      </button>
                      <button
                        onClick={() => setIsEditingInfo(false)}
                        className="px-6 py-3 bg-zinc-100 text-zinc-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-zinc-700 text-sm leading-relaxed whitespace-pre-wrap min-h-[100px]">
                      {infoText || (activeInfoModal === 'donate' ? t('donateInfo') : t('commissionInfo'))}
                    </div>
                    {infoImage && (
                      <div className="rounded-2xl overflow-hidden border border-zinc-100 shadow-md">
                        <img 
                          src={infoImage} 
                          alt={activeInfoModal} 
                          className="w-full h-auto object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <button
                      onClick={() => setIsEditingInfo(true)}
                      className="w-full py-3 bg-zinc-100 text-zinc-900 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                    >
                      <PenTool size={16} />
                      {activeInfoModal === 'donate' ? t('editDonate') : t('editCommission')}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between bg-zinc-900 text-white">
                <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                  <Share2 size={20} />
                  {t('shareWall')}
                </h3>
                <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <p className="text-xs text-zinc-500 truncate font-medium">{shareUrl}</p>
                  <button 
                    onClick={handleCopyLink}
                    className={`p-2 rounded-xl transition-all ${copied ? 'bg-green-500 text-white' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'}`}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <button 
                    onClick={() => shareOnSocial('facebook')}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-600/20">
                      <svg width={24} height={24} fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">FB</span>
                  </button>
                  <button 
                    onClick={() => shareOnSocial('twitter')}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-black/20">
                      <svg width={20} height={20} fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">X</span>
                  </button>
                  <button 
                    onClick={() => shareOnSocial('telegram')}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-sky-500/20">
                      <Send size={20} className="ml-0.5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">TG</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
