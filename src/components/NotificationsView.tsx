import React, { useEffect, useState } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, BookOpen, Trash2, CheckCircle, Briefcase, X } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, checkQuota } from '../firebase';
import { AppNotification } from '../types';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';

export function NotificationsView({ 
  user, 
  lang, 
  onBack,
  onNotificationClick,
  isQuotaExceeded
}: { 
  user: any, 
  lang: Language, 
  onBack: () => void,
  onNotificationClick: (notification: AppNotification) => void,
  isQuotaExceeded?: boolean
}) {
  const { t } = useTranslation(lang);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommission, setSelectedCommission] = useState<AppNotification | null>(null);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);

  const lastActionTimeRef = React.useRef<number>(0);
  const ACTION_THROTTLE = 3000;

  useEffect(() => {
    if (!user || isQuotaExceeded) return;

    const fetchNotifications = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'notifications'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const newNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AppNotification[];
        setNotifications(newNotifications);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notifications`);
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user, isQuotaExceeded]);

  const markAsRead = async (notificationId: string) => {
    if (checkQuota()) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/notifications/${notificationId}`);
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.type === 'commission') {
      setSelectedCommission(notification);
    }
    onNotificationClick(notification);
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0 || checkQuota()) return;

    const now = Date.now();
    if (now - lastActionTimeRef.current < ACTION_THROTTLE) return;
    lastActionTimeRef.current = now;

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

  const getIcon = (notification: AppNotification) => {
    switch (notification.type) {
      case 'like': return <Heart size={16} className="text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle size={16} className="text-blue-500 fill-blue-500" />;
      case 'follow': 
        if (notification.targetTitle) return <Heart size={16} className="text-pink-500 fill-pink-500" />;
        return <UserPlus size={16} className="text-green-500" />;
      case 'new_chapter': return <BookOpen size={16} className="text-purple-500" />;
      case 'commission': return <Briefcase size={16} className="text-orange-500" />;
      default: return <Bell size={16} className="text-zinc-400" />;
    }
  };

  const getMessage = (notification: AppNotification) => {
    switch (notification.type) {
      case 'like': return `${t('likedYourPost')} ${notification.targetTitle ? `"${notification.targetTitle}"` : ''}`;
      case 'comment': return `${t('commentedOnYourPost')} ${notification.targetTitle ? `"${notification.targetTitle}"` : ''}`;
      case 'follow': return notification.targetTitle ? `${t('favoritedYourComic')} "${notification.targetTitle}"` : t('startedFollowingYou');
      case 'new_chapter': return `${t('publishedNewChapter')} ${notification.targetTitle ? `"${notification.targetTitle}"` : ''}`;
      case 'commission': return `${t('newCommissionRequest')} ${notification.targetTitle ? `: ${notification.targetTitle}` : ''}`;
      default: return `sent you a notification`;
    }
  };

  return (
    <div className="container mx-auto px-4 py-3 max-w-2xl">
      <div className="flex items-center justify-between mb-2">
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

      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => handleNotificationClick(notification)}
              className={`group relative p-2 rounded-3xl border transition-all duration-300 cursor-pointer ${
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
                    {getIcon(notification)}
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
                  
                  {notification.type === 'commission' && notification.content && (
                    <div className="mt-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-100 italic text-xs text-zinc-500">
                      "{notification.content}"
                    </div>
                  )}

                  {notification.type === 'commission' && (
                    <div className="mt-3 flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Trigger messenger
                          onNotificationClick({ ...notification, type: 'commission_message' as any });
                        }}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-1.5"
                      >
                        <MessageCircle size={12} />
                        {t('message')}
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotificationToDelete(notification.id);
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
          <div className="text-center py-4 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-1">
              <Bell size={32} className="text-zinc-300" />
            </div>
            <p className="text-zinc-500 font-bold uppercase tracking-widest">{t('noNotifications')}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {notificationToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl p-6"
            >
              <h3 className="text-xl font-black text-zinc-900 mb-2 uppercase tracking-tight">Delete Notification?</h3>
              <p className="text-sm text-zinc-500 mb-6">Are you sure you want to remove this notification? This action cannot be undone.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setNotificationToDelete(null)}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={() => {
                    deleteNotification(notificationToDelete);
                    setNotificationToDelete(null);
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  {t('delete' as any) || 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Commission Detail Modal */}
      <AnimatePresence>
        {selectedCommission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between bg-zinc-900 text-white">
                <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                  <Briefcase size={20} />
                  {t('commissionRequest' as any) || 'Commission Request'}
                </h3>
                <button onClick={() => setSelectedCommission(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedCommission.senderPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedCommission.senderId}`} 
                    alt={selectedCommission.senderName} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-zinc-100 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-lg font-black text-zinc-900">{selectedCommission.senderName}</h4>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
                      {selectedCommission.createdAt?.toDate ? selectedCommission.createdAt.toDate().toLocaleString() : '...'}
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100">
                  <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap italic">
                    "{selectedCommission.content}"
                  </p>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      onNotificationClick({ ...selectedCommission, type: 'commission_message' as any });
                      setSelectedCommission(null);
                    }}
                    className="flex-1 py-4 bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={18} />
                    {t('message')}
                  </button>
                  <button 
                    onClick={() => setSelectedCommission(null)}
                    className="px-8 py-4 bg-zinc-100 text-zinc-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                  >
                    {t('close' as any) || 'Close'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
