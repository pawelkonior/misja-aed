// Runs real speech recognition through the same controls used on a phone.
// Chrome reads the recorded Polish word through its fake microphone capture device.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(new URL('../web/package.json',import.meta.url));
const {chromium} = require('@playwright/test');
const wav = fileURLToPath(new URL('../film/assets/komenda-dalej.wav',import.meta.url));
const url = new URL(process.argv[2] ?? 'http://127.0.0.1:5194/');
url.hash = 'instrukcja';
const browser = await chromium.launch({channel:'chrome',args:[
  '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
  '--use-file-for-fake-audio-capture='+wav,
]});
try {
  const page = await browser.newPage({permissions:['microphone'],viewport:{width:440,height:1000}});
  await page.goto(url.href);
  await page.getByText('O instrukcji i obsłudze głosowej',{exact:true}).click();
  await page.getByLabel('Rozpoznawaj mowę na urządzeniu',{exact:false}).check();
  await page.getByRole('button',{name:'Krok 3.',exact:false}).click();
  await page.getByRole('button',{name:'Mów „dalej”'}).click();
  await page.getByText('Mikrofon gotowy. Powiedz „dalej”.',{exact:true}).waitFor({timeout:90000});
  await page.getByText('Rozpoznano „dalej”.',{exact:true}).waitFor({timeout:15000});
  assert.match(await page.locator('.rescue-kicker').innerText(),/Krok 4 z 5/);
  await page.getByRole('button',{name:'Wyłącz mikrofon'}).click();
  // The 4.8 s input WAV continues looping at the fake device.
  await page.waitForTimeout(5500);
  assert.match(await page.locator('.rescue-kicker').innerText(),/Krok 4 z 5/);
  console.log('Rozpoznano „dalej”. Krok 3 → 4. Po zatrzymaniu mikrofonu krok 4 pozostał widoczny.');
} finally {
  await browser.close();
}
