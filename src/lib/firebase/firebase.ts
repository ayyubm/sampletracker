import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfigProd = {
  apiKey: "AIzaSyD13_2gMtG004kNYkfY3pqWO0ZkriogmWU",
  authDomain: "texport-sample-tracker-prod.firebaseapp.com",
  projectId: "texport-sample-tracker-prod",
  storageBucket: "texport-sample-tracker-prod.appspot.com",
  messagingSenderId: "1063090107928",
  appId: "1:1063090107928:web:defb2e8ae27dc67cf9356d",
};

const firebaseConfigDev = {
  apiKey: "AIzaSyDScKVSe8z0iUOEGNMGciZO2YiEkqJBDfc",
  authDomain: "texport-sample-tracker.firebaseapp.com",
  projectId: "texport-sample-tracker",
  storageBucket: "texport-sample-tracker.appspot.com",
  messagingSenderId: "984030524709",
  appId: "1:984030524709:web:aebd66d2b1cd0cf66e16cc",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfigProd);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
