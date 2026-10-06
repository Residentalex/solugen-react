import React from 'react';
import { Col, Form, Input, InputNumber, Space, Tag } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import TagTasaDocumento from '../TagTasaDocumento';
import MonedaDocumentoSelect from '../MonedaDocumentoSelect';
import type { MonedaDTO } from '../../types/contabilidad';

export type CampoRapidoEditor = 'texto' | 'numero';

export interface CampoRapidoConfig {
  valor?: string | number | null;
  editando?: boolean;
  etiqueta?: string;
  prefijo?: string;
  sufijo?: string;
  readOnly?: boolean;
  textoReadOnly?: string;
  editor?: CampoRapidoEditor;
  placeholder?: string;
  maxLength?: number;
  status?: 'error';
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  anchoEditor?: number;
  onEdit: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onChange?: (valor: string) => void;
  onChangeNumber?: (valor: number) => void;
  containerRef?: React.Ref<HTMLDivElement>;
}

export interface TasaRapidaConfig {
  tasa: number;
  editable: boolean;
  editando?: boolean;
  onEdit: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onChange?: (valor: number) => void;
}

export interface MonedaRapidaConfig {
  value?: string;
  onChange: (codigo: string) => void;
  monedas: MonedaDTO[];
  loading?: boolean;
  disabled?: boolean;
}

export interface CampoOcultoConfig {
  name: string;
  editor?: 'input' | 'number';
}

export interface CamposRapidosFilaProps {
  ncf?: CampoRapidoConfig;
  ncfModificado?: CampoRapidoConfig;
  referencia?: CampoRapidoConfig;
  diasCredito?: CampoRapidoConfig;
  tasa?: TasaRapidaConfig;
  moneda?: MonedaRapidaConfig;
  ocultos?: CampoOcultoConfig[];
  xs?: number;
  lg?: number;
  style?: React.CSSProperties;
}

function renderCampoRapido(config: CampoRapidoConfig): React.ReactNode {
  const tieneValor = config.valor !== null && config.valor !== undefined && config.valor !== '';
  const editor = config.editor ?? 'texto';
  const estiloTag: React.CSSProperties = {
    cursor: config.readOnly ? 'default' : 'pointer',
    fontSize: 14,
    padding: '6px 16px',
  };

  let contenido: React.ReactNode;

  if (config.editando) {
    contenido = editor === 'numero' ? (
      <InputNumber
        size="small"
        style={{ width: config.anchoEditor ?? 120 }}
        placeholder={config.placeholder}
        min={config.min}
        max={config.max}
        step={config.step}
        precision={config.precision}
        autoFocus
        defaultValue={config.valor as number}
        onChange={(val) => config.onChangeNumber?.(val ?? 0)}
        onPressEnter={config.onCommit}
        onBlur={config.onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            config.onCancel();
          }
        }}
      />
    ) : (
      <Input
        size="small"
        style={{ width: config.anchoEditor ?? 200 }}
        placeholder={config.placeholder}
        maxLength={config.maxLength}
        autoFocus
        defaultValue={config.valor as string}
        status={config.status}
        onChange={(e) => config.onChange?.(e.target.value)}
        onPressEnter={config.onCommit}
        onBlur={config.onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            config.onCancel();
          }
        }}
      />
    );
  } else if (config.readOnly) {
    contenido = tieneValor ? (
      <Tag style={estiloTag}>
        {config.prefijo}
        {config.valor}
        {config.sufijo}
      </Tag>
    ) : (
      <Tag style={estiloTag}>{config.textoReadOnly ?? config.etiqueta}</Tag>
    );
  } else if (tieneValor) {
    contenido = (
      <Tag style={estiloTag} onClick={config.onEdit}>
        {config.prefijo}
        {config.valor}
        {config.sufijo ?? ''} <EditOutlined />
      </Tag>
    );
  } else {
    contenido = (
      <Tag style={estiloTag} onClick={config.onEdit}>
        <PlusOutlined /> {config.etiqueta}
      </Tag>
    );
  }

  if (config.containerRef) {
    return <div ref={config.containerRef}>{contenido}</div>;
  }

  return contenido;
}

const CamposRapidosFila: React.FC<CamposRapidosFilaProps> = ({
  ncf,
  ncfModificado,
  referencia,
  diasCredito,
  tasa,
  moneda,
  ocultos,
  xs,
  lg,
  style,
}) => (
  <Col xs={xs ?? 24} lg={lg}>
    <div style={{ marginBottom: 16, ...style }}>
      <Space size={[8, 8]} wrap>
        {ncf && renderCampoRapido(ncf)}
        {ncfModificado && renderCampoRapido(ncfModificado)}
        {referencia && renderCampoRapido(referencia)}
        {diasCredito && renderCampoRapido(diasCredito)}
        {tasa && (
          <TagTasaDocumento
            tasa={tasa.tasa}
            editable={tasa.editable}
            editando={tasa.editando ?? false}
            onEdit={tasa.onEdit}
            onChange={tasa.onChange}
            onCommit={tasa.onCommit}
            onCancel={tasa.onCancel}
          />
        )}
        {moneda && (
          <MonedaDocumentoSelect
            value={moneda.value}
            onChange={moneda.onChange}
            monedas={moneda.monedas}
            loading={moneda.loading}
            disabled={moneda.disabled}
          />
        )}
      </Space>
    </div>
    {ocultos?.map((oculto) =>
      oculto.editor === 'number' ? (
        <Form.Item key={oculto.name} name={oculto.name} hidden>
          <InputNumber />
        </Form.Item>
      ) : (
        <Form.Item key={oculto.name} name={oculto.name} hidden>
          <Input />
        </Form.Item>
      ),
    )}
  </Col>
);

export default CamposRapidosFila;
