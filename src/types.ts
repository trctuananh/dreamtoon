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
  authorPhoto?: string;
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

export type View = 'home' | 'explore' | 'detail' | 'reader' | 'upload' | 'add-chapter' | 'edit-chapter' | 'article' | 'create-article' | 'manage-featured' | 'profile' | 'edit-comic' | 'my-wall' | 'community' | 'artist-wall' | 'notifications' | 'support';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  type: 'like' | 'comment' | 'follow' | 'new_chapter';
  targetId: string;
  targetTitle?: string;
  read: boolean;
  createdAt: any;
}

export interface Article {
  id: string;
  title: string;
  content: string; // Markdown supported
  authorName: string;
  authorUid: string;
  authorPhoto?: string;
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
  commissionQuestions?: string[];
  createdAt?: any;
}

export interface CommissionRequest {
  id: string;
  artistUid: string;
  guestUid: string;
  guestName: string;
  guestEmail: string;
  answers: { question: string; answer: string }[];
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: any;
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

export interface Donation {
  id: string;
  artistUid: string;
  donorUid?: string;
  donorName: string;
  message: string;
  amount?: number;
  createdAt: any;
}

export interface CommissionWork {
  id: string;
  artistUid: string;
  title: string;
  clientName?: string;
  status: string;
  progress: number;
  order: number;
  imageUrl?: string;
  updatedAt: any;
}

export interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  imageUrl?: string;
  type: 'twit' | 'sketch' | 'donate' | 'commission';
  commissionId?: string;
  commissionTitle?: string;
  commissionStatus?: string;
  commissionProgress?: number;
  likes: number;
  likedBy?: string[];
  comments: number;
  createdAt: any;
}
