/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Menu, 
  ChevronLeft, 
  Trash2,
  ChevronUp,
  Star, 
  Clock, 
  BookOpen, 
  ArrowRight,
  ArrowLeft,
  Home as HomeIcon,
  Compass,
  Library,
  User,
  Heart,
  MessageCircle,
  Send,
  Share2,
  Copy,
  Check,
  FileText,
  Layout,
  Plus,
  X,
  Tag,
  Facebook
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Comic, Chapter, View, Like, Comment, Article, FeaturedItem, Following } from './types';
import { SAMPLE_COMICS } from './constants';
import { translations, Language } from './translations';
import { auth, db, googleProvider, facebookProvider, handleFirestoreError, OperationType } from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  where,
  runTransaction,
  collectionGroup,
  getDocs,
  limit,
  updateDoc,
  increment
} from 'firebase/firestore';

const formatViews = (views: number) => {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return views.toString();
};

// Image Validation Helper
const validateImage = async (file: File): Promise<{ valid: boolean; error?: string }> => {
  // 1. Max Size 20MB
  if (file.size > 20 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 20MB limit.' };
  }

  // 2. Width Max 1200px (Increased from 800px)
  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  });

  if (dimensions.width > 2000) { // Increased to 2000px for better compatibility
    return { valid: false, error: `Image width (${dimensions.width}px) exceeds 2000px limit.` };
  }

  return { valid: true };
};

