import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const require = createRequire(new URL('../web/package.json', import.meta.url));
const {chromium} = require('@playwright/test');
const [output, origin = 'http://127.0.0.1:5174'] = process.argv.slice(2);
if (!output) throw new Error('Podaj ścieżkę wynikową PDF.');
const project = JSON.parse(await readFile(new URL('../deliverables/Misja-AED.studio.json', import.meta.url), 'utf8'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const url = new URL(origin);
  url.searchParams.set('deck', 'misja-aed');
  await page.goto(url.href);
  await page.waitForFunction(({title,count}) =>
    document.title.startsWith(title) && document.querySelectorAll('.thumbnail-item').length === count,
    {title:project.title,count:project.slides.length});
  await page.getByRole('button', {name:'Eksportuj PDF',exact:true}).click();
  const [download] = await Promise.all([
    page.waitForEvent('download',{timeout:180000}),
    page.getByRole('dialog').getByRole('button',{name:'Pobierz PDF',exact:true}).click(),
  ]);
  await download.saveAs(resolve(output));
  console.log(resolve(output));
} finally {
  await browser.close();
}
