import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { storage } from './config';

export async function uploadFile(
  path: string,
  file: File
): Promise<string> {
  if (!storage) throw new Error('Firebase not initialized');
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function getFileURL(path: string): Promise<string> {
  if (!storage) throw new Error('Firebase not initialized');
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

export async function listFiles(path: string): Promise<string[]> {
  if (!storage) return [];
  const storageRef = ref(storage, path);
  const result = await listAll(storageRef);
  const urls = await Promise.all(result.items.map((item) => getDownloadURL(item)));
  return urls;
}

export async function deleteFile(path: string): Promise<void> {
  if (!storage) throw new Error('Firebase가 설정되지 않았습니다.');
  await deleteObject(ref(storage, path));
}
