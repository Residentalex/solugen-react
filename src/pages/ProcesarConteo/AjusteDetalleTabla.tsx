import React from 'react';
import { Table } from 'antd';
import type { AjusteConteoDTO } from '../../types/procesableConteo';
import { columnasAjuste } from './ajusteColumnas';

/** Tabla del ajuste de conteo, usada por la vista en pestana nueva. */
const AjusteDetalleTabla: React.FC<{
  ajustes: AjusteConteoDTO[];
  cargando?: boolean;
}> = ({ ajustes, cargando }) => (
  <Table<AjusteConteoDTO>
    columns={columnasAjuste}
    dataSource={ajustes}
    rowKey="codigo"
    size="small"
    loading={cargando}
    locale={{ emptyText: 'No hay artículos para mostrar con este filtro.' }}
    sticky
    scroll={{ x: 1450 }}
    pagination={{
      pageSize: 25,
      showSizeChanger: true,
      pageSizeOptions: [25, 50, 100],
      showTotal: (total, range) =>
        `${range[0]}-${range[1]} de ${total} artículos`,
    }}
    className="paces-border-top paces-list-table"
  />
);

export default AjusteDetalleTabla;
