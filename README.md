# Casa Glick Panel v45

Panel administrativo conectado a Shop y casaglick.com.

## Assets persistentes compartidos

Las imágenes nuevas de Web Design se guardan fuera de los tres proyectos desplegables:

- Shop: `/home/gyu5la0fbzjq/public_html/assets/shop/{section}/`
- Casa Glick: `/home/gyu5la0fbzjq/public_html/assets/casaglick/{section}/`

El subdominio `assets.casaglick.com` debe tener como Document Root:

`/home/gyu5la0fbzjq/public_html/assets`

URLs públicas:

- `https://assets.casaglick.com/shop/{section}/{file}`
- `https://assets.casaglick.com/casaglick/{section}/{file}`

Las URLs antiguas no se migran ni se eliminan automáticamente. Firebase mantiene los mismos documentos y campos.


## v45 — textos alternativos de imágenes

- Cada campo de imagen de Web Design incluye ahora un campo de texto alternativo inmediatamente debajo.
- Los campos se generan con el mismo esquema para Shop y Casa Glick.
- Convención: `imageUrl` → `imageAlt`, `image1Url` → `image1Alt`, `categoryInteriorImageUrl` → `categoryInteriorImageAlt`.
- Los valores se guardan en los documentos existentes `shopContent/home` y `websiteContent/home`, sin modificar las URLs ni la subida de archivos.

## Corrección v48: endpoint de imágenes en deploy

El deploy ahora copia explícitamente:

- `api/upload-shop-image.php`
- `upload-shop-image.php`

Esto garantiza que producción use el endpoint configurado para escribir en:

- `/home/gyu5la0fbzjq/public_html/assets/shop/`
- `/home/gyu5la0fbzjq/public_html/assets/casaglick/`

Las URLs públicas devueltas son:

- `https://assets.casaglick.com/shop/...`
- `https://assets.casaglick.com/casaglick/...`
