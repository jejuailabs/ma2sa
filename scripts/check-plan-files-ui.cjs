const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const origin=process.env.PLAN_FILES_TEST_ORIGIN||'http://127.0.0.1:3034';
const out=path.resolve(__dirname,'../../new-form-verification/plan-backups');fs.mkdirSync(out,{recursive:true});
const key='ma2sa-experience-plan-v1',liveKey='ma2sa-live-interview-v1';
const fixture=type=>({version:1,expires:Date.now()+86400000,step:9,skipped:['budget'],basics:{type,group:'MD 복원 모임',title:'기본 제목',address:'검증 주소',representative:'검증 담당',phone:'01000000000',grant:'100000',contribution:'0'},answers:Array.from({length:8},(_,i)=>`원래 답변 ${i+1}`),result:{title:'저장할 계획서',summary:'요약',period:'11월~12월',year:'2026',activityField:'환경',sections:{purpose:'필요성',target:'주민',activities:'함께 청소',participation:'역할 나누기',schedule:'주 1회',budget:'재료 구매',effects:'깨끗한 골목',groupIntro:'주민모임'},scheduleRows:[{name:'청소',when:'주 1회',content:'골목 정리'}],budgetRows:[{name:'재료',category:'소모품',amount:0,basis:'0원'},{name:'견적',category:'운영',amount:null,basis:''}],founded:'2020년',members:'5명',history:'활동 이력',fundingHistory:[['기관','환경','2025','0','활동']],operation:{roles:'역할 분담',serviceProcess:'접수',safety:'현장 확인',records:'활동 기록'}}});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  await page.goto(origin+'/experience/business-plan',{waitUntil:'domcontentloaded',timeout:180000});
  for(const [width,type] of [[1440,'community'],[390,'happiness']]){
   await page.setViewportSize({width,height:900});const initial=fixture(type);
   await page.evaluate(({key,liveKey,initial})=>{localStorage.setItem(key,JSON.stringify(initial));localStorage.setItem(liveKey,JSON.stringify({...initial,messages:[]}));window.dispatchEvent(new Event('ma2sa-experience-draft-changed'));},{key,liveKey,initial});
   await page.getByRole('textbox').first().fill(`수정한 ${type} 제목`);
   const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
   const pending=page.waitForEvent('download');await page.getByRole('button',{name:'MD로 저장',exact:true}).click();const downloaded=await pending;
   assert(downloaded.suggestedFilename().endsWith('.md'));const saved=path.join(out,`${type}.md`);await downloaded.saveAs(saved);
   assert(fs.readFileSync(saved,'utf8').includes('## 작성한 계획서'));
   if(width===1440)await page.getByRole('link',{name:'AI 도구 체험',exact:true}).click();else await page.getByRole('link',{name:'AI 도구로 돌아가기',exact:true}).click();
   await page.waitForURL(origin+'/experience');
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);assert.equal(await page.evaluate(key=>localStorage.getItem(key),liveKey),null);
   await page.getByRole('link',{name:'우리 마을 계획서 만들기'}).click();
   await page.getByRole('button',{name:'시작하기',exact:true}).waitFor();assert.equal(await page.getByRole('textbox').first().inputValue(),'');
   const picker=page.waitForEvent('filechooser');await page.getByRole('button',{name:'MD 불러오기',exact:true}).click();await(await picker).setFiles(saved);
   await page.getByRole('textbox').first().waitFor();await page.getByRole('status').filter({hasText:'MD 파일에서'}).waitFor();
   const restored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
   for(const property of ['basics','answers','result','skipped'])assert.deepEqual(restored[property],before[property],property);
   await page.reload({waitUntil:'domcontentloaded',timeout:180000});assert.equal(await page.getByRole('textbox').first().inputValue(),before.result.title);
   await page.locator('input[type=file]').setInputFiles({name:'invalid.md',mimeType:'text/markdown',buffer:Buffer.from('# 손상된 파일')});await page.getByRole('alert').filter({hasText:'불러올 내용을 확인하지 못했어요.'}).waitFor();assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).result.title,before.result.title);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.getByRole('button',{name:'새 계획서 시작',exact:true}).click();await page.getByRole('button',{name:'시작하기',exact:true}).waitFor();assert.equal(await page.getByRole('textbox').first().inputValue(),'');assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);
   console.log(`PASS ${width}px ${type}: MD download/import, all fields, refresh, invalid import and fresh reset.`);
   await page.goto(origin+'/live-plan',{waitUntil:'domcontentloaded',timeout:180000});
   const livePicker=page.waitForEvent('filechooser');await page.getByRole('button',{name:'MD 불러오기',exact:true}).click();await(await livePicker).setFiles(saved);const dialog=page.getByRole('dialog');await dialog.waitFor().catch(async error=>{throw new Error(error.message+'\n'+await page.locator('.lp-page').innerText());});assert.equal(await dialog.getByRole('textbox').first().inputValue(),before.result.title);
   const live=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),liveKey);for(const property of ['basics','answers','result','skipped'])assert.deepEqual(live[property],before[property],property);
   await dialog.getByRole('button',{name:'새 계획서 시작',exact:true}).click();assert.equal(await page.evaluate(key=>localStorage.getItem(key),liveKey),null);
   await page.goto(origin+'/experience/business-plan',{waitUntil:'domcontentloaded',timeout:180000});
   console.log(`PASS ${width}px ${type}: MD download/import, complete form restoration, refresh, invalid import preservation, tool-menu reset and live restoration.`);
  }
  // An old AI response must not restore a plan after the user starts fresh.
  await page.evaluate(({key,initial})=>{localStorage.setItem(key,JSON.stringify({...initial,result:null}));window.dispatchEvent(new Event('ma2sa-experience-draft-changed'));const original=window.fetch.bind(window);window.fetch=async(input,options)=>{const url=String(input);if(url==='/api/experience/session')return Response.json({success:true});if(url==='/api/experience/business-plan'){window.__generationStarted=true;await new Promise(resolve=>window.__finishGeneration=resolve);return Response.json({result:initial.result});}return original(input,options);};},{key,initial:fixture('community')});
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'AI로 계획서 만들기',exact:true}).click();await page.waitForFunction(()=>window.__generationStarted);
  await page.getByRole('button',{name:'새 계획서 시작',exact:true}).click();await page.evaluate(()=>window.__finishGeneration());await page.getByRole('button',{name:'시작하기',exact:true}).waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);
  console.log('PASS late AI response: a new blank plan remains blank.');await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
