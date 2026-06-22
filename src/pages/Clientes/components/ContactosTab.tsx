import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Input, Select, message, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../../stores/authStore';
import { entidadContactoApi } from '../../../api/entidadContactoApi';
import type { EntidadTelefonoDTO, EntidadEmailDTO, EntidadDireccionDTO } from '../../../types/facturacion';

interface ContactosTabProps {
  codigoCliente: string;
}

const TIPOS_TELEFONO = ['Principal', 'Oficina', 'Celular', 'Fax', 'Otro'];
const TIPOS_EMAIL = ['Principal', 'Facturación', 'Cobros', 'Otro'];
const TIPOS_DIRECCION = ['Principal', 'Cobros', 'Envío', 'Otra'];

const ContactosTab: React.FC<ContactosTabProps> = ({ codigoCliente }) => {
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  // Teléfonos
  const [telefonos, setTelefonos] = useState<EntidadTelefonoDTO[]>([]);
  const [loadingTel, setLoadingTel] = useState(false);

  // Emails
  const [emails, setEmails] = useState<EntidadEmailDTO[]>([]);
  const [loadingEmail, setLoadingEmail] = useState(false);

  // Direcciones
  const [direcciones, setDirecciones] = useState<EntidadDireccionDTO[]>([]);
  const [loadingDir, setLoadingDir] = useState(false);

  const [guardando, setGuardando] = useState(false);

  const cargarTodo = useCallback(async () => {
    setLoadingTel(true); setLoadingEmail(true); setLoadingDir(true);
    try {
      const [tels, mails, dirs] = await Promise.all([
        entidadContactoApi.obtenerTelefonos(sucursalActiva, codigoCliente),
        entidadContactoApi.obtenerEmails(sucursalActiva, codigoCliente),
        entidadContactoApi.obtenerDirecciones(sucursalActiva, codigoCliente),
      ]);
      setTelefonos(tels.length > 0 ? tels : [{ id: 0, codigoEntidad: codigoCliente, tipo: 'Principal', numero: '', extension: '', principal: true }]);
      setEmails(mails.length > 0 ? mails : [{ id: 0, codigoEntidad: codigoCliente, tipo: 'Principal', email: '', principal: true }]);
      setDirecciones(dirs.length > 0 ? dirs : [{ id: 0, codigoEntidad: codigoCliente, tipo: 'Principal', direccion: '', ciudad: '', provincia: '', sector: '', principal: true }]);
    } catch { message.error('Error al cargar datos de contacto'); }
    finally { setLoadingTel(false); setLoadingEmail(false); setLoadingDir(false); }
  }, [sucursalActiva, codigoCliente]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const handleGuardar = async () => {
    // Validar: al menos un teléfono, email o dirección con datos
    const tieneTel = telefonos.some(t => t.numero);
    const tieneEmail = emails.some(e => e.email);
    const tieneDir = direcciones.some(d => d.direccion);
    if (!tieneTel && !tieneEmail && !tieneDir) {
      message.warning('Debe agregar al menos un teléfono, un correo electrónico o una dirección.');
      return;
    }
    setGuardando(true);
    try {
      await Promise.all([
        entidadContactoApi.guardarTelefonos(sucursalActiva, codigoCliente, telefonos.filter(t => t.numero)),
        entidadContactoApi.guardarEmails(sucursalActiva, codigoCliente, emails.filter(e => e.email)),
        entidadContactoApi.guardarDirecciones(sucursalActiva, codigoCliente, direcciones.filter(d => d.direccion)),
      ]);
      message.success('Datos de contacto guardados correctamente');
    } catch { message.error('Error al guardar datos de contacto'); }
    finally { setGuardando(false); }
  };

  return (
    <div style={{ padding: 16 }}>
      <Alert
        message="Debe agregar al menos un teléfono, un correo electrónico o una dirección."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* === Teléfonos === */}
      <Card size="small" title="Teléfonos" extra={
        <Button size="small" icon={<PlusOutlined />} onClick={() => setTelefonos([...telefonos, { id: 0, codigoEntidad: codigoCliente, tipo: 'Celular', numero: '', extension: '', principal: false }])}>
          Agregar
        </Button>
      } style={{ marginBottom: 16 }}>
        <Table dataSource={telefonos} columns={[
          { title: 'Tipo', dataIndex: 'tipo', width: 120, render: (v: string, _: any, idx: number) => (
            <Select size="small" value={v} onChange={(val) => { const c = [...telefonos]; c[idx].tipo = val; setTelefonos(c); }} style={{ width: 120 }} options={TIPOS_TELEFONO.map(t => ({ value: t, label: t }))} />
          )},
          { title: 'Número', dataIndex: 'numero', render: (v: string, _: any, idx: number) => (
            <Input size="small" value={v} onChange={(e) => { const c = [...telefonos]; c[idx].numero = e.target.value; setTelefonos(c); }} placeholder="Teléfono" />
          )},
          { title: 'Extensión', dataIndex: 'extension', width: 100, render: (v: string, _: any, idx: number) => (
            <Input size="small" value={v} onChange={(e) => { const c = [...telefonos]; c[idx].extension = e.target.value; setTelefonos(c); }} placeholder="Ext" />
          )},
          { title: '', width: 50, render: (_: any, __: any, idx: number) => telefonos.length > 1 ? (
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setTelefonos(telefonos.filter((_, i) => i !== idx))} />
          ) : null },
        ]} rowKey={(_, idx) => String(idx)} pagination={false} size="small" loading={loadingTel} />
      </Card>

      {/* === Emails === */}
      <Card size="small" title="Correos Electrónicos" extra={
        <Button size="small" icon={<PlusOutlined />} onClick={() => setEmails([...emails, { id: 0, codigoEntidad: codigoCliente, tipo: 'Otro', email: '', principal: false }])}>
          Agregar
        </Button>
      } style={{ marginBottom: 16 }}>
        <Table dataSource={emails} columns={[
          { title: 'Tipo', dataIndex: 'tipo', width: 130, render: (v: string, _: any, idx: number) => (
            <Select size="small" value={v} onChange={(val) => { const c = [...emails]; c[idx].tipo = val; setEmails(c); }} style={{ width: 130 }} options={TIPOS_EMAIL.map(t => ({ value: t, label: t }))} />
          )},
          { title: 'Email', dataIndex: 'email', render: (v: string, _: any, idx: number) => (
            <Input size="small" value={v} onChange={(e) => { const c = [...emails]; c[idx].email = e.target.value; setEmails(c); }} placeholder="correo@ejemplo.com" />
          )},
          { title: '', width: 50, render: (_: any, __: any, idx: number) => emails.length > 1 ? (
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setEmails(emails.filter((_, i) => i !== idx))} />
          ) : null },
        ]} rowKey={(_, idx) => String(idx)} pagination={false} size="small" loading={loadingEmail} />
      </Card>

      {/* === Direcciones === */}
      <Card size="small" title="Direcciones" extra={
        <Button size="small" icon={<PlusOutlined />} onClick={() => setDirecciones([...direcciones, { id: 0, codigoEntidad: codigoCliente, tipo: 'Otra', direccion: '', ciudad: '', provincia: '', sector: '', principal: false }])}>
          Agregar
        </Button>
      } style={{ marginBottom: 16 }}>
        <Table dataSource={direcciones} columns={[
          { title: 'Tipo', dataIndex: 'tipo', width: 100, render: (v: string, _: any, idx: number) => (
            <Select size="small" value={v} onChange={(val) => { const c = [...direcciones]; c[idx].tipo = val; setDirecciones(c); }} style={{ width: 100 }} options={TIPOS_DIRECCION.map(t => ({ value: t, label: t }))} />
          )},
          { title: 'Dirección', dataIndex: 'direccion', render: (v: string, _: any, idx: number) => (
            <Input size="small" value={v} onChange={(e) => { const c = [...direcciones]; c[idx].direccion = e.target.value; setDirecciones(c); }} placeholder="Dirección" />
          )},
          { title: 'Ciudad', dataIndex: 'ciudad', width: 120, render: (v: string, _: any, idx: number) => (
            <Input size="small" value={v} onChange={(e) => { const c = [...direcciones]; c[idx].ciudad = e.target.value; setDirecciones(c); }} placeholder="Ciudad" />
          )},
          { title: 'Provincia', dataIndex: 'provincia', width: 120, render: (v: string, _: any, idx: number) => (
            <Input size="small" value={v} onChange={(e) => { const c = [...direcciones]; c[idx].provincia = e.target.value; setDirecciones(c); }} placeholder="Provincia" />
          )},
          { title: 'Sector', dataIndex: 'sector', width: 120, render: (v: string, _: any, idx: number) => (
            <Input size="small" value={v} onChange={(e) => { const c = [...direcciones]; c[idx].sector = e.target.value; setDirecciones(c); }} placeholder="Sector" />
          )},
          { title: '', width: 50, render: (_: any, __: any, idx: number) => direcciones.length > 1 ? (
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setDirecciones(direcciones.filter((_, i) => i !== idx))} />
          ) : null },
        ]} rowKey={(_, idx) => String(idx)} pagination={false} size="small" loading={loadingDir} />
      </Card>

      <Button type="primary" loading={guardando} onClick={handleGuardar}>
        Guardar Datos de Contacto
      </Button>
    </div>
  );
};

export default ContactosTab;
