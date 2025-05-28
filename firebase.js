// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBJhFAuqErsrHkalRcDF6wWVYHrDHHgu4M",
  authDomain: "lhnutri-51910.firebaseapp.com",
  projectId: "lhnutri-51910",
  storageBucket: "lhnutri-51910.appspot.com",
  messagingSenderId: "669244125423",
  appId: "1:669244125423:web:18e1242cf3b25f0d46ab1a",
  measurementId: "G-9EVQ8NQB98"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
