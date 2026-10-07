'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Download, FolderOpen, RotateCcw } from 'lucide-react';
import { saveBlob } from '@/lib/experience/download';
import { MAX_PLAN_BACKUP_BYTES, planBackupFilename, readPlanBackup, writePlanBackup, type PlanBackup } from '@/lib/experience/plan-backup';

export function PlanFiles({draft,onImport,onNew,setMessage,setError,busy=false,variant='experience'}:{
  draft:PlanBackup;onImport:(value:PlanBackup)=>void;onNew:()=>void;setMessage:(value:string)=>void;setError:(value:string)=>void;busy?:boolean;variant?:'experience'|'live';
}) {
  const input=useRef<HTMLInputElement>(null), task=useRef(0);
  const [loading,setLoading]=useState(false);
  useEffect(()=>()=>{task.current++;},[]);
  const canSave=!!draft.result||draft.skipped.length>0||draft.answers.some(value=>value.trim())||Object.entries(draft.basics).some(([key,value])=>key!=='type'&&value.trim());
  const button=variant==='live'?'lp-mute':'exp-secondary-button';
  function save() {
    setMessage('');setError('');
    try {saveBlob(planBackupFilename(draft.basics.type),new Blob([writePlanBackup(draft)],{type:'text/markdown;charset=utf-8'}));setMessage('MD 파일을 저장했어요. 새로 시작한 뒤 ‘MD 불러오기’로 다시 이어서 작성할 수 있습니다.');}
    catch(cause){setError(cause instanceof Error?cause.message:'MD 파일을 저장하지 못했어요.');}
  }
  async function load(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    const current=++task.current;setLoading(true);setMessage('');setError('');
    try {
      if(!/\.md$/i.test(file.name))throw new Error('이 앱에서 저장한 MD 파일을 선택해 주세요.');
      if(file.size>MAX_PLAN_BACKUP_BYTES)throw new Error('MD 파일은 1MB 이하로 선택해 주세요.');
      const backup=readPlanBackup(await file.text());
      if(current!==task.current)return;
      onImport(backup);setMessage('MD 파일에서 답변과 계획서를 불러왔어요. 내용을 확인하고 이어서 작성해 주세요.');
    }catch(cause){if(current===task.current)setError(cause instanceof Error?cause.message:'MD 파일을 읽지 못했어요.');}
    finally{if(current===task.current)setLoading(false);}
  }
  return <section className={variant==='live'?'lp-plan-files':'exp-plan-files'} aria-label="계획서 저장과 새로 시작">
    <div><button className={button} disabled={!canSave||loading} onClick={save}><Download size={17}/> MD로 저장</button><button className={button} disabled={busy||loading} onClick={()=>input.current?.click()}><FolderOpen size={17}/> {loading?'불러오는 중':'MD 불러오기'}</button><button className={button} disabled={loading} onClick={onNew}><RotateCcw size={17}/> 새 계획서 시작</button></div>
    <input ref={input} type="file" accept=".md,text/markdown,text/plain" hidden aria-label="MD 파일 선택" onChange={load}/>
    <p>입력한 답변과 수정한 결과를 파일로 저장하세요. 새로 시작한 뒤에는 저장한 MD 파일로 다시 불러올 수 있어요.</p>
  </section>;
}
