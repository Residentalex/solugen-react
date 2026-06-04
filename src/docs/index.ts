import React from 'react';
import {
  InboxOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  AuditOutlined,
  ControlOutlined,
} from '@ant-design/icons';

export interface DocItem {
  key: string;
  label: string;
}

export interface DocModulo {
  key: string;
  label: string;
  icon: React.ReactNode;
  docs: DocItem[];
}

const DOCS_INDEX: DocModulo[] = [
  {
    key: 'inventario',
    label: 'Inventario',
    icon: React.createElement(InboxOutlined),
    docs: [
      { key: 'inventario/entrada-almacen', label: 'Entrada de Almacén (ENP)' },
    ],
  },
  {
    key: 'compras',
    label: 'Compras',
    icon: React.createElement(ShoppingCartOutlined),
    docs: [],
  },
  {
    key: 'ventas',
    label: 'Ventas',
    icon: React.createElement(ShopOutlined),
    docs: [],
  },
  {
    key: 'contabilidad',
    label: 'Contabilidad',
    icon: React.createElement(AuditOutlined),
    docs: [],
  },
  {
    key: 'administracion',
    label: 'Administración',
    icon: React.createElement(ControlOutlined),
    docs: [],
  },
];

export default DOCS_INDEX;
