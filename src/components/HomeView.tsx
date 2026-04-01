import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ArrowRight, Compass, Star, Clock, BookOpen, User, Library, Heart } from 'lucide-react';
import { Comic, FeaturedItem, Chapter, Article } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { formatViews } from '../lib/utils';

export function HomeView({ 
  featuredItems, 
  comics, 
  articles, 
  followingFeed, 
  user,
  lang, 
  searchQuery, 
  onComicClick, 
  onArticleClick, 
  onChapterClick 
}: { 
  featuredItems: FeaturedItem[], 
  comics: Comic[], 
  articles: Article[], 
  followingFeed: Chapter[], 
  user: any,
  lang: Language, 
  searchQuery: string, 
  onComicClick: (comic: Comic) => void, 
  onArticleClick: (article: Article) => void, 
  onChapterClick: (chapter: Chapter) => void 
}) {
  const { t } = useTranslation(lang);
  const [heroIndex, setHeroIndex] = React.useState(0);

  // Auto-advance hero
  React.useEffect(() => {
    if (featuredItems.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredItems.length]);

  const filteredComics = comics.filter(comic => {
    const matchesSearch = comic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         comic.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (comic.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[250px] w-full overflow-hidden bg-zinc-900">
        <AnimatePresence mode="wait">
          {featuredItems.length > 0 ? (
            <motion.div
              key={heroIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <img 
                src={featuredItems[heroIndex].banner} 
                alt={featuredItems[heroIndex].title}
                className="w-full h-full object-cover opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-black/30" />
              <div className="absolute inset-0 container mx-auto px-4 flex flex-col justify-center">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="max-w-2xl"
                >
                  <span className="px-3 py-1 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-3 inline-block shadow-lg shadow-blue-500/20">
                    {t('featured')}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tighter leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                    {featuredItems[heroIndex].title}
                  </h2>
                  <p className="text-sm text-white/90 mb-4 line-clamp-1 font-medium drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                    {featuredItems[heroIndex].description}
                  </p>
                  <button 
                    onClick={() => {
                      const item = featuredItems[heroIndex];
                      if (item.type === 'comic' && item.targetId) {
                        const comic = comics.find(c => c.id === item.targetId);
                        if (comic) onComicClick(comic);
                      } else if (item.type === 'article' && item.targetId) {
                        const article = articles.find(a => a.id === item.targetId);
                        if (article) onArticleClick(article);
                      }
                    }}
                    className="group flex items-center gap-2 px-5 py-2 bg-white text-zinc-900 rounded-full font-black text-[10px] hover:bg-blue-500 hover:text-white transition-all shadow-xl"
                  >
                    {t('readNow')}
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-900"
            >
              <div className="text-center px-4">
                <BookOpen size={40} className="text-white/20 mx-auto mb-3" />
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter mb-1 uppercase">
                  Welcome to <span className="text-blue-400">Dream</span>Toon
                </h2>
                <p className="text-white/60 font-bold uppercase tracking-[0.3em] text-[10px]">
                  Your portal to infinite stories
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Hero Indicators */}
        {featuredItems.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {featuredItems.map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setHeroIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === heroIndex ? 'w-8 bg-blue-500' : 'w-2 bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 mt-8 relative z-20">
        <div className="grid lg:grid-cols-4 gap-8 md:gap-12">
          {/* Left Column: Comics Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6 md:mb-10">
              <h3 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tight">
                {t('trending')}
              </h3>
              <div className="h-1 flex-1 mx-4 md:mx-8 bg-zinc-50 rounded-full" />
              <button 
                onClick={() => onComicClick(filteredComics[0])} // Placeholder for "See All"
                className="text-xs font-black text-blue-500 uppercase tracking-widest hover:text-blue-600 transition-colors"
              >
                {t('readNow')}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-8 md:gap-y-12">
              {filteredComics.slice(0, 6).map((comic) => (
                <motion.div 
                  layout
                  key={comic.id}
                  onClick={() => onComicClick(comic)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[2/3] rounded-[20px] md:rounded-[24px] overflow-hidden mb-3 md:mb-4 shadow-lg group-hover:shadow-blue-500/20 transition-all group-hover:-translate-y-1">
                    <img 
                      src={comic.thumbnail} 
                      alt={comic.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1 text-white text-[8px] md:text-[10px] font-bold">
                        <Star size={10} className="text-yellow-400 fill-yellow-400" />
                        {comic.rating}
                      </div>
                      <div className="flex items-center gap-1 text-white text-[8px] md:text-[10px] font-bold">
                        <Compass size={10} />
                        {formatViews(comic.views)}
                      </div>
                    </div>
                  </div>
                  <h4 className="font-black text-zinc-900 text-sm md:text-base mb-0.5 md:mb-1 group-hover:text-blue-600 transition-colors truncate px-1">{comic.title}</h4>
                  <div className="flex gap-1.5 md:gap-2 px-1">
                    {comic.genre.slice(0, 2).map(g => (
                      <span key={g} className="text-[8px] md:text-[10px] font-bold text-blue-500 uppercase tracking-widest">{t(g as any)}</span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-12">
            {/* Following Feed */}
            {followingFeed.length > 0 && (
              <div className="bg-zinc-900 rounded-[32px] p-8 text-white shadow-2xl">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                  <Heart size={20} className="text-red-500 fill-red-500" />
                  {t('followingFeed')}
                </h3>
                <div className="space-y-6">
                  {followingFeed.map(chapter => {
                    const comic = comics.find(c => c.id === chapter.comicId);
                    if (!comic) return null;
                    return (
                      <div 
                        key={chapter.id} 
                        onClick={() => onChapterClick(chapter)}
                        className="flex gap-4 group cursor-pointer"
                      >
                        <img 
                          src={comic.thumbnail} 
                          className="w-14 h-14 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform" 
                          alt={comic.title}
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate group-hover:text-blue-400 transition-colors">{comic.title}</h4>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                            {t('chapter')} {chapter.number}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Articles */}
            <div>
              <h3 className="text-2xl font-black text-zinc-900 mb-8 tracking-tight">{t('latestArticles')}</h3>
              <div className="space-y-6">
                {articles.map(article => (
                  <div 
                    key={article.id} 
                    onClick={() => onArticleClick(article)}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-lg">
                      <img 
                        src={article.banner} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        alt={article.title}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h4 className="font-bold text-zinc-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">{article.title}</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
                      {article.createdAt?.toDate ? article.createdAt.toDate().toLocaleDateString() : '...'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
