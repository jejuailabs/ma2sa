const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const ts = require('typescript');
const Zip = require('adm-zip');
const {XMLParser, XMLValidator} = require('fast-xml-parser');
const root = path.resolve(__dirname, '..');
const modules = new Map();
const stubs = new Map();
function load(file) {
  if(stubs.has(file)) return stubs.get(file);
  if (modules.has(file)) return modules.get(file).exports;
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const module = {exports: {}}; modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const relativeRequire = name => {
    if (name === 'server-only') return {};
    if (name.startsWith('.') || name.startsWith('@/')) {
      let target = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(file), name);
      if (!path.extname(target)) target += '.ts';
      return load(target);
    }
    return createRequire(file)(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(relativeRequire,module,module.exports);
  return module.exports;
}
const parser = new XMLParser({preserveOrder:true,ignoreAttributes:false,attributeNamePrefix:'',parseTagValue:false,trimValues:false});
const nodes = (tree, tag) => tree.flatMap(node => Object.entries(node).flatMap(([key,value]) => key === tag ? [node, ...nodes(value,tag)] : Array.isArray(value) ? nodes(value,tag) : []));
const text = tree => tree.map(node => node['#text'] || Object.entries(node).filter(([key,value])=>key!==':@'&&Array.isArray(value)).map(([,value])=>text(value)).join('')).join('');
const child = (node,tag,name) => node[tag].find(value=>value[name]);
const {buildCommunityHwpx} = load(path.join(root,'src/lib/experience/hwpx.ts'));
const {sampleBasics,sampleResult} = load(path.join(root,'src/lib/experience/saeteo-sample.ts'));
const {planDocumentContent,cleanPlanText} = load(path.join(root,'src/lib/experience/plan-document.ts'));
const {normalizePlanResult} = load(path.join(root,'src/lib/experience/plan-result.ts'));
const cases = {
  sample: sampleResult,
  multiline: {...sampleResult, sections:{...sampleResult.sections,participation:'첫째 줄: 주민이 기획합니다.\n\n둘째 줄: 주민이 기록합니다.\n셋째 줄: 함께 돌아봅니다.'}},
  long: {...sampleResult, sections:{...sampleResult.sections,participation:'주민참여 긴 답변 검증 '.repeat(140)+'마지막문장보존',purpose:'긴 목적 검증 '.repeat(280)+'목적끝보존'}, scheduleRows:[{name:'긴 활동',when:'11월',content:'공간 정리 및 주민 모임을 진행합니다. '.repeat(25)+'일정끝보존'}],budgetRows:[]},
  legacy: {title:'[입력 필요: 사업명을 입력해 주세요]',sections:{purpose:'마을 도로에 대한 주민 의견을 모읍니다.',target:'주민 70명',activities:'주민이 문제 구간을 기록하고 군에 도로 확장을 건의합니다.',participation:'주민 30명이 역할을 나눕니다.',schedule:'시작일은 [입력 필요]입니다. 총 10회 모입니다. '+ '주민 회의와 기록 활동을 진행합니다. '.repeat(6),budget:'총 예산은 10,000,000원으로 계획합니다. 보조금은 [입력 필요]입니다.',effects:'주민의 의견을 담은 건의서를 마련합니다.',groupIntro:'마을 도로 개선을 위해 모인 주민 30명입니다.'}},
  empty: {title:'',sections:{purpose:'',target:'',activities:'',participation:'',schedule:'',budget:'',effects:'',groupIntro:''}},
  special: {...sampleResult,title:'우리 & <마을> "함께"',sections:{...sampleResult.sections,participation:'가족 & 이웃 <함께>\n두 번째 줄\n\n마지막 줄'}}
};
assert.equal(cleanPlanText('총 예산은 10,000,000원이고 보조금은 [입력 필요]입니다.'),'총 예산은 10,000,000원이고');
assert(!cleanPlanText('구체적인 시작일은 [입력 필요]입니다. 총 10회 모입니다.').includes('시작일'));
assert.equal(cleanPlanText('예산은 100원입니다. budgetRows에 null을 씁니다. 주민이 참여합니다.'),'예산은 100원입니다. 주민이 참여합니다.');
for (const [label,result] of Object.entries(cases)) {
  const basics=['legacy','empty'].includes(label)?{type:'community',group:'',title:'',address:'',representative:'',phone:'',grant:'',contribution:''}:sampleBasics;
  const document=planDocumentContent(basics,result);
  assert(document.fields.summary.length<=360);
  const file=buildCommunityHwpx(basics,result);const zip=new Zip(file);
  assert(zip.test());
  for (const entry of zip.getEntries()) if (/\.(xml|hpf)$/.test(entry.entryName)) assert.equal(XMLValidator.validate(entry.getData().toString('utf8')),true,entry.entryName);
  const xml=zip.readAsText('Contents/section0.xml');const tree=parser.parse(xml);const head=parser.parse(zip.readAsText('Contents/header.xml'));
  assert(!xml.includes('{{'));assert(!xml.includes('hp:linesegarray'));
  assert(!/\[(입력\s*필요|확인)/.test(xml));assert(!xml.includes('2015년'));assert(!xml.includes('기입해주세요'));
  const styles=new Map(nodes(head,'hh:charPr').map(n=>[n[':@'].id,n[':@']]));
  const paraStyles=new Map(nodes(head,'hh:paraPr').map(n=>[n[':@'].id,n]));
  const body=nodes(tree,'hs:sec')[0]['hs:sec'];const top=body.filter(n=>n['hp:p']);
  assert(top.length>=5);
  top.forEach((p,i)=>assert.equal(p[':@'].pageBreak,i===0?'0':'1'));
  const tables=nodes(tree,'hp:tbl');assert.equal(tables.length,top.length+1);
  top.forEach(p=>{const table=nodes(p['hp:p'],'hp:tbl')[0];assert.equal(child(table,'hp:tbl','hp:pos')[':@'].treatAsChar,'1');assert(Number(child(table,'hp:tbl','hp:sz')[':@'].height)<=68000);});
  tables.forEach(table=>{
    const rows=table['hp:tbl'].filter(n=>n['hp:tr']);assert.equal(Number(table[':@'].rowCnt),rows.length);
    const occupied=new Set();
    rows.forEach(row=>row['hp:tr'].filter(n=>n['hp:tc']).forEach(cell=>{
      const addr=child(cell,'hp:tc','hp:cellAddr')[':@'];const span=child(cell,'hp:tc','hp:cellSpan')[':@'];
      assert(Number(addr.rowAddr)+Number(span.rowSpan)<=rows.length);
      assert(Number(addr.colAddr)+Number(span.colSpan)<=Number(table[':@'].colCnt));
      for(let r=0;r<Number(span.rowSpan);r++)for(let c=0;c<Number(span.colSpan);c++){
        const position=`${Number(addr.rowAddr)+r}:${Number(addr.colAddr)+c}`;assert(!occupied.has(position),'overlapping table cells');occupied.add(position);
      }
    }));
    assert.equal(occupied.size,rows.length*Number(table[':@'].colCnt));
  });
  const schedules=tables.filter(t=>text(t['hp:tbl']).trim().startsWith('사업추진 계획'));
  assert(schedules.length>=1);
  const budgets=tables.filter(t=>text(t['hp:tbl']).trim().startsWith('비목별 예산계획'));
  assert(budgets.length>=1);
  for(const line of cleanPlanText(result.sections.participation).split('\n').filter(Boolean)) {
    const p=nodes(tree,'hp:p').find(p=>!nodes(p['hp:p'],'hp:tbl').length&&text(p['hp:p'])===line);
    if(!p&&label==='long'){
      const fragments=nodes(tree,'hp:p').filter(p=>!nodes(p['hp:p'],'hp:tbl').length&&nodes(p['hp:p'],'hp:run').some(r=>r[':@'].charPrIDRef==='100'));
      assert.equal(fragments.map(p=>text(p['hp:p'])).join(''),line);continue;
    }
    assert(p,`Missing participation paragraph: ${label}`);
    nodes(p['hp:p'],'hp:run').forEach(run=>assert.equal(styles.get(run[':@'].charPrIDRef).textColor,'#000000'));
    const style=paraStyles.get(p[':@'].paraPrIDRef);assert.equal(child(style,'hh:paraPr','hh:lineSpacing')[':@'].value,'160');
  }
  if(label==='long') {assert(xml.includes('마지막문장보존'));assert(xml.includes('목적끝보존'));assert(xml.includes('일정끝보존'));assert(top.length>5);}
  if(label==='legacy'){
    assert.equal(document.fields.title,'');assert.equal(document.fields.schedule0Name,'');assert.equal(document.fields.schedule0When,'');
    assert.equal(document.fields.budget0Basis,'');assert.equal(document.fields.budgetNote,'');
    assert.equal(document.fields.budgetTotal,'');assert.equal(document.fields.funding00,'');
    assert(!xml.includes('새터'));assert(!xml.includes('2026년'));assert(!xml.includes('5%'));
    assert(!xml.includes('시작일은 입니다'));assert(!xml.includes('보조금은 입니다'));assert(xml.includes('10,000,000원'));
  }
  if(label==='empty'){
    assert.equal(document.fields.summary,'');assert.equal(document.fields.summaryDetail,'');
    assert.equal(normalizePlanResult(result).title,'');
  }
  if(process.env.HWPX_TEST_OUTPUT_DIR){fs.mkdirSync(process.env.HWPX_TEST_OUTPUT_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.HWPX_TEST_OUTPUT_DIR,`${label}.hwpx`),file);}
  console.log(`PASS ${label}: ${top.length} pages, black fields, complete cell coverage, blank unknown values, bounded table heights, text preserved.`);
}

// Both entry points must request and retain the structured document fields.
const aiRequests=[];
stubs.set(path.join(root,'src/lib/experience/ai/claude.ts'),{askClaudeJson:async request=>{aiRequests.push(request);return sampleResult;}});
stubs.set(path.join(root,'src/lib/experience/server.ts'),{reserveUse:async()=>{},refundUse:async()=>{},sameOrigin:()=>{},reserveLiveUse:async()=>{}});
(async()=>{
  const payload={basics:sampleBasics,answers:Array(8).fill('주민이 함께 반찬을 만듭니다.')};
  const route=load(path.join(root,'src/app/api/experience/business-plan/route.ts'));
  const response=await route.POST(new Request('http://localhost/api/experience/business-plan',{method:'POST',body:JSON.stringify(payload)}));
  assert.equal(response.status,200);
  const regular=(await response.json()).result;
  const live=await load(path.join(root,'src/lib/experience/live-server.ts')).generateLivePlan(payload);
  for(const result of [regular,live]) {assert.equal(result.scheduleRows.length,sampleResult.scheduleRows.length);assert.equal(result.budgetRows.length,sampleResult.budgetRows.length);assert(result.summary);}
  for(const request of aiRequests) {const prompt=JSON.parse(request.prompt);assert('scheduleRows' in prompt.outputSchema);assert('budgetRows' in prompt.outputSchema);assert('summary' in prompt.outputSchema);assert(!('representative' in prompt));}
  console.log('PASS regular and conversational AI routes: structured output retained; provider mocked, no paid calls.');
})().catch(error=>{console.error(error);process.exitCode=1;});
