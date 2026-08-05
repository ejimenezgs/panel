# Casa Glick Panel v44

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
