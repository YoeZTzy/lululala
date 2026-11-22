// Pusat Kota Bandung untuk peta.
export const BANDUNG = { latitude: -6.9147, longitude: 107.6098, latitudeDelta: 0.08, longitudeDelta: 0.08 };

// Asal dan tujuan rute dianggap titik yang sama bila lebih dekat dari ini.
export const JARAK_MIN_ASAL_TUJUAN_M = 50;

export function jarakMeter(a, b) {
  const r = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Posisi relatif (0..1) titik pada garis asal -> tujuan, untuk garis rute mini.
export function fraksiPadaRute(titik, asal, tujuan) {
  const k = Math.cos((asal.lat * Math.PI) / 180);
  const ax = asal.lon * k;
  const ay = asal.lat;
  const dx = tujuan.lon * k - ax;
  const dy = tujuan.lat - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return 0.5;
  const t = ((titik.lon * k - ax) * dx + (titik.lat - ay) * dy) / len2;
  return Math.max(0, Math.min(1, t));
}

// Region MapView yang memuat semua titik {lat, lon} dengan sedikit ruang.
export function regionUntuk(titik, ruang = 1.6, minDelta = 0.01) {
  if (!titik.length) return BANDUNG;
  const lats = titik.map((p) => p.lat);
  const lons = titik.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * ruang, minDelta),
    longitudeDelta: Math.max((maxLon - minLon) * ruang, minDelta),
  };
}

// Region MapView -> bbox backend "min_lon,min_lat,max_lon,max_lat".
export function bboxDariRegion(r) {
  const f = (x) => x.toFixed(5);
  return [
    f(r.longitude - r.longitudeDelta / 2),
    f(r.latitude - r.latitudeDelta / 2),
    f(r.longitude + r.longitudeDelta / 2),
    f(r.latitude + r.latitudeDelta / 2),
  ].join(',');
}

export function formatJarak(meter) {
  if (meter == null) return '';
  if (meter < 1000) return `${Math.round(meter / 10) * 10} m`;
  return `${(meter / 1000).toFixed(1).replace('.', ',')} km`;
}
