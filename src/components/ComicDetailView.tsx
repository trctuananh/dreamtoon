import React from 'react';
import { ArrowLeft, Compass, Star, Clock, BookOpen, Share2, Heart, MessageCircle, Send, Trash2, Plus, ChevronUp, ChevronDown, Edit2, DollarSign, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { Comic, Chapter, Following } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { formatViews } from '../lib/utils';
import { StarRating } from './StarRating';

export function ComicDetailView({ 
  comic, 
  chapters, 
  user, 
  lang, 
  following, 
  userRating, 
  isRatingSubmitting, 
  ratingSuccess, 
  onRate, 
  onChapterClick, 
  onToggleFollow, 
  onAddChapter,
  onEditChapter,
  onEditComic,
  onArtistClick,
  onBack
}: { 
  comic: Comic, 
  chapters: Chapter[], 
  user: any, 
  lang: Language, 
  following: Following[], 
  userRating: number, 
  isRatingSubmitting: boolean, 
  ratingSuccess: boolean, 
  onRate: (score: number) => void, 
  onChapterClick: (chapter: Chapter) => void, 
  onToggleFollow: (id: string, type: 'artist' | 'comic', authorUid?: string) => void, 
  onAddChapter: () => void,
  onEditChapter: (chapter: Chapter) => void,
  onEditComic: (comic: Comic) => void,
  onArtistClick: (uid: string) => void,
  onBack: () => void
}) {
  const { t } = useTranslation(lang);
  const isFollowingComic = following.some(f => f.targetId === comic.id && f.type === 'comic');
  const isFollowingArtist = following.some(f => f.targetId === comic.authorUid && f.type === 'artist');
  const isAuthor = user && user.uid === comic.authorUid;

  const [isDownloaded, setIsDownloaded] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem('downloaded_comics');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        setIsDownloaded(ids.includes(comic.id));
      } catch (e) {}
    }
  }, [comic.id]);

  const handleDownload = () => {
    const saved = localStorage.getItem('downloaded_comics');
    let ids = [];
    if (saved) {
      try {
        ids = JSON.parse(saved);
      } catch (e) {}
    }

    if (isDownloaded) {
      ids = ids.filter((id: string) => id !== comic.id);
    } else {
      ids.push(comic.id);
    }

    localStorage.setItem('downloaded_comics', JSON.stringify(ids));
    setIsDownloaded(!isDownloaded);
  };

  const handleMoveChapter = async (chapter: Chapter, direction: 'up' | 'down') => {
    const idx = chapters.findIndex(c => c.id === chapter.id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === chapters.length - 1) return;

    const otherIdx = direction === 'up' ? idx - 1 : idx + 1;
    const otherChapter = chapters[otherIdx];

    try {
      const { runTransaction, doc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      await runTransaction(db, async (transaction) => {
        const ch1Ref = doc(db, 'comics', comic.id, 'chapters', chapter.id);
        const ch2Ref = doc(db, 'comics', comic.id, 'chapters', otherChapter.id);
        
        transaction.update(ch1Ref, { number: otherChapter.number });
        transaction.update(ch2Ref, { number: chapter.number });
      });
    } catch (error) {
      console.error("Error moving chapter:", error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 pt-4 sm:pt-8">
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column: Info Panel */}
          <div className="md:col-span-1">
            <div className="sticky top-8 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-zinc-100 space-y-6">
              {/* Thumbnail & Genres */}
              <div>
                <img 
                  src={comic.thumbnail} 
                  alt={comic.title} 
                  className="w-full aspect-[2/3] object-cover rounded-2xl shadow-2xl mb-4 sm:mb-6"
                  referrerPolicy="no-referrer"
                />
                
                <div className="flex flex-wrap gap-2">
                  {comic.genre.map(g => (
                    <span key={g} className="px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-50 text-blue-600 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-100">
                      {t(g as any)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Synopsis */}
              <div className="pt-6 border-t border-zinc-100">
                <h3 className="text-base sm:text-lg font-black text-zinc-900 mb-2 sm:mb-4 tracking-tight">{t('synopsis')}</h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-medium">{comic.description}</p>
                
                {comic.tags && comic.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {comic.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold text-zinc-400 hover:text-blue-500 cursor-pointer transition-colors">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats & Actions */}
              <div className="pt-6 border-t border-zinc-100">
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="text-center p-2 sm:p-3 bg-zinc-50 rounded-xl sm:rounded-2xl">
                    <p className="text-base sm:text-lg font-black text-blue-600">{formatViews(comic.views)}</p>
                    <p className="text-[8px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('views')}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 sm:p-3 bg-zinc-50 rounded-xl sm:rounded-2xl">
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-base sm:text-lg font-black text-yellow-500">{comic.rating}</p>
                      <Star size={14} className="text-yellow-500 fill-yellow-500" />
                    </div>
                    <StarRating 
                      rating={userRating} 
                      onRate={onRate} 
                      lang={lang} 
                      isSubmitting={isRatingSubmitting} 
                      success={ratingSuccess} 
                      size={12}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {isAuthor && (
                    <button 
                      onClick={() => onEditComic(comic)}
                      className="w-full py-2 sm:py-3 bg-blue-50 text-blue-600 rounded-full font-bold text-xs sm:text-sm hover:bg-blue-100 transition-all border border-blue-100 flex items-center justify-center gap-2"
                    >
                      <Edit2 size={16} />
                      {t('edit')}
                    </button>
                  )}
                  <button 
                    onClick={() => onToggleFollow(comic.id, 'comic', comic.authorUid)}
                    className={`w-full py-2 sm:py-3 rounded-full font-bold text-xs sm:text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                      isFollowingComic 
                        ? 'bg-pink-500 text-white hover:bg-pink-600 shadow-pink-500/20' 
                        : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20'
                    }`}
                  >
                    <Heart size={16} className={isFollowingComic ? 'fill-white' : ''} />
                    {isFollowingComic ? t('following') : t('favorite')}
                  </button>
                  <button 
                    onClick={() => {
                      if (chapters.length > 0) onChapterClick(chapters[0]);
                    }}
                    disabled={chapters.length === 0}
                    className="w-full py-2 sm:py-3 bg-zinc-900 text-white rounded-full font-bold text-xs sm:text-sm hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 disabled:opacity-50"
                  >
                    {t('readNow')}
                  </button>
                  <button 
                    onClick={handleDownload}
                    className={`w-full py-2 sm:py-3 rounded-full font-bold text-xs sm:text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                      isDownloaded 
                        ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <Clock size={16} />
                    {isDownloaded ? t('downloaded') : t('download')}
                  </button>
                  <button 
                    onClick={() => onArtistClick(comic.authorUid)}
                    className="w-full col-span-2 py-2 sm:py-3 bg-emerald-500 text-white rounded-full font-bold text-xs sm:text-sm hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <DollarSign size={16} />
                    {t('donate')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Content */}
          <div className="md:col-span-2">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-5xl font-black text-zinc-900 mb-4 sm:mb-6 tracking-tight leading-tight sm:leading-none">{comic.title}</h1>
              
              <div className="flex items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                      {comic.authorPhoto ? (
                        <img src={comic.authorPhoto} alt={comic.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        comic.authorName?.[0] || 'A'
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('author')}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-base font-bold text-zinc-900 hover:text-blue-500 cursor-pointer transition-colors" onClick={() => onArtistClick(comic.authorUid)}>{comic.authorName}</p>
                      <button 
                        onClick={() => onToggleFollow(comic.authorUid, 'artist')}
                        className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border transition-all ${
                          isFollowingArtist 
                            ? 'bg-zinc-100 text-zinc-500 border-zinc-200' 
                            : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                        }`}
                      >
                        {isFollowingArtist ? t('unfollow') : t('follow')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{t('chapters')}</h3>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{chapters.length} {t('chapters')}</span>
                {user && user.uid === comic.authorUid && (
                  <button 
                    onClick={onAddChapter}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors"
                  >
                    <Plus size={14} />
                    {t('addNewChapter')}
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              {chapters.map((ch, idx) => (
                <div key={ch.id} className="flex gap-2">
                  <button 
                    onClick={() => onChapterClick(ch)}
                    className="flex-1 bg-white p-3 sm:p-4 rounded-2xl border border-zinc-100 shadow-sm hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 font-black group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors text-lg sm:text-xl overflow-hidden border border-zinc-100 flex-shrink-0">
                        {ch.thumbnail ? (
                          <img src={ch.thumbnail} className="w-full h-full object-cover" alt={ch.title} referrerPolicy="no-referrer" />
                        ) : (
                          ch.number
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm sm:text-lg font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">
                          {t('chapter')} {ch.number}: {ch.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">{ch.uploadDate}</p>
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-zinc-400">
                            <Eye size={12} />
                            <span>{formatViews(ch.views || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-1.5 sm:p-2 bg-zinc-50 rounded-full text-zinc-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                      <BookOpen size={14} className="sm:w-[16px] sm:h-[16px]" />
                    </div>
                  </button>

                  {user && user.uid === comic.authorUid && (
                    <div className="flex flex-col gap-1">
                      <button 
                        disabled={idx === 0}
                        onClick={() => handleMoveChapter(ch, 'up')}
                        className="p-2 bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-blue-500 hover:border-blue-500 disabled:opacity-30 transition-all"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button 
                        onClick={() => onEditChapter(ch)}
                        className="p-2 bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-blue-500 hover:border-blue-500 transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        disabled={idx === chapters.length - 1}
                        onClick={() => handleMoveChapter(ch, 'down')}
                        className="p-2 bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-blue-500 hover:border-blue-500 disabled:opacity-30 transition-all"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {chapters.length === 0 && (
                <div className="text-center py-12 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                  <p className="text-zinc-500 font-medium">No chapters available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
