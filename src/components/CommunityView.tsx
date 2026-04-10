import React, { useState, useEffect } from 'react';
import { Trash2, Heart, PenTool } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, limit, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, createNotification } from '../firebase';
import { View, Post, Comic, Following } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';

export function CommunityView({ user, comics, following = [], lang, searchQuery = '', onBack, onArtistClick, onLogin, setView }: { user: any, comics: Comic[], following?: Following[], lang: Language, searchQuery?: string, onBack: () => void, onArtistClick: (uid: string) => void, onLogin: () => void, setView: (v: View) => void }) {
  const { t } = useTranslation(lang);
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedTab, setFeedTab] = useState<'all' | 'following'>('all');

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

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
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
  }, []);

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
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likes: increment(1)
      });

      // Notify author
      if (user.uid !== post.authorUid) {
        createNotification({
          recipientId: post.authorUid,
          type: 'like',
          targetId: post.id,
          senderId: user.uid,
          senderName: user.displayName || 'Anonymous',
          senderPhoto: user.photoURL || ''
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
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
                      {post.authorPioneerNumber && (
                        <div className="absolute -top-1 -left-1 bg-blue-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-lg z-10">
                          {post.authorPioneerNumber}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    </div>
                    <div>
                      <h4 className="font-black text-zinc-900 text-sm tracking-tight hover:text-blue-500 transition-colors">{post.authorName}</h4>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">
                        {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : '...'}
                      </p>
                    </div>
                  </div>
                  {user && user.uid === post.authorUid && (
                    <button 
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
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
    </div>
  );
}
