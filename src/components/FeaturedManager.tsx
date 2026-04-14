import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Layout, Compass, Star, Edit, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Comic, Article, FeaturedItem } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { formatViews } from '../lib/utils';
import { ConfirmModal } from './ConfirmModal';

export function FeaturedManager({ 
  comics, 
  articles, 
  featuredItems, 
  lang, 
  onBack,
  onEditArticle
}: { 
  comics: Comic[], 
  articles: Article[], 
  featuredItems: FeaturedItem[], 
  lang: Language, 
  onBack: () => void,
  onEditArticle?: (article: Article) => void
}) {
  const { t } = useTranslation(lang);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleFeature = async (item: Comic | Article, type: 'comic' | 'article') => {
    try {
      await addDoc(collection(db, 'featured'), {
        title: item.title,
        type,
        targetId: item.id,
        description: (item as any).description || '',
        genre: type === 'comic' ? (item as Comic).genre : ['Article'],
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'featured');
    }
  };

  const handleRemoveFeatured = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'featured', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `featured/${id}`);
    }
  };

  const handleDeleteArticle = async (article: Article) => {
    setConfirmConfig({
      isOpen: true,
      title: t('delete'),
      message: t('confirmDeleteArticle' as any) || `Are you sure you want to delete "${article.title}"?`,
      onConfirm: async () => {
        try {
          // 1. Delete the article itself
          await deleteDoc(doc(db, 'articles', article.id));
          
          // 2. Remove from featured if it exists
          const featured = featuredItems.find(f => f.targetId === article.id && f.type === 'article');
          if (featured) {
            await deleteDoc(doc(db, 'featured', featured.id));
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `articles/${article.id}`);
        }
      }
    });
  };

  const handleDeleteComic = async (comic: Comic) => {
    setConfirmConfig({
      isOpen: true,
      title: t('delete'),
      message: t('confirmDelete' as any) || `Are you sure you want to delete "${comic.title}"?`,
      onConfirm: async () => {
        try {
          // 1. Delete the comic itself
          await deleteDoc(doc(db, 'comics', comic.id));
          
          // 2. Remove from featured if it exists
          const featured = featuredItems.find(f => f.targetId === comic.id && f.type === 'comic');
          if (featured) {
            await deleteDoc(doc(db, 'featured', featured.id));
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `comics/${comic.id}`);
        }
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        lang={lang}
      />
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-3xl font-black tracking-tight">{t('manageFeatured' as any)}</h2>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="px-6 py-2 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            {isAdding ? t('cancel') : <><Plus size={18} /> {t('addNew' as any)}</>}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Compass size={20} className="text-blue-500" /> {t('comics')}</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {comics.map(comic => (
                <div key={comic.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl group">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={comic.thumbnail} className="w-10 h-14 object-cover rounded-lg" alt="" referrerPolicy="no-referrer" />
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{comic.title}</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">{formatViews(comic.views)} {t('views')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleDeleteComic(comic)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleFeature(comic, 'comic')}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Layout size={20} className="text-purple-500" /> {t('articles')}</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {articles.map(article => (
                <div key={article.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl group">
                  <div className="flex items-center gap-3 min-w-0">
                    {article.banner ? (
                      <img src={article.banner} className="w-14 h-10 object-cover rounded-lg" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-14 h-10 bg-zinc-200 rounded-lg flex items-center justify-center">
                        <Compass size={16} className="text-zinc-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{article.title}</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">{formatViews(article.views || 0)} {t('views')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {onEditArticle && (
                      <button 
                        onClick={() => onEditArticle(article)}
                        className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('edit')}
                      >
                        <Edit size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteArticle(article)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleFeature(article, 'article')}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {featuredItems.map(item => {
          const sourceItem = item.type === 'comic' 
            ? comics.find(c => c.id === item.targetId)
            : articles.find(a => a.id === item.targetId);
          const displayImage = sourceItem ? (item.type === 'comic' ? (sourceItem as Comic).thumbnail : (sourceItem as Article).banner) : null;

          return (
            <div key={item.id} className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-6 group">
              {displayImage ? (
                <img src={displayImage} className="w-40 h-[80px] object-cover rounded-2xl shadow-md" alt="" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-40 h-[80px] bg-zinc-200 rounded-2xl flex items-center justify-center">
                  <Compass size={32} className="text-zinc-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${item.type === 'comic' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {item.type === 'comic' ? t('comic') : t('article')}
                  </span>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : '...'}
                  </p>
                </div>
                <h4 className="text-xl font-black text-zinc-900 truncate">{item.title}</h4>
                <p className="text-sm text-zinc-500 line-clamp-1">{item.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const sourceItem = item.type === 'comic' 
                      ? comics.find(c => c.id === item.targetId)
                      : articles.find(a => a.id === item.targetId);
                    if (sourceItem) {
                      if (item.type === 'comic') handleDeleteComic(sourceItem as Comic);
                      else handleDeleteArticle(sourceItem as Article);
                    }
                  }}
                  className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  title={lang === 'vi' ? 'Xóa nguồn' : 'Delete Source'}
                >
                  <AlertCircle size={20} />
                </button>
                <button 
                  onClick={() => handleRemoveFeatured(item.id)}
                  className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  title={lang === 'vi' ? 'Gỡ khỏi nổi bật' : 'Remove from Featured'}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          );
        })}
        {featuredItems.length === 0 && (
          <div className="text-center py-20 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
            <Star size={48} className="mx-auto text-zinc-200 mb-4" />
            <p className="text-zinc-500 font-medium">{t('noFeaturedItems' as any)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
