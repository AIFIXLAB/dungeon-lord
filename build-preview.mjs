// สร้างไฟล์ HTML ไฟล์เดียวสำหรับเล่นพรีวิว (ฝัง sprite + ภาพห้องเป็น data URI) — ไม่จำเป็นสำหรับ Vercel
// รัน: NODE_PATH=<path-to-esbuild> node build-preview.mjs dist/preview.html
import { build } from 'esbuild';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import sharp from 'sharp';

const js = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'esm', minify: true, write: false, target: 'es2020' });
const css = (await readFile('style.css', 'utf8')).replace('height: 100dvh', 'height: 100%');
const html = await readFile('index.html', 'utf8');
const body = html.split('<body>')[1].split('<script')[0];
const b64 = async (p, mime) => `data:${mime};base64,${(await readFile(p)).toString('base64')}`;
const atlas = { ...JSON.parse(await readFile('assets/sprites/atlas.json', 'utf8')), ...JSON.parse(await readFile('assets/items/atlas.json', 'utf8')) };
const sheets = {};
for (const n of ['heroes', 'monsters', 'bosses']) sheets[n] = await b64(`assets/sprites/${n}.webp`, 'image/webp');
sheets.items = await b64('assets/items/items.webp', 'image/webp');
sheets.traps = await b64('assets/traps/traps.webp', 'image/webp');
const cover = `data:image/webp;base64,${(await sharp('assets/ui/cover.webp').resize(1400).webp({ quality: 82 }).toBuffer()).toString('base64')}`;
const rooms = {};
for (const f of await readdir('assets/rooms')) rooms[f.replace('.webp', '')] = `data:image/webp;base64,${(await sharp(`assets/rooms/${f}`).resize(560, 560).webp({ quality: 86 }).toBuffer()).toString('base64')}`;
const assets = `window.__ASSETS__=${JSON.stringify({ atlas, sheets, rooms, cover })};`;
const out = `<title>Dungeon Lord: Monster Empire</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mitr:wght@300;400;500;600&family=Pixelify+Sans:wght@400;500;600;700&display=swap">
<style>${css}
html,body{height:100%;color-scheme:dark}
#app{padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}
</style>
${body}
<script>${assets}</script>
<script type="module">${js.outputFiles[0].text}</script>
`;
await writeFile(process.argv[2] || 'dist/preview.html', out);
console.log('ok', (out.length / 1e6).toFixed(2), 'MB');
