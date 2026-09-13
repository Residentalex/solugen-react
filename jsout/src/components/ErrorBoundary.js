import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Alert, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
    }
    handleReset = () => {
        if (this.props.onReset) {
            this.props.onReset();
        }
        this.setState({ hasError: false, error: null });
    };
    render() {
        if (this.state.hasError) {
            return _jsx(ErrorFallback, { error: this.state.error, onReset: this.handleReset });
        }
        return this.props.children;
    }
}
/** Componente funcional interno para usar hooks (useNavigate) dentro del fallback */
const ErrorFallback = ({ error, onReset }) => {
    const navigate = useNavigate();
    return (_jsxs("div", { style: { padding: 40, maxWidth: 600, margin: '0 auto' }, children: [_jsx(Alert, { message: "Error inesperado en el componente", description: error?.message || 'Error desconocido', type: "error", showIcon: true, style: { marginBottom: 16 } }), _jsxs(Space, { children: [_jsx(Button, { onClick: () => navigate(-1), children: "Volver" }), _jsx(Button, { onClick: onReset, children: "Reintentar" })] })] }));
};
export default ErrorBoundary;
