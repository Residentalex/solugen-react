// Tipos para el sistema de Dashboard Widgets por Rol

export interface DashboardWidgetDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  orden: number;
  visible?: boolean;
  ordenPersonalizado?: number;
}

export interface DashboardWidgetConfigDto {
  widgetId: number;
  visible: boolean;
  ordenPersonalizado?: number;
}

export interface DashboardConfiguracionRolDto {
  rolId: number;
  rolNombre: string;
  widgets: DashboardWidgetDto[];
}

export interface DashboardConfiguracionRequestDto {
  widgets: DashboardWidgetConfigDto[];
}
