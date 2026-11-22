// Self-check util murni (tanpa React Native): node mobile/scripts/cek-utils.mjs
import assert from 'node:assert/strict';
import { formatJam, keberangkatanBerikutnya, labelHari, labelSisa, parseJam } from '../src/utils/jadwal.js';
import { bboxDariRegion, fraksiPadaRute, formatJarak } from '../src/utils/geo.js';
import { labelHujan } from '../src/utils/cuaca.js';
import { relatif } from '../src/utils/waktu.js';

assert.deepEqual(parseJam('06:45'), { jam: 6, menit: 45 });
assert.equal(parseJam('24:00'), null);
assert.equal(formatJam('6:05'), '06.05');

// Senin 23 Nov 2026 07:00 lokal
const senin = new Date(2026, 10, 23, 7, 0);
assert.equal(keberangkatanBerikutnya(['sen'], '06:45', senin).getDate(), 30, 'sudah lewat -> Senin depan');
assert.equal(keberangkatanBerikutnya(['sen', 'sel'], '06:45', senin).getDate(), 24, 'besok Selasa');
assert.equal(keberangkatanBerikutnya(['sen'], '07:30', senin).getDate(), 23, 'hari ini');
assert.equal(keberangkatanBerikutnya([], '07:30', senin), null);
assert.equal(labelSisa(new Date(2026, 10, 23, 7, 30), senin), '30 menit lagi');
assert.equal(labelSisa(new Date(2026, 10, 24, 6, 45), senin), 'Besok');
assert.equal(labelSisa(new Date(2026, 10, 26, 6, 45), senin), 'Kamis');

assert.equal(labelHari(['sen', 'sel', 'rab', 'kam', 'jum']), 'Sen–Jum');
assert.equal(labelHari(['sab']), 'Sabtu');
assert.equal(labelHari(['rab', 'sen']), 'Sen, Rab');
assert.equal(labelHari(['sen', 'sel', 'rab', 'kam', 'jum', 'sab', 'min']), 'Setiap hari');

const a = { lat: -6.9, lon: 107.6 };
const b = { lat: -6.9, lon: 107.7 };
assert.equal(fraksiPadaRute({ lat: -6.91, lon: 107.65 }, a, b), 0.5);
assert.equal(fraksiPadaRute({ lat: -6.9, lon: 107.5 }, a, b), 0);
assert.equal(bboxDariRegion({ latitude: -6.9, longitude: 107.6, latitudeDelta: 0.2, longitudeDelta: 0.1 }), '107.55000,-7.00000,107.65000,-6.80000');
assert.equal(formatJarak(347), '350 m');
assert.equal(formatJarak(1250), '1,3 km');

assert.equal(labelHujan(0).label, 'Cerah');
assert.equal(labelHujan(12).label, 'Hujan lebat');
assert.equal(relatif(new Date(Date.now() - 8 * 60000).toISOString()), '8 mnt lalu');

console.log('cek-utils: semua lolos');
