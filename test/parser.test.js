// node test/parser.test.js
const P = require('../parser.js');
const today = new Date(2026, 9, 7); // mié 7-oct-2026
let fail = 0, pass = 0;

function check(text, expected) {
  const r = P.parse(text, { today });
  const errs = [];
  if (expected.count !== undefined && r.length !== expected.count) errs.push(`count ${r.length} != ${expected.count}`);
  (expected.items || (expected.count === 0 ? [] : [expected])).forEach((exp, i) => {
    const got = r[i];
    if (!got) { errs.push(`item ${i} missing`); return; }
    for (const k of Object.keys(exp)) {
      if (k === 'count' || k === 'items') continue;
      if (k === 'descIncludes') { if (!got.description.toLowerCase().includes(exp[k])) errs.push(`[${i}] desc "${got.description}" !~ ${exp[k]}`); continue; }
      if (got[k] !== exp[k]) errs.push(`[${i}] ${k}: ${JSON.stringify(got[k])} != ${JSON.stringify(exp[k])}`);
    }
  });
  if (errs.length) { fail++; console.log('✗', text, '\n   ', errs.join('\n    '), '\n    →', JSON.stringify(r)); }
  else pass++;
}

// cifras
check('Gasté 5000 pesos en el supermercado con débito', { amount: 5000, type: 'gasto', category: 'Alimentación', method: 'Débito', date: '2026-10-07', descIncludes: 'supermercado' });
check('gasté $12.500 en nafta', { amount: 12500, category: 'Transporte' });
check('pagué 1,5 millones de alquiler', { amount: 1500000, category: 'Vivienda' });
check('pagué 2.350,50 en la farmacia', { amount: 2350.5, category: 'Salud y medicamentos' });
check('15 mil en el super', { amount: 15000, category: 'Alimentación', type: 'gasto' });
check('compré zapatillas 85k con crédito en 3 cuotas', { amount: 85000, category: 'Ropa', method: 'Crédito', installments: 3 });
check('35 lucas de luz', { amount: 35000, category: 'Servicios' });
check('pagué 5,500 de internet', { amount: 5500, category: 'Internet y celular' });
// palabras
check('gasté cinco mil quinientos pesos en un café', { amount: 5500, category: 'Snacks y golosinas', naturaleza: 'hormiga' });
check('pagué doscientos cincuenta mil de expensas', { amount: 250000, category: 'Vivienda' });
check('cobré dos millones trescientos mil de sueldo', { amount: 2300000, type: 'ingreso', category: 'Sueldo' });
check('treinta y cinco mil en la verdulería', { amount: 35000, category: 'Alimentación' });
check('me pagaron un millón y medio por un trabajo de mediciones', { amount: 1500000, type: 'ingreso', category: 'Trabajos extras' });
check('veintidós mil de uber', { amount: 22000, category: 'Transporte' });
check('ciento veinte mil de prepaga', { amount: 120000, category: 'Salud y medicamentos' });
// ingresos
check('cobré 800000 de sueldo por transferencia', { amount: 800000, type: 'ingreso', category: 'Sueldo', method: 'Transferencia' });
check('me transfirieron 50000 de un cliente', { amount: 50000, type: 'ingreso', category: 'Honorarios', method: 'Transferencia' });
check('vendí la bici en 300 mil', { amount: 300000, type: 'ingreso', category: 'Ventas' });
// fechas
check('ayer gasté 3000 en el kiosco', { amount: 3000, date: '2026-10-06' });
check('anteayer pagué 20000 de gas', { amount: 20000, date: '2026-10-05', category: 'Servicios' });
check('el 3 de octubre pagué 45000 de luz', { amount: 45000, date: '2026-10-03' });
check('el lunes gasté 7000 en pizza', { amount: 7000, date: '2026-10-05', category: 'Salidas', naturaleza: 'deseo' });
check('hace 3 días pagué 4000 de estacionamiento', { amount: 4000, date: '2026-10-04', category: 'Transporte' });
check('el día 2 cobré 100000 de honorarios', { amount: 100000, date: '2026-10-02', type: 'ingreso' });
// medios
check('gasté 8000 en el chino con mercado pago', { method: 'Mercado Pago', category: 'Alimentación' });
check('pagué 10000 de netflix con la tarjeta', { method: 'Crédito', category: 'Suscripciones y apps' });
check('gasté 4500 en efectivo en el colectivo', { method: 'Efectivo', category: 'Transporte', amount: 4500 });
// dólares
check('cobré 500 dólares de un proyecto', { amount: 500, currency: 'USD', type: 'ingreso' });
check('gasté 20 usd en spotify', { amount: 20, currency: 'USD', category: 'Suscripciones y apps' });
// varios movimientos
check('gasté 2000 en café y 15000 en nafta', { count: 2, items: [{ amount: 2000, category: 'Snacks y golosinas' }, { amount: 15000, category: 'Transporte', type: 'gasto' }] });
check('pagué 30000 de luz, 25000 de gas y 18000 de internet', { count: 3, items: [{ amount: 30000 }, { amount: 25000, category: 'Servicios' }, { amount: 18000, category: 'Internet y celular' }] });
check('cobré 900000 de sueldo y después gasté 60000 en el super', { count: 2, items: [{ type: 'ingreso', amount: 900000 }, { type: 'gasto', amount: 60000, category: 'Alimentación' }] });
check('compré 2 cafés por 6000', { count: 1, amount: 6000 });
check('compré 3 kilos de carne 27000', { count: 1, amount: 27000, category: 'Alimentación' });
// descripción
check('gasté 5000 en el cumpleaños de Juan', { descIncludes: 'cumpleaños de juan', category: 'Compras ocasionales' });
check('registrá un gasto de 9000 en la veterinaria', { amount: 9000, category: 'Mascotas' });
check('nada que ver', { count: 0 });
check('gasté 1500 en el colectivo y 3000 en el subte', { count: 2, items: [{ amount: 1500, category: 'Transporte' }, { amount: 3000, category: 'Transporte' }] });
check('pagué la cuota del gimnasio 25000', { amount: 25000, category: 'Hobbies y deporte', type: 'gasto' });
check('5 mil 500 de verdura', { amount: 5500, category: 'Alimentación' });
check('mil pesos de pan', { amount: 1000, category: 'Alimentación' });
check('gasté mil quinientos en el kiosco', { amount: 1500 });
check('Gasté $5.000 en pedidos ya', { amount: 5000, category: 'Delivery', naturaleza: 'hormiga' });
check('gasté 5000 en 2 pizzas', { count: 1, amount: 5000 });
check('el 15 de septiembre gasté 9000 en ropa', { date: '2026-09-15', amount: 9000, category: 'Ropa' });
check('el 20 de octubre pagué 9000', { date: '2025-10-20' });
check('ingreso de 40000 por venta de muebles', { type: 'ingreso', amount: 40000, category: 'Ventas' });
check('me devolvieron 12000 de la compra', { type: 'ingreso', amount: 12000, category: 'Otros ingresos' });
check('pagué 150 mil de la facultad con transferencia', { amount: 150000, category: 'Educación', method: 'Transferencia', descIncludes: 'facultad' });
check('Gasté 3200 en el chino.', { amount: 3200, descIncludes: 'chino' });
check('gasté 12 mil en nafta el sábado', { amount: 12000, date: '2026-10-03', category: 'Transporte' });

