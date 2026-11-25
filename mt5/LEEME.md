# OneTradeGuard (MT5)

Asistente (Expert Advisor) para no sobreoperar. **No abre operaciones nunca**: solo vigila y, si abres una de más, la cierra al instante.

## Qué hace
- **Máx. operaciones por día** (`MaxTradesPerDay`, por defecto 1): la segunda operación del día se cierra apenas se abre.
- **Máx. posiciones abiertas a la vez** (`MaxOpenPositions`, por defecto 1).
- Borra las **órdenes pendientes** cuando ya alcanzaste el límite, para que no puedas dejar una puesta para después.
- Muestra en el gráfico cuántas operaciones llevas hoy.
- `BlockMode = false` → solo te avisa con una alerta, sin cerrar nada.

> **Límite de MT5:** la plataforma no permite impedir que una orden se envíe. El asistente la cierra en el mismo instante en que se abre, así que pagarás el spread y la comisión de esa operación de más (y puede cerrar con una pequeña pérdida). Es un freno, no un muro.

## Instalar
1. En MT5: **Archivo → Abrir carpeta de datos → MQL5 → Experts** y copia aquí `OneTradeGuard.mq5`.
2. Abre **MetaEditor** (F4), abre el archivo y compila con **F7**. Debe decir `0 errors`.
3. En MT5, panel **Navegador → Asesores Expertos**, arrastra `OneTradeGuard` a **un solo gráfico** (cualquiera: vigila toda la cuenta).
4. En la ventana que se abre, pestaña **Común**, marca **Permitir trading algorítmico**. Activa el botón **Algo Trading** de la barra superior.
5. Ajusta los parámetros en la pestaña **Entradas**.

## Parámetros
| Parámetro | Qué hace |
|---|---|
| `MaxTradesPerDay` | Operaciones nuevas permitidas por día (0 = sin límite). |
| `MaxOpenPositions` | Posiciones abiertas a la vez (0 = sin límite). |
| `DayResetHourServer` | Hora **del servidor** en que empieza tu día. Con el servidor en GMT+3 (verano de EE. UU.) la medianoche de Colombia es la hora **8**; con GMT+2 (invierno) es la **7**. Con 0, el día empieza a la medianoche del servidor. |
| `BlockMode` | `true` cierra las de más; `false` solo avisa. |
| `DeletePending` | Borra órdenes pendientes al llegar al límite. |
| `SendPush` | Notificación al celular (requiere tu MetaQuotes ID en MT5). |

## Antes de usarlo en una cuenta real
1. **Pruébalo en una cuenta demo**: abre una operación y luego una segunda; la segunda debe cerrarse sola y aparecer una alerta. Este archivo se escribió sin poder compilarlo ni probarlo en MT5, así que revisa que compile sin errores.
2. **Cuenta de fondeo:** confirma con FundingPips que permiten asistentes automáticos, aunque este solo cierre operaciones.
3. **Copiador de operaciones (NTS Local Copier):** si lo usas, instala el asistente solo en la cuenta que origina las operaciones. Las cuentas que copian verán abrirse y cerrarse la operación de más.
4. **Cuenta tipo Netting:** solo detecta posiciones distintas; sumar lotes a una posición abierta no se detecta (en cuentas Hedging sí).
