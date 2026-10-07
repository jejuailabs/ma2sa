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
function load(file) {
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
const cases = {
  sample: sampleResult,
  multiline: {...sampleResult, sections:{...sampleResult.sections,participation:'첫째 줄: 주민이 기획합니다.\n\n둘째 줄: 주민이 기록합니다.\n셋째 줄: 함께 돌아봅니다.'}},
  long: {...sampleResult, sections:{...sampleResult.sections,participation:'주민참여 긴 답변 검증 '.repeat(140)+'마지막문장보존',purpose:'긴 목적 검증 '.repeat(280)+'목적끝보존'}, scheduleRows:[{name:'긴 활동',when:'11월',content:'공간 정리 및 주민 모임을 진행합니다. '.repeat(25)+'일정끝보존'}],budgetRows:[]},
};
for (const [label,result] of Object.entries(cases)) {
  const file=buildCommunityHwpx(sampleBasics,result);const zip=new Zip(file);
  assert(zip.test());
  for (const entry of zip.getEntries()) if (/\.(xml|hpf)$/.test(entry.entryName)) assert.equal(XMLValidator.validate(entry.getData().toString('utf8')),true,entry.entryName);
  const xml=zip.readAsText('Contents/section0.xml');const tree=parser.parse(xml);const head=parser.parse(zip.readAsText('Contents/header.xml'));
  assert(!xml.includes('{{'));assert(!xml.includes('hp:linesegarray'));
  const styles=new Map(nodes(head,'hh:charPr').map(n=>[n[':@'].id,n[':@']]));
  const paraStyles=new Map(nodes(head,'hh:paraPr').map(n=>[n[':@'].id,n]));
  const body=nodes(tree,'hs:sec')[0]['hs:sec'];const top=body.filter(n=>n['hp:p']);
  assert.equal(top.length,5);
  top.forEach((p,i)=>assert.equal(p[':@'].pageBreak,i===0?'0':'1'));
  const tables=nodes(tree,'hp:tbl');assert.equal(tables.length,6);
  tables.forEach(table=>{
    assert.equal(child(table,'hp:tbl','hp:pos')[':@'].treatAsChar,'0');
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
  const schedule=tables.find(t=>text(t['hp:tbl']).startsWith('  사업추진 계획'));
  assert.equal(Number(schedule[':@'].rowCnt),2+result.scheduleRows.length);
  const budgets=tables.find(t=>text(t['hp:tbl']).startsWith('  비목별 예산계획'));
  assert.equal(Number(budgets[':@'].rowCnt),3+Math.max(1,result.budgetRows.length));
  for(const line of result.sections.participation.split('\n').filter(Boolean)) {
    const p=nodes(tree,'hp:p').find(p=>!nodes(p['hp:p'],'hp:tbl').length&&text(p['hp:p'])===line);
    assert(p,`Missing participation paragraph: ${label}`);
    nodes(p['hp:p'],'hp:run').forEach(run=>assert.equal(styles.get(run[':@'].charPrIDRef).textColor,'#000000'));
    const style=paraStyles.get(p[':@'].paraPrIDRef);assert.equal(child(style,'hh:paraPr','hh:lineSpacing')[':@'].value,'160');
  }
  if(label==='long') {assert(xml.includes('마지막문장보존'));assert(xml.includes('목적끝보존'));assert(xml.includes('일정끝보존'));assert(tables.some(t=>t[':@'].pageBreak==='TABLE'));}
  if(process.env.HWPX_TEST_OUTPUT_DIR){fs.mkdirSync(process.env.HWPX_TEST_OUTPUT_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.HWPX_TEST_OUTPUT_DIR,`${label}.hwpx`),file);}
  console.log(`PASS ${label}: black multiline fields, no stale line positions, five page starts, independent grids, complete cell coverage, unused rows removed, text preserved.`);
}
