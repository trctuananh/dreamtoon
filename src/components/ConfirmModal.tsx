import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  lang: Language;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  lang,
  isDestructive = true
}: ConfirmModalProps) {
  const { t } = useTranslation(lang);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-zinc-100"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                  <AlertTriangle size={24} />
                </div>
                <button 
                  onClick={onCancel}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400"
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-2xl font-black text-zinc-900 mb-2 tracking-tight">
                {title}
              </h3>
              <p className="text-zinc-500 font-medium leading-relaxed mb-8">
                {message}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
                >
                  {cancelText || t('cancel')}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onCancel();
                  }}
                  className={`flex-1 py-4 px-6 rounded-2xl font-bold text-white transition-all shadow-lg ${
                    isDestructive 
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                      : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
                  }`}
                >
                  {confirmText || (isDestructive ? t('delete') : t('confirm' as any))}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
