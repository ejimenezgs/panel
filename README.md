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
Los datos se guardan en Firestore en `shopContent/home` como objetos directos (`hero`, `products`, `showroom`, `about`, `brands`, `contact`), que es el esquema leído por Shop.
Las imagenes pueden cargarse a Firebase Storage bajo `shop-content/{sectionKey}/` o indicarse mediante URL.
Publicar `firestore.rules` y `storage.rules` desde Firebase Console antes de usar la funcion de subida.

## Subida de imágenes de Web Design a GoDaddy (v35)

El Panel publica imágenes mediante `api/upload-shop-image.php`. El endpoint valida el ID token de Firebase del administrador y guarda archivos en la ruta hermana de Shop:

`/public_html/shop/uploads/shop-content/{section}/`

Las URLs resultantes usan `https://shop.casaglick.com/uploads/shop-content/...` y se guardan inmediatamente en `shopContent/home`, por lo que Shop puede reflejar el cambio en tiempo real.

Formatos aceptados: JPG, PNG y WebP. Tamaño máximo: 8 MB. Si GD/WebP está disponible, la imagen se convierte a WebP y se limita a 3000 px en su lado mayor.
