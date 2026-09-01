import {
  addDoc, collection, collectionGroup, deleteDoc, doc, getCountFromServer, getDoc, getDocs,
  increment, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc,
  startAfter, updateDoc, where, writeBatch,
  type DocumentData, type DocumentSnapshot, type QueryConstraint, type Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import type { AITask, AITaskType, DashboardStats, DocumentType, Finance, Post, PostType, Todo, VillageDocument } from '@/types/feed';
import type { UserRole } from '@/types/user';
import type { Village } from '@/types/village';

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as Timestamp).toDate === 'function') return (value as Timestamp).toDate();
  return new Date();
}

function mapPost(snapshot: DocumentSnapshot<DocumentData>): Post {
  const data = snapshot.data() ?? {};
  return { ...data, id: snapshot.id, createdAt: asDate(data.createdAt), updatedAt: asDate(data.updatedAt) } as Post;
}

function mapTodo(snapshot: DocumentSnapshot<DocumentData>): Todo {
  const data = snapshot.data() ?? {};
  return { ...data, id: snapshot.id, createdAt: asDate(data.createdAt), dueDate: data.dueDate ? asDate(data.dueDate) : null } as Todo;
}

function mapDocument(snapshot: DocumentSnapshot<DocumentData>): VillageDocument {
  const data = snapshot.data() ?? {};
  return { ...data, id: snapshot.id, createdAt: asDate(data.createdAt) } as VillageDocument;
}

export async function getPublicPosts(postType?: PostType, lastDoc?: DocumentSnapshot, pageSize = 10) {
  if (!db) return { posts: [] as Post[], lastDoc: null as DocumentSnapshot | null };
  const constraints: QueryConstraint[] = [where('isPublic', '==', true), orderBy('createdAt', 'desc'), limit(pageSize)];
  if (postType) constraints.unshift(where('type', '==', postType));
  if (lastDoc) constraints.push(startAfter(lastDoc));
  const snapshot = await getDocs(query(collectionGroup(db, 'posts'), ...constraints));
  return { posts: snapshot.docs.map(mapPost), lastDoc: snapshot.docs.at(-1) ?? null };
}

export async function getVillagePosts(villageId: string, postType?: PostType, pageSize = 30): Promise<Post[]> {
  if (!db) return [];
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(pageSize)];
  if (postType) constraints.unshift(where('type', '==', postType));
  const snapshot = await getDocs(query(collection(db, 'villages', villageId, 'posts'), ...constraints));
  return snapshot.docs.map(mapPost);
}

export async function createPost(villageId: string, data: Omit<Post, 'id' | 'villageId' | 'createdAt' | 'updatedAt' | 'likeCount' | 'commentCount' | 'shareCount'>) {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  const ref = await addDoc(collection(db, 'villages', villageId, 'posts'), {
    ...data, villageId, likeCount: 0, commentCount: 0, shareCount: 0,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function togglePostLike(villageId: string, postId: string, uid: string): Promise<boolean> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  const postRef = doc(db, 'villages', villageId, 'posts', postId);
  const likeRef = doc(db, 'villages', villageId, 'posts', postId, 'likes', uid);
  return runTransaction(db, async (transaction) => {
    const like = await transaction.get(likeRef);
    if (like.exists()) {
      transaction.delete(likeRef);
      transaction.update(postRef, { likeCount: increment(-1) });
      return false;
    }
    transaction.set(likeRef, { userId: uid, createdAt: serverTimestamp() });
    transaction.update(postRef, { likeCount: increment(1) });
    return true;
  });
}

export async function searchVillages(searchQuery: string): Promise<Village[]> {
  if (!db || searchQuery.trim().length < 2) return [];
  const name = searchQuery.trim();
  const snapshot = await getDocs(query(collection(db, 'villages'), where('name', '>=', name), where('name', '<=', `${name}\uf8ff`), limit(10)));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id, createdAt: asDate(item.data().createdAt) }) as Village);
}

