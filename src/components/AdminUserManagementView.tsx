import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  setDoc,
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
import { Search, Shield, ShieldAlert, UserMinus, UserCheck, Mail, Hash, Trash2, Activity, Send } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export function AdminUserManagementView({ lang, isQuotaExceeded }: { lang: Language, isQuotaExceeded?: boolean }) {
  const { t } = useTranslation(lang);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [updatingRoleUid, setUpdatingRoleUid] = useState<string | null>(null);
  const [togglingBanUid, setTogglingBanUid] = useState<string | null>(null);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean, message: string } | null>(null);
  const [testEmailInput, setTestEmailInput] = useState('');

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (isQuotaExceeded) return;

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

  const handleUpdateRole = async (uid: string, newRole: UserProfile['role']) => {
    if (!newRole) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Update Role',
      message: `Are you sure you want to change this user's role to ${newRole}?`,
      isDestructive: false,
      onConfirm: async () => {
        setUpdatingRoleUid(uid);
        console.log(`[Admin] Updating role for user ${uid} to ${newRole}...`);
        try {
          await setDoc(doc(db, 'users', uid), { role: newRole }, { merge: true });
          // Use setDoc with merge for profiles as they might not exist yet
          await setDoc(doc(db, 'profiles', uid), { role: newRole }, { merge: true });
          console.log(`[Admin] Role updated successfully for ${uid}`);
        } catch (error) {
          console.error(`[Admin] Failed to update role for ${uid}:`, error);
          handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
        } finally {
          setUpdatingRoleUid(null);
        }
      }
    });
  };

  const handleToggleBan = async (uid: string, currentlyBanned: boolean) => {
    const action = currentlyBanned ? 'unban' : 'ban';
    
    setConfirmModal({
      isOpen: true,
      title: currentlyBanned ? 'Unban User' : 'Ban User',
      message: `Are you sure you want to ${action} this user?`,
      isDestructive: !currentlyBanned,
      onConfirm: async () => {
        setTogglingBanUid(uid);
        console.log(`[Admin] ${action}ing user ${uid}...`);
        try {
          await setDoc(doc(db, 'users', uid), { banned: !currentlyBanned }, { merge: true });
          // Use setDoc with merge for profiles as they might not exist yet
          await setDoc(doc(db, 'profiles', uid), { banned: !currentlyBanned }, { merge: true });
          console.log(`[Admin] User ${uid} ${action}ned successfully`);
        } catch (error) {
          console.error(`[Admin] Failed to ${action} user ${uid}:`, error);
          handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
        } finally {
          setTogglingBanUid(null);
        }
      }
    });
  };

  const handleDeleteUser = async (uid: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('delete'),
      message: t('confirmDeleteUserAccount'),
      isDestructive: true,
      onConfirm: async () => {
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
          alert('User data deleted from Firestore. Note: Auth account remains (Admin SDK required for full deletion).');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
        } finally {
          setDeletingUid(null);
        }
      }
    });
  };

  const handleTestEmail = async () => {
    if (!testEmailInput) return;

    setIsTestingEmail(true);
    setTestEmailResult(null);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmailInput })
      });
      const data = await response.json();
      if (data.success) {
        setTestEmailResult({ success: true, message: `Test email sent to ${testEmailInput}!` });
        setTestEmailInput('');
      } else {
        setTestEmailResult({ success: false, message: data.error || 'Failed to send test email.' });
      }
    } catch (error) {
      setTestEmailResult({ success: false, message: 'Network error or server unavailable.' });
    } finally {
      setIsTestingEmail(false);
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

      <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="text-blue-500" size={20} />
          <h2 className="text-lg font-black tracking-tight text-zinc-900">System Health</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 w-full sm:max-w-md flex gap-2">
            <input 
              type="email"
              placeholder="Enter email for testing..."
              value={testEmailInput}
              onChange={(e) => setTestEmailInput(e.target.value)}
              className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <button 
              onClick={handleTestEmail}
              disabled={isTestingEmail || !testEmailInput}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg shadow-zinc-900/10 whitespace-nowrap"
            >
              {isTestingEmail ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
              {isTestingEmail ? 'Sending...' : 'Test Email'}
            </button>
          </div>
          
          {testEmailResult && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl ${testEmailResult.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
            >
              {testEmailResult.message}
            </motion.div>
          )}
        </div>
        <p className="mt-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          Tip: Ensure RESEND_API_KEY and RESEND_FROM_EMAIL are set in settings.
        </p>
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
                    {user.role === 'admin' ? (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white p-1 rounded-lg shadow-lg">
                        <Shield size={10} />
                      </div>
                    ) : user.role === 'mod' ? (
                      <div className="absolute -top-1 -right-1 bg-orange-500 text-white p-1 rounded-lg shadow-lg">
                        <ShieldAlert size={10} />
                      </div>
                    ) : null}
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

                <div className="flex flex-wrap items-center gap-2">
                  {/* Role Selector */}
                  <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
                    {(['sleeper', 'dreamer', 'VIP', 'mod'] as const).map((role) => {
                      const isUpdating = updatingRoleUid === user.uid;
                      return (
                        <button
                          key={role}
                          onClick={() => !isUpdating && handleUpdateRole(user.uid, role)}
                          disabled={isUpdating}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                            user.role === role
                              ? (role === 'mod' ? 'bg-orange-500 text-white shadow-sm' : 
                                 role === 'VIP' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm' :
                                 role === 'dreamer' ? 'bg-blue-500 text-white shadow-sm' :
                                 'bg-zinc-300 text-zinc-600 shadow-sm')
                              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200'
                          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isUpdating && user.role !== role ? '...' : role}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Ban Toggle */}
                    <button 
                      onClick={() => !togglingBanUid && handleToggleBan(user.uid, !!user.banned)}
                      disabled={togglingBanUid === user.uid}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        user.banned 
                        ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20' 
                        : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                      } ${togglingBanUid === user.uid ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {togglingBanUid === user.uid ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        user.banned ? <UserCheck size={14} /> : <UserMinus size={14} />
                      )}
                      {togglingBanUid === user.uid ? '...' : (user.banned ? t('unbanUser') : t('banUser'))}
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

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        lang={lang}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
}
