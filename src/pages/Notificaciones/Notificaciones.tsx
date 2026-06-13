import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Modal, Descriptions } from 'antd';
import { Table, Tabs, Tag, Button, Tooltip, message, Card, Input, Empty, Row, Col, Select, Skeleton, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined, SendOutlined, CheckOutlined, ClockCircleOutlined, BellOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import PermissionGate from '../../components/PermissionGate';
import { useNotificacionesStore } from '../../stores/notificacionesStore';
import { notificacionesApi } from '../../api/notificacionesApi';
import { ticketApi } from '../../api/ticketApi';
import type { NotificacionVista } from '../../types/notificaciones';
import EnviarNotificacionModal from './EnviarNotificacionModal';
import TicketThreadModal from '../../components/TicketThreadModal';

function formatFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const tipoColor: Record<string, string> = {
  Alerta: 'gold',
  Info: 'blue',
  Error: 'red',
  Advertencia: 'orange',
  Exito: 'green',
  Ticket: 'purple',
};

const Notificaciones: React.FC = () => {
  const sucursal = useAuthStore((s: any) => s.compania);
  const usuarioID = useAuthStore((s: any) => s.usuario?.id);

  const pendientes = useNotificacionesStore((s) => s.pendientes);
  const cargando = useNotificacionesStore((s) => s.cargando);
  const cargarPendientes = useNotificacionesStore((s) => s.cargarPendientes);
  const marcarComoLeida = useNotificacionesStore((s) => s.marcarComoLeida);

  const [enviadas, setEnviadas] = useState<NotificacionVista[]>([]);
  const [loadingEnviadas, setLoadingEnviadas] = useState(false);
  const [historial, setHistorial] = useState<NotificacionVista[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [modalVisible, setModalVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [tabActiva, setTabActiva] = useState<string>(() => (location.state as any)?.tab || 'pendientes');
  const [filtroTipo, setFiltroTipo] = useState<string[]>([]);
  const [filtroModulo, setFiltroModulo] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRow, setSelectedRow] = useState<NotificacionVista | null>(null);
  const [loadingError, setLoadingError] = useState(false);
  const [verNotificacion, setVerNotificacion] = useState<NotificacionVista | null>(null);
  const [ticketModalID, setTicketModalID] = useState<number | null>(null);

  const setActiveModule = useUIStore((s: any) => s.setActiveModule);

  useEffect(() => {
    setActiveModule('notificaciones');
  }, [setActiveModule]);



  const modulosDisponibles = useMemo(() => {
    const modulos = new Set<string>();
    [...pendientes, ...enviadas, ...historial].forEach((n) => { if (n.modulo) modulos.add(n.modulo); });
    return Array.from(modulos);
  }, [pendientes, enviadas, historial]);

  const cargarEnviadas = useCallback(async () => {
    if (!sucursal || !usuarioID) return;
    setLoadingEnviadas(true);
    try {
      const data = await notificacionesApi.obtenerEnviadas(sucursal, usuarioID);
      setEnviadas(data || []);
      setLoadingError(false);
    } catch {
      setLoadingError(true);
    } finally {
      setLoadingEnviadas(false);
    }
  }, [sucursal, usuarioID]);

  const cargarHistorial = useCallback(async () => {
    if (!sucursal || !usuarioID) return;
    setLoadingHistorial(true);
    try {
      const data = await notificacionesApi.obtenerHistorial(sucursal, usuarioID);
      setHistorial(data || []);
      setLoadingError(false);
    } catch {
      setLoadingError(true);
    } finally {
      setLoadingHistorial(false);
    }
  }, [sucursal, usuarioID]);

  useEffect(() => {
    const load = async () => {
      try {
        await cargarPendientes();
        setLoadingError(false);
      } catch {
        setLoadingError(true);
      }
    };
    load();
    cargarEnviadas();
    cargarHistorial();
  }, [cargarPendientes, cargarEnviadas, cargarHistorial]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    cargarPendientes();
    if (tabActiva === 'enviadas' || tabActiva === 'historial') {
      cargarEnviadas();
    }
    cargarHistorial();
  };

  const handleTabChange = (key: string) => {
    setTabActiva(key);
    setSelectedRowKeys([]);
    setSelectedRow(null);
  };

  const handleMarcarLeida = async (notificacionUsuarioID: number) => {
    await marcarComoLeida(notificacionUsuarioID);
  };

  const handleMarcarSeleccionadas = async () => {
    try {
      await Promise.all(
        selectedRowKeys.map((key) => marcarComoLeida(key as number))
      );
      message.success(`${selectedRowKeys.length} notificaciones marcadas como leídas`);
      setSelectedRowKeys([]);
      cargarPendientes();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al marcar notificaciones');
    }
  };

  const getDataSource = () => {
    let source: NotificacionVista[];
    if (tabActiva === 'pendientes') {
      source = pendientes;
    } else if (tabActiva === 'enviadas') {
      source = enviadas;
    } else {
        source = historial;
      }

    let filtered = source;
    if (searchText) {
      const term = searchText.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.titulo.toLowerCase().includes(term) ||
          n.mensaje.toLowerCase().includes(term) ||
          n.modulo?.toLowerCase().includes(term)
      );
    }
    if (filtroTipo.length > 0) {
      filtered = filtered.filter((n) => filtroTipo.includes(n.tipo));
    }
    if (filtroModulo.length > 0) {
      filtered = filtered.filter((n) => filtroModulo.includes(n.modulo));
    }
    return filtered;
  };

  const isLoading = useMemo(() => {
    switch (tabActiva) {
      case 'pendientes': return cargando;
      case 'enviadas': return loadingEnviadas;
      case 'historial': return loadingHistorial;

      default: return false;
    }
  }, [tabActiva, cargando, loadingEnviadas, loadingHistorial]);

  const columns: ColumnsType<NotificacionVista> = [
    {
      title: 'Título',
      dataIndex: 'titulo',
      key: 'titulo',
      width: 200,
      ellipsis: true,
      render: (text: string, record) => (
        <a onClick={() => setVerNotificacion(record)} style={{ fontWeight: record.leida ? 400 : 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Mensaje',
      dataIndex: 'mensaje',
      key: 'mensaje',
      width: 280,
      ellipsis: true,
      render: (text: string) => (
        <span className="paces-text-secondary">{text}</span>
      ),
    },
    {
      title: 'Módulo',
      dataIndex: 'modulo',
      key: 'modulo',
      width: 130,
      render: (text: string) => text ? <Tag style={{ fontSize: 11 }}>{text}</Tag> : '-',
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 110,
      render: (text: string) => (
        <Tag color={tipoColor[text] || 'default'} style={{ fontSize: 11 }}>
          {text || 'Info'}
        </Tag>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaCreacion',
      key: 'fechaCreacion',
      width: 170,
      render: (text: string) => (
        <span className="paces-text-secondary" style={{ fontSize: 12 }}>
          <ClockCircleOutlined style={{ marginRight: 4, fontSize: 10 }} />
          {formatFecha(text)}
        </span>
      ),
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 100,
      render: (_, record) => (
        <Tag color={record.leida ? 'default' : 'blue'} style={{ fontSize: 11 }}>
          {record.leida ? 'Leída' : 'No leída'}
        </Tag>
      ),
    },
    ...(tabActiva === 'pendientes'
      ? [
          {
            title: 'Acciones',
            key: 'acciones',
            width: 110,
            fixed: 'right' as const,
            render: (_: any, record: NotificacionVista) => (
              !record.leida ? (
                <Tooltip title="Marcar como leída">
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={() => handleMarcarLeida(record.notificacionUsuarioID)}
                  >
                    Leer
                  </Button>
                </Tooltip>
              ) : null
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Bandeja de Notificaciones</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => navigate('/notificaciones/config')}>
            Configuración
          </Button>
          <Button onClick={() => navigate('/notificaciones/personalizadas')}>
            SQL Personalizadas
          </Button>
          <PermissionGate permisoEspecial="pe_NOTIFICACION">
            <Button type="primary" icon={<SendOutlined />} onClick={() => setModalVisible(true)}>
              Enviar Notificación
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* KPIs — estilo Dashboard */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        {[
          {
            icon: <BellOutlined />,
            cssClass: 'paces-stat-card--primary',
            iconBg: 'rgba(85, 110, 230, 0.1)',
            iconColor: 'var(--paces-primary)',
            value: pendientes.length,
            label: 'Pendientes',
            change: `${pendientes.length} sin leer`,
          },
          {
            icon: <WarningOutlined />,
            cssClass: 'paces-stat-card--warning',
            iconBg: 'rgba(241, 180, 76, 0.1)',
            iconColor: '#f0b345',
            value: pendientes.filter((n) => n.tipo === 'Alerta' || n.tipo === 'Advertencia').length,
            label: 'Alertas',
            change: 'requieren atención',
          },
          {
            icon: <CloseCircleOutlined />,
            cssClass: 'paces-stat-card--danger',
            iconBg: 'rgba(244, 106, 106, 0.1)',
            iconColor: '#f46a6a',
            value: pendientes.filter((n) => n.tipo === 'Error').length,
            label: 'Errores',
            change: 'últimos 7 días',
          },
          {
            icon: <ClockCircleOutlined />,
            cssClass: 'paces-stat-card--success',
            iconBg: 'rgba(52, 195, 143, 0.1)',
            iconColor: '#34c38f',
            value: pendientes.length + enviadas.length,
            label: 'Total',
            change: 'recibidas',
          },
        ].map((s, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <div
              className={`paces-stat-card ${s.cssClass}`}
            >
              <div className="paces-stat-icon" style={{ background: s.iconBg, color: s.iconColor }}>
                {s.icon}
              </div>
              <div>
                <div className="paces-stat-value">{s.value}</div>
                <p className="paces-stat-label">{s.label}</p>
                <div className="paces-stat-change">{s.change}</div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Error banner */}
      {loadingError && (
        <Alert
          message="Error al cargar notificaciones"
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

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        {/* Toolbar interna */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar por título, mensaje o módulo..."
              allowClear
              onSearch={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                  handleSearch('');
                }
              }}
              style={{ flex: 1, minWidth: 200, maxWidth: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              mode="multiple"
              placeholder="Tipo"
              allowClear
              style={{ minWidth: 120, maxWidth: 200 }}
              value={filtroTipo}
              onChange={setFiltroTipo}
              options={[
                { label: 'Alerta', value: 'Alerta' },
                { label: 'Info', value: 'Info' },
                { label: 'Error', value: 'Error' },
                { label: 'Advertencia', value: 'Advertencia' },
                { label: 'Éxito', value: 'Exito' },
                { label: 'Ticket', value: 'Ticket' },
              ]}
            />
            <Select
              mode="multiple"
              placeholder="Módulo"
              allowClear
              style={{ minWidth: 120, maxWidth: 200 }}
              value={filtroModulo}
              onChange={setFiltroModulo}
              options={modulosDisponibles.map((m) => ({ label: m, value: m }))}
            />
            <Select
              style={{ width: 65 }}
              value={pageSize}
              onChange={(v) => { setPageSize(v); }}
              options={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
            />
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>

        {/* Barra contextual de selección masiva */}
        {selectedRowKeys.length > 0 && tabActiva === 'pendientes' && (
          <div
            style={{
              background: 'var(--paces-hover-bg)',
              border: '1px solid var(--paces-border)',
              borderRadius: 6,
              padding: '8px 16px',
              margin: '0 24px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13 }}>{selectedRowKeys.length} seleccionadas</span>
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={handleMarcarSeleccionadas}>
              Marcar como leídas
            </Button>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>
              Cancelar
            </Button>
          </div>
        )}

        <Tabs
          activeKey={tabActiva}
          onChange={handleTabChange}
          style={{ padding: '0 24px' }}
          className="paces-tabs"
          items={[
            {
              key: 'pendientes',
              label: `Pendientes (${pendientes.length})`,
              children: isLoading ? (
                <div style={{ padding: '16px 0' }}>
                  <Skeleton active paragraph={{ rows: 5 }} />
                </div>
              ) : (
                <Table<NotificacionVista>
                  columns={columns}
                  dataSource={getDataSource()}
                  rowKey="notificacionUsuarioID"
                  className="paces-border-top paces-list-table"
                  rowClassName={(record) => selectedRow?.notificacionUsuarioID === record.notificacionUsuarioID ? 'paces-row-selected' : 'paces-row-hover'}
                  onRow={(record) => ({
                    onClick: () => setSelectedRow(record),
                    style: { cursor: 'pointer' },
                  })}
                  scroll={{ x: 1100 }}
                  size="middle"
                  rowSelection={{
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                  }}
                  locale={{
                    emptyText: (
                      <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Empty description="No hay notificaciones pendientes" />
                      </div>
                    ),
                  }}
                  pagination={{
                    pageSize,
                    showSizeChanger: false,
                    showTotal: (total) => `${total} registros`,
                  }}
                />
              ),
            },
            {
              key: 'enviadas',
              label: 'Enviadas',
              children: isLoading ? (
                <div style={{ padding: '16px 0' }}>
                  <Skeleton active paragraph={{ rows: 5 }} />
                </div>
              ) : (
                <Table<NotificacionVista>
                  columns={columns}
                  dataSource={getDataSource()}
                  rowKey="id"
                  className="paces-border-top paces-list-table"
                  rowClassName={(record) => selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover'}
                  onRow={(record) => ({
                    onClick: () => setSelectedRow(record),
                    style: { cursor: 'pointer' },
                  })}
                  scroll={{ x: 1100 }}
                  size="middle"
                  locale={{
                    emptyText: (
                      <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Empty description="No has enviado notificaciones">
                          <PermissionGate permisoEspecial="pe_NOTIFICACION">
                            <Button type="primary" onClick={() => setModalVisible(true)}>
                              Enviar primera notificación
                            </Button>
                          </PermissionGate>
                        </Empty>
                      </div>
                    ),
                  }}
                  pagination={{
                    pageSize,
                    showSizeChanger: false,
                    showTotal: (total) => `${total} registros`,
                  }}
                />
              ),
            },
            {
              key: 'historial',
              label: `Historial (${historial.length})`,
              children: loadingHistorial ? (
                <div style={{ padding: '16px 0' }}>
                  <Skeleton active paragraph={{ rows: 5 }} />
                </div>
              ) : (
                <Table<NotificacionVista>
                  columns={columns}
                  dataSource={getDataSource()}
                  rowKey="notificacionUsuarioID"
                  className="paces-border-top paces-list-table"
                  rowClassName={(record) => selectedRow?.notificacionUsuarioID === record.notificacionUsuarioID ? 'paces-row-selected' : 'paces-row-hover'}
                  onRow={(record) => ({
                    onClick: () => setSelectedRow(record),
                    style: { cursor: 'pointer' },
                  })}
                  scroll={{ x: 1100 }}
                  size="middle"
                  locale={{
                    emptyText: (
                      <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Empty description="No hay notificaciones en el historial" />
                      </div>
                    ),
                  }}
                  pagination={{
                    pageSize,
                    showSizeChanger: false,
                    showTotal: (total) => `${total} registros`,
                  }}
                />
              ),
            },

          ]}
        />
      </Card>

      {/* Modal detalle de notificacion */}
      <Modal
        title={verNotificacion?.titulo || 'Notificación'}
        open={!!verNotificacion}
        onCancel={() => setVerNotificacion(null)}
        footer={null}
        width={600}
      >
        {verNotificacion && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Mensaje">
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {verNotificacion.mensaje}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Módulo">{verNotificacion.modulo || '-'}</Descriptions.Item>
              <Descriptions.Item label="Tipo">
                <Tag color={tipoColor[verNotificacion.tipo] || 'default'}>{verNotificacion.tipo || 'Info'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Fecha">{formatFecha(verNotificacion.fechaCreacion)}</Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color={verNotificacion.leida ? 'default' : 'blue'}>
                  {verNotificacion.leida ? 'Leída' : 'No leída'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {verNotificacion.tipo === 'Ticket' && verNotificacion.referenciaID && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button type="primary" onClick={() => {
                  const id = verNotificacion.referenciaID!;
                  setVerNotificacion(null);
                  setTicketModalID(id);
                }}>
                  Ver ticket
                </Button>
                <Button
                  style={{ borderColor: '#34c38f', color: '#34c38f' }}
                  onClick={async () => {
                    if (!sucursal || !verNotificacion?.referenciaID) return;
                    try {
                      await ticketApi.cambiarEstado(sucursal, verNotificacion.referenciaID, { estado: 'Resuelto', usuarioID: usuarioID! });
                      message.success('Ticket marcado como resuelto');
                      setVerNotificacion(null);
                    } catch (err: any) {
                      message.error(err?.response?.data?.errorMessage || 'Error al marcar como resuelto');
                    }
                  }}
                >
                  ✓ Resolver
                </Button>
              </div>
            )}

            {verNotificacion?.referenciaTipo === 'NotificacionSQL' && verNotificacion?.referenciaID && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button type="primary" onClick={() => {
                  const id = verNotificacion.referenciaID!;
                  setVerNotificacion(null);
                  navigate(`/visualizar-consulta/${id}`);
                }}>
                  Visualizar datos
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>

      <TicketThreadModal
        open={ticketModalID !== null}
        ticketID={ticketModalID ?? 0}
        onClose={() => {
          setTicketModalID(null);
        }}
      />

      <EnviarNotificacionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onEnviado={() => {
          cargarEnviadas();
        }}
      />
    </>
  );
};

export default Notificaciones;
