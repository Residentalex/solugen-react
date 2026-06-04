import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Tag, Alert, Skeleton, Empty } from 'antd';
import { CalendarOutlined, CodeOutlined, BookOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOCS_INDEX, { type DocModulo } from '../../docs/index';
import type { TocHeading } from './DocTOC';

const { Title, Text } = Typography;

interface DocContentProps {
  modulo: string;
  doc: string;
  onHeadings?: (headings: TocHeading[]) => void;
}

// Glob de todos los markdowns con ?raw para obtener el contenido como string
const docModules = import.meta.glob('../../docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: false,
}) as Record<string, () => Promise<string>>;

/** Encuentra el módulo y el documento actual para navegación */
function findDocMeta(moduloSlug: string, docSlug: string) {
  const mod = DOCS_INDEX.find((m) => m.key === moduloSlug);
  if (!mod) return null;
  const docItem = mod.docs.find((d) => d.key === `${moduloSlug}/${docSlug}`);
  if (!docItem) return null;
  return { mod, docItem };
}

/** Obtiene el documento anterior/siguiente dentro del mismo módulo */
function getNavDocs(mod: DocModulo, currentKey: string) {
  const idx = mod.docs.findIndex((d) => d.key === currentKey);
  const prev = idx > 0 ? mod.docs[idx - 1] : null;
  const next = idx < mod.docs.length - 1 ? mod.docs[idx + 1] : null;
  return { prev, next };
}

const DocContent: React.FC<DocContentProps> = ({ modulo, doc, onHeadings }) => {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const meta = findDocMeta(modulo, doc);

  // Extraer headings del markdown para el TOC
  const extractHeadings = useCallback((raw: string): TocHeading[] => {
    const headings: TocHeading[] = [];
    const lines = raw.split('\n');
    for (const line of lines) {
      const matchH2 = line.match(/^## (.+)/);
      const matchH3 = line.match(/^### (.+)/);
      if (matchH2) {
        const text = matchH2[1].replace(/\*\*/g, '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g, '').replace(/\s+/g, '-');
        headings.push({ id, text, level: 2 });
      } else if (matchH3) {
        const text = matchH3[1].replace(/\*\*/g, '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g, '').replace(/\s+/g, '-');
        headings.push({ id, text, level: 3 });
      }
    }
    return headings;
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    const loadDoc = async () => {
      try {
        const docPath = `../../docs/${modulo}/${doc}.md`;
        const loader = docModules[docPath];
        if (loader) {
          const raw = await loader();
          if (active) {
            setMarkdown(raw);
            const heads = extractHeadings(raw);
            onHeadings?.(heads);
            setLoading(false);
          }
        } else {
          if (active) {
            setError(true);
            setLoading(false);
          }
        }
      } catch {
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadDoc();
    return () => { active = false; };
  }, [modulo, doc, extractHeadings, onHeadings]);

  // Renderizado personalizado de componentes markdown
  const renderers = {
    // Headings con ID para anclaje TOC
    h2: ({ children, ...props }: any) => {
      const text = extractText(children);
      const id = text.toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g, '').replace(/\s+/g, '-');
      return <h2 id={id} {...props}>{children}</h2>;
    },
    h3: ({ children, ...props }: any) => {
      const text = extractText(children);
      const id = text.toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g, '').replace(/\s+/g, '-');
      return <h3 id={id} {...props}>{children}</h3>;
    },
    // Callouts: > **⚠️** texto → se mapea a Alert de Ant Design
    blockquote: ({ children, ...props }: any) => {
      const text = extractText(children);
      if (text.includes('⚠️') || text.includes('📚') || text.includes('💡')) {
        let type: 'warning' | 'info' | 'success' = 'info';
        if (text.includes('⚠️')) { type = 'warning'; }
        else if (text.includes('💡')) { type = 'success'; }
        else if (text.includes('📚')) { type = 'info'; }

        return (
          <Alert
            message={children}
            type={type}
            showIcon
            style={{ margin: '16px 0' }}
          />
        );
      }
      return <blockquote {...props}>{children}</blockquote>;
    },
    // Código inline
    code: ({ inline, className, children, ...props }: any) => {
      if (inline) {
        return <code className="doc-inline-code">{children}</code>;
      }
      return (
        <pre className="doc-code-block">
          <code className={className} {...props}>{children}</code>
        </pre>
      );
    },
  };

  const { prev, next } = meta ? getNavDocs(meta.mod, `${modulo}/${doc}`) : { prev: null, next: null };

  if (loading) {
    return (
      <div style={{ padding: '20px 0' }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              Documento no encontrado. <br />
              <Text type="secondary">Verifica la ruta o selecciona un documento del índice.</Text>
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div className="doc-content">
      {/* Metadatos */}
      <div className="doc-meta">
        <Title level={1} style={{ marginBottom: 8 }}>{meta.docItem.label}</Title>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <Tag icon={<BookOutlined />} color="blue">{meta.mod.label}</Tag>
          <Tag icon={<CalendarOutlined />} color="default">Mayo 2025</Tag>
          <Tag icon={<CodeOutlined />} color="default">ENP</Tag>
        </div>
      </div>

      {/* Contenido markdown */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={renderers}
      >
        {markdown}
      </ReactMarkdown>

      {/* Navegación entre documentos */}
      {(prev || next) && (
        <div className="doc-nav" style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 48,
          paddingTop: 24,
          borderTop: '1px solid var(--paces-border)',
        }}>
          <div>
            {prev && (
              <a
                href={`/documentacion/${meta.mod.key}/${prev.key.split('/')[1]}`}
                className="doc-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState(null, '', `/documentacion/${meta.mod.key}/${prev.key.split('/')[1]}`);
                  window.dispatchEvent(new Event('popstate'));
                }}
              >
                ← {prev.label}
              </a>
            )}
          </div>
          <div>
            {next && (
              <a
                href={`/documentacion/${meta.mod.key}/${next.key.split('/')[1]}`}
                className="doc-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState(null, '', `/documentacion/${meta.mod.key}/${next.key.split('/')[1]}`);
                  window.dispatchEvent(new Event('popstate'));
                }}
              >
                {next.label} →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/** Extrae texto plano de children de React (para detectar emojis en callouts) */
function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText((children as any).props.children);
  }
  return '';
}

export default DocContent;
