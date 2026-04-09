import React from 'react';
import { BookOpen, Facebook, Twitter, Share2, MessageSquare } from 'lucide-react';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { View } from '../types';

export function Footer({ lang, onViewChange }: { lang: Language, onViewChange?: (view: View) => void }) {
  const { t } = useTranslation(lang);

  return (
    <footer className="bg-zinc-950 text-white py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900 shadow-lg shadow-purple-500/20 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-white font-black text-2xl italic tracking-tighter">D</span>
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase">
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">Dream</span>
                <span className="text-white">Toon</span>
              </span>
            </div>
            <p className="text-zinc-500 max-w-sm leading-relaxed font-medium">
              {t('footerDescription' as any)}
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-zinc-400">{t('connect' as any)}</h4>
            <div className="flex gap-4">
              <a href="#" className="p-3 bg-zinc-900 rounded-2xl hover:bg-blue-600 transition-all group">
                <Facebook size={20} className="group-hover:scale-110 transition-transform" />
              </a>
              <a href="#" className="p-3 bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-all group">
                <Twitter size={20} className="group-hover:scale-110 transition-transform" />
              </a>
              <a href="#" className="p-3 bg-zinc-900 rounded-2xl hover:bg-[#5865F2] transition-all group">
                <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
              </a>
              <a href="#" className="p-3 bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-all group">
                <Share2 size={20} className="group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
          <p>© 2026 DREAMTOON. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <button 
              onClick={() => onViewChange?.('privacy')}
              className="hover:text-white transition-colors"
            >
              {t('privacyPolicy' as any)}
            </button>
            <button className="hover:text-white transition-colors">{t('termsOfService' as any)}</button>
            <button className="hover:text-white transition-colors">{t('cookiePolicy' as any)}</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
