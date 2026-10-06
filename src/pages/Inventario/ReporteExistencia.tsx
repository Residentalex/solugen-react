import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { Select } from '../../components/Select';
import type { ColumnsType } from 'antd/es/table';
import {
  FileExcelOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { existenciaApi } from '../../api/existenciaApi';
import { almacenApi } from '../../api/almacenApi';
import { familiaArticuloApi } from '../../api/familiaArticuloApi';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { formatCurrency, formatNumber } from '../../utils/formats';
import type { ReporteExistenciaDTO, AlmacenDTO } from '../../types/entradaAlmacen';
import type { FamiliaArticuloDTO } from '../../types/productos';

const { Text } = Typography;

const FILAS_POR_PAGINA = 25;

const ReporteExistencia: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  const [data, setData] = useState<ReporteExistenciaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [searchText, setSearchText] = useState('');
  const [familia, setFamilia] = useState<string | undefined>(undefined);
  const [almacen, setAlmacen] = useState<string | undefined>(undefined);
  const [soloNegativas, setSoloNegativas] = useState(false);

  const [familias, setFamilias] = useState<FamiliaArticuloDTO[]>([]);
  const [almacenes, setAlmacenes] = useState<AlmacenDTO[]>([]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const salto = (page - 1) * FILAS_POR_PAGINA;
      const result = await existenciaApi.obtenerReporte(sucursalActiva, {
        cantidad: FILAS_POR_PAGINA,
        salto,
        busqueda: searchText || undefined,
        familia: familia || undefined,
        almacen: almacen || undefined,
        soloNegativas,
      });
      setData(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (err: any) {
      setLoadingError(true);
      message.error(
        err?.response?.data?.errorMessage || 'No se pudo cargar el reporte de existencia'
      );
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, page, searchText, familia, almacen, soloNegativas]);

  useEffect(() => {
    setActiveModule('RExistencia');
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    let activo = true;

    familiaArticuloApi
      .obtenerTodo(sucursalActiva)
      .then((fams) => {
        if (activo) setFamilias(fams ?? []);
      })
      .catch((err: any) => {
        message.error(
          err?.response?.data?.errorMessage || 'No se pudo cargar el catálogo de familias'
        );
      });

    return () => {
      activo = false;
    };
  }, [sucursalActiva]);

  useEffect(() => {
    let activo = true;

    almacenApi
      .obtenerListado(sucursalActiva)
      .then((alms) => {
        if (activo) setAlmacenes(alms ?? []);
      })
      .catch((err: any) => {
        message.error(
          err?.response?.data?.errorMessage || 'No se pudo cargar el catálogo de almacenes'
        );
      });

    return () => {
      activo = false;
    };
  }, [sucursalActiva]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleFamiliaChange = (value: string | undefined) => {
    setFamilia(value);
    setPage(1);
  };

  const handleAlmacenChange = (value: string | undefined) => {
    setAlmacen(value);
    setPage(1);
  };

  const handleSoloNegativasChange = (checked: boolean) => {
    setSoloNegativas(checked);
    setPage(1);
  };

  const handleRefresh = () => {
    cargarDatos();
  };

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const columnHeaders = [
      'Código',
      'Artículo',
      'Familia',
      'Cantidad',
      'Cant. Alterna',
      'Costo Unit.',
      'Valor',
      'Almacenes',
    ];
    const dataRows = data.map((r) => [
      r.codigo,
      r.descripcion,
      r.familiaNombre || '-',
      r.cantidad,
      r.cantidadAlterna,
      r.costoUnitario ?? '',
      r.valor,
      r.almacenes,
    ]);
    exportToExcel({
      fileName: `ReporteExistencia_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Existencia',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const totalesPagina = useMemo(() => {
    let cantidad = 0;
    let cantidadAlterna = 0;
    let valor = 0;
    for (const d of data) {
      cantidad += d.cantidad ?? 0;
      cantidadAlterna += d.cantidadAlterna ?? 0;
      valor += d.valor ?? 0;
    }
    return { cantidad, cantidadAlterna, valor };
  }, [data]);

  const columns: ColumnsType<ReporteExistenciaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string) => (
        <Text strong style={{ fontFamily: 'monospace' }}>
          {val || '-'}
        </Text>
      ),
    },
    {
      title: 'Artículo',
      dataIndex: 'descripcion',
      key: 'descripcion',
      ellipsis: true,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Familia',
      key: 'familia',
      render: (_: unknown, record: ReporteExistenciaDTO) =>
        record.familiaNombre ? <Tag>{record.familiaNombre}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 130,
      align: 'right',
      render: (val: number) => (
        <Text style={{ color: val < 0 ? '#f5222d' : undefined }}>{formatNumber(val)}</Text>
      ),
    },
    {
      title: 'Cant. Alterna',
      dataIndex: 'cantidadAlterna',
      key: 'cantidadAlterna',
      width: 130,
      align: 'right',
      render: (val: number) => <Text>{formatNumber(val)}</Text>,
    },
    {
      title: 'Costo Unit.',
      dataIndex: 'costoUnitario',
      key: 'costoUnitario',
      width: 130,
      align: 'right',
      render: (val: number | null) =>
        val === null || val === undefined ? (
          <Text type="secondary">-</Text>
        ) : (
          <Text>{formatCurrency(val)}</Text>
        ),
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      key: 'valor',
      width: 150,
      align: 'right',
      render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Almacenes',
      dataIndex: 'almacenes',
      key: 'almacenes',
      width: 100,
      align: 'right',
      render: (val: number) => <Text>{val ?? '-'}</Text>,
    },
  ];

  return (
    <>
      {loadingError && (
        <Alert
          message="Error al cargar el reporte de existencia"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      )}
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '16px 24px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <Input.Search
              placeholder="Buscar por código o artículo..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%', maxWidth: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              placeholder="Todas las familias"
              allowClear
              showSearch
              style={{ width: 220 }}
              value={familia}
              onChange={handleFamiliaChange}
              options={familias.map((f) => ({
                value: f.idExterno ?? '',
                label: f.nombre ?? f.idExterno ?? '',
              }))}
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <Select
              placeholder="Todos los almacenes"
              allowClear
              showSearch
              style={{ width: 220 }}
              value={almacen}
              onChange={handleAlmacenChange}
              options={almacenes.map((a) => ({
                value: a.idExterno ?? a.codigo,
                label: a.nombre,
              }))}
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Solo negativas
              </Text>
              <Switch checked={soloNegativas} onChange={handleSoloNegativasChange} />
            </Space>
            <div style={{ flex: 1 }} />
            <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>
        <Table<ReporteExistenciaDTO>
          columns={columns}
          dataSource={data}
          rowKey="codigo"
          loading={loading}
          scroll={{ x: 1300 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            current: page,
            pageSize: FILAS_POR_PAGINA,
            total,
            showSizeChanger: false,
            onChange: (p) => setPage(p),
            showTotal: (t) => `${t} registros`,
          }}
          locale={{
            emptyText: (
              <div
                style={{
                  minHeight: 160,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Empty
                  description={
                    searchText ? 'Sin resultados para la búsqueda' : 'No hay productos con existencia'
                  }
                />
              </div>
            ),
          }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} fixed="left">
                  <Text strong className="paces-text-total">
                    Totales de la página
                  </Text>
                </Table.Summary.Cell>
              <Table.Summary.Cell index={1} />
              <Table.Summary.Cell index={2} />
              <Table.Summary.Cell index={3} align="right">
                <Text strong className="paces-text-total">
                  {formatNumber(totalesPagina.cantidad)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <Text strong className="paces-text-total">
                  {formatNumber(totalesPagina.cantidadAlterna)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} />
              <Table.Summary.Cell index={6} align="right">
                <Text strong className="paces-text-total">
                  {formatCurrency(totalesPagina.valor)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </>
  );
};

export default ReporteExistencia;
