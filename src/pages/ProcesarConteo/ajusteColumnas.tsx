import { Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AjusteConteoDTO } from '../../types/procesableConteo';
import { formatCurrency, formatNumber, toTitleCase } from '../../utils/formats';
import { CLASE_AUMENTA, CLASE_DISMINUYE } from './ajusteResumen';

const { Text } = Typography;

const compararTexto = (a: string | null | undefined, b: string | null | undefined) =>
  (a || '').localeCompare(b || '', 'es', { sensitivity: 'base' });

const compararNumero = (a: number | null | undefined, b: number | null | undefined) =>
  (a ?? 0) - (b ?? 0);

/** Valor de la linea resultante despues de aplicar el ajuste. */
const cantidadFinal = (registro: AjusteConteoDTO) => registro.cantidadContada ?? 0;

/** Valor (cantidad final x costo unitario) de la linea. */
const costoFinal = (registro: AjusteConteoDTO) =>
  cantidadFinal(registro) * (registro.costoUnitario ?? 0);

/**
 * Columnas de la vista de ajuste de conteo.
 *
 * Se declara en su propio archivo (sin componentes exportados) porque la usan
 * tanto la tabla como la rutina de exportacion a Excel.
 */
export const columnasAjuste: ColumnsType<AjusteConteoDTO> = [
  {
    title: 'Código',
    dataIndex: 'codigo',
    key: 'codigo',
    width: 130,
    fixed: 'left',
    sorter: (a, b) => (a.codigo || '').localeCompare(b.codigo || '', 'es', { numeric: true }),
    render: (valor: string) => <Text strong>{valor}</Text>,
  },
  {
    title: 'Artículo',
    dataIndex: 'articulo',
    key: 'articulo',
    width: 240,
    ellipsis: true,
    sorter: (a, b) => compararTexto(a.articulo, b.articulo),
    render: (valor: string) => <Text>{toTitleCase(valor || '') || '-'}</Text>,
  },
  {
    title: 'Familia',
    dataIndex: 'familia',
    key: 'familia',
    width: 150,
    ellipsis: true,
    sorter: (a, b) => compararTexto(a.familia, b.familia),
    render: (valor: string) => (
      <Text type="secondary">{toTitleCase(valor || '') || '-'}</Text>
    ),
  },
  {
    title: 'Contada',
    dataIndex: 'cantidadContada',
    key: 'cantidadContada',
    width: 110,
    align: 'right',
    sorter: (a, b) => compararNumero(a.cantidadContada, b.cantidadContada),
    render: (valor: number) => <Text>{formatNumber(valor ?? 0)}</Text>,
  },
  {
    title: 'Sistema',
    dataIndex: 'cantidadSistema',
    key: 'cantidadSistema',
    width: 110,
    align: 'right',
    sorter: (a, b) => compararNumero(a.cantidadSistema, b.cantidadSistema),
    render: (valor: number) => <Text>{formatNumber(valor ?? 0)}</Text>,
  },
  {
    title: 'Ajuste',
    dataIndex: 'cantidadAjuste',
    key: 'cantidadAjuste',
    width: 120,
    align: 'right',
    sorter: (a, b) => compararNumero(a.cantidadAjuste, b.cantidadAjuste),
    render: (valor: number) => {
      if (!valor) return <Text type="secondary">0</Text>;
      return (
        <Text strong className={valor > 0 ? CLASE_AUMENTA : CLASE_DISMINUYE}>
          {valor > 0 ? '+' : ''}
          {formatNumber(valor)}
        </Text>
      );
    },
  },
  {
    title: 'Cantidad final',
    dataIndex: 'cantidadFinal',
    key: 'cantidadFinal',
    width: 130,
    align: 'right',
    sorter: (a, b) => compararNumero(cantidadFinal(a), cantidadFinal(b)),
    render: (_: unknown, registro) => <Text strong>{formatNumber(cantidadFinal(registro))}</Text>,
  },
  {
    title: 'Costo unit.',
    dataIndex: 'costoUnitario',
    key: 'costoUnitario',
    width: 130,
    align: 'right',
    sorter: (a, b) => compararNumero(a.costoUnitario, b.costoUnitario),
    render: (valor: number, registro) => (
      <Tooltip title={`Origen del costo: ${registro.referencia}`}>
        <Text>{formatCurrency(valor ?? 0)}</Text>
      </Tooltip>
    ),
  },
  {
    title: 'Total ajuste',
    dataIndex: 'totalAjuste',
    key: 'totalAjuste',
    width: 140,
    align: 'right',
    sorter: (a, b) => compararNumero(a.totalAjuste, b.totalAjuste),
    render: (valor: number) => {
      if (!valor) return <Text type="secondary">{formatCurrency(0)}</Text>;
      return (
        <Text strong className={valor > 0 ? CLASE_AUMENTA : CLASE_DISMINUYE}>
          {formatCurrency(valor)}
        </Text>
      );
    },
  },
  {
    title: 'Costo final',
    dataIndex: 'costoFinal',
    key: 'costoFinal',
    width: 150,
    align: 'right',
    sorter: (a, b) => compararNumero(costoFinal(a), costoFinal(b)),
    render: (_: unknown, registro) => <Text strong>{formatCurrency(costoFinal(registro))}</Text>,
  },
];
