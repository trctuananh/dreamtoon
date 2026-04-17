import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Compass, BookOpen, Users, Star } from 'lucide-react';
import { Comic, FeaturedItem, Chapter, Article, Following, UserProfile, ReadingHistory } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { formatViews } from '../lib/utils';

export function HomeView({ 
  featuredItems, 
  comics, 
  articles, 
  artists = [],
  followingFeed,
  following,
  history,
  user,
  lang, 
  searchQuery,
  onComicClick, 
  onArticleClick, 
  onChapterClick,
  onExploreClick,
  onArtistClick,
}: { 
  featuredItems: FeaturedItem[], 
  comics: Comic[], 
  articles: Article[], 
  artists?: UserProfile[],
  followingFeed: Chapter[], 
  following?: Following[],
  history?: ReadingHistory[],
  user: any,
  lang: Language, 
  searchQuery: string, 
  onComicClick: (comic: Comic) => void, 
  onArticleClick: (article: Article) => void, 
  onChapterClick: (chapter: Chapter) => void,
  onExploreClick: () => void,
  onArtistClick?: (artist: UserProfile) => void
}) {
  const { t } = useTranslation(lang);
  const [heroIndex, setHeroIndex] = React.useState(0);
  const [trendingTab, setTrendingTab] = React.useState<'trending' | 'popular'>('trending');

  // Calculate favorite comics based on followed comics or followed artists or history
  const followedComicIds = following?.filter(f => f.type === 'comic').map(f => f.targetId) || [];
  const followedArtistIds = following?.filter(f => f.type === 'artist').map(f => f.targetId) || [];
  const historyIds = history?.map(h => h.comicId) || [];
  
  const recentlyRead = comics.filter(comic => historyIds.includes(comic.id))
    .sort((a, b) => historyIds.indexOf(a.id) - historyIds.indexOf(b.id));

  const followedComics = comics.filter(comic => 
    followedComicIds.includes(comic.id) || 
    followedArtistIds.includes(comic.authorUid)
  );

  // Calculate Hot Artists (artists with most views in their comics updated this week)
  const hotArtists = React.useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const artistViews: { [uid: string]: number } = {};
    
    comics.forEach(comic => {
      if (!comic.updatedAt) return;
      try {
        const updatedAt = comic.updatedAt?.toDate ? comic.updatedAt.toDate() : new Date(comic.updatedAt);
        if (updatedAt && !isNaN(updatedAt.getTime()) && updatedAt.getTime() > oneWeekAgo && comic.authorUid) {
          artistViews[comic.authorUid] = (artistViews[comic.authorUid] || 0) + (comic.views || 0);
        }
      } catch (e) {
        console.warn("Error parsing date for comic:", comic.id, e);
      }
    });

    // If no artists have views this week, fallback to total views
    if (Object.keys(artistViews).length === 0) {
      comics.forEach(comic => {
        if (comic.authorUid) {
          artistViews[comic.authorUid] = (artistViews[comic.authorUid] || 0) + (comic.views || 0);
        }
      });
    }

    return artists
      .map(artist => ({
        ...artist,
        weeklyViews: artistViews[artist.uid] || 0
      }))
      .filter(artist => artist.weeklyViews > 0)
      .sort((a, b) => b.weeklyViews - a.weeklyViews)
      .slice(0, 6);
  }, [comics, artists]);

  // Search filtering
  const filteredComics = searchQuery.trim() 
    ? comics.filter(comic => 
        comic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comic.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
        comic.authorName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredArticles = searchQuery.trim()
    ? articles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.authorName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredArtists = searchQuery.trim()
    ? artists.filter(artist =>
        artist.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.handle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Auto-advance hero
  React.useEffect(() => {
    if (featuredItems.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredItems.length]);

  if (searchQuery.trim()) {
    return (
      <div className="min-h-screen bg-paper pb-24 pt-4">
        <div className="px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-black text-ink mb-6 tracking-tight">
            {t('searchResults') || 'Search Results'} <span className="text-blue-500">"{searchQuery}"</span>
          </h2>

          {filteredComics.length === 0 && filteredArticles.length === 0 && filteredArtists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-ink/40">
              <Compass size={48} className="mb-4 opacity-20" />
              <p className="font-bold">{t('noResults') || 'No results found'}</p>
            </div>
          ) : (
            <div className="space-y-12">
              {filteredComics.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-4">{t('stories') || 'Stories'}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {filteredComics.map((comic) => (
                      <motion.div
                        key={comic.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => onComicClick(comic)}
                        className="group cursor-pointer"
                      >
                        <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-2 shadow-lg shadow-ink/5">
                          <img 
                            src={comic.thumbnail} 
                            alt={comic.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h4 className="font-bold text-ink text-sm truncate mb-1 group-hover:text-blue-600 transition-colors">
                          {comic.title}
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {comic.genre.map(g => (
                            <p key={g} className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                              {t(g as any)}
                            </p>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {filteredArtists.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-4">{t('authors')} & {t('users')}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {filteredArtists.map((artist) => (
                      <motion.div
                        key={artist.uid}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => onArtistClick?.(artist)}
                        className="group cursor-pointer text-center"
                      >
                        <div className="relative aspect-square rounded-full overflow-hidden mb-2 shadow-lg shadow-ink/5 mx-auto w-16 sm:w-20">
                          <img 
                            src={artist.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.displayName)}&background=random`} 
                            alt={artist.displayName} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          {artist.pioneerNumber && (
                            <div className="absolute top-0 right-0 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 text-white text-[8px] sm:text-[10px] font-black w-5 h-5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 border-paper shadow-[0_0_15px_rgba(245,158,11,0.6)] z-10">
                              {artist.pioneerNumber}
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-ink text-xs truncate mb-1 group-hover:text-blue-600 transition-colors">
                          {artist.displayName}
                        </h4>
                        <p className="text-[10px] font-black text-ink/40 tracking-widest">
                          @{artist.handle || artist.uid.slice(0, 6)}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {filteredArticles.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-4">{t('articles')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredArticles.map((article) => (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => onArticleClick(article)}
                        className="flex gap-4 p-4 bg-ink/5 rounded-2xl hover:bg-ink/10 transition-colors cursor-pointer group"
                      >
                        {article.banner ? (
                          <img 
                            src={article.banner} 
                            className="w-24 h-24 object-cover rounded-xl shadow-sm" 
                            alt={article.title}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-ink/10 rounded-xl flex items-center justify-center">
                            <Compass size={24} className="text-ink/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="font-bold text-ink text-sm mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">{article.title}</h4>
                          <p className="text-[10px] text-ink/40 font-bold uppercase tracking-widest">{article.authorName}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-24 transition-colors duration-300 text-ink">
      {/* Hero Section */}
      <div className="relative h-[150px] w-full overflow-hidden mb-8">
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
              {(() => {
                const item = featuredItems[heroIndex];
                const sourceItem = item.type === 'comic' 
                  ? comics.find(c => c.id === item.targetId)
                  : articles.find(a => a.id === item.targetId);
                const displayImage = sourceItem ? (item.type === 'comic' ? (sourceItem as Comic).thumbnail : (sourceItem as Article).banner) : null;

                return displayImage ? (
                  <img 
                    src={displayImage} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center">
                    <Compass size={48} className="text-zinc-300" />
                  </div>
                );
              })()}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <div className="absolute bottom-6 left-0 right-0 px-6">
                <div className="max-w-xl">
                  <div className="inline-block px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded-md mb-2 tracking-widest">
                    {t('featured').toUpperCase()}
                  </div>
                  <h2 className="text-2xl font-black text-white mb-1 tracking-tight leading-tight">
                    {featuredItems[heroIndex].title}
                  </h2>
                  <p className="text-white/80 text-xs mb-3 line-clamp-1 font-medium">
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
                    className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-full text-xs font-black hover:bg-zinc-100 transition-all group"
                  >
                    {t('readNow')}
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
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

      {/* Section: Trending & Popular */}
      <div className="px-6 mb-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
              {t('trendingAndPopular') || 'Trending & Popular Series'}
              <ArrowRight size={18} className="text-zinc-400" />
            </h3>
            <button 
              onClick={onExploreClick}
              className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
            >
              {t('viewAll')}
            </button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setTrendingTab('trending')}
              className={`px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all ${trendingTab === 'trending' ? 'bg-ink text-paper shadow-lg shadow-blue-500/10' : 'bg-ink/5 text-ink/50 hover:bg-ink/10'}`}
            >
              {t('trending')}
            </button>
            <button 
              onClick={() => setTrendingTab('popular')}
              className={`px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all ${trendingTab === 'popular' ? 'bg-ink text-paper shadow-lg shadow-blue-500/10' : 'bg-ink/5 text-ink/50 hover:bg-ink/10'}`}
            >
              {t('popular')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 sm:gap-x-4 gap-y-8">
          {(trendingTab === 'trending' ? comics.slice(0, 6) : [...comics].sort((a, b) => b.views - a.views).slice(0, 6)).map((comic) => {
            const isNewChapter = comic.updatedAt && (
              (comic.updatedAt.toDate ? comic.updatedAt.toDate() : new Date(comic.updatedAt)).getTime() > 
              (Date.now() - 72 * 60 * 60 * 1000)
            );

            return (
              <motion.div
                key={comic.id}
                onClick={() => onComicClick(comic)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                  <img 
                    src={comic.thumbnail} 
                    alt={comic.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* New Chapter Badge */}
                  {isNewChapter && (
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded-sm uppercase tracking-tighter z-10">
                      New Chapter
                    </div>
                  )}

                  {/* Star Rating */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-white/90 backdrop-blur-md rounded-md flex items-center gap-1 shadow-sm z-10">
                    <Star size={8} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-[8px] font-black text-zinc-900">{comic.rating.toFixed(1)}</span>
                  </div>
                </div>
                
                <div className="mt-1">
                  <h4 className="font-bold text-ink text-xs sm:text-sm line-clamp-1 mb-0.5 group-hover:text-blue-600 transition-colors">
                    {comic.title}
                  </h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {comic.genre.map(g => (
                      <p key={g} className="text-[10px] font-medium text-ink/40 capitalize">
                        {t(g as any)}
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Section: New Daily */}
      <div className="px-6 mb-8">
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

        <div className="grid grid-cols-3 gap-3">
          {comics.slice(6, 12).map((comic) => {
            const isNewChapter = comic.updatedAt && (
              (comic.updatedAt.toDate ? comic.updatedAt.toDate() : new Date(comic.updatedAt)).getTime() > 
              (Date.now() - 72 * 60 * 60 * 1000)
            );

            return (
              <div 
                key={comic.id}
                onClick={() => onComicClick(comic)}
                className="flex flex-col gap-2 group cursor-pointer"
              >
                <div className="relative">
                  <img 
                    src={comic.thumbnail} 
                    alt={comic.title} 
                    className="w-full aspect-[2/3] object-cover rounded-xl shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  {isNewChapter && (
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded-sm uppercase tracking-tighter z-10">
                      New Chapter
                    </div>
                  )}
                  {/* Star Rating */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-white/90 backdrop-blur-md rounded-md flex items-center gap-1 shadow-sm z-10">
                    <Star size={8} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-[8px] font-black text-zinc-900">{comic.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-zinc-900 text-[10px] truncate mb-0.5 group-hover:text-blue-600 transition-colors">{comic.title}</h4>
                  <div className="flex flex-wrap gap-1">
                    {comic.genre.map(g => (
                      <p key={g} className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">{t(g as any)}</p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Following Feed */}
      {followingFeed.length > 0 && (
        <div className="px-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-zinc-900 tracking-tight">
              {t('followingFeed') || 'Following Feed'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {followingFeed.map((chapter) => {
              const comic = comics.find(c => c.id === chapter.comicId);
              if (!comic) return null;
              
              return (
                <div 
                  key={chapter.id}
                  onClick={() => onChapterClick(chapter)}
                  className="flex gap-3 group cursor-pointer bg-zinc-50 p-2 rounded-2xl hover:bg-zinc-100 transition-colors"
                >
                  <img 
                    src={chapter.thumbnail || comic.thumbnail} 
                    alt={comic.title} 
                    className="w-12 h-16 object-cover rounded-xl shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="font-bold text-zinc-900 text-xs truncate mb-0.5 group-hover:text-blue-600 transition-colors">{comic.title}</h4>
                    <p className="text-[10px] text-zinc-600 font-medium truncate mb-0.5">
                      {t('chapter')} {chapter.number}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-0.5">
                      {comic.genre.map(g => (
                        <p key={g} className="text-[8px] text-blue-500 font-bold uppercase tracking-widest">{t(g as any)}</p>
                      ))}
                    </div>
                    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">
                      {new Date(chapter.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section: Recently Read */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            {t('recentlyRead')}
            <ArrowRight size={18} className="text-zinc-400" />
          </h3>
        </div>

        {!user ? (
          <div className="bg-zinc-50 rounded-2xl p-6 text-center">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{t('loginToSeeHistory') || 'Login to see your history'}</p>
          </div>
        ) : recentlyRead.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
            {recentlyRead.slice(0, 6).map((comic) => {
              const historyItem = history?.find(h => h.comicId === comic.id);
              const currentChapter = historyItem?.chapterNumber || 0;
              const totalChapters = comic.chapterCount || 0;
              const progress = totalChapters > 0 ? Math.min(Math.round((currentChapter / totalChapters) * 100), 100) : 0;

              return (
                <motion.div
                  key={comic.id}
                  onClick={() => onComicClick(comic)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                    <img 
                      src={comic.thumbnail} 
                      alt={comic.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Progress Bar Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-blue-500"
                      />
                    </div>

                    {/* Chapter Indicator */}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[8px] font-black rounded-sm uppercase tracking-tighter">
                      {t('chapter')} {currentChapter}
                      {totalChapters > 0 && ` / ${totalChapters}`}
                    </div>
                  </div>
                  <h4 className="font-bold text-zinc-900 text-[10px] sm:text-sm truncate mb-0.5 group-hover:text-blue-600 transition-colors">
                    {comic.title}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {comic.genre.map(g => (
                      <p key={g} className="text-[8px] sm:text-[10px] font-medium text-zinc-400 capitalize">
                        {t(g as any)}
                      </p>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-zinc-50 rounded-2xl p-6 text-center">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('noRecentlyRead')}</p>
          </div>
        )}
      </div>

      {/* Section: Following */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            {t('followingComics')}
            <ArrowRight size={18} className="text-zinc-400" />
          </h3>
        </div>

        {!user ? (
          <div className="bg-zinc-50 rounded-2xl p-6 text-center">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{t('loginToSeeFollowing') || 'Login to see your following'}</p>
          </div>
        ) : followedComics.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
            {followedComics.slice(0, 6).map((comic) => (
              <motion.div
                key={comic.id}
                onClick={() => onComicClick(comic)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                  <img 
                    src={comic.thumbnail} 
                    alt={comic.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h4 className="font-bold text-zinc-900 text-[10px] sm:text-sm truncate mb-0.5 group-hover:text-blue-600 transition-colors">
                  {comic.title}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {comic.genre.map(g => (
                    <p key={g} className="text-[8px] sm:text-[10px] font-medium text-zinc-400 capitalize">
                      {t(g as any)}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-50 rounded-2xl p-6 text-center">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('noFollowingComics')}</p>
          </div>
        )}
      </div>

      {/* Section: Hot Artists */}
      {hotArtists.length > 0 && (
        <div className="px-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                {t('hotArtists')}
                <ArrowRight size={18} className="text-zinc-400" />
              </h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                {t('hotArtistsDesc')}
              </p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
            {hotArtists.map((artist) => (
              <motion.div
                key={artist.uid}
                whileHover={{ y: -5 }}
                onClick={() => onArtistClick?.(artist)}
                className="group cursor-pointer text-center flex-shrink-0 w-20"
              >
                <div className="relative aspect-square rounded-full overflow-hidden mb-2 shadow-xl shadow-zinc-200/50 mx-auto w-16 border-4 border-white group-hover:border-blue-500 transition-all duration-500">
                  <img 
                    src={artist.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.displayName)}&background=random`} 
                    alt={artist.displayName} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h4 className="font-bold text-zinc-900 text-[10px] truncate mb-0.5 group-hover:text-blue-600 transition-colors">
                  {artist.displayName}
                </h4>
                <p className="text-[9px] font-black text-zinc-400 tracking-widest">
                  @{artist.handle || artist.uid.slice(0, 6)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
