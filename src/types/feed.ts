export type PostType = 'news' | 'event' | 'product';

export interface Post {
  id: string;
  villageId: string;
  villageName: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  type: PostType;
  title: string;
  content: string;
  images: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  content: string;
  createdAt: Date;
}

export type DocumentType = 'announcement' | 'receipt' | 'formatted' | 'minutes' | 'narration' | 'photo';

export interface VillageDocument {
  id: string;
  villageId: string;
  type: DocumentType;
  title: string;
  description: string;
  fileURL: string;
  thumbnailURL: string;
  fileSize: number;
  mimeType: string;
  createdBy: string;
  createdAt: Date;
  aiGenerated: boolean;
  metadata: Record<string, unknown>;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  assignedTo: string;
  createdBy: string;
  createdAt: Date;
  dueDate: Date | null;
}

export interface Finance {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  receiptURL: string | null;
  date: Date;
  createdBy: string;
  createdAt: Date;
}

export interface DashboardStats {
  news: number;
  events: number;
  meetings: number;
  members: number;
  todos: number;
  balance: number;
}

export type AITaskType = 'announcement' | 'receipt' | 'format' | 'transcribe' | 'narration';

export interface AITask {
  id: string;
  villageId: string;
  type: AITaskType;
  title: string;
  inputText: string;
  inputImages: string[];
  outputText: string;
  outputData: unknown;
  createdBy: string;
  createdAt: Date;
}
