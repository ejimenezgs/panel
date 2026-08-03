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

## Subida universal de imágenes de Web Design a GoDaddy (v37)

El endpoint PHP guarda las imágenes compartidas en:

`/public_html/assets/casa-glick/shop-content/{section}/`

Las URLs públicas usan:

`https://casaglick.com/assets/casa-glick/shop-content/{section}/{file}`

La carpeta es independiente de Panel, Shop y la web principal, por lo que cualquiera de los dos sitios puede consumir las mismas imágenes. El endpoint crea automáticamente las subcarpetas por sección y guarda la URL resultante en `shopContent/home`.


## v41
- El esquema de Web Design para Shop se carga únicamente desde el archivo local incluido en el Panel.
- Se evita que una copia remota antigua sobrescriba los campos de imágenes de categorías en Productos.
