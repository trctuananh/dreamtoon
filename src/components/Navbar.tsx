import React from 'react';
import { Search, BookOpen, Home as HomeIcon, Compass, User, Menu, ChevronLeft, MessageSquare, Users, PenTool, ChevronDown, Star, LayoutDashboard, HelpCircle, Upload } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { View, UserProfile } from '../types';
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
  onLogin,
  profile,
  unreadNotificationsCount
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
  onLogin: () => void,
  profile: UserProfile | null,
  unreadNotificationsCount: number
}) {
  const { t } = useTranslation(lang);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  return (
    <>
      <nav className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-100 px-4 py-1.5 sm:py-2.5 flex flex-col gap-1 sm:gap-2 ${view === 'reader' ? 'hidden sm:flex' : 'flex'}`}>
        {/* Row 1: Logo, Search, Profile, Menu */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo / Back Button */}
          <div className="flex items-center gap-2 shrink-0">
            {view !== 'home' ? (
              <button 
                onClick={onBack}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-900"
              >
                <ChevronLeft size={24} />
              </button>
            ) : (
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 shadow-lg shadow-purple-500/20 overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                  <span className="relative text-white font-black text-xl italic tracking-tighter">D</span>
                </div>
                <span className="text-xl font-black tracking-tighter uppercase hidden sm:inline">
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">Dream</span>
                  <span className="text-zinc-900">Toon</span>
                </span>
              </div>
            )}
          </div>

          {/* Search Bar - Flexible in middle on mobile, fixed max-width on desktop */}
          {(view === 'home' || view === 'explore' || view === 'community') && (
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text" 
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-full py-1.5 pl-9 pr-4 focus:outline-none focus:border-blue-500 transition-colors text-xs sm:text-sm text-zinc-900"
              />
            </div>
          )}

          {/* Right Actions: Profile, Menu, Desktop Links */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop Nav Links (Hidden on mobile) */}
            <div className="hidden md:flex items-center gap-6 mr-4">
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
              {t('explore')}
            </button>
            
            <button 
              onClick={() => setView('community')}
              className={`text-sm font-bold flex items-center gap-2 transition-colors ${view === 'community' ? 'text-blue-500' : 'text-zinc-500 hover:text-blue-500'}`}
            >
              <Star size={18} className="text-amber-500" />
              {t('dreamWorld')}
            </button>

            {user && (
              <button 
                onClick={() => setView('my-wall')}
                className={`text-sm font-bold flex items-center gap-2 transition-colors ${view === 'my-wall' ? 'text-blue-500' : 'text-zinc-500 hover:text-blue-500'}`}
              >
                <Users size={18} />
                {t('myWall')}
              </button>
            )}
          </div>

            {/* Profile / Login */}
            {user ? (
              <div className="relative group">
                <img 
                  src={profile?.photoURL || user.photoURL || ''} 
                  alt={profile?.displayName || user.displayName || ''} 
                  className="w-8 h-8 rounded-full border-2 border-blue-500 cursor-pointer"
                  referrerPolicy="no-referrer"
                  onClick={() => setView('profile')}
                />
                {/* Desktop Profile Dropdown */}
                <div className="hidden sm:block absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-4 py-2 border-b border-zinc-50">
                    <p className="text-xs font-bold text-zinc-900 truncate">{profile?.displayName || user.displayName}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => setView('upload')}
                    className="w-full text-left px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50 flex items-center gap-2"
                  >
                    <Upload size={14} className="text-blue-500" />
                    {t('upload')}
                  </button>
                  <button 
                    onClick={() => setView('profile')}
                    className="w-full text-left px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50 flex items-center gap-2"
                  >
                    <User size={14} />
                    {t('profile')}
                  </button>
                  <button 
                    onClick={() => setView('notifications')}
                    className="w-full text-left px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50 flex items-center justify-between"
                  >
                    <span>{t('notifications')}</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                  {(user?.email === 'tr.c.tuananh@gmail.com' || profile?.role === 'admin') && (
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
                      <button 
                        onClick={() => setView('admin-users')}
                        className="w-full text-left px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
                      >
                        Manage Users
                      </button>
                    </>
                  )}
                  <button 
                    onClick={onLogout}
                    className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50"
                  >
                    {t('logout')}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
              >
                {t('login')}
              </button>
            )}

            {/* Menu Button (Mobile) */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600 md:hidden"
            >
              <Menu size={24} />
            </button>

            {/* Language Switcher (Desktop) */}
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
          </div>
        </div>

        {/* Row 2: Home, Explore, Dreamers (Mobile Only) */}
        <div className="flex items-center justify-around py-1 border-t border-zinc-50 md:hidden">
          <button 
            onClick={() => setView('home')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${view === 'home' ? 'text-blue-500' : 'text-zinc-500'}`}
          >
            <HomeIcon size={18} />
            <span className="text-[10px] font-bold">{t('home')}</span>
          </button>
          <button 
            onClick={() => setView('explore')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${view === 'explore' ? 'text-blue-500' : 'text-zinc-500'}`}
          >
            <Compass size={18} />
            <span className="text-[10px] font-bold">{t('explore')}</span>
          </button>
          <button 
            onClick={() => setView('community')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${view === 'community' ? 'text-blue-500' : 'text-zinc-500'}`}
          >
            <Star size={18} className="text-amber-500" />
            <span className="text-[10px] font-bold">{t('dreamWorld')}</span>
          </button>
          {user && (
            <button 
              onClick={() => setView('my-wall')}
              className={`flex flex-col items-center gap-0.5 transition-colors ${view === 'my-wall' ? 'text-blue-500' : 'text-zinc-500'}`}
            >
              <Users size={18} />
              <span className="text-[10px] font-bold">{t('myWall')}</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white md:hidden overflow-y-auto">
          <div className="p-4 flex items-center justify-between border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 shadow-lg shadow-purple-500/20 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-white font-black text-xl italic tracking-tighter">D</span>
              </div>
              <span className="text-xl font-black tracking-tighter uppercase">
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">Dream</span>
                <span className="text-zinc-900">Toon</span>
              </span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:bg-zinc-100 rounded-full text-zinc-900"
            >
              <ChevronLeft size={24} />
            </button>
          </div>
          <div className="p-6 space-y-8">
            {user && (
              <div className="space-y-4">
                <button 
                  onClick={() => { setView('upload'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left py-3 text-lg font-black flex items-center gap-4 ${view === 'upload' ? 'text-blue-500' : 'text-zinc-900'}`}
                >
                  <Upload size={24} className="text-blue-500" />
                  {t('upload')}
                </button>
                <button 
                  onClick={() => { setView('profile'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left py-3 text-lg font-black flex items-center gap-4 ${view === 'profile' ? 'text-blue-500' : 'text-zinc-900'}`}
                >
                  <User size={24} />
                  {t('profile')}
                </button>
                <button 
                  onClick={() => { setView('notifications'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left py-3 text-lg font-black flex items-center justify-between ${view === 'notifications' ? 'text-blue-500' : 'text-zinc-900'}`}
                >
                  <div className="flex items-center gap-4">
                    <Star size={24} className="text-blue-500" />
                    {t('notifications')}
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            <div className="space-y-4">
              <button 
                onClick={() => { window.open('https://discord.gg/S2pabzV6', '_blank'); setIsMobileMenuOpen(false); }}
                className="w-full text-left py-3 text-lg font-black flex items-center gap-4 text-zinc-900"
              >
                <MessageSquare size={24} className="text-indigo-500" />
                {t('discord')}
              </button>
              <button 
                onClick={() => { setView('support'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left py-3 text-lg font-black flex items-center gap-4 ${view === 'support' ? 'text-blue-500' : 'text-zinc-900'}`}
              >
                <HelpCircle size={24} />
                {t('support')}
              </button>
            </div>

            <div className="pt-8 border-t border-zinc-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">{t('language')}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setLang('en')} className={`px-4 py-2 rounded-xl text-xs font-bold ${lang === 'en' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-100 text-zinc-500'}`}>English</button>
                    <button onClick={() => setLang('vi')} className={`px-4 py-2 rounded-xl text-xs font-bold ${lang === 'vi' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-100 text-zinc-500'}`}>Tiếng Việt</button>
                  </div>
                </div>
              </div>
              {user ? (
                <button 
                  onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                  className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-center"
                >
                  {t('logout')}
                </button>
              ) : (
                <button 
                  onClick={() => { onLogin(); setIsMobileMenuOpen(false); }}
                  className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black text-center shadow-xl shadow-blue-500/20"
                >
                  {t('login')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
