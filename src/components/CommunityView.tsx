import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Heart, PenTool, MessageCircle, Send, Share2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, limit, updateDoc, increment, arrayUnion, arrayRemove, addDoc, serverTimestamp, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, createNotification, checkQuota } from '../firebase';
import { View, Post, Comic, Following, UserProfile } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import { ShareModal } from './ShareModal';

export function CommunityView({ user, isAdmin, comics, following = [], lang, searchQuery = '', onBack, onArtistClick, onLogin, setView, onMessageClick, isQuotaExceeded, sharedPostId, onPostHandled }: { user: any, isAdmin: boolean, comics: Comic[], following?: Following[], lang: Language, searchQuery?: string, onBack: () => void, onArtistClick: (uid: string) => void, onLogin: () => void, setView: (v: View) => void, onMessageClick?: (target: UserProfile) => void, isQuotaExceeded?: boolean, sharedPostId?: string | null, onPostHandled?: () => void }) {
  const { t } = useTranslation(lang);
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedTab, setFeedTab] = useState<'all' | 'following'>('all');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const lastActionTimeRef = useRef<number>(0);
  const ACTION_THROTTLE = 3000;
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '' });

  // Profile Fetch (One-time)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }
      try {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setProfile(docSnap.data());
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, [user]);

  // Comments Fetch (One-time when activePostId changes)
  useEffect(() => {
    if (!activePostId || isQuotaExceeded) {
      setPostComments([]);
      return;
    }
    const fetchComments = async () => {

      try {
        const q = query(
          collection(db, 'posts', activePostId, 'comments'),
          orderBy('createdAt', 'asc')
        );
        const snapshot = await getDocs(q);
        setPostComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `posts/${activePostId}/comments`);
      }
    };
    fetchComments();
  }, [activePostId]);

  // Search filtering for posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery.trim() || 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = feedTab === 'all' || (
      following.some(f => f.type === 'artist' && f.targetId === post.authorUid)
    );

    return matchesSearch && matchesTab;
  });

  // Posts Fetch (One-time)
  useEffect(() => {
    if (isQuotaExceeded) return;
    const fetchPosts = async () => {
      try {
        const q = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const newPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        setPosts(newPosts);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'posts');
      }
    };
    fetchPosts();
  }, []);

  // Shared Post Handling
  useEffect(() => {
    if (sharedPostId && posts.length > 0) {
      const timer = setTimeout(() => {
        const postElement = document.getElementById(`post-${sharedPostId}`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setActivePostId(sharedPostId);
          onPostHandled?.();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sharedPostId, posts, onPostHandled]);

  const handleDelete = async (postId: string) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleLike = async (post: Post) => {
    if (!user) {
      onLogin();
      return;
    }
    if (post.likedBy?.includes(user.uid) || checkQuota()) return;

    const now = Date.now();
    if (now - lastActionTimeRef.current < ACTION_THROTTLE) return;
    lastActionTimeRef.current = now;
    
    try {
      const batch = writeBatch(db);
      const postRef = doc(db, 'posts', post.id);
      
      batch.update(postRef, {
        likes: increment(1),
        likedBy: arrayUnion(user.uid)
      });

      // Notify author
      if (user.uid !== post.authorUid) {
        const notifRef = doc(collection(db, 'users', post.authorUid, 'notifications'));
        batch.set(notifRef, {
          recipientId: post.authorUid,
          senderId: user.uid,
          senderName: profile?.displayName || user.displayName || 'Anonymous',
          senderPhoto: profile?.photoURL || user.photoURL || '',
          type: 'like',
          targetId: post.id,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
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
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const batch = writeBatch(db);
      const commentRef = doc(collection(db, 'posts', postId, 'comments'));
      
      batch.set(commentRef, {
        uid: user.uid,
        userName: profile?.displayName || user.displayName || 'Anonymous',
        userPhoto: profile?.photoURL || user.photoURL || '',
        userPioneerNumber: profile?.pioneerNumber || null,
        content: newCommentText.trim(),
        createdAt: serverTimestamp()
      });

      batch.update(doc(db, 'posts', postId), {
        comments: increment(1)
      });

      // Notify author
      if (user.uid !== post.authorUid) {
        const notifRef = doc(collection(db, 'users', post.authorUid, 'notifications'));
        batch.set(notifRef, {
          recipientId: post.authorUid,
          senderId: user.uid,
          senderName: profile?.displayName || user.displayName || 'Anonymous',
          senderPhoto: profile?.photoURL || user.photoURL || '',
          type: 'comment',
          targetId: postId,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
      setNewCommentText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/comments`);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
      await updateDoc(doc(db, 'posts', postId), {
        comments: increment(-1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
    }
  };

  const handleSharePost = (post: Post) => {
    // Generate the canonical share link as requested
    const shareUrl = `https://dreamtoon.vn/post/${post.id}`;
    setShareData({
      url: shareUrl,
      title: post.content.substring(0, 100)
    });
    setShowShareModal(true);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl lg:max-w-4xl">
      {/* Dream World Section */}
      <div className="mb-6 border-b border-zinc-100">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => setFeedTab('all')}
            className={`pb-4 text-xl sm:text-3xl font-black tracking-tight transition-all relative ${feedTab === 'all' ? 'text-zinc-900' : 'text-zinc-300 hover:text-zinc-400'}`}
          >
            {t('dreamWorld')}
            {feedTab === 'all' && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" 
              />
            )}
          </button>
          <button 
            onClick={() => {
              if (!user) {
                onLogin();
                return;
              }
              setFeedTab('following');
            }}
            className={`pb-4 text-xl sm:text-3xl font-black tracking-tight transition-all relative ${feedTab === 'following' ? 'text-zinc-900' : 'text-zinc-300 hover:text-zinc-400'}`}
          >
            {t('following')}
            {feedTab === 'following' && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" 
              />
            )}
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                id={`post-${post.id}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[1.5rem] p-3 sm:px-4 sm:py-3 border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-500 group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => onArtistClick(post.authorUid)}>
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
                      <h4 className="font-black text-zinc-900 text-sm tracking-tight hover:text-blue-500 transition-colors">{post.authorName}</h4>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">
                        {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : '...'}
                      </p>
                    </div>
                  </div>
                  {user && (user.uid === post.authorUid || isAdmin) && (
                    <button 
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all sm:opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
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
                        {user ? (
                          <div className="flex items-center gap-3">
                            <img 
                              src={user.photoURL || undefined} 
                              alt={user.displayName} 
                              className="w-8 h-8 rounded-xl object-cover border border-zinc-100"
                              referrerPolicy="no-referrer"
                            />
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
                            <div key={comment.id} className="flex gap-3 group/comment">
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
                                {(user?.uid === comment.uid || user?.uid === post.authorUid || isAdmin) && (
                                  <button 
                                    onClick={() => handleDeleteComment(post.id, comment.id)}
                                    className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 sm:opacity-0 group-hover/comment:opacity-100 transition-all"
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

          {filteredPosts.length === 0 && (
            <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
              <PenTool size={48} className="mx-auto text-zinc-300 mb-4" />
              <p className="text-zinc-500 font-medium">
                {feedTab === 'all' 
                  ? 'No posts in the community yet. Be the first to post!' 
                  : 'No posts from artists you follow yet.'}
              </p>
            </div>
          )}
        </div>

        <ShareModal 
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          shareUrl={shareData.url}
          title={shareData.title}
          lang={lang}
        />
    </div>
  );
}
