import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Copy, Check, Send } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { Language } from '../translations';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
  lang: Language;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareUrl, title, lang }) => {
  const { t } = useTranslation(lang);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnSocial = (platform: 'facebook' | 'twitter' | 'telegram') => {
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`
    };
    window.open(urls[platform], '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-6 flex items-center justify-between bg-zinc-900 text-white">
              <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                <Share2 size={20} />
                {t('share')}
              </h3>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center justify-between gap-4">
                <p className="text-xs text-zinc-500 truncate font-medium">{shareUrl}</p>
                <button 
                  onClick={handleCopyLink}
                  className={`p-2 rounded-xl transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'}`}
                  title={copied ? t('copied') : t('copyLink')}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <button 
                  onClick={() => shareOnSocial('facebook')}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-600/20">
                    <svg width={24} height={24} fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">FB</span>
                </button>
                <button 
                  onClick={() => shareOnSocial('twitter')}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-black/20">
                    <svg width={20} height={20} fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">X</span>
                </button>
                <button 
                  onClick={() => shareOnSocial('telegram')}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-sky-500/20">
                    <Send size={20} className="ml-0.5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">TG</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
