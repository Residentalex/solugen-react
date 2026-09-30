import React from 'react';
import { Alert, Button, Typography } from 'antd';

interface ListadoErrorAlertProps {
  message: string;
  onRetry: () => void;
}

const ListadoErrorAlert: React.FC<ListadoErrorAlertProps> = ({ message, onRetry }) => {
  return (
    <Alert
      message="No se pudieron cargar los datos."
      type="error"
      showIcon
      style={{ marginBottom: 16 }}
      description={
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--paces-primary)' }}>
            Ver detalle técnico
          </summary>
          <Typography.Text code style={{ display: 'block', marginTop: 4, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message}
          </Typography.Text>
        </details>
      }
      action={
        <Button size="small" onClick={onRetry}>
          Reintentar
        </Button>
      }
    />
  );
};

export default ListadoErrorAlert;
