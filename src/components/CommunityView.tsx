import React, { useState, useEffect } from 'react';
import { Send, Image as ImageIcon, Trash2, Heart, ArrowLeft, PenTool } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, limit, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Post, Comic } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';

export function CommunityView({ user, comics, lang, onBack, onArtistClick, onLogin }: { user: any, comics: Comic[], lang: Language, onBack: () => void, onArtistClick: (uid: string) => void, onLogin: () => void }) {
  const { t } = useTranslation(lang);
  const [posts, setPosts] = useState<Post[]>([]);
  const [topCreators, setTopCreators] = useState<{uid: string, name: string, photo: string, views: number}[]>([]);

  useEffect(() => {
    if (!comics || comics.length === 0) return;

    const authorViews: Record<string, {name: string, views: number}> = {};
    comics.forEach(comic => {
      if (!authorViews[comic.authorUid]) {
        authorViews[comic.authorUid] = { name: comic.authorName, views: 0 };
      }
      authorViews[comic.authorUid].views += comic.views;
    });

    const sortedAuthors = Object.entries(authorViews)
      .map(([uid, data]) => ({ uid, ...data }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const fetchPhotos = async () => {
      const creatorsWithPhotos = await Promise.all(sortedAuthors.map(async (author) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', author.uid));
          if (userDoc.exists()) {
            return { ...author, photo: userDoc.data().photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.uid}` };
          }
        } catch (e) {
          console.error("Error fetching user photo:", e);
        }
        return { ...author, photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.uid}` };
      }));
      setTopCreators(creatorsWithPhotos);
    };

    fetchPhotos();
  }, [comics]);

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

  const handleLike = async (postId: string) => {
    try {
      await updateDoc(doc(db, 'posts', postId), {
        likes: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Top Creators Section */}
      {topCreators.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-6 flex items-center gap-2">
            <div className="w-8 h-[1px] bg-zinc-200" />
            {t('topCreators')}
          </h3>
          <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
            {topCreators.map((creator, index) => (
              <motion.button
                key={creator.uid}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onArtistClick(creator.uid)}
                className="flex-shrink-0 group relative"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-[1.5rem] blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
                  <div className="relative bg-white p-1 rounded-[1.5rem] border border-zinc-100 shadow-sm group-hover:shadow-xl transition-all duration-500">
                    <img 
                      src={creator.photo} 
                      alt={creator.name} 
                      className="w-16 h-16 rounded-[1.25rem] object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-900 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                      {index + 1}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-[11px] font-black text-zinc-900 truncate w-20 tracking-tight group-hover:text-blue-500 transition-colors">
                    {creator.name}
                  </p>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">
                    {creator.views.toLocaleString()}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Dream World Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-2">{t('dreamWorld')}</h2>
        <div className="w-12 h-1.5 bg-blue-500 rounded-full" />
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
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => onArtistClick(post.authorUid)}>
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
                      <Trash2 size={18} />
                    </button>
                  )}
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
              <p className="text-zinc-500 font-medium">No posts in the community yet. Be the first to post!</p>
            </div>
          )}
        </div>
    </div>
  );
}
