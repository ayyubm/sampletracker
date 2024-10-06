"use client";

import React, { createContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  team: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  updateUserData: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        } else {
          // If the user document doesn't exist, create it
          const newUserData: UserData = {
            email: user.email || '',
            firstName: '',
            lastName: '',
            team: '',
            isAdmin: false,
          };
          await setDoc(doc(db, "users", user.uid), newUserData);
          setUserData(newUserData);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in", error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  const updateUserData = async (data: Partial<UserData>) => {
    if (user) {
      const db = getFirestore();
      await setDoc(doc(db, "users", user.uid), data, { merge: true });
      setUserData((prev) => ({ ...prev, ...data } as UserData));
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signIn, signOut: signOutUser, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
