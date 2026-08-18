const fs = require('fs');
const html = fs.readFileSync('C:/Users/cjimenez/AppData/Local/Temp/opencode/reg-test/fpv_con_formatos.html', 'utf8');
const re = /<div style="[^"]*text-align:center[^"]*">[^<]*/g;
const frags = html.match(re) || [];
frags.slice(0, 6).forEach((f) => console.log(JSON.stringify(f.slice(0, 140))));
console.log('--- total divs centrados:', frags.length);
