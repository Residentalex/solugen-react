import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function ConceptoInfoLabel({ concepto }) {
    if (!concepto)
        return null;
    const flags = [];
    if (concepto.noImpuesto)
        flags.push('No Impuestos');
    if (concepto.noAsientos)
        flags.push('No Asientos');
    if (concepto.noActualizaCostos)
        flags.push('No Actualiza Costos');
    if (flags.length === 0)
        return null;
    return (_jsx("div", { style: { marginTop: 2, fontSize: 12, color: '#faad14', lineHeight: '18px' }, children: flags.map((flag, i) => (_jsxs("span", { children: [i > 0 && _jsx("span", { children: " \u00B7 " }), "* ", flag, " *"] }, flag))) }));
}
export default ConceptoInfoLabel;
