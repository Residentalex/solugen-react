import MockAdapter from 'axios-mock-adapter';
import { apiClient } from './client';
import type { AuthSesionDTO, AuthSucursalPermitidaDTO, AuthUsuarioSesionDTO, PantallaDTO, ModuloDTO } from '../types/auth';

const SUCURSALES: AuthSucursalPermitidaDTO[] = [
  { sucursal: 0, nombre: 'Orense Plaza' },
  { sucursal: 1, nombre: 'Hiper Romana' },
  { sucursal: 2, nombre: 'Orense Villa Hermosa' },
  { sucursal: 3, nombre: 'El Ofertazo' },
  { sucursal: 5, nombre: 'Compra' },
];

function crearModulosPantallas(): { pantallas: PantallaDTO[] } {
  const modulos: ModuloDTO[] = [
    { id: 1, nombre: 'Inventario', orden: 1 },
    { id: 2, nombre: 'Compras', orden: 2 },
    { id: 3, nombre: 'Ventas', orden: 3 },
    { id: 4, nombre: 'Facturacion', orden: 4 },
  ];

  const pantallas: PantallaDTO[] = [
    { id: 1, nombre: 'Entradas de Almacén', codigo: 'FENP', ruta: '/FENP', esReporte: false, moduloID: 1, orden: 1, grupo: 'Movimientos', modulos: [modulos[0]], acciones: ['ver', 'crear', 'editar', 'anular'] },
    { id: 2, nombre: 'Salidas de Almacén', codigo: 'FSAP', ruta: '/FSAP', esReporte: false, moduloID: 1, orden: 2, grupo: 'Movimientos', modulos: [modulos[0]], acciones: ['ver', 'crear', 'editar', 'anular'] },
    { id: 3, nombre: 'Transferencias', codigo: 'FTRP', ruta: '/FTRP', esReporte: false, moduloID: 1, orden: 3, grupo: 'Movimientos', modulos: [modulos[0]], acciones: ['ver', 'crear', 'aplicar', 'desaplicar'] },
    { id: 4, nombre: 'Devolución de Compra', codigo: 'FDVC', ruta: '/FDVC', esReporte: false, moduloID: 2, orden: 4, grupo: undefined, modulos: [modulos[1]], acciones: ['ver', 'crear', 'aplicar', 'anular'] },
    { id: 5, nombre: 'Cotizaciones', codigo: 'FCotizacion', ruta: '/FCotizacion', esReporte: false, moduloID: 3, orden: 5, grupo: 'Documentos', modulos: [modulos[2]], acciones: ['ver', 'crear', 'postear'] },
    { id: 6, nombre: 'Devolución de Venta', codigo: 'FDEV', ruta: '/FDEV', esReporte: false, moduloID: 3, orden: 6, grupo: 'Documentos', modulos: [modulos[2]], acciones: ['ver', 'crear', 'aplicar', 'postear'] },
    { id: 7, nombre: 'Facturas POS', codigo: 'FPV', ruta: '/FPV', esReporte: false, moduloID: 4, orden: 7, grupo: undefined, modulos: [modulos[3]], acciones: ['ver', 'crear', 'anular', 'aplicar'] },
    { id: 8, nombre: 'Facturas Cliente', codigo: 'FFAC', ruta: '/FFAC', esReporte: false, moduloID: 4, orden: 8, grupo: undefined, modulos: [modulos[3]], acciones: ['ver', 'crear', 'editar', 'anular', 'aplicar'] },
  ];

  return { pantallas };
}

function crearUsuarioMock(): AuthUsuarioSesionDTO {
  const { pantallas } = crearModulosPantallas();
  return {
    id: 1,
    nombre: 'Administrador Demo',
    nombreUsuario: 'ADMIN',
    debeCambiarClave: false,
    diasVigencia: 30,
    activo: true,
    empleadoID: 'EMP-001',
    sucursalActiva: 0,
    roles: [{ id: 1, nombre: 'Administrador' }],
    sucursalesRoles: [
      { sucursal: 0, nombreSucursal: 'Orense Plaza', roles: [{ id: 1, nombre: 'Administrador' }] },
      { sucursal: 1, nombreSucursal: 'Hiper Romana', roles: [{ id: 1, nombre: 'Administrador' }] },
      { sucursal: 5, nombreSucursal: 'Compra', roles: [{ id: 1, nombre: 'Administrador' }] },
    ],
    pantallas,
    permisosEspeciales: [
      { id: 1, codigo: 'PUEDE_ANULAR', valor: true },
      { id: 2, codigo: 'PUEDE_POSTEAR', valor: true },
    ],
  };
}

