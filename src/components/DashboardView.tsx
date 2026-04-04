import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  Star, 
  Eye, 
  Plus, 
  BookOpen, 
  ChevronRight,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { Comic, UserProfile, Following } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion } from 'motion/react';

export function DashboardView({ 
  user, 
  profile, 
  lang, 
  onUpload,
  onComicClick,
  onCreateArticle
}: { 
  user: any, 
  profile: UserProfile | null, 
  lang: Language,
  onUpload: () => void,
  onComicClick: (comic: Comic) => void,
  onCreateArticle: () => void
}) {
  const { t } = useTranslation(lang);
  const [myComics, setMyComics] = useState<Comic[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch user's comics
    const comicsQuery = query(
      collection(db, 'comics'),
      where('authorUid', '==', user.uid)
    );

    const unsubscribeComics = onSnapshot(comicsQuery, (snapshot) => {
      const comics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comic));
      setMyComics(comics);
      setLoading(false);
    });

    // Fetch follower count
    const followersQuery = query(
      collection(db, 'profiles', user.uid, 'followers') // Assuming followers are tracked here or globally
    );
    
    // Actually, based on App.tsx, following is in users/{uid}/following
    // To get followers of current user, we need to query all users' following or have a dedicated followers subcollection
    // Let's check if we have a followers subcollection in profiles
    const unsubscribeFollowers = onSnapshot(collection(db, 'profiles', user.uid, 'followers'), (snapshot) => {
      setFollowerCount(snapshot.size);
    });

    return () => {
      unsubscribeComics();
      unsubscribeFollowers();
    };
  }, [user]);

  const totalViews = myComics.reduce((acc, comic) => acc + (comic.views || 0), 0);
  const avgRating = myComics.length > 0 
    ? (myComics.reduce((acc, comic) => acc + (comic.rating || 0), 0) / myComics.length).toFixed(1)
    : '0.0';

  const stats = [
    { label: 'Total Views', value: totalViews.toLocaleString(), icon: <Eye size={20} />, color: 'bg-blue-500' },
    { label: 'Followers', value: followerCount.toLocaleString(), icon: <Users size={20} />, color: 'bg-green-500' },
    { label: 'Avg Rating', value: avgRating, icon: <Star size={20} />, color: 'bg-amber-500' },
    { label: 'My Comics', value: myComics.length.toString(), icon: <BookOpen size={20} />, color: 'bg-purple-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-3 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-3">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-zinc-900 uppercase">{t('dashboard')}</h2>
          </div>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Manage your creative empire</p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onUpload}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} />
            {t('upload')}
          </button>
          {profile?.role === 'admin' && (
            <button 
              onClick={onCreateArticle}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
            >
              <Plus size={18} />
              {t('createArticle')}
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-3 rounded-[24px] border border-zinc-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-4 text-white shadow-lg shadow-current/10`}>
              {stat.icon}
            </div>
            <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px] mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-zinc-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Comics List */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-500" />
              Comic Performance
            </h3>
          </div>

          <div className="space-y-2">
            {myComics.length > 0 ? (
              myComics.map((comic) => (
                <div 
                  key={comic.id}
                  onClick={() => onComicClick(comic)}
                  className="group bg-white p-2 rounded-2xl border border-zinc-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer flex items-center gap-4"
                >
                  <img 
                    src={comic.thumbnail} 
                    alt={comic.title} 
                    className="w-16 h-20 rounded-2xl object-cover shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-zinc-900 truncate group-hover:text-blue-500 transition-colors">{comic.title}</h4>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Eye size={14} />
                        <span className="text-xs font-bold">{(comic.views || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Star size={14} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold">{comic.rating || '0.0'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    {comic.genre.slice(0, 1).map(g => (
                      <span key={g} className="px-3 py-1 bg-zinc-50 text-zinc-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-100">
                        {g}
                      </span>
                    ))}
                  </div>
                  <ChevronRight size={20} className="text-zinc-300 group-hover:text-blue-500 transition-colors" />
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">No comics uploaded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Quick Tips */}
        <div className="space-y-3">
          <div className="bg-zinc-900 rounded-[32px] p-4 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">Creator Tips</h3>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <TrendingUp size={12} />
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    <span className="text-white font-bold">Consistency is key.</span> Try to upload chapters on a regular schedule to keep readers engaged.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <MessageSquare size={12} />
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    <span className="text-white font-bold">Engage with fans.</span> Replying to comments can boost your comic's popularity.
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="bg-blue-50 rounded-[32px] p-4 border border-blue-100">
            <h3 className="text-xl font-black uppercase tracking-tight text-blue-900 mb-2">{t('needHelp')}</h3>
            <p className="text-sm text-blue-700/70 mb-3 font-medium">{t('creatorHelpText')}</p>
            <div className="flex flex-col gap-2">
              <button className="w-full py-3 bg-white text-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs shadow-sm hover:shadow-md transition-all">
                {t('creatorGuide')}
              </button>
              <button 
                onClick={() => window.open('https://discord.gg/S2pabzV6', '_blank')}
                className="w-full py-3 bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all"
              >
                {t('joinDiscord')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
