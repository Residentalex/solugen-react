import React from 'react';
import { Alert, Button } from 'antd';

interface ListadoErrorAlertProps {
  message: string;
  onRetry: () => void;
}

const ListadoErrorAlert: React.FC<ListadoErrorAlertProps> = ({ message, onRetry }) => {
  return (
    <Alert
      title={message}
      type="error"
      showIcon
      style={{ marginBottom: 16 }}
      action={
        <Button size="small" onClick={onRetry}>
          Reintentar
        </Button>
      }
    />
  );
};

export default ListadoErrorAlert;
