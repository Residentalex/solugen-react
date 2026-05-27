import React from 'react';
import { Alert, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
  }

  private handleReset = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

/** Componente funcional interno para usar hooks (useNavigate) dentro del fallback */
const ErrorFallback: React.FC<{ error: Error | null; onReset: () => void }> = ({ error, onReset }) => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
      <Alert
        message="Error inesperado en el componente"
        description={error?.message || 'Error desconocido'}
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Space>
        <Button onClick={() => navigate(-1)}>
          Volver
        </Button>
        <Button onClick={onReset}>
          Reintentar
        </Button>
      </Space>
    </div>
  );
};

export default ErrorBoundary;
