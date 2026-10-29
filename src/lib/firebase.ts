/* The same Firebase project, database paths and rules as before — only the SDK now
   comes from npm. `dbRef(path)` gives the small ref API the app uses everywhere. */
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInAnonymously, signInWithPopup, signOut, GoogleAuthProvider, type User,
} from 'firebase/auth';
import { getDatabase, ref, onValue, update, set, remove, runTransaction, type DatabaseReference } from 'firebase/database';

const FB_CONFIG = {
  apiKey: 'AIzaSyDJepLciAWSd3d8-KahJYBn7JOMx1I0gJc',
  authDomain: 'alamza-scripts.firebaseapp.com',
  databaseURL: 'https://alamza-scripts-default-rtdb.firebaseio.com',
  projectId: 'alamza-scripts',
  storageBucket: 'alamza-scripts.firebasestorage.app',
  messagingSenderId: '914033444889',
  appId: '1:914033444889:web:aa785a95119b7419270288',
};

const app = initializeApp(FB_CONFIG);
export const auth = getAuth(app);
const db = getDatabase(app);

export class Ref {
  private unsub: (() => void) | null = null;
  constructor(public path: string) {}
  private r(): DatabaseReference { return this.path ? ref(db, this.path) : ref(db); }
  on(cb: (v: any) => void, onError?: (e: Error) => void) {
    this.unsub = onValue(this.r(), (s) => cb(s.val()), onError);
    return this;
  }
  off() { if (this.unsub) { this.unsub(); this.unsub = null; } }
  update(v: object) { return update(this.r(), v); }
  set(v: unknown) { return set(this.r(), v); }
  remove() { return remove(this.r()); }
  transaction(fn: (v: any) => any) { return runTransaction(this.r(), fn); }
  child(p: string) { return new Ref(this.path ? this.path + '/' + p : p); }
}
export const dbRef = (path = '') => new Ref(path);

export function watchAuth(cb: (u: User | null) => void) { return onAuthStateChanged(auth, cb); }
export function signInAnon() { return signInAnonymously(auth); }
export function signInGoogle() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, p);
}
export function signOutUser() { return signOut(auth); }
export type { User };
