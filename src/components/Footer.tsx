import React from 'react';
import { BookOpen, Facebook, Twitter, Share2, MessageSquare } from 'lucide-react';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';

export function Footer({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);

  return (
    <footer className="bg-zinc-950 text-white py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <BookOpen size={24} className="text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-blue-500">DREAM<span className="text-white">TOON</span></span>
            </div>
            <p className="text-zinc-500 max-w-sm leading-relaxed font-medium">
              The next generation platform for digital storytellers and dreamers. Join our community and share your stories with the world.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-zinc-400">Connect</h4>
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
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
