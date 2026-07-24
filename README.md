# Casa Glick Panel

Panel administrativo independiente para `panel.casaglick.com`.

## Estructura

- `index.html`
- `css/admin.css`
- `js/admin.js`
- `js/auth.js`
- `js/catalog-api.js`
- `js/firebase-config.js`
- `assets/`
- `firestore.rules`

## Datos

La API de inventario aporta producto, precio, stock, imágenes y categoría. El panel guarda en Firestore visibilidad, nombre editorial, descripción, orden, destacado y slug.

## Categorías

El normalizador compara todos los campos de categoría del producto y prioriza valores específicos sobre secciones generales como Interior o Exterior. Todas las mesas se agrupan en `Mesas`, excepto mesas de noche y burós, que se agrupan en `Habitación`.

## v18 - Administracion de contenido de Shop

La seccion Configuracion incluye administracion de bloques para shop.casaglick.com.
Los datos se guardan en Firestore en `shopContent/home`, dentro del objeto `sections`.
Las imagenes pueden cargarse a Firebase Storage bajo `shop-content/{sectionKey}/` o indicarse mediante URL.
Publicar `firestore.rules` y `storage.rules` desde Firebase Console antes de usar la funcion de subida.
