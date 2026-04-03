import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Compass, BookOpen } from 'lucide-react';
import { Comic, FeaturedItem, Chapter, Article } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { formatViews } from '../lib/utils';

export function HomeView({ 
  featuredItems, 
  comics, 
  articles, 
  lang, 
  onComicClick, 
  onArticleClick, 
  onExploreClick,
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
  onChapterClick: (chapter: Chapter) => void,
  onExploreClick: () => void
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

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Hero Section */}
      <div className="relative h-[400px] w-full overflow-hidden mb-8">
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
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <div className="absolute bottom-12 left-0 right-0 px-6">
                <div className="max-w-xl">
                  <div className="inline-block px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-md mb-4 tracking-widest">
                    {t('featured').toUpperCase()}
                  </div>
                  <h2 className="text-4xl font-black text-white mb-2 tracking-tight leading-tight">
                    {featuredItems[heroIndex].title}
                  </h2>
                  <p className="text-white/80 text-sm mb-6 line-clamp-2 font-medium">
                    {featuredItems[heroIndex].description}
                  </p>
                  <button 
                    onClick={() => {
                      if (featuredItems[heroIndex].type === 'comic') {
                        const comic = comics.find(c => c.id === featuredItems[heroIndex].targetId);
                        if (comic) onComicClick(comic);
                      } else if (featuredItems[heroIndex].type === 'article') {
                        const article = articles.find(a => a.id === featuredItems[heroIndex].targetId);
                        if (article) onArticleClick(article);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-zinc-900 rounded-full text-sm font-black hover:bg-zinc-100 transition-all group"
                  >
                    {t('readNow')}
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
              <div className="text-white/20 font-black text-4xl italic tracking-tighter">DREAMTOON</div>
            </div>
          )}
        </AnimatePresence>

        {/* Pagination Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {featuredItems.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === heroIndex ? 'w-8 bg-blue-500' : 'w-2 bg-white/30'}`}
            />
          ))}
        </div>
      </div>

      {/* Section: Trending Now */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-zinc-900 tracking-tight">
            {t('trending')}
          </h3>
          <button 
            onClick={onExploreClick}
            className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
          >
            {t('viewAll')}
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
          {comics.slice(0, 6).map((comic) => (
            <motion.div
              key={comic.id}
              onClick={() => onComicClick(comic)}
              className="flex-shrink-0 w-[180px] group cursor-pointer"
            >
              <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden mb-3 shadow-lg shadow-zinc-200/50">
                <img 
                  src={comic.thumbnail} 
                  alt={comic.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h4 className="font-bold text-zinc-900 text-sm truncate mb-1 group-hover:text-blue-600 transition-colors">
                {comic.title}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                  {t(comic.genre[0] as any)}
                </span>
                <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                <span className="text-[10px] font-bold text-zinc-400">
                  {formatViews(comic.views)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Section: New Daily */}
      <div className="px-6 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-zinc-900 tracking-tight">
            {t('newDaily')}
          </h3>
          <button 
            onClick={onExploreClick}
            className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
          >
            {t('viewAll')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {comics.slice(6, 10).map((comic) => (
            <div 
              key={comic.id}
              onClick={() => onComicClick(comic)}
              className="flex gap-3 group cursor-pointer"
            >
              <img 
                src={comic.thumbnail} 
                alt={comic.title} 
                className="w-16 h-20 object-cover rounded-xl shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="font-bold text-zinc-900 text-xs truncate mb-1 group-hover:text-blue-600 transition-colors">{comic.title}</h4>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{t(comic.genre[0] as any)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
