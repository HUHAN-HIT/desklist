// 生成应用图标：紫色渐变圆角方块 + 白色对勾
// 纯 Node 实现 PNG(RGBA) 与 ICO(PNG 内嵌) 编码，无需图像依赖。
// 用法: npm run icons  → 输出到 src-tauri/icons/
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src-tauri', 'icons');

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * size * 4, size * 4).copy(raw, y * stride + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- 绘制 ----------
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function render(size) {
  const rgba = new Uint8Array(size * size * 4);
  const r = size * 0.225; // 圆角半径
  const half = size / 2;
  const hw = half - size * 0.045; // 圆角矩形半宽
  const strokeW = size * 0.075; // 对勾线宽
  const pts = [
    [0.30 * size, 0.535 * size],
    [0.455 * size, 0.675 * size],
    [0.72 * size, 0.335 * size],
  ];
  const c1 = [139, 92, 246]; // violet-500
  const c2 = [91, 33, 182]; // violet-800
  const SS = 3; // 3x3 超采样抗锯齿
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rr = 0, gg = 0, bb = 0, aa = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const qx = Math.abs(px - half) - (hw - r);
          const qy = Math.abs(py - half) - (hw - r);
          const dRect = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
          if (dRect <= 0) {
            const t = Math.max(0, Math.min(1, (px + py - size) / size + 0.5));
            let cr = c1[0] + (c2[0] - c1[0]) * t;
            let cg = c1[1] + (c2[1] - c1[1]) * t;
            let cb = c1[2] + (c2[2] - c1[2]) * t;
            const d =
              Math.min(
                distToSegment(px, py, pts[0][0], pts[0][1], pts[1][0], pts[1][1]),
                distToSegment(px, py, pts[1][0], pts[1][1], pts[2][0], pts[2][1]),
              );
            if (d <= strokeW / 2) {
              cr = cg = cb = 255;
            }
            rr += cr; gg += cg; bb += cb; aa += 255;
          }
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(rr / n);
      rgba[i + 1] = Math.round(gg / n);
      rgba[i + 2] = Math.round(bb / n);
      rgba[i + 3] = Math.round(aa / n);
    }
  }
  return rgba;
}

// ---------- ICO 编码（PNG 内嵌条目，Vista+ 支持） ----------
function encodeIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);
  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  entries.forEach((e, i) => {
    const b = e.png.length;
    const s = e.size >= 256 ? 0 : e.size;
    dir[i * 16] = s; // width
    dir[i * 16 + 1] = s; // height
    dir[i * 16 + 2] = 0; // palette
    dir[i * 16 + 3] = 0; // reserved
    dir.writeUInt16LE(1, i * 16 + 4); // planes
    dir.writeUInt16LE(32, i * 16 + 6); // bpp
    dir.writeUInt32LE(b, i * 16 + 8);
    dir.writeUInt32LE(offset, i * 16 + 12);
    offset += b;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

// ---------- 输出 ----------
mkdirSync(outDir, { recursive: true });
const cache = new Map();
function pngOf(size) {
  if (!cache.has(size)) cache.set(size, encodePng(size, render(size)));
  return cache.get(size);
}

const files = [
  ['16x16.png', 16],
  ['32x32.png', 32],
  ['48x48.png', 48],
  ['128x128.png', 128],
  ['128x128@2x.png', 256],
];
for (const [name, size] of files) writeFileSync(join(outDir, name), pngOf(size));
writeFileSync(
  join(outDir, 'icon.ico'),
  encodeIco([
    { size: 16, png: pngOf(16) },
    { size: 32, png: pngOf(32) },
    { size: 256, png: pngOf(256) },
  ]),
);
console.log(`icons written to ${outDir}: ${files.map((f) => f[0]).join(', ')}, icon.ico`);
