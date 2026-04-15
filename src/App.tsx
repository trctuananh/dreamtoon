import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  getDocs,
  where,
  updateDoc, 
  increment, 
  runTransaction, 
  serverTimestamp, 
  addDoc, 
  deleteDoc, 
  setDoc,
  writeBatch,
  limit
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  sendPasswordResetEmail,
  User as FirebaseUser 
} from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronUp, X } from 'lucide-react';

// Firebase
import { 
  auth, 
  db, 
  googleProvider, 
  facebookProvider, 
  handleFirestoreError, 
  OperationType,
  createNotification
} from './firebase';

// Types
import { Comic, Chapter, Article, FeaturedItem, UserProfile, Like, Comment, View, Following, ReadingHistory, AppNotification } from './types';

// Components
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { ExploreView } from './components/ExploreView';
import { ComicDetailView } from './components/ComicDetailView';
import { ReaderView } from './components/ReaderView';
import { ProfileView } from './components/ProfileView';
import { UploadView } from './components/UploadView';
import { AddChapterView } from './components/AddChapterView';
import { CreateArticleView } from './components/CreateArticleView';
import { ArticleView as ArticleDetailView } from './components/ArticleView';
import { FeaturedManager as ManageFeaturedView } from './components/FeaturedManager';
import { LoginModal } from './components/LoginModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MyWallView } from './components/MyWallView';
import { ArtistWallView } from './components/ArtistWallView';
import { CommunityView } from './components/CommunityView';
import { NotificationsView } from './components/NotificationsView';
import { AdminUserManagementView } from './components/AdminUserManagementView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { MessengerView } from './components/MessengerView';

// Hooks & Utils
import { useTranslation } from './hooks/useTranslation';
import { Language } from './translations';

