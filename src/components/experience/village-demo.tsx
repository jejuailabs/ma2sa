'use client';
import Link from 'next/link';
import { useMemo,useState,useSyncExternalStore } from 'react';
import { ArrowRight, Download, FileText } from 'lucide-react';
import { planSectionLabels, villageSections } from '@/lib/experience/catalog';
import { planText,saveBlob } from './plan-wizard';
import { draftSnapshot,serverDraftSnapshot,subscribeDraft,readDraft } from './draft-store';

const schedules=[['12','주민 모임','10월 · 마을회관 · 14:00'],['15','어르신 안부 확인','10월 · 마을 곳곳 · 10:00'],['19','마을 공동 정비','10월 · 회관 앞 · 09:00']];
const ScheduleList=()=> <div className="exp-demo-list">{schedules.map(([date,title,info])=><div key={title}><span className="exp-date-tile">10월<strong>{date}</strong></span><div><strong>{title}</strong><p>{info}</p></div><span>예시</span></div>)}</div>;
const Metrics=()=> <div className="exp-metric-grid">{[['등록 주민','48','명'],['이번 달 일정','3','건'],['마을 소식','12','건'],['사용 가능 자금','250','만원']].map(([label,value,unit])=><div className="exp-metric" key={label}><p>{label}</p><strong>{value}</strong><small>{unit}</small></div>)}</div>;

export function VillageDemo({ section }: {section:string}) {
  const rawDraft=useSyncExternalStore(subscribeDraft,draftSnapshot,serverDraftSnapshot);
  const draft=useMemo(()=>readDraft(rawDraft),[rawDraft]);
  const saved=draft.result?{basics:draft.basics,result:draft.result}:null;
  const [message,setMessage]=useState('');
  const title=villageSections.find(item=>item.slug===section)?.title||'마을 대시보드';
  return <>
    <div className="exp-demo-heading"><div><p className="exp-eyebrow">함께마을</p><h1>{title}</h1><p>주민과 마을의 일을 한곳에서 살펴봐요.</p></div><span className="exp-demo-pill">데모 화면</span></div><p className="exp-demo-notice">가상의 함께마을을 보여주는 예시 화면입니다. 주민·일정·자금 정보는 실제 데이터가 아닙니다.</p>
    {section==='dashboard'&&<><Metrics/><div className="exp-demo-columns"><section className="exp-panel"><h2>다가오는 마을 일정</h2><ScheduleList/></section><section className="exp-panel"><h2>오늘 함께 할 일</h2><div className="exp-demo-list">{['주민 모임 장소 확인하기','어르신 안부 확인 일정 나누기','마을회관 수리 견적 받아보기'].map(item=><div key={item}><span className="exp-status-dot"/><strong>{item}</strong></div>)}</div><Link href="/experience/business-plan" className="exp-primary-button" style={{marginTop:20,width:'100%'}}>새 사업계획서 만들기 <ArrowRight size={17}/></Link></section></div></>}
    {section==='news'&&[['주민 모임','이번 달 마을 모임에 함께해 주세요','마을회관에서 주민들의 생각을 나눕니다. 바꾸고 싶은 마을의 모습이나 함께 할 활동을 편하게 이야기해 주세요.'],['함께하는 마을','회관 앞 화단을 함께 가꿨어요','주민들이 모여 꽃을 심고 주변을 정리했습니다. 다음 공동 정비에도 많은 참여 부탁드립니다.'],['생활 안내','어르신 안부 확인 활동을 시작해요','주민들이 함께 이웃을 살피는 활동입니다. 도움이 필요한 이웃이 있다면 마을 담당자에게 알려 주세요.']].map(([tag,title,body])=><article className="exp-news-card" key={title}><span>{tag}</span><h2>{title}</h2><p>{body}</p><small>함께마을 · 예시 소식</small></article>)}
    {section==='residents'&&<><div className="exp-metric-grid"><div className="exp-metric"><p>함께마을 주민</p><strong>48</strong><small>명</small></div><div className="exp-metric"><p>활동 참여 주민</p><strong>16</strong><small>명</small></div></div><section className="exp-panel"><h2>마을 운영을 함께하는 분들</h2><div className="exp-demo-list">{[['김○○','이장','마을 운영과 주민 의견 모으기'],['이○○','사무장','문서 정리와 활동 일정 챙기기'],['박○○','주민','회관 정비와 이웃 돌봄 참여'],['최○○','주민','마을 소식과 활동 사진 공유']].map(([name,role,detail])=><div key={name}><span className="exp-resident-avatar">{name[0]}</span><div><strong>{name}</strong><p>{detail}</p></div><span>{role}</span></div>)}</div></section></>}
    {section==='schedule'&&<section className="exp-panel"><h2>10월 마을 일정</h2><ScheduleList/><p className="exp-help">실제 마을에서는 행사와 활동 일정을 함께 확인할 수 있습니다.</p></section>}
    {section==='funds'&&<><div className="exp-metric-grid">{[['총 사업비','500'],['사용한 금액','250'],['남은 금액','250']].map(([label,value])=><div className="exp-metric" key={label}><p>{label}</p><strong>{value}</strong><small>만원</small></div>)}</div><section className="exp-panel"><h2>어디에 사용했나요?</h2>{[['시설 정비','150만원',60],['주민 활동','75만원',30],['운영 물품','25만원',10]].map(([label,amount,ratio])=><div className="exp-budget-row" key={label}><div><strong>{label}</strong><span>{amount}</span></div><div className="exp-budget-bar" role="img" aria-label={`${label} ${ratio}%`}><span style={{width:`${ratio}%`}}/></div></div>)}<Link href="/experience/tools/receipt" className="exp-secondary-button" style={{width:'100%',marginTop:10}}>영수증 정리 체험 <ArrowRight size={17}/></Link></section></>}
    {section==='documents'&&<><section className="exp-panel"><h2>이번 기기에서 만든 문서</h2>{saved?<div className="exp-document-item"><FileText size={22}/><div><strong>{saved.result.title}</strong><p>사업계획서 초안 · 이 기기에 임시 저장</p></div><Link href="/experience/business-plan" aria-label="저장된 사업계획서 열기"><ArrowRight size={18}/></Link></div>:<div className="exp-empty"><h2>우리 마을의 첫 문서를 만들어 보세요.</h2><p>사업계획서 체험을 마치면<br/>이 기기의 문서함에서 다시 열 수 있어요.</p><Link href="/experience/business-plan" className="exp-primary-button">사업계획서 만들기 <ArrowRight size={18}/></Link></div>}</section><section className="exp-panel"><h2>마을 문서함 예시</h2>{[['주민 모임 회의록','참석자 · 결정 사항 · 다음 할 일'],['마을회관 정비 안내','활동 일시 · 장소 · 주민 참여 안내']].map(([title,detail])=><div className="exp-document-item" key={title}><FileText size={22}/><div><strong>{title}</strong><p>{detail} · 예시</p></div><button aria-label={`${title} 예시 내려받기`} onClick={()=>{saveBlob(`${title}-예시.txt`,new Blob([`${title}\n\n함께마을 체험관 예시 문서입니다. 실제 주민 정보나 운영 기록이 아닙니다.\n\n${detail.split(' · ').map(label=>`${label}: [입력 필요]`).join('\n')}`],{type:'text/plain;charset=utf-8'}));setMessage('예시 문서를 내려받았어요.');}}><Download size={18}/></button></div>)}</section>{saved&&<button className="exp-secondary-button" onClick={()=>saveBlob('사업계획서-초안.txt',new Blob([planText(saved.basics,saved.result)],{type:'text/plain;charset=utf-8'}))}><Download size={17}/> 내 계획서 글 파일 받기</button>}</>}
    {message&&<p className="exp-help" role="status">{message}</p>}
    {section!=='documents'&&<Link href="/experience" className="exp-secondary-button" style={{marginTop:12}}>AI 도구 체험으로 <ArrowRight size={18}/></Link>}
    <span className="sr-only">사업계획서 출력 항목 {Object.values(planSectionLabels).join(', ')}</span>
  </>;
}
