// Run against a local dev server. Native share/clipboard APIs are mocked;
// this never sends a message or opens an external app.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const url = process.env.SHARING_TEST_URL || 'http://127.0.0.1:3033/experience/business-plan';
const availableModes = ['unsupported','blocked','capability-error','native','native-older','cancel','share-error','share-data-error','copy-error','no-clipboard','pending'];
const modes = (process.env.SHARING_TEST_MODES || availableModes.join(',')).split(',');
assert(modes.every(mode=>availableModes.includes(mode)), 'Unknown sharing test mode');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const width of [390,1440]) {
      const context = await browser.newContext({viewport:{width,height:900}});
      for (const mode of modes) {
      const page = await context.newPage();
      await page.addInitScript(({mode}) => {
        window.__sharing = {shares:[],copies:[],resolve:null};
        const state = window.__sharing;
        Object.defineProperty(navigator,'share',{configurable:true,value:mode==='unsupported'?undefined:async data => {
          state.shares.push({...data,active:navigator.userActivation.isActive});
          if (mode==='cancel') throw new DOMException('Cancelled','AbortError');
          if (mode==='share-error') throw new DOMException('Blocked','NotAllowedError');
          if (mode==='share-data-error') throw new DOMException('Target failed','DataError');
          if (mode==='pending') await new Promise(resolve=>{state.resolve=resolve;});
        }});
        Object.defineProperty(navigator,'canShare',{configurable:true,value:mode==='native-older'?undefined:() => {
          if(mode==='capability-error')throw new Error('Unavailable');
          return mode!=='blocked';
        }});
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='no-clipboard'?undefined:{writeText:async text => {
          if(mode==='copy-error')throw new DOMException('Denied','NotAllowedError');
          state.copies.push(text);
        }}});
        localStorage.setItem('ma2sa-experience-plan-v1',JSON.stringify({version:1,expires:Date.now()+86400000,step:9,
          basics:{type:'community',group:'공유 검증 모임',title:'',address:'',representative:'',phone:'',grant:'',contribution:''},
          answers:Array(8).fill('검증 답변'),result:{title:'공유 검증 제목',sections:{purpose:'주민이 직접 기획합니다.',target:'우리 마을 주민',activities:'주민 모임',participation:'함께 준비합니다.',schedule:'월 1회',budget:'',effects:'이웃과 만납니다.',groupIntro:'주민모임입니다.'}}}));
      },{mode});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:180000});
      const copy = page.getByRole('button',{name:'내용 복사',exact:true});
      const share = page.getByRole('button',{name:'기기 공유 메뉴',exact:true});
      await copy.waitFor();
      assert.equal(await page.getByRole('button',{name:'공유하기',exact:true}).count(),0);
      if(['unsupported','blocked','capability-error'].includes(mode)) {
        assert.equal(await share.count(),0);
        await page.getByRole('textbox').first().fill('수정한 사업명');
        await copy.click();
        await page.getByRole('status').filter({hasText:'내용을 복사했어요.'}).waitFor();
        const state=await page.evaluate(()=>window.__sharing);
        assert.equal(state.shares.length,0);assert.equal(state.copies.length,1);
        assert(state.copies[0].includes('수정한 사업명'));assert(state.copies[0].includes('주민이 직접 기획합니다.'));
      } else if(mode==='copy-error'||mode==='no-clipboard') {
        await copy.click();
        await page.getByRole('alert').filter({hasText:'자동 복사를 사용할 수 없어요.'}).waitFor();
        const manual=page.getByRole('textbox',{name:'복사할 사업계획서 내용',exact:true});
        assert((await manual.inputValue()).includes('공유 검증 제목'));
        await page.getByRole('button',{name:'전체 선택',exact:true}).click();
        assert.equal(await manual.evaluate(el=>el.selectionEnd-el.selectionStart),(await manual.inputValue()).length);
        assert.equal((await page.evaluate(()=>window.__sharing.copies)).length,0);
        assert.equal(await page.getByRole('status').filter({hasText:'내용을 복사했어요.'}).count(),0);
        await page.getByRole('button',{name:'닫기',exact:true}).click();assert.equal(await manual.count(),0);
      } else {
        await share.waitFor();await share.click();
        if(mode==='pending') {
          assert(await copy.isDisabled());assert(await share.isDisabled());
          await share.evaluate(el=>el.click());
          assert.equal((await page.evaluate(()=>window.__sharing.shares)).length,1);
          await page.evaluate(()=>window.__sharing.resolve());
        }
        if(mode==='cancel')await page.getByRole('status').filter({hasText:'공유가 완료되지 않았어요.'}).waitFor();
        else if(mode==='share-error'||mode==='share-data-error')await page.getByRole('alert').filter({hasText:'기기 공유를 완료하지 못했어요.'}).waitFor();
        else await page.getByRole('status').filter({hasText:'전송 여부는 선택한 앱에서 확인해 주세요.'}).waitFor();
        const state=await page.evaluate(()=>window.__sharing);
        assert.equal(state.shares.length,1);assert(state.shares[0].active);assert(state.shares[0].text.includes('주민이 직접 기획합니다.'));
        assert.equal(state.copies.length,0,'Sharing must not silently become copying');
      }
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}px ${mode}: honest feedback, correct payload, no silent copy, no overflow.`);
      await page.close();
      }
      await context.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
