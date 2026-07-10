import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, InputNumber, Button, message, Typography } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { moduloApi } from '../../api/moduloApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';

const { Text } = Typography;

const ModuloFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('MODULOS');

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
          form.setFieldsValue({ nombre: modulo.nombre, orden: modulo.orden });
        } else {
          message.error('Módulo no encontrado');
          navigate('/Modulos', { replace: true });
        }
      }).catch(() => {
        message.error('Error al cargar módulo');
      }).finally(() => setLoading(false));
    }

    return () => { resetToolbar(); setPageTitleOverride(''); };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, screenCode, mode, id, sucursalActiva, form, navigate]);

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (mode === 'crear') {
        const result = await moduloApi.crear(sucursalActiva, values);
        message.success('Módulo creado correctamente');
        navigationConfirmedRef.current = true;
        navigate(`/Modulos/${result.id}`, { replace: true });
      } else {
        await moduloApi.actualizar(sucursalActiva, Number(id), values);
        message.success('Módulo actualizado correctamente');
        navigationConfirmedRef.current = true;
        navigate(`/Modulos/${id}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    navigationConfirmedRef.current = true;
    navigate('/Modulos', { replace: true });
  };

  return (
    <Card className="paces-card-erp" style={{ borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Text strong style={{ fontSize: 16 }}>
          {mode === 'crear' ? 'Nuevo Módulo' : 'Editar Módulo'}
        </Text>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<CloseOutlined />} onClick={handleCancelar}>Cancelar</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleGuardar} loading={saving}>
            Guardar
          </Button>
        </div>
      </div>

      <Form form={form} layout="vertical" size="small" style={{ maxWidth: 600 }}>
        <Form.Item name="nombre" label="Nombre del Módulo"
          rules={[{ required: true, message: 'El nombre es requerido' }]}>
          <Input placeholder="Ej: Generador ORC" />
        </Form.Item>
        <Form.Item name="orden" label="Orden"
          rules={[{ required: true, message: 'El orden es requerido' }]}>
          <InputNumber min={0} max={999} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ModuloFormulario;
