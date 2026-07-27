# Web Design dinámico v25

- El esquema maestro se carga desde `https://shop.casaglick.com/js/shop-content-schema.js`.
- El archivo local `js/shop-content-schema.js` funciona como respaldo si el Shop no está disponible.
- Las secciones nuevas definidas en el esquema del Shop se agregan a `shopContent/home` con `merge` al abrir Web Design.
- Los bloques se pueden arrastrar y el orden se guarda en `sectionOrder`.
- Hero permanece primero y Contacto permanece al final.
- El orden se guarda automáticamente al soltar.
