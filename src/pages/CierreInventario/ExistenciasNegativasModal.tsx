import React, { useState, useMemo } from 'react';
import { Modal, Table, Input, Alert, Tag, Typography, Empty, Button } from 'antd';
import { WarningOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Text } = Typography;

interface ExistenciaNegativaDTO {
  codPro: string;
  articulo: string;
  cantidad: number;
  codAlmacen: string;
}

interface ExistenciasNegativasModalProps {
  open: boolean;
  onClose: () => void;
  datos: ExistenciaNegativaDTO[];
}

const ExistenciasNegativasModal: React.FC<ExistenciasNegativasModalProps> = ({
  open,
  onClose,
  datos,
}) => {
  const [searchText, setSearchText] = useState('');

  const datosFiltrados = useMemo(() => {
    if (!searchText) return datos;
    const q = searchText.toLowerCase();
    return datos.filter(
      (d) =>
        d.codPro.toLowerCase().includes(q) ||
        d.articulo.toLowerCase().includes(q)
    );
  }, [datos, searchText]);

  const columns = [
    {
      title: 'Código',
      dataIndex: 'codPro',
      key: 'codPro',
      width: 110,
      render: (val: string) => (
        <Text strong style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {val}
        </Text>
      ),
    },
    {
      title: 'Artículo',
      dataIndex: 'articulo',
      key: 'articulo',
      ellipsis: { showTitle: true },
      render: (val: string) => (
        <span style={{ fontSize: 13 }}>{val}</span>
      ),
    },
    {
      title: 'Almacén',
      dataIndex: 'codAlmacen',
      key: 'codAlmacen',
      width: 90,
      align: 'center' as const,
      render: (val: string) => <Tag style={{ borderRadius: 4 }}>{val}</Tag>,
      responsive: ['md' as const],
    },
    {
      title: 'Existencia',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      render: (val: number) => (
        <Text type="danger" strong>
          {val.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
  ];

  const handleExportExcel = () => {
    // Preparar datos para Excel
    const data = datos.map((d) => ({
      Código: d.codPro,
      Artículo: d.articulo,
      Almacén: d.codAlmacen,
      Existencia: d.cantidad,
    }));

    // Crear libro y hoja
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajustar ancho de columnas
    worksheet['!cols'] = [
      { wch: 14 }, // Código
      { wch: 50 }, // Artículo
      { wch: 10 }, // Almacén
      { wch: 12 }, // Existencia
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Existencias Negativas');

    // Generar archivo y descargar
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `existencias-negativas-${timestamp}.xlsx`);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            <WarningOutlined style={{ color: '#f46a6a', marginRight: 8 }} />
            Productos con existencia negativa
            <Tag color="error" style={{ marginLeft: 8, borderRadius: 4 }}>
              {datos.length.toLocaleString('es-DO')}
            </Tag>
          </span>
          <Button
            type="default"
            size="small"
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
          >
            Exportar Excel
          </Button>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
    >
      {datos.length === 0 ? (
        <Empty description="No hay productos con existencia negativa" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <Alert
            type="warning"
            showIcon
            message="Estos productos tienen existencia negativa y deben corregirse antes de generar el cierre."
            style={{ marginBottom: 12, borderRadius: 6 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Input.Search
              placeholder="Buscar por código o artículo..."
              allowClear
              style={{ flex: 1 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={(val) => setSearchText(val)}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {datosFiltrados.length.toLocaleString('es-DO')} de {datos.length.toLocaleString('es-DO')} productos
            </Text>
          </div>

          <Table
            dataSource={datosFiltrados}
            columns={columns}
            rowKey="codPro"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: false, size: 'small' }}
            scroll={{ y: 400 }}
            style={{ borderRadius: 6 }}
          />
        </>
      )}
    </Modal>
  );
};

export default ExistenciasNegativasModal;