export async function createVillage(data: Omit<Village, 'id' | 'createdAt' | 'memberCount'>, uid: string): Promise<string> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  const userSnap = await getDoc(doc(db, 'users', uid));
  const userData = userSnap.data() ?? {};
  const villageRef = doc(collection(db, 'villages'));
  const batch = writeBatch(db);
  batch.set(villageRef, { ...data, createdBy: uid, memberCount: 1, createdAt: serverTimestamp() });
  batch.set(doc(db, 'villages', villageRef.id, 'members', uid), {
    uid, role: 'leader', status: 'active', joinedAt: serverTimestamp(),
    displayName: userData.displayName || '', email: userData.email || '', photoURL: userData.photoURL || '',
  });
  batch.update(doc(db, 'users', uid), { villageId: villageRef.id, role: 'leader' });
  await batch.commit();
  return villageRef.id;
}

export async function joinVillage(villageId: string, uid: string): Promise<'active' | 'pending'> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  const villageRef = doc(db, 'villages', villageId);
  const village = await getDoc(villageRef);
  if (!village.exists()) throw new Error('마을을 찾을 수 없습니다.');
  const status = village.data().settings?.requireApproval ? 'pending' : 'active';
  const userSnap = await getDoc(doc(db, 'users', uid));
  const userData = userSnap.data() ?? {};
  const batch = writeBatch(db);
  batch.set(doc(db, 'villages', villageId, 'members', uid), {
    uid, role: 'member', status, joinedAt: serverTimestamp(),
    displayName: userData.displayName || '', email: userData.email || '', photoURL: userData.photoURL || '',
  });
  if (status === 'active') {
    batch.update(doc(db, 'users', uid), { villageId, role: 'member' });
    batch.update(villageRef, { memberCount: increment(1) });
  }
  await batch.commit();
  return status;
}

export async function getVillage(villageId: string): Promise<Village | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, 'villages', villageId));
  return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id, createdAt: asDate(snapshot.data().createdAt) } as Village) : null;
}

export async function updateUserVillage(uid: string, villageId: string, role: UserRole): Promise<void> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  await updateDoc(doc(db, 'users', uid), { villageId, role });
}

export function subscribeTodos(villageId: string, callback: (todos: Todo[]) => void): Unsubscribe {
  if (!db) { callback([]); return () => undefined; }
  return onSnapshot(query(collection(db, 'villages', villageId, 'todos'), orderBy('createdAt', 'asc')), (snapshot) => callback(snapshot.docs.map(mapTodo)));
}

export async function addTodo(villageId: string, title: string, createdBy: string, dueDate: Date | null = null): Promise<string> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  const ref = await addDoc(collection(db, 'villages', villageId, 'todos'), { title, completed: false, assignedTo: createdBy, createdBy, createdAt: serverTimestamp(), dueDate });
  return ref.id;
}

export async function toggleTodo(villageId: string, todoId: string, completed: boolean) {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  await updateDoc(doc(db, 'villages', villageId, 'todos', todoId), { completed });
}

export async function deleteTodo(villageId: string, todoId: string) {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  await deleteDoc(doc(db, 'villages', villageId, 'todos', todoId));
}

export async function listVillageDocuments(villageId: string, type?: DocumentType): Promise<VillageDocument[]> {
  if (!db) return [];
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
  if (type) constraints.unshift(where('type', '==', type));
  const snapshot = await getDocs(query(collection(db, 'villages', villageId, 'documents'), ...constraints));
  return snapshot.docs.map(mapDocument);
}

