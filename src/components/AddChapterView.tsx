import React, { useState } from 'react';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, createNotification } from '../firebase';
import { Language } from '../translations';
import { Chapter } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { validateImage } from '../lib/utils';

export function AddChapterView({ comicId, authorUid, chapterCount, initialData, onSuccess, onCancel, lang }: { comicId: string, authorUid: string, chapterCount: number, initialData?: Chapter, onSuccess: () => void, onCancel: () => void, lang: Language }) {
  const { t } = useTranslation(lang);
  const [title, setTitle] = useState(initialData?.title || '');
  const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || '');
  const [imageUrls, setImageUrls] = useState<string[]>(initialData?.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await validateImage(file);
    if (!result.valid) {
      setError(result.error || 'Invalid image');
      return;
    }

    if (file.size > 500 * 1024) {
      setError(t('warningLargeFiles'));
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setThumbnail(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

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

  const handleRemoveImage = (idx: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || imageUrls.length === 0) {
      setError("Please provide a title and at least one page image.");
      return;
    }

    const totalSize = imageUrls.reduce((acc, url) => acc + url.length, 0);
    if (totalSize > 1024 * 1024) { // 1MB limit for Firestore
      setError("Total size of images is too large for a single chapter (Max 1MB). Please use fewer or smaller images.");
      return;
    }

    setIsUploading(true);
    try {
      const chapterData = {
        title,
        thumbnail,
        images: imageUrls,
      };

      if (initialData) {
        await updateDoc(doc(db, 'comics', comicId, 'chapters', initialData.id), chapterData);
      } else {
        await addDoc(collection(db, 'comics', comicId, 'chapters'), {
          ...chapterData,
          comicId,
          authorUid,
          number: chapterCount + 1,
          uploadDate: new Date().toLocaleDateString(),
          createdAt: serverTimestamp()
        });
        // Update parent comic's updatedAt and chapterCount
        await updateDoc(doc(db, 'comics', comicId), {
          updatedAt: serverTimestamp(),
          chapterCount: chapterCount + 1
        });

        // Notify followers
        try {
          const followersQuery = query(collection(db, 'follows'), where('targetId', '==', comicId));
          const followersSnap = await getDocs(followersQuery);
          
          followersSnap.docs.forEach(followerDoc => {
            const followerData = followerDoc.data();
            createNotification({
              recipientId: followerData.userId,
              type: 'new_chapter',
              targetId: comicId,
              targetTitle: title,
              senderId: authorUid,
              senderName: 'DreamToon', // Or fetch author name
              senderPhoto: '' // Or fetch author photo
            });
          });
        } catch (err) {
          console.error("Error notifying followers:", err);
        }
      }
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, initialData ? OperationType.UPDATE : OperationType.CREATE, `comics/${comicId}/chapters`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-3 max-w-2xl"
    >
      <div className="bg-white rounded-3xl p-3 shadow-2xl border border-zinc-100">
        <h2 className="text-3xl font-black mb-2 tracking-tight text-zinc-900">{t('addNewChapter')} <span className="text-blue-600">{t('chapter')}</span></h2>
        
        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1">{t('chapterTitle')}</label>
            <input 
              required
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('chapterTitle') + " (e.g. Chapter 1)"}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1">
              {t('thumbnail')}
              <span className="ml-2 text-[10px] font-normal text-zinc-400 italic lowercase">
                ({t('chapterThumbnailRecommendedSize' as any)})
              </span>
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-zinc-100 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-200">
                {thumbnail ? (
                  <img src={thumbnail} className="w-full h-full object-cover" alt="Chapter Thumbnail" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    <span className="text-[10px] font-bold uppercase">No Pic</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleThumbnailChange}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1">
              {t('chapterPages')}
              <span className="ml-2 text-[10px] font-normal text-zinc-400 italic lowercase">
                ({t('chapterRecommendedSize' as any)})
              </span>
            </label>
            <div className="space-y-1">
              <input 
                type="file" 
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="aspect-[2/3] bg-zinc-100 rounded-lg overflow-hidden relative group">
                      <img src={url} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} referrerPolicy="no-referrer" />
                      <button 
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
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

          <div className="flex gap-4 pt-1">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 rounded-full font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
            >
              {t('cancel')}
            </button>
            <button 
              type="submit"
              disabled={isUploading}
              className="flex-1 py-2 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 transition-colors shadow-xl shadow-blue-500/20 disabled:opacity-50"
            >
              {isUploading ? t('uploading') : t('publishChapter')}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
