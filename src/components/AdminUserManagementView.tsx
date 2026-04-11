import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  where,
  limit,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion } from 'motion/react';
import { Search, Shield, ShieldAlert, UserMinus, UserCheck, Mail, Hash, Trash2 } from 'lucide-react';

export function AdminUserManagementView({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateRole = async (uid: string, newRole: 'admin' | 'user') => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      // Also update public profile
      await updateDoc(doc(db, 'profiles', uid), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleToggleBan = async (uid: string, currentlyBanned: boolean) => {
    const action = currentlyBanned ? 'unban' : 'ban';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', uid), { banned: !currentlyBanned });
      // Also update public profile
      await updateDoc(doc(db, 'profiles', uid), { banned: !currentlyBanned });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm(t('confirmDeleteUserAccount'))) return;
    
    setDeletingUid(uid);
    try {
      const batch = writeBatch(db);

      // 1. Delete user comics and their chapters
      const comicsQuery = query(collection(db, 'comics'), where('authorUid', '==', uid));
      const comicsSnap = await getDocs(comicsQuery);
      for (const comicDoc of comicsSnap.docs) {
        const chaptersQuery = query(collection(db, 'comics', comicDoc.id, 'chapters'));
        const chaptersSnap = await getDocs(chaptersQuery);
        chaptersSnap.docs.forEach(chapterDoc => {
          batch.delete(doc(db, 'comics', comicDoc.id, 'chapters', chapterDoc.id));
        });
        const ratingsQuery = query(collection(db, 'comics', comicDoc.id, 'ratings'));
        const ratingsSnap = await getDocs(ratingsQuery);
        ratingsSnap.docs.forEach(ratingDoc => {
          batch.delete(doc(db, 'comics', comicDoc.id, 'ratings', ratingDoc.id));
        });
        batch.delete(doc(db, 'comics', comicDoc.id));
      }

      // 2. Delete user posts and their comments
      const postsQuery = query(collection(db, 'posts'), where('authorUid', '==', uid));
      const postsSnap = await getDocs(postsQuery);
      for (const postDoc of postsSnap.docs) {
        const commentsQuery = query(collection(db, 'posts', postDoc.id, 'comments'));
        const commentsSnap = await getDocs(commentsQuery);
        commentsSnap.docs.forEach(commentDoc => {
          batch.delete(doc(db, 'posts', postDoc.id, 'comments', commentDoc.id));
        });
        batch.delete(doc(db, 'posts', postDoc.id));
      }

      // 3. Delete user articles
      const articlesQuery = query(collection(db, 'articles'), where('authorUid', '==', uid));
      const articlesSnap = await getDocs(articlesQuery);
      articlesSnap.docs.forEach(articleDoc => {
        batch.delete(doc(db, 'articles', articleDoc.id));
      });

      // 4. Delete user profile and user document
      batch.delete(doc(db, 'users', uid));
      batch.delete(doc(db, 'profiles', uid));

      // 5. Delete follows
      const followsQuery1 = query(collection(db, 'follows'), where('userId', '==', uid));
      const followsSnap1 = await getDocs(followsQuery1);
      followsSnap1.docs.forEach(fDoc => batch.delete(doc(db, 'follows', fDoc.id)));

      const followsQuery2 = query(collection(db, 'follows'), where('targetId', '==', uid));
      const followsSnap2 = await getDocs(followsQuery2);
      followsSnap2.docs.forEach(fDoc => batch.delete(doc(db, 'follows', fDoc.id)));

      // 6. Delete notifications
      const notifsQuery = query(collection(db, 'notifications'), where('recipientId', '==', uid));
      const notifsSnap = await getDocs(notifsQuery);
      notifsSnap.docs.forEach(nDoc => batch.delete(doc(db, 'notifications', nDoc.id)));

      await batch.commit();
      
      // Note: Admin cannot delete user from Firebase Auth via client SDK.
      // This requires Firebase Admin SDK or a Cloud Function.
      // For now, we delete all their data and they won't be able to do anything.
      alert('User data deleted from Firestore. Note: Auth account remains (Admin SDK required for full deletion).');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    } finally {
      setDeletingUid(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.uid.includes(searchQuery)
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 mb-2">{t('userManagement')}</h1>
          <p className="text-zinc-500 font-medium">Manage roles and access for all users.</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
          <span className="text-blue-600 font-black text-sm uppercase tracking-widest">Admin Panel</span>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input 
          type="text"
          placeholder="Search by name, email, handle or UID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <motion.div 
              key={user.uid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white p-4 rounded-3xl border transition-all ${user.banned ? 'border-red-100 bg-red-50/30' : 'border-zinc-100 shadow-sm hover:shadow-md'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={user.photoURL || 'https://picsum.photos/seed/user/200/200'} 
                      alt={user.displayName} 
                      className={`w-12 h-12 rounded-2xl object-cover border-2 ${user.banned ? 'border-red-200 grayscale' : 'border-white shadow-sm'}`}
                      referrerPolicy="no-referrer"
                    />
                    {user.role === 'admin' && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white p-1 rounded-lg shadow-lg">
                        <Shield size={10} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-zinc-900 leading-tight">{user.displayName}</h3>
                      {user.banned && (
                        <span className="bg-red-500 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md">{t('banned')}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Mail size={12} />
                        <span className="text-[10px] font-bold">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Hash size={12} />
                        <span className="text-[10px] font-bold">@{user.handle || 'no-handle'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Role Toggle */}
                  <button 
                    onClick={() => handleUpdateRole(user.uid, user.role === 'admin' ? 'user' : 'admin')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      user.role === 'admin' 
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800' 
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {user.role === 'admin' ? <ShieldAlert size={14} /> : <Shield size={14} />}
                    {user.role === 'admin' ? t('demoteToUser') : t('promoteToAdmin')}
                  </button>

                  {/* Ban Toggle */}
                  <button 
                    onClick={() => handleToggleBan(user.uid, !!user.banned)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      user.banned 
                      ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20' 
                      : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                    }`}
                  >
                    {user.banned ? <UserCheck size={14} /> : <UserMinus size={14} />}
                    {user.banned ? t('unbanUser') : t('banUser')}
                  </button>

                  {/* Delete User */}
                  <button 
                    onClick={() => handleDeleteUser(user.uid)}
                    disabled={deletingUid === user.uid}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
                    title={t('deleteUserAccount')}
                  >
                    <Trash2 size={14} />
                    {deletingUid === user.uid ? '...' : t('delete')}
                  </button>
                </div>
              </div>
              <div className="mt-2 text-[8px] font-bold text-zinc-300 uppercase tracking-widest">
                UID: {user.uid}
              </div>
            </motion.div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-20 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
              <p className="text-zinc-400 font-bold">No users found matching your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
