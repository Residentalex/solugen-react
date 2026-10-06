import { Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AjusteConteoDTO } from '../../types/procesableConteo';
import { formatCurrency, formatNumber, toTitleCase } from '../../utils/formats';
import { CLASE_AUMENTA, CLASE_DISMINUYE } from './ajusteResumen';

const { Text } = Typography;

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
    render: (valor: string) => <Text strong>{valor}</Text>,
  },
  {
    title: 'Artículo',
    dataIndex: 'articulo',
    key: 'articulo',
    width: 240,
    ellipsis: true,
    render: (valor: string) => <Text>{toTitleCase(valor || '') || '-'}</Text>,
  },
  {
    title: 'Familia',
    dataIndex: 'familia',
    key: 'familia',
    width: 150,
    ellipsis: true,
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
    render: (valor: number) => <Text>{formatNumber(valor ?? 0)}</Text>,
  },
  {
    title: 'Sistema',
    dataIndex: 'cantidadSistema',
    key: 'cantidadSistema',
    width: 110,
    align: 'right',
    render: (valor: number) => <Text>{formatNumber(valor ?? 0)}</Text>,
  },
  {
    title: 'Ajuste',
    dataIndex: 'cantidadAjuste',
    key: 'cantidadAjuste',
    width: 120,
    align: 'right',
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
    title: 'Costo unit.',
    dataIndex: 'costoUnitario',
    key: 'costoUnitario',
    width: 130,
    align: 'right',
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
    title: 'Conteos origen',
    dataIndex: 'conteosOrigen',
    key: 'conteosOrigen',
    width: 220,
    render: (valor: string[]) => (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {(valor || []).join(', ') || '-'}
      </Text>
    ),
  },
];