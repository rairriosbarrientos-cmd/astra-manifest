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

## Cuentas y Astra Plus (cómo gana dinero)
- **Cuenta gratis (opcional):** correo y contraseña. Respalda cartas, diario, rituales y racha en Supabase (`astra_perfiles`, cada quien solo ve la suya) y los junta al entrar desde otro celular.
- **Astra Plus:** $4.99/mes o $29.99/año, **7 días gratis** la primera vez. Incluye tirada diaria de 3 cartas, semana por delante, tema del mes, compatibilidad a fondo y temas de color. Lo gratis (carta del día, lectura, rituales, luna, diario, rachas) sigue gratis.
- Se cancela desde **Me → Account → Manage or cancel subscription** (portal de Stripe). Precio y fin de la prueba siempre visibles.

### Encender los cobros (una sola vez)
1. Supabase: aplica `supabase/migrations/001_astra.sql` (ya aplicada en el proyecto actual).
2. Stripe → Developers → API keys → copia la **Secret key**.
3. Stripe → Developers → Webhooks → **Add endpoint** `https://TU-SITIO/api/stripe-webhook` con los eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copia el **Signing secret** (`whsec_...`).
4. Stripe → Settings → Billing → **Customer portal** → activa "Cancel subscriptions" y guarda (sin esto el botón de administrar no abre).
5. Netlify → Site configuration → Environment variables: `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`. Vuelve a publicar.
6. Prueba con llaves `sk_test_` y la tarjeta `4242 4242 4242 4242`; luego cambia a las `sk_live_`.
7. Supabase → Authentication → URL Configuration → agrega la dirección de Astra en **Redirect URLs** (para confirmar correo y recuperar contraseña).

Sin llaves de Stripe la app funciona igual y el botón de Plus avisa que los pagos aún no están activos.

## Publicar
Netlify: conecta el repo (build `npm run build`, carpeta `dist`; viene en `netlify.toml`). No necesita variables.

## Pruebas
`npm test` — signos en fechas límite y todos los días del año, fase lunar en fechas conocidas, lectura estable por día, textos sin promesas ni miedo.
