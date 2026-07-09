// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCBcQR6CiZaDsuQMHPyxyGGOFDTHUGhPoE",
  authDomain: "fazil-d5640.firebaseapp.com",
  projectId: "fazil-d5640",
  storageBucket: "fazil-d5640.firebasestorage.app",
  messagingSenderId: "226954655562",
  appId: "1:226954655562:web:e316c4ce940be22bb173b3"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);