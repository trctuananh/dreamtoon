import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Trash2, Heart, ArrowLeft, PenTool, X, Save, DollarSign, Briefcase, Upload, Camera, Share2, Copy, Check, MessageCircle, Plus, Layout } from 'lucide-react';
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp, updateDoc, increment, arrayUnion, arrayRemove, setDoc, limit, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, checkQuota } from '../firebase';
import { View, Post, UserProfile, Donation, CommissionWork, PostComment, CommissionRequest } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import { cn, compressImage, validateImage } from '../lib/utils';
import { ShareModal } from './ShareModal';

export function MyWallView({ 
  user, 
  profile, 
  lang, 
  onBack, 
  setView,
  onMessageClick,
  isQuotaExceeded
}: { 
  user: any, 
  profile: UserProfile | null, 
  lang: Language, 
  onBack: () => void, 
  setView: (v: View) => void,
  onMessageClick?: (target: UserProfile) => void,
  isQuotaExceeded?: boolean
}) {
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
  const [donationMessages, setDonationMessages] = useState<Donation[]>([]);
  const [commissionWorks, setCommissionWorks] = useState<CommissionWork[]>([]);
  const [isEditingWork, setIsEditingWork] = useState<string | null>(null); // ID of work being edited or 'new'
  const [workForm, setWorkForm] = useState({ title: '', clientName: '', status: '', progress: 0, imageUrl: '' as string | null });
  const [postType, setPostType] = useState<'twit' | 'commission'>('twit');
  const [selectedWorkId, setSelectedWorkId] = useState<string>('new');
  const infoFileInputRef = useRef<HTMLInputElement>(null);
  const workFileInputRef = useRef<HTMLInputElement>(null);
  const [viewingWorkImage, setViewingWorkImage] = useState<string | null>(null);
  const [commissionRequests, setCommissionRequests] = useState<CommissionRequest[]>([]);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [commissionTab, setCommissionTab] = useState<'info' | 'requests'>('info');

  // Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '' });
  const [copied, setCopied] = useState(false);

  // Comment State
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<PostComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const lastActionTimeRef = React.useRef<number>(0);
  const ACTION_THROTTLE = 3000;

  useEffect(() => {
    if (!user || isQuotaExceeded) return;
    
    // Simple query to avoid composite index
    const q = query(
      collection(db, 'posts'),
      where('authorUid', '==', user.uid),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      // Memory sort
      setPosts(newPosts.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, [user, isQuotaExceeded]);

  useEffect(() => {
    if (!user || isQuotaExceeded) return;
    
    const q = query(
      collection(db, 'donations'),
      where('artistUid', '==', user.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newDonations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Donation[];
      
      // Memory sort
      setDonationMessages(newDonations.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'donations');
    });

    return () => unsubscribe();
  }, [user, isQuotaExceeded]);

  useEffect(() => {
    if (!user || isQuotaExceeded) return;
    const q = query(
      collection(db, 'users', user.uid, 'commissions'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newWorks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommissionWork[];
      setCommissionWorks(newWorks);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/commissions`);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || isQuotaExceeded) return;
    
    const q = query(
      collection(db, 'commissions'),
      where('artistUid', '==', user.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommissionRequest[];
      
      // Memory sort
      setCommissionRequests(requests.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'commissions');
    });

    return () => unsubscribe();
  }, [user, isQuotaExceeded]);

  useEffect(() => {
    if (!activePostId || isQuotaExceeded) {
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, target: 'post' | 'info' | 'work') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert(lang === 'vi' ? 'Chỉ chấp nhận file ảnh (JPEG, PNG, WEBP)' : 'Only image files are accepted (JPEG, PNG, WEBP)');
      return;
    }

    try {
      // Validate size (5MB for posts, 20MB for others)
      const maxSize = target === 'post' ? 5 : 20;
      const validation = await validateImage(file, maxSize);
      
      if (!validation.valid) {
        alert(validation.error || (lang === 'vi' ? 'Ảnh không hợp lệ' : 'Invalid image'));
        return;
      }

      // Compress image before setting state
      // High quality for commission info and works
      const maxWidth = target === 'post' ? 1600 : 1200;
      const quality = target === 'post' ? 0.8 : 0.85;
      const compressed = await compressImage(file, maxWidth, quality);
      
      if (target === 'post') {
        setSelectedImage(compressed);
      } else if (target === 'info') {
        setInfoImage(compressed);
      } else {
        setWorkForm(prev => ({ ...prev, imageUrl: compressed }));
      }
    } catch (error) {
      console.error('Image compression failed:', error);
      // Fallback to reader if compression fails, but still respect size/type validation ABOVE
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (target === 'post') {
          setSelectedImage(base64);
        } else if (target === 'info') {
          setInfoImage(base64);
        } else {
          setWorkForm(prev => ({ ...prev, imageUrl: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
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
        authorPioneerNumber: profile?.pioneerNumber || null,
        content: content.trim(),
        imageUrl: selectedImage,
        type: 'twit',
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
      const updateData: any = {
        [field]: {
          text: infoText,
          imageUrl: infoImage
        }
      };

      await updateDoc(doc(db, 'users', user.uid), {
        ...updateData
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
    setConfirmModal({
      isOpen: true,
      title: t('delete'),
      message: t('confirmDelete'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'posts', postId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
        }
      }
    });
  };

  const handleDeleteDonation = async (donationId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('delete'),
      message: t('confirmDeleteMessage'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'donations', donationId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `donations/${donationId}`);
        }
      }
    });
  };

  const handleDeleteCommissionRequest = async (requestId: string) => {
    if (!requestId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'commissions', requestId));
      setRequestToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `commissions/${requestId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChat = async (guestUid: string, guestName: string) => {
    if (!onMessageClick) return;
    
    try {
      const guestDoc = await getDoc(doc(db, 'profiles', guestUid));
      if (guestDoc.exists()) {
        onMessageClick(guestDoc.data() as UserProfile);
      } else {
        // Fallback if profile doesn't exist yet
        onMessageClick({
          uid: guestUid,
          displayName: guestName,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestUid}`,
          email: ''
        } as UserProfile);
      }
    } catch (error) {
      console.error("Error opening chat:", error);
    }
  };

  const handleSaveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !workForm.title || !workForm.status) return;

    try {
      const workData = {
        artistUid: user.uid,
        title: workForm.title,
        clientName: workForm.clientName,
        status: workForm.status,
        progress: Number(workForm.progress),
        imageUrl: workForm.imageUrl,
        updatedAt: serverTimestamp(),
        order: isEditingWork === 'new' ? commissionWorks.length : commissionWorks.find(w => w.id === isEditingWork)?.order || 0
      };

      if (isEditingWork === 'new') {
        await addDoc(collection(db, 'users', user.uid, 'commissions'), workData);
      } else if (isEditingWork) {
        await updateDoc(doc(db, 'users', user.uid, 'commissions', isEditingWork), workData);
      }
      setIsEditingWork(null);
      setWorkForm({ title: '', clientName: '', status: '', progress: 0, imageUrl: null });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/commissions`);
    }
  };

  const handleDeleteWork = async (workId: string) => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      title: t('deleteWork'),
      message: t('confirmDeleteWork'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'commissions', workId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/commissions/${workId}`);
        }
      }
    });
  };

  const handleLike = async (post: Post) => {
    if (!user || post.likedBy?.includes(user.uid) || checkQuota()) return;

    const now = Date.now();
    if (now - lastActionTimeRef.current < ACTION_THROTTLE) return;
    lastActionTimeRef.current = now;

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
    if (!user || !post.likedBy?.includes(user.uid) || checkQuota()) return;

    const now = Date.now();
    if (now - lastActionTimeRef.current < ACTION_THROTTLE) return;
    lastActionTimeRef.current = now;

    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likes: increment(-1),
        likedBy: arrayRemove(user.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !newCommentText.trim() || checkQuota()) return;

    const now = Date.now();
    if (now - lastActionTimeRef.current < ACTION_THROTTLE) return;
    lastActionTimeRef.current = now;

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
      
      // No notification if artist comments on their own post
      // But if it's someone else's post (not applicable here in MyWallView)

      setNewCommentText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/comments`);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('delete'),
      message: t('confirmDeleteComment'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
          await updateDoc(doc(db, 'posts', postId), {
            comments: increment(-1)
          });
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
        }
      }
    });
  };

  const wallUrl = `https://dreamtoon.vn/${profile?.handle || user.uid}`;
  
  const handleShareWall = () => {
    setShareData({
      url: wallUrl,
      title: profile?.displayName || user.displayName || 'Author'
    });
    setShowShareModal(true);
  };

  const handleSharePost = (post: Post) => {
    const postUrl = `https://dreamtoon.vn/post/${post.id}`;
    setShareData({
      url: postUrl,
      title: post.content.substring(0, 100)
    });
    setShowShareModal(true);
  };

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-2xl lg:max-w-4xl">
      <div className="flex flex-col gap-6 mb-6 sm:mb-8">
        <div className="flex items-center justify-end">
          <div className="flex gap-2">
            <button 
              onClick={() => openInfoModal('donate')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
            >
              <DollarSign size={14} />
              <span>{t('donate')}</span>
            </button>
            <button 
              onClick={() => openInfoModal('commission')}
              className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 text-center"
            >
              <span>{t('commission')}</span>
            </button>
            <button 
              onClick={handleShareWall}
              className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-all"
              title={t('share')}
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Commission Progress Timeline */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-zinc-100 shadow-sm mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Layout size={18} className="text-zinc-400" />
            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest">{t('commissionProgress')}</h4>
          </div>
          <button 
            onClick={() => {
              setIsEditingWork('new');
              setWorkForm({ title: '', clientName: '', status: '', progress: 0, imageUrl: null });
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
          >
            <Plus size={14} />
            <span>{t('addWork')}</span>
          </button>
        </div>

        {isEditingWork && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-zinc-50 p-6 rounded-2xl border border-zinc-200"
          >
            <form onSubmit={handleSaveWork} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">{t('workTitle')}</label>
                  <input 
                    required
                    value={workForm.title}
                    onChange={e => setWorkForm({...workForm, title: e.target.value})}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">{t('clientName')}</label>
                  <input 
                    value={workForm.clientName}
                    onChange={e => setWorkForm({...workForm, clientName: e.target.value})}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">{t('status')}</label>
                  <input 
                    required
                    value={workForm.status}
                    onChange={e => setWorkForm({...workForm, status: e.target.value})}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">{t('progress')} (%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={workForm.progress}
                    onChange={e => setWorkForm({...workForm, progress: Number(e.target.value)})}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">{t('workImage') || 'Work Image'}</label>
                <div className="flex items-center gap-4">
                  {workForm.imageUrl && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 flex-shrink-0">
                      <img src={workForm.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <input
                    type="file"
                    ref={workFileInputRef}
                    onChange={(e) => handleImageSelect(e, 'work')}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => workFileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-zinc-200 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all"
                  >
                    <Upload size={14} />
                    {t('upload')}
                  </button>
                  {workForm.imageUrl && (
                    <button 
                      type="button"
                      onClick={() => setWorkForm(prev => ({ ...prev, imageUrl: null }))}
                      className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsEditingWork(null)}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                >
                  {t('saveWork')}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          {commissionWorks.length === 0 ? (
            <div className="text-center py-8 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{t('noProgress')}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-4 sm:pl-0">{t('work')}</th>
                  <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('status')}</th>
                  <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest w-1/4">{t('progress')}</th>
                  <th className="pb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right pr-4 sm:pr-0">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {commissionWorks.map((work) => (
                  <tr key={work.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 pl-4 sm:pl-0 max-w-[100px] sm:max-w-none">
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
                              <ImageIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-[10px] sm:text-xs font-black text-zinc-900 truncate">{work.title}</h5>
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
                        <div className="h-1 bg-zinc-100 rounded-full overflow-hidden flex-1 max-w-[50px] sm:max-w-[100px]">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${work.progress}%` }}
                            className="h-full bg-blue-500"
                          />
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-black text-zinc-900">{work.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right pr-4 sm:pr-0">
                      <div className="flex items-center justify-end gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setIsEditingWork(work.id);
                            setWorkForm({ title: work.title, clientName: work.clientName || '', status: work.status, progress: work.progress, imageUrl: work.imageUrl || null });
                          }}
                          className="p-1 sm:p-1.5 text-zinc-300 hover:text-zinc-900 hover:bg-white rounded-lg transition-all"
                        >
                          <PenTool size={12} className="sm:w-[14px] sm:h-[14px]" />
                        </button>
                        <button 
                          onClick={() => handleDeleteWork(work.id)}
                          className="p-1 sm:p-1.5 text-zinc-300 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 size={12} className="sm:w-[14px] sm:h-[14px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Post Form */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-zinc-100 shadow-sm mb-6 sm:mb-8">
        <form onSubmit={handlePost}>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-shrink-0">
              <img 
                src={profile?.photoURL || user.photoURL || undefined} 
                alt={user.displayName || ''} 
                className="w-14 h-14 rounded-xl border-2 border-blue-500 aspect-square object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
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
              <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
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
                  <Trash2 size={16} />
                </button>
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
                  className={`flex items-center gap-2 transition-all text-xs font-black uppercase tracking-wider ${post.likedBy?.includes(user.uid) ? 'text-red-500' : 'text-zinc-400 hover:text-red-500'}`}
                >
                  <div className={`p-2 rounded-full transition-colors ${post.likedBy?.includes(user.uid) ? 'bg-red-50' : 'hover:bg-red-50'}`}>
                    <Heart size={18} fill={post.likedBy?.includes(user.uid) ? "currentColor" : "none"} />
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

                <button 
                  onClick={() => handleSharePost(post)}
                  className="flex items-center gap-2 transition-all text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-blue-400"
                >
                  <div className="p-2 rounded-full transition-colors hover:bg-zinc-50">
                    <Share2 size={18} />
                  </div>
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
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img 
                            src={profile?.photoURL || user.photoURL || undefined} 
                            alt={profile?.displayName || user.displayName} 
                            className="w-8 h-8 rounded-xl object-cover border border-zinc-100"
                            referrerPolicy="no-referrer"
                          />
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

                      {/* Comments List */}
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                        {postComments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 group">
                            <img 
                              src={comment.userPhoto} 
                              alt={comment.userName} 
                              className="w-8 h-8 rounded-xl object-cover border border-zinc-100"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 bg-zinc-50 rounded-2xl p-3 relative">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-black text-zinc-900">{comment.userName}</span>
                                <span className="text-[8px] font-black text-zinc-300 uppercase">
                                  {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString() : '...'}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-600 leading-relaxed">{comment.content}</p>
                              {(user?.uid === comment.uid || user?.uid === post.authorUid) && (
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
              className="bg-white w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className={`p-2 sm:p-3 flex items-center justify-between text-white flex-shrink-0 ${activeInfoModal === 'donate' ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                <div className="flex items-center gap-3">
                  <img 
                    src={profile?.photoURL || user.photoURL || undefined} 
                    alt={user.displayName || ''} 
                    className="w-8 h-8 rounded-lg border border-white/30 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex flex-col">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest leading-none">
                      {t(activeInfoModal as any)}
                    </h3>
                    <span className="text-[8px] font-bold opacity-70 uppercase tracking-tighter">@{profile?.handle || user.uid.slice(0, 6)}</span>
                  </div>
                  {activeInfoModal === 'commission' && (
                    <div className="flex bg-white/20 rounded-xl p-1 ml-2">
                      <button 
                        onClick={() => setCommissionTab('info')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${commissionTab === 'info' ? 'bg-white text-orange-500 shadow-sm' : 'text-white hover:bg-white/10'}`}
                      >
                        {t('info')}
                      </button>
                      <button 
                        onClick={() => setCommissionTab('requests')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative ${commissionTab === 'requests' ? 'bg-white text-orange-500 shadow-sm' : 'text-white hover:bg-white/10'}`}
                      >
                        {t('requests')}
                        {commissionRequests.filter(r => r.status === 'pending').length > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => setActiveInfoModal(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-2 sm:p-3 overflow-y-auto no-scrollbar sm:scrollbar-thin scrollbar-thumb-zinc-200">
                {activeInfoModal === 'commission' && commissionTab === 'requests' ? (
                  <div className="space-y-4">
                    {commissionRequests.length > 0 ? (
                      <div className="space-y-3">
                        {commissionRequests.map((req) => (
                          <div key={req.id} className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 relative group">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={req.guestPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.guestName)}&background=random`} 
                                  alt={req.guestName} 
                                  className="w-10 h-10 rounded-xl object-cover border border-zinc-200"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <h4 className="text-xs font-black text-zinc-900">{req.guestName}</h4>
                                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{req.guestEmail}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                req.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                req.status === 'accepted' ? 'bg-emerald-100 text-emerald-600' :
                                req.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                'bg-zinc-100 text-zinc-600'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-600 leading-relaxed mb-4 italic">"{req.requestDetails}"</p>
                             <div className="flex gap-2">
                              {req.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={async () => {
                                      await updateDoc(doc(db, 'commissions', req.id), { status: 'accepted' });
                                    }}
                                    className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                  >
                                    {t('accept')}
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      await updateDoc(doc(db, 'commissions', req.id), { status: 'rejected' });
                                    }}
                                    className="flex-1 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                  >
                                    {t('reject')}
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={() => handleOpenChat(req.guestUid, req.guestName)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                                title={t('message')}
                              >
                                <MessageCircle size={16} />
                              </button>
                              <button 
                                onClick={() => setRequestToDelete(req.id)}
                                className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                                title={t('delete')}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <p className="mt-3 text-[8px] font-black text-zinc-300 uppercase text-right">
                              {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : '...'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                        <Briefcase size={32} className="mx-auto text-zinc-300 mb-2" />
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">{t('noRequests')}</p>
                      </div>
                    )}
                  </div>
                ) : isEditingInfo ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">{t('infoText')}</label>
                      <textarea
                        value={infoText}
                        onChange={(e) => setInfoText(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        rows={4}
                        placeholder={activeInfoModal === 'donate' ? t('donateInfo') : t('commissionInfo')}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">{t('infoImageUrl')}</label>
                      <div className="flex items-center gap-3">
                        {infoImage && (
                          <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-100 flex-shrink-0">
                            <img src={infoImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-100 text-zinc-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                        >
                          <Upload size={16} />
                          {t('upload')}
                        </button>
                        {infoImage && (
                          <button 
                            type="button"
                            onClick={() => setInfoImage(null)}
                            className="p-2.5 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSaveInfo}
                        disabled={isSavingInfo}
                        className="flex-1 bg-zinc-900 text-white py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                      >
                        <Save size={16} />
                        {isSavingInfo ? '...' : t('saveInfo')}
                      </button>
                      <button
                        onClick={() => setIsEditingInfo(false)}
                        className="px-6 py-2.5 bg-zinc-100 text-zinc-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {infoImage && (
                      <div className={`rounded-xl overflow-hidden border border-zinc-100 shadow-md ${activeInfoModal === 'donate' ? 'max-w-[70%] sm:max-w-[40%] mx-auto' : 'w-full'}`}>
                        <img 
                          src={infoImage} 
                          alt={activeInfoModal} 
                          className="w-full h-auto object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    {infoText && (
                      <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                        <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">{infoText}</p>
                      </div>
                    )}
                    <button
                      onClick={() => setIsEditingInfo(true)}
                      className="w-full py-3 bg-zinc-100 text-zinc-900 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                    >
                      <PenTool size={16} />
                      {activeInfoModal === 'donate' ? t('editDonate') : t('editCommission')}
                    </button>

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
                              <button 
                                onClick={() => handleDeleteDonation(msg.id)}
                                className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                title={t('deleteMessage')}
                              >
                                <Trash2 size={14} />
                              </button>
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
      <ShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareData.url}
        title={shareData.title}
        lang={lang}
      />

      {/* Delete Commission Request Confirmation Modal */}
      <AnimatePresence>
        {requestToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl p-6"
            >
              <h3 className="text-xl font-black text-zinc-900 mb-2 uppercase tracking-tight">{t('delete') || 'Delete'}?</h3>
              <p className="text-sm text-zinc-500 mb-6">{t('confirmDeleteRequest') || 'Are you sure you want to delete this commission request?'}</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setRequestToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={() => handleDeleteCommissionRequest(requestToDelete)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {isDeleting ? t('uploading') : t('delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generic Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl p-6"
            >
              <h3 className="text-xl font-black text-zinc-900 mb-2 uppercase tracking-tight">{confirmModal.title}</h3>
              <p className="text-sm text-zinc-500 mb-6">{confirmModal.message}</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  {t('delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