function crearSesionMock(): AuthSesionDTO {
  return {
    accessToken: 'ey.mock.access.token.' + Date.now(),
    refreshToken: 'ey.mock.refresh.token.' + Date.now(),
    accessTokenExpiraEn: new Date(Date.now() + 3600000).toISOString(),
    refreshTokenExpiraEn: new Date(Date.now() + 86400000).toISOString(),
    sucursalActiva: 0,
    sucursalesPermitidas: SUCURSALES,
    usuario: crearUsuarioMock(),
  };
}

function empresa() {
  return 'SOLUGEN SRL';
}

function generarFechaYYYYMMDD(diasAtras: number): string {
  const d = new Date(Date.now() - diasAtras * 86400000);
  return d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') + '000000';
}

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

const proveedores = [
  'INDUSTRIAS NACIONALES SRL', 'DISTRIBUIDORA DEL CARIBE SA', 'SUPLIDORA GENERAL SRL',
  'COMERCIALIZADORA INTERNACIONAL', 'PROVEEDORA DEL ESTE SA', 'ALIMENTOS DEL PAIS SRL',
  'MATERIALES Y SUMINISTROS SA', 'LOGISTICA INTEGRAL SRL',
];
const clientesList = [
  'ALMACENES FLORES SA', 'FARMACIA POPULAR SRL', 'COLMADO JUAN',
  'SUPERMERCADO CENTRAL SA', 'DISTRIBUIDORA HERMANOS', 'TIENDA EL AHORRO',
  'FERRETERIA LA UNION', 'PANIFICADORA MODERNA',
];
const conceptos = [
  'COMPRA NACIONAL', 'VENTA AL POR MAYOR', 'VENTA AL DETAL', 'TRANSFERENCIA SUCURSAL',
  'DEVOLUCION MERCADERIA', 'AJUSTE INVENTARIO', 'VENTA ESPECIAL',
];
const almacenes = ['ALMACEN PRINCIPAL', 'ALMACEN SUCURSAL', 'ALMACEN FRIGORIFICO'];
const articulosBase = [
  'ARROZ BLANCO 5LB', 'HARINA DE MAIZ 32OZ', 'ACEITE VEGETAL 16OZ', 'AZUCAR REFINADA 5LB',
  'SALSA TOMATE 400G', 'FRIJOLES ROJOS 2LB', 'ATUN EN AGUA 180G', 'PASTA DENTAL 100ML',
  'JABON LAVANDA 200G', 'DETERGENTE LIQUIDO 1L', 'LECHE EN POLVO 800G', 'GALLETAS DULCES 200G',
];

function entradaMock(i: number) {
  const estados = [0, 0, 0, 1, 1, 2, 3, 4, 5, 6];
  return {
    id: i + 1,
    fecha: generarFechaYYYYMMDD(i * 2),
    documento: `ENP-${String(1000 + i).padStart(6, '0')}`,
    entidad: toTitleCase(proveedores[i % proveedores.length]),
    diasCredito: 30,
    concepto: toTitleCase(conceptos[i % conceptos.length]),
    almacenOrigen: '',
    almacenDestino: almacenes[i % almacenes.length],
    ordenCompra: i % 3 === 0 ? `OC-${String(500 + i).padStart(6, '0')}` : '',
    referencia: i % 4 === 0 ? `REF-${i}` : '',
    ncf: i % 2 === 0 ? `E31${String(10000000 + i).slice(0, 8)}` : '',
    total: Math.round(Math.random() * 500000 + 10000) / 100,
    estado: estados[i % estados.length],
    periodo: i < 3 ? 6 : new Date().getMonth() + 1,
  };
}

function salidaMock(i: number) {
  const estados = [0, 0, 1, 1, 2, 3, 4, 5, 6];
  return {
    id: i + 1,
    fecha: generarFechaYYYYMMDD(i * 2 + 1),
    documento: `SAP-${String(2000 + i).padStart(6, '0')}`,
    entidad: toTitleCase(clientesList[i % clientesList.length]),
    diasCredito: 15,
    concepto: toTitleCase(conceptos[(i + 2) % conceptos.length]),
    almacenOrigen: almacenes[i % almacenes.length],
    almacenDestino: '',
    ordenCompra: '',
    referencia: i % 3 === 0 ? `SOL-${i}` : '',
    ncf: '',
    total: Math.round(Math.random() * 300000 + 5000) / 100,
    estado: estados[i % estados.length],
    periodo: i < 2 ? 6 : new Date().getMonth() + 1,
  };
}

function devCompraMock(i: number) {
  const estados = [0, 0, 1, 1, 3, 6];
  return {
    id: i + 1,
    fecha: generarFechaYYYYMMDD(i * 3),
    documento: `DVC-${String(3000 + i).padStart(6, '0')}`,
    entidad: toTitleCase(proveedores[i % proveedores.length]),
    diasCredito: 30,
    concepto: 'DEVOLUCION COMPRA',
    almacenOrigen: almacenes[i % almacenes.length],
    almacenDestino: '',
    ordenCompra: '',
    referencia: i % 2 === 0 ? `ENP-${String(1000 + i * 2).padStart(6, '0')}` : '',
    total: Math.round(Math.random() * 100000 + 1000) / 100,
    estado: estados[i % estados.length],
    periodo: new Date().getMonth() + 1,
  };
}

function transferenciaMock(i: number) {
  const estados = [0, 1, 1, 3, 6];
  return {
    id: i + 1,
    fecha: generarFechaYYYYMMDD(i * 2),
    documento: `TRP-${String(4000 + i).padStart(6, '0')}`,
    entidad: empresa(),
    diasCredito: 0,
    concepto: 'TRANSFERENCIA ENTRE ALMACENES',
    almacenOrigen: almacenes[0],
    almacenDestino: almacenes[(i + 1) % almacenes.length],
    ordenCompra: '',
    referencia: '',
    ncf: '',
    total: Math.round(Math.random() * 200000 + 5000) / 100,
    estado: estados[i % estados.length],
    periodo: new Date().getMonth() + 1,
  };
}

function devVentaMock(i: number) {
  const estados = [0, 0, 1, 1, 2, 3, 6];
  return {
    id: i + 1,
    fecha: generarFechaYYYYMMDD(i * 3),
    documento: `DEV-${String(5000 + i).padStart(6, '0')}`,
    entidad: toTitleCase(clientesList[i % clientesList.length]),
    diasCredito: 0,
    concepto: 'DEVOLUCION VENTA',
    almacen: almacenes[i % almacenes.length],
    ordenCompra: '',
    referencia: i % 3 === 0 ? `FAC-${String(7000 + i).padStart(6, '0')}` : '',
    ncf: i % 2 === 0 ? `E31${String(20000000 + i).slice(0, 8)}` : '',
    ncfModificado: '',
    turnoID: '',
    tipoDocumento: 'DEV',
    total: Math.round(Math.random() * 80000 + 1000) / 100,
    estado: estados[i % estados.length],
    periodo: new Date().getMonth() + 1,
  };
}

function cotizacionMock(i: number) {
  const estados = [0, 0, 1, 1, 2, 3];
  return {
    id: i + 1,
    fechaDocumento: generarFechaYYYYMMDD(i * 3),
    tipoDocumento: 1,
    noDocumento: `COTV-${String(6000 + i).padStart(6, '0')}`,
    cliente: toTitleCase(clientesList[i % clientesList.length]),
    concepto: toTitleCase(conceptos[(i + 1) % conceptos.length]),
    total: Math.round(Math.random() * 400000 + 5000) / 100,
    estado: estados[i % estados.length],
    periodo: new Date().getMonth() + 1,
    nota: i % 3 === 0 ? 'Cotización válida por 15 días' : undefined,
  };
}

function facturaMock(i: number) {
  const estados = [0, 0, 1, 1, 4, 5, 3, 6];
  return {
    id: i + 1,
    fecha: generarFechaYYYYMMDD(i * 2),
    documento: `FAC-${String(7000 + i).padStart(6, '0')}`,
    entidad: toTitleCase(clientesList[i % clientesList.length]),
    diasCredito: 30,
    concepto: toTitleCase(conceptos[i % conceptos.length]),
    almacen: almacenes[i % almacenes.length],
    ordenCompra: i % 5 === 0 ? `OC-${String(500 + i).padStart(6, '0')}` : '',
    referencia: '',
    ncf: i % 2 === 0 ? `E31${String(30000000 + i).slice(0, 8)}` : '',
    ncfModificado: '',
    turnoID: i % 3 === 0 ? `TURNO-${i}` : '',
    tipoDocumento: 'FAC',
    total: Math.round(Math.random() * 900000 + 10000) / 100,
    estado: estados[i % estados.length],
    periodo: i < 2 ? 6 : new Date().getMonth() + 1,
  };
}

function facturaPOSMock(i: number) {
  const estados = [1, 1, 1, 3, 4, 5];
  return {
    id: i + 1,
    fecha: generarFechaYYYYMMDD(i * 1),
    documento: `PV-${String(8000 + i).padStart(6, '0')}`,
    entidad: toTitleCase(clientesList[i % clientesList.length]),
    diasCredito: 0,
    concepto: 'VENTA POS',
    almacen: almacenes[i % almacenes.length],
    ordenCompra: '',
    referencia: '',
    ncf: `E31${String(40000000 + i).slice(0, 8)}`,
    ncfModificado: '',
    turnoID: `TURNO-${Math.floor(i / 5) + 1}`,
    tipoDocumento: 'PV',
    total: Math.round(Math.random() * 50000 + 500) / 100,
    estado: estados[i % estados.length],
    periodo: new Date().getMonth() + 1,
  };
}

function detalleArticulos() {
  const count = Math.floor(Math.random() * 4) + 3;
  const items = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    let idx;
    do { idx = Math.floor(Math.random() * articulosBase.length); } while (used.has(idx));
    used.add(idx);
    const nombre = articulosBase[idx];
    const cant = Math.round(Math.random() * 100 + 1);
    const costo = Math.round(Math.random() * 500 + 50) / 100;
    items.push({
      id: i + 1,
      codigo: `ART-${String(100 + idx).padStart(4, '0')}`,
      articulo: toTitleCase(nombre),
      referencia: '',
      cantidad: cant,
      costo,
      precio: Math.round(costo * 1.3 * 100) / 100,
      subTotal: Math.round(cant * costo * 100) / 100,
      descuento: i === 0 ? Math.round(cant * costo * 0.05 * 100) / 100 : 0,
      porcentajeDescuento: i === 0 ? 5 : 0,
      impuestos: i % 3 === 0 ? Math.round(cant * costo * 0.18 * 100) / 100 : 0,
      porcentajeImpuesto: i % 3 === 0 ? 18 : 0,
      total: Math.round(cant * costo * (i === 0 ? 0.95 : 1) * (i % 3 === 0 ? 1.18 : 1) * 100) / 100,
      tipoArticulo: 'Producto',
      nota: i === count - 1 ? 'Artículo nuevo' : undefined,
      fechaVencimiento: i % 2 === 0 ? '20261231' : undefined,
      flete: 0,
      costoActual: costo,
      ajustado: false,
      cantidadBonificable: 0,
    });
  }
  return items;
}

function asientosContables(montoTotal: number) {
  return [
    {
      id: 1,
      cuentaContable: { noCuenta: '1.01.01.001', nombre: 'EFECTIVO EN CAJA' },
      descripcion: 'Registro contable por compra',
      tipoAsiento: 'D',
      monto: Math.round(montoTotal * 100) / 100,
      generado: true,
    },
    {
      id: 2,
      cuentaContable: { noCuenta: '5.01.01.001', nombre: 'COSTO DE VENTA' },
      descripcion: 'Costo de mercadería',
      tipoAsiento: 'C',
      monto: Math.round(montoTotal * 100) / 100,
      generado: true,
    },
  ];
}

function logsMock() {
  const acciones = ['Crear', 'Modificar', 'Aplicar'];
  return acciones.map((_, i) => ({
    fecha: generarFechaYYYYMMDD(i * 2 + 1),
    usuario: { nombre: 'Administrador Demo', nombreUsuario: 'ADMIN' },
    accion: i,
    descripcion: `Acción: ${acciones[i]}`,
    estacion: 'SERVER-01',
  }));
}

function entradaDetalleMock(id: number) {
  const base = entradaMock(id - 1);
  const detalles = detalleArticulos();
  const subTotal = detalles.reduce((s, d) => s + d.subTotal, 0);
  const descuento = detalles.reduce((s, d) => s + d.descuento, 0);
  const impuestos = detalles.reduce((s, d) => s + d.impuestos, 0);
  const total = detalles.reduce((s, d) => s + d.total, 0);
  const provNombre = proveedores[(id - 1) % proveedores.length];

  return {
    id,
    fechaDocumento: base.fecha,
    tipoDocumento: 1,
    noDocumento: base.documento,
    estado: base.estado,
    periodo: base.periodo,
    ncf: base.ncf,
    ncfModificado: '',
    referencia: base.referencia,
    nota: 'Entrada de almacén registrada correctamente.',
    diasCredito: 30,
    subTotal: Math.round(subTotal * 100) / 100,
    descuento: Math.round(descuento * 100) / 100,
    impuestos: Math.round(impuestos * 100) / 100,
    retenciones: 0,
    total: Math.round(total * 100) / 100,
    tasa: 1,
    entidad: { nombre: toTitleCase(provNombre), codigo: `SUP-${String(id).padStart(3, '0')}`, identificacion: `12345678${String(id).padStart(3, '0')}`, telefono: '809-555-0101', direccion: 'Av. Principal #123, Santo Domingo' },
    concepto: { nombre: toTitleCase(conceptos[(id - 1) % conceptos.length]), codigo: `CON-${(id - 1) % conceptos.length + 1}` },
    moneda: { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
    almacen: { nombre: almacenes[(id - 1) % almacenes.length], codigo: `ALM-${(id - 1) % almacenes.length + 1}` },
    suplidor: { nombre: toTitleCase(provNombre), codigo: `SUP-${String(id).padStart(3, '0')}`, telefono: '809-555-0101', direccion: 'Av. Principal #123, Santo Domingo' },
    sucursal: { nombre: 'Orense Plaza', codigo: 'SUC-001', identificacion: '123456789', telefono: '809-555-0000', direccion: 'Av. Sucursal' },
    ordenCompra: base.ordenCompra ? { id, noDocumento: base.ordenCompra } : { id: 0, noDocumento: '' },
    detalles,
    asientos: asientosContables(total),
    logs: logsMock(),
  };
}

function detalleGenerico(id: number, articulos: ReturnType<typeof detalleArticulos>, total: number, tipoDoc: string, nombreDoc: string) {
  return {
    id,
    fechaDocumento: generarFechaYYYYMMDD(id * 2),
    tipoDocumento: 1,
    noDocumento: `${tipoDoc}-${String(1000 + id).padStart(6, '0')}`,
    estado: id % 5,
    periodo: new Date().getMonth() + 1,
    ncf: id % 2 === 0 ? `E31${String(10000000 + id).slice(0, 8)}` : '',
    ncfModificado: '',
    referencia: '',
    nota: nombreDoc + ' registrada.',
    diasCredito: 30,
    subTotal: Math.round(total * 0.85 * 100) / 100,
    descuento: Math.round(total * 0.03 * 100) / 100,
    impuestos: Math.round(total * 0.18 * 100) / 100,
    retenciones: 0,
    total: Math.round(total * 100) / 100,
    tasa: 1,
    entidad: { nombre: toTitleCase(clientesList[id % clientesList.length]), codigo: `CLI-${String(id).padStart(3, '0')}`, identificacion: `98765432${String(id).padStart(3, '0')}`, telefono: '809-555-0202', direccion: 'Calle Secundaria #456' },
    concepto: { nombre: toTitleCase(conceptos[id % conceptos.length]), codigo: `CON-${id % conceptos.length + 1}` },
    moneda: { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
    almacen: { nombre: almacenes[id % almacenes.length], codigo: `ALM-${id % almacenes.length + 1}` },
    detalles: articulos,
    asientos: asientosContables(total),
    logs: logsMock(),
  };
}

function generarLista<T>(generator: (i: number) => T, count: number): T[] {
  return Array.from({ length: count }, (_, i) => generator(i));
}

const ENTRADAS = generarLista(entradaMock, 20);
const SALIDAS = generarLista(salidaMock, 18);
const DEV_COMPRAS = generarLista(devCompraMock, 12);
const TRANSFERENCIAS = generarLista(transferenciaMock, 10);
const DEV_VENTAS = generarLista(devVentaMock, 14);
const COTIZACIONES = generarLista(cotizacionMock, 12);
const FACTURAS = generarLista(facturaMock, 22);
const FACTURAS_POS = generarLista(facturaPOSMock, 15);

function extractParam(url: string | undefined, regex: RegExp): string | null {
  if (!url) return null;
  const path = url.replace(/^https?:\/\/[^/]+\/api/, '');
  const m = path.match(regex);
  return m ? m[1] : null;
}

export function setupMocks() {
  const mock = new MockAdapter(apiClient, { delayResponse: 200 });

  const sesion = crearSesionMock();
  const sesionBody = { isSuccess: true, data: sesion, errorMessage: '' };

  mock.onPost('/auth/login').reply(200, sesionBody);
  mock.onPost('/auth/refresh').reply(200, sesionBody);
  mock.onPost('/auth/cambiar-clave').reply(200, { isSuccess: true, data: null, errorMessage: '' });

  mock.onGet('/app/configuracion-inicial').reply(200, {
    isSuccess: true,
    data: {
      familias: [
        { id: 1, nombre: 'ALIMENTOS', codigo: 'ALI' },
        { id: 2, nombre: 'BEBIDAS', codigo: 'BEB' },
        { id: 3, nombre: 'LIMPIADORES', codigo: 'LIM' },
        { id: 4, nombre: 'CUIDADO PERSONAL', codigo: 'CUI' },
      ],
      medidas: [
        { id: 1, nombre: 'UNIDAD', codigo: 'UND' },
        { id: 2, nombre: 'LIBRA', codigo: 'LB' },
        { id: 3, nombre: 'KILOGRAMO', codigo: 'KG' },
        { id: 4, nombre: 'GALON', codigo: 'GL' },
        { id: 5, nombre: 'LITRO', codigo: 'LT' },
      ],
      documentos: [
        { id: 1, nombre: 'FACTURA CLIENTE', codigo: 'FAC' },
        { id: 2, nombre: 'ENTRADA ALMACEN', codigo: 'ENP' },
        { id: 3, nombre: 'SALIDA ALMACEN', codigo: 'SAP' },
        { id: 4, nombre: 'FACTURA POS', codigo: 'PV' },
        { id: 5, nombre: 'DEVOLUCION COMPRA', codigo: 'DVC' },
        { id: 6, nombre: 'TRANSFERENCIA', codigo: 'TRP' },
      ],
      tiposDocumento: [
        { id: 1, nombre: 'FACTURA CONSUMIDOR FINAL', codigo: 'CF' },
        { id: 2, nombre: 'FACTURA CREDITO FISCAL', codigo: 'CF' },
        { id: 3, nombre: 'NOTA DE CREDITO', codigo: 'NC' },
      ],
      tipoEntidades: [
        { id: 1, nombre: 'CLIENTE', codigo: 'CLI' },
        { id: 2, nombre: 'PROVEEDOR', codigo: 'SUP' },
        { id: 3, nombre: 'AMBOS', codigo: 'AMB' },
      ],
      sucursales: SUCURSALES.map(s => ({ id: s.sucursal, nombre: s.nombre, codigo: `SUC-${s.sucursal}` })),
      tipoDevolucionCaliente: null,
    },
    errorMessage: '',
  });

  function okResp(data: any): [number, any] {
    return [200, { isSuccess: true, data, errorMessage: '' }];
  }
  const okVoid: [number, any] = [200, { isSuccess: true, data: null, errorMessage: '' }];

  function handleList(data: any[]): [number, any] {
    return okResp(data);
  }

  function handleDetail(url: string | undefined, generator: (id: number) => any, defaultData: any[]): [number, any] {
    const idStr = extractParam(url, /\/(\d+)$/);
    const id = idStr ? parseInt(idStr, 10) : 1;
    if (id <= defaultData.length && defaultData[id - 1]) {
      return okResp(generator(id));
    }
    return okResp(generator(1));
  }

  mock.onGet(new RegExp('/api/ENP/\\d+/filtrar')).reply(() => handleList(ENTRADAS));
  mock.onGet(new RegExp('/api/ENP/\\d+/\\d+$')).reply((c) => handleDetail(c.url!, entradaDetalleMock, ENTRADAS));
  mock.onGet(new RegExp('/api/ENP/\\d+$')).reply(() => handleList(ENTRADAS));
  mock.onPost(new RegExp('/api/ENP/\\d+/anular')).reply(200, okVoid);
  mock.onDelete(new RegExp('/api/ENP/\\d+/eliminar/\\d+')).reply(200, okVoid);

  mock.onGet(new RegExp('/api/SAP/\\d+/filtrar')).reply(() => handleList(SALIDAS));
  mock.onGet(new RegExp('/api/SAP/\\d+/\\d+$')).reply((c) => handleDetail(c.url!, (id) => detalleGenerico(id, detalleArticulos(), SALIDAS[id - 1]?.total || 50000, 'SAP', 'Salida de Almacén'), SALIDAS));
  mock.onGet(new RegExp('/api/SAP/\\d+$')).reply(() => handleList(SALIDAS));
  mock.onPost(new RegExp('/api/SAP/\\d+/anular')).reply(200, okVoid);
  mock.onDelete(new RegExp('/api/SAP/\\d+/eliminar/\\d+')).reply(200, okVoid);

  mock.onGet(new RegExp('/api/DVC/\\d+/filtrar')).reply(() => handleList(DEV_COMPRAS));
  mock.onGet(new RegExp('/api/DVC/\\d+/\\d+$')).reply((c) => handleDetail(c.url!, (id) => detalleGenerico(id, detalleArticulos(), DEV_COMPRAS[id - 1]?.total || 30000, 'DVC', 'Devolución de Compra'), DEV_COMPRAS));
  mock.onGet(new RegExp('/api/DVC/\\d+$')).reply(() => handleList(DEV_COMPRAS));
  mock.onPost(new RegExp('/api/DVC/\\d+/anular')).reply(200, okVoid);
  mock.onDelete(new RegExp('/api/DVC/\\d+/eliminar/\\d+')).reply(200, okVoid);

  mock.onGet(new RegExp('/api/TRP/\\d+/filtrar')).reply(() => handleList(TRANSFERENCIAS));
  mock.onGet(new RegExp('/api/TRP/\\d+/\\d+$')).reply((c) => handleDetail(c.url!, (id) => detalleGenerico(id, detalleArticulos(), TRANSFERENCIAS[id - 1]?.total || 40000, 'TRP', 'Transferencia'), TRANSFERENCIAS));
  mock.onGet(new RegExp('/api/TRP/\\d+$')).reply(() => handleList(TRANSFERENCIAS));
  mock.onPut(new RegExp('/api/TRP/\\d+/aplicar/\\d+')).reply(200, okVoid);
  mock.onPut(new RegExp('/api/TRP/desaplicar')).reply(200, okVoid);

  mock.onGet(new RegExp('/api/DEV/\\d+/filtrar')).reply(() => handleList(DEV_VENTAS));
  mock.onGet(new RegExp('/api/DEV/\\d+/\\d+$')).reply((c) => handleDetail(c.url!, (id) => detalleGenerico(id, detalleArticulos(), DEV_VENTAS[id - 1]?.total || 25000, 'DEV', 'Devolución de Venta'), DEV_VENTAS));
  mock.onGet(new RegExp('/api/DEV/\\d+$')).reply(() => handleList(DEV_VENTAS));
  mock.onPut(new RegExp('/api/DEV/\\d+/aplicar/\\d+')).reply(200, okVoid);
  mock.onPut(new RegExp('/api/DEV/desaplicar')).reply(200, okVoid);
  mock.onPost(new RegExp('/api/DEV/\\d+/postear')).reply(200, okVoid);
  mock.onPost(new RegExp('/api/DEV/\\d+/postearMovimiento')).reply(200, okVoid);

  mock.onGet(new RegExp('/api/COTV/\\d+/filtrar')).reply(() => handleList(COTIZACIONES));
  mock.onGet(new RegExp('/api/COTV/\\d+/\\d+$')).reply((c) => {
    const idStr = extractParam(c.url!, /\/(\d+)$/);
    const id = idStr ? parseInt(idStr, 10) : 1;
    const base = COTIZACIONES[id - 1] || COTIZACIONES[0];
    return okResp({
      ...detalleGenerico(id, detalleArticulos(), base?.total || 60000, 'COTV', 'Cotización'),
      cliente: base?.cliente || '',
    });
  });
  mock.onGet(new RegExp('/api/COTV/\\d+$')).reply(() => handleList(COTIZACIONES));
  mock.onPut(new RegExp('/api/COTV/\\d+/aplicar/\\d+')).reply(200, okVoid);
  mock.onPut(new RegExp('/api/COTV/desaplicar')).reply(200, okVoid);
  mock.onPost(new RegExp('/api/COTV/\\d+/postear')).reply(200, okVoid);

  mock.onGet(new RegExp('/api/FAC/\\d+/filtrar')).reply(() => handleList(FACTURAS));
  mock.onGet(new RegExp('/api/FAC/\\d+/\\d+$')).reply((c) => handleDetail(c.url!, (id) => detalleGenerico(id, detalleArticulos(), FACTURAS[id - 1]?.total || 100000, 'FAC', 'Factura Cliente'), FACTURAS));
  mock.onGet(new RegExp('/api/FAC/\\d+$')).reply(() => handleList(FACTURAS));
  mock.onGet(new RegExp('/api/FAC/total/\\d+')).reply(() => okResp(1500000.00));
  mock.onPost(new RegExp('/api/FAC/\\d+/anular')).reply(200, okVoid);
  mock.onPut(new RegExp('/api/FAC/\\d+/aplicar/\\d+')).reply(200, okVoid);
  mock.onDelete(new RegExp('/api/FAC/\\d+/Eliminar/\\d+')).reply(200, okVoid);

  mock.onGet(new RegExp('/api/PV/\\d+/filtrar')).reply(() => handleList(FACTURAS_POS));
  mock.onGet(new RegExp('/api/PV/\\d+/\\d+$')).reply((c) => handleDetail(c.url!, (id) => detalleGenerico(id, detalleArticulos(), FACTURAS_POS[id - 1]?.total || 20000, 'PV', 'Factura POS'), FACTURAS_POS));
  mock.onGet(new RegExp('/api/PV/\\d+$')).reply(() => handleList(FACTURAS_POS));
  mock.onGet(new RegExp('/api/PV/total/\\d+')).reply(() => okResp(750000.00));
  mock.onPost(new RegExp('/api/PV/\\d+/Anular')).reply(200, okVoid);
  mock.onPut(new RegExp('/api/PV/\\d+/aplicar/\\d+')).reply(200, okVoid);

  mock.onGet(new RegExp('/api/reportes/')).reply((_config) => {
    const encoder = new TextEncoder();
    const pdfBytes = encoder.encode('%PDF-1.4 mock binary');
    return [200, pdfBytes, { 'Content-Type': 'application/pdf' }];
  });

  mock.onAny().passThrough();

  console.log('%c[MOCK] Axios mock adapter activado — todos los endpoints usan datos falsos.', 'color: #556ee6; font-weight: bold;');
  console.log(`%c[MOCK] Usuario: ADMIN / Sesión: ${sesion.usuario.nombre}`, 'color: #34c38f;');
}
