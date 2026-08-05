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
- `api/upload-shop-image.php`
- `firestore.rules`

## Datos

La API de inventario aporta producto, precio, stock, imágenes y categoría. El panel guarda en Firestore visibilidad, nombre editorial, descripción, orden, destacado y slug.

Web Design mantiene documentos separados:

- Shop: `shopContent/home`
- Casa Glick: `websiteContent/home`

Los nombres de campos y el esquema de estos documentos no cambian con la actualización de rutas de imágenes.

## Subida persistente de imágenes de Shop (v43)

Las nuevas imágenes destinadas a `shop.casaglick.com` se guardan fuera del repositorio y del deploy de Casa Glick:

- Ruta física: `/home/gyu5la0fbzjq/public_html/shop/uploads/{section}/`
- URL pública: `https://shop.casaglick.com/uploads/{section}/{file}`

El endpoint crea automáticamente las subcarpetas de sección, valida autenticación, MIME, peso y dimensiones, genera nombres únicos y no expone rutas físicas en su respuesta.

Las URLs antiguas guardadas en Firebase siguen siendo compatibles y no se migran ni se eliminan automáticamente.

Las imágenes destinadas a `casaglick.com` mantienen su destino independiente bajo `website-content`.

## Deploy

`.cpanel.yml` despliega únicamente dentro de:

`/home/gyu5la0fbzjq/public_html/panel.casaglick.com/`

No borra, copia ni sustituye `/home/gyu5la0fbzjq/public_html/shop/uploads/`.
