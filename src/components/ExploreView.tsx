import React from 'react';
import { Compass, Star, TrendingUp, Clock, LayoutGrid } from 'lucide-react';
import { Comic, Genre } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { formatViews } from '../lib/utils';

export function ExploreView({ 
  comics, 
  lang, 
  onComicClick 
}: { 
  comics: Comic[], 
  lang: Language, 
  onComicClick: (comic: Comic) => void 
}) {
  const { t } = useTranslation(lang);
  const genres: Genre[] = ['Action', 'Romance', 'Comedy', 'Fantasy', 'Horror', 'Slice of Life', 'Drama', 'Sci-Fi', 'Thriller'];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Compass size={24} className="text-white" />
            </div>
            <h2 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">{t('originals')}</h2>
          </div>
          <p className="text-zinc-500 font-medium max-w-xl leading-relaxed">
            Discover the next generation of digital storytellers. From epic fantasies to heartwarming romances, find your next favorite series here.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-2xl">
          <button className="px-6 py-2 bg-white text-blue-600 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
            <TrendingUp size={16} /> {t('trending')}
          </button>
          <button className="px-6 py-2 text-zinc-500 hover:text-zinc-900 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
            <Clock size={16} /> {t('new')}
          </button>
          <button className="px-6 py-2 text-zinc-500 hover:text-zinc-900 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
            <Star size={16} /> {t('topRated')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-10">
        {comics.map((comic) => (
          <div 
            key={comic.id} 
            className="group cursor-pointer"
            onClick={() => onComicClick(comic)}
          >
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden mb-4 shadow-xl shadow-zinc-200 group-hover:shadow-blue-500/20 transition-all duration-500 group-hover:-translate-y-2">
              <img 
                src={comic.thumbnail} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt={comic.title}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-widest">
                    {comic.genre[0]}
                  </span>
                </div>
                <p className="text-white text-xs font-medium line-clamp-2 leading-relaxed">
                  {comic.description}
                </p>
              </div>
              <div className="absolute top-4 right-4 px-2 py-1 bg-white/90 backdrop-blur-md rounded-xl flex items-center gap-1 shadow-sm">
                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                <span className="text-[10px] font-black text-zinc-900">{comic.rating.toFixed(1)}</span>
              </div>
            </div>
            <h3 className="font-black text-zinc-900 leading-tight mb-1 group-hover:text-blue-500 transition-colors line-clamp-1 uppercase tracking-tight">
              {comic.title}
            </h3>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{comic.authorName}</p>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{formatViews(comic.views)} {t('views')}</p>
            </div>
          </div>
        ))}
      </div>

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
