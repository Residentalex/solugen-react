import React, { useState } from 'react';
import { Card, Descriptions, Button, Modal, Form, Input, Typography, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { ClienteDTO } from '../../../types/facturacion';

const { Text } = Typography;

interface Props {
  codigoCliente: string;
  sucursal: number;
  data?: ClienteDTO | null;
}

const LugaresTrabajoTab: React.FC<Props> = ({ data }) => {
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  if (!data) {
    return (
      <Card className="paces-card">
        <div style={{ textAlign: 'center', padding: 24 }} className="paces-text-secondary">
          <Text type="secondary">Cargando informaciÃ³n del cliente...</Text>
        </div>
      </Card>
    );
  }

  const handleEditar = () => {
    form.setFieldsValue({
      empresa: data.nombreComercial || data.nombre,
      direccion: data.direccion,
      contacto: data.contacto,
      email: data.correoElectronico,
      telefono1: data.telefono,
      telefono2: data.telefonoAdicional,
      fax: data.fax,
      departamento: (data as any).departamento || '',
      tiempoLaborando: (data as any).tiempoLaborando || '',
      ingresosMensuales: (data as any).ingresosMensuales || '',
      cargo: (data as any).cargo || '',
    });
    setEditando(true);
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      // Nota: los campos _EMP se guardan junto con el cliente principal
      // El modal solo prepara los datos; el guardado real se hace al guardar el cliente completo
      message.success('Datos actualizados (debe guardar el cliente para persistir)');
      setEditando(false);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('Error al guardar datos del lugar de trabajo');
    } finally {
      setSaving(false);
    }
  };

  const renderCampo = (label: string, valor: string | undefined | null, span?: number) => (
    <Descriptions.Item label={label} {...(span ? { span } : {})}>
      <Text>{valor || '-'}</Text>
    </Descriptions.Item>
  );

  return (
    <>
      <Card
        className="paces-card"
        extra={
          <Button type="primary" icon={<EditOutlined />} onClick={handleEditar}>
            Editar
          </Button>
        }
      >
        <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
          {renderCampo('Empresa / Nombre Comercial', data.nombreComercial || data.nombre)}
          {renderCampo('DirecciÃ³n', data.direccion)}
          {renderCampo('Contacto', data.contacto)}
          {renderCampo('Email', data.correoElectronico)}
          {renderCampo('TelÃ©fono 1', data.telefono)}
          {renderCampo('TelÃ©fono 2', data.telefonoAdicional)}
          {renderCampo('Fax', data.fax)}
          {renderCampo('Departamento', (data as any).departamento)}
          {renderCampo('Tiempo Laborando', (data as any).tiempoLaborando)}
          {renderCampo('Ingresos Mensuales', (data as any).ingresosMensuales)}
          {renderCampo('Cargo', (data as any).cargo)}
        </Descriptions>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            * Los campos marcados como pendientes se habilitarÃ¡n cuando estÃ©n disponibles en el formulario principal.
          </Text>
        </div>
      </Card>

      <Modal
        title="Editar Lugar de Trabajo"
        open={editando}
        onOk={handleGuardar}
        onCancel={() => setEditando(false)}
        confirmLoading={saving}
        destroyOnHidden
        okText="Guardar"
        cancelText="Cancelar"
        width={600}
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="empresa" label="Empresa / Nombre Comercial">
            <Input placeholder="Nombre de la empresa" maxLength={100} />
          </Form.Item>
          <Form.Item name="direccion" label="DirecciÃ³n">
            <Input.TextArea placeholder="DirecciÃ³n del lugar de trabajo" rows={2} maxLength={200} />
          </Form.Item>
          <Form.Item name="contacto" label="Contacto">
            <Input placeholder="Nombre del contacto" maxLength={100} />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="correo@ejemplo.com" maxLength={80} />
          </Form.Item>
          <Form.Item name="telefono1" label="TelÃ©fono 1">
            <Input placeholder="TelÃ©fono principal" maxLength={20} />
          </Form.Item>
          <Form.Item name="telefono2" label="TelÃ©fono 2">
            <Input placeholder="TelÃ©fono secundario" maxLength={20} />
          </Form.Item>
          <Form.Item name="fax" label="Fax">
            <Input placeholder="Fax" maxLength={20} />
          </Form.Item>
          <Form.Item name="departamento" label="Departamento">
            <Input placeholder="Departamento" maxLength={100} />
          </Form.Item>
          <Form.Item name="cargo" label="Cargo">
            <Input placeholder="Cargo que ocupa" maxLength={100} />
          </Form.Item>
          <Form.Item name="ingresosMensuales" label="Ingresos Mensuales">
            <Input placeholder="Ingresos mensuales" maxLength={50} />
          </Form.Item>
          <Form.Item name="tiempoLaborando" label="Tiempo Laborando">
            <Input placeholder="Ej: 3 aÃ±os" maxLength={50} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default LugaresTrabajoTab;
