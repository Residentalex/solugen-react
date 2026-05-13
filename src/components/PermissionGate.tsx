import React from 'react';

interface PermissionGateProps {
  codigoPantalla?: string;
  accion?: string;
  children: React.ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({ children }) => {
  return <>{children}</>;
};

export default PermissionGate;
