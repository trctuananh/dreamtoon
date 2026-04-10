export interface Chapter {
  id: string;
  comicId: string;
  authorUid?: string;
  number: number;
  title: string;
  thumbnail?: string;
  images?: string[]; // Made optional, will be in subcollection for large chapters
  genre?: string;
  uploadDate: string;
  views?: number;
  createdAt?: any;
}

export interface ChapterPage {
  id: string;
  chapterId: string;
  comicId: string;
  imageUrl: string;
  order: number;
}

export interface Comic {
  id: string;
  title: string;
  authorName: string;
  authorUid: string;
  authorPhoto?: string;
  authorPioneerNumber?: number;
  genre: string[];
  tags: string[];
  description: string;
  thumbnail: string;
  banner?: string;
  rating: number;
  ratingCount?: number;
  views: number;
  chapterCount?: number;
  chapters?: Chapter[];
  createdAt?: any;
  updatedAt?: any;
}

export type View = 'home' | 'explore' | 'detail' | 'reader' | 'upload' | 'add-chapter' | 'edit-chapter' | 'article' | 'create-article' | 'manage-featured' | 'profile' | 'public-profile' | 'edit-comic' | 'my-wall' | 'community' | 'artist-wall' | 'notifications' | 'support' | 'admin-users' | 'privacy' | 'messenger';

export interface Conversation {
  id: string;
  participants: string[];
  participantProfiles?: { [uid: string]: { displayName: string, photoURL: string } };
  lastMessage?: string;
  lastMessageAt?: any;
  unreadCount?: { [uid: string]: number };
  updatedAt: any;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: any;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  type: 'like' | 'comment' | 'follow' | 'new_chapter' | 'commission';
  targetId: string;
  targetTitle?: string;
  content?: string;
  read: boolean;
  createdAt: any;
}

export interface ReadingHistory {
  comicId: string;
  chapterId: string;
  chapterNumber: number;
  lastRead: any;
}

export interface Article {
  id: string;
  title: string;
  content: string; // Markdown supported
  authorName: string;
  authorUid: string;
  authorPhoto?: string;
  banner?: string;
  views: number;
  createdAt: any;
}

export interface FeaturedItem {
  id: string;
  title: string;
  description?: string;
  banner?: string;
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
  banned?: boolean;
  pioneerNumber?: number;
  donateInfo?: { text: string; imageUrl: string };
  commissionInfo?: { text: string; imageUrl: string };
  createdAt?: any;
}

export interface CommissionRequest {
  id: string;
  artistUid: string;
  guestUid: string;
  guestName: string;
  guestEmail: string;
  requestDetails: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: any;
}

export interface Comment {
  id: string;
  uid: string; // Changed from userId to uid to match usage
  userName: string;
  userPhoto: string;
  userPioneerNumber?: number;
  chapterId: string;
  comicId: string;
  content: string; // Changed from text to content to match usage
  parentId?: string;
  replyTo?: string;
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

export interface PostComment {
  id: string;
  postId: string;
  uid: string;
  userName: string;
  userPhoto: string;
  userPioneerNumber?: number;
  content: string;
  createdAt: any;
}

export interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  authorPioneerNumber?: number;
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
