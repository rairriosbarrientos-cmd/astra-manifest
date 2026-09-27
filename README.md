# Astra — lectura diaria y manifestación (EE.UU., en inglés)

App web instalable (PWA) que funciona sin cuenta y sin servidor: todo se guarda en el celular.

## Qué hace
- **Bienvenida en 4 pasos:** nombre, cumpleaños (signo solar), enfoque (Love, Abundance, Career, Healing, Self-love) e intención.
- **Carta del día:** se voltea con animación; 44 cartas para coleccionar (sale primero una que aún no tienes). Se comparte como historia.
- **Today:** lectura diaria personalizada (misma todo el día, cambia cada día), fase lunar real, afirmación, número/color/cristal y una acción concreta.
- **Tarjeta para historias** (1080×1920) con la afirmación y la marca Astra: cada vez que alguien la comparte, promociona la app.
- **Manifest:** ritual 3·6·9 con contador del día y días completos, más diario de *señales y pequeños logros*.
- **Moon:** fase real, cuenta regresiva a la próxima luna nueva/llena, ritual de intenciones en luna nueva y de soltar en luna llena (con animación), historial por ciclo.
- **Journal:** check-in nocturno (ánimo + logro del día) que enciende una estrella en la **constelación del mes**, 3 gratitudes y reflexión.
- **Racha con descanso:** un día libre por semana sin perderla; logros a los 3, 7, 14, 21, 30, 40 y 100 días; resumen semanal.
- **Me:** mazo coleccionado, logros, enfoque, compatibilidad para mandar a alguien (historia compartible) y borrar datos.

## Cómo "hace sentir visto" sin engañar
Los textos (`src/contenido.js`) usan frases universales y cálidas, como hacen Co-Star o The Pattern, y se combinan por persona y día para que se sientan personales. Reglas que respeta (y que prueban los tests):
- Se presenta como **entretenimiento y reflexión**, no como predicción.
- **Retención sana:** perder la racha nunca borra lo hecho, hay día de descanso y no hay escasez falsa ni presión.
- **Nada de miedo ni culpa** ("energía bloqueada", "mala suerte") para empujar a pagar.
- **Sin promesas** de dinero, salud o eventos concretos.
- Incluye el 988 (línea de crisis en EE.UU.) en "Me".

## Cómo ganar dinero (siguiente paso)
1. **Astra Plus** ($4.99/mes o $29.99/año): lectura semanal extendida, luna nueva/llena con ritual guiado, más temas de afirmaciones, widgets. Cobro con Stripe (web) o, si se empaqueta para App Store/Google Play, con RevenueCat.
2. **Contenido para TikTok/Instagram:** la tarjeta compartible + videos "what your sign needs to hear today".
3. **Tienda:** diarios de manifestación imprimibles (PDF) o físicos vía print-on-demand.

## Publicar
Netlify: conecta el repo (build `npm run build`, carpeta `dist`; viene en `netlify.toml`). No necesita variables.

## Pruebas
`npm test` — signos en fechas límite y todos los días del año, fase lunar en fechas conocidas, lectura estable por día, textos sin promesas ni miedo.
