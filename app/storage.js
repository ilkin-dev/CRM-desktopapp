// ============================================================
// Firebase Storage access layer — client document uploads.
// Path convention: clients/{ownerUid}/{clientId}/{category}/{timestamp}_{filename}
// Storage itself is the source of truth for what documents exist
// (no separate Firestore bookkeeping needed) — we just list the
// folder per client and derive category from the path.
// ============================================================
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app, getUid } from "./firebase-init.js";

const storage = getStorage(app);

export const DOCUMENT_CATEGORIES = [
  "Driver's License",
  "Vehicle Photo",
  "Bill of Sale",
  "Finance Application",
  "Proof of Insurance",
  "Other",
];

function slug(str) {
  return String(str).replace(/[^a-zA-Z0-9]+/g, "-");
}

export async function uploadClientDocument(clientId, category, file) {
  const uid = getUid();
  const path = `clients/${uid}/${clientId}/${slug(category)}/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { customMetadata: { category, originalName: file.name } });
  return path;
}

export async function listClientDocuments(clientId) {
  const uid = getUid();
  const baseRef = ref(storage, `clients/${uid}/${clientId}`);
  let categoryFolders;
  try {
    const top = await listAll(baseRef);
    categoryFolders = top.prefixes;
  } catch (err) {
    return []; // no documents yet / folder doesn't exist
  }

  const allFiles = [];
  for (const folderRef of categoryFolders) {
    const listing = await listAll(folderRef);
    for (const itemRef of listing.items) {
      const [url, meta] = await Promise.all([getDownloadURL(itemRef), getMetadata(itemRef)]);
      allFiles.push({
        path: itemRef.fullPath,
        name: (meta.customMetadata && meta.customMetadata.originalName) || itemRef.name,
        category: (meta.customMetadata && meta.customMetadata.category) || folderRef.name,
        url,
        contentType: meta.contentType || "",
        uploadedAt: meta.timeCreated,
      });
    }
  }
  allFiles.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
  return allFiles;
}

export async function deleteClientDocument(path) {
  const fileRef = ref(storage, path);
  return deleteObject(fileRef);
}
