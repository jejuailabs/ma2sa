'use client';
import { LIVE_DRAFT_KEY, readLiveDraft, type InterviewDraft } from '@/lib/experience/live-plan';
let memory: string | null = null;
const event = 'ma2sa-live-draft';
export function liveSnapshot() { try { return localStorage.getItem(LIVE_DRAFT_KEY) || memory; } catch { return memory; } }
export const liveServerSnapshot = () => null;
export const liveReady = () => true;
export const liveServerReady = () => false;
export function subscribeLive(listener: () => void) { window.addEventListener(event, listener); window.addEventListener('storage', listener); return () => { window.removeEventListener(event, listener); window.removeEventListener('storage', listener); }; }
export function currentLiveDraft() { return readLiveDraft(liveSnapshot()); }
export function updateLiveDraft(update: (draft: InterviewDraft) => InterviewDraft) { memory = JSON.stringify({ ...update(currentLiveDraft()), expires: Date.now() + 86400000 }); try { localStorage.setItem(LIVE_DRAFT_KEY, memory); } catch {} window.dispatchEvent(new Event(event)); }
