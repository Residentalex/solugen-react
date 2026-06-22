import React from 'react';
import { Modal, Input, Tag, Typography, Spin } from 'antd';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import BuscadorGlobalSeccion from './BuscadorGlobalSeccion';
import BuscadorGlobalResultado from './BuscadorGlobalResultado';
import { productoApi } from '../../api/productoApi';
import { transaccionApi } from '../../api/transaccionApi';
import { entidadApi } from '../../api/entidadApi';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

const ICONOS_SECCION: Record<string, string> = {
  productos: 'ðŸ“¦',
  clientes: 'ðŸ‘¤',
  proveedores: 'ðŸ­',
  entidades: 'ðŸ¢',
  documentos: 'ðŸ“„',
};

interface BuscadorGlobalModalProps {
  open: boolean;
  onClose: () => void;
}

const CHIPS_ACCESO_RAPIDO = [
  { label: 'ðŸ·ï¸  Productos', key: 'productos' as const },
  { label: 'ðŸ‘¤  Clientes', key: 'MCliente' as const },
  { label: 'ðŸ¢  Entidades', key: 'entidades' as const },
  { label: 'ðŸ“„  Documentos', key: 'documentos' as const },
  { label: 'ðŸ”—  MÃ³dulos', key: '' as const },
];

const PREFIJOS_DOC = ['ENP', 'SAP', 'FAC', 'PV', 'RDE', 'ORC', 'DVC', 'TRP', 'DEV', 'COTV', 'NCSUP', 'NCCLI', 'NDSUP', 'NDCLI', 'DBA', 'RI', 'SPA'];

const DOC_PREFIX_ROUTE: Record<string, string> = {
  ENP: 'FENP',   // Entrada de AlmacÃ©n
  SAP: 'FSAP',   // Salida de AlmacÃ©n
  FAC: 'FFAC',   // Factura Cliente
  PV: 'FPV',     // Factura POS
  RDE: 'FRDE',   // Factura Suplidor
  ORC: 'FORC',   // Orden de Compra
  DVC: 'FDVC',   // DevoluciÃ³n de Compra
  TRP: 'FTRP',   // Transferencia de AlmacÃ©n
  DEV: 'FDEV',   // DevoluciÃ³n de Venta
  COTV: 'FCotizacion', // Cotizaciones
  NCSUP: 'FNCSUP', // Nota CrÃ©dito CXP
  NCCLI: 'FNCCLI', // Nota CrÃ©dito CXC
  NDSUP: 'FNDSUP', // Nota DÃ©bito CXP
  NDCLI: 'FNDCLI', // Nota DÃ©bito CXC
  DBA: 'FDBASUP',  // DistribuciÃ³n Balance
  RI: 'FRI',      // Recibo Ingreso
  SPA: 'FSPA',   // Solicitud de Pago
};

const BuscadorGlobalModal: React.FC<BuscadorGlobalModalProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);
  const setSucursalActiva = useAuthStore((s: any) => s.setSucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const [searchText, setSearchText] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [searching, setSearching] = React.useState(false);
  const [resultados, setResultados] = React.useState<Record<string, any[]> | null>(null);
  const [searched, setSearched] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const [filtrosActivos, setFiltrosActivos] = React.useState<Set<string>>(new Set());

  // Resetear estado al cerrar
  React.useEffect(() => {
    if (!open) {
      setSearchText('');
      setActiveIndex(-1);
      setResultados(null);
      setSearched(false);
      setFiltrosActivos(new Set());
    }
  }, [open]);

  // Responsive width
  const [modalWidth, setModalWidth] = React.useState<number | string>(640);
  const [hideBadge, setHideBadge] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w <= 480) {
        setModalWidth('95vw');
        setHideBadge(true);
      } else if (w <= 768) {
        setModalWidth('90vw');
        setHideBadge(false);
      } else {
        setModalWidth(640);
        setHideBadge(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // BÃºsqueda real contra APIs con resultados incrementales y agrupados por entidad
  const handleSearch = React.useCallback(async (texto: string) => {
    const q = texto.trim().replace(/\*/g, '%');
    const tieneFiltros = filtrosActivos.size > 0;

    // Detectar prefijo de tipo de documento (ej: "enp-89603" â†’ tipoDoc=ENP, valor=89603)
    let docPrefijoTipo = '';
    let docPrefijoValor = q;
    const prefijoMatch = q.match(/^([a-z]+)-(.*)/i);
    if (prefijoMatch) {
      const posiblePrefijo = prefijoMatch[1].toUpperCase();
      if (PREFIJOS_DOC.includes(posiblePrefijo)) {
        docPrefijoTipo = posiblePrefijo;
        docPrefijoValor = prefijoMatch[2].replace(/\*/g, '%');
      }
    }

    if (q.length < 2 && !tieneFiltros) return;

    // Cancelar bÃºsqueda anterior
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setSearching(true);
    setActiveIndex(-1);
    setSearched(true);
    setResultados(null);

    const sucursales = sucursalesPermitidas.length > 0
      ? sucursalesPermitidas.map((s) => s.sucursal)
      : [4];

    const productosMap = new Map<string, any>();
    const documentosMap = new Map<string, any>();
    const entidadesMap = new Map<string, any>();
    const promesas: Promise<void>[] = [];

    // Determinar quÃ© tipos buscar segÃºn filtros activos
    const buscarTodo = filtrosActivos.size === 0;
    const buscarProductos = buscarTodo || filtrosActivos.has('productos');
    const buscarDocumentos = buscarTodo || filtrosActivos.has('documentos');
    const buscarEntidades = buscarTodo || filtrosActivos.has('entidades');

    // Helper para convertir maps a record y actualizar estado (mÃ¡x. 10 total)
    const actualizarResultados = () => {
      const r: Record<string, any[]> = {};
      let count = 0;
      const MAX = 10;
      const pArray = Array.from(productosMap.values());
      const dArray = Array.from(documentosMap.values());
      const eArray = Array.from(entidadesMap.values());
      if (pArray.length > 0 && count < MAX) {
        r.productos = pArray.slice(0, Math.min(pArray.length, MAX - count));
        count += r.productos.length;
      }
      if (dArray.length > 0 && count < MAX) {
        r.documentos = dArray.slice(0, Math.min(dArray.length, MAX - count));
        count += r.documentos.length;
      }
      if (eArray.length > 0 && count < MAX) {
        r.entidades = eArray.slice(0, Math.min(eArray.length, MAX - count));
      }
      setResultados(Object.keys(r).length > 0 ? r : null);
    };

    for (const suc of sucursales) {
      const sucNombre = sucursalesPermitidas.find(s => s.sucursal === suc)?.nombre || `Suc. ${suc}`;

      // --- PRODUCTOS (solo si no hay filtro o el filtro es productos) ---
      if (buscarProductos) {
        const agregarProducto = (item: any, origen: string) => {
          const key = item.codigo;
          const existing = productosMap.get(key);
          if (existing) {
            if (!existing.sucursales.includes(sucNombre)) existing.sucursales.push(sucNombre);
          } else {
            const subtitulo = origen === 'codigo'
              ? `CÃ³digo: ${key}`
              : origen === 'referencia'
                ? `Ref: ${item.referencia || item.refFabricante || 'N/A'}`
                : `Equiv: ${q}`;
            productosMap.set(key, {
              id: `prod-${key}`,
              titulo: item.nombre,
              subtitulo,
              tag: `${(item.precio || 0).toLocaleString('es-DO')}`,
              tagColor: 'green',
              tipo: 'producto',
              sucursales: [sucNombre],
              sucursalCodigo: suc,
            });
          }
        };

        promesas.push(
          productoApi.buscarPorCampo(suc, 'codigo', q, 10)
            .then(items => { items.forEach(i => agregarProducto(i, 'codigo')); actualizarResultados(); })
            .catch(() => {})
        );

        promesas.push(
          productoApi.buscarPorCampo(suc, 'referencia', q, 10)
            .then(items => { items.forEach(i => agregarProducto(i, 'referencia')); actualizarResultados(); })
            .catch(() => {})
        );

        promesas.push(
          productoApi.buscarPorCampo(suc, 'equival', q, 10)
            .then(items => { items.forEach(i => agregarProducto(i, 'equival')); actualizarResultados(); })
            .catch(() => {})
        );
      }

      // --- DOCUMENTOS (solo si no hay filtro o el filtro es documentos) ---
      if (buscarDocumentos) {
        const agregarDocumento = (item: any, origen: string) => {
          const key = `${item.id}`;
          const existing = documentosMap.get(key);
          if (existing) {
            if (!existing.sucursales.includes(sucNombre)) existing.sucursales.push(sucNombre);
          } else {
            const subtitulo = origen === 'documento'
              ? `${item.concepto || ''} Â· ${item.entidad || ''} Â· ${item.fecha ? new Date(item.fecha).toLocaleDateString('es-DO') : ''}`
              : origen === 'ncf'
                ? `NCF: ${item.ncf || 'N/A'} Â· ${item.concepto || ''}`
                : `Doc Ref: ${item.referencia || 'N/A'} Â· ${item.entidad || ''}`;
            documentosMap.set(key, {
              id: `doc-${key}`,
              titulo: item.documento,
              subtitulo,
              tag: `${(item.total || 0).toLocaleString('es-DO')}`,
              tagColor: 'purple',
              tipo: 'documento',
              sucursales: [sucNombre],
              sucursalCodigo: suc,
            });
          }
        };

        promesas.push(
          transaccionApi.buscarPorCampo(suc, 'documento', docPrefijoValor, 10, docPrefijoTipo || undefined)
            .then(items => { items.forEach(i => agregarDocumento(i, 'documento')); actualizarResultados(); })
            .catch(() => {})
        );

        promesas.push(
          transaccionApi.buscarPorCampo(suc, 'ncf', q, 10)
            .then(items => { items.forEach(i => agregarDocumento(i, 'ncf')); actualizarResultados(); })
            .catch(() => {})
        );

        promesas.push(
          transaccionApi.buscarPorCampo(suc, 'doc_ref', q, 10)
            .then(items => { items.forEach(i => agregarDocumento(i, 'doc_ref')); actualizarResultados(); })
            .catch(() => {})
        );
      }

      // --- ENTIDADES (solo si no hay filtro o el filtro es entidades) ---
      if (buscarEntidades) {
        const agregarEntidad = (item: any) => {
          const key = item.codigo || item.id || `${Math.random()}`;
          const existing = entidadesMap.get(key);
          if (existing) {
            if (!existing.sucursales.includes(sucNombre)) existing.sucursales.push(sucNombre);
          } else {
            entidadesMap.set(key, {
              id: `ent-${key}`,
              titulo: item.nombre || '',
              subtitulo: `RNC: ${item.identificacion || 'N/A'} Â· ${item.descripcion || item.entidad || ''}`,
              tag: item.codigo || '',
              tagColor: 'orange',
              tipo: 'entidad',
              sucursales: [sucNombre],
              sucursalCodigo: suc,
            });
          }
        };

        promesas.push(
          entidadApi.buscar(suc, q, 10)
            .then(items => { items.forEach(i => agregarEntidad(i)); actualizarResultados(); })
            .catch(() => {})
        );
      }
    }

    await Promise.allSettled(promesas);

    // Limitar a mÃ¡ximo 10 resultados en total
    const MAX_TOTAL = 10;
    let totalCount = 0;
    const productosArray = Array.from(productosMap.values());
    const docsArray = Array.from(documentosMap.values());
    const entidadesArray = Array.from(entidadesMap.values());

    const finalR: Record<string, any[]> = {};
    if (productosArray.length > 0 && totalCount < MAX_TOTAL) {
      const take = Math.min(productosArray.length, MAX_TOTAL - totalCount);
      finalR.productos = productosArray.slice(0, take);
      totalCount += take;
    }
    if (docsArray.length > 0 && totalCount < MAX_TOTAL) {
      const take = Math.min(docsArray.length, MAX_TOTAL - totalCount);
      finalR.documentos = docsArray.slice(0, take);
      totalCount += take;
    }
    if (entidadesArray.length > 0 && totalCount < MAX_TOTAL) {
      const take = Math.min(entidadesArray.length, MAX_TOTAL - totalCount);
      finalR.entidades = entidadesArray.slice(0, take);
      totalCount += take;
    }
    setResultados(Object.keys(finalR).length > 0 ? finalR : null);
    setSearching(false);
  }, [sucursalesPermitidas, filtrosActivos]);

  // Lista plana para navegaciÃ³n con teclado
  const allResults = React.useMemo(() => {
    if (!resultados) return [];
    const items: Array<{ id: string; section: string }> = [];
    for (const [seccion, lista] of Object.entries(resultados)) {
      for (const item of lista) {
        items.push({ id: item.id, section: seccion });
      }
    }
    return items;
  }, [resultados]);

  // Calcular contadores por secciÃ³n
  const contadores = React.useMemo(() => {
    if (!resultados) return {};
    const c: Record<string, number> = {};
    for (const [seccion, items] of Object.entries(resultados)) {
      c[seccion] = items.length;
    }
    return c;
  }, [resultados]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchText.length >= 2 || filtrosActivos.size > 0) {
        handleSearch(searchText);
      }
    }
  };

  const handleItemClick = (item: any) => {
    // Validar permisos: Â¿tiene acceso a la pantalla?
    const tieneAcceso = (codigoPantalla: string): boolean => {
      return usuario?.pantallas?.some((p: any) => p.codigo?.toUpperCase() === codigoPantalla?.toUpperCase()) ?? false;
    };

    // Cambiar a la sucursal donde se encontrÃ³
    if (item.sucursalCodigo !== undefined) {
      setSucursalActiva(item.sucursalCodigo);
    }

    if (item.tipo === 'producto') {
      if (tieneAcceso('MProducto')) {
        navigate(`/MProducto/${item.codigoReal || ''}`);
      }
    } else if (item.tipo === 'cliente') {
      if (tieneAcceso('MCliente')) {
        navigate('/MCliente');
      }
    } else if (item.tipo === 'proveedor') {
      if (tieneAcceso('MProveedor')) {
        navigate('/MProveedor');
      }
    } else if (item.tipo === 'documento') {
      const prefijo = (item.titulo || '').split('-')[0];
      const ruta = DOC_PREFIX_ROUTE[prefijo] || 'FENP';
      if (tieneAcceso(ruta)) {
        const transacid = (item.id || '').replace('doc-', '');
        navigate(`/${ruta}/${transacid}`);
      }
    } else if (item.tipo === 'entidad') {
      if (tieneAcceso('MCliente')) {
        const codigoEntidad = (item.id || '').replace('ent-', '');
        navigate(`/MCliente/${codigoEntidad}`);
      }
    }
    onClose();
  };

  const handleClear = () => {
    setSearchText('');
    setActiveIndex(-1);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={modalWidth}
      centered
      closable={false}
      destroyOnHidden
      className="paces-search-modal"
      style={{ top: 80 }}
    >
      <Input
        placeholder="Â¿QuÃ© estÃ¡s buscando?"
        size="large"
        variant="borderless"
        prefix={<SearchOutlined style={{ color: 'var(--paces-text-secondary)', fontSize: 20 }} />}
        suffix={
          searchText.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SearchOutlined
                style={{ color: 'var(--paces-text-secondary)', fontSize: 16, cursor: 'pointer' }}
                onClick={() => handleSearch(searchText)}
              />
              <CloseOutlined
                style={{ color: 'var(--paces-text-secondary)', fontSize: 16, cursor: 'pointer' }}
                onClick={handleClear}
              />
            </div>
          ) : !hideBadge ? (
            <kbd
              style={{
                background: 'var(--paces-bg-layout)',
                color: 'var(--paces-text-secondary)',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                fontFamily: 'monospace',
              }}
            >
              Ctrl+K
            </kbd>
          ) : null
        }
        style={{
          height: 56,
          fontSize: 16,
          borderRadius: 12,
          paddingLeft: 16,
          background: 'var(--paces-topbar-search-bg)',
        }}
        autoFocus
        value={searchText}
        onChange={(e) => {
          setSearchText(e.target.value);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
      />

      {/* Indicador de filtros activos */}
      {filtrosActivos.size > 0 && (
        <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {Array.from(filtrosActivos).map((f) => (
            <Tag
              key={f}
              closable
              onClose={() => {
                setFiltrosActivos((prev) => { const n = new Set(prev); n.delete(f); return n; });
                setResultados(null);
                setSearched(false);
              }}
              style={{ borderRadius: 6 }}
            >
              {f === 'productos' ? 'Productos' : f === 'entidades' ? 'Entidades' : 'Documentos'}
            </Tag>
          ))}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {filtrosActivos.size === 1 ? 'Filtro activo. Escribe y presiona Enter para buscar.' : 'Filtros activos. Escribe y presiona Enter para buscar.'}
          </Text>
        </div>
      )}

      {/* Estado vacÃ­o: sin texto */}
      {searchText.length === 0 && !searched && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
            {CHIPS_ACCESO_RAPIDO.map((item) => (
              <Tag
                key={item.label}
                style={{
                  cursor: 'pointer',
                  padding: '4px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  margin: 0,
                  ...(filtrosActivos.has(item.key) ? {
                    background: 'var(--paces-primary)',
                    color: '#fff',
                  } : {}),
                }}
                onClick={() => {
                  // Toggle filtro sin ejecutar bÃºsqueda
                  if (item.key === 'productos' || item.key === 'entidades' || item.key === 'documentos') {
                    setFiltrosActivos((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.key)) next.delete(item.key);
                      else next.add(item.key);
                      return next;
                    });
                  } else if (item.key === 'MCliente') {
                    navigate('/MCliente');
                    onClose();
                  } else {
                    onClose();
                  }
                }}
              >
                {item.label}
              </Tag>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Presiona Ctrl+K para abrir en cualquier momento
            </Text>
          </div>
        </>
      )}

      {/* Escribiendo pero menos de 2 caracteres */}
      {searchText.length > 0 && searchText.length < 2 && !searching && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text type="secondary">Escribe al menos 2 caracteres...</Text>
        </div>
      )}

      {/* Spinner de bÃºsqueda - compacto */}
      {searching && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="small" />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Buscando en {sucursalesPermitidas.length || 1} sucursal(es)...
            </Text>
          </div>
        </div>
      )}

      {/* Sin resultados */}
      {searched && !searching && !resultados && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>ðŸ”</div>
          <Text type="secondary">Sin resultados para &quot;{searchText}&quot;</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Revisa la ortografÃ­a o prueba con tÃ©rminos mÃ¡s generales
          </Text>
        </div>
      )}

      {/* Con resultados */}
      {resultados &&
        Object.entries(resultados).map(([seccion, items]) => (
          <BuscadorGlobalSeccion
            key={seccion}
            icono={ICONOS_SECCION[seccion] || 'ðŸ“„'}
            nombre={seccion.charAt(0).toUpperCase() + seccion.slice(1)}
            contador={contadores[seccion] || 0}
          >
            {items.map((item: any) => {
              const globalIdx = allResults.findIndex((r) => r.id === item.id);
              return (
                <div key={item.id} data-index={globalIdx}>
                  <BuscadorGlobalResultado
                    icono={ICONOS_SECCION[seccion] || 'ðŸ“„'}
                    titulo={item.titulo}
                    subtitulo={item.subtitulo}
                    tag={item.tag}
                    tagColor={item.tagColor}
                    isActive={activeIndex === globalIdx}
                    onClick={() => handleItemClick(item)}
                    sucursales={item.sucursales}
                  />
                </div>
              );
            })}
          </BuscadorGlobalSeccion>
        ))}
    </Modal>
  );
};

export default BuscadorGlobalModal;
