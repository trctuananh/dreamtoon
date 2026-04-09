import React, { useState, useEffect } from 'react';
import { Heart, ArrowLeft, DollarSign, Briefcase, Share2, Copy, Check, X, Send, Trash2, MessageCircle, Layout } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, increment, addDoc, serverTimestamp, arrayUnion, arrayRemove, deleteDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, createNotification } from '../firebase';
import { Post, UserProfile, Donation, CommissionWork, Following, PostComment } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';

export function ArtistWallView({ user, profile, isAdmin, artistUid, artistProfile, lang, onBack, onProfileClick, onToggleFollow }: { user: any, profile: UserProfile | null, isAdmin: boolean, artistUid: string, artistProfile: UserProfile, lang: Language, onBack: () => void, onProfileClick: (uid: string) => void, onToggleFollow: (id: string, type: 'artist' | 'comic') => void }) {
  const { t } = useTranslation(lang);
  const [posts, setPosts] = useState<Post[]>([]);
  
  // Info Modal State
  const [activeInfoModal, setActiveInfoModal] = useState<'donate' | 'commission' | null>(null);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [requestDetails, setRequestDetails] = useState('');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestName, setGuestName] = useState(user?.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Donation Message State
  const [donationMessages, setDonationMessages] = useState<Donation[]>([]);
  const [commissionWorks, setCommissionWorks] = useState<CommissionWork[]>([]);
  const [donorName, setDonorName] = useState(user?.displayName || '');
  const [donorMessage, setDonorMessage] = useState('');
  const [isPostingDonation, setIsPostingDonation] = useState(false);
  const [showDonationForm, setShowDonationForm] = useState(false);

  // Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewingWorkImage, setViewingWorkImage] = useState<string | null>(null);

  // Comment State
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<PostComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'users', user.uid, 'following'),
        where('targetId', '==', artistUid),
        where('type', '==', 'artist')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIsFollowing(!snapshot.empty);
      });
      return () => unsubscribe();
    }
  }, [user, artistUid]);

  const handleFollow = () => {
    onToggleFollow(artistUid, 'artist');
  };

  const handleUnfollow = () => {
    onToggleFollow(artistUid, 'artist');
  };

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

  useEffect(() => {
    const q = query(
      collection(db, 'donations'),
      where('artistUid', '==', artistUid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newDonations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Donation[];
      setDonationMessages(newDonations);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'donations');
    });

    return () => unsubscribe();
  }, [artistUid]);

  useEffect(() => {
    const q = query(
      collection(db, 'users', artistUid, 'commissions'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newWorks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommissionWork[];
      setCommissionWorks(newWorks);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${artistUid}/commissions`);
    });

    return () => unsubscribe();
  }, [artistUid]);

  useEffect(() => {
    if (!activePostId) {
      setPostComments([]);
      return;
    }

    const q = query(
      collection(db, 'posts', activePostId, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PostComment[];
      setPostComments(newComments);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `posts/${activePostId}/comments`);
    });

    return () => unsubscribe();
  }, [activePostId]);

  const handleLike = async (post: Post) => {
    if (!user || post.likedBy?.includes(user.uid)) return;
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likes: increment(1),
        likedBy: arrayUnion(user.uid)
      });

      // Notify post author
      if (user.uid !== artistUid) {
        createNotification({
          recipientId: artistUid,
          type: 'like',
          targetId: post.id,
          senderId: user.uid,
          senderName: profile?.displayName || user.displayName || 'Anonymous',
          senderPhoto: profile?.photoURL || user.photoURL || ''
        });
      }
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
        requestDetails,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'commissions'), commissionData);
      
      // Create a notification for the artist
      createNotification({
        recipientId: artistUid,
        type: 'commission',
        targetId: 'profile', // Or a specific commissions view
        targetTitle: 'New Commission Request',
        senderId: user.uid,
        senderName: profile?.displayName || user.displayName || 'Anonymous',
        senderPhoto: profile?.photoURL || user.photoURL || ''
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
        setRequestDetails('');
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'commissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorMessage.trim() || !donorName.trim()) return;

    setIsPostingDonation(true);
    try {
      await addDoc(collection(db, 'donations'), {
        artistUid,
        donorUid: user?.uid || null,
        donorName: donorName.trim(),
        message: donorMessage.trim(),
        createdAt: serverTimestamp()
      });
      setDonorMessage('');
      setShowDonationForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'donations');
    } finally {
      setIsPostingDonation(false);
    }
  };

  const handleDeleteDonation = async (donationId: string) => {
    if (!window.confirm(t('confirmDeleteMessage'))) return;
    try {
      await deleteDoc(doc(db, 'donations', donationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `donations/${donationId}`);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !newCommentText.trim()) return;
    setIsPostingComment(true);
    try {
      const commentData = {
        postId,
        uid: user.uid,
        userName: profile?.displayName || user.displayName || 'Anonymous',
        userPhoto: profile?.photoURL || user.photoURL || '',
        userPioneerNumber: profile?.pioneerNumber || null,
        content: newCommentText.trim(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'posts', postId, 'comments'), commentData);
      await updateDoc(doc(db, 'posts', postId), {
        comments: increment(1)
      });
      
      // Add notification for post author
      if (user.uid !== artistUid) {
        createNotification({
          recipientId: artistUid,
          type: 'comment',
          targetId: postId,
          senderId: user.uid,
          senderName: profile?.displayName || user.displayName || 'Anonymous',
          senderPhoto: profile?.photoURL || user.photoURL || ''
        });
      }

      setNewCommentText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/comments`);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm(t('confirmDeleteComment'))) return;
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
      await updateDoc(doc(db, 'posts', postId), {
        comments: increment(-1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-2xl">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-zinc-100 shadow-sm mb-6 sm:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative flex-shrink-0">
              <img 
                src={artistProfile.photoURL || ''} 
                alt={artistProfile.displayName} 
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl border-4 border-white shadow-md object-cover aspect-square"
                referrerPolicy="no-referrer"
              />
              {artistProfile.pioneerNumber && (
                <div className="absolute -top-1 -left-1 bg-blue-600 text-white text-[10px] sm:text-xs font-black w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 border-white shadow-lg z-10">
                  {artistProfile.pioneerNumber}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 leading-tight">{artistProfile.displayName}</h2>
                <p className="text-sm sm:text-sm font-black text-blue-500 uppercase tracking-widest">@{artistProfile.handle || 'artist'}</p>
              </div>
              <button 
                onClick={() => onProfileClick(artistUid)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 border border-red-500 text-red-500 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-red-50 transition-colors whitespace-nowrap w-fit"
              >
                {t('viewProfilesAndArtworks')}
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
            <button 
              onClick={() => setActiveInfoModal('donate')}
              className="flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-green-500 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
            >
              <DollarSign size={14} className="sm:w-[18px] sm:h-[18px]" />
              {t('donate')}
            </button>
            <button 
              onClick={() => setActiveInfoModal('commission')}
              className="flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-orange-500 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
            >
              <Briefcase size={14} className="sm:w-[18px] sm:h-[18px]" />
              {t('commission')}
            </button>
            {user && user.uid !== artistUid && (
              <button 
                onClick={isFollowing ? handleUnfollow : handleFollow}
                className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-lg ${
                  isFollowing 
                  ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 shadow-zinc-200/20' 
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20'
                }`}
              >
                {isFollowing ? t('following') : t('follow')}
              </button>
            )}
            <button 
              onClick={() => setShowShareModal(true)}
              className="p-2.5 sm:p-3.5 bg-zinc-100 text-zinc-600 rounded-xl sm:rounded-2xl hover:bg-zinc-200 transition-all"
            >
              <Share2 size={18} className="sm:w-[22px] sm:h-[22px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Commission Progress Table */}
      {commissionWorks.length > 0 && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-zinc-100 shadow-sm mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Layout size={18} className="text-zinc-400" />
            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest">{t('commissionProgress')}</h4>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-4 sm:pl-0">{t('work')}</th>
                  <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('status')}</th>
                  <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest w-1/4 sm:w-1/3">{t('progress')}</th>
                  <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right pr-4 sm:pr-0 hidden xs:table-cell">{t('updated')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {commissionWorks.map((work) => (
                  <tr key={work.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 pl-4 sm:pl-0 max-w-[120px] sm:max-w-none">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex-shrink-0">
                          {work.imageUrl ? (
                            <button 
                              onClick={() => setViewingWorkImage(work.imageUrl || null)}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-zinc-200 hover:scale-105 transition-transform"
                            >
                              <img src={work.imageUrl} alt={work.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-300 border border-zinc-200">
                              <Layout size={14} className="sm:w-[16px] sm:h-[16px]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-[10px] sm:text-xs font-black text-zinc-900 truncate">{work.title}</h5>
                          {work.clientName && (
                            <p className="text-[8px] sm:text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate">
                              {work.clientName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[7px] sm:text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                        {work.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-1 bg-zinc-100 rounded-full overflow-hidden flex-1 max-w-[60px] sm:max-w-[120px]">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${work.progress}%` }}
                            className="h-full bg-blue-500"
                          />
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-black text-zinc-900">{work.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right pr-4 sm:pr-0 hidden xs:table-cell">
                      <span className="text-[9px] sm:text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                        {work.updatedAt?.toDate ? work.updatedAt.toDate().toLocaleDateString() : '...'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-3 sm:space-y-4">
        <AnimatePresence mode="popLayout">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl sm:rounded-[1.5rem] p-3 sm:px-4 sm:py-3 border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-500 group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={post.authorPhoto} 
                      alt={post.authorName} 
                      className="w-10 h-10 rounded-xl border-2 border-white shadow-md object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {post.authorPioneerNumber && (
                      <div className="absolute -top-1 -left-1 bg-blue-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-lg z-10">
                        {post.authorPioneerNumber}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-900 text-sm tracking-tight">{post.authorName}</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">
                      {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : '...'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-zinc-700 text-sm leading-relaxed mb-2 font-medium whitespace-pre-wrap">
                {post.content}
              </div>

              {post.type === 'commission' && (
                <div className="mb-2 bg-zinc-50 rounded-xl p-2 border border-zinc-100">
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <h5 className="text-sm font-black text-zinc-900 tracking-tight">{post.commissionTitle}</h5>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 rounded-md text-[10px] font-black uppercase tracking-widest">{post.commissionStatus}</span>
                        <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{post.commissionProgress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${post.commissionProgress}%` }}
                      className="h-full bg-zinc-900"
                    />
                  </div>
                </div>
              )}

              {post.imageUrl && (
                <div className="rounded-2xl overflow-hidden mb-2 border border-zinc-100 shadow-sm group/img relative">
                  <img 
                    src={post.imageUrl} 
                    alt="Post content" 
                    className="w-full h-auto max-h-[400px] object-cover group-hover/img:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors duration-700" />
                </div>
              )}

              <div className="flex items-center gap-6 pt-2 border-t border-zinc-50">
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

                <button 
                  onClick={() => setActivePostId(activePostId === post.id ? null : post.id)}
                  className={`flex items-center gap-2 transition-all text-xs font-black uppercase tracking-wider ${activePostId === post.id ? 'text-blue-500' : 'text-zinc-400 hover:text-blue-500'}`}
                >
                  <div className={`p-2 rounded-full transition-colors ${activePostId === post.id ? 'bg-blue-50' : 'hover:bg-blue-50'}`}>
                    <MessageCircle size={18} />
                  </div>
                  {post.comments || 0}
                </button>
              </div>

              {/* Comments Section */}
              <AnimatePresence>
                {activePostId === post.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 space-y-4">
                      {/* Comment Input */}
                      {user ? (
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img 
                              src={user.photoURL || ''} 
                              alt={user.displayName} 
                              className="w-8 h-8 rounded-xl object-cover border border-zinc-100"
                              referrerPolicy="no-referrer"
                            />
                            {profile?.pioneerNumber && (
                              <div className="absolute -top-1 -left-1 bg-blue-600 text-white text-[6px] font-black w-3 h-3 rounded-full flex items-center justify-center border border-white shadow-lg z-10">
                                {profile.pioneerNumber}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                              placeholder={t('addComment')}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              disabled={isPostingComment || !newCommentText.trim()}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-500 hover:text-blue-600 disabled:opacity-50"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-zinc-50 rounded-xl p-4 text-center">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t('loginToComment')}</p>
                        </div>
                      )}

                      {/* Comments List */}
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                        {postComments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 group">
                            <div className="relative">
                              <img 
                                src={comment.userPhoto} 
                                alt={comment.userName} 
                                className="w-8 h-8 rounded-xl object-cover border border-zinc-100"
                                referrerPolicy="no-referrer"
                              />
                              {comment.userPioneerNumber && (
                                <div className="absolute -top-1 -left-1 bg-blue-600 text-white text-[6px] font-black w-3 h-3 rounded-full flex items-center justify-center border border-white shadow-lg z-10">
                                  {comment.userPioneerNumber}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 bg-zinc-50 rounded-2xl p-3 relative">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-black text-zinc-900">{comment.userName}</span>
                                <span className="text-[8px] font-black text-zinc-300 uppercase">
                                  {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString() : '...'}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-600 leading-relaxed">{comment.content}</p>
                              {(user?.uid === comment.uid || user?.uid === artistUid || isAdmin) && (
                                <button 
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                  className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {postComments.length === 0 && (
                          <p className="text-center py-4 text-[10px] font-black text-zinc-300 uppercase tracking-widest">{t('noCommentsYet')}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
              className="bg-white w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className={`p-2 sm:p-3 flex items-center justify-between text-white flex-shrink-0 ${activeInfoModal === 'donate' ? 'bg-green-500' : 'bg-orange-500'}`}>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-widest flex items-center gap-2">
                  {showCommissionForm ? <Send size={16} /> : (activeInfoModal === 'donate' ? <DollarSign size={16} /> : <Briefcase size={16} />)}
                  {showCommissionForm ? t('submitCommission') : t(activeInfoModal as any)}
                </h3>
                <button onClick={() => {
                  setActiveInfoModal(null);
                  setShowCommissionForm(false);
                  setShowDonationForm(false);
                }} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-2 sm:p-3 overflow-y-auto no-scrollbar sm:scrollbar-thin scrollbar-thumb-zinc-200">
                {showCommissionForm ? (
                  <form onSubmit={handleSubmitCommission} className="space-y-4">
                    {submitSuccess ? (
                      <div className="text-center py-8 bg-green-50 rounded-3xl border-2 border-dashed border-green-200">
                        <p className="text-green-600 font-black uppercase tracking-widest">{t('commissionSubmitted')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('guestInfo')}</h4>
                          <div className="grid grid-cols-2 gap-3">
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

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('commissionRequest')}</h4>
                          <div className="space-y-0.5">
                            <label className="block text-[10px] font-bold text-zinc-700">{t('describeRequest')}</label>
                            <textarea 
                              required
                              value={requestDetails}
                              onChange={(e) => setRequestDetails(e.target.value)}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                              rows={4}
                              placeholder={t('requestDetailsPlaceholder')}
                            />
                          </div>
                        </div>

                        <button 
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3 sm:py-4 bg-orange-500 text-white rounded-full font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50"
                        >
                          {isSubmitting ? '...' : t('submitCommission')}
                        </button>
                      </>
                    )}
                  </form>
                ) : showDonationForm ? (
                  <form onSubmit={handlePostDonation} className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('leaveMessage')}</h4>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('yourName')}</label>
                        <input 
                          required
                          type="text"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('shareThoughts')}</label>
                        <textarea 
                          required
                          value={donorMessage}
                          onChange={(e) => setDonorMessage(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-500 transition-colors resize-none"
                          rows={3}
                          placeholder="Thank you for your support!"
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={isPostingDonation}
                      className="w-full py-3 sm:py-4 bg-green-500 text-white rounded-full font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Send size={18} />
                      {isPostingDonation ? '...' : t('postMessage')}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {(activeInfoModal === 'donate' ? artistProfile.donateInfo?.imageUrl : artistProfile.commissionInfo?.imageUrl) && (
                      <div className={`rounded-xl overflow-hidden border border-zinc-100 shadow-md ${activeInfoModal === 'donate' ? 'max-w-[70%] sm:max-w-[40%] mx-auto' : 'w-full'}`}>
                        <img 
                          src={activeInfoModal === 'donate' ? artistProfile.donateInfo?.imageUrl : artistProfile.commissionInfo?.imageUrl} 
                          alt={activeInfoModal || 'info'} 
                          className="w-full h-auto object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    {activeInfoModal === 'donate' && (
                      <button 
                        onClick={() => setShowDonationForm(true)}
                        className="w-full py-3 sm:py-4 bg-zinc-900 text-white rounded-full font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={18} />
                        {t('leaveMessage')}
                      </button>
                    )}
                    {activeInfoModal === 'commission' && (
                      <button 
                        onClick={() => setShowCommissionForm(true)}
                        className="w-full py-3 sm:py-4 bg-zinc-900 text-white rounded-full font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 flex items-center justify-center gap-2"
                      >
                        <Send size={18} />
                        {t('startNow')}
                      </button>
                    )}

                    {/* Donation Messages List */}
                    {activeInfoModal === 'donate' && donationMessages.length > 0 && (
                      <div className="pt-4 border-t border-zinc-100">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('donationMessages')}</h4>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar sm:scrollbar-thin scrollbar-thumb-zinc-200">
                          {donationMessages.map((msg) => (
                            <div key={msg.id} className="bg-zinc-50 rounded-xl p-3 border border-zinc-100 relative group">
                              <div className="flex justify-between items-start mb-0.5">
                                <span className="text-xs font-black text-zinc-900">{msg.donorName}</span>
                                <span className="text-[10px] font-black text-zinc-300 uppercase">
                                  {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleDateString() : '...'}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-600 leading-relaxed">{msg.message}</p>
                              {(user?.uid === artistUid || isAdmin) && (
                                <button 
                                  onClick={() => handleDeleteDonation(msg.id)}
                                  className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                  title={t('deleteMessage')}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {viewingWorkImage && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-zoom-out"
            onClick={() => setViewingWorkImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full h-full flex items-center justify-center"
            >
              <img 
                src={viewingWorkImage} 
                alt="Work preview" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setViewingWorkImage(null)}
                className="absolute top-4 right-4 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
              >
                <X size={24} />
              </button>
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
