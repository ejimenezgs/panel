# Sync notes v45

- Base: Panel v43.
- Unifica imágenes dinámicas bajo `/public_html/assets`.
- `scope=shop-content` guarda en `assets/shop`.
- `scope=website-content` guarda en `assets/casaglick`.
- Publicación mediante `https://assets.casaglick.com/`.
- No cambia `shopContent/home`, `websiteContent/home` ni nombres de campos.
- `.cpanel.yml` sólo despliega dentro de `panel.casaglick.com` y no toca la carpeta compartida.


## v45
- Se añadió un campo de texto alternativo para cada imagen editable en ambos sitios.
- Máximo recomendado en el Panel: 180 caracteres.
- Shop y Casa Glick deben leer la clave Alt correspondiente y aplicarla al elemento visual semántico.
