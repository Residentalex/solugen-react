import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const dir = resolve('__test__');
const code = readFileSync(join(dir, 'generar.cjs'), 'utf8');

// Insert raw writes after the fri_sin_config.raw.txt line
const marker = 'fri_sin_config.raw.txt"), salidaFRI, "latin1");';
const insert = `
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fpv_con_items.raw.txt"), salidaFPVItems, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fri_con_items.raw.txt"), salidaFRIItems, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fpv_con_formatos.raw.txt"), salidaFPVFormatos, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fri_con_formatos.raw.txt"), salidaFRIFormatos, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fpv_secciones.raw.txt"), salidaFPVSecciones, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fri_secciones.raw.txt"), salidaFRISecciones, "latin1");
`;

const newCode = code.replace(marker, marker + insert);
const outPath = join(dir, 'gen-goldens.cjs');
writeFileSync(outPath, newCode, 'utf8');
console.log('Created:', outPath);

// Run it
console.log('Running...');
execSync('node ' + outPath, { cwd: process.cwd(), stdio: 'inherit' });
