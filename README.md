# Mis Finanzas ML

Versión de Mis Finanzas organizada según el manual de educación financiera (planificación, diagnóstico,
presupuesto, método 50/30/20, plan de acción y evaluación de deudas). Pensada para llevar las finanzas
en familia: varias personas cargan movimientos en la misma cuenta y se sincronizan.

- Cuatro tipos de movimiento: ingreso, gasto, ahorro y pago de deudas (todos por voz).
- Cada gasto se clasifica por regularidad (fijo / variable / imprevisto) y naturaleza
  (imprescindible / necesario / deseo / hormiga).
- Presupuesto: semáforo financiero, presupuesto estimado vs. real, 50/30/20, gastos hormiga, radiografía semanal.
- Plan: metas con plazo y acciones, deudas (a quién, tipo, cuota, % del ingreso) y cuentas.
- Sincronización cifrada en Google Drive (carpeta oculta de la app): cada cambio lleva fecha y los borrados
  dejan constancia, así dos teléfonos conectados a la misma cuenta se combinan sin pisarse.

Nombre interno: "copia personalizada mamá". Datos aislados de la app original (prefijo `mf-ml:`).
Tests: `node test/parser.test.js` · `node test/vault.test.js`

© 2026 Felipe Manrique. Todos los derechos reservados. Ver [LICENSE](LICENSE).
