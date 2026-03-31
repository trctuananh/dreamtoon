import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';

export function LoginModal({ isOpen, onClose, onLogin, lang }: { isOpen: boolean, onClose: () => void, onLogin: (provider: 'google' | 'facebook') => void, lang: Language }) {
  const { t } = useTranslation(lang);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-[40px] p-12 shadow-2xl max-w-md w-full border border-zinc-100 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-900"
            >
              <X size={24} />
            </button>
            
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-6 shadow-xl shadow-blue-500/10">
                <span className="text-4xl font-black text-blue-600">D</span>
              </div>
              <h2 className="text-3xl font-black text-zinc-900 mb-2 tracking-tight leading-none">{t('welcomeBack')}</h2>
              <p className="text-zinc-500 font-medium">{t('loginToContinue')}</p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => onLogin('google')}
                className="w-full flex items-center justify-center gap-4 px-8 py-4 bg-white border-2 border-zinc-100 rounded-2xl font-bold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-200 transition-all group"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
                {t('loginWithGoogle')}
              </button>
              <button 
                onClick={() => onLogin('facebook')}
                className="w-full flex items-center justify-center gap-4 px-8 py-4 bg-[#1877F2] text-white rounded-2xl font-bold hover:bg-[#166fe5] transition-all shadow-xl shadow-blue-600/20"
              >
                <img src="https://www.facebook.com/favicon.ico" className="w-5 h-5 brightness-0 invert" alt="Facebook" />
                {t('loginWithFacebook')}
              </button>
            </div>

            <p className="mt-10 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
              By continuing, you agree to our <br />
              <span className="text-zinc-900 hover:underline cursor-pointer">Terms of Service</span> & <span className="text-zinc-900 hover:underline cursor-pointer">Privacy Policy</span>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
