export interface Chapter {
  id: string;
  comicId: string;
  authorUid?: string;
  number: number;
  title: string;
  images: string[];
  uploadDate: string;
  views?: number;
  createdAt?: any;
}

export interface Comic {
  id: string;
  title: string;
  authorName: string;
  authorUid: string;
  genre: string[];
  tags: string[];
  description: string;
  thumbnail: string;
  banner: string;
  rating: number;
  ratingCount?: number;
  views: number;
  chapters?: Chapter[];
  createdAt?: any;
}

export type View = 'home' | 'explore' | 'detail' | 'reader' | 'upload' | 'add-chapter' | 'edit-chapter' | 'article' | 'create-article' | 'manage-featured' | 'profile' | 'edit-comic' | 'my-wall' | 'community' | 'artist-wall';

export interface Article {
  id: string;
  title: string;
  content: string; // Markdown supported
  authorName: string;
  authorUid: string;
  banner: string;
  views: number;
  createdAt: any;
}

export interface FeaturedItem {
  id: string;
  title: string;
  description?: string;
  banner: string;
  type: 'comic' | 'article' | 'external';
  targetId?: string;
  externalUrl?: string;
  genre?: string[];
  createdAt: any;
}

export type Genre = 'Action' | 'Romance' | 'Comedy' | 'Fantasy' | 'Horror' | 'Slice of Life' | 'Drama' | 'Sci-Fi' | 'Thriller' | 'all' | 'action' | 'romance' | 'comedy' | 'drama' | 'fantasy' | 'horror' | 'sciFi' | 'sliceOfLife' | 'thriller';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio?: string;
  handle?: string;
  role?: 'admin' | 'user';
  donateInfo?: { text: string; imageUrl: string };
  commissionInfo?: { text: string; imageUrl: string };
  createdAt?: any;
}

export interface Comment {
  id: string;
  uid: string; // Changed from userId to uid to match usage
  userName: string;
  userPhoto: string;
  chapterId: string;
  comicId: string;
  content: string; // Changed from text to content to match usage
  createdAt: any;
}

export interface Like {
  id: string;
  userId: string;
  targetId: string; // Added targetId to match usage
  chapterId: string;
  comicId: string;
  createdAt: any;
}

export interface Rating {
  id: string;
  userId: string;
  comicId: string;
  score: number; // 1-5
  createdAt: any;
}

export interface Following {
  id: string;
  userId: string;
  targetId: string;
  type: 'artist' | 'comic';
  createdAt: any;
}

export interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  imageUrl?: string;
  type: 'twit' | 'sketch' | 'donate' | 'commission';
  likes: number;
  comments: number;
  createdAt: any;
}
