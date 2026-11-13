import React, { useEffect, useMemo } from 'react';
import { Alert, Button, Card, Col, Empty, message, Row, Spin, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { appActualizacionApi } from '../../api/appActualizacionApi';
import type { AppEstadoDTO } from '../../types/appActualizacion';
import TarjetaApp from './TarjetaApp';

const { Text, Title } = Typography;

/** Apps que se publican desde esta pantalla. */
const APPS = ['AGENTE', 'CAJA'] as const;

const mensajeError = (err: unknown, porDefecto: string): string => {
  const respuesta = (err as { response?: { data?: { errorMessage?: string } } })?.response;
  return respuesta?.data?.errorMessage || porDefecto;
};

const Actualizacion: React.FC = () => {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['appActualizacionEstado'],
    queryFn: () => appActualizacionApi.obtenerEstado(),
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (isError) {
      message.error(mensajeError(error, 'Error al cargar las aplicaciones'));
    }
  }, [isError, error]);

  const porNombre = useMemo(() => {
    const mapa = new Map<string, AppEstadoDTO>();
    for (const estado of data || []) {
      mapa.set(estado.name.toUpperCase(), estado);
    }
    return mapa;
  }, [data]);

  const cargar = async () => {
    await refetch();
  };

  return (
    <>
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: '4px 0',
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Actualizaciones
            </Title>
            <Text type="secondary">
              Publica nuevas versiones del agente y de la caja.
            </Text>
          </div>
          <div style={{ flex: 1 }} />
          <Button
            icon={<ReloadOutlined />}
            loading={isFetching}
            onClick={() => void refetch()}
          />
        </div>
      </Card>

      {isError && (
        <Alert
          message="Error al cargar las aplicaciones"
          description={mensajeError(error, 'No se pudo consultar la tabla APP.')}
          type="error"
          showIcon
          style={{ marginTop: 16 }}
          action={
            <Button size="small" onClick={() => void refetch()}>
              Reintentar
            </Button>
          }
        />
      )}

      <Alert
        style={{ marginTop: 16 }}
        type="info"
        showIcon
        message="Publicar no instala en los equipos"
        description="El binario y la version quedan en el servidor. Cada equipo aplica la actualizacion desde su boton Buscar actualizaciones (el agente en la bandeja y la caja en su pantalla de configuracion)."
      />

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {APPS.map((nombre) => {
            const estado = porNombre.get(nombre);
            return (
              <Col xs={24} xl={12} key={nombre}>
                {estado ? (
                  <TarjetaApp estado={estado} onPublicado={cargar} />
                ) : (
                  <Card className="paces-card-erp" style={{ borderRadius: 8, height: '100%' }}>
                    <Empty
                      description={`${nombre} no esta registrada en la tabla APP del Consolidado`}
                    />
                  </Card>
                )}
              </Col>
            );
          })}
        </Row>
      </Spin>
    </>
  );
};

export default Actualizacion;
