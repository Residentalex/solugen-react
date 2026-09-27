import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, InputNumber, Button, message, Typography, Switch } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { moduloApi } from '../../api/moduloApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { toTitleCase } from '../../utils/formats';

const { Text } = Typography;

const ModuloFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('Mmodulo');

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingLockRef = useRef(false);
  const navigationConfirmedRef = useFormularioNavigation();

  const mode: 'crear' | 'editar' = id && id !== 'nuevo' ? 'editar' : 'crear';

  useEffect(() => {
    setActiveModule(screenCode);
    const title = mode === 'crear' ? 'Nuevo Módulo' : 'Editar Módulo';
    setPageTitleOverride(title);

    if (mode === 'editar' && id && id !== 'nuevo') {
      setLoading(true);
      moduloApi.obtenerTodo(sucursalActiva).then((modulos) => {
        const modulo = modulos.find((m) => m.id === Number(id));
        if (modulo) {
          form.setFieldsValue({ codigo: modulo.codigo || '', nombre: modulo.nombre, orden: modulo.orden, oculto: !!modulo.oculto });
        } else {
          message.error('Módulo no encontrado');
          navigate('/Mmodulo', { replace: true });
        }
      }).catch(() => {
        message.error('Error al cargar módulo');
      }).finally(() => setLoading(false));
    }

    return () => { resetToolbar(); setPageTitleOverride(''); };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, screenCode, mode, id, sucursalActiva, form, navigate]);

const handleGuardar = async () => {
    if (savingLockRef.current) return;
    savingLockRef.current = true;
    setSaving(true);
    try {
      const values = await form.validateFields();

      if (mode === 'crear') {
        const result = await moduloApi.crear(sucursalActiva, values);
        message.success('Módulo creado correctamente');
        navigationConfirmedRef.current = true;
        navigate(`/Mmodulo/${result.id}`, { replace: true });
      } else {
        await moduloApi.actualizar(sucursalActiva, Number(id), values);
        message.success('Módulo actualizado correctamente');
        navigationConfirmedRef.current = true;
        navigate(`/Mmodulo/${id}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar');
    } finally {
      setSaving(false);
      savingLockRef.current = false;
    }
  };

  const handleCancelar = () => {
    if (saving) return;
    navigationConfirmedRef.current = true;
    navigate('/Mmodulo', { replace: true });
  };

  return (
    <Card className="paces-card-erp" style={{ borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Text strong style={{ fontSize: 16 }}>
          {mode === 'crear' ? 'Nuevo Módulo' : 'Editar Módulo'}
        </Text>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<CloseOutlined />} onClick={handleCancelar} disabled={saving}>Cancelar</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleGuardar} loading={saving}>
            Guardar
          </Button>
        </div>
      </div>

      <Form form={form} layout="vertical" size="small" style={{ maxWidth: 600 }} disabled={saving}>
        <Form.Item name="codigo" label="Código"
          rules={[{ required: true, message: 'El código es obligatorio' }]}
        >
          <Input placeholder="Ej: CONTAB" />
        </Form.Item>
        <Form.Item name="nombre" label="Nombre del Módulo"
          rules={[{ required: true, message: 'El nombre es requerido' }]}>
          <Input placeholder="Ej: Generador ORC" />
        </Form.Item>
        <Form.Item name="orden" label="Orden"
          rules={[{ required: true, message: 'El orden es requerido' }]}>
          <InputNumber min={0} max={999} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="oculto" label="Ocultar del sidebar" valuePropName="checked">
          <Switch checkedChildren="Sí" unCheckedChildren="No" />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ModuloFormulario;