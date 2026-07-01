import React, { useState } from 'react';
import { Alert } from 'antd';

interface CamposRestringidosAlertProps {
  /** Indica si el documento permite modificar precios (default true) */
  modificaPrecio?: boolean;
  /** Indica si el documento permite modificar descripciones (default true) */
  modificaDescripcion?: boolean;
  /** Control externo de visibilidad opcional */
  visible?: boolean;
  /** Estilos adicionales */
  style?: React.CSSProperties;
}

/**
 * Componente que muestra un Alert warning sobre campos restringidos
 * (modificaPrecio / modificaDescripcion) con botón X para cerrarlo.
 * Se oculta permanentemente al cerrar.
 */
const CamposRestringidosAlert: React.FC<CamposRestringidosAlertProps> = ({
  modificaPrecio = true,
  modificaDescripcion = true,
  visible: externalVisible,
  style,
}) => {
  const [internalVisible, setInternalVisible] = useState(true);

  // Si hay control externo, usamos ese; si no, usamos el interno
  const isVisible = externalVisible !== undefined ? externalVisible : internalVisible;

  if (!isVisible) return null;

  // Construir mensaje dinámico
  const mensajes: string[] = [];
  if (modificaPrecio === false) {
    mensajes.push('Este documento no permite modificar precios.');
  }
  if (modificaDescripcion === false) {
    mensajes.push('Este documento no permite modificar descripciones.');
  }
  // Siempre agregar la nota final
  mensajes.push('Los campos restringidos se mostrarán como solo lectura.');

  return (
    <Alert
      type="warning"
      showIcon
      closable
      onClose={() => setInternalVisible(false)}
      message={mensajes.join(' ')}
      style={{ marginBottom: 12, ...style }}
    />
  );
};

export default CamposRestringidosAlert;
