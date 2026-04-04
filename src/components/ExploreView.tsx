import React from 'react';
import { Compass, Star, TrendingUp, Clock, LayoutGrid, Users } from 'lucide-react';
import { Comic, Genre, UserProfile } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { formatViews } from '../lib/utils';

export function ExploreView({ 
  comics, 
  artists = [],
  lang, 
  searchQuery,
  onComicClick,
  onArtistClick
}: { 
  comics: Comic[], 
  artists?: UserProfile[],
  lang: Language, 
  searchQuery: string,
  onComicClick: (comic: Comic) => void,
  onArtistClick?: (artist: UserProfile) => void
}) {
  const { t } = useTranslation(lang);
  const genres: Genre[] = ['Action', 'Romance', 'Comedy', 'Fantasy', 'Horror', 'Slice of Life', 'Drama', 'Sci-Fi', 'Thriller'];

  const filteredComics = comics.filter(comic => {
    const matchesSearch = !searchQuery.trim() || 
      comic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comic.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comic.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const filteredArtists = searchQuery.trim()
    ? artists.filter(artist =>
        artist.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.handle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="container mx-auto px-4 pt-4 pb-12">
      <div className="mb-8">
        {searchQuery.trim() ? (
          <h2 className="text-2xl font-black text-zinc-900 mb-8 tracking-tight">
            {t('searchResults') || 'Search Results'} <span className="text-blue-500">"{searchQuery}"</span>
          </h2>
        ) : (
          <div className="flex flex-col md:flex-row md:items-end justify-end gap-4 mb-6">
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button className="flex-1 sm:flex-none px-2 sm:px-4 py-1.5 bg-white text-blue-600 rounded-lg text-[10px] sm:text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap">
                <TrendingUp size={14} /> {t('trending')}
              </button>
              <button className="flex-1 sm:flex-none px-2 sm:px-4 py-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
                <Clock size={14} /> {t('new')}
              </button>
              <button className="flex-1 sm:flex-none px-2 sm:px-4 py-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
                <Star size={14} /> {t('topRated')}
              </button>
            </div>
          </div>
        )}

        {!searchQuery.trim() && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
            <button className="px-4 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
              {t('all')}
            </button>
            {genres.map((genre) => (
              <button 
                key={genre}
                className="px-4 py-1.5 bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
        {filteredComics.map((comic) => (
          <div 
            key={comic.id} 
            className="group cursor-pointer"
            onClick={() => onComicClick(comic)}
          >
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-all duration-300">
              <img 
                src={comic.thumbnail} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt={comic.title}
                referrerPolicy="no-referrer"
              />
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
        ))}
      </div>

      {searchQuery.trim() && filteredArtists.length > 0 && (
        <div className="mt-16">
          <h3 className="text-xl font-black text-zinc-900 mb-8 tracking-tight flex items-center gap-2">
            <Users size={24} className="text-blue-500" />
            {t('authors') || 'Authors'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {filteredArtists.map((artist) => (
              <div 
                key={artist.uid}
                onClick={() => onArtistClick?.(artist)}
                className="group cursor-pointer text-center"
              >
                <div className="relative aspect-square rounded-full overflow-hidden mb-4 shadow-xl shadow-zinc-200 group-hover:shadow-blue-500/20 transition-all duration-500 group-hover:-translate-y-2 mx-auto w-24 sm:w-32">
                  <img 
                    src={artist.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.displayName)}&background=random`} 
                    alt={artist.displayName} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h4 className="sm:text-lg font-black text-zinc-900 leading-tight mb-1 group-hover:text-blue-500 transition-colors uppercase tracking-tight">
                  {artist.displayName}
                </h4>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  @{artist.handle || artist.uid.slice(0, 6)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {comics.length === 0 && (
        <div className="text-center py-32 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
          <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LayoutGrid size={32} className="text-zinc-300" />
          </div>
          <p className="text-zinc-500 font-bold uppercase tracking-widest">{t('noComicsFound')}</p>
        </div>
      )}
    </div>
  );
}
