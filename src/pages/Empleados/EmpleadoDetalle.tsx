import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Grid, Tabs, Typography, message,
} from 'antd';
import {
  IdcardOutlined, PhoneOutlined, EnvironmentOutlined,
  HeartOutlined, TeamOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { empleadoApi, type EmpleadoDTO } from '../../api/empleadoApi';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { formatDate, formatNumber, toTitleCase } from '../../utils/formats';

const { Text } = Typography;

const SEXO_LABEL: Record<number, string> = {
  0: 'Masculino',
  1: 'Femenino',
};

const ESTADO_CIVIL_LABEL: Record<number, string> = {
  0: 'Casado(a)',
  1: 'Soltero(a)',
  2: 'Divorciado(a)',
  3: 'Viudo(a)',
};

const TIPO_SANGRE_LABEL: Record<string, string> = {
  'A+': 'A+',
  'A-': 'A-',
  'B+': 'B+',
  'B-': 'B-',
  'AB+': 'AB+',
  'AB-': 'AB-',
  'O+': 'O+',
  'O-': 'O-',
};

const TIPO_NOMINA_LABEL: Record<number, string> = {
  0: 'Fijo',
  1: 'Variable',
  2: 'Mixto',
};

function extraerMensajeError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (data.errorMessage) return data.errorMessage;
  if (data.errors && typeof data.errors === 'object') {
    const mensajes: string[] = [];
    for (const key of Object.keys(data.errors)) {
      const val = data.errors[key];
      if (Array.isArray(val)) mensajes.push(...val);
      else if (typeof val === 'string') mensajes.push(val);
    }
    if (mensajes.length > 0) return mensajes.join('; ');
  }
  return fallback;
}

const EmpleadoDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<EmpleadoDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    setActiveModule('MEMP');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!codigo) return;
    setLoading(true);
    empleadoApi.obtenerPorCodigo(sucursalActiva, codigo)
      .then((res) => {
        setData(res);
        setPageTitleOverride(`${res.codigo} - ${toTitleCase(res.nombre || '')}`);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar el empleado');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [codigo, sucursalActiva, setPageTitleOverride]);

  const handleRefresh = useCallback(() => {
    if (!codigo) return;
    setLoadingError(false);
    setLoading(true);
    empleadoApi.obtenerPorCodigo(sucursalActiva, codigo)
      .then((res) => {
        if (!res) {
          message.error('Empleado no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.codigo} - ${toTitleCase(res.nombre || '')}`);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al recargar');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [codigo, sucursalActiva, setPageTitleOverride]);

  const isLarge = screens.xxl === true;

  const renderCampo = (nombre: string, children: React.ReactNode, span?: number) => (
    <Descriptions.Item label={nombre} {...(span ? { span } : {})}>
      {children}
    </Descriptions.Item>
  );

  const renderReadonlyText = (valor: string | number | null | undefined, formato?: (v: any) => string) => (
    <Text>{valor != null && valor !== '' ? (formato ? formato(valor) : String(valor)) : '-'}</Text>
  );

  const renderReadonlyMoneda = (valor: number | null | undefined) => (
    <Text style={{ fontFamily: 'monospace' }}>{valor != null ? `RD$ ${formatNumber(valor)}` : '-'}</Text>
  );

  // ===== Tab 1: Datos Generales =====
  const tabDatosGenerales = (
    <Card className="paces-card" style={{ marginBottom: 16 }}>
      <Descriptions bordered size="small" column={isLarge ? 3 : 1} styles={{ content: { background: 'transparent' } }}>
        {renderCampo('Código',
          <Text style={{ fontFamily: 'monospace' }}>{data?.codigo || '-'}</Text>
        )}
        {renderCampo('Nombre Completo',
          <Text>{toTitleCase(data?.nombre || '')}</Text>,
          isLarge ? 2 : 1
        )}
        {renderCampo('Primer Nombre', renderReadonlyText(data?.nombre1))}
        {renderCampo('Segundo Nombre', renderReadonlyText(data?.nombre2))}
        {renderCampo('Primer Apellido', renderReadonlyText(data?.apellido1))}
        {renderCampo('Segundo Apellido', renderReadonlyText(data?.apellido2))}
        {renderCampo('Identificación',
          <span><IdcardOutlined style={{ color: '#556ee6', marginRight: 6 }} />{data?.identificacion || '-'}</span>
        )}
        {renderCampo('NSS', renderReadonlyText(data?.nss))}
        {renderCampo('Sexo',
          <Text>{data?.sexo != null ? (SEXO_LABEL[data.sexo] || '-') : '-'}</Text>
        )}
        {renderCampo('Estado Civil',
          <Text>{data?.estadoCivil != null ? (ESTADO_CIVIL_LABEL[data.estadoCivil] || '-') : '-'}</Text>
        )}
        {renderCampo('Fecha Nacimiento', renderReadonlyText(data?.fechaNacimiento, formatDate))}
        {renderCampo('Lugar Nacimiento', renderReadonlyText(data?.lugarNacimiento))}
        {renderCampo('Estado',
          <Tag color={data?.activo ? 'green' : 'default'}>
            {data?.activo ? 'Activo' : 'Inactivo'}
          </Tag>
        )}
      </Descriptions>
    </Card>
  );

  // ===== Tab 2: Contacto y Salud =====
  const tabContactoSalud = (
    <>
      <Card title="Contacto" className="paces-card" style={{ marginBottom: 16 }}>
        <Descriptions bordered size="small" column={isLarge ? 2 : 1} styles={{ content: { background: 'transparent' } }}>
          {renderCampo('Teléfono',
            <span><PhoneOutlined style={{ color: '#556ee6', marginRight: 6 }} />{data?.telefono || '-'}</span>
          )}
          {renderCampo('Teléfono Adicional',
            <span><PhoneOutlined style={{ color: '#556ee6', marginRight: 6 }} />{data?.telefonoAdicional || '-'}</span>
          )}
          {renderCampo('Correo Electrónico', renderReadonlyText(data?.correoElectronico))}
          {renderCampo('Dirección',
            <span><EnvironmentOutlined style={{ color: '#556ee6', marginRight: 6 }} />{data?.direccion ? toTitleCase(data.direccion) : '-'}</span>
          )}
          {renderCampo('Contacto Emergencia', renderReadonlyText(data?.contactoEmergencia))}
        </Descriptions>
      </Card>
      <Card title="Salud" className="paces-card" style={{ marginBottom: 16 }}>
        <Descriptions bordered size="small" column={isLarge ? 2 : 1} styles={{ content: { background: 'transparent' } }}>
          {renderCampo('Tipo Sangre',
            <span><HeartOutlined style={{ color: '#556ee6', marginRight: 6 }} />{data?.tipoSangre ? (TIPO_SANGRE_LABEL[data.tipoSangre] || data.tipoSangre) : '-'}</span>
          )}
          {renderCampo('Alergias',
            <div style={{ whiteSpace: 'pre-wrap' }}>{data?.alergias || '-'}</div>
          )}
          {renderCampo('Enfermedades',
            <div style={{ whiteSpace: 'pre-wrap' }}>{data?.enfermedades || '-'}</div>
          )}
        </Descriptions>
      </Card>
    </>
  );

  // ===== Tab 3: Laborales =====
  const tabLaborales = (
    <Card className="paces-card" style={{ marginBottom: 16 }}>
      <Descriptions bordered size="small" column={isLarge ? 2 : 1} styles={{ content: { background: 'transparent' } }}>
        {renderCampo('Departamento',
          <span><TeamOutlined style={{ color: '#556ee6', marginRight: 6 }} />{data?.departamento?.nombre || '-'}</span>
        )}
        {renderCampo('Posición / Cargo', renderReadonlyText(data?.posicion?.nombre))}
        {renderCampo('Compañía', renderReadonlyText(data?.compania?.nombre))}
        {renderCampo('Tipo Entidad', renderReadonlyText(data?.tipoEntidad?.nombre))}
        {renderCampo('Horario', renderReadonlyText(data?.horarioId))}
        {renderCampo('Fecha Ingreso', renderReadonlyText(data?.fechaIngreso, formatDate))}
        {renderCampo('Fecha Salida', renderReadonlyText(data?.fechaSalida, formatDate))}
        {renderCampo('Nivel Académico', renderReadonlyText(data?.nivelAcademico))}
        {renderCampo('Grado Alcanzado', renderReadonlyText(data?.gradoAlcanzado))}
      </Descriptions>
    </Card>
  );

  // ===== Tab 4: Salariales =====
  const tabSalariales = (
    <Card className="paces-card" style={{ marginBottom: 16 }}>
      <Descriptions bordered size="small" column={isLarge ? 2 : 1} styles={{ content: { background: 'transparent' } }}>
        {renderCampo('Tipo Nómina',
          <Text>{data?.tipoNomina != null ? (TIPO_NOMINA_LABEL[data.tipoNomina] || '-') : '-'}</Text>
        )}
        {renderCampo('Salario',
          <span><DollarOutlined style={{ color: '#556ee6', marginRight: 6 }} />{renderReadonlyMoneda(data?.salario)}</span>
        )}
      </Descriptions>
    </Card>
  );

  // ===== Notas =====
  const renderNotas = data?.notas ? (
    <Card title="Notas" className="paces-card" style={{ marginBottom: 16 }}>
      <div style={{ whiteSpace: 'pre-wrap' }}>{data.notas}</div>
    </Card>
  ) : null;

  const tabItems = [
    { key: 'generales', label: 'Datos Generales', children: tabDatosGenerales },
    { key: 'contacto', label: 'Contacto y Salud', children: tabContactoSalud },
    { key: 'laborales', label: 'Laborales', children: tabLaborales },
    { key: 'salariales', label: 'Salariales', children: tabSalariales },
  ];

  const handleEditar = () => {
    if (codigo) navigate(`/MEMP/${codigo}/editar`);
  };

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MEMP"
      loading={loading}
      mensajeLoading="Cargando empleado..."
      loadingError={loadingError}
      mensajeError="Error al cargar detalle de empleado"
      onRecargar={handleRefresh}
      dataDisponible={!!data}
      onEditar={handleEditar}
    >
      {data && (
        <>
          <Card className="paces-card" size="small" title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                {toTitleCase(data.nombre || '')}
              </span>
              <Tag color={data.activo ? 'green' : 'default'}>
                {data.activo ? 'Activo' : 'Inactivo'}
              </Tag>
            </div>
          } style={{ marginBottom: 16 }}>
            <Descriptions
              bordered
              size="small"
              column={isLarge ? 4 : 1}
              styles={{ content: { background: 'transparent' } }}
            >
              <Descriptions.Item label="Código">
                <Text style={{ fontFamily: 'monospace' }}>{data.codigo || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Departamento">
                {data.departamento?.nombre || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Posición">
                {data.posicion?.nombre || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Identificación">
                {data.identificacion || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="paces-card" styles={{ body: { padding: 0 } }}>
            <Tabs defaultActiveKey="generales" type="card" style={{ borderRadius: 8, padding: '0 16px' }} items={tabItems} />
          </Card>

          {renderNotas}
        </>
      )}
    </DetalleCatalogoLayout>
  );
};

export default EmpleadoDetalle;
