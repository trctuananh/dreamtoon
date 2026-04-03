import React, { useEffect, useState } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, BookOpen, Trash2, CheckCircle } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Notification } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';

export function NotificationsView({ 
  user, 
  lang, 
  onBack 
}: { 
  user: any, 
  lang: Language, 
  onBack: () => void 
}) {
  const { t } = useTranslation(lang);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(newNotifications);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notifications`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/notifications/${notificationId}`);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/notifications (batch)`);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notifications', notificationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/notifications/${notificationId}`);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like': return <Heart size={16} className="text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle size={16} className="text-blue-500 fill-blue-500" />;
      case 'follow': return <UserPlus size={16} className="text-green-500" />;
      case 'new_chapter': return <BookOpen size={16} className="text-purple-500" />;
      default: return <Bell size={16} className="text-zinc-400" />;
    }
  };

  const getMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'like': return `${t('likedYourPost')} ${notification.targetTitle ? `"${notification.targetTitle}"` : ''}`;
      case 'comment': return `${t('commentedOnYourPost')} ${notification.targetTitle ? `"${notification.targetTitle}"` : ''}`;
      case 'follow': return t('startedFollowingYou');
      case 'new_chapter': return `${t('publishedNewChapter')} ${notification.targetTitle ? `"${notification.targetTitle}"` : ''}`;
      default: return `sent you a notification`;
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bell size={24} className="text-white" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 uppercase">{t('notifications')}</h2>
        </div>
        
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
          >
            <CheckCircle size={14} />
            {t('markAllAsRead')}
          </button>
        )}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => !notification.read && markAsRead(notification.id)}
              className={`group relative p-4 rounded-3xl border transition-all duration-300 cursor-pointer ${
                notification.read 
                  ? 'bg-white border-zinc-100 opacity-75' 
                  : 'bg-blue-50/50 border-blue-100 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <img 
                    src={notification.senderPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.senderId}`} 
                    alt={notification.senderName} 
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-50">
                    {getIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-black text-zinc-900 truncate">
                      {notification.senderName}
                    </p>
                    <span className="text-[10px] font-bold text-zinc-400 whitespace-nowrap">
                      {notification.createdAt?.toDate ? notification.createdAt.toDate().toLocaleDateString() : '...'}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {getMessage(notification)}
                  </p>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {!notification.read && (
                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && notifications.length === 0 && (
          <div className="text-center py-20 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell size={32} className="text-zinc-300" />
            </div>
            <p className="text-zinc-500 font-bold uppercase tracking-widest">{t('noNotifications')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
