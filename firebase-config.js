// Your Firebase configuration
// Replace these values with your actual Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyDf6B2-_OfhUtPCeOupv21vu8OsIXv5vsE",
    authDomain: "businessmanger.firebaseapp.com",
    projectId: "businessmanger",
    storageBucket: "businessmanger.firebasestorage.app",
    messagingSenderId: "627607310274",
    appId: "1:627607310274:web:a22556fde34946de87105b",
    measurementId: "G-0KGB865BFK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;
let collections = [];
let emis = [];
let currentEMIToUpdate = null;
let collectionChart = null;
let profitChart = null;

// Export for use in other files
window.auth = auth;
window.db = db;