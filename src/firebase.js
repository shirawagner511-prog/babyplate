import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBAIz97UICGfLwQu1alIwdcmflRK0LWPB4",
  authDomain: "babyplate-8e08b.firebaseapp.com",
  projectId: "babyplate-8e08b",
  storageBucket: "babyplate-8e08b.firebasestorage.app",
  messagingSenderId: "83741216266",
  appId: "1:83741216266:web:5e96df4d1ca516d6c1d9f3",
  measurementId: "G-1S2LVWJ766"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

const googleProvider = new GoogleAuthProvider()

// ─── AUTH ──────────────────────────────────────────────────────────────────────
export function signInGoogle() {
  return signInWithRedirect(auth, googleProvider)
}

export function getGoogleRedirectResult() {
  return getRedirectResult(auth)
}

export function signInEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function signUpEmail(email, password, displayName) {
  return createUserWithEmailAndPassword(auth, email, password).then(cred => {
    return updateProfile(cred.user, { displayName }).then(() => cred)
  })
}

export function signOutUser() {
  return signOut(auth)
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb)
}

// ─── FAMILY HELPERS ────────────────────────────────────────────────────────────
function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function createFamily(userId, familyName) {
  const familyId = `fam_${userId.slice(0, 8)}_${Date.now()}`
  const inviteCode = generateCode()
  const familyRef = doc(db, 'families', familyId)
  await setDoc(familyRef, {
    name: familyName,
    inviteCode,
    members: [userId],
    weekPlan: {},
    mealLibrary: [],
    customRecipes: {},
    createdAt: serverTimestamp(),
  })
  const userRef = doc(db, 'users', userId)
  await setDoc(userRef, { familyId, createdAt: serverTimestamp() }, { merge: true })
  return { familyId, inviteCode }
}

export async function joinFamily(userId, inviteCode) {
  const q = query(collection(db, 'families'), where('inviteCode', '==', inviteCode.trim().toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) throw new Error('קוד הזמנה לא נמצא')
  const familyDoc = snap.docs[0]
  const familyId = familyDoc.id
  const members = familyDoc.data().members || []
  if (!members.includes(userId)) {
    await updateDoc(doc(db, 'families', familyId), { members: [...members, userId] })
  }
  await setDoc(doc(db, 'users', userId), { familyId }, { merge: true })
  return familyId
}

export async function getUserFamilyId(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? snap.data().familyId : null
}

// ─── FAMILY DATA ───────────────────────────────────────────────────────────────
export function subscribeFamily(familyId, cb) {
  return onSnapshot(doc(db, 'families', familyId), snap => {
    if (snap.exists()) cb(snap.data())
  })
}

export async function saveFamilyData(familyId, data) {
  await updateDoc(doc(db, 'families', familyId), data)
}

export async function initFamilyData(familyId, data) {
  await updateDoc(doc(db, 'families', familyId), data)
}
