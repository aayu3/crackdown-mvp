// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8S-p6bxNluoG7W9AVjij2-xxwT8KNfyE",
  authDomain: "crackdown-mvp.firebaseapp.com",
  projectId: "crackdown-mvp",
  storageBucket: "crackdown-mvp.firebasestorage.app",
  messagingSenderId: "623967109762",
  appId: "1:623967109762:web:4f782b8ce2961c1b9dea9b",
  measurementId: "G-VT85MHX3VN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
//const analytics = getAnalytics(app);