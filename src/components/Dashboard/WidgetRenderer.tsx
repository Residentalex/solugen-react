import React from 'react';
import type { DashboardWidgetDto } from '../../types/dashboard';

// Props que cada widget puede necesitar
export interface WidgetRendererProps {
  widget: DashboardWidgetDto;
  // Datos para cada tipo de widget (se pasan desde Dashboard.tsx)
  kpiItems?: any[];
  kpiVisibles?: any[];
  ventasPorMes?: any[];
  comparativo?: any[];
  evolucionDiaria?: any[];
  pendientesNCF?: any[];
  docsNoCuadrados?: any[];
  recientes?: any[];
  stockNegativo?: any[];
  // Props para cargar stock negativo
  sucursalesActivas?: any[];
  sucursalStock?: string;
  totalStock?: number;
  loadingStock?: boolean;
  paginaStock?: number;
  onCambiarSucursalStock?: (val: string) => void;
  onCambiarPaginaStock?: (page: number) => void;
  // Props para info del usuario
  nombreCortoUsuario?: string;
  todayStr?: string;
  companyData?: any;
  totalPendientesOperativos?: number;
  // Props para accesos rápidos
  pantallasVisibles?: any[];
  todasPantallas?: any[];
  preferidas?: string[];
  // Handlers
  onNavegar?: (path: string) => void;
  onNavegarDoc?: (tipoDoc: string, noDoc?: string) => void;
  onActualizar?: () => void;
  loading?: boolean;
  lastUpdated?: string | null;
  periodo?: string;
  onCambiarPeriodo?: (val: any) => void;
}

// Placeholder para cada tipo de widget
// Estos componentes deben extraerse de Dashboard.tsx existente
const WidgetPlaceholder: React.FC<{ widget: DashboardWidgetDto }> = ({ widget }) => (
  <div style={{
    padding: 24,
    border: '1px dashed #d9d9d9',
    borderRadius: 8,
    textAlign: 'center',
    color: '#999',
    minHeight: 200
  }}>
    <p style={{ margin: 0, fontWeight: 500 }}>{widget.nombre}</p>
    <p style={{ margin: '8px 0 0', fontSize: 12 }}>{widget.descripcion}</p>
    <p style={{ margin: '16px 0 0', fontSize: 11, color: '#bbb' }}>
      (Widget no implementado aún)
    </p>
  </div>
);

/**
 * WidgetRenderer - Rendering genérico de widgets del dashboard
 *
 * Este componente recibe un widget y lo renderiza según su código.
 * Los widgets individuales deben implementarse como componentes separados
 * y se importan aquí cuando estén disponibles.
 *
 * Widgets disponibles:
 * - KPI_SUMMARY: Tarjetas KPI (ya existe lógica en Dashboard.tsx)
 * - GRAFICO_VENTAS_COMPRAS: Gráfico de barras Ventas vs Compras
 * - GRAFICO_COMPARATIVO: Tabla comparativa por sucursales
 * - GRAFICO_EVOLUCION: Gráfico de línea evolución diaria
 * - NCF_PENDIENTES: Tabla NCF pendientes por enviar
 * - DOCS_NO_CUADRADOS: Tabla documentos no cuadrados
 * - DOCS_RECIENTES: Tabla últimos documentos
 * - STOCK_NEGATIVO: Tabla productos con stock negativo
 * - INFO_USUARIO: Información del usuario
 * - ACCESOS_RAPIDOS: Accesos rápidos
 */
const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, ...props }) => {
  // Por ahora, mostrar placeholder para todos
  // TODO: Implementar cada widget específico
  return <WidgetPlaceholder widget={widget} />;

  /* Versión futura cuando estén implementados:
  switch (widget.codigo) {
    case 'KPI_SUMMARY':
      return <KpiCardsWidget {...props} />;
    case 'GRAFICO_VENTAS_COMPRAS':
      return <GraficoVentasComprasWidget {...props} />;
    case 'GRAFICO_COMPARATIVO':
      return <GraficoComparativoWidget {...props} />;
    case 'GRAFICO_EVOLUCION':
      return <GraficoEvolucionWidget {...props} />;
    case 'NCF_PENDIENTES':
      return <NcfPendientesWidget {...props} />;
    case 'DOCS_NO_CUADRADOS':
      return <DocsNoCuadradosWidget {...props} />;
    case 'DOCS_RECIENTES':
      return <DocsRecientesWidget {...props} />;
    case 'STOCK_NEGATIVO':
      return <StockNegativoWidget {...props} />;
    case 'INFO_USUARIO':
      return <InfoUsuarioWidget {...props} />;
    case 'ACCESOS_RAPIDOS':
      return <AccesosRapidosWidget {...props} />;
    default:
      return <WidgetPlaceholder widget={widget} />;
  }
  */
};

export default WidgetRenderer;
