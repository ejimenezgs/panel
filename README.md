# Casa Glick Panel

Panel administrativo independiente para gestionar productos y órdenes de Casa Glick.

## Dominio previsto

`https://panel.casaglick.com`

## Tienda vinculada

`https://shop.casaglick.com`

## Funciones

- Inicio de sesión con Firebase Authentication.
- Lectura del catálogo desde la API de inventario.
- Configuración editorial y visibilidad en Firestore.
- Seguimiento de órdenes generadas desde la tienda.

## Publicación

Sube el contenido de este repositorio directamente a la raíz pública de `panel.casaglick.com`. El archivo `index.html` debe quedar en la raíz.

## Firebase

Agrega `panel.casaglick.com` en:

Firebase Console → Authentication → Settings → Authorized domains

Las reglas necesarias están en `firestore.rules`.

## Seguridad

La configuración web de Firebase es pública por diseño. No agregues al repositorio archivos de cuentas de servicio, llaves privadas ni credenciales administrativas.
