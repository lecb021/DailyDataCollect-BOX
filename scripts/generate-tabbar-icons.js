// 将 SVG 图标转换为 PNG（TabBar 用）
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS = ['home', 'record', 'report', 'mine'];
const SRC_DIR = path.join(__dirname, '../src/assets/tabbar');
const OUT_DIR = path.join(__dirname, '../src/assets/tabbar');

const STROKE_UNSELECTED = '#94A3B8';
const STROKE_SELECTED = '#1E40AF';

function svgTemplate(name, stroke) {
  // 读取原 SVG，替换 stroke 颜色
  let content = fs.readFileSync(path.join(SRC_DIR, `${name}.svg`), 'utf-8');
  content = content.replace(/stroke="#[0-9A-Fa-f]{3,8}"/g, `stroke="${stroke}"`);
  return content;
}

async function convert(name) {
  // 未选中态
  const unselected = svgTemplate(name, STROKE_UNSELECTED);
  await sharp(Buffer.from(unselected))
    .resize(81, 81)
    .png()
    .toFile(path.join(OUT_DIR, `${name}.png`));

  // 选中态
  const selected = svgTemplate(name, STROKE_SELECTED);
  await sharp(Buffer.from(selected))
    .resize(81, 81)
    .png()
    .toFile(path.join(OUT_DIR, `${name}-selected.png`));

  console.log(`✓ ${name}.png / ${name}-selected.png`);
}

(async () => {
  for (const name of ICONS) {
    await convert(name);
  }
  console.log('全部图标转换完成');
})();
