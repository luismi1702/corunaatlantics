// Un ZIP mínimo, sin comprimir, para bajar varios archivos de una vez.
//
// Sin librería a propósito: lo que va dentro son JPEG, que ya vienen
// comprimidos, y meter un compresor para ganar un 1 % no compensa traer código
// de fuera. Esto es el formato tal cual (método "store"), que abre cualquier
// sistema: Windows, macOS, Android e iOS.

const TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = TABLA[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// Fecha y hora en el formato de MS-DOS, que es el que guarda el ZIP.
function fechaDOS(d = new Date()) {
  return {
    hora:  (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    fecha: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  };
}

// archivos: [{ nombre: 'carpeta/foto.jpg', datos: Blob | string }]
export async function crearZip(archivos) {
  const cod = new TextEncoder();
  const { hora, fecha } = fechaDOS();
  const trozos = [];
  const central = [];
  let desplazamiento = 0;

  for (const a of archivos) {
    const nombre = cod.encode(a.nombre);
    const datos = typeof a.datos === 'string'
      ? cod.encode(a.datos)
      : new Uint8Array(await a.datos.arrayBuffer());
    const crc = crc32(datos);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);           // versión necesaria
    local.setUint16(6, 0x0800, true);       // nombres en UTF-8
    local.setUint16(8, 0, true);            // sin comprimir
    local.setUint16(10, hora, true);
    local.setUint16(12, fecha, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombre.length, true);
    local.setUint16(28, 0, true);
    trozos.push(local, nombre, datos);

    const cab = new DataView(new ArrayBuffer(46));
    cab.setUint32(0, 0x02014b50, true);
    cab.setUint16(4, 20, true);
    cab.setUint16(6, 20, true);
    cab.setUint16(8, 0x0800, true);
    cab.setUint16(10, 0, true);
    cab.setUint16(12, hora, true);
    cab.setUint16(14, fecha, true);
    cab.setUint32(16, crc, true);
    cab.setUint32(20, datos.length, true);
    cab.setUint32(24, datos.length, true);
    cab.setUint16(28, nombre.length, true);
    cab.setUint32(42, desplazamiento, true);
    central.push(cab, nombre);

    desplazamiento += 30 + nombre.length + datos.length;
  }

  const tamCentral = central.reduce((s, x) => s + x.byteLength, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true);
  fin.setUint32(16, desplazamiento, true);

  return new Blob([...trozos, ...central, fin], { type: 'application/zip' });
}
