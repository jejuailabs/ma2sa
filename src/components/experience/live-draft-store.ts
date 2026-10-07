'use client';
import { LIVE_DRAFT_KEY, readLiveDraft, type InterviewDraft } from '@/lib/experience/live-plan';
let memory: string | null = null;
let memoryOnly = false;
const event = 'ma2sa-live-draft';
export function liveSnapshot() { if(memoryOnly)return memory;try { return localStorage.getItem(LIVE_DRAFT_KEY) || memory; } catch { return memory; } }
export const liveServerSnapshot = () => null;
export const liveReady = () => true;
export const liveServerReady = () => false;
export function subscribeLive(listener: () => void) { const external=(change:StorageEvent)=>{if(change.key!==LIVE_DRAFT_KEY&&change.key!==null)return;memory=null;memoryOnly=false;listener();};window.addEventListener(event, listener); window.addEventListener('storage', external); return () => { window.removeEventListener(event, listener); window.removeEventListener('storage', external); }; }
export function currentLiveDraft() { return readLiveDraft(liveSnapshot()); }
export function updateLiveDraft(update: (draft: InterviewDraft) => InterviewDraft) { memory = JSON.stringify({ ...update(currentLiveDraft()), expires: Date.now() + 86400000 }); try { localStorage.setItem(LIVE_DRAFT_KEY, memory);memoryOnly=false; } catch {memoryOnly=true;} window.dispatchEvent(new Event(event)); }
export function clearLiveDraft(){memory=null;try{localStorage.removeItem(LIVE_DRAFT_KEY);memoryOnly=false;}catch{memoryOnly=true;}window.dispatchEvent(new Event(event));}
