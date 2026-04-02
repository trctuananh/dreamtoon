import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Following, Chapter } from '../types';

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [following, setFollowing] = useState<Following[]>([]);
  const [followingFeed, setFollowingFeed] = useState<Chapter[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (!authUser) {
        setProfile(null);
        setFollowing([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Profile Listener
  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), async (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
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
          } catch (error) {
            console.error("Error creating initial profile:", error);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Following Listener
  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'following'), (snapshot) => {
        setFollowing(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Following)));
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Following Feed Listener
  useEffect(() => {
    if (user && following.length > 0) {
      const comicIds = following.filter(f => f.type === 'comic').map(f => f.id.replace('comic_', ''));
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
      });
      return () => unsubscribe();
    }
  }, [user, following]);

  return { user, profile, following, followingFeed };
}
