// Token dari koleksi Figma "LintasSiaga · Warna". Nama grup sama; tanda hubung jadi camelCase
// (mis. risiko/hindari-bg -> colors.risiko.hindariBg).
export const colors = {
  brand: {
    biruTua: '#0C447C',
    biru: '#185FA5',
    biruCerah: '#378ADD',
    langit50: '#E6F1FB',
    langit100: '#B5D4F4',
    amber: '#EF9F27',
    amber50: '#FAEEDA',
    amber800: '#633806',
  },
  risiko: {
    aman: '#1D9E75',
    amanBg: '#E1F5EE',
    amanTeks: '#085041',
    waspada: '#EF9F27',
    waspadaBg: '#FAEEDA',
    waspadaTeks: '#633806',
    hindari: '#E24B4A',
    hindariBg: '#FCEBEB',
    hindariTeks: '#791F1F',
  },
  teks: {
    utama: '#14213D',
    sekunder: '#5B6675',
    samar: '#8A94A3',
    terbalik: '#FFFFFF',
  },
  permukaan: {
    latar: '#F5F8FC',
    kartu: '#FFFFFF',
    isian: '#F0F4F9',
  },
  garis: {
    halus: '#E3E9F0',
  },
};

// Warna per tingkat risiko, dipakai Badge/Kartu/Baris.
export const warnaRisiko = {
  Aman: { utama: colors.risiko.aman, bg: colors.risiko.amanBg, teks: colors.risiko.amanTeks },
  Waspada: { utama: colors.risiko.waspada, bg: colors.risiko.waspadaBg, teks: colors.risiko.waspadaTeks },
  Hindari: { utama: colors.risiko.hindari, bg: colors.risiko.hindariBg, teks: colors.risiko.hindariTeks },
};
