# Web Design v23

- Restored and retained the Web Design tab.
- Prefills each editable field with the current production text and image paths from Shop.
- Saves direct section objects in `shopContent/home`.
- Cache version updated to 23, including the dynamically loaded `admin.js`.

## Web Design schema v4
- Editor generado desde `js/shop-content-schema.js`.
- Las secciones nuevas definidas en el esquema se agregan a `shopContent/home` con merge al abrir Web Design.
- Se conserva cualquier sección remota desconocida para evitar pérdida de contenido.
- Hospitality queda administrable desde el Panel.
