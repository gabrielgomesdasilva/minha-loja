
// Configuração do Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA6y5YJrUnA2VPbD3UQ-6ggSdFAz-fbOP0",
  authDomain: "gmstyle-60488.firebaseapp.com",
  projectId: "gmstyle-60488",
  storageBucket: "gmstyle-60488.firebasestorage.app",
  messagingSenderId: "910070434302",
  appId: "1:910070434302:web:6ace32f8f58da00a2958af",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);