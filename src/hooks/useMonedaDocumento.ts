import { useCallback, useEffect, useMemo } from 'react';
import type { FormInstance } from 'antd';
import { useCompanyStore } from '../stores/companyStore';
import { getMonedaSucursalActiva } from '../utils/moneda';
import type { MonedaDTO } from '../types/contabilidad';

/** Documento transaccional con las propiedades navegacion `moneda` y `tasa`. */
type DocumentoConMoneda = { moneda?: MonedaDTO | null; tasa?: number };

/**
 * Catalogo de monedas + selector reutilizable para formularios de documentos.
 *
 * La moneda se persiste en CTRANSAC.CODMON a partir de `moneda.codigo`, por eso el
 * formulario guarda el objeto completo del catalogo en `documento.moneda` y no solo el texto.
 * El campo del form es un espejo: `form.moneda` guarda el codigo seleccionado.
 *
 * El catalogo se lee del store de companyStore, que lo descarga una vez por sucursal al
 * iniciar sesion (ver `MainLayout` y `companyStore.fetchMonedas`). El `fetchMonedas` de
 * aqui es solo una red de seguridad para cuando el formulario se monta antes de que
 * termine la carga inicial.
 *
 * `monedaDelConcepto` es solo de lectura: mientras el documento no existe todavia
 * (modo crear) el selector refleja la moneda del concepto, y si tampoco hay concepto
 * la moneda de la compania activa, que es el valor por defecto del sistema.
 */
export function useMonedaDocumento<T extends DocumentoConMoneda>(
  sucursal: number,
  form: FormInstance,
  documento: T | null | undefined,
  setDocumento: (updater: (prev: T | null) => T | null) => void,
  monedaDelConcepto?: MonedaDTO | null,
) {
  const monedas = useCompanyStore((s) => (sucursal == null ? undefined : s.data.monedas[sucursal]));
  const monedasCargando = useCompanyStore((s) => (sucursal == null ? false : s.monedasCargando.includes(sucursal)));
  const fetchMonedas = useCompanyStore((s) => s.fetchMonedas);
  const loading = !!monedasCargando;

  useEffect(() => {
    // OJO: Sucursal.OrensePlaza es 0, hay que comparar por null/undefined y no por
    // falsy o el catalogo nunca se carga en esa sucursal.
    if (sucursal === null || sucursal === undefined) return;
    if (monedas && monedas.length) return;
    void fetchMonedas(sucursal);
  }, [sucursal, monedas, fetchMonedas]);

  const lista = useMemo<MonedaDTO[]>(() => monedas ?? [], [monedas]);

  const seleccionarMoneda = useCallback((codigo: string) => {
    const encontrada = lista.find((m) => m.codigo === codigo);
    if (!encontrada) return;

    // El tipo de cambio solo aplica en divisa: al volver a la moneda de la empresa la
    // tasa regresa a 1, de lo contrario quedaria una tasa de la moneda anterior
    // bloqueada y sin posibilidad de corregirla.
    const esMonedaEmpresa = encontrada.codigo === getMonedaSucursalActiva().codigo;

    form.setFieldsValue({
      moneda: encontrada.codigo,
      ...(esMonedaEmpresa ? { tasa: 1 } : null),
    });

    // En modo crear el documento aun no existe (`data` es null), por eso se crea el
    // objeto: `construirDTO` lee `data.moneda` y de lo contrario perderia la seleccion.
    setDocumento((prev) => ({
      ...(prev ?? ({} as T)),
      moneda: encontrada,
      ...(esMonedaEmpresa ? { tasa: 1 } : null),
    }));
  }, [form, lista, setDocumento]);

  /**
   * Ant Design muestra el valor crudo cuando el `value` no existe en `options`, por eso
   * el valor por defecto tiene que estar siempre en la lista. Si el codigo de la moneda
   * de la compania no viene en el catalogo de la sucursal se agrega con el nombre del
   * store, para que el campo muestre "PESOS DOMINICANOS" y no "DOP".
   */
  const opciones = useMemo<MonedaDTO[]>(() => {
    const codigo = getMonedaSucursalActiva().codigo;
    if (!codigo || lista.some((m) => m.codigo === codigo)) return lista;
    return [
      { codigo, nombre: getMonedaSucursalActiva().nombre, simbolo: getMonedaSucursalActiva().simbolo },
      ...lista,
    ];
  }, [lista]);

  /**
   * Tasa a cargar para una moneda del catalogo. En la moneda de la empresa el tipo de
   * cambio es siempre 1: se ignora el valor que traiga el maestro MONEDAS.TASA.
   */
  const tasaParaMoneda = useCallback((moneda?: MonedaDTO | null) => {
    if (!moneda) return 1;
    return moneda.codigo === getMonedaSucursalActiva().codigo ? 1 : (moneda.tasa ?? 1);
  }, []);

  /**
   * Moneda efectiva del documento: la del documento cargado, la del concepto mientras no
   * exista, y la de la compania activa como valor por defecto.
   */
  const codigoActual = documento?.moneda?.codigo ?? monedaDelConcepto?.codigo ?? getMonedaSucursalActiva().codigo;

  /**
   * La tasa solo aplica a documentos en divisa. En la moneda de la empresa el tipo de
   * cambio es siempre 1, asi que el campo se muestra pero no se puede editar.
   */
  const tasaEditable = codigoActual !== getMonedaSucursalActiva().codigo;

  return {
    monedas: opciones,
    monedasLoading: loading,
    monedaCodigo: codigoActual,
    tasaEditable,
    tasaParaMoneda,
    seleccionarMoneda,
  };
}