// ============================================================
// Firestore data access layer.
// Collections:
//   clients/{clientId}       — one doc per client
//   interactions/{id}        — calls/quotes/notes, linked via clientId
// Every doc is stamped with ownerUid so Firestore security rules
// can restrict reads/writes to the signed-in user only.
// ============================================================
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app, getUid } from "./firebase-init.js";

const db = getFirestore(app);

export const STATUSES = [
  "New Lead",
  "Quoted",
  "Bound",
  "Active Client",
  "Renewal Due",
  "Referral Source",
  "Lapsed/Lost",
];

// ---------------- Clients ----------------

export async function listClients() {
  const q = query(collection(db, "clients"), where("ownerUid", "==", getUid()));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getClient(id) {
  const ref = doc(db, "clients", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createClient(data) {
  return addDoc(collection(db, "clients"), {
    ...data,
    ownerUid: getUid(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateClient(id, data) {
  const ref = doc(db, "clients", id);
  return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteClient(id) {
  // Also delete related interactions
  const q = query(collection(db, "interactions"), where("clientId", "==", id), where("ownerUid", "==", getUid()));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "interactions", d.id))));
  await deleteDoc(doc(db, "clients", id));
}

// ---------------- Interactions ----------------

export async function listInteractionsForClient(clientId) {
  const q = query(
    collection(db, "interactions"),
    where("ownerUid", "==", getUid()),
    where("clientId", "==", clientId)
  );
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return items;
}

export async function listAllInteractions() {
  const q = query(collection(db, "interactions"), where("ownerUid", "==", getUid()));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createInteraction(data) {
  return addDoc(collection(db, "interactions"), {
    ...data,
    ownerUid: getUid(),
    createdAt: serverTimestamp(),
  });
}

// ---------------- Tasks (standalone, optionally linked to a client) ----------------

export async function listTasks() {
  const q = query(collection(db, "tasks"), where("ownerUid", "==", getUid()));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createTask(data) {
  return addDoc(collection(db, "tasks"), {
    ...data,
    done: false,
    ownerUid: getUid(),
    createdAt: serverTimestamp(),
  });
}

export async function updateTask(id, data) {
  const ref = doc(db, "tasks", id);
  return updateDoc(ref, data);
}

export async function deleteTask(id) {
  return deleteDoc(doc(db, "tasks", id));
}
