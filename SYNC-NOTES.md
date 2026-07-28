# Web Design dinámico v25

- El esquema maestro se carga desde `https://shop.casaglick.com/js/shop-content-schema.js`.
- El archivo local `js/shop-content-schema.js` funciona como respaldo si el Shop no está disponible.
- Las secciones nuevas definidas en el esquema del Shop se agregan a `shopContent/home` con `merge` al abrir Web Design.
- Los bloques se pueden arrastrar y el orden se guarda en `sectionOrder`.
- Hero permanece primero y Contacto permanece al final.
- El orden se guarda automáticamente al soltar.


## v26
- Web Design cards aligned with fixed drag, identity, and controls columns.
- All editing cards load collapsed by default.
- Added global Restablecer action to restore schema defaults before saving.


## v28 - Pago y canal de venta en Órdenes
- La tabla de Órdenes incluye las columnas Pago y Venta.
- Venta detecta Stripe o WhatsApp mediante `saleChannel`, `paymentMethod`, `checkoutMode` y campos de Stripe.
- Pago muestra Pagado, Devolución, Cancelada o Pendiente únicamente para ventas Stripe.
- El estado de pago se lee de Firestore (`paymentStatus`, `stripePaymentStatus`, `payment.status`, campos de reembolso). Stripe debe actualizar esos campos mediante el webhook seguro del Shop; el Panel no consulta la API secreta de Stripe desde el navegador.
