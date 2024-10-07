import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Firestore functions
export const addDocument = async (collectionName: string, data: any) => {
  const docRef = await addDoc(collection(db, collectionName), data);
  return docRef.id;
};

export const getDocuments = async <T>(collectionName: string): Promise<T[]> => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as T),
  }));
};

export const updateDocument = async (
  collection: string,
  id: string,
  data: any,
) => {
  const docRef = doc(db, collection, id);
  await setDoc(docRef, data, { merge: true });
};

export const deleteDocument = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const getDocument = async (
  collectionName: string,
  documentId: string,
) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("No such document!");
    }
  } catch (error) {
    console.error("Error getting document:", error);
    throw error;
  }
};

interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
}

export async function createUser(userData: UserData, adminUser: any) {
  const { email, password, firstName, lastName, isAdmin } = userData;

  // Store the current user
  const currentUser = auth.currentUser;

  try {
    // Sign out the current user temporarily
    if (currentUser) await auth.signOut();

    // Create the new user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const newUser = userCredential.user;

    // Update the new user's profile
    await updateProfile(newUser, {
      displayName: `${firstName} ${lastName}`,
    });

    // Store additional user data in Firestore
    await setDoc(doc(db, "users", newUser.uid), {
      firstName,
      lastName,
      email,
      isAdmin: isAdmin || false,
    });

    // Sign out the new user
    await auth.signOut();

    // Sign the admin back in if there was a user before
    if (currentUser && adminUser) {
      await signInWithEmailAndPassword(
        auth,
        adminUser.email,
        adminUser.password,
      );
    }

    return { uid: newUser.uid, email: newUser.email };
  } catch (error) {
    // If any error occurs, ensure we sign the admin back in
    if (currentUser && adminUser) {
      await signInWithEmailAndPassword(
        auth,
        adminUser.email,
        adminUser.password,
      );
    }
    throw error;
  }
}
