import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, addDoc, serverTimestamp, Timestamp, orderBy, updateDoc, getDocFromServer } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}
testConnection();

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function createNotification({
  recipientId,
  type,
  targetId,
  targetTitle,
  content,
  senderId,
  senderName,
  senderPhoto
}: {
  recipientId: string;
  type: 'like' | 'comment' | 'follow' | 'new_chapter' | 'commission' | 'donation';
  targetId: string;
  targetTitle?: string;
  content?: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
}) {
  if (senderId === recipientId) return;

  try {
    console.log(`Creating notification for ${recipientId}: ${type} from ${senderName}`);
    const notificationData: any = {
      recipientId,
      senderId,
      senderName,
      senderPhoto,
      type,
      targetId,
      read: false,
      createdAt: serverTimestamp()
    };

    if (targetTitle !== undefined) notificationData.targetTitle = targetTitle;
    if (content !== undefined) notificationData.content = content;

    await addDoc(collection(db, 'users', recipientId, 'notifications'), notificationData);
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}
