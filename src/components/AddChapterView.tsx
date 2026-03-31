import React, { useState } from 'react';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { validateImage } from '../lib/utils';

export function AddChapterView({ comicId, authorUid, chapterCount, onSuccess, onCancel, lang }: { comicId: string, authorUid: string, chapterCount: number, onSuccess: () => void, onCancel: () => void, lang: Language }) {
  const { t } = useTranslation(lang);
  const [title, setTitle] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setError(null);
    const newUrls: string[] = [];
    
    for (const file of files) {
      const result = await validateImage(file);
      if (!result.valid) {
        let errorMsg = result.error || '';
        if (result.error?.includes('File size exceeds 20MB limit')) errorMsg = t('errorExceedsSize');
        else if (result.error?.includes('Image width')) {
          const width = result.error.match(/\d+/)?.[0] || '2000';
          errorMsg = t('errorExceedsWidth').replace('{width}', width);
        }
        setError(`${file.name}: ${errorMsg}`);
        return;
      }
      
      // Warning for Firestore limit
      if (file.size > 800 * 1024) {
        setError(t('warningLargeFiles'));
      }

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      newUrls.push(dataUrl);
    }
    
    setImageUrls(prev => [...prev, ...newUrls]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || imageUrls.length === 0) {
      setError("Please provide a title and at least one page image.");
      return;
    }

    const totalSize = imageUrls.reduce((acc, url) => acc + url.length, 0);
    if (totalSize > 900 * 1024) { // ~900KB limit for base64 strings
      setError("Total size of images is too large for a single chapter (Firestore 1MB limit). Please reduce the number of images or their quality.");
      return;
    }

    setIsUploading(true);
    try {
      await addDoc(collection(db, 'comics', comicId, 'chapters'), {
        comicId,
        authorUid,
        title,
        number: chapterCount + 1,
        images: imageUrls,
        uploadDate: new Date().toLocaleDateString(),
        createdAt: serverTimestamp()
      });
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `comics/${comicId}/chapters`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-12 max-w-2xl"
    >
      <div className="bg-white rounded-3xl p-8 shadow-2xl border border-zinc-100">
        <h2 className="text-3xl font-black mb-8 tracking-tight text-zinc-900">{t('addNewChapter')} <span className="text-blue-600">{t('chapter')}</span></h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">{t('chapterTitle')}</label>
            <input 
              required
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('chapterTitle') + " (e.g. Chapter 1)"}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">{t('chapterPages')}</label>
            <div className="space-y-4">
              <input 
                type="file" 
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-[10px] text-zinc-400 italic">{t('rules')}</p>
              
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="aspect-[2/3] bg-zinc-100 rounded-lg overflow-hidden relative group">
                      <img src={url} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} />
                      <button 
                        type="button"
                        onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                      >
                        {t('remove')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 py-4 rounded-full font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
            >
              {t('cancel')}
            </button>
            <button 
              type="submit"
              disabled={isUploading}
              className="flex-1 py-4 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 transition-colors shadow-xl shadow-blue-500/20 disabled:opacity-50"
            >
              {isUploading ? t('uploading') : t('publishChapter')}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
