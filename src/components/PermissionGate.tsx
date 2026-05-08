import React from 'react';
import { useAuthStore } from '../stores/authStore';

interface PermissionGateProps {
  codigos: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({ codigos, children, fallback = null }) => {
  const usuario = useAuthStore((s) => s.usuario);
  
  const pantallas = usuario?.pantallas?.map((p: any) => p.codigo?.toUpperCase()) || [];
  
  const hasPermission = codigos.some(codigo => pantallas.includes(codigo.toUpperCase()));
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;
