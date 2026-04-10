import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Tag, X } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Comic } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { validateImage, compressImage } from '../lib/utils';

export function UploadView({ user, profile, comics, onSuccess, onCancel, lang, initialData }: { user: FirebaseUser | null, profile: any, comics: Comic[], onSuccess: () => void, onCancel: () => void, lang: Language, initialData?: Comic }) {
  const { t } = useTranslation(lang);
  const GENRES = ['action', 'romance', 'comedy', 'drama', 'fantasy', 'horror', 'sciFi', 'sliceOfLife', 'thriller'];
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    if (!initialData?.genre) return [];
    return initialData.genre.map(g => {
      const key = GENRES.find(k => t(k as any) === g || k === g);
      return key || g;
    }).filter(g => GENRES.includes(g));
  });
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [description, setDescription] = useState(initialData?.description || '');
  const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const suggestedTags = Array.from(new Set(comics.flatMap(c => c.tags || []))).filter(tag => 
    tag.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(tag)
  ).slice(0, 5);

  const handleGenreToggle = (genreKey: string) => {
    if (selectedGenres.includes(genreKey)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genreKey));
    } else if (selectedGenres.length < 2) {
      setSelectedGenres([...selectedGenres, genreKey]);
    }
  };

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await validateImage(file);
    if (!result.valid) {
      setError(result.error || 'Invalid image');
      return;
    }

    try {
      const compressed = await compressImage(file, 400, 0.6);
      setThumbnail(compressed);
    } catch (err) {
      setError('Failed to process image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    // Client-side validation
    if (!title.trim()) {
      setError(t('errorTitleRequired' as any));
      return;
    }
    if (selectedGenres.length === 0) {
      setError(t('errorGenreRequired' as any));
      return;
    }
    if (description.trim().length < 20) {
      setError(t('errorDescriptionMinLength' as any));
      return;
    }
    if (!thumbnail) {
      setError(t('errorThumbnailRequired' as any));
      return;
    }

    setIsUploading(true);
    try {
      let currentPioneerNumber = profile?.pioneerNumber;

      // If user doesn't have a pioneer number, check if they should get one
      if (!currentPioneerNumber && !initialData) {
        const pioneersQuery = query(
          collection(db, 'users'),
          where('pioneerNumber', '>', 0),
          orderBy('pioneerNumber', 'desc'),
          limit(1)
        );
        const pioneersSnap = await getDocs(pioneersQuery);
        let nextNumber = 1;
        
        if (!pioneersSnap.empty) {
          const lastPioneer = pioneersSnap.docs[0].data();
          nextNumber = (lastPioneer.pioneerNumber || 0) + 1;
        }

        if (nextNumber <= 100) {
          await updateDoc(doc(db, 'users', user.uid), {
            pioneerNumber: nextNumber
          });
          await updateDoc(doc(db, 'profiles', user.uid), {
            pioneerNumber: nextNumber
          });
          currentPioneerNumber = nextNumber;
        }
      }

      const comicData = {
        title,
        genre: selectedGenres,
        tags,
        description,
        thumbnail,
        authorUid: user.uid,
        authorName: profile?.displayName || user.displayName,
        authorPhoto: profile?.photoURL || user.photoURL || '',
        authorPioneerNumber: currentPioneerNumber || null,
        updatedAt: serverTimestamp(),
      };

      if (initialData) {
        await updateDoc(doc(db, 'comics', initialData.id), comicData);
      } else {
        await addDoc(collection(db, 'comics'), {
          ...comicData,
          views: 0,
          rating: 0,
          createdAt: serverTimestamp(),
        });
      }
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'comics');
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
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-3xl font-black tracking-tight text-zinc-900">
            {initialData ? t('edit') : t('uploadYourWebtoon')} <span className="text-blue-600">{t('webtoon')}</span>
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1">{t('title')}</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-0.5">{t('genres')}</label>
            <p className="text-xs text-zinc-500 mb-1">{t('selectMax2')}</p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genreKey) => (
                <button
                  key={genreKey}
                  type="button"
                  onClick={() => handleGenreToggle(genreKey)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                    selectedGenres.includes(genreKey) 
                      ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-500 hover:text-blue-500'
                  }`}
                >
                  {t(genreKey as any)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1">{t('tags')}</label>
            <div className="flex flex-wrap gap-2 mb-1">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-full border border-zinc-200">
                  <Tag size={10} />
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input 
                type="text" 
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder={t('tagsPlaceholder')}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {tagInput && suggestedTags.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-white border border-zinc-100 rounded-xl mt-1 shadow-xl z-20 overflow-hidden">
                  <p className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50">{t('suggestedTags')}</p>
                  {suggestedTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1">{t('description')}</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">
                {t('thumbnail')}
                <span className="ml-2 text-[10px] font-normal text-zinc-400 italic">
                  ({t('thumbnailRecommendedSize' as any)})
                </span>
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleFileChange(e)}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {thumbnail && <img src={thumbnail} className="mt-2 h-32 w-24 object-cover rounded-lg" referrerPolicy="no-referrer" />}
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
              {isUploading ? t('uploading') : (initialData ? t('saveChanges') : t('publishWebtoon'))}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
