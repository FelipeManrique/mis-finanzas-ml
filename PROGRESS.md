# Mis Finanzas ML — "copia personalizada mamá" (nombre interno)

Copia de ~/Developer/finanzas-voz organizada según el documento de educación financiera de la mamá de Felipe
(Borrador_Exposicion_Educacion_Financiera.docx: planificación, diagnóstico, presupuesto, 50/30/20, plan de acción, deudas).
Nombre visible: "Mis Finanzas ML". Repo/URL: FelipeManrique/mis-finanzas-ml → felipemanrique.github.io/mis-finanzas-ml/
Si a Felipe le gusta, esta organización se pasa a la app original.

## Aislamiento respecto de la app original (mismo dominio github.io)
- localStorage con prefijo `mf2:` · IndexedDB `mis-finanzas-ml` · cache SW `mf2-…`
- Drive appData: mismos client ID/intermediario, pero archivos `mf2.enc.json` / `mf2-AAAA-MM-DD.enc.json`
- oauth: reusa https://felipemanrique.github.io/mis-finanzas/oauth.html (el reclamo es por sesión)

## Plan
- [x] parser: tipos ingreso/gasto/ahorro/deuda, categorías del documento, regularidad + naturaleza, imprevistos
- [x] modelo: gastos con regularidad (fijo/variable/imprevisto) y naturaleza (imprescindible/necesario/deseo/hormiga)
- [x] Movimientos: saldo final = ingresos − gastos − ahorro − deudas, semáforo
- [x] Presupuesto: semáforo, plan vs real, 50/30/20, hormiga, radiografía 7 días, categorías, 6 meses
- [x] Plan: metas (objetivo, monto, plazo, acciones, progreso) + deudas (a quién, tipo, cuota, % ingreso) + cuentas
- [x] marca "Mis Finanzas ML", ícono propio, bienvenida, aislamiento de datos
- [x] tests, verificación en teléfono, publicar

- [x] sincronización familiar (fusión por fecha + constancia de borrados), nombre de quien carga
- [x] publicado: https://felipemanrique.github.io/mis-finanzas-ml/
