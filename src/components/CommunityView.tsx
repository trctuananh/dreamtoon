import React, { useState, useEffect } from 'react';
import { Send, Image as ImageIcon, Trash2, Heart, ArrowLeft, PenTool, Crown } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, limit, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { View, Post, Comic } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';

export function CommunityView({ user, comics, lang, onBack, onArtistClick, onLogin, setView }: { user: any, comics: Comic[], lang: Language, onBack: () => void, onArtistClick: (uid: string) => void, onLogin: () => void, setView: (v: View) => void }) {
  const { t } = useTranslation(lang);
  const [posts, setPosts] = useState<Post[]>([]);
  const [topCreators, setTopCreators] = useState<{uid: string, name: string, photo: string, views: number}[]>([]);
  const [topMonthCreators, setTopMonthCreators] = useState<{uid: string, name: string, photo: string, views: number}[]>([]);
  const [newCreators, setNewCreators] = useState<{uid: string, name: string, photo: string, views: number}[]>([]);
  const [rankingTab, setRankingTab] = useState<'month' | 'all' | 'new'>('month');

  useEffect(() => {
    if (!comics || comics.length === 0) return;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const authorViewsAllTime: Record<string, {name: string, views: number}> = {};
    const authorViewsMonth: Record<string, {name: string, views: number}> = {};
    const authorFirstComicDate: Record<string, {name: string, firstDate: Date, views: number}> = {};

    comics.forEach(comic => {
      // All Time
      if (!authorViewsAllTime[comic.authorUid]) {
        authorViewsAllTime[comic.authorUid] = { name: comic.authorName, views: 0 };
      }
      authorViewsAllTime[comic.authorUid].views += comic.views;

      // Month (approximate by comic creation date)
      const createdAt = comic.createdAt?.toDate ? comic.createdAt.toDate() : new Date(comic.createdAt);
      if (createdAt > thirtyDaysAgo) {
        if (!authorViewsMonth[comic.authorUid]) {
          authorViewsMonth[comic.authorUid] = { name: comic.authorName, views: 0 };
        }
        authorViewsMonth[comic.authorUid].views += comic.views;
      }

      // New Artists
      if (!authorFirstComicDate[comic.authorUid]) {
        authorFirstComicDate[comic.authorUid] = { name: comic.authorName, firstDate: createdAt, views: 0 };
      } else if (createdAt < authorFirstComicDate[comic.authorUid].firstDate) {
        authorFirstComicDate[comic.authorUid].firstDate = createdAt;
      }
      authorFirstComicDate[comic.authorUid].views += comic.views;
    });

    const sortedAllTime = Object.entries(authorViewsAllTime)
      .map(([uid, data]) => ({ uid, ...data }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const sortedMonth = Object.entries(authorViewsMonth)
      .map(([uid, data]) => ({ uid, ...data }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const sortedNew = Object.entries(authorFirstComicDate)
      .map(([uid, data]) => ({ uid, ...data }))
      .sort((a, b) => b.firstDate.getTime() - a.firstDate.getTime())
      .slice(0, 5);

    const fetchPhotos = async (authors: any[]) => {
      return await Promise.all(authors.map(async (author) => {
        try {
          const userDoc = await getDoc(doc(db, 'profiles', author.uid));
          if (userDoc.exists()) {
            return { ...author, photo: userDoc.data().photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.uid}` };
          }
        } catch (e) {
          console.error("Error fetching user photo:", e);
        }
        return { ...author, photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.uid}` };
      }));
    };

    const loadAll = async () => {
      const [allTime, month, newArtists] = await Promise.all([
        fetchPhotos(sortedAllTime),
        fetchPhotos(sortedMonth),
        fetchPhotos(sortedNew)
      ]);
      setTopCreators(allTime);
      setTopMonthCreators(month);
      setNewCreators(newArtists);
    };

    loadAll();
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

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-400 text-white shadow-yellow-400/50 scale-110 ring-2 ring-yellow-200";
      case 1: return "bg-zinc-300 text-white shadow-zinc-300/50 scale-105 ring-2 ring-zinc-100";
      case 2: return "bg-orange-400 text-white shadow-orange-400/50 ring-2 ring-orange-100";
      default: return "bg-zinc-900 text-white border-2 border-white";
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown size={10} className="mb-0.5" />;
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Ranking Tabs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <button
          onClick={() => setRankingTab('month')}
          className={`py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${
            rankingTab === 'month' 
            ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/20' 
            : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200'
          }`}
        >
          {t('topMonth')}
        </button>
        <button
          onClick={() => setRankingTab('all')}
          className={`py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${
            rankingTab === 'all' 
            ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/20' 
            : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200'
          }`}
        >
          {t('topAllTime')}
        </button>
        <button
          onClick={() => setRankingTab('new')}
          className={`py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${
            rankingTab === 'new' 
            ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/20' 
            : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200'
          }`}
        >
          {t('newArtist') || 'New Artist'}
        </button>
      </div>

      {/* Top Creators Display */}
      {(rankingTab === 'month' ? topMonthCreators : rankingTab === 'all' ? topCreators : newCreators).length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-6 overflow-x-auto pt-3 pb-2 no-scrollbar">
            {(rankingTab === 'month' ? topMonthCreators : rankingTab === 'all' ? topCreators : newCreators).map((creator, index) => (
              <motion.button
                key={`${rankingTab}-${creator.uid}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onArtistClick(creator.uid)}
                className="flex-shrink-0 group relative"
              >
                <div className="relative">
                  <div className={`absolute inset-0 rounded-[1.5rem] blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500 bg-gradient-to-br ${
                    index === 0 ? 'from-yellow-400 to-orange-500' : 
                    index === 1 ? 'from-zinc-300 to-zinc-500' :
                    index === 2 ? 'from-orange-400 to-orange-700' :
                    'from-blue-500 to-purple-500'
                  }`} />
                  <div className={`relative bg-white p-1 rounded-[1.5rem] border transition-all duration-500 ${
                    index === 0 ? 'border-yellow-100 shadow-yellow-100/50 group-hover:shadow-yellow-400/30' :
                    index === 1 ? 'border-zinc-100 shadow-zinc-100/50 group-hover:shadow-zinc-300/30' :
                    index === 2 ? 'border-orange-100 shadow-orange-100/50 group-hover:shadow-orange-400/30' :
                    'border-zinc-100 shadow-sm group-hover:shadow-xl'
                  }`}>
                    <img 
                      src={creator.photo} 
                      alt={creator.name} 
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1rem] sm:rounded-[1.25rem] object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute -top-2 -right-2 sm:-top-3 sm:-right-3 min-w-[24px] sm:min-w-[28px] h-6 sm:h-7 px-1 text-[9px] sm:text-[11px] font-black rounded-full flex flex-col items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110 ${getRankStyle(index)}`}>
                      {getRankIcon(index)}
                      {index + 1}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-[9px] sm:text-[11px] font-black text-zinc-900 truncate w-16 sm:w-20 tracking-tight group-hover:text-blue-500 transition-colors">
                    {creator.name}
                  </p>
                  <p className="text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">
                    {creator.views.toLocaleString()}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Dream World Section */}
      <div className="mb-4">
        <h2 className="text-xl sm:text-3xl font-black tracking-tight text-zinc-900 mb-1 sm:mb-2">{t('dreamWorld')}</h2>
        <div className="w-12 h-1 bg-blue-500 rounded-full" />
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
