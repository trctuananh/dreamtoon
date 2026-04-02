import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Comic, Article, FeaturedItem } from '../types';

export function useGlobalData() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);

  // Comics Listener
  useEffect(() => {
    const q = query(collection(db, 'comics'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comic)));
    });
    return () => unsubscribe();
  }, []);

  // Articles Listener
  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article)));
    });
    return () => unsubscribe();
  }, []);

  // Featured Listener
  useEffect(() => {
    const q = query(collection(db, 'featured'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFeaturedItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedItem)));
    });
    return () => unsubscribe();
  }, []);

  return { comics, articles, featuredItems };
}
