import React from 'react';
import { ArrowLeft, Clock, Compass, Share2, Twitter, Facebook, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Article } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { formatViews } from '../lib/utils';

export function ArticleView({ article, lang, onBack }: { article: Article, lang: Language, onBack: () => void }) {
  const { t } = useTranslation(lang);
  const [shareSuccess, setShareSuccess] = React.useState(false);

  const handleShare = (platform: 'fb' | 'x' | 'copy') => {
    const url = window.location.href;
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
    <div className="min-h-screen bg-white pb-4">
      <div className="relative h-[300px] w-full overflow-hidden bg-zinc-200">
        {article.banner ? (
          <img 
            src={article.banner} 
            alt={article.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center">
            <Compass size={64} className="text-zinc-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
        <button 
          onClick={onBack}
          className="absolute top-8 left-8 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-xl hover:bg-white transition-all text-zinc-900"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 max-w-4xl">
        <div className="bg-white rounded-[40px] p-4 shadow-2xl border border-zinc-100">
          <div className="flex items-center gap-4 mb-2 text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 w-fit px-4 py-2 rounded-full">
            <Clock size={14} />
            {article.createdAt?.toDate ? article.createdAt.toDate().toLocaleDateString() : '...'}
          </div>
          
          <h1 className="text-5xl font-black text-zinc-900 mb-2 tracking-tight leading-tight">{article.title}</h1>
          
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold">
                {article.authorName?.[0] || 'A'}
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('author')}</p>
                <p className="font-bold text-zinc-900">{article.authorName}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('views')}</p>
                <p className="font-bold text-zinc-900 flex items-center gap-2 justify-end">
                  <Compass size={14} className="text-blue-500" />
                  {formatViews(article.views || 0)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleShare('fb')}
                  className="p-2 bg-zinc-50 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all"
                >
                  <Facebook size={18} />
                </button>
                <button 
                  onClick={() => handleShare('x')}
                  className="p-2 bg-zinc-50 rounded-full hover:bg-zinc-100 hover:text-zinc-900 transition-all"
                >
                  <Twitter size={18} />
                </button>
                <button 
                  onClick={() => handleShare('copy')}
                  className="p-2 bg-zinc-50 rounded-full hover:bg-zinc-100 hover:text-zinc-900 transition-all relative"
                >
                  {shareSuccess ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="prose prose-zinc prose-lg max-w-none">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