export async function saveVillageDocument(villageId: string, data: Omit<VillageDocument, 'id' | 'villageId' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  const ref = await addDoc(collection(db, 'villages', villageId, 'documents'), { ...data, villageId, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteVillageDocument(villageId: string, documentId: string) {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  await deleteDoc(doc(db, 'villages', villageId, 'documents', documentId));
}

export async function addFinance(villageId: string, data: Omit<Finance, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  const ref = await addDoc(collection(db, 'villages', villageId, 'finances'), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function getDashboardData(villageId: string): Promise<{ stats: DashboardStats; posts: Post[]; documents: VillageDocument[] }> {
  if (!db) return { stats: { news: 0, events: 0, meetings: 0, members: 0, todos: 0, balance: 0 }, posts: [], documents: [] };
  const postsRef = collection(db, 'villages', villageId, 'posts');
  const todosRef = collection(db, 'villages', villageId, 'todos');
  const docsRef = collection(db, 'villages', villageId, 'documents');
  const [village, news, events, meetings, todos, posts, documents, finances] = await Promise.all([
    getDoc(doc(db, 'villages', villageId)),
    getCountFromServer(query(postsRef, where('type', '==', 'news'))),
    getCountFromServer(query(postsRef, where('type', '==', 'event'))),
    getCountFromServer(collection(db, 'villages', villageId, 'meetings')),
    getCountFromServer(query(todosRef, where('completed', '==', false))),
    getDocs(query(postsRef, orderBy('createdAt', 'desc'), limit(3))),
    getDocs(query(docsRef, orderBy('createdAt', 'desc'), limit(8))),
    getDocs(collection(db, 'villages', villageId, 'finances')),
  ]);
  const balance = finances.docs.reduce((sum, item) => sum + (item.data().type === 'income' ? Number(item.data().amount) : -Number(item.data().amount)), 0);
  return {
    stats: { news: news.data().count, events: events.data().count, meetings: meetings.data().count, members: Number(village.data()?.memberCount ?? 0), todos: todos.data().count, balance },
    posts: posts.docs.map(mapPost), documents: documents.docs.map(mapDocument),
  };
}

export async function saveAIResultAsDocument(villageId: string, uid: string, data: { title: string; summary: string; content: string; documentType: DocumentType; metadata: Record<string, unknown> }) {
  const text = [data.title, '', data.summary, '', data.content].join('\n');
  const fileURL = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  return saveVillageDocument(villageId, { type: data.documentType, title: data.title, description: data.summary, fileURL, thumbnailURL: '', fileSize: new Blob([text]).size, mimeType: 'text/plain', createdBy: uid, aiGenerated: true, metadata: data.metadata });
}

export async function saveAITask(villageId: string, data: Omit<AITask, 'id' | 'villageId' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  const ref = await addDoc(collection(db, 'villages', villageId, 'aiTasks'), { ...data, villageId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateAITask(villageId: string, taskId: string, data: Partial<Omit<AITask, 'id' | 'villageId' | 'createdAt' | 'updatedAt'>>) {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  await updateDoc(doc(db, 'villages', villageId, 'aiTasks', taskId), { ...data, updatedAt: serverTimestamp() });
}

export async function listAITasks(villageId: string, type?: AITaskType): Promise<AITask[]> {
  if (!db) return [];
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(50)];
  if (type) constraints.unshift(where('type', '==', type));
  const snapshot = await getDocs(query(collection(db, 'villages', villageId, 'aiTasks'), ...constraints));
  return snapshot.docs.map((d) => {
    const data = d.data();
    return { ...data, id: d.id, createdAt: asDate(data.createdAt), updatedAt: data.updatedAt ? asDate(data.updatedAt) : undefined } as AITask;
  });
}

export function subscribeAITasks(villageId: string, type: AITaskType | undefined, callback: (tasks: AITask[]) => void, onError?: () => void): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(50)];
  if (type) constraints.unshift(where('type', '==', type));
  return onSnapshot(query(collection(db, 'villages', villageId, 'aiTasks'), ...constraints), (snapshot) => {
    callback(snapshot.docs.map((d) => {
      const data = d.data();
      return { ...data, id: d.id, createdAt: asDate(data.createdAt), updatedAt: data.updatedAt ? asDate(data.updatedAt) : undefined } as AITask;
    }));
  }, onError);
}

export async function deleteAITask(villageId: string, taskId: string) {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  await deleteDoc(doc(db, 'villages', villageId, 'aiTasks', taskId));
}

export async function putUserProfile(uid: string, data: Record<string, unknown>) {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}
