'use client';
import { blankBasics, planQuestions, type PlanBasics,type PlanResult } from '@/lib/experience/catalog';
import type { PlanBackup } from '@/lib/experience/plan-backup';
export type ExperienceDraft={version:1;expires:number;step:number;basics:PlanBasics;answers:string[];result:PlanResult|null;skipped?:PlanBackup['skipped']};
const key='ma2sa-experience-plan-v1';
const changed='ma2sa-experience-draft-changed';
let memory:string|null=null;
let memoryOnly=false;
let revision=0;
export const draftRevision=()=>revision;
export const emptyDraft:ExperienceDraft={version:1,expires:0,step:0,basics:blankBasics,answers:Array(8).fill(''),result:null};
export function draftSnapshot(){if(memoryOnly)return memory;try{return localStorage.getItem(key)||memory;}catch{return memory;}}
export const serverDraftSnapshot=()=>null;
export function subscribeDraft(listener:()=>void){const external=(event:StorageEvent)=>{if(event.key!==key&&event.key!==null)return;memory=null;memoryOnly=false;revision++;listener();};window.addEventListener(changed,listener);window.addEventListener('storage',external);return()=>{window.removeEventListener(changed,listener);window.removeEventListener('storage',external);};}
export function readDraft(raw:string|null):ExperienceDraft{try{const draft=raw?JSON.parse(raw):null;if(draft?.version===1&&draft.expires>Date.now()&&Array.isArray(draft.answers)&&draft.answers.length===8&&draft.answers.every((answer:unknown)=>typeof answer==='string')&&draft.basics&&['community','happiness'].includes(draft.basics.type)){const basics={...blankBasics};for(const field of Object.keys(basics)as(keyof PlanBasics)[]){if(field==='type')basics.type=draft.basics.type;else basics[field]=typeof draft.basics[field]==='string'?draft.basics[field]:'';}const result=draft.result?.sections&&typeof draft.result.title==='string'&&Object.values(draft.result.sections).every(value=>typeof value==='string')?draft.result:null;return{version:1,expires:draft.expires,step:Math.max(0,Math.min(9,Number(draft.step)||0)),basics,answers:draft.answers,result,skipped:Array.isArray(draft.skipped)?draft.skipped.filter((key:unknown)=>planQuestions.some(q=>q.key===key)):[]};}}catch{}return emptyDraft;}
export function updateDraft(update:(current:ExperienceDraft)=>ExperienceDraft){const next=update(readDraft(draftSnapshot()));revision++;memory=JSON.stringify({...next,version:1,expires:Date.now()+86400000});try{localStorage.setItem(key,memory);memoryOnly=false;}catch{memoryOnly=true;}window.dispatchEvent(new Event(changed));}
export function clearDraft(){revision++;memory=null;try{localStorage.removeItem(key);memoryOnly=false;}catch{memoryOnly=true;}window.dispatchEvent(new Event(changed));}
export const clientReady=()=>true;
export const serverReady=()=>false;
