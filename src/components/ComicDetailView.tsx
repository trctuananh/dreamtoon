import React from 'react';
import { ArrowLeft, Compass, Star, Clock, BookOpen, Share2, Heart, MessageCircle, Send, Trash2, Plus } from 'lucide-react';
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
  onToggleFollow: (id: string, type: 'artist' | 'comic') => void, 
  onAddChapter: () => void,
  onBack: () => void
}) {
  const { t } = useTranslation(lang);
  const isFollowingComic = following.some(f => f.targetId === comic.id && f.type === 'comic');
  const isFollowingArtist = following.some(f => f.targetId === comic.authorUid && f.type === 'artist');

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Hero Banner */}
      <div className="relative h-[400px] w-full overflow-hidden">
        <img 
          src={comic.banner} 
          alt={comic.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 via-zinc-50/50 to-transparent" />
        <button 
          onClick={onBack}
          className="absolute top-8 left-8 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-xl hover:bg-white transition-all text-zinc-900"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10 max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column: Info Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-3xl p-8 shadow-2xl border border-zinc-100 sticky top-8">
              <img 
                src={comic.thumbnail} 
                alt={comic.title} 
                className="w-full aspect-[2/3] object-cover rounded-2xl shadow-2xl mb-8"
                referrerPolicy="no-referrer"
              />
              
              <div className="flex flex-wrap gap-2 mb-6">
                {comic.genre.map(g => (
                  <span key={g} className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-100">
                    {t(g as any)}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="text-center p-4 bg-zinc-50 rounded-2xl">
                  <p className="text-xl font-black text-blue-600">{formatViews(comic.views)}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('views')}</p>
                </div>
                <div className="text-center p-4 bg-zinc-50 rounded-2xl">
                  <p className="text-xl font-black text-yellow-500">{comic.rating}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('rating')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => onToggleFollow(comic.id, 'comic')}
                  className={`w-full py-4 rounded-full font-bold text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                    isFollowingComic 
                      ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' 
                      : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20'
                  }`}
                >
                  <Heart size={18} className={isFollowingComic ? 'fill-zinc-600' : ''} />
                  {isFollowingComic ? t('unfollow') : t('follow')}
                </button>
                <button 
                  onClick={() => {
                    if (chapters.length > 0) onChapterClick(chapters[0]);
                  }}
                  disabled={chapters.length === 0}
                  className="w-full py-4 bg-zinc-900 text-white rounded-full font-bold text-sm hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 disabled:opacity-50"
                >
                  {t('readNow')}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Content */}
          <div className="md:col-span-2 pt-32">
            <h1 className="text-5xl font-black text-zinc-900 mb-4 tracking-tight leading-none">{comic.title}</h1>
            
            <div className="flex items-center gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {comic.authorName?.[0] || 'A'}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('author')}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-zinc-900">{comic.authorName}</p>
                    <button 
                      onClick={() => onToggleFollow(comic.authorUid, 'artist')}
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all ${
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
              <div className="h-10 w-px bg-zinc-200" />
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('rateThis')}</p>
                <StarRating 
                  rating={userRating} 
                  onRate={onRate} 
                  lang={lang} 
                  isSubmitting={isRatingSubmitting} 
                  success={ratingSuccess} 
                />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm mb-8">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">{t('synopsis')}</h3>
              <p className="text-zinc-600 leading-relaxed">{comic.description}</p>
              
              {comic.tags && comic.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {comic.tags.map(tag => (
                    <span key={tag} className="text-xs font-bold text-zinc-400 hover:text-blue-500 cursor-pointer transition-colors">#{tag}</span>
                  ))}
                </div>
              )}
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
              {chapters.map(ch => (
                <button 
                  key={ch.id}
                  onClick={() => onChapterClick(ch)}
                  className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 font-black group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      {ch.number}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">{ch.title}</h4>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{ch.uploadDate}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-zinc-50 rounded-full text-zinc-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <BookOpen size={16} />
                  </div>
                </button>
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