// Mis Finanzas 2: ahorro, deudas, regularidad y naturaleza
check('ahorré 20 mil para el viaje', { type: 'ahorro', amount: 20000, category: 'Metas personales' });
check('guardé 50 mil en el fondo de emergencia', { type: 'ahorro', category: 'Fondo de emergencia' });
check('pagué la tarjeta 150 mil', { type: 'deuda', amount: 150000, category: 'Tarjeta de crédito', method: 'Efectivo' });
check('pagué la cuota del préstamo 45000', { type: 'deuda', category: 'Préstamo' });
check('le devolví 10 mil a mi hermano', { type: 'deuda', category: 'Deuda con personas' });
check('pagué 380 mil de alquiler', { type: 'gasto', regularidad: 'fijo', naturaleza: 'imprescindible' });
check('se me rompió el lavarropas y el arreglo salió 80 mil', { type: 'gasto', regularidad: 'imprevisto', amount: 80000 });
check('gasté 1500 en el kiosco', { naturaleza: 'hormiga', regularidad: 'variable' });
check('cobré la beca 60 mil', { type: 'ingreso', category: 'Becas' });
check('me depositaron la asignación 40 mil', { type: 'ingreso', category: 'Subsidios del Estado' });
check('cobré 900 mil de sueldo y ahorré 100 mil', { count: 2, items: [{ type: 'ingreso' }, { type: 'ahorro', amount: 100000 }] });

console.log(`\n${pass} ok, ${fail} con error`);
process.exit(fail ? 1 : 0);
