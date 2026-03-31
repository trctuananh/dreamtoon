import React from 'react';
import { Search, BookOpen, Home as HomeIcon, Compass, User, Menu, ChevronLeft } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { View } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';

export function Navbar({ 
  user, 
  view, 
  setView, 
  lang, 
  setLang, 
  searchQuery, 
  setSearchQuery, 
  onBack, 
  onLogout, 
  onLogin 
}: { 
  user: FirebaseUser | null, 
  view: View, 
  setView: (v: View) => void, 
  lang: Language, 
  setLang: (l: Language) => void, 
  searchQuery: string, 
  setSearchQuery: (q: string) => void, 
  onBack: () => void, 
  onLogout: () => void, 
  onLogin: () => void 
}) {
  const { t } = useTranslation(lang);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4 lg:gap-8">
        {view !== 'home' ? (
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-900"
          >
            <ChevronLeft size={24} />
          </button>
        ) : (
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tighter text-blue-500">DREAM<span className="text-zinc-900">TOON</span></span>
          </div>
        )}

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => setView('home')}
            className={`text-sm font-bold flex items-center gap-2 transition-colors ${view === 'home' ? 'text-blue-500' : 'text-zinc-500 hover:text-blue-500'}`}
          >
            <HomeIcon size={18} />
            {t('home')}
          </button>
          <button 
            onClick={() => setView('explore')}
            className={`text-sm font-bold flex items-center gap-2 transition-colors ${view === 'explore' ? 'text-blue-500' : 'text-zinc-500 hover:text-blue-500'}`}
          >
            <Compass size={18} />
            {t('originals')}
          </button>
          <button 
            onClick={() => setView('profile')}
            className={`text-sm font-bold flex items-center gap-2 transition-colors ${view === 'profile' ? 'text-blue-500' : 'text-zinc-500 hover:text-blue-500'}`}
          >
            <User size={18} />
            {t('profile')}
          </button>
        </div>
      </div>

      {view === 'home' && (
        <div className="flex-1 max-w-md mx-4 relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-100 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors text-sm text-zinc-900"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button className="sm:hidden p-2 hover:bg-zinc-100 rounded-full text-zinc-600">
          <Search size={22} />
        </button>
        
        {user ? (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('upload')}
              className="hidden sm:block px-4 py-1.5 bg-blue-100 text-blue-600 text-xs sm:text-sm font-bold rounded-full hover:bg-blue-200 transition-colors"
            >
              {t('upload')}
            </button>
            <div className="relative group">
              <img 
                src={user.photoURL || ''} 
                alt={user.displayName || ''} 
                className="w-8 h-8 rounded-full border-2 border-blue-500 cursor-pointer"
                referrerPolicy="no-referrer"
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="px-4 py-2 border-b border-zinc-50">
                  <p className="text-xs font-bold text-zinc-900 truncate">{user.displayName}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                </div>
                <button 
                  onClick={() => setView('profile')}
                  className="w-full text-left px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
                >
                  {t('profile')}
                </button>
                <button 
                  onClick={() => setView('upload')}
                  className="w-full text-left px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50 sm:hidden"
                >
                  {t('uploadWebtoon')}
                </button>
                {user?.email === 'tr.c.tuananh@gmail.com' && (
                  <>
                    <button 
                      onClick={() => setView('create-article')}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                      {t('createArticle')}
                    </button>
                    <button 
                      onClick={() => setView('manage-featured')}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                      Manage Featured
                    </button>
                  </>
                )}
                <div className="px-4 py-2 border-t border-b border-zinc-50 sm:hidden">
                  <p className="text-[10px] font-bold text-zinc-400 mb-2">{t('language')}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setLang('en')} className={`px-2 py-1 rounded text-[10px] ${lang === 'en' ? 'bg-blue-500 text-white' : 'bg-zinc-100'}`}>EN</button>
                    <button onClick={() => setLang('vi')} className={`px-2 py-1 rounded text-[10px] ${lang === 'vi' ? 'bg-blue-500 text-white' : 'bg-zinc-100'}`}>VI</button>
                  </div>
                </div>
                <button 
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50"
                >
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={onLogin}
              className="px-3 py-1.5 sm:px-4 sm:py-1.5 bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-full hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
            >
              {t('login')}
            </button>
          </div>
        )}

        {/* Language Switcher */}
        <div className="hidden sm:flex items-center bg-zinc-100 rounded-full p-1 ml-1">
          <button 
            onClick={() => setLang('en')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${lang === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-500'}`}
          >
            EN
          </button>
          <button 
            onClick={() => setLang('vi')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${lang === 'vi' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-500'}`}
          >
            VI
          </button>
        </div>
        
        <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600 md:hidden">
          <Menu size={24} />
        </button>
      </div>
    </nav>
  );
}
