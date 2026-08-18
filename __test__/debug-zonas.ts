import { migrarConfigAZonas, normalizarConfig } from '../src/utils/ticketPlantillaConfig';

const cfg = {
  campos: {
    orden: ['SEPARADOR', 'ESPACIO', 'LIBRE:promo', 'DTO:tel', 'NCF', 'TIPO_COMP', 'RNC_CLIENTE'],
    labels: { NCF: 'COMPROBANTE' },
    textosLibres: { promo: 'OFERTA 2X1\nSOLO HOY' },
    camposDTO: { tel: { label: 'TEL', ruta: 'cliente.telefono', tipo: 'texto' } },
  },
} as any;

const normalized = normalizarConfig(cfg);
console.log('Zonas:', normalized.zonas!.length);
normalized.zonas!.forEach((z, i) => {
  console.log(`Zona ${i} ${z.id} (${z.tipo}): ${z.lineas.length} lineas`);
  z.lineas.forEach((l, j) => {
    const extras = [];
    if (l.label) extras.push(`label=${l.label}`);
    if ((l as any).caracter) extras.push(`char=${(l as any).caracter}`);
    if (l.formato) extras.push(`fmt=${JSON.stringify(l.formato)}`);
    console.log(`  ${j}: ${l.ref}${extras.length ? ' ' + extras.join(' ') : ''}`);
  });
});
console.log('textosLibres:', normalized.textosLibres ? Object.keys(normalized.textosLibres) : 'none');
console.log('camposDTO:', normalized.camposDTO ? Object.keys(normalized.camposDTO) : 'none');
