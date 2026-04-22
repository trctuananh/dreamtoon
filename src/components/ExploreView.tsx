import React from 'react';
import { Compass, Star, TrendingUp, Clock, LayoutGrid, Users, ArrowRight } from 'lucide-react';
import { Comic, Genre, UserProfile } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { formatViews } from '../lib/utils';
import { motion } from 'motion/react';

export function ExploreView({ 
  comics, 
  artists = [],
  lang, 
  searchQuery,
  isLoading,
  onComicClick,
  onArtistClick
}: { 
  comics: Comic[], 
  artists?: UserProfile[],
  lang: Language, 
  searchQuery: string,
  isLoading?: boolean,
  onComicClick: (comic: Comic) => void,
  onArtistClick?: (artist: UserProfile) => void
}) {
  const { t } = useTranslation(lang);
  const [selectedGenre, setSelectedGenre] = React.useState<Genre | 'all'>('all');
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-ink/40 font-black uppercase tracking-widest text-[10px]">
          {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
        </p>
      </div>
    );
  }

  const [filter, setFilter] = React.useState<'trending' | 'download' | 'topRated'>('trending');
  const genreKeys: string[] = ['action', 'romance', 'comedy', 'fantasy', 'horror', 'sliceOfLife', 'drama', 'sciFi', 'thriller'];

  const [downloadedIds, setDownloadedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const saved = localStorage.getItem('downloaded_comics');
    if (saved) {
      try {
        setDownloadedIds(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse downloaded comics", e);
      }
    }
  }, []);

  const filteredComics = comics.filter(comic => {
    const matchesSearch = !searchQuery.trim() || 
      comic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comic.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comic.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesGenre = selectedGenre === 'all' || 
      comic.genre.some(g => g.toLowerCase() === selectedGenre.toLowerCase());

    const matchesFilter = filter === 'download' ? downloadedIds.includes(comic.id) : true;

    return matchesSearch && matchesGenre && matchesFilter;
  });

  const sortedComics = React.useMemo(() => {
    if (filter === 'topRated') {
      return [...filteredComics].sort((a, b) => b.rating - a.rating);
    }
    if (filter === 'trending') {
      return [...filteredComics].sort((a, b) => b.views - a.views);
    }
    return filteredComics;
  }, [filteredComics, filter]);

  const filteredArtists = searchQuery.trim()
    ? artists.filter(artist =>
        artist.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.handle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Calculate Hot Artists for Explore View
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
        // Silently fail
      }
    });

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
      .slice(0, 12); // Show more on explore
  }, [comics, artists]);

  return (
    <div className="min-h-screen bg-white pb-24 pt-4">
      <div className="px-6 mb-8">
        {searchQuery.trim() ? (
          <h2 className="text-2xl font-black text-zinc-900 mb-8 tracking-tight">
            {t('searchResults') || 'Search Results'} <span className="text-blue-500">"{searchQuery}"</span>
          </h2>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-end gap-4 mb-6">
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setFilter('trending')}
                  className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${filter === 'trending' ? 'bg-white text-blue-600' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                  <TrendingUp size={14} /> {t('trending')}
                </button>
                <button 
                  onClick={() => setFilter('topRated')}
                  className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${filter === 'topRated' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                  <Star size={14} /> {t('topRated')}
                </button>
                <button 
                  onClick={() => setFilter('download')}
                  className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${filter === 'download' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                  <Clock size={14} /> {t('download')}
                </button>
              </div>
            </div>

            {!searchQuery.trim() && (
              <div className="flex flex-wrap items-center gap-2 pb-4">
                <button 
                  onClick={() => setSelectedGenre('all')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap transition-all ${
                    selectedGenre === 'all' 
                      ? 'bg-zinc-900 text-white' 
                      : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
                  }`}
                >
                  {t('all')}
                </button>
                {genreKeys.map((genreKey) => (
                  <button 
                    key={genreKey}
                    onClick={() => setSelectedGenre(genreKey as Genre)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedGenre === genreKey 
                        ? 'bg-zinc-900 text-white' 
                        : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
                    }`}
                  >
                    {t(genreKey as any)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-6 grid grid-cols-3 sm:grid-cols-6 gap-x-3 sm:gap-x-4 gap-y-8">
        {sortedComics.map((comic) => {
          const isNewChapter = comic.updatedAt && (
            (comic.updatedAt.toDate ? comic.updatedAt.toDate() : new Date(comic.updatedAt)).getTime() > 
            (Date.now() - 72 * 60 * 60 * 1000)
          );

          return (
            <div 
              key={comic.id} 
              className="group cursor-pointer"
              onClick={() => onComicClick(comic)}
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-all duration-300">
                <img 
                  src={comic.thumbnail} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt={comic.title}
                  referrerPolicy="no-referrer"
                />
                
                {/* New Chapter Badge */}
                {isNewChapter && (
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded-sm uppercase tracking-tighter z-10">
                    New Chapter
                  </div>
                )}

                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-white/90 backdrop-blur-md rounded-md flex items-center gap-1 shadow-sm">
                  <Star size={8} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-[8px] font-black text-zinc-900">{comic.rating.toFixed(1)}</span>
                </div>
              </div>
              <h3 className="font-bold text-zinc-900 text-[10px] sm:text-sm truncate mb-0.5 group-hover:text-blue-600 transition-colors">
                {comic.title}
              </h3>
              <div className="flex items-center justify-between">
                <p className="text-[8px] sm:text-[10px] font-medium text-zinc-400 truncate">{comic.authorName}</p>
                <span className="text-[8px] sm:text-[10px] font-bold text-blue-500 uppercase tracking-widest hidden sm:block">
                  {formatViews(comic.views)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {searchQuery.trim() && filteredArtists.length > 0 && (
        <div className="px-6 mt-16">
          <h3 className="text-xl font-black text-zinc-900 mb-8 tracking-tight flex items-center gap-2">
            <Users size={24} className="text-blue-500" />
            {t('authors')} & {t('users')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {filteredArtists.map((artist) => (
              <div 
                key={artist.uid}
                onClick={() => onArtistClick?.(artist)}
                className="group cursor-pointer text-center"
              >
                <div className="relative aspect-square rounded-full overflow-hidden mb-4 shadow-xl shadow-zinc-200 group-hover:shadow-blue-500/20 transition-all duration-500 group-hover:-translate-y-2 mx-auto w-16 sm:w-20">
                  <img 
                    src={artist.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.displayName)}&background=random`} 
                    alt={artist.displayName} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  {artist.pioneerNumber && (
                    <div className="absolute top-0 right-0 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 text-white text-[8px] sm:text-[10px] font-black w-5 h-5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 border-white shadow-[0_0_15px_rgba(245,158,11,0.6)] z-10">
                      {artist.pioneerNumber}
                    </div>
                  )}
                </div>
                <h4 className="text-sm font-black text-zinc-900 leading-tight mb-1 group-hover:text-blue-500 transition-colors uppercase tracking-tight">
                  {artist.displayName}
                </h4>
                <p className="text-[10px] font-bold text-zinc-400 tracking-widest">
                  @{artist.handle || artist.uid.slice(0, 6)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {comics.length === 0 && (
        <div className="px-6 mt-12">
          <div className="text-center py-32 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LayoutGrid size={32} className="text-zinc-300" />
            </div>
            <p className="text-zinc-500 font-bold uppercase tracking-widest">{t('noComicsFound')}</p>
          </div>
        </div>
      )}

      {/* Hot Artists Section in Explore */}
      {!searchQuery.trim() && hotArtists.length > 0 && (
        <div className="px-6 mt-16 mb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                {t('hotArtists')}
                <ArrowRight size={18} className="text-zinc-400" />
              </h3>
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
