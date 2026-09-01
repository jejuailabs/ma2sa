import type { DocumentType } from './feed';

export type AIFeature = 'announcement' | 'receipt' | 'format' | 'transcribe' | 'narration';

export interface AIResult {
  title: string;
  summary: string;
  content: string;
  documentType: DocumentType;
  metadata: Record<string, unknown>;
  audioBase64?: string;
  audioMimeType?: string;
}
