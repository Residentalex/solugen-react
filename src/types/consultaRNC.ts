// DTOs para el módulo de Consulta de RNC / Cédula (Central de Supervisión)
// Coincide con el backend ClientePOSDTO y RNCCEDRegistroDTO

// Respuesta de GET /api/ConsultaRNC/{rnc}
// Nota: el backend mantiene el typo "procentajeDescuento" — se respeta tal cual.
export interface ClienteRNCResultado {
  codigo: string;
  nombre: string;
  identificacion: string;
  tipoNCF: string | null;
  nombreTipoComprobante: string | null;
  procentajeDescuento: number;
  exentoImpuesto: boolean;
}

// Respuesta de POST /api/ConsultaRNC/{rnc}/guardar
// Los campos provenientes de la API DGII (nombreC, direccion, telefono,
// regPago, estatus, tipoEmp) pueden venir null.
export interface RNCCEDRegistroDTO {
  id: number;
  docId: string;
  nombre: string;
  nombreC: string | null;
  direccion: string | null;
  telefono: string | null;
  fechaI: string | null;
  regPago: string | null;
  estatus: string | null;
  tipoEmp: string | null;
  modif: string;
  fechaCreacion: string;
}
