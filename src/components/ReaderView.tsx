import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronUp, ArrowLeft, ArrowRight, Heart, Facebook, Twitter, Copy, Check, MessageCircle, Send, Trash2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, runTransaction, increment, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Comic, Chapter, Comment, Like } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { formatViews } from '../lib/utils';

export function ReaderView({ 
  comic, 
  chapter, 
  chapters, 
  user, 
  lang, 
  likes, 
  comments, 
  onToggleLike, 
  onAddComment, 
  onDeleteComment, 
  onChapterClick, 
  onNextChapter, 
  onPrevChapter,
  onBack
}: { 
  comic: Comic, 
  chapter: Chapter, 
  chapters: Chapter[], 
  user: any, 
  lang: Language, 
  likes: Like[], 
  comments: Comment[], 
  onToggleLike: () => void, 
  onAddComment: (text: string, parentId?: string, replyTo?: string) => void, 
  onDeleteComment: (commentId: string) => void, 
  onChapterClick: (chapter: Chapter) => void, 
  onNextChapter: () => void, 
  onPrevChapter: () => void,
  onBack: () => void
}) {
  const { t } = useTranslation(lang);
  const [showControls, setShowControls] = useState(true);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [chapterImages, setChapterImages] = useState<string[]>(chapter.images || []);
  const isLiked = user && likes.some(l => l.userId === user.uid && l.targetId === chapter.id);

  useEffect(() => {
    // Reset images when chapter changes
    setChapterImages(chapter.images || []);

    // Fetch from subcollection
    const q = query(
      collection(db, 'comics', comic.id, 'chapters', chapter.id, 'pages'), 
      orderBy('order', 'asc'),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const pages = snapshot.docs.map(doc => doc.data().imageUrl);
        setChapterImages(pages);
      }
    });

    return () => unsubscribe();
  }, [chapter.id, comic.id, chapter.images]);

  const handleShare = (platform: 'fb' | 'x' | 'copy') => {
    // Construct the URL using the custom domain
    const url = `https://dreamtoon.vn/reader/${comic.id}/${chapter.id}`;
    if (platform === 'fb') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'x') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, '_blank');
    } else {
      navigator.clipboard.writeText(url);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-4">
      {/* Top Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-4 py-1.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3 min-w-0">
                {chapter.thumbnail && (
                  <img src={chapter.thumbnail} className="w-8 h-8 rounded-lg object-cover border border-zinc-800" alt={chapter.title} referrerPolicy="no-referrer" />
                )}
                <div className="flex flex-col min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">{chapter.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{comic.title}</span>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                      <Eye size={10} />
                      <span>{formatViews(chapter.views || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <select 
                value={chapter.id}
                onChange={(e) => {
                  const selected = chapters.find(c => c.id === e.target.value);
                  if (selected) onChapterClick(selected);
                }}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
              >
                {chapters.map(c => (
                  <option key={c.id} value={c.id}>{t('chapter')} {c.number}: {c.title}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter Content */}
      <div className="max-w-3xl mx-auto pt-12" onClick={() => setShowControls(!showControls)}>
        {chapterImages.map((url, idx) => (
          <img 
            key={idx} 
            src={url} 
            alt={`Page ${idx + 1}`} 
            className="w-full h-auto block"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ))}
      </div>

      {/* Navigation & Sharing */}
      <div className="max-w-3xl mx-auto px-4 py-4 border-t border-zinc-900 mt-2">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-4 w-full justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); onPrevChapter(); }}
              disabled={chapter.number <= 1}
              className="flex-1 max-w-[160px] flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-30"
            >
              <ArrowLeft size={18} />
              {t('previousChapter')}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onBack(); }}
              className="flex-1 max-w-[160px] flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
            >
              {t('backToSeries')}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onNextChapter(); }}
              disabled={chapter.number >= chapters.length}
              className="flex-1 max-w-[160px] flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-30"
            >
              {t('nextChapter')}
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); handleShare('fb'); }}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-blue-600 hover:border-blue-500 transition-all group"
            >
              <Facebook size={20} className="group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleShare('x'); }}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
            >
              <Twitter size={20} className="group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleShare('copy'); }}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 hover:border-zinc-700 transition-all group relative"
            >
              {shareSuccess ? <Check size={20} className="text-green-500" /> : <Copy size={20} className="group-hover:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        {/* Advertisement Space */}
        <div className="mt-8 mb-4 bg-zinc-900/30 rounded-2xl p-8 border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 min-h-[150px]">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-50">Advertisement Space</div>
          <p className="text-xs font-medium italic">Your ad content will appear here</p>
        </div>

        {/* Interaction Section */}
        <div className="mt-4 bg-zinc-900/50 rounded-3xl p-3 border border-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-6">
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
                className={`flex items-center gap-2 font-bold transition-colors ${isLiked ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}
              >
                <Heart size={24} className={isLiked ? 'fill-red-500' : ''} />
                <span>{likes.length}</span>
              </button>
              <div className="flex items-center gap-2 text-zinc-400 font-bold">
                <MessageCircle size={24} />
                <span>{comments.length}</span>
              </div>
            </div>
          </div>

          {/* Comment Form */}
          <form 
            onSubmit={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              if (!commentText.trim()) return;
              onAddComment(commentText);
              setCommentText('');
            }} 
            className="mb-2"
          >
            <div className="relative">
              <textarea 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={t('addComment')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                rows={3}
              />
              <button 
                type="submit"
                disabled={!commentText.trim()}
                className="absolute bottom-4 right-4 p-2 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-2">
            {comments.filter(c => !c.parentId).map(comment => (
              <div key={comment.id} className="space-y-1">
                <div className="flex gap-4 group">
                  <img 
                    src={comment.userPhoto || undefined} 
                    alt={comment.userName} 
                    className="w-10 h-10 rounded-full border-2 border-zinc-800 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-zinc-200">{comment.userName}</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString() : '...'}
                        </span>
                        {user && (user.uid === comment.uid || user.uid === comic.authorUid) && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteComment(comment.id); }}
                            className="p-1 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-2">{comment.content}</p>
                    
                    {user && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyingTo(replyingTo === comment.id ? null : comment.id);
                          setReplyText('');
                        }}
                        className="text-[10px] font-bold text-zinc-500 hover:text-blue-500 uppercase tracking-widest transition-colors"
                      >
                        {t('reply')}
                      </button>
                    )}

                    {/* Reply Form */}
                    <AnimatePresence>
                      {replyingTo === comment.id && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden"
                        >
                          <div className="relative">
                            <textarea 
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder={`${t('reply')} to ${comment.userName}...`}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                              rows={2}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button 
                                onClick={() => setReplyingTo(null)}
                                className="px-4 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                              >
                                {t('cancel')}
                              </button>
                              <button 
                                onClick={() => {
                                  if (!replyText.trim()) return;
                                  onAddComment(replyText, comment.id, comment.userName);
                                  setReplyText('');
                                  setReplyingTo(null);
                                }}
                                disabled={!replyText.trim()}
                                className="px-4 py-1.5 bg-blue-600 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                {t('reply')}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Replies */}
                <div className="ml-14 space-y-1">
                  {comments.filter(r => r.parentId === comment.id).map(reply => (
                    <div key={reply.id} className="flex gap-3 group">
                      <img 
                        src={reply.userPhoto || undefined} 
                        alt={reply.userName} 
                        className="w-8 h-8 rounded-full border border-zinc-800 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-zinc-200">{reply.userName}</h4>
                            {reply.replyTo && (
                              <span className="text-[10px] text-blue-500 font-bold">@{reply.replyTo}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                              {reply.createdAt?.toDate ? reply.createdAt.toDate().toLocaleDateString() : '...'}
                            </span>
                            {user && (user.uid === reply.uid || user.uid === comic.authorUid) && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteComment(reply.id); }}
                                className="p-1 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Controls */}
      <AnimatePresence>
        {!showControls && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full px-2 py-2 shadow-2xl"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); onPrevChapter(); }}
              disabled={chapter.number <= 1}
              className="p-3 hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 py-1 border-x border-zinc-800 flex flex-col items-center">
              <span className="text-xs font-bold tracking-widest uppercase">{t('chapter')} {chapter.number}</span>
              <div className="flex items-center gap-1 text-[8px] font-bold text-zinc-500">
                <Eye size={8} />
                <span>{formatViews(chapter.views || 0)}</span>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onNextChapter(); }}
              disabled={chapter.number >= chapters.length}
              className="p-3 hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-30"
            >
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="p-3 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ChevronUp size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
