// Export the same native elements used by Presentation Studio, then attach the film to its poster.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const dir = path.dirname(fileURLToPath(import.meta.url)),
  root = path.dirname(dir);
const require = createRequire(import.meta.url);
const pkg = require.resolve('@oai/artifact-tool');
const { Presentation, PresentationFile } = await import(pathToFileURL(pkg));
const { FontLibrary } = createRequire(pkg)('skia-canvas');
const fontDir = path.join(dir, 'fonts');
const families = {
  'Bebas Neue': ['BebasNeue-Regular.ttf'],
  Montserrat: ['Montserrat-Regular.ttf', 'Montserrat-Bold.ttf'],
  'JetBrains Mono': ['JetBrainsMono-Regular.ttf'],
};
for (const [label, files] of Object.entries(families))
  FontLibrary.use({ [label]: files.map((name) => path.join(fontDir, name)) });
const source = JSON.parse(
  await fs.readFile(path.join(root, 'deliverables/Misja-AED.studio.json'), 'utf8'),
);
const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });
deck.theme.defaultFont = 'Montserrat';
deck.theme.colorScheme = {
  name: 'Misja AED / Azeno Hi',
  themeColors: {
    bg1: '#FFFFFF',
    bg2: '#F5F5F7',
    tx1: '#0B1F28',
    tx2: '#335966',
    dk1: '#0B1F28',
    dk2: '#335966',
    lt1: '#FFFFFF',
    lt2: '#F5F5F7',
    accent1: '#E6013A',
    accent2: '#335966',
    accent3: '#21D3E0',
    accent4: '#235CA8',
    accent5: '#D6E1E4',
    accent6: '#12243B',
    hlink: '#235CA8',
    folHlink: '#335966',
  },
};
const noLine = { fill: 'none', width: 0 };
let filmPoster;
for (const [i, model] of source.slides.entries()) {
  const slide = deck.slides.add();
  slide.background.fill = model.background;
  slide.speakerNotes.textFrame.setText([model.notes, 'Źródła', model.sources].join('\n\n'));
  for (const e of model.elements) {
    const position = { left: e.x, top: e.y, width: e.w, height: e.h };
    if (e.type === 'image') {
      const match = /^data:([^;]+);base64,(.+)$/.exec(e.src);
      if (!match) throw Error('Missing embedded image: ' + e.id);
      const img = slide.images.add({
        name: e.text,
        alt: e.text,
        position,
        fit: e.fit ?? 'contain',
        contentType: match[1],
        blob: new Uint8Array(Buffer.from(match[2], 'base64')),
      });
      if (e.imageViewport) {
        const v = e.imageViewport;
        img.crop = {
          left: v.left,
          top: v.top,
          right: Math.max(0, 1 - v.left - v.width),
          bottom: Math.max(0, 1 - v.top - v.height),
        };
      }
      if (e.videoSrc) filmPoster = { slide: i + 1, label: e.text };
    } else if (e.geometry === 'rect') {
      slide.shapes.add({
        geometry: 'rect',
        name: e.id,
        position,
        fill: e.fill ?? 'none',
        line: e.stroke ? { style: 'solid', fill: e.stroke, width: 1.3 } : noLine,
      });
    } else {
      const s = slide.shapes.add({
        geometry: 'textbox',
        name: e.text.split('\n')[0],
        position,
        fill: 'none',
        line: noLine,
      });
      if (e.placeholder === 'Dodaj tytuł') s.placeholder.type = 'title';
      s.text = e.text;
      s.text.style = {
        typeface: e.fontFamily || 'Montserrat',
        fontSize: e.fontSize,
        color: e.color,
        bold: e.bold ?? false,
        alignment: e.align ?? 'left',
        verticalAlignment: 'top',
        wrap: 'square',
        autoFit: 'none',
        insets: { left: 0, top: 0, right: 0, bottom: 0 },
      };
    }
  }
}
if (!filmPoster) throw Error('Missing demo poster');
const temp = path.join(root, '.tmp/govtech'),
  raw = path.join(temp, 'native.pptx'),
  fonts = path.join(temp, 'fonts.pptx');
await fs.mkdir(temp, { recursive: true });
const output = await PresentationFile.exportPptx(deck);
await output.save(raw);
if (process.argv.includes('--preview')) {
  for (const [i, s] of deck.slides.items.entries()) {
    const png = await deck.export({ slide: s, format: 'png', scale: 1 });
    await fs.writeFile(
      path.join(temp, 'slide-' + String(i + 1).padStart(2, '0') + '.png'),
      new Uint8Array(await png.arrayBuffer()),
    );
  }
}
const python = process.env.PYTHON || 'python3';
execFileSync(python, [path.join(dir, 'embed-fonts.py'), raw, fonts], { stdio: 'inherit' });
execFileSync(
  python,
  [
    path.join(dir, 'embed-video.py'),
    fonts,
    path.join(root, 'deliverables/Misja-AED.pptx'),
    path.join(root, 'deliverables/Misja-AED-60s.mp4'),
    '--slide',
    String(filmPoster.slide),
    '--label',
    filmPoster.label,
  ],
  { stdio: 'inherit' },
);
await fs.chmod(path.join(root, 'deliverables/Misja-AED.pptx'), 0o644);
console.log('Zapisano PPTX z osadzonymi krojami i lokalnym filmem.');
