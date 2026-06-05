import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Typography, Modal, Checkbox, Button, message, Tooltip, Input } from 'antd';
import { SettingOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import EntidadImagen from '../../components/EntidadImagen';
import {
  ShoppingCartOutlined,
  TeamOutlined,
  BankOutlined,
  FileProtectOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import type { PantallaDTO } from '../../types/auth';

const { Text } = Typography;

const STORAGE_KEY = 'solugen-quick-access';

function obtenerPreferidas(usuarioID: number): string[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${usuarioID}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function guardarPreferidas(usuarioID: number, codigos: string[]) {
  localStorage.setItem(`${STORAGE_KEY}-${usuarioID}`, JSON.stringify(codigos));
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);
  const companyData = useCompanyStore((s) => s.data);

  const [configOpen, setConfigOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');

  const preferidas = obtenerPreferidas(usuario?.id ?? 0);
  const todasPantallas = usuario?.pantallas || [];
  const pantallasVisibles = preferidas.length > 0
    ? todasPantallas.filter((p) => preferidas.includes(p.codigo))
    : todasPantallas.slice(0, 6);

  useEffect(() => {
    if (configOpen) {
      setSelected(preferidas.length > 0
        ? preferidas
        : todasPantallas.slice(0, 6).map((p) => p.codigo)
      );
    }
  }, [configOpen, usuario?.id]);

  const stats = [
    {
      icon: <BankOutlined />,
      color: '#6c5ffc',
      bg: 'rgba(108,95,252,0.1)',
      value: companyData.sucursales.length,
      label: 'Sucursales',
      borderColor: '#6c5ffc',
      change: '+1',
      changeColor: '#34c38f',
    },
    {
      icon: <ShoppingCartOutlined />,
      color: '#34c38f',
      bg: 'rgba(52,195,143,0.1)',
      value: companyData.familias.length,
      label: 'Familias',
      borderColor: '#34c38f',
      change: '+3',
      changeColor: '#34c38f',
    },
    {
      icon: <FileProtectOutlined />,
      color: '#f46a6a',
      bg: 'rgba(244,106,106,0.1)',
      value: companyData.documentos.length,
      label: 'Documentos',
      borderColor: '#f46a6a',
      change: '+2',
      changeColor: '#34c38f',
    },
    {
      icon: <TeamOutlined />,
      color: '#f0b345',
      bg: 'rgba(240,179,69,0.1)',
      value: usuario?.roles?.length || 0,
      label: 'Roles',
      borderColor: '#f0b345',
      change: '0',
      changeColor: 'var(--paces-text-secondary)',
    },
  ];

  const handleGuardarConfig = useCallback(() => {
    if (!usuario) return;
    guardarPreferidas(usuario.id, selected);
    setConfigOpen(false);
    message.success('Accesos rápidos actualizados');
  }, [usuario, selected]);

  return (
    <div>
      <Row gutter={[24, 24]}>
        {stats.map((s, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <div
              className="paces-stat-card"
              style={{ borderLeftColor: s.borderColor }}
            >
              <div className="paces-stat-icon" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <div>
                <div className="paces-stat-value">{s.value}</div>
                <p className="paces-stat-label">{s.label}</p>
                <div className="paces-stat-change" style={{ color: s.changeColor }}>
                  <RiseOutlined style={{ fontSize: 11 }} /> {s.change} este mes
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 8 }}>
        <Col xs={24} lg={12}>
          <div className="paces-card">
            <div className="paces-card-header">
              <span>Información del Usuario</span>
            </div>
            <div className="paces-card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <EntidadImagen
                  tipo="USUARIO"
                  entidadID={usuario?.id ?? 0}
                  fallback={usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                  size={48}
                />
                <div>
                  <Text style={{ fontSize: 15, fontWeight: 600, display: 'block' }}>{usuario?.nombre || '-'}</Text>
                  <Text className="paces-text-secondary" style={{ fontSize: 12 }}>@{usuario?.nombreUsuario}</Text>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text strong className="paces-text-secondary" style={{ width: 140, fontSize: 13 }}>Nombre:</Text>
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.nombre || '-'}</Text>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text strong className="paces-text-secondary" style={{ width: 140, fontSize: 13 }}>Usuario:</Text>
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.nombreUsuario || '-'}</Text>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text strong className="paces-text-secondary" style={{ width: 140, fontSize: 13 }}>Empleado:</Text>
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.empleado || '-'}</Text>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Text strong className="paces-text-secondary" style={{ width: 140, fontSize: 13, lineHeight: '22px' }}>Roles:</Text>
                  <div style={{ fontSize: 13, fontWeight: 500, lineHeight: '22px' }}>
                    {usuario?.roles?.map(r => r.nombre).join(', ') || 'Sin roles'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text strong className="paces-text-secondary" style={{ width: 140, fontSize: 13 }}>Pantallas:</Text>
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.pantallas?.length || 0} pantallas asignadas</Text>
                </div>
              </div>
            </div>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="paces-card">
            <div className="paces-card-header">
              <span>Accesos Rápidos</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="paces-text-secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                  {pantallasVisibles.length} de {todasPantallas.length}
                </span>
                <Tooltip title="Configurar accesos rápidos">
                  <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => setConfigOpen(true)} />
                </Tooltip>
              </div>
            </div>
            <div className="paces-card-body">
              {pantallasVisibles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <Text className="paces-text-secondary">No hay accesos configurados</Text>
                  <br />
                  <Button type="link" size="small" onClick={() => setConfigOpen(true)}>
                    Configurar ahora
                  </Button>
                </div>
              ) : (
                <Row gutter={[10, 10]}>
                  {pantallasVisibles.map((p) => (
                    <Col span={12} key={p.codigo}>
                      <div
                        className="paces-quick-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/${p.codigo}`)}
                      >
                        {p.nombre}
                      </div>
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          </div>
        </Col>
      </Row>

      <Modal
        title="Configurar Accesos Rápidos"
        open={configOpen}
        onCancel={() => setConfigOpen(false)}
        onOk={handleGuardarConfig}
        okText="Guardar"
        width={480}
      >
        <Text className="paces-text-secondary" style={{ display: 'block', marginBottom: 12 }}>
          Selecciona las pantallas que quieres mostrar en Accesos Rápidos del dashboard:
        </Text>
        <Input
          placeholder="Buscar pantalla..."
          allowClear
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ marginBottom: 12 }}
          prefix={<SearchOutlined className="paces-text-icon" />}
        />
        <div style={{ maxHeight: 350, overflowY: 'auto' }}>
          {todasPantallas
            .filter((p) => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
            .map((p) => {
              const checked = selected.includes(p.codigo);
              return (
                <div
                  key={p.codigo}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 0',
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                  className="paces-row-hover"
                  onClick={() => {
                    if (checked) {
                      setSelected((prev) => prev.filter((c) => c !== p.codigo));
                    } else {
                      setSelected((prev) => [...prev, p.codigo]);
                    }
                  }}
                >
                  <Checkbox checked={checked} style={{ pointerEvents: 'none' }} />
                  <span style={{ marginLeft: 8, userSelect: 'none' }}>{p.nombre}</span>
                </div>
              );
            })}
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
