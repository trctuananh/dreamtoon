import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';

export function LoginModal({ 
  isOpen, 
  onClose, 
  onLogin, 
  onEmailLogin, 
  onEmailRegister, 
  onForgotPassword,
  lang 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onLogin: (provider: 'google' | 'facebook') => void,
  onEmailLogin: (email: string, pass: string) => Promise<void>,
  onEmailRegister: (email: string, pass: string, name: string) => Promise<void>,
  onForgotPassword: (email: string) => Promise<void>,
  lang: Language 
}) {
  const { t } = useTranslation(lang);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (isForgotPassword) {
        await onForgotPassword(email);
        setSuccessMessage(t('passwordResetSent'));
      } else if (isRegistering) {
        await onEmailRegister(email, password, name);
        onClose();
      } else {
        await onEmailLogin(email, password);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || t('errorOccurred'));
    } finally {
      setIsLoading(false);
    }
  };

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
            className="relative bg-white rounded-[40px] p-8 md:p-12 shadow-2xl max-w-md w-full border border-zinc-100 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-900"
            >
              <X size={24} />
            </button>
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-6 shadow-xl shadow-blue-500/10">
                <span className="text-3xl font-black text-blue-600">D</span>
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-1 tracking-tight leading-none">
                {isForgotPassword ? t('forgotPassword') : (isRegistering ? t('register') : t('welcomeBack'))}
              </h2>
              <p className="text-zinc-500 text-sm font-medium">
                {isForgotPassword ? t('enterEmailToReset') : t('loginToContinue')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              {isRegistering && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('yourName')}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email')}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {!isForgotPassword && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('password')}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-12 py-3 text-sm text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {error && (
                <div className="space-y-2">
                  <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>
                  {isForgotPassword && error === t('userNotFound') && (
                    <p className="text-zinc-400 text-[9px] font-bold text-center leading-relaxed px-4">
                      {t('socialLoginHint')}
                    </p>
                  )}
                </div>
              )}

              {successMessage && (
                <p className="text-green-500 text-[10px] font-black uppercase tracking-widest text-center">{successMessage}</p>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 disabled:opacity-50"
              >
                {isLoading ? '...' : (isForgotPassword ? t('send') : (isRegistering ? t('register') : t('login')))}
              </button>
            </form>

            {!isForgotPassword && (
              <>
                <div className="relative flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-zinc-100" />
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">OR</span>
                  <div className="flex-1 h-px bg-zinc-100" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => onLogin('google')}
                    className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-zinc-100 rounded-2xl font-bold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-200 transition-all group"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" alt="Google" referrerPolicy="no-referrer" />
                    <span className="text-xs">Google</span>
                  </button>
                  <button 
                    onClick={() => onLogin('facebook')}
                    className="flex items-center justify-center gap-2 p-3 bg-[#1877F2] text-white rounded-2xl font-bold hover:bg-[#166fe5] transition-all shadow-xl shadow-blue-600/20"
                  >
                    <img src="https://www.facebook.com/favicon.ico" className="w-4 h-4 brightness-0 invert" alt="Facebook" referrerPolicy="no-referrer" />
                    <span className="text-xs">Facebook</span>
                  </button>
                </div>
              </>
            )}

            <div className="mt-8 flex flex-col items-center gap-2">
              {!isForgotPassword && !isRegistering && (
                <button 
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
                >
                  {t('forgotPassword')}
                </button>
              )}
              
              {(isForgotPassword || isRegistering) && (
                <button 
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsRegistering(false);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  {t('backToLogin')}
                </button>
              )}

              {!isForgotPassword && (
                <button 
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  {isRegistering ? t('alreadyHaveAccount') : t('noAccount')}
                </button>
              )}
            </div>

            <p className="mt-8 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
              By continuing, you agree to our <br />
              <span className="text-zinc-900 hover:underline cursor-pointer">Terms of Service</span> & <span className="text-zinc-900 hover:underline cursor-pointer">Privacy Policy</span>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
