//firebase.web.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
apiKey: "AIzaSyDnobR66SdHkV5eKJcs4Pb6KmgJT3brO8o",
authDomain: "uchimo-a2264.firebaseapp.com",
databaseURL: "https://uchimo-a2264-default-rtdb.firebaseio.com",
projectId: "uchimo-a2264",
storageBucket: "uchimo-a2264.appspot.com",
messagingSenderId: "436122100392",
appId: "1:436122100392:web:688277e1717981f97f989d",
measurementId: "G-C6JPX7YZPP",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

