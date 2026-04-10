import React, { useState, useEffect } from 'react';
import { ArrowLeft, Layout, Compass, Star, Plus, Trash2, Library, Heart, LogOut, Camera, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query, where, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Comic, Following } from '../types';
import { Language, translations } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { formatViews, validateImage } from '../lib/utils';

export function ProfileView({ user, profile, comics, following, lang, onEditComic, onComicSelect, onBack, onUpload, onToggleFollow, onLogout, onMessageClick, isGuest = false }: { user: any, profile: any, comics: Comic[], following: Following[], lang: Language, onEditComic: (comic: Comic) => void, onComicSelect: (comic: Comic) => void, onBack: () => void, onUpload: () => void, onToggleFollow: (id: string, type: 'artist' | 'comic', authorUid?: string) => void, onLogout: () => void, onMessageClick?: (target: any) => void, isGuest?: boolean }) {
  const { t } = useTranslation(lang);
  const [activeTab, setActiveTab] = useState<'comics' | 'following'>('comics');
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(profile?.bio || '');
  const [displayName, setDisplayName] = useState(profile?.displayName || user.displayName || '');
  const [handle, setHandle] = useState(profile?.handle || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || user.photoURL || '');
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || '');
      setDisplayName(profile.displayName || user.displayName || '');
      setHandle(profile.handle || '');
      setPhotoURL(profile.photoURL || user.photoURL || '');
    }
  }, [profile, user]);

  const validateHandle = (val: string) => {
    if (!val) return null;
    if (!/^[a-zA-Z0-9_]+$/.test(val)) {
      return t('invalidHandle');
    }
    const reserved = ['home', 'explore', 'detail', 'reader', 'upload', 'add-chapter', 'edit-chapter', 'article', 'create-article', 'manage-featured', 'profile', 'edit-comic', 'my-wall', 'community', 'artist-wall', 'api', 'admin', 'auth'];
    if (reserved.includes(val.toLowerCase())) {
      return t('handleTaken');
    }
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await validateImage(file);
    if (!result.valid) {
      alert(result.error || 'Invalid image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result.length > 800 * 1024) { // ~800KB limit for base64
        alert('Image is too large for an avatar. Please use a smaller image (under 800KB).');
        return;
      }
      setPhotoURL(result);
    };
    reader.readAsDataURL(file);
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
      if (handle && handle !== profile?.handle) {
        const q = query(collection(db, 'profiles'), where('handle', '==', handle));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setHandleError(t('handleTaken'));
          setIsUpdating(false);
          return;
        }
      }

      const updateData = { 
        bio, 
        displayName, 
        handle: handle.toLowerCase(),
        photoURL
      };

      await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });
      await setDoc(doc(db, 'profiles', user.uid), updateData, { merge: true });

      // Update Firebase Auth profile as well
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName,
          photoURL: photoURL
        });
      }

      // Update all posts by this user to reflect the new name and photo
      const postsQuery = query(collection(db, 'posts'), where('authorUid', '==', user.uid));
      const postsSnap = await getDocs(postsQuery);
      const postUpdates = postsSnap.docs.map(postDoc => 
        updateDoc(doc(db, 'posts', postDoc.id), { authorName: displayName, authorPhoto: photoURL })
      );

      // Update all comics by this user to reflect the new name and photo
      const comicsQuery = query(collection(db, 'comics'), where('authorUid', '==', user.uid));
      const comicsSnap = await getDocs(comicsQuery);
      const comicUpdates = comicsSnap.docs.map(comicDoc => 
        updateDoc(doc(db, 'comics', comicDoc.id), { authorName: displayName, authorPhoto: photoURL })
      );

      // Update all articles by this user to reflect the new name and photo
      const articlesQuery = query(collection(db, 'articles'), where('authorUid', '==', user.uid));
      const articlesSnap = await getDocs(articlesQuery);
      const articleUpdates = articlesSnap.docs.map(articleDoc => 
        updateDoc(doc(db, 'articles', articleDoc.id), { authorName: displayName, authorPhoto: photoURL })
      );

      await Promise.all([...postUpdates, ...comicUpdates, ...articleUpdates]);

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
    <div className="container mx-auto px-2 py-2 md:px-4 md:py-8 max-w-6xl">
      <div className="grid md:grid-cols-3 gap-4 md:gap-8">
        <div className="md:col-span-1">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-10 border border-zinc-100 shadow-sm sticky top-24 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-20 md:h-40 bg-gradient-to-br from-blue-500 to-indigo-600" />
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="relative mb-2 md:mb-6 group flex-shrink-0">
                <img 
                  src={photoURL || user.photoURL || ''} 
                  alt={displayName || user.displayName || ''} 
                  className="w-24 h-24 md:w-48 md:h-48 rounded-[1.5rem] md:rounded-[3rem] border-2 md:border-4 border-white shadow-2xl object-cover aspect-square"
                  referrerPolicy="no-referrer"
                />
                {profile?.pioneerNumber && (
                  <div className="absolute -top-2 -left-2 md:-top-4 md:-left-4 bg-blue-600 text-white text-[10px] md:text-base font-black w-8 h-8 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 md:border-4 border-white shadow-xl z-20">
                    {profile.pioneerNumber}
                  </div>
                )}
                {isEditing && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[1.5rem] md:rounded-[3rem] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white w-6 h-6 md:w-12 md:h-12" />
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 md:w-10 md:h-10 bg-green-500 border-2 md:border-4 border-white rounded-full shadow-lg" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-zinc-900 tracking-tight leading-tight">{displayName || profile?.displayName || user.displayName}</h3>
              {profile?.handle && (
                <p className="text-blue-500 font-black text-xs md:text-sm mb-0.5 md:mb-1 tracking-tight">@{profile.handle}</p>
              )}
              {!isGuest && <p className="text-zinc-400 text-[10px] md:text-xs font-bold mb-0.5 md:mb-2">{user.email}</p>}
              <p className="text-[9px] md:text-[10px] text-zinc-400 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mb-2 md:mb-6">{t('joined')}: {joinedDate}</p>

              {isGuest && onMessageClick && (
                <button
                  onClick={() => onMessageClick(profile)}
                  className="w-full mb-6 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                >
                  <MessageCircle size={18} />
                  {t('messenger')}
                </button>
              )}

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
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 text-left">
                      {t('avatar')}
                      <span className="ml-2 text-[8px] font-normal text-zinc-400 italic lowercase">
                        ({t('avatarRecommendedSize' as any)})
                      </span>
                    </label>
                    <div className="flex items-center gap-4">
                      <img src={photoURL} className="w-12 h-12 rounded-xl object-cover border border-zinc-100" referrerPolicy="no-referrer" />
                      <label className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-200 cursor-pointer transition-colors">
                        {t('changeAvatar')}
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                    </div>
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
                <div className="w-full mb-3 md:mb-6">
                  <p className="text-xs md:text-sm text-zinc-600 mb-2 md:mb-4 italic line-clamp-2 md:line-clamp-none">
                    {profile?.bio || t('noBio')}
                  </p>
                  {!isGuest && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-blue-500 text-[10px] md:text-xs font-bold hover:underline flex items-center gap-1 mx-auto"
                    >
                      <Layout size={10} className="md:w-3 md:h-3" />
                      {t('editProfile')}
                    </button>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-1.5 md:gap-4 w-full pt-2 md:pt-6 border-t border-zinc-50">
                <div className="text-center">
                  <p className="text-base md:text-2xl font-black text-blue-600">{myComics.length}</p>
                  <p className="text-[7px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('comic')}</p>
                </div>
                <div className="text-center">
                  <p className="text-base md:text-2xl font-black text-blue-600">{formatViews(totalViews)}</p>
                  <p className="text-[7px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('views')}</p>
                </div>
                <div className="text-center pt-1.5 md:pt-4">
                  <p className="text-base md:text-2xl font-black text-yellow-500">{avgRating}</p>
                  <p className="text-[7px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('avgRating')}</p>
                </div>
                <div className="text-center pt-1.5 md:pt-4">
                  <p className="text-base md:text-2xl font-black text-zinc-900">{t((profile?.role || 'dreamer') as any)}</p>
                  <p className="text-[7px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('role')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          {!isGuest && (
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
          )}

          {activeTab === 'comics' ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-zinc-900">{isGuest ? t('comic') : t('myComics')}</h3>
                {!isGuest && (
                  <button 
                    onClick={onUpload} 
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Plus size={14} />
                    {t('uploadWebtoon')}
                  </button>
                )}
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
                    {!isGuest && (
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
                    )}
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
