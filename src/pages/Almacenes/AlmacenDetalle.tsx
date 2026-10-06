import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Input,
  Row,
  Table,
  Tabs,
  Typography,
} from 'antd';
import { Select } from '../../components/Select';
import type { ColumnsType } from 'antd/es/table';
import { FileExcelOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { almacenApi } from '../../api/almacenApi';
import { movimientoApi, type MovimientoFiltros } from '../../api/movimientoApi';
import type { MovimientoDTO } from '../../types/movimiento';
import type { AlmacenDTO, ExistenciaDTO } from '../../types/entradaAlmacen';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { formatNumber, toTitleCase } from '../../utils/formats';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const DIAS_POR_DEFECTO = 30;

const AlmacenDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const { screenCode } = useScreenConfig('MAlmacen');

  const [almacen, setAlmacen] = useState<AlmacenDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  const [existencias, setExistencias] = useState<ExistenciaDTO[]>([]);
  const [totalExistencias, setTotalExistencias] = useState(0);
  const [paginaExistencias, setPaginaExistencias] = useState(1);
  const [pageSizeExistencias, setPageSizeExistencias] = useState(25);
  const [busquedaExistencias, setBusquedaExistencias] = useState('');
  const [loadingExistencias, setLoadingExistencias] = useState(false);

  const [documentos, setDocumentos] = useState<MovimientoDTO[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [rangoFechas, setRangoFechas] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(DIAS_POR_DEFECTO, 'day'),
    dayjs(),
  ]);
  const [tipoDocumento, setTipoDocumento] = useState<string | undefined>(undefined);

  const cargarAlmacen = useCallback(async () => {
    if (!codigo || sucursalActiva === undefined) return;

    setLoading(true);
    setLoadingError(false);
    try {
      const datos = await almacenApi.obtenerPorCodigo(sucursalActiva, codigo);
      if (!datos) {
        setLoadingError(true);
        return;
      }
      setAlmacen(datos);
      setPageTitleOverride(`${datos.idExterno || datos.codigo} - ${toTitleCase(datos.nombre || '')}`);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [codigo, sucursalActiva, setPageTitleOverride]);

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride, screenCode]);

  useEffect(() => {
    cargarAlmacen();
  }, [cargarAlmacen]);

  const cargarExistencias = useCallback(async () => {
    if (!codigo || sucursalActiva === undefined) return;

    setLoadingExistencias(true);
    try {
      const params = {
        cantidad: pageSizeExistencias,
        salto: (paginaExistencias - 1) * pageSizeExistencias,
        busqueda: busquedaExistencias || undefined,
      };
      const [datos, total] = await Promise.all([
        almacenApi.obtenerExistencias(sucursalActiva, codigo, params),
        almacenApi.obtenerTotalExistencias(sucursalActiva, codigo, {
          busqueda: busquedaExistencias || undefined,
        }),
      ]);
      setExistencias(datos || []);
      setTotalExistencias(total ?? 0);
    } catch {
      setExistencias([]);
      setTotalExistencias(0);
    } finally {
      setLoadingExistencias(false);
    }
  }, [codigo, sucursalActiva, paginaExistencias, pageSizeExistencias, busquedaExistencias]);

  const cargarDocumentos = useCallback(async () => {
    if (!codigo || sucursalActiva === undefined) return;

    setLoadingDocumentos(true);
    try {
      const params: MovimientoFiltros = {
        desde: rangoFechas[0].format('YYYYMMDDHHmmss'),
        hasta: rangoFechas[1].format('YYYYMMDDHHmmss'),
        almacen: codigo,
        cantidad: 200,
        salto: 0,
        existencia: 'false',
      };
      if (tipoDocumento) params.tipoDoc = tipoDocumento;

      const datos = await movimientoApi.obtenerDetallado(sucursalActiva, params);
      setDocumentos(datos || []);
    } catch {
      setDocumentos([]);
    } finally {
      setLoadingDocumentos(false);
    }
  }, [codigo, sucursalActiva, rangoFechas, tipoDocumento]);

  useEffect(() => {
    cargarExistencias();
  }, [cargarExistencias]);

  useEffect(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  const handleExportarExistencias = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    exportToExcel({
      fileName: `Existencias_${almacen?.idExterno || codigo}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Existencias',
      companyName,
      columnHeaders: ['Código', 'Artículo', 'Cantidad', 'Cantidad Alterna', 'Costo', 'Valor'],
      dataRows: existencias.map((e) => [
        e.codigo,
        e.producto,
        e.cantidad,
        e.cantidadAlterna ?? 0,
        e.costo,
        Math.round(e.cantidad * e.costo * 100) / 100,
      ]),
    });
  };

  const columnsExistencias: ColumnsType<ExistenciaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 110,
      fixed: 'left',
      render: (valor: string) => <Text style={{ fontFamily: 'monospace' }}>{valor || '-'}</Text>,
    },
    {
      title: 'Artículo',
      dataIndex: 'producto',
      key: 'producto',
      render: (valor: string) => toTitleCase(valor || ''),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 120,
      align: 'right',
      render: (valor: number) => (
        <Text strong style={{ color: valor < 0 ? '#ff4d4f' : undefined }}>
          {formatNumber(valor)}
        </Text>
      ),
    },
    {
      title: 'Cant. Alterna',
      dataIndex: 'cantidadAlterna',
      key: 'cantidadAlterna',
      width: 130,
      align: 'right',
      responsive: ['lg'],
      render: (valor?: number) => formatNumber(valor ?? 0),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 130,
      align: 'right',
      render: (valor: number) => formatNumber(valor),
    },
    {
      title: 'Valor',
      key: 'valor',
      width: 140,
      align: 'right',
      render: (_: unknown, registro: ExistenciaDTO) => (
        <Text strong>{formatNumber(Math.round(registro.cantidad * registro.costo * 100) / 100)}</Text>
      ),
    },
  ];

  const columnsDocumentos: ColumnsType<MovimientoDTO> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (valor: string) => (valor ? dayjs(valor).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipoDocumento',
      key: 'tipoDocumento',
      width: 90,
      render: (valor: string) => <Text style={{ fontFamily: 'monospace' }}>{valor || '-'}</Text>,
    },
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 130,
      render: (valor: string) => <Text strong>{valor || '-'}</Text>,
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      width: 160,
      responsive: ['lg'],
      render: (valor?: string) => toTitleCase(valor || ''),
    },
    {
      title: 'Artículo',
      dataIndex: 'articulo',
      key: 'articulo',
      render: (valor: string, registro: MovimientoDTO) => (
        <div>
          <div>{toTitleCase(valor || '')}</div>
          {registro.codigo && (
            <div className="paces-text-secondary" style={{ fontSize: 11 }}>
              {registro.codigo}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 120,
      align: 'right',
      render: (valor: number) => (
        <Text style={{ color: valor < 0 ? '#ff4d4f' : undefined }}>{formatNumber(valor)}</Text>
      ),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 130,
      align: 'right',
      responsive: ['md'],
      render: (valor: number) => formatNumber(valor),
    },
  ];

  const tabExistencias = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Buscar por código o artículo..."
          allowClear
          onSearch={(valor) => {
            setBusquedaExistencias(valor);
            setPaginaExistencias(1);
          }}
          style={{ width: '100%', maxWidth: 400 }}
          prefix={<SearchOutlined className="paces-text-icon" />}
        />
        <div style={{ flex: 1 }} />
        <Button icon={<FileExcelOutlined />} onClick={handleExportarExistencias} disabled={existencias.length === 0}>
          Exportar Excel
        </Button>
        <Button icon={<ReloadOutlined />} onClick={cargarExistencias} loading={loadingExistencias} />
      </div>

      <Table<ExistenciaDTO>
        columns={columnsExistencias}
        dataSource={existencias}
        rowKey="codigo"
        size="small"
        loading={loadingExistencias}
        className="paces-border-top paces-list-table"
        scroll={{ x: 900 }}
        rowClassName="paces-row-hover"
        pagination={{
          current: paginaExistencias,
          pageSize: pageSizeExistencias,
          total: totalExistencias,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
          onChange: (pagina, limite) => {
            setPaginaExistencias(pagina);
            setPageSizeExistencias(limite);
          },
          showTotal: (total) => `${formatNumber(total)} registros`,
        }}
        summary={(filas) => {
          const totalExistencia = filas.reduce((suma, fila) => suma + (fila.cantidad || 0), 0);
          const totalValor = filas.reduce(
            (suma, fila) => suma + (fila.cantidad || 0) * (fila.costo || 0),
            0
          );
          return (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right" colSpan={2}>
                  <Text strong>{formatNumber(totalExistencia)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong>{formatNumber(Math.round(totalValor * 100) / 100)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </div>
  );

  const tabDocumentos = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <RangePicker
          value={rangoFechas}
          format="DD/MM/YYYY"
          onChange={(valor) => {
            if (valor && valor[0] && valor[1]) setRangoFechas([valor[0], valor[1]]);
          }}
          allowClear={false}
        />
        <Select
          placeholder="Tipo de documento"
          allowClear
          style={{ width: 220 }}
          value={tipoDocumento}
          onChange={valor => setTipoDocumento(valor)}
          options={['ENP', 'RDE', 'TRP', 'DVC', 'DVCV', 'FAC', 'PV'].map((tipo) => ({
            value: tipo,
            label: tipo,
          }))}
        />
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} onClick={cargarDocumentos} loading={loadingDocumentos} />
      </div>

      <Table<MovimientoDTO>
        columns={columnsDocumentos}
        dataSource={documentos}
        rowKey={(registro, indice) => `${registro.documento}-${registro.codigo}-${indice}`}
        size="small"
        loading={loadingDocumentos}
        className="paces-border-top paces-list-table"
        scroll={{ x: 900 }}
        rowClassName="paces-row-hover"
        pagination={{ pageSize: 25, showSizeChanger: false, showTotal: (total) => `${total} registros` }}
      />
    </div>
  );

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MAlmacen"
      loading={loading}
      mensajeLoading="Cargando almacén..."
      loadingError={loadingError}
      mensajeError="Error al cargar detalle de almacén"
      onRecargar={cargarAlmacen}
      dataDisponible={!!almacen}
      onEditar={() => navigate(`/MAlmacen/${codigo}/editar`)}
    >
      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card title="Datos Generales" className="paces-card" style={{ marginBottom: 16 }}>
            <Descriptions
              bordered
              size="small"
              column={1}
              styles={{ content: { background: 'transparent' } }}
            >
              <Descriptions.Item label="Código">
                <Text style={{ fontFamily: 'monospace' }}>{almacen?.idExterno || almacen?.codigo}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Nombre">{toTitleCase(almacen?.nombre || '')}</Descriptions.Item>
              <Descriptions.Item label="Cuenta Contable">
                {almacen?.numeroCuenta ? (
                  <Text style={{ fontFamily: 'monospace' }}>
                    {almacen.numeroCuenta} {almacen.cuentaContable ? `- ${almacen.cuentaContable}` : ''}
                  </Text>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha Inicial">
                {almacen?.fechaInicial ? dayjs(almacen.fechaInicial).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha Cierre">
                {almacen?.fechaCierre ? dayjs(almacen.fechaCierre).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Contacto">{almacen?.contacto || '-'}</Descriptions.Item>
              <Descriptions.Item label="Teléfono">{almacen?.telefono || '-'}</Descriptions.Item>
              <Descriptions.Item label="Dirección">{almacen?.direccion || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card className="paces-card">
            <Tabs
              defaultActiveKey="existencias"
              type="card"
              style={{ borderRadius: 8, padding: '0 16px' }}
              items={[
                {
                  key: 'existencias',
                  label: `Existencias (${formatNumber(totalExistencias)})`,
                  children: tabExistencias,
                },
                {
                  key: 'documentos',
                  label: 'Documentos',
                  children: tabDocumentos,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </DetalleCatalogoLayout>
  );
};

export default AlmacenDetalle;