// Run against the actual Vite application. The film samples interactions on a fixed clock.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../web/package.json',import.meta.url));
const { chromium } = require('playwright');
const wd=fileURLToPath(new URL('./work/',import.meta.url));
mkdirSync(wd,{recursive:true});
const origin=process.env.AED_DEMO_URL || 'http://127.0.0.1:5194/';
const browser=await chromium.launch({channel:process.env.AED_CHROME_CHANNEL||'chrome',headless:true});
const page=await browser.newPage({viewport:{width:420,height:820},deviceScaleFactor:1});
page.on('pageerror',e=>console.error(e));
try{
  await page.goto(origin);
  await page.clock.install();
  await page.evaluate(()=>document.fonts.ready);
  await page.getByRole('button',{name:'Otwórz mapę AED',exact:true}).waitFor();
  const fps=6;
  async function record(key,seconds,actions={}){
    mkdirSync(wd+'/'+key,{recursive:true});
    for(let frame=0;frame<seconds*fps;frame++){
      if(actions[frame]) await actions[frame]();
      await page.clock.runFor(Math.round(1000/fps));
      await page.screenshot({path:wd+'/'+key+'/'+String(frame).padStart(3,'0')+'.jpg',type:'jpeg',quality:89});
    }
  }
  const clickAct=(a)=>page.locator('[data-act="'+a+'"]:visible').first().click();
  const top=()=>page.evaluate(()=>window.scrollTo(0,0));
  await record('map',9,{
    13:async()=>{await page.getByRole('button',{name:'Otwórz mapę AED',exact:true}).click();await page.locator('[data-act="select"]').first().waitFor();},
    38:async()=>{await clickAct('select');await top();}
  });
  await record('walk',12,{
    5:async()=>{await page.locator('.am-photo').first().scrollIntoViewIfNeeded();},
    17:()=>clickAct('photo'),
    25:()=>clickAct('photo'),
    33:()=>clickAct('photo'),
    41:async()=>{await clickAct('navigate');await page.locator('[data-act="ar"]').waitFor();await top();},
    57:async()=>{await clickAct('advance');await top();}
  });
  await clickAct('ar');await page.locator('.rescue-ar').waitFor();await top();
  await record('ar',13,{
    4:async()=>{await page.getByRole('button',{name:'Symuluj dojście'}).click();await top();},
    18:async()=>{await page.locator('input[type=range]').fill('35');await top();},
    27:async()=>{await page.locator('input[type=range]').fill('0');await top();}
  });
  await page.locator('.rescue-ar-panel .rescue-primary').click();
  await page.locator('.rescue-guide').waitFor();await top();
  await record('guide',12,{
    18:async()=>{await page.getByRole('button',{name:'Dalej',exact:true}).click();await top();},
    35:async()=>{await page.getByRole('button',{name:'Dalej',exact:true}).click();await top();},
    55:async()=>{await page.getByRole('button',{name:'Dalej',exact:true}).click();await top();}
  });
}finally{await browser.close();}