function AddChapterView({ comicId, authorUid, chapterCount, onSuccess, onCancel, lang }: { comicId: string, authorUid: string, chapterCount: number, onSuccess: () => void, onCancel: () => void, lang: Language }) {
  const t = (key: keyof typeof translations.en) => translations[lang][key] || translations.en[key];
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

function UploadView({ user, comics, onSuccess, onCancel, lang, initialData }: { user: FirebaseUser | null, comics: Comic[], onSuccess: () => void, onCancel: () => void, lang: Language, initialData?: Comic }) {
  const t = (key: keyof typeof translations.en) => translations[lang][key] || translations.en[key];
  const GENRES = ['action', 'romance', 'comedy', 'drama', 'fantasy', 'horror', 'sciFi', 'sliceOfLife', 'thriller'];
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    if (!initialData?.genre) return [];
    // Map existing genres to keys if they aren't already
    return initialData.genre.map(g => {
      const key = GENRES.find(k => t(k as any) === g || k === g);
      return key || g;
    }).filter(g => GENRES.includes(g));
  });
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [description, setDescription] = useState(initialData?.description || '');
  const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || '');
  const [banner, setBanner] = useState(initialData?.banner || '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get unique tags from existing comics for suggestions
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

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'thumbnail' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const result = await validateImage(file);
    if (!result.valid) {
      let errorMsg = result.error || '';
      if (result.error?.includes('File size exceeds 20MB limit')) errorMsg = t('errorExceedsSize');
      else if (result.error?.includes('Image width')) {
        const width = result.error.match(/\d+/)?.[0] || '2000';
        errorMsg = t('errorExceedsWidth').replace('{width}', width);
      }
      setError(`${type === 'thumbnail' ? t('thumbnail') : t('banner')}: ${errorMsg}`);
      return;
    }

    if (file.size > 800 * 1024) {
      setError(t('warningLargeFiles'));
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (type === 'thumbnail') setThumbnail(dataUrl);
      else setBanner(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("You must be logged in to upload.");
      return;
    }

    if (!title || selectedGenres.length === 0 || !description || !thumbnail || !banner) {
      setError("Please fill in all required fields and upload both thumbnail and banner.");
      return;
    }

    const totalSize = (thumbnail.length || 0) + (banner.length || 0);
    if (totalSize > 900 * 1024) { // ~900KB limit for base64 strings
      setError("Thumbnail and banner are too large (Firestore 1MB limit). Please use smaller images.");
      return;
    }

    setIsUploading(true);
    try {
      const comicData = {
        title,
        authorName: user.displayName || 'Anonymous',
        authorUid: user.uid,
        genre: selectedGenres,
        tags,
        description,
        thumbnail,
        banner,
        updatedAt: serverTimestamp()
      };

      if (initialData) {
        await setDoc(doc(db, 'comics', initialData.id), comicData, { merge: true });
      } else {
        await addDoc(collection(db, 'comics'), {
          ...comicData,
          rating: 0,
          ratingCount: 0,
          views: 0,
          createdAt: serverTimestamp()
        });
      }
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, initialData ? OperationType.UPDATE : OperationType.CREATE, 'comics');
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
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onCancel} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-900">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900">
            {initialData ? t('edit') : t('uploadYourWebtoon')} <span className="text-blue-600">{t('webtoon')}</span>
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">{t('title')}</label>
            <input 
              required
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1">{t('genres')}</label>
            <p className="text-xs text-zinc-500 mb-3">{t('selectMax2')}</p>
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
            <label className="block text-sm font-bold text-zinc-700 mb-2">{t('tags')}</label>
            <div className="flex flex-wrap gap-2 mb-3">
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
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
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
            <label className="block text-sm font-bold text-zinc-700 mb-2">{t('description')}</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">{t('thumbnail')}</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'thumbnail')}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {thumbnail && <img src={thumbnail} className="mt-2 h-32 w-24 object-cover rounded-lg" />}
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">{t('banner')}</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'banner')}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {banner && <img src={banner} className="mt-2 h-20 w-full object-cover rounded-lg" />}
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
              {isUploading ? t('uploading') : (initialData ? t('saveChanges') : t('publishWebtoon'))}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

function CreateArticleView({ user, lang, onSuccess, onCancel }: { user: any, lang: Language, onSuccess: () => void, onCancel: () => void }) {
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || translations['en'][key];
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
        authorName: user.displayName,
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
            placeholder="https://images.unsplash.com/..."
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">Content (Markdown)</label>
          <textarea 
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors min-h-[400px] font-mono text-sm"
            placeholder="# Your content here..."
          />
        </div>
        <div className="flex gap-4 pt-4">
          <button 
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-500 text-white py-4 rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Publishing...' : t('publishArticle')}
          </button>
          <button 
            type="button"
            onClick={onCancel}
            className="px-8 py-4 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ArticleDetailView({ article, user, lang, onBack, onFeature }: { article: Article, user: any, lang: Language, onBack: () => void, onFeature: (item: Article, type: 'article') => void }) {
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || translations['en'][key];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pb-20"
    >
      <div className="relative h-[300px] sm:h-[500px]">
        <img 
          src={article.banner} 
          alt={article.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
        <button 
          onClick={onBack}
          className="absolute top-8 left-8 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg hover:bg-white transition-colors z-20"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10">
        <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl shadow-zinc-200/50 border border-zinc-100">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-6 uppercase tracking-widest">
            <FileText size={16} />
            {t('article')}
          </div>
          <h1 className="text-4xl sm:text-6xl font-black mb-8 tracking-tight text-zinc-900 leading-[1.1]">{article.title}</h1>
          {user?.email === 'tr.c.tuananh@gmail.com' && (
            <button 
              onClick={() => onFeature(article, 'article')}
              className="mb-6 flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
            >
              <Layout size={14} />
              Feature this Article
            </button>
          )}
          
          <div className="flex items-center gap-4 mb-12 pb-8 border-b border-zinc-100">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold">
              {article.authorName?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="font-bold text-zinc-900">{article.authorName}</p>
              <p className="text-zinc-500 text-sm">
                {article.createdAt?.toDate ? article.createdAt.toDate().toLocaleDateString() : 'Just now'} • {article.views} {t('views')}
              </p>
            </div>
          </div>

          <div className="prose prose-zinc prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-blue-600 prose-img:rounded-3xl">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ManageFeaturedView({ featuredItems, onBack }: { featuredItems: FeaturedItem[], onBack: () => void }) {
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'featured', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `featured/${id}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tight">Manage Featured Items</h2>
      </div>

      <div className="grid gap-4">
        {featuredItems.map(item => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <img src={item.banner} alt={item.title} className="w-20 h-12 object-cover rounded-lg" referrerPolicy="no-referrer" />
              <div>
                <h4 className="font-bold text-zinc-900">{item.title}</h4>
                <p className="text-xs text-zinc-500 uppercase font-bold">{item.type}</p>
              </div>
            </div>
            <button 
              onClick={() => handleDelete(item.id)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
        {featuredItems.length === 0 && (
          <p className="text-center py-12 text-zinc-500 italic">No featured items yet.</p>
        )}
      </div>
    </div>
  );
}

function LoginModal({ isOpen, onClose, onLogin, lang }: { isOpen: boolean, onClose: () => void, onLogin: (type: 'google' | 'facebook') => void, lang: Language }) {
  const t = (key: keyof typeof translations.en) => translations[lang][key] || translations.en[key];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <Library size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 mb-2">{t('login')}</h2>
          <p className="text-sm text-zinc-500">{t('loginToContinue')}</p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => { onLogin('google'); onClose(); }}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-zinc-100 rounded-2xl font-bold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-200 transition-all group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('loginWithGoogle')}
          </button>

          <button 
            onClick={() => { onLogin('facebook'); onClose(); }}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#1877F2] text-white rounded-2xl font-bold hover:bg-[#166fe5] transition-all shadow-lg shadow-blue-500/20 group"
          >
            <Facebook size={20} className="group-hover:scale-110 transition-transform" />
            {t('loginWithFacebook')}
          </button>
        </div>

        <p className="mt-8 text-[10px] text-center text-zinc-400 px-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}

function ProfileView({ user, profile, comics, following, lang, onEditComic, onComicSelect, onBack, onUpload, onToggleFollow }: { user: any, profile: any, comics: Comic[], following: Following[], lang: Language, onEditComic: (comic: Comic) => void, onComicSelect: (comic: Comic) => void, onBack: () => void, onUpload: () => void, onToggleFollow: (id: string, type: 'artist' | 'comic') => void }) {
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || translations['en'][key];
  const [activeTab, setActiveTab] = useState<'comics' | 'following'>('comics');
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(profile?.bio || '');
  const [displayName, setDisplayName] = useState(profile?.displayName || user.displayName || '');
  const [handle, setHandle] = useState(profile?.handle || '');
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || '');
      setDisplayName(profile.displayName || user.displayName || '');
      setHandle(profile.handle || '');
    }
  }, [profile, user]);

  const validateHandle = (val: string) => {
    if (!val) return null;
    if (!/^[a-zA-Z0-9_]+$/.test(val)) {
      return t('invalidHandle');
    }
    return null;
  };

  const handleUpdateProfile = async () => {
    const error = validateHandle(handle);
    if (error) {
      setHandleError(error);
      return;
    }

    setIsUpdating(true);
    setHandleError(null);
    try {
      // Check handle uniqueness if changed
      if (handle && handle !== profile?.handle) {
        const q = query(collection(db, 'users'), where('handle', '==', handle));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setHandleError(t('handleTaken'));
          setIsUpdating(false);
          return;
        }
      }

      await setDoc(doc(db, 'users', user.uid), { 
        bio, 
        displayName, 
        handle: handle.toLowerCase() 
      }, { merge: true });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const myComics = comics.filter(c => c.authorUid === user.uid);
  const totalViews = myComics.reduce((acc, c) => acc + c.views, 0);
  const avgRating = myComics.length > 0 
    ? (myComics.reduce((acc, c) => acc + c.rating, 0) / myComics.length).toFixed(1) 
    : '0.0';

  const joinedDate = profile?.createdAt?.toDate 
    ? profile.createdAt.toDate().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : t('justNow');

  const handleDelete = async (comicId: string) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await deleteDoc(doc(db, 'comics', comicId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `comics/${comicId}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-12">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-900">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tight text-zinc-900">{t('profile')}</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* User Info */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm sticky top-24">
            <div className="flex flex-col items-center text-center">
              <img 
                src={user.photoURL || ''} 
                alt={user.displayName || ''} 
                className="w-32 h-32 rounded-full border-4 border-blue-500 mb-4"
                referrerPolicy="no-referrer"
              />
              <h3 className="text-xl font-bold text-zinc-900">{profile?.displayName || user.displayName}</h3>
              {profile?.handle && (
                <p className="text-blue-500 font-bold text-sm mb-1">@{profile.handle}</p>
              )}
              <p className="text-zinc-500 text-sm mb-2">{user.email}</p>
              <p className="text-xs text-zinc-400 mb-4">{t('joined')}: {joinedDate}</p>

              {isEditing ? (
                <div className="w-full mb-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 text-left">{t('username')}</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('username')}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 text-left">{t('userID')}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">@</span>
                      <input
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.toLowerCase())}
                        placeholder="username_id"
                        className={`w-full bg-zinc-50 border ${handleError ? 'border-red-500' : 'border-zinc-200'} rounded-xl px-4 py-2 pl-8 text-sm text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors`}
                      />
                    </div>
                    {handleError && <p className="text-[10px] text-red-500 mt-1 text-left font-bold">{handleError}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 text-left">{t('bio')}</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t('bio')}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={isUpdating}
                      className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? '...' : t('updateProfile')}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setBio(profile?.bio || '');
                        setDisplayName(profile?.displayName || user.displayName || '');
                        setHandle(profile?.handle || '');
                        setHandleError(null);
                      }}
                      className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full mb-6">
                  <p className="text-sm text-zinc-600 mb-4 italic">
                    {profile?.bio || t('noBio')}
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-500 text-xs font-bold hover:underline flex items-center gap-1 mx-auto"
                  >
                    <Layout size={12} />
                    {t('editProfile')}
                  </button>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 w-full pt-6 border-t border-zinc-50">
                <div className="text-center">
                  <p className="text-2xl font-black text-blue-600">{myComics.length}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('comic')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-blue-600">{formatViews(totalViews)}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('views')}</p>
                </div>
                <div className="text-center pt-4">
                  <p className="text-2xl font-black text-yellow-500">{avgRating}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('avgRating')}</p>
                </div>
                <div className="text-center pt-4">
                  <p className="text-2xl font-black text-zinc-900">{t((profile?.role || 'dreamer') as any)}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('role')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Comics / Following */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-8 mb-8 border-b border-zinc-100">
            <button 
              onClick={() => setActiveTab('comics')}
              className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'comics' ? 'text-blue-600' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              {t('myComics')}
              {activeTab === 'comics' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('following')}
              className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'following' ? 'text-blue-600' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              {t('following')}
              {activeTab === 'following' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
            </button>
          </div>

          {activeTab === 'comics' ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-zinc-900">{t('myComics')}</h3>
                <button 
                  onClick={onUpload} 
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Plus size={14} />
                  {t('uploadWebtoon')}
                </button>
              </div>
              <div className="grid gap-4">
                {myComics.map(comic => (
                  <div 
                    key={comic.id} 
                    onClick={() => onComicSelect(comic)}
                    className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm flex gap-4 group cursor-pointer hover:border-blue-500/50 transition-all"
                  >
                    <img 
                      src={comic.thumbnail} 
                      alt={comic.title} 
                      className="w-20 h-28 object-cover rounded-xl shadow-md"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <h4 className="font-bold text-zinc-900 truncate group-hover:text-blue-600 transition-colors">{comic.title}</h4>
                        <div className="flex gap-2 mt-1">
                          {comic.genre.map(g => (
                            <span key={g} className="text-[10px] font-bold text-blue-500">#{t(g as any)}</span>
                          ))}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{comic.description}</p>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400">
                        <span className="flex items-center gap-1"><Compass size={12} /> {formatViews(comic.views)}</span>
                        <span className="flex items-center gap-1"><Star size={12} className="text-yellow-500 fill-yellow-500" /> {comic.rating}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => onEditComic(comic)}
                        className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-xs font-bold"
                        title={t('edit')}
                      >
                        <Layout size={16} />
                        {t('edit')}
                      </button>
                      <button 
                        onClick={() => handleDelete(comic.id)}
                        className="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all text-xs font-bold"
                        title={t('delete')}
                      >
                        <Trash2 size={16} />
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                ))}
                {myComics.length === 0 && (
                  <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                    <Library size={48} className="mx-auto text-zinc-300 mb-4" />
                    <p className="text-zinc-500 font-medium">You haven't uploaded any comics yet.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="grid gap-4">
              {following.map(f => {
                if (f.type === 'comic') {
                  const comic = comics.find(c => c.id === f.targetId);
                  if (!comic) return null;
                  return (
                    <div 
                      key={f.id} 
                      onClick={() => onComicSelect(comic)}
                      className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm flex items-center gap-4 group cursor-pointer hover:border-blue-500/50 transition-all"
                    >
                      <img 
                        src={comic.thumbnail} 
                        alt={comic.title} 
                        className="w-16 h-20 object-cover rounded-xl shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-zinc-900 truncate group-hover:text-blue-600 transition-colors">{comic.title}</h4>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">{t('comic')}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFollow(f.targetId, 'comic');
                        }}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors"
                      >
                        {t('unfollow')}
                      </button>
                    </div>
                  );
                } else {
                  // Artist
                  return (
                    <div 
                      key={f.id} 
                      className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm flex items-center gap-4 group transition-all"
                    >
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-2xl">
                        {f.targetId[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-zinc-900 truncate">{f.targetId}</h4>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">{t('artist')}</p>
                      </div>
                      <button 
                        onClick={() => onToggleFollow(f.targetId, 'artist')}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors"
                      >
                        {t('unfollow')}
                      </button>
                    </div>
                  );
                }
              })}
              {following.length === 0 && (
                <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                  <Heart size={48} className="mx-auto text-zinc-300 mb-4" />
                  <p className="text-zinc-500 font-medium">{t('noFollowingFeed')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StarRating({ rating, onRate, lang, isSubmitting, success }: { rating: number, onRate: (score: number) => void, lang: Language, isSubmitting: boolean, success: boolean }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={isSubmitting}
            onClick={() => onRate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
          >
            <Star 
              size={16} 
              className={`${(hover || rating) >= star ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-300'} transition-colors`} 
            />
          </button>
        ))}
      </div>
      {success && (
        <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider ml-1">
          ✓
        </span>
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorDetails = null;
      try {
        errorDetails = JSON.parse(this.state.error.message);
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-lg w-full border border-zinc-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
              <X size={32} />
            </div>
            <h1 className="text-2xl font-black text-zinc-900 mb-4">Something went wrong</h1>
            <p className="text-zinc-600 mb-6">
              An unexpected error occurred. Please try refreshing the page or contact support if the issue persists.
            </p>
            
            {errorDetails ? (
              <div className="bg-zinc-50 p-4 rounded-xl mb-6 overflow-auto max-h-48">
                <p className="text-xs font-mono text-zinc-500 whitespace-pre-wrap">
                  {JSON.stringify(errorDetails, null, 2)}
                </p>
              </div>
            ) : (
              <div className="bg-zinc-50 p-4 rounded-xl mb-6">
                <p className="text-xs font-mono text-zinc-500 break-words">
                  {this.state.error?.message || String(this.state.error)}
                </p>
              </div>
            )}

            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-zinc-900 text-white rounded-full font-bold hover:bg-zinc-800 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [lang, setLang] = useState<Language>('en');
  const t = (key: keyof typeof translations.en) => translations[lang][key] || translations.en[key];

  const [view, setView] = useState<View>('home');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [editingComic, setEditingComic] = useState<Comic | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [following, setFollowing] = useState<Following[]>([]);
  const [followingFeed, setFollowingFeed] = useState<Chapter[]>([]);
  
  // Firebase State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);

  // Language Detection
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'vi') {
      setLang('vi');
    } else {
      setLang('en');
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Article[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'articles');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'featured'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFeaturedItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FeaturedItem[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'featured');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedComic) {
      const q = query(collection(db, 'comics', selectedComic.id, 'chapters'), orderBy('number', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedChapters = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Chapter[];
        setChapters(fetchedChapters);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `comics/${selectedComic.id}/chapters`);
      });
      return () => unsubscribe();
    } else {
      setChapters([]);
    }
  }, [selectedComic]);

  useEffect(() => {
    if (selectedChapter && selectedComic) {
      // Fetch Likes
      const likesQ = query(
        collection(db, 'comics', selectedComic.id, 'chapters', selectedChapter.id, 'likes')
      );
      const unsubscribeLikes = onSnapshot(likesQ, (snapshot) => {
        setLikes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Like[]);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `comics/${selectedComic.id}/chapters/${selectedChapter.id}/likes`);
      });

      // Fetch Comments
      const commentsQ = query(
        collection(db, 'comics', selectedComic.id, 'chapters', selectedChapter.id, 'comments'),
        orderBy('createdAt', 'desc')
      );
      const unsubscribeComments = onSnapshot(commentsQ, (snapshot) => {
        setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Comment[]);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `comics/${selectedComic.id}/chapters/${selectedChapter.id}/comments`);
      });

      return () => {
        unsubscribeLikes();
        unsubscribeComments();
      };
    }
  }, [selectedChapter, selectedComic]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      
      if (firebaseUser) {
        // Fetch User Profile with onSnapshot
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data());
          } else {
            const newProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              handle: firebaseUser.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${firebaseUser.uid.slice(0, 5)}`,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              role: 'dreamer',
              createdAt: serverTimestamp()
            };
            setDoc(userRef, newProfile);
            setProfile(newProfile);
          }
        });

        // Fetch Following
        const followingQ = query(collection(db, 'users', firebaseUser.uid, 'following'));
        const unsubscribeFollowing = onSnapshot(followingQ, (snapshot) => {
          setFollowing(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Following[]);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${firebaseUser.uid}/following`);
        });
        return () => {
          unsubscribe();
          unsubscribeProfile();
          unsubscribeFollowing();
        };
      } else {
        setProfile(null);
        setFollowing([]);
        setFollowingFeed([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'comics'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComics = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comic[];
      
      // Use sample comics as fallback if none in DB
      setComics(fetchedComics.length > 0 ? fetchedComics : SAMPLE_COMICS as any);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comics');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && following.length > 0) {
      const comicIds = following.filter(f => f.type === 'comic').map(f => f.targetId);
      const artistIds = following.filter(f => f.type === 'artist').map(f => f.targetId);

      const fetchFeed = async () => {
        try {
          let allChapters: Chapter[] = [];

          // Fetch by Comic IDs (up to 30)
          if (comicIds.length > 0) {
            const q = query(
              collectionGroup(db, 'chapters'),
              where('comicId', 'in', comicIds.slice(0, 30)),
              orderBy('createdAt', 'desc'),
              limit(20)
            );
            const snapshot = await getDocs(q);
            allChapters = [...allChapters, ...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Chapter[]];
          }

          // Fetch by Artist IDs (up to 30)
          if (artistIds.length > 0) {
            const q = query(
              collectionGroup(db, 'chapters'),
              where('authorUid', 'in', artistIds.slice(0, 30)),
              orderBy('createdAt', 'desc'),
              limit(20)
            );
            const snapshot = await getDocs(q);
            allChapters = [...allChapters, ...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Chapter[]];
          }

          // Deduplicate and sort
          const uniqueChapters = Array.from(new Map(allChapters.map(ch => [ch.id, ch])).values());
          uniqueChapters.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return (dateB as any) - (dateA as any);
          });

          setFollowingFeed(uniqueChapters.slice(0, 20));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'collectionGroup/chapters');
        }
      };

      fetchFeed();
    } else {
      setFollowingFeed([]);
    }
  }, [user, following]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (view === 'home') {
      const timer = setInterval(() => {
        setHeroIndex((prev) => (prev + 1) % 5);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [view]);

  useEffect(() => {
    if (!loading && comics.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const comicId = params.get('comicId');
      const chapterId = params.get('chapterId');

      if (comicId) {
        const comic = comics.find(c => c.id === comicId);
        if (comic) {
          setSelectedComic(comic);
          if (chapterId) {
            // We need to wait for chapters to load for this comic
            // The chapter loading useEffect will handle setting selectedChapter if we set a flag or just check params there
            setView('reader');
          } else {
            setView('detail');
          }
        }
      }
    }
  }, [loading, comics]);

  useEffect(() => {
    if (view === 'reader' && chapters.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const chapterId = params.get('chapterId');
      if (chapterId) {
        const chapter = chapters.find(ch => ch.id === chapterId);
        if (chapter) {
          setSelectedChapter(chapter);
        }
      }
    }
  }, [view, chapters]);

  const handleToggleFollow = async (targetId: string, type: 'artist' | 'comic') => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    const followId = `${type}_${targetId}`;
    const followRef = doc(db, 'users', user.uid, 'following', followId);
    const isFollowing = following.some(f => f.id === followId);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
      } else {
        await setDoc(followRef, {
          id: followId,
          userId: user.uid,
          targetId,
          type,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/following/${followId}`);
    }
  };

  const handleShare = async (type: 'comic' | 'chapter') => {
    const baseUrl = window.location.origin + window.location.pathname;
    let shareUrl = baseUrl;
    let title = "Check out this Webtoon!";
    let text = "I'm reading this amazing series on Dreamtoon!";

    if (type === 'comic' && selectedComic) {
      shareUrl += `?comicId=${selectedComic.id}`;
      title = selectedComic.title;
      text = `Read ${selectedComic.title} on Dreamtoon!`;
    } else if (type === 'chapter' && selectedComic && selectedChapter) {
      shareUrl += `?comicId=${selectedComic.id}&chapterId=${selectedChapter.id}`;
      title = `${selectedComic.title} - ${selectedChapter.title}`;
      text = `Check out ${selectedChapter.title} of ${selectedComic.title} on Dreamtoon!`;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const shareToSocial = (platform: 'fb' | 'x') => {
    const baseUrl = window.location.origin + window.location.pathname;
    let shareUrl = baseUrl;
    if (selectedComic) {
      shareUrl += `?comicId=${selectedComic.id}`;
      if (selectedChapter && view === 'reader') {
        shareUrl += `&chapterId=${selectedChapter.id}`;
      }
    }
    
    const encodedUrl = encodeURIComponent(shareUrl);
    const text = encodeURIComponent("Check out this amazing Webtoon on Dreamtoon!");
    
    let url = '';
    if (platform === 'fb') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    } else {
      url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`;
    }
    
    window.open(url, '_blank', 'width=600,height=400');
  };

  const filteredComics = comics.filter(comic => 
    comic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comic.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
    comic.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Fetch user's rating for the current comic
  useEffect(() => {
    if (user && selectedComic && view === 'detail') {
      const ratingDocRef = doc(db, 'comics', selectedComic.id, 'ratings', user.uid);
      getDoc(ratingDocRef).then(docSnap => {
        if (docSnap.exists()) {
          setUserRating(docSnap.data().score);
        } else {
          setUserRating(0);
        }
      }).catch(err => {
        console.error("Error fetching rating:", err);
      });
    }
  }, [user, selectedComic, view]);

  const handleRate = async (score: number) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!selectedComic) return;

    setIsRatingSubmitting(true);
    const comicRef = doc(db, 'comics', selectedComic.id);
    const ratingRef = doc(db, 'comics', selectedComic.id, 'ratings', user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const comicDoc = await transaction.get(comicRef);
        if (!comicDoc.exists()) throw new Error("Comic does not exist!");

        const ratingDoc = await transaction.get(ratingRef);
        const oldScore = ratingDoc.exists() ? ratingDoc.data().score : 0;
        
        const currentRating = comicDoc.data().rating || 0;
        const currentCount = comicDoc.data().ratingCount || 0;

        let newRating: number;
        let newCount: number;

        if (ratingDoc.exists()) {
          // Update existing rating
          newCount = currentCount;
          newRating = ((currentRating * currentCount) - oldScore + score) / newCount;
        } else {
          // Add new rating
          newCount = currentCount + 1;
          newRating = ((currentRating * currentCount) + score) / newCount;
        }

        transaction.set(ratingRef, {
          id: `${selectedComic.id}_${user.uid}`,
          userId: user.uid,
          comicId: selectedComic.id,
          score: score,
          createdAt: serverTimestamp()
        });

        transaction.update(comicRef, {
          rating: Number(newRating.toFixed(1)),
          ratingCount: newCount
        });
      });

      setUserRating(score);
      setRatingSuccess(true);
      setTimeout(() => setRatingSuccess(false), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comics/${selectedComic.id}/ratings/${user.uid}`);
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  const handleLogin = async (providerType: 'google' | 'facebook' = 'google') => {
    try {
      const provider = providerType === 'google' ? googleProvider : facebookProvider;
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('home');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleLike = async () => {
    if (!user || !selectedChapter || !selectedComic) return;
    
    const userLike = likes.find(l => l.userId === user.uid);
    const likesRef = collection(db, 'comics', selectedComic.id, 'chapters', selectedChapter.id, 'likes');
    
    try {
      if (userLike) {
        await deleteDoc(doc(likesRef, userLike.id));
      } else {
        await setDoc(doc(likesRef, user.uid), {
          id: user.uid,
          userId: user.uid,
          chapterId: selectedChapter.id,
          comicId: selectedComic.id,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `likes/${user.uid}`);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedChapter || !selectedComic || !commentText.trim()) return;

    try {
      await addDoc(collection(db, 'comics', selectedComic.id, 'chapters', selectedChapter.id, 'comments'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        chapterId: selectedChapter.id,
        comicId: selectedComic.id,
        text: commentText,
        createdAt: serverTimestamp()
      });
      setCommentText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
    }
  };

  const handleComicClick = (comic: Comic) => {
    setSelectedComic(comic);
    setView('detail');
    window.scrollTo(0, 0);
  };

  const handleChapterClick = async (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setView('reader');
    window.scrollTo(0, 0);

    // Increment views for both chapter and parent comic
    try {
      // Increment chapter views
      await updateDoc(doc(db, 'comics', chapter.comicId, 'chapters', chapter.id), {
        views: increment(1)
      });
      
      // Increment parent comic views (sum of all chapters)
      await updateDoc(doc(db, 'comics', chapter.comicId), {
        views: increment(1)
      });
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  };

  const handleNextChapter = () => {
    if (!selectedChapter || !chapters.length) return;
    const currentIndex = chapters.findIndex(c => c.id === selectedChapter.id);
    if (currentIndex < chapters.length - 1) {
      handleChapterClick(chapters[currentIndex + 1]);
    }
  };

  const handlePrevChapter = () => {
    if (!selectedChapter || !chapters.length) return;
    const currentIndex = chapters.findIndex(c => c.id === selectedChapter.id);
    if (currentIndex > 0) {
      handleChapterClick(chapters[currentIndex - 1]);
    }
  };

  const handleFeature = async (item: Comic | Article, type: 'comic' | 'article') => {
    if (!user || user.email !== 'tr.c.tuananh@gmail.com') return;
    try {
      await addDoc(collection(db, 'featured'), {
        title: item.title,
        banner: item.banner,
        type,
        targetId: item.id,
        genre: type === 'comic' ? (item as Comic).genre : ['Article'],
        createdAt: serverTimestamp()
      });
      alert('Featured successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'featured');
    }
  };

  const handleBack = () => {
    setSelectedTag(null);
    if (view === 'reader') {
      setView('detail');
    } else if (view === 'article') {
      setView('home');
      setSelectedArticle(null);
    } else if (view === 'create-article') {
      setView('home');
    } else if (view === 'detail') {
      setView('home');
      setSelectedComic(null);
    } else if (view === 'explore') {
      setView('home');
    } else if (view === 'profile') {
      setView('home');
    } else if (view === 'edit-comic') {
      setView('profile');
      setEditingComic(null);
    } else {
      setView('home');
      setSelectedComic(null);
      setSelectedChapter(null);
    }
    window.scrollTo(0, 0);
  };

  const ComicCard = ({ comic }: { comic: Comic, key?: string }) => (
    <motion.div 
      whileHover={{ y: -5 }}
      className="cursor-pointer group"
    >
      <div 
        onClick={() => handleComicClick(comic)}
        className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative shadow-lg border border-zinc-100"
      >
        <img 
          src={comic.thumbnail} 
          alt={comic.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-bold text-zinc-900 shadow-sm">
          <Star size={10} className="text-yellow-500 fill-yellow-500" />
          {comic.rating}
          {comic.ratingCount && <span className="text-[8px] text-zinc-400 ml-0.5">({comic.ratingCount})</span>}
        </div>
      </div>
      <h4 onClick={() => handleComicClick(comic)} className="font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-blue-600 transition-colors text-zinc-900">{comic.title}</h4>
      <div className="flex flex-wrap gap-1 mt-1 mb-1">
        {comic.genre.slice(0, 2).map(g => (
          <span 
            key={g} 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedGenre(g.toLowerCase());
              setSelectedTag(null);
              setView('explore');
              window.scrollTo(0, 0);
            }}
            className="text-[8px] sm:text-[10px] font-bold text-blue-600 hover:underline"
          >
            #{t(g as any)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {comic.tags?.slice(0, 3).map(tag => (
          <span 
            key={tag} 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTag(tag);
              setSelectedGenre('all');
              setView('explore');
              window.scrollTo(0, 0);
            }}
            className="text-[8px] sm:text-[10px] text-zinc-400 hover:text-blue-500 transition-colors"
          >
            {tag}
          </span>
        ))}
      </div>
      <p onClick={() => handleComicClick(comic)} className="text-zinc-500 text-[10px] sm:text-xs flex items-center gap-1">
        <Compass size={12} className="text-blue-500" />
        {formatViews(comic.views)} {t('views')}
      </p>
    </motion.div>
  );

  const ComicRow = ({ title, comics }: { title: string, comics: Comic[] }) => (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">{title}</h3>
        <button className="text-blue-600 text-sm font-semibold hover:underline">{t('viewAll')}</button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-6">
        {comics.map(comic => (
          <ComicCard key={comic.id} comic={comic} />
        ))}
      </div>
    </section>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-blue-100">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-8">
          {view !== 'home' ? (
            <button 
              onClick={handleBack}
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
          {/* Mobile Search Icon (since input is hidden on mobile) */}
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
                    onClick={handleLogout}
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
                onClick={() => setIsLoginModalOpen(true)}
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

      {/* Mobile Nav Bar (Moved to Top Sub-header or just integrated) */}
      <div className="md:hidden bg-zinc-50 border-b border-zinc-100 px-4 py-2 flex justify-between items-center overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setView('home')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${view === 'home' ? 'bg-blue-500 text-white' : 'text-zinc-500'}`}
        >
          <HomeIcon size={14} />
          {t('home')}
        </button>
        <button 
          onClick={() => setView('explore')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${view === 'explore' ? 'bg-blue-500 text-white' : 'text-zinc-500'}`}
        >
          <Compass size={14} />
          {t('originals')}
        </button>
        <button 
          onClick={() => setView('profile')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${view === 'profile' ? 'bg-blue-500 text-white' : 'text-zinc-500'}`}
        >
          <User size={14} />
          {t('profile')}
        </button>
      </div>

      <main className="pb-20 sm:pb-0">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="container mx-auto px-4 py-8"
            >
              {/* Hero Section */}
              <section className="mb-12 relative">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={heroIndex}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative h-[200px] sm:h-[400px] rounded-2xl overflow-hidden group"
                  >
                    {featuredItems.length > 0 ? (
                      <>
                        <img 
                          src={featuredItems[heroIndex % featuredItems.length]?.banner} 
                          alt="Featured" 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-4 sm:p-10 w-full">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <div className="flex gap-2 mb-2 sm:mb-3">
                              {featuredItems[heroIndex % featuredItems.length]?.genre?.map(g => (
                                <span key={g} className="px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-600/10 text-blue-600 text-[10px] sm:text-xs font-semibold rounded-full border border-blue-600/20">
                                  {g}
                                </span>
                              ))}
                              <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-zinc-100 text-zinc-600 text-[10px] sm:text-xs font-semibold rounded-full border border-zinc-200">
                                {featuredItems[heroIndex % featuredItems.length]?.type === 'article' ? t('article') : t('comic')}
                              </span>
                            </div>
                            <h2 className="text-2xl sm:text-5xl font-black mb-3 sm:mb-4 tracking-tight text-zinc-900">{featuredItems[heroIndex % featuredItems.length]?.title}</h2>
                            <button 
                              onClick={() => {
                                const item = featuredItems[heroIndex % featuredItems.length];
                                if (item.type === 'article' && item.targetId) {
                                  const art = articles.find(a => a.id === item.targetId);
                                  if (art) {
                                    setSelectedArticle(art);
                                    setView('article');
                                  }
                                } else if (item.type === 'comic' && item.targetId) {
                                  const com = comics.find(c => c.id === item.targetId);
                                  if (com) {
                                    setSelectedComic(com);
                                    setView('detail');
                                  }
                                } else if (item.type === 'external' && item.externalUrl) {
                                  window.open(item.externalUrl, '_blank');
                                }
                              }}
                              className="bg-blue-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full font-bold text-sm sm:text-base flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                            >
                              {t('readNow')} <ArrowRight size={20} />
                            </button>
                          </motion.div>
                        </div>
                      </>
                    ) : (
                      <>
                        <img 
                          src={comics[heroIndex]?.banner || SAMPLE_COMICS[heroIndex % SAMPLE_COMICS.length].banner} 
                          alt="Featured" 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-4 sm:p-10 w-full">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <div className="flex gap-2 mb-2 sm:mb-3">
                              {(comics[heroIndex]?.genre || SAMPLE_COMICS[heroIndex % SAMPLE_COMICS.length].genre).map(g => (
                                <span key={g} className="px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-600/10 text-blue-600 text-[10px] sm:text-xs font-semibold rounded-full border border-blue-600/20">
                                  {t(g as any)}
                                </span>
                              ))}
                              <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-zinc-100 text-zinc-600 text-[10px] sm:text-xs font-semibold rounded-full border border-zinc-200">
                                {formatViews(comics[heroIndex]?.views || SAMPLE_COMICS[heroIndex % SAMPLE_COMICS.length].views)} {t('views')}
                              </span>
                            </div>
                            <h2 className="text-2xl sm:text-5xl font-black mb-3 sm:mb-4 tracking-tight text-zinc-900">{comics[heroIndex]?.title || SAMPLE_COMICS[heroIndex % SAMPLE_COMICS.length].title}</h2>
                            <button 
                              onClick={() => handleComicClick(comics[heroIndex] || SAMPLE_COMICS[heroIndex % SAMPLE_COMICS.length] as any)}
                              className="bg-blue-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full font-bold text-sm sm:text-base flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                            >
                              {t('readNow')} <ArrowRight size={20} />
                            </button>
                          </motion.div>
                        </div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Pagination Dots */}
                <div className="absolute bottom-4 right-6 flex gap-2 z-10">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => setHeroIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        heroIndex === idx ? 'w-6 bg-blue-600' : 'bg-zinc-300 hover:bg-zinc-400'
                      }`}
                    />
                  ))}
                </div>
              </section>

              {/* Following Feed */}
              {user && (
                <section className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
                      <Heart size={24} className="text-red-500 fill-red-500" />
                      {t('fromYourFollowing')}
                    </h3>
                  </div>
                  {followingFeed.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                      {followingFeed.map(chapter => {
                        const comic = comics.find(c => c.id === chapter.comicId);
                        if (!comic) return null;
                        return (
                          <motion.div 
                            key={chapter.id}
                            whileHover={{ y: -5 }}
                            onClick={() => {
                              setSelectedComic(comic);
                              setSelectedChapter(chapter);
                              setView('reader');
                              window.scrollTo(0, 0);
                            }}
                            className="cursor-pointer group"
                          >
                            <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-3 relative shadow-sm group-hover:shadow-xl transition-all border border-zinc-100">
                              <img 
                                src={comic.thumbnail} 
                                alt={comic.title} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg shadow-lg">
                                UP
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute bottom-3 left-3 right-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1">{t('chapter')} {chapter.number}</p>
                                <p className="text-xs font-black line-clamp-1">{chapter.title}</p>
                              </div>
                            </div>
                            <h4 className="font-bold text-sm line-clamp-1 group-hover:text-blue-600 transition-colors text-zinc-900">{comic.title}</h4>
                            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                              {t('chapter')} {chapter.number} • {chapter.uploadDate}
                            </p>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-zinc-50 rounded-3xl p-12 text-center border border-dashed border-zinc-200">
                      <Heart size={48} className="mx-auto text-zinc-200 mb-4" />
                      <p className="text-zinc-500 font-medium max-w-sm mx-auto">
                        {t('noFollowingFeed')}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* Trending Section */}
              <ComicRow 
                title={t('trending')} 
                comics={filteredComics.slice(0, 6)} 
              />

              {/* Popular Section */}
              <ComicRow 
                title={t('popular')} 
                comics={filteredComics.slice(4, 10)} 
              />

              {/* New Daily Section */}
              <ComicRow 
                title={t('newDaily')} 
                comics={filteredComics.slice(2, 8)} 
              />

              {/* Articles Section */}
              {articles.length > 0 && (
                <section className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold tracking-tight text-zinc-900">{t('articles')}</h3>
                    <button className="text-blue-600 text-sm font-semibold hover:underline">{t('viewAll')}</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.slice(0, 3).map(article => (
                      <motion.div 
                        key={article.id}
                        whileHover={{ y: -5 }}
                        onClick={() => {
                          setSelectedArticle(article);
                          setView('article');
                          window.scrollTo(0, 0);
                        }}
                        className="cursor-pointer group bg-zinc-50 rounded-3xl overflow-hidden border border-zinc-100 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="aspect-video overflow-hidden">
                          <img 
                            src={article.banner} 
                            alt={article.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="p-6">
                          <div className="flex items-center gap-2 text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-2">
                            <FileText size={12} />
                            {t('article')}
                          </div>
                          <h4 className="font-bold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors text-zinc-900 mb-2">{article.title}</h4>
                          <p className="text-zinc-500 text-xs flex items-center gap-2">
                            {article.authorName} • {article.createdAt?.toDate ? article.createdAt.toDate().toLocaleDateString() : 'Just now'}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {view === 'explore' && (
            <motion.div 
              key="explore"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="container mx-auto px-4 py-8"
            >
              <div className="flex flex-col gap-8">
                <div>
                  <h2 className="text-3xl font-black mb-2 tracking-tight text-zinc-900">{t('originals')}</h2>
                  <p className="text-zinc-500 text-sm">{t('searchPlaceholder')}</p>
                </div>

                {/* Catalogues / Genres */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {['all', 'action', 'romance', 'comedy', 'drama', 'fantasy', 'horror', 'sciFi', 'sliceOfLife', 'thriller'].map((genreKey) => (
                      <button
                        key={genreKey}
                        onClick={() => {
                          setSelectedGenre(genreKey);
                          setSelectedTag(null);
                        }}
                        className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all border ${
                          selectedGenre === genreKey && !selectedTag
                            ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-500 hover:text-blue-500'
                        }`}
                      >
                        {t(genreKey as any)}
                      </button>
                    ))}
                  </div>

                  {selectedTag && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t('tags')}:</span>
                      <span className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-200">
                        <Tag size={10} />
                        {selectedTag}
                        <button onClick={() => setSelectedTag(null)} className="hover:text-red-500">
                          <X size={12} />
                        </button>
                      </span>
                    </div>
                  )}
                </div>

                {/* Filtered Content */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-6">
                  {filteredComics
                    .filter(comic => {
                      const genreMatch = selectedGenre === 'all' || 
                        comic.genre.some(g => g.toLowerCase() === t(selectedGenre as any).toLowerCase()) ||
                        comic.genre.some(g => g.toLowerCase() === selectedGenre.toLowerCase());
                      
                      const tagMatch = !selectedTag || comic.tags?.includes(selectedTag);
                      
                      return genreMatch && tagMatch;
                    })
                    .map(comic => (
                      <ComicCard key={comic.id} comic={comic} />
                    ))
                  }
                </div>
              </div>
            </motion.div>
          )}

          {view === 'detail' && selectedComic && (
            <motion.div 
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pb-12"
            >
              <div className="relative h-[250px] sm:h-[400px]">
                <img 
                  src={selectedComic.banner} 
                  alt={selectedComic.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent" />
              </div>

              <div className="container mx-auto px-4 -mt-20 relative z-10">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-48 h-72 rounded-2xl overflow-hidden shadow-2xl shrink-0 mx-auto md:mx-0 border-4 border-white">
                    <img 
                      src={selectedComic.thumbnail} 
                      alt={selectedComic.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 pt-4 md:pt-20">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedComic.genre.map(g => (
                        <span key={g} className="px-3 py-1 bg-blue-50/50 text-blue-600 text-xs font-semibold rounded-full border border-blue-100">
                          {t(g as any)}
                        </span>
                      ))}
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black mb-2 tracking-tight text-zinc-900">{selectedComic.title}</h1>
                    
                    {/* Author Section moved below title */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-sm">
                          {selectedComic.authorName ? selectedComic.authorName[0] : '?'}
                        </div>
                        <h4 className="font-bold text-zinc-900 text-sm">{selectedComic.authorName}</h4>
                      </div>
                      <button 
                        onClick={() => handleToggleFollow(selectedComic.authorUid, 'artist')}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                          following.some(f => f.id === `artist_${selectedComic.authorUid}`)
                            ? 'bg-zinc-900 text-white border-zinc-900' 
                            : 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        {following.some(f => f.id === `artist_${selectedComic.authorUid}`) ? t('following') : t('followArtist')}
                      </button>
                    </div>

                    {user?.email === 'tr.c.tuananh@gmail.com' && (
                      <button 
                        onClick={() => handleFeature(selectedComic, 'comic')}
                        className="mb-4 flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
                      >
                        <Layout size={14} />
                        Feature this Comic
                      </button>
                    )}
                    <div className="flex items-center gap-6 mb-6 text-zinc-500">
                      <div className="flex items-center gap-2">
                        <Compass size={18} className="text-blue-600" />
                        <span className="text-sm font-medium">{formatViews(selectedComic.views)} {t('views')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star size={18} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-zinc-900">{selectedComic.rating}</span>
                        {selectedComic.ratingCount && (
                          <span className="text-xs text-zinc-400">({selectedComic.ratingCount})</span>
                        )}
                      </div>
                    </div>
                    <p className="text-zinc-600 leading-relaxed max-w-2xl mb-8">
                      {selectedComic.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Rate this comic */}
                      <div className="p-2.5 bg-zinc-50 rounded-full border border-zinc-100 flex items-center">
                        <StarRating 
                          rating={userRating} 
                          onRate={handleRate} 
                          lang={lang} 
                          isSubmitting={isRatingSubmitting} 
                          success={ratingSuccess}
                        />
                      </div>

                      {/* Read Now */}
                      <button 
                        onClick={() => handleChapterClick(chapters[0] || { id: '0', comicId: selectedComic.id, number: 0, title: 'No Chapters', images: [], uploadDate: '' })}
                        disabled={chapters.length === 0}
                        className="bg-blue-500 text-white px-5 py-2 rounded-full font-bold text-xs hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                      >
                        <BookOpen size={14} />
                        {chapters.length > 0 ? t('readNow') : t('noChapters')}
                      </button>

                      {/* Follow Series */}
                      <button 
                        onClick={() => handleToggleFollow(selectedComic.id, 'comic')}
                        className={`px-5 py-2 rounded-full font-bold text-xs transition-all flex items-center gap-2 border ${
                          following.some(f => f.id === `comic_${selectedComic.id}`)
                            ? 'bg-zinc-900 text-white border-zinc-900' 
                            : 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        <Heart size={14} className={following.some(f => f.id === `comic_${selectedComic.id}`) ? 'fill-red-500 text-red-500' : ''} />
                        {following.some(f => f.id === `comic_${selectedComic.id}`) ? t('following') : t('follow')}
                      </button>

                      {/* Share Series */}
                      <button 
                        onClick={() => handleShare('comic')}
                        className="bg-zinc-100 text-zinc-900 px-5 py-2 rounded-full font-bold text-xs hover:bg-zinc-200 transition-colors border border-zinc-200 flex items-center gap-2"
                      >
                        {shareSuccess ? <Check size={14} className="text-green-500" /> : <Share2 size={14} />}
                        {shareSuccess ? t('linkCopied') : t('shareSeries')}
                      </button>
                    </div>

                    {/* Original Author Section Removed from here */}
                  </div>
                </div>

                <div className="mt-16">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold flex items-center gap-3 text-zinc-900">
                      <Clock size={24} className="text-blue-600" />
                      {t('chapters')}
                    </h3>
                    {user?.uid === selectedComic.authorUid && (
                      <button 
                        onClick={() => setView('add-chapter')}
                        className="text-blue-600 font-bold text-sm hover:underline"
                      >
                        + {t('addChapter')}
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3">
                    {chapters.map(chapter => (
                      <button 
                        key={chapter.id}
                        onClick={() => handleChapterClick(chapter)}
                        className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-xl hover:bg-white hover:border-blue-600/50 transition-all group text-left shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center font-bold text-zinc-400 group-hover:text-blue-600 transition-colors">
                            {chapter.number}
                          </div>
                          <div>
                            <h4 className="font-bold group-hover:text-blue-600 transition-colors text-zinc-900">{chapter.title}</h4>
                            <div className="flex items-center gap-3 text-zinc-500 text-xs mt-1">
                              <span>{chapter.uploadDate}</span>
                              <span className="flex items-center gap-1">
                                <Compass size={12} />
                                {formatViews(chapter.views || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={20} className="text-zinc-300 group-hover:text-blue-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'reader' && selectedChapter && (
            <motion.div 
              key="reader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-black"
            >
              <div className="max-w-3xl mx-auto">
                {selectedChapter.images.map((img, idx) => (
                  <img 
                    key={idx}
                    src={img} 
                    alt={`Page ${idx + 1}`} 
                    className="w-full h-auto block"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
              
              <div className="py-20 px-4 max-w-2xl mx-auto">
                <div className="flex flex-col items-center mb-12">
                  <div className="flex flex-col items-center gap-4 mb-12 w-full">
                    <div className="flex items-center justify-between w-full gap-4">
                      <button 
                        onClick={handlePrevChapter}
                        disabled={chapters.findIndex(c => c.id === selectedChapter.id) === 0}
                        className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                      >
                        {t('previousChapter')}
                      </button>
                      
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('chapter')} {selectedChapter.number}</span>
                        <select 
                          value={selectedChapter.id}
                          onChange={(e) => {
                            const chapter = chapters.find(c => c.id === e.target.value);
                            if (chapter) handleChapterClick(chapter);
                          }}
                          className="bg-zinc-900 text-white px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-blue-500 text-xs font-bold appearance-none cursor-pointer hover:bg-zinc-800 transition-colors min-w-[120px] text-center"
                        >
                          {chapters.map(c => (
                            <option key={c.id} value={c.id}>
                              {t('chapter')} {c.number}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button 
                        onClick={handleNextChapter}
                        disabled={chapters.findIndex(c => c.id === selectedChapter.id) === chapters.length - 1}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                      >
                        {t('nextChapter')}
                      </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 w-full mt-4">
                      <button 
                        onClick={handleBack}
                        className="flex-1 px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors text-sm"
                      >
                        {t('backToSeries')}
                      </button>
                      <button 
                        onClick={() => handleShare('chapter')}
                        className="flex-1 px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        {shareSuccess ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
                        {shareSuccess ? t('copied') : t('share')}
                      </button>
                    </div>
                  </div>

                  {/* Social Share Icons - One Row */}
                  <div className="flex items-center justify-center gap-4 mb-12">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mr-2">Share to</span>
                    <button 
                      onClick={() => shareToSocial('fb')}
                      className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-blue-500 hover:bg-zinc-700 transition-all"
                      title="Share to Facebook"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </button>
                    <button 
                      onClick={() => shareToSocial('x')}
                      className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
                      title="Share to X"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.134l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </button>
                  </div>

                  {/* Like Section */}
                  <div className="flex flex-col items-center gap-2 mb-12">
                    <button 
                      onClick={handleLike}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                        likes.some(l => l.userId === user?.uid) 
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/40' 
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      <Heart size={32} fill={likes.some(l => l.userId === user?.uid) ? "currentColor" : "none"} />
                    </button>
                    <span className="text-zinc-400 font-bold">{likes.length} {t('likes')}</span>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-800">
                  <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <MessageCircle size={24} className="text-blue-500" />
                    {t('comments')} ({comments.length})
                  </h4>

                  {user ? (
                    <form onSubmit={handleComment} className="mb-8">
                      <div className="relative">
                        <textarea 
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={t('shareThoughts')}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                          rows={3}
                        />
                        <button 
                          type="submit"
                          className="absolute bottom-3 right-3 p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                        >
                          <Send size={20} />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-zinc-800 rounded-2xl p-4 text-center mb-8">
                      <p className="text-zinc-400 text-sm mb-2">{t('loginToComment')}</p>
                      <button 
                        onClick={() => setIsLoginModalOpen(true)}
                        className="text-blue-500 font-bold text-sm hover:underline"
                      >
                        {t('loginNow')}
                      </button>
                    </div>
                  )}

                  <div className="space-y-6">
                    {comments.length === 0 && (
                      <p className="text-zinc-500 text-center py-8 text-sm italic">{t('noComments')}</p>
                    )}
                    {comments.map(comment => (
                      <div key={comment.id} className="flex gap-4">
                        <img 
                          src={comment.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} 
                          alt={comment.userName} 
                          className="w-10 h-10 rounded-full border border-zinc-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-white">{comment.userName}</span>
                            <span className="text-[10px] text-zinc-500">
                              {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString() : t('justNow')}
                            </span>
                          </div>
                          <p className="text-zinc-300 text-sm leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-zinc-500 text-sm italic">{t('noComments')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'profile' && user && (
            <ProfileView
              user={user}
              profile={profile}
              comics={comics}
              following={following}
              onEditComic={(comic) => {
                setEditingComic(comic);
                setView('edit-comic');
              }}
              onComicSelect={(comic) => {
                setSelectedComic(comic);
                setView('detail');
              }}
              onUpload={() => setView('upload')}
              onBack={handleBack}
              onToggleFollow={handleToggleFollow}
              lang={lang}
            />
          )}

          {view === 'edit-comic' && editingComic && (
            <UploadView
              user={user}
              comics={comics}
              lang={lang}
              onSuccess={() => {
                setView('profile');
                setEditingComic(null);
                window.scrollTo(0, 0);
              }}
              onCancel={() => {
                setView('profile');
                setEditingComic(null);
              }}
              initialData={editingComic}
            />
          )}

          {view === 'upload' && (
            <UploadView 
              user={user} 
              comics={comics}
              lang={lang}
              onSuccess={() => {
                setView('home');
                window.scrollTo(0, 0);
              }} 
              onCancel={() => setView('home')} 
            />
          )}

          {view === 'add-chapter' && selectedComic && (
            <AddChapterView 
              comicId={selectedComic.id}
              authorUid={selectedComic.authorUid}
              chapterCount={chapters.length}
              lang={lang}
              onSuccess={() => {
                setView('detail');
                window.scrollTo(0, 0);
              }}
              onCancel={() => setView('detail')}
            />
          )}

          {view === 'create-article' && (
            <CreateArticleView 
              user={user}
              lang={lang}
              onSuccess={() => {
                setView('home');
                window.scrollTo(0, 0);
              }}
              onCancel={() => setView('home')}
            />
          )}

          {view === 'article' && selectedArticle && (
            <ArticleDetailView 
              article={selectedArticle}
              user={user}
              lang={lang}
              onBack={handleBack}
              onFeature={handleFeature}
            />
          )}

          {view === 'manage-featured' && (
            <ManageFeaturedView 
              featuredItems={featuredItems}
              onBack={() => setView('home')}
            />
          )}
        </AnimatePresence>

        {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLogin={handleLogin}
        lang={lang}
      />

      {/* Scroll to Top Button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-600 transition-colors"
            >
              <ChevronUp size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav Removed */}
    </div>
    </ErrorBoundary>
  );
}

export default App;
