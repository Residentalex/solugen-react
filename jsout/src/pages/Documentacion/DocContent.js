import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Tag, Alert, Skeleton, Empty } from 'antd';
import { CalendarOutlined, CodeOutlined, BookOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOCS_INDEX, {} from '../../docs/index';
const { Title, Text } = Typography;
// Glob de todos los markdowns con ?raw para obtener el contenido como string
const docModules = import.meta.glob('../../docs/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: false,
});
/** Encuentra el módulo y el documento actual para navegación */
function findDocMeta(moduloSlug, docSlug) {
    const mod = DOCS_INDEX.find((m) => m.key === moduloSlug);
    if (!mod)
        return null;
    const docItem = mod.docs.find((d) => d.key === `${moduloSlug}/${docSlug}`);
    if (!docItem)
        return null;
    return { mod, docItem };
}
/** Obtiene el documento anterior/siguiente dentro del mismo módulo */
function getNavDocs(mod, currentKey) {
    const idx = mod.docs.findIndex((d) => d.key === currentKey);
    const prev = idx > 0 ? mod.docs[idx - 1] : null;
    const next = idx < mod.docs.length - 1 ? mod.docs[idx + 1] : null;
    return { prev, next };
}
const DocContent = ({ modulo, doc, onHeadings }) => {
    const [markdown, setMarkdown] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const meta = findDocMeta(modulo, doc);
    // Extraer headings del markdown para el TOC
    const extractHeadings = useCallback((raw) => {
        const headings = [];
        const lines = raw.split('\n');
        for (const line of lines) {
            const matchH2 = line.match(/^## (.+)/);
            const matchH3 = line.match(/^### (.+)/);
            if (matchH2) {
                const text = matchH2[1].replace(/\*\*/g, '').trim();
                const id = text.toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g, '').replace(/\s+/g, '-');
                headings.push({ id, text, level: 2 });
            }
            else if (matchH3) {
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
                }
                else {
                    if (active) {
                        setError(true);
                        setLoading(false);
                    }
                }
            }
            catch {
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
        h2: ({ children, ...props }) => {
            const text = extractText(children);
            const id = text.toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g, '').replace(/\s+/g, '-');
            return _jsx("h2", { id: id, ...props, children: children });
        },
        h3: ({ children, ...props }) => {
            const text = extractText(children);
            const id = text.toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g, '').replace(/\s+/g, '-');
            return _jsx("h3", { id: id, ...props, children: children });
        },
        // Callouts: > **⚠️** texto → se mapea a Alert de Ant Design
        blockquote: ({ children, ...props }) => {
            const text = extractText(children);
            if (text.includes('⚠️') || text.includes('📚') || text.includes('💡')) {
                let type = 'info';
                if (text.includes('⚠️')) {
                    type = 'warning';
                }
                else if (text.includes('💡')) {
                    type = 'success';
                }
                else if (text.includes('📚')) {
                    type = 'info';
                }
                return (_jsx(Alert, { message: children, type: type, showIcon: true, style: { margin: '16px 0' } }));
            }
            return _jsx("blockquote", { ...props, children: children });
        },
        // Código inline
        code: ({ inline, className, children, ...props }) => {
            if (inline) {
                return _jsx("code", { className: "doc-inline-code", children: children });
            }
            return (_jsx("pre", { className: "doc-code-block", children: _jsx("code", { className: className, ...props, children: children }) }));
        },
    };
    const { prev, next } = meta ? getNavDocs(meta.mod, `${modulo}/${doc}`) : { prev: null, next: null };
    if (loading) {
        return (_jsx("div", { style: { padding: '20px 0' }, children: _jsx(Skeleton, { active: true, paragraph: { rows: 8 } }) }));
    }
    if (error || !meta) {
        return (_jsx("div", { style: { padding: '40px 0', textAlign: 'center' }, children: _jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: _jsxs("span", { children: ["Documento no encontrado. ", _jsx("br", {}), _jsx(Text, { type: "secondary", children: "Verifica la ruta o selecciona un documento del \u00EDndice." })] }) }) }));
    }
    return (_jsxs("div", { className: "doc-content", children: [_jsxs("div", { className: "doc-meta", children: [_jsx(Title, { level: 1, style: { marginBottom: 8 }, children: meta.docItem.label }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }, children: [_jsx(Tag, { icon: _jsx(BookOutlined, {}), color: "blue", children: meta.mod.label }), _jsx(Tag, { icon: _jsx(CalendarOutlined, {}), color: "default", children: "Mayo 2025" }), _jsx(Tag, { icon: _jsx(CodeOutlined, {}), color: "default", children: "ENP" })] })] }), _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], components: renderers, children: markdown }), (prev || next) && (_jsxs("div", { className: "doc-nav", style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 48,
                    paddingTop: 24,
                    borderTop: '1px solid var(--paces-border)',
                }, children: [_jsx("div", { children: prev && (_jsxs("a", { href: `/documentacion/${meta.mod.key}/${prev.key.split('/')[1]}`, className: "doc-nav-link", onClick: (e) => {
                                e.preventDefault();
                                window.history.pushState(null, '', `/documentacion/${meta.mod.key}/${prev.key.split('/')[1]}`);
                                window.dispatchEvent(new Event('popstate'));
                            }, children: ["\u2190 ", prev.label] })) }), _jsx("div", { children: next && (_jsxs("a", { href: `/documentacion/${meta.mod.key}/${next.key.split('/')[1]}`, className: "doc-nav-link", onClick: (e) => {
                                e.preventDefault();
                                window.history.pushState(null, '', `/documentacion/${meta.mod.key}/${next.key.split('/')[1]}`);
                                window.dispatchEvent(new Event('popstate'));
                            }, children: [next.label, " \u2192"] })) })] }))] }));
};
/** Extrae texto plano de children de React (para detectar emojis en callouts) */
function extractText(children) {
    if (typeof children === 'string')
        return children;
    if (Array.isArray(children))
        return children.map(extractText).join('');
    if (children && typeof children === 'object' && 'props' in children) {
        return extractText(children.props.children);
    }
    return '';
}
export default DocContent;
