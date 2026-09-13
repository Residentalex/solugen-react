import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Form, Input, Select, Switch, Button, message, Row, Col, Divider } from 'antd';
import { SaveOutlined, CloseOutlined, BankOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cuentaBancariaApi } from '../../api/cuentaBancariaApi';
import { bancoApi, type BancoDTO } from '../../api/bancoApi';
import { monedaApi } from '../../api/monedaApi';
import type { MonedaDTO } from '../../types/contabilidad';
import type { CuentaBancariaDTO } from '../../api/cuentaBancariaApi';
import PlantillaImportacion from '../../components/PlantillaImportacion';

const { TextArea } = Input;

interface Props {
  mode: 'crear' | 'editar';
}

const CuentaBancariaFormulario: React.FC<Props> = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [saving, setSaving] = useState(false);
  const [cuentaContable, setCuentaContable] = useState('');
  const [noCuenta, setNoCuenta] = useState('');
  const [bancos, setBancos] = useState<BancoDTO[]>([]);
  const [monedas, setMonedas] = useState<MonedaDTO[]>([]);

  const cuentaContableWatcher = Form.useWatch('cuentaContable', form);

  const titulo = mode === 'crear' ? 'Nueva Cuenta Bancaria' : 'Editar Cuenta Bancaria';

  const cargarCatalogos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    try {
      const [listaBancos, listaMonedas] = await Promise.all([
        bancoApi.obtenerListado(sucursalActiva),
        monedaApi.obtenerListado(sucursalActiva),
      ]);
      setBancos(listaBancos || []);
      setMonedas(listaMonedas || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar bancos y monedas');
    }
  }, [sucursalActiva]);

  const cargarDatos = useCallback(async () => {
    if (mode === 'editar') {
      const fallback = (location.state as any)?.cuenta as CuentaBancariaDTO | undefined;
      const noCuenta = fallback?.noCuenta;
      if (!noCuenta) {
        message.error('No se encontraron datos de la cuenta');
        navigate('/MCuentaBanco');
        return;
      }
      try {
        const cuenta = await cuentaBancariaApi.obtenerPorId(sucursalActiva, noCuenta);
        form.setFieldsValue({
          nombre: cuenta.nombre,
          noCuenta: cuenta.noCuenta,
          banco: cuenta.codigoBanco,
          cuentaContable: cuenta.cuentaContable,
          agente: cuenta.agente,
          nota: cuenta.nota,
          activo: cuenta.activo,
          moneda: cuenta.codigoMoneda,
        });
        setCuentaContable(cuenta.cuentaContable || '');
        setNoCuenta(cuenta.noCuenta || '');
      } catch (err: any) {
        if (fallback) {
          form.setFieldsValue({
            nombre: fallback.nombre,
            noCuenta: fallback.noCuenta,
            banco: fallback.codigoBanco,
            cuentaContable: fallback.cuentaContable,
            agente: fallback.agente,
            nota: fallback.nota,
            activo: fallback.activo,
            moneda: fallback.codigoMoneda,
          });
          setCuentaContable(fallback.cuentaContable || '');
          setNoCuenta(fallback.noCuenta || '');
        } else {
          message.error(err?.response?.data?.errorMessage || 'Error al cargar la cuenta bancaria');
          navigate('/MCuentaBanco');
        }
      }
    } else {
      form.setFieldsValue({ activo: true });
    }
  }, [mode, location.state, form, navigate, sucursalActiva]);

  useEffect(() => {
    setActiveModule('MCuentaBanco');
    cargarCatalogos();
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, resetToolbar, cargarDatos, cargarCatalogos]);

  useEffect(() => {
    setCuentaContable(cuentaContableWatcher || '');
  }, [cuentaContableWatcher]);

  const handleFinish = async (values: any) => {
    setSaving(true);
    try {
      const dto: Partial<CuentaBancariaDTO> = {
        nombre: values.nombre,
        noCuenta: values.noCuenta,
        banco: bancos.find((b) => b.codigo === values.banco)?.nombre || values.banco,
        codigoBanco: values.banco,
        cuentaContable: values.cuentaContable,
        agente: values.agente,
        nota: values.nota,
        activo: values.activo,
        moneda: monedas.find((m) => m.codigo === values.moneda)?.nombre || values.moneda,
        codigoMoneda: values.moneda,
      };
      if (mode === 'crear') {
        await cuentaBancariaApi.crear(sucursalActiva, dto);
        message.success('Cuenta bancaria creada correctamente');
      } else {
        const cuenta = (location.state as any)?.cuenta as CuentaBancariaDTO | undefined;
        const noCuenta = cuenta?.noCuenta || values.noCuenta;
        if (noCuenta) {
          await cuentaBancariaApi.actualizar(sucursalActiva, noCuenta, dto);
          message.success('Cuenta bancaria actualizada correctamente');
        } else {
          message.error('No se encontró el identificador de la cuenta');
          return;
        }
      }
      navigate('/MCuentaBanco');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al guardar cuenta bancaria');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/MCuentaBanco');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        className="paces-card-erp"
        styles={{ body: { padding: 0 } }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #556ee6 0%, #6c7ff0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BankOutlined style={{ fontSize: 20, color: '#fff' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{titulo}</h3>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                {mode === 'crear' ? 'Ingrese los datos de la nueva cuenta' : 'Modifique los datos de la cuenta'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<CloseOutlined />} onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()} loading={saving}>
              Guardar
            </Button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            size="small"
          >
            <Row gutter={[16, 0]}>
              <Col xs={24} lg={12}>
                <Form.Item
                  name="nombre"
                  label="Nombre de la Cuenta"
                  rules={[{ required: true, message: 'El nombre es requerido' }]}
                >
                  <Input prefix={<FileTextOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder="Nombre descriptivo de la cuenta" />
                </Form.Item>
              </Col>
              <Col xs={24} lg={12}>
                <Form.Item
                  name="noCuenta"
                  label="Número de Cuenta"
                  rules={[{ required: true, message: 'El número de cuenta es requerido' }]}
                >
                  <Input placeholder="Número de cuenta bancaria" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} lg={12}>
                <Form.Item
                  name="banco"
                  label="Banco"
                  rules={[{ required: true, message: 'El banco es requerido' }]}
                >
                  <Select
                    showSearch
                    placeholder="Seleccione el banco"
                    optionFilterProp="label"
                    options={bancos.map((b) => ({ value: b.codigo, label: b.nombre }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} lg={12}>
                <Form.Item
                  name="cuentaContable"
                  label="Cuenta Contable"
                >
                  <Input placeholder="Código de cuenta contable" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} lg={12}>
                <Form.Item
                  name="agente"
                  label="Agente / Responsable"
                >
                  <Input prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder="Persona responsable de la cuenta" />
                </Form.Item>
              </Col>
              <Col xs={24} lg={12}>
                <Form.Item
                  name="moneda"
                  label="Moneda"
                  rules={[{ required: true, message: 'La moneda es requerida' }]}
                >
                  <Select
                    showSearch
                    placeholder="Seleccione la moneda"
                    optionFilterProp="label"
                    options={monedas.map((m) => ({ value: m.codigo, label: m.nombre }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            <Row gutter={[16, 0]} align="middle">
              <Col xs={24} lg={16}>
                <Form.Item
                  name="nota"
                  label="Observaciones"
                >
                  <TextArea rows={2} placeholder="Notas u observaciones adicionales" />
                </Form.Item>
              </Col>
              <Col xs={24} lg={8}>
                <Form.Item
                  name="activo"
                  label="Estado"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" defaultChecked />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Card>

      {noCuenta && (
        <PlantillaImportacion cuentaBanc={noCuenta} />
      )}
    </div>
  );
};

export default CuentaBancariaFormulario;
