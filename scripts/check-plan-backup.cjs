const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){
  const absolute=path.resolve(root,file);if(cache.has(absolute))return cache.get(absolute);
  const module={exports:{}};cache.set(absolute,module.exports);
  const code=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',code)(name=>name.startsWith('.')||name.startsWith('@/')?load(name.startsWith('@/')?'src/'+name.slice(2)+'.ts':path.relative(root,path.resolve(path.dirname(absolute),name+'.ts'))):require(name),module,module.exports);
  cache.set(absolute,module.exports);return module.exports;
}
const {writePlanBackup,readPlanBackup,MAX_PLAN_BACKUP_BYTES}=load('src/lib/experience/plan-backup.ts');
const {blankBasics,planSectionLabels}=load('src/lib/experience/catalog.ts');
const fixture={basics:{...blankBasics,group:'복원 검증',title:'입력 제목',address:'검증 주소',phone:'01000000000',grant:'100000',contribution:'0'},answers:Array(8).fill('답변 & <함께>\n```json\n줄바꿈'),step:9,skipped:['budget'],result:{title:'수정한 결과 제목',summary:'요약',period:'11월',supportArea:'activity',year:'2026',founded:'2020년',members:'5명',history:'이력',fundingHistory:[['기관','분야','2025','0','사업명']],sections:Object.fromEntries(Object.keys(planSectionLabels).map(key=>[key,'내용 | 표\n[확인]도 그대로 보존'])),scheduleRows:[{name:'활동',when:'월 1회',content:'설명\n두번째 줄'}],budgetRows:[{name:'항목',category:'재료',amount:0,basis:'0원'},{name:'견적 미정',category:'운영',amount:null,basis:''}],operation:{roles:'역할',serviceProcess:'접수',safety:'안전',records:'기록'}}};
for(const type of ['community','happiness']){
  const value={...fixture,basics:{...fixture.basics,type}};
  const md=writePlanBackup(value);assert(md.startsWith('# '));assert(md.includes('## 작성한 계획서'));
  assert.deepEqual(readPlanBackup(md),value);
  assert.deepEqual(readPlanBackup('\uFEFF'+md.replaceAll('\n','\r\n')),value);
  const partial={...value,result:null,step:4};assert.deepEqual(readPlanBackup(writePlanBackup(partial)),partial);
}
for(const content of ['# 보통 MD','bad',writePlanBackup(fixture).replace('"version": 1','"version": 99'),'x'.repeat(MAX_PLAN_BACKUP_BYTES+1)])assert.throws(()=>readPlanBackup(content));
for(const bad of [{...fixture,answers:['하나']},{...fixture,basics:{...blankBasics,type:'invalid'}},{...fixture,result:{...fixture.result,budgetRows:[{name:'항목',category:'비목',amount:-1,basis:''}]}}])assert.throws(()=>writePlanBackup(bad));
global.window=new EventTarget();const saved=new Map();let blocked=false;
global.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>{if(blocked)throw new Error('blocked');saved.set(key,value);},removeItem:key=>{if(blocked)throw new Error('blocked');saved.delete(key);}};
const store=load('src/components/experience/draft-store.ts'),live=load('src/components/experience/live-draft-store.ts');
const seed=()=>store.updateDraft(()=>({version:1,expires:0,...fixture}));seed();const revision=store.draftRevision();store.clearDraft();assert.equal(store.draftSnapshot(),null);assert(store.draftRevision()>revision);assert.equal(store.readDraft(null).result,null);
seed();blocked=true;store.clearDraft();assert.equal(store.draftSnapshot(),null,'Reset must override stale storage when removal fails');store.updateDraft(d=>({...d,basics:{...d.basics,title:'새 내용'}}));assert.equal(store.readDraft(store.draftSnapshot()).basics.title,'새 내용');
blocked=false;live.updateLiveDraft(d=>({...d,basics:fixture.basics,result:fixture.result}));blocked=true;live.clearLiveDraft();assert.equal(live.currentLiveDraft().result,null);blocked=false;
console.log('PASS MD round trips for both types, partial drafts, BOM/CRLF, blank/zero values, invalid data, physical reset and blocked-storage reset.');