export default function App() {
  // State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<View>('home');
  const [comics, setComics] = useState<Comic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [following, setFollowing] = useState<Following[]>([]);
  const [followingFeed, setFollowingFeed] = useState<Chapter[]>([]);
  const [lang, setLang] = useState<Language>(() => {
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('vi') ? 'vi' : 'en';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [editingComic, setEditingComic] = useState<Comic | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [history, setHistory] = useState<ReadingHistory[]>([]);
  const [artists, setArtists] = useState<UserProfile[]>([]);
  const [chatTarget, setChatTarget] = useState<UserProfile | null>(null);

  const { t } = useTranslation(lang);

  // Routing / Deep Linking
  useEffect(() => {
    const handleLocationChange = async () => {
      const params = new URLSearchParams(window.location.search);
      let artistHandle = params.get('artist');
      
      const path = window.location.pathname;
      
      // Handle Home
      if (path === '/' && !artistHandle) {
        if (view !== 'home' && !['detail', 'reader', 'upload', 'add-chapter', 'edit-chapter', 'article', 'create-article', 'edit-comic'].includes(view)) {
          setView('home');
          setSelectedArtist(null);
        }
        return;
      }

      // Handle Artist Handle or Reserved Paths
      if (!artistHandle && path !== '/') {
        const pathParts = path.replace(/^\/|\/$/g, '').split('/');
        artistHandle = pathParts[0];
        const subPath = pathParts[1];

        if (artistHandle) {
          // Check if it's a reserved path
          const reservedPaths = ['explore', 'upload', 'community', 'notifications', 'profile', 'privacy', 'manage-featured', 'admin-users', 'create-article', 'reader', 'detail', 'article'];
          if (reservedPaths.includes(artistHandle)) {
            // Special handling for paths that need IDs
            if (artistHandle === 'detail' && subPath) {
              const comic = comics.find(c => c.id === subPath);
              if (comic) {
                setSelectedComic(comic);
                setView('detail');
                window.scrollTo(0, 0);
                return;
              }
            }
            if (artistHandle === 'article' && subPath) {
              const article = articles.find(a => a.id === subPath);
              if (article) {
                setSelectedArticle(article);
                setView('article');
                window.scrollTo(0, 0);
                return;
              }
            }
            // For reader, we need more parts, but for now just set the view if it's a simple reserved path
            if (artistHandle !== 'reader' && artistHandle !== 'detail' && artistHandle !== 'article') {
              setView(artistHandle as View);
              window.scrollTo(0, 0);
              return;
            }
          }

          try {
            // Try fetching by handle first from profiles collection
            const q = query(collection(db, 'profiles'), where('handle', '==', artistHandle.toLowerCase()));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
              const artistProfile = snap.docs[0].data() as UserProfile;
              const artistUid = snap.docs[0].id;
              setSelectedArtist({ uid: artistUid, profile: artistProfile });
              setView(subPath === 'profile' ? 'public-profile' : 'artist-wall');
              window.scrollTo(0, 0);
            } else {
              // Try fetching by UID from profiles collection
              const docRef = doc(db, 'profiles', artistHandle);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                setSelectedArtist({ uid: artistHandle, profile: docSnap.data() as UserProfile });
                setView(subPath === 'profile' ? 'public-profile' : 'artist-wall');
                window.scrollTo(0, 0);
              }
            }
          } catch (error) {
            console.error("Error fetching artist for deep link:", error);
          }
        }
      } else if (artistHandle) {
        // Handle ?artist=handle query param
        try {
          const q = query(collection(db, 'profiles'), where('handle', '==', artistHandle.toLowerCase()));
          const snap = await getDocs(q);
          
          if (!snap.empty) {
            const artistProfile = snap.docs[0].data() as UserProfile;
            const artistUid = snap.docs[0].id;
            setSelectedArtist({ uid: artistUid, profile: artistProfile });
            setView('artist-wall');
            window.scrollTo(0, 0);
          } else {
            const docRef = doc(db, 'profiles', artistHandle);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setSelectedArtist({ uid: artistHandle, profile: docSnap.data() as UserProfile });
              setView('artist-wall');
              window.scrollTo(0, 0);
            }
          }
        } catch (error) {
          console.error("Error fetching artist for deep link:", error);
        }
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    handleLocationChange(); // Initial check

    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const [selectedArtist, setSelectedArtist] = useState<{ uid: string, profile: UserProfile } | null>(null);

  // Presence System: Update lastSeen every minute
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      if (!user || !isAuthReady || document.visibilityState !== 'visible') return;
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          lastSeen: serverTimestamp()
        });
      } catch (error) {
        // Silently fail for presence updates to not disturb user
        console.warn('Presence update failed:', error);
      }
    };

    // Initial update
    updatePresence();

    // Periodic update - increased to 5 minutes to save quota
    const interval = setInterval(updatePresence, 300000);
    return () => clearInterval(interval);
  }, [user, isAuthReady]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (!user) {
        setProfile(null);
        setFollowing([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Profile Listener & Sync
  const lastSyncedProfileRef = React.useRef<string>('');

  useEffect(() => {
    if (isAuthReady && user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), async (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data() as UserProfile;
          setProfile(userData);

          // Sync public profile only if meaningful data changed to save quota
          try {
            const syncData = {
              displayName: userData.displayName || 'Anonymous',
              handle: userData.handle || '',
              photoURL: userData.photoURL || '',
              bio: userData.bio || '',
              pioneerNumber: userData.pioneerNumber || null,
              donateInfo: userData.donateInfo || null,
              commissionInfo: userData.commissionInfo || null,
              role: userData.role || 'user',
              banned: userData.banned || false
            };

            const syncString = JSON.stringify(syncData);
            if (syncString !== lastSyncedProfileRef.current) {
              const profileRef = doc(db, 'profiles', user.uid);
              await setDoc(profileRef, {
                ...syncData,
                uid: user.uid,
                email: userData.email || '',
                updatedAt: serverTimestamp(),
                createdAt: userData.createdAt || serverTimestamp()
              }, { merge: true });
              lastSyncedProfileRef.current = syncString;
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `profiles/${user.uid}`);
          }
        } else {
          // Create initial profile if it doesn't exist
          const initialProfile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || 'Anonymous',
            email: user.email || '',
            photoURL: user.photoURL || '',
            role: 'user',
            createdAt: serverTimestamp()
          };
          try {
            await setDoc(doc(db, 'users', user.uid), initialProfile);
            // Also create public profile
            await setDoc(doc(db, 'profiles', user.uid), initialProfile);
          } catch (error) {
            console.error("Error creating initial profile:", error);
          }
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      });
      return () => unsubscribe();
    }
  }, [user, isAuthReady]);

  // Comics Listener
  useEffect(() => {
    const q = query(collection(db, 'comics'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comic)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comics');
    });
    return () => unsubscribe();
  }, []);

  // Articles Listener
  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'articles');
    });
    return () => unsubscribe();
  }, []);

  // Featured Listener
  useEffect(() => {
    const q = query(collection(db, 'featured'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFeaturedItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedItem)));
    }, (error) => {
      console.error("Error fetching featured items:", error);
    });
    return () => unsubscribe();
  }, []);

  // Chapters Listener
  useEffect(() => {
    if (selectedComic) {
      const q = query(collection(db, 'comics', selectedComic.id, 'chapters'), orderBy('number', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setChapters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `comics/${selectedComic.id}/chapters`);
      });
      return () => unsubscribe();
    }
  }, [selectedComic]);

  // Comments Listener
  useEffect(() => {
    if (selectedComic && selectedChapter) {
      const q = query(
        collection(db, 'comics', selectedComic.id, 'chapters', selectedChapter.id, 'comments'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `comics/${selectedComic.id}/chapters/${selectedChapter.id}/comments`);
      });
      return () => unsubscribe();
    }
  }, [selectedComic, selectedChapter]);

  // Likes Listener
  useEffect(() => {
    if (selectedComic && selectedChapter) {
      const q = query(
        collection(db, 'comics', selectedComic.id, 'chapters', selectedChapter.id, 'likes'),
        limit(100)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setLikes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Like)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `comics/${selectedComic.id}/chapters/${selectedChapter.id}/likes`);
      });
      return () => unsubscribe();
    }
  }, [selectedComic, selectedChapter]);

  // Following Listener
  useEffect(() => {
    if (isAuthReady && user) {
      const q = query(collection(db, 'users', user.uid, 'following'), limit(100));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setFollowing(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Following)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/following`);
      });
      return () => unsubscribe();
    }
  }, [user, isAuthReady]);

  // Following Feed Listener
  const followingIds = useMemo(() => {
    return following
      .filter(f => f.type === 'comic')
      .map(f => f.id.replace('comic_', ''))
      .sort()
      .join(',');
  }, [following]);

  useEffect(() => {
    if (isAuthReady && user && followingIds) {
      const comicIds = followingIds.split(',').filter(id => id !== '');
      if (comicIds.length === 0) {
        setFollowingFeed([]);
        return;
      }

      // Firestore "in" query limit is 10
      const limitedComicIds = comicIds.slice(0, 10);
      const q = query(
        collection(db, 'chapters'),
        where('comicId', 'in', limitedComicIds),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setFollowingFeed(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chapters');
      });
      return () => unsubscribe();
    } else if (user && !followingIds) {
      setFollowingFeed([]);
    }
  }, [user, followingIds, isAuthReady]);

  // Notifications Fetch (One-time)
  useEffect(() => {
    const fetchNotifications = async () => {
      if (isAuthReady && user) {
        try {
          const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            where('read', '==', false),
            limit(50)
          );
          const snapshot = await getDocs(q);
          setUnreadNotificationsCount(snapshot.size);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notifications`);
        }
      } else {
        setUnreadNotificationsCount(0);
      }
    };
    fetchNotifications();
  }, [user, isAuthReady]);

  // Messages Listener
  useEffect(() => {
    if (isAuthReady && user) {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const totalUnread = snapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          return acc + (data.unreadCount?.[user.uid] || 0);
        }, 0);
        setUnreadMessagesCount(totalUnread);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'conversations');
      });
      return () => unsubscribe();
    } else {
      setUnreadMessagesCount(0);
    }
  }, [user, isAuthReady]);

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Artists Fetch (One-time) - Now fetching all profiles for search
  useEffect(() => {
    const fetchArtists = async () => {
      try {
        // Fetching more profiles to support searching for any user
        const q = query(collection(db, 'profiles'), limit(100));
        const snapshot = await getDocs(q);
        setArtists(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      } catch (error) {
        console.error("Error fetching profiles:", error);
      }
    };
    fetchArtists();
  }, []);

  // Handlers
  const handleLogin = async (providerType: 'google' | 'facebook' = 'google') => {
    const provider = providerType === 'google' ? googleProvider : facebookProvider;
    await signInWithPopup(auth, provider);
    setIsLoginModalOpen(false);
  };

  const handleEmailLogin = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setIsLoginModalOpen(false);
    } catch (error: any) {
      console.error('Email login failed:', error);
      let message = t('errorOccurred');
      if (error.code === 'auth/user-not-found') message = t('userNotFound');
      if (error.code === 'auth/wrong-password') message = t('wrongPassword');
      if (error.code === 'auth/invalid-email') message = t('invalidEmail');
      throw new Error(message);
    }
  };

  const handleEmailRegister = async (email: string, pass: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const authUpdate: { displayName?: string; photoURL?: string } = {
        displayName: name
      };
      
      // If we ever add a photo upload during registration, we should check it here too
      // For now, we just set the display name
      
      await updateProfile(userCredential.user, authUpdate);
      // The onAuthStateChanged will handle the rest
      setIsLoginModalOpen(false);
    } catch (error: any) {
      console.error('Email registration failed:', error);
      let message = t('errorOccurred');
      if (error.code === 'auth/email-already-in-use') message = t('emailInUse');
      if (error.code === 'auth/weak-password') message = t('weakPassword');
      if (error.code === 'auth/invalid-email') message = t('invalidEmail');
      throw new Error(message);
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      // Check if user exists in Firestore first
      const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error(t('userNotFound'));
      }

      // Optional: Check if they are a social login user (if we store that info)
      // For now, we'll just try to send the email. 
      // Firebase will handle it if they don't have a password set.
      
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset failed:', error);
      let message = error.message || t('errorOccurred');
      if (error.code === 'auth/user-not-found') message = t('userNotFound');
      if (error.code === 'auth/invalid-email') message = t('invalidEmail');
      throw new Error(message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('home');
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleComicClick = (comic: Comic) => {
    setSelectedComic(comic);
    setView('detail');
    window.scrollTo(0, 0);
    window.history.pushState(null, '', `/detail/${comic.id}`);
  };

  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
    setView('article');
    window.scrollTo(0, 0);
    window.history.pushState(null, '', `/article/${article.id}`);
  };

  const handleArtistClick = async (input: string | any) => {
    const uid = typeof input === 'string' ? input : input.uid;
    try {
      const docRef = doc(db, 'profiles', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setSelectedArtist({ uid, profile: data });
        setView('artist-wall');
        window.scrollTo(0, 0);
        // Update URL to dreamtoon.vn/handle or dreamtoon.vn/uid
        window.history.pushState(null, '', `/${data.handle || uid}`);
      }
    } catch (error) {
      console.error("Error fetching artist profile:", error);
    }
  };

  const handlePublicProfileClick = async (uid: string) => {
    try {
      const docRef = doc(db, 'profiles', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setSelectedArtist({ uid, profile: data });
        setView('public-profile');
        window.scrollTo(0, 0);
        window.history.pushState(null, '', `/${data.handle || uid}/profile`);
      }
    } catch (error) {
      console.error("Error fetching artist profile:", error);
    }
  };

  // History Fetch (One-time)
  useEffect(() => {
    const fetchHistory = async () => {
      if (isAuthReady && user) {
        try {
          const q = query(
            collection(db, 'users', user.uid, 'history'),
            orderBy('lastRead', 'desc'),
            limit(20)
          );
          const snapshot = await getDocs(q);
          const historyData = snapshot.docs.map(doc => ({ comicId: doc.id, ...doc.data() } as ReadingHistory));
          setHistory(historyData);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/history`);
        }
      }
    };
    fetchHistory();
  }, [user, isAuthReady]);

  const viewedChaptersRef = React.useRef<Set<string>>(new Set());

  const handleChapterClick = async (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setView('reader');
    window.scrollTo(0, 0);
    window.history.pushState(null, '', `/reader/${chapter.comicId}/${chapter.id}`);

    try {
      // Only increment views once per session per chapter to save quota
      if (!viewedChaptersRef.current.has(chapter.id)) {
        viewedChaptersRef.current.add(chapter.id);
        
        const batch = writeBatch(db);
        batch.update(doc(db, 'comics', chapter.comicId, 'chapters', chapter.id), {
          views: increment(1)
        });
        batch.update(doc(db, 'comics', chapter.comicId), {
          views: increment(1)
        });
        await batch.commit();
      }

      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'history', chapter.comicId), {
          lastRead: serverTimestamp(),
          chapterId: chapter.id,
          chapterNumber: chapter.number
        });
      }
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  };

  const lastActionTimeRef = React.useRef<number>(0);
  const ACTION_THROTTLE = 2000; // 2 seconds throttle for writes

  const handleToggleFollow = async (targetId: string, type: 'comic' | 'artist', comicAuthorUid?: string) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    const now = Date.now();
    if (now - lastActionTimeRef.current < ACTION_THROTTLE) return;
    lastActionTimeRef.current = now;

    const followId = `${type}_${targetId}`;
    const followRef = doc(db, 'users', user.uid, 'following', followId);
    const globalFollowRef = doc(db, 'follows', `${user.uid}_${targetId}`);
    
    try {
      const docSnap = await getDoc(followRef);
      const batch = writeBatch(db);

      if (docSnap.exists()) {
        batch.delete(followRef);
        batch.delete(globalFollowRef);
        await batch.commit();
      } else {
        const followData = {
          id: followId,
          targetId,
          userId: user.uid,
          type,
          createdAt: serverTimestamp()
        };
        batch.set(followRef, followData);
        batch.set(globalFollowRef, followData);
        await batch.commit();
        
        // Create notification for artist follow
        if (type === 'artist') {
          createNotification({
            recipientId: targetId,
            type: 'follow',
            targetId: user.uid,
            senderId: user.uid,
            senderName: profile?.displayName || user.displayName || 'Anonymous',
            senderPhoto: profile?.photoURL || user.photoURL || ''
          });
        } else if (type === 'comic' && comicAuthorUid) {
          createNotification({
            recipientId: comicAuthorUid,
            type: 'follow',
            targetId: targetId,
            targetTitle: comics.find(c => c.id === targetId)?.title,
            senderId: user.uid,
            senderName: profile?.displayName || user.displayName || 'Anonymous',
            senderPhoto: profile?.photoURL || user.photoURL || ''
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `follows/${followId}`);
    }
  };

  const handleBack = () => {
    setSelectedTag(null);
    if (view === 'reader') {
      setView('detail');
    } else if (view === 'artist-wall' || view === 'public-profile') {
      setSelectedArtist(null);
      setView('home');
      window.history.pushState(null, '', '/');
    } else if (view === 'article') {
      setView('home');
      setSelectedArticle(null);
      window.history.pushState(null, '', '/');
    } else if (view === 'create-article') {
      setView('home');
      setEditingArticle(null);
      window.history.pushState(null, '', '/');
    } else if (view === 'detail') {
      setView('home');
      setSelectedComic(null);
      window.history.pushState(null, '', '/');
    } else if (view === 'explore') {
      setView('home');
      window.history.pushState(null, '', '/');
    } else if (view === 'profile' || view === 'my-wall' || view === 'community') {
      setView('home');
      window.history.pushState(null, '', '/');
    } else if (view === 'edit-comic') {
      setView('profile');
      setEditingComic(null);
    } else if (view === 'edit-chapter') {
      setView('detail');
      setEditingChapter(null);
    } else if (view === 'manage-featured') {
      setView('home');
      window.history.pushState(null, '', '/');
    } else if (view === 'messenger') {
      setView('home');
      setChatTarget(null);
      window.history.pushState(null, '', '/');
    } else {
      setView('home');
      setSelectedComic(null);
      setSelectedChapter(null);
      setSelectedArtist(null);
      setChatTarget(null);
      window.history.pushState(null, '', '/');
    }
    window.scrollTo(0, 0);
  };

  const handleMessageClick = (target: UserProfile) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    setChatTarget(target);
    setView('messenger');
    window.scrollTo(0, 0);
    window.history.pushState(null, '', '/messenger');
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (notification.type === 'commission') {
      // No longer redirecting to my-wall, details are in the notification itself
      return;
    } else if (notification.type as string === 'commission_message') {
      setChatTarget({
        uid: notification.senderId,
        displayName: notification.senderName,
        photoURL: notification.senderPhoto,
        email: ''
      } as UserProfile);
      setView('messenger');
      window.scrollTo(0, 0);
      window.history.pushState(null, '', '/messenger');
    } else if (notification.type === 'follow') {
      handleArtistClick(notification.senderId);
    } else if (notification.type === 'like' || notification.type === 'comment' || notification.type === 'new_chapter') {
      // Find comic by targetId (which could be comicId or chapterId)
      let comic = comics.find(c => c.id === notification.targetId);
      
      if (comic) {
        handleComicClick(comic);
      } else {
        // Try finding by targetTitle or just go to home if not found
        // In a real app, we might want to fetch the comic by ID here
        setView('home');
      }
    }
  };

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
          newCount = currentCount;
          newRating = ((currentRating * currentCount) - oldScore + score) / newCount;
        } else {
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

  if (profile?.banned) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ChevronUp size={40} className="text-red-500 rotate-180" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Access Denied</h1>
          <p className="text-zinc-400 font-medium mb-8 leading-relaxed">
            Your account has been suspended for violating our community guidelines. If you believe this is a mistake, please contact support.
          </p>
          <button 
            onClick={() => signOut(auth)}
            className="px-8 py-4 bg-white text-zinc-950 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-blue-100">
        <Navbar 
          user={user}
          profile={profile}
          view={view}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setView={setView}
          onLogout={handleLogout}
          onLogin={() => setIsLoginModalOpen(true)}
          onBack={handleBack}
          lang={lang}
          setLang={setLang}
          unreadNotificationsCount={unreadNotificationsCount}
          unreadMessagesCount={unreadMessagesCount}
        />

        <main className={`pb-20 sm:pb-0 ${view === 'reader' ? 'pb-0' : ''} ${(view === 'home' || view === 'explore') ? 'lg:max-w-[85%] lg:mx-auto' : ''}`}>
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <HomeView 
                comics={comics}
                articles={articles}
                artists={artists}
                featuredItems={featuredItems}
                followingFeed={followingFeed}
                following={following}
                history={history}
                user={user}
                searchQuery={searchQuery}
                onComicClick={handleComicClick}
                onArticleClick={handleArticleClick}
                onChapterClick={handleChapterClick}
                onExploreClick={() => {
                  setView('explore');
                  window.scrollTo(0, 0);
                }}
                onArtistClick={handleArtistClick}
                lang={lang}
              />
            )}

            {view === 'explore' && (
              <ExploreView 
                comics={comics}
                artists={artists}
                onComicClick={handleComicClick}
                onArtistClick={handleArtistClick}
                lang={lang}
                searchQuery={searchQuery}
              />
            )}

            {view === 'detail' && selectedComic && (
              <ComicDetailView 
                comic={selectedComic}
                chapters={chapters}
                user={user}
                following={following}
                userRating={userRating}
                isRatingSubmitting={isRatingSubmitting}
                ratingSuccess={ratingSuccess}
                onRate={handleRate}
                onChapterClick={handleChapterClick}
                onToggleFollow={handleToggleFollow}
                onAddChapter={() => setView('add-chapter')}
                onEditChapter={(chapter) => {
                  setEditingChapter(chapter);
                  setView('edit-chapter');
                }}
                onEditComic={(comic) => {
                  setEditingComic(comic);
                  setView('edit-comic');
                  window.scrollTo(0, 0);
                }}
                onArtistClick={handleArtistClick}
                onBack={handleBack}
                lang={lang}
              />
            )}

            {view === 'reader' && selectedChapter && selectedComic && (
              <ReaderView 
                chapter={selectedChapter}
                chapters={chapters}
                comic={selectedComic}
                user={user}
                likes={likes}
                comments={comments}
                onChapterClick={handleChapterClick}
                onToggleLike={async () => {
                  if (!user || !selectedChapter || !selectedComic) return;
                  
                  const now = Date.now();
                  if (now - lastActionTimeRef.current < ACTION_THROTTLE) return;
                  lastActionTimeRef.current = now;

                  const userLike = likes.find(l => l.userId === user.uid && l.targetId === selectedChapter.id);
                  const likesRef = collection(db, 'comics', selectedComic.id, 'chapters', selectedChapter.id, 'likes');
                  const batch = writeBatch(db);

                  try {
                    if (userLike) {
                      batch.delete(doc(likesRef, userLike.id));
                      await batch.commit();
                    } else {
                      const likeRef = doc(likesRef, user.uid);
                      batch.set(likeRef, {
                        id: user.uid,
                        userId: user.uid,
                        targetId: selectedChapter.id,
                        chapterId: selectedChapter.id,
                        comicId: selectedComic.id,
                        createdAt: serverTimestamp()
                      });
                      
                      // Create notification for like
                      const notifRef = doc(collection(db, 'users', selectedComic.authorUid, 'notifications'));
                      batch.set(notifRef, {
                        recipientId: selectedComic.authorUid,
                        senderId: user.uid,
                        senderName: profile?.displayName || user.displayName || 'Anonymous',
                        senderPhoto: profile?.photoURL || user.photoURL || '',
                        type: 'like',
                        targetId: selectedChapter.id,
                        targetTitle: selectedComic.title,
                        read: false,
                        createdAt: serverTimestamp()
                      });

                      await batch.commit();
                    }
                  } catch (error) {
                    handleFirestoreError(error, OperationType.WRITE, `likes/${user.uid}`);
                  }
                }}
                onAddComment={async (text, parentId, replyTo) => {
                  if (!user || !selectedChapter || !selectedComic || !text.trim()) return;
                  
                  const now = Date.now();
                  if (now - lastActionTimeRef.current < ACTION_THROTTLE) return;
                  lastActionTimeRef.current = now;

                  try {
                    const batch = writeBatch(db);
                    const commentRef = doc(collection(db, 'comics', selectedComic.id, 'chapters', selectedChapter.id, 'comments'));
                    
                    batch.set(commentRef, {
                      uid: user.uid,
                      userName: profile?.displayName || user.displayName || 'Anonymous',
                      userPhoto: profile?.photoURL || user.photoURL || '',
                      chapterId: selectedChapter.id,
                      comicId: selectedComic.id,
                      content: text,
                      parentId: parentId || null,
                      replyTo: replyTo || null,
                      createdAt: serverTimestamp()
                    });
                    
                    // Create notification for comment
                    const notifRef = doc(collection(db, 'users', selectedComic.authorUid, 'notifications'));
                    batch.set(notifRef, {
                      recipientId: selectedComic.authorUid,
                      senderId: user.uid,
                      senderName: profile?.displayName || user.displayName || 'Anonymous',
                      senderPhoto: profile?.photoURL || user.photoURL || '',
                      type: 'comment',
                      targetId: selectedChapter.id,
                      targetTitle: selectedComic.title,
                      read: false,
                      createdAt: serverTimestamp()
                    });

                    await batch.commit();
                  } catch (error) {
                    handleFirestoreError(error, OperationType.CREATE, 'comments');
                  }
                }}
                onDeleteComment={async (commentId) => {
                  if (!user || !selectedChapter || !selectedComic) return;
                  try {
                    await deleteDoc(doc(db, 'comics', selectedComic.id, 'chapters', selectedChapter.id, 'comments', commentId));
                  } catch (error) {
                    handleFirestoreError(error, OperationType.DELETE, `comments/${commentId}`);
                  }
                }}
                onNextChapter={() => {
                  const nextIdx = chapters.findIndex(c => c.id === selectedChapter.id) + 1;
                  if (nextIdx < chapters.length) handleChapterClick(chapters[nextIdx]);
                }}
                onPrevChapter={() => {
                  const prevIdx = chapters.findIndex(c => c.id === selectedChapter.id) - 1;
                  if (prevIdx >= 0) handleChapterClick(chapters[prevIdx]);
                }}
                onBack={handleBack}
                lang={lang}
              />
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
                  window.scrollTo(0, 0);
                }}
                onComicSelect={handleComicClick}
                onUpload={() => setView('upload')}
                onBack={handleBack}
                onToggleFollow={handleToggleFollow}
                onLogout={handleLogout}
                lang={lang}
              />
            )}

            {view === 'public-profile' && selectedArtist && (
              <ProfileView
                user={{ uid: selectedArtist.uid, displayName: selectedArtist.profile.displayName, photoURL: selectedArtist.profile.photoURL }}
                profile={selectedArtist.profile}
                comics={comics}
                following={following}
                onEditComic={() => {}}
                onComicSelect={handleComicClick}
                onUpload={() => {}}
                onBack={handleBack}
                onToggleFollow={handleToggleFollow}
                onLogout={() => {}}
                lang={lang}
                onMessageClick={handleMessageClick}
                isGuest={true}
              />
            )}

            {view === 'edit-comic' && editingComic && (
              <UploadView
                user={user}
                profile={profile}
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
                profile={profile}
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

            {view === 'edit-chapter' && selectedComic && editingChapter && (
              <AddChapterView 
                comicId={selectedComic.id}
                authorUid={selectedComic.authorUid}
                chapterCount={chapters.length}
                initialData={editingChapter}
                lang={lang}
                onSuccess={() => {
                  setView('detail');
                  setEditingChapter(null);
                  window.scrollTo(0, 0);
                }}
                onCancel={() => {
                  setView('detail');
                  setEditingChapter(null);
                }}
              />
            )}

            {view === 'create-article' && (
              <CreateArticleView 
                user={user}
                profile={profile}
                lang={lang}
                initialData={editingArticle}
                onSuccess={() => {
                  setEditingArticle(null);
                  setView('home');
                  window.scrollTo(0, 0);
                }}
                onCancel={() => {
                  setEditingArticle(null);
                  setView('home');
                }}
              />
            )}

            {view === 'article' && selectedArticle && (
              <ArticleDetailView 
                article={selectedArticle}
                lang={lang}
                onBack={handleBack}
              />
            )}

            {view === 'notifications' && user && (
              <NotificationsView 
                user={user}
                lang={lang}
                onBack={handleBack}
                onNotificationClick={handleNotificationClick}
              />
            )}

            {view === 'support' && (
              <div className="container mx-auto px-4 py-20 text-center">
                <h2 className="text-3xl font-black mb-4 uppercase tracking-tight">Support (Q&A)</h2>
                <p className="text-zinc-500 font-bold uppercase tracking-widest">Coming Soon</p>
              </div>
            )}

            {view === 'manage-featured' && (
              <ManageFeaturedView 
                comics={comics}
                articles={articles}
                featuredItems={featuredItems}
                lang={lang}
                onBack={() => setView('home')}
                onEditArticle={(article) => {
                  setEditingArticle(article);
                  setView('create-article');
                }}
              />
            )}

            {view === 'my-wall' && user && (
              <MyWallView 
                user={user}
                profile={profile}
                lang={lang}
                onBack={handleBack}
                setView={setView}
                onMessageClick={handleMessageClick}
              />
            )}

            {view === 'artist-wall' && selectedArtist && (
              <ArtistWallView 
                user={user}
                profile={profile}
                isAdmin={profile?.role === 'admin' || user?.email === 'tr.c.tuananh@gmail.com'}
                artistUid={selectedArtist.uid}
                artistProfile={selectedArtist.profile}
                following={following}
                lang={lang}
                onBack={handleBack}
                onProfileClick={handlePublicProfileClick}
                onToggleFollow={handleToggleFollow}
                onMessageClick={handleMessageClick}
                onLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {view === 'community' && (
              <CommunityView 
                user={user}
                isAdmin={profile?.role === 'admin' || user?.email === 'tr.c.tuananh@gmail.com'}
                comics={comics}
                following={following}
                lang={lang}
                searchQuery={searchQuery}
                onBack={handleBack}
                onArtistClick={handleArtistClick}
                onLogin={() => setIsLoginModalOpen(true)}
                setView={setView}
                onMessageClick={handleMessageClick}
              />
            )}

            {view === 'admin-users' && (profile?.role === 'admin' || user?.email === 'tr.c.tuananh@gmail.com') && (
              <AdminUserManagementView lang={lang} />
            )}

            {view === 'privacy' && (
              <PrivacyPolicyView 
                lang={lang}
                onBack={handleBack}
              />
            )}

            {view === 'messenger' && (
              <MessengerView 
                user={user}
                profile={profile}
                lang={lang}
                onBack={handleBack}
                chatTarget={chatTarget}
                onChatTargetHandled={() => setChatTarget(null)}
              />
            )}
          </AnimatePresence>

          <LoginModal 
            isOpen={isLoginModalOpen} 
            onClose={() => setIsLoginModalOpen(false)} 
            onLogin={handleLogin}
            onEmailLogin={handleEmailLogin}
            onEmailRegister={handleEmailRegister}
            onForgotPassword={handleForgotPassword}
            lang={lang}
          />

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

        {view !== 'reader' && <Footer lang={lang} onViewChange={setView} />}
      </div>
    </ErrorBoundary>
  );
}
