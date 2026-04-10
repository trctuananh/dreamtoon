import React, { useState } from 'react';
import { ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Article } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { compressImage } from '../lib/utils';

export function CreateArticleView({ user, profile, lang, onSuccess, onCancel, initialData }: { user: any, profile: UserProfile | null, lang: Language, onSuccess: () => void, onCancel: () => void, initialData?: Article | null }) {
  const { t } = useTranslation(lang);
  const [title, setTitle] = useState(initialData?.title || '');
  const [banner, setBanner] = useState(initialData?.banner || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadProgress(10);
      const compressed = await compressImage(file, 1200, 0.7);
      setBanner(compressed);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 500);
    } catch (err) {
      alert('Failed to process image');
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const articleData = {
        title,
        banner,
        content,
        authorUid: user.uid,
        authorName: profile?.displayName || user.displayName,
        authorPhoto: profile?.photoURL || user.photoURL || '',
        updatedAt: serverTimestamp()
      };

      if (initialData) {
        await updateDoc(doc(db, 'articles', initialData.id), articleData);
      } else {
        await addDoc(collection(db, 'articles'), {
          ...articleData,
          views: 0,
          createdAt: serverTimestamp()
        });
      }
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
        <h2 className="text-3xl font-black tracking-tight">{initialData ? t('edit' as any) : t('createArticle')}</h2>
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
          <label className="block text-sm font-bold text-zinc-700 mb-2">
            {t('bannerImage' as any)} 
            <span className="ml-2 text-xs font-normal text-zinc-400">
              ({t('recommendedSize' as any)})
            </span>
          </label>
          
          <div className="relative">
            {banner ? (
              <div className="relative aspect-[2/1] w-full rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50">
                <img 
                  src={banner} 
                  alt="Banner preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => setBanner('')}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-[2/1] w-full rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-blue-300 cursor-pointer transition-all group">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Upload size={24} className="text-zinc-400 group-hover:text-blue-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-zinc-600">
                      {t('uploadBanner' as any)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      PNG, JPG {lang === 'vi' ? 'lên đến' : 'up to'} 800KB
                    </p>
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {uploadProgress > 0 && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                    <div className="w-48 h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </label>
            )}
          </div>
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
            {isSubmitting ? '...' : (initialData ? t('saveChanges') : t('publishArticle'))}
          </button>
        </div>
      </form>
    </div>
  );
}
