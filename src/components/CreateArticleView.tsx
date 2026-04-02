import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';

export function CreateArticleView({ user, profile, lang, onSuccess, onCancel }: { user: any, profile: UserProfile | null, lang: Language, onSuccess: () => void, onCancel: () => void }) {
  const { t } = useTranslation(lang);
  const [title, setTitle] = useState('');
  const [banner, setBanner] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'articles'), {
        title,
        banner,
        content,
        authorUid: user.uid,
        authorName: profile?.displayName || user.displayName,
        authorPhoto: profile?.photoURL || user.photoURL || '',
        views: 0,
        createdAt: serverTimestamp()
      });
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'articles');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tight">{t('createArticle')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">{t('articleTitle')}</label>
          <input 
            required
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Enter article title..."
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">Banner URL</label>
          <input 
            required
            type="url" 
            value={banner}
            onChange={(e) => setBanner(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="https://example.com/banner.jpg"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">{t('articleContent')}</label>
          <textarea 
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors min-h-[400px] font-mono text-sm"
            placeholder="# Markdown Title..."
          />
        </div>
        <div className="flex justify-end gap-4">
          <button 
            type="button"
            onClick={onCancel}
            className="px-8 py-3 font-bold text-zinc-500 hover:bg-zinc-100 rounded-full transition-colors"
          >
            {t('cancel')}
          </button>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 transition-colors shadow-xl shadow-blue-500/20 disabled:opacity-50"
          >
            {isSubmitting ? '...' : t('publishArticle')}
          </button>
        </div>
      </form>
    </div>
  );
}
