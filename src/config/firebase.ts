import { initializeApp } from "firebase/app";
import { getDatabase, ref } from "firebase/database";
import { push } from "firebase/database";

// Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDSbGHZQ4aXuimNk-z-csKA3dwdmrmIWqc",
  authDomain: "chromeos-whiteboard.firebaseapp.com",
  projectId: "chromeos-whiteboard",
  storageBucket: "chromeos-whiteboard.appspot.com",
  messagingSenderId: "508698240586",
  appId: "1:508698240586:web:8cc208d832367540b6a8b3",
  measurementId: "G-YR2H37JZW0",
  databaseURL:  "https://chromeos-whiteboard-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const db = getDatabase(app)

const whiteboardsRef = ref(db, "whiteboards");
export const newWhiteboardId = push(whiteboardsRef).key;

// TODO: create a way to generate unique whiteboard IDs on-demand
// For now, let's always use the same "default" ID
export const whiteboardRef = ref(db, `whiteboards/${newWhiteboardId}/strokes`);
export const shapesRef = ref(db, `whiteboards/${newWhiteboardId}/shapes`);
export const lastClearedRef = ref(db, `whiteboards/${newWhiteboardId}/lastCleared`);
// export const textRef = ref(db, `whiteboards/${newWhiteboardId}/texts`);


