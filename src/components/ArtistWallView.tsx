import React, { useState, useEffect } from 'react';
import { Heart, ArrowLeft, DollarSign, Briefcase, Share2, Copy, Check, X, Send } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, increment, addDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Post, UserProfile } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';

export function ArtistWallView({ user, artistUid, artistProfile, lang, onBack }: { user: any, artistUid: string, artistProfile: UserProfile, lang: Language, onBack: () => void }) {
  const { t } = useTranslation(lang);
  const [posts, setPosts] = useState<Post[]>([]);
  
  // Info Modal State
  const [activeInfoModal, setActiveInfoModal] = useState<'donate' | 'commission' | null>(null);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [answers, setAnswers] = useState<string[]>(['', '', '', '', '']);
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestName, setGuestName] = useState(user?.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      where('authorUid', '==', artistUid),
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
  }, [artistUid]);

  const handleLike = async (post: Post) => {
    if (!user || post.likedBy?.includes(user.uid)) return;
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likes: increment(1),
        likedBy: arrayUnion(user.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleUnlike = async (post: Post) => {
    if (!user || !post.likedBy?.includes(user.uid)) return;
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likes: increment(-1),
        likedBy: arrayRemove(user.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const shareUrl = `https://dreamtoon.vn/${artistProfile?.handle || artistUid}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnSocial = (platform: 'facebook' | 'twitter' | 'telegram') => {
    const text = `Check out ${artistProfile?.displayName}'s wall on DreamToon!`;
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
    };
    window.open(urls[platform], '_blank');
  };

  const handleSubmitCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const commissionData = {
        artistUid,
        guestUid: user.uid,
        guestName,
        guestEmail,
        answers: (artistProfile.commissionQuestions || []).map((q, i) => ({
          question: q,
          answer: answers[i]
        })),
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'commissions'), commissionData);
      
      // Create a notification for the artist
      await addDoc(collection(db, 'notifications'), {
        uid: artistUid,
        type: 'commission',
        title: 'New Commission Request',
        message: `${guestName} has sent a new commission request.`,
        link: 'profile', // Or a specific commissions view
        read: false,
        createdAt: serverTimestamp()
      });

      // NOTE: Real email sending would require a server-side function (e.g. Firebase Functions)
      // or a third-party service like SendGrid/Mailgun.
      // For now, we simulate the intent.
      console.log(`Email would be sent to ${artistProfile.email} about new commission from ${guestEmail}`);

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowCommissionForm(false);
        setActiveInfoModal(null);
        setAnswers(['', '', '', '', '']);
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'commissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-900">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <img 
              src={artistProfile.photoURL || ''} 
              alt={artistProfile.displayName} 
              className="w-12 h-12 rounded-2xl border-2 border-white shadow-md object-cover"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-xl font-black tracking-tight text-zinc-900">{artistProfile.displayName}</h2>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">@{artistProfile.handle || 'artist'}</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveInfoModal('donate')}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
          >
            <DollarSign size={14} />
            {t('donate')}
          </button>
          <button 
            onClick={() => setActiveInfoModal('commission')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
          >
            <Briefcase size={14} />
            {t('commission')}
          </button>
          <button 
            onClick={() => setShowShareModal(true)}
            className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-all"
          >
            <Share2 size={18} />
          </button>
        </div>
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
                  onClick={() => handleLike(post)}
                  onDoubleClick={() => handleUnlike(post)}
                  className={`flex items-center gap-2 transition-all text-xs font-black uppercase tracking-wider ${post.likedBy?.includes(user?.uid) ? 'text-red-500' : 'text-zinc-400 hover:text-red-500'}`}
                >
                  <div className={`p-2 rounded-full transition-colors ${post.likedBy?.includes(user?.uid) ? 'bg-red-50' : 'hover:bg-red-50'}`}>
                    <Heart size={18} fill={post.likedBy?.includes(user?.uid) ? "currentColor" : "none"} />
                  </div>
                  {post.likes || 0}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {posts.length === 0 && (
          <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <p className="text-zinc-500 font-medium">No posts on this wall yet.</p>
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
                  {showCommissionForm ? <Send size={20} /> : (activeInfoModal === 'donate' ? <DollarSign size={20} /> : <Briefcase size={20} />)}
                  {showCommissionForm ? t('submitCommission') : t(activeInfoModal as any)}
                </h3>
                <button onClick={() => {
                  setActiveInfoModal(null);
                  setShowCommissionForm(false);
                }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                {showCommissionForm ? (
                  <form onSubmit={handleSubmitCommission} className="space-y-6">
                    {submitSuccess ? (
                      <div className="text-center py-12 bg-green-50 rounded-3xl border-2 border-dashed border-green-200">
                        <p className="text-green-600 font-black uppercase tracking-widest">{t('commissionSubmitted')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('guestInfo')}</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('yourName')}</label>
                              <input 
                                required
                                type="text"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-zinc-900 focus:outline-none focus:border-orange-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('yourEmail')}</label>
                              <input 
                                required
                                type="email"
                                value={guestEmail}
                                onChange={(e) => setGuestEmail(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-zinc-900 focus:outline-none focus:border-orange-500 transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('commissionQuestions')}</h4>
                          {(artistProfile.commissionQuestions || []).map((q, i) => (
                            <div key={i} className="space-y-1">
                              <label className="block text-xs font-bold text-zinc-700">{q}</label>
                              <textarea 
                                required
                                value={answers[i]}
                                onChange={(e) => {
                                  const newAns = [...answers];
                                  newAns[i] = e.target.value;
                                  setAnswers(newAns);
                                }}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-zinc-900 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                                rows={2}
                              />
                            </div>
                          ))}
                        </div>

                        <button 
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-4 bg-orange-500 text-white rounded-full font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50"
                        >
                          {isSubmitting ? '...' : t('submitCommission')}
                        </button>
                      </>
                    )}
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="text-zinc-700 text-sm leading-relaxed whitespace-pre-wrap min-h-[100px]">
                      {(activeInfoModal === 'donate' ? artistProfile.donateInfo?.text : artistProfile.commissionInfo?.text) || (activeInfoModal === 'donate' ? t('donateInfo') : t('commissionInfo'))}
                    </div>
                    {(activeInfoModal === 'donate' ? artistProfile.donateInfo?.imageUrl : artistProfile.commissionInfo?.imageUrl) && (
                      <div className="rounded-2xl overflow-hidden border border-zinc-100 shadow-md">
                        <img 
                          src={activeInfoModal === 'donate' ? artistProfile.donateInfo?.imageUrl : artistProfile.commissionInfo?.imageUrl} 
                          alt={activeInfoModal || 'info'} 
                          className="w-full h-auto object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    {activeInfoModal === 'commission' && artistProfile.commissionQuestions && artistProfile.commissionQuestions.length > 0 && (
                      <button 
                        onClick={() => setShowCommissionForm(true)}
                        className="w-full py-4 bg-zinc-900 text-white rounded-full font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 flex items-center justify-center gap-2"
                      >
                        <Send size={18} />
                        {t('startNow')}
                      </button>
                    )}
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
                      <svg width={20} height={20} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
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
