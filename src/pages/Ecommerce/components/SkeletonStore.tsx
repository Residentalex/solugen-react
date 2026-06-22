import React from 'react';
import { Skeleton, Row, Col } from 'antd';

export const SkeletonStoreHeader: React.FC = () => (
  <div className="store-header" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <Skeleton.Button active style={{ width: 140, height: 36 }} />
    <div style={{ flex: 1, maxWidth: 480 }}>
      <Skeleton.Input active style={{ width: '100%', height: 36 }} />
    </div>
    <div style={{ display: 'flex', gap: 12 }}>
      <Skeleton.Avatar active size="default" />
      <Skeleton.Avatar active size="default" />
      <Skeleton.Avatar active size="default" />
    </div>
  </div>
);

export const SkeletonHero: React.FC = () => (
  <div className="store-hero" style={{ padding: 48 }}>
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <Skeleton active paragraph={{ rows: 3 }} title={{ width: '80%' }} />
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Skeleton.Button active style={{ width: 140, height: 44 }} />
          <Skeleton.Button active style={{ width: 140, height: 44 }} />
        </div>
      </Col>
      <Col xs={24} lg={12}>
        <Skeleton.Node active style={{ width: '100%', height: 300, borderRadius: 16 }} />
      </Col>
    </Row>
  </div>
);

export const SkeletonProductCard: React.FC = () => (
  <div className="store-product-card-premium">
    <Skeleton.Image active style={{ width: '100%', aspectRatio: '1', borderRadius: '12px 12px 0 0' }} />
    <div style={{ padding: 12 }}>
      <Skeleton active paragraph={{ rows: 2 }} title={{ width: '70%' }} />
    </div>
  </div>
);

export const SkeletonProductGrid: React.FC<{ count?: number }> = ({ count = 10 }) => (
  <Row gutter={[16, 16]}>
    {Array.from({ length: count }).map((_, i) => (
      <Col xs={12} sm={12} md={8} lg={6} xl={4} key={i}>
        <SkeletonProductCard />
      </Col>
    ))}
  </Row>
);

export const SkeletonCategorias: React.FC = () => (
  <div style={{ display: 'flex', gap: 12, overflow: 'hidden', paddingBottom: 8 }}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} style={{ flexShrink: 0, width: 120 }}>
        <Skeleton.Node active style={{ width: 120, height: 120, borderRadius: 12 }} />
        <Skeleton active paragraph={false} title={{ width: '80%' }} style={{ marginTop: 8 }} />
      </div>
    ))}
  </div>
);

export const SkeletonBeneficios: React.FC = () => (
  <Row gutter={[24, 24]}>
    {Array.from({ length: 4 }).map((_, i) => (
      <Col xs={24} sm={12} lg={6} key={i}>
        <div className="store-beneficio-card" style={{ padding: 24, textAlign: 'center' }}>
          <Skeleton.Avatar active size={48} style={{ marginBottom: 12 }} />
          <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
        </div>
      </Col>
    ))}
  </Row>
);

const SkeletonStore: React.FC = () => (
  <div style={{ minHeight: '100vh', background: 'var(--paces-bg-layout)' }}>
    <SkeletonStoreHeader />
    <div style={{ padding: 24 }}>
      <SkeletonHero />
      <div style={{ marginTop: 32 }}>
        <SkeletonCategorias />
      </div>
      <div style={{ marginTop: 32 }}>
        <SkeletonProductGrid count={8} />
      </div>
    </div>
  </div>
);

export default SkeletonStore;
