export interface ConfigPedidosYaDTO {
  id: number;
  sucursal: number;
  servidor: string;
  puerto: number;
  usuario: string;
  contrasena?: string;
  archivoClave?: string;
  margenBeneficio: number;
  rutaRemota?: string;
  prefijoArchivo?: string;
  vendorID?: string;
}
