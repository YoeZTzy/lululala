// Ubah sudut linear-gradient CSS (derajat) jadi start/end expo-linear-gradient untuk kotak w x h.
export function titikGradien(sudutDerajat, w, h) {
  const rad = (sudutDerajat * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const panjang = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = w / 2;
  const cy = h / 2;
  return {
    start: { x: (cx - (dx * panjang) / 2) / w, y: (cy - (dy * panjang) / 2) / h },
    end: { x: (cx + (dx * panjang) / 2) / w, y: (cy + (dy * panjang) / 2) / h },
  };
}

// Gradien header dari Figma: 151.97deg, #0C447C 7.14% -> #378ADD 78.57%.
export const GRADIEN_HEADER = {
  sudut: 151.97,
  warna: ['#0C447C', '#378ADD'],
  lokasi: [0.0714, 0.7857],
};
