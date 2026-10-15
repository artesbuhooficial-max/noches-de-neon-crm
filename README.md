# Noches de Neón · Cabina de ventas

Abrir `Noches-de-Neon.html` para probar la interfaz completa. Las fotos son Dani (primera) y David (segunda). Los seis contactos iniciales son ficticios. El modo demo guarda cambios en este navegador; no coordina ordenadores distintos.

La pestaña **Conexiones** guarda el enlace del Google Sheet elegido. Guardar el enlace no activa la sincronización. Hay importación CSV y exportación CSV; los teléfonos duplicados se omiten. El selector de arriba cambia entre Dani y David y funciona como identidad de equipo, no como inicio de sesión individual.

## Activar el Sheet compartido cuando esté decidido

1. En una hoja privada de Google Sheets, abrir Extensiones → Apps Script.
2. Copiar `Code.gs` al proyecto. Añadir un archivo HTML llamado `Index` y copiar dentro el contenido completo de `AppsScriptIndex.html` incluido.
3. En Configuración del proyecto → Propiedades del script, añadir `SHEET_ID` (el identificador entre `/d/` y `/edit` en el enlace del Sheet) y `CRM_KEY` (una clave larga aleatoria compartida solo con Dani y David). El token de respond.io nunca se pega en la interfaz.
4. Ejecutar `setup` una vez y autorizar acceso a esa hoja. Crea las pestañas `Contactos` y `Actividad` sin borrar otras pestañas. Para esta primera versión, `Contactos` debe respetar los encabezados de `plantilla-contactos.csv`; las columnas técnicas se conservan.
5. Desplegar como aplicación web, ejecutada como propietario. Usar el nivel de acceso más restrictivo que permita entrar a ambos; nunca publicar el Sheet. La clave es obligatoria incluso si el acceso de la aplicación web fuera amplio.
6. Abrir el enlace `/exec` en ambos dispositivos. En Conexiones pegar el enlace del Sheet y la clave; la URL de conexión ya se rellena en la aplicación alojada. Guardar y pulsar Sincronizar. Recomendado usar esta app alojada en Apps Script, que llama al backend mediante `google.script.run` y evita problemas de CORS de un HTML local.
7. Importar el CSV de contactos reales desde Conexiones. No se suben los contactos ficticios de la demo automáticamente. También podéis pegar datos en `Contactos`, manteniendo un `id` único por fila, responsable Dani/David o vacío, estado válido y revisión inicial 0.

El backend centraliza reservas de 30 minutos con `LockService`, comprueba revisiones para evitar sobreescrituras y no permite otra llamada activa al mismo responsable. Solo el responsable puede modificar una ficha asignada. Para traspasar un contacto, su responsable lo reasigna. La cola se actualiza cada 15 segundos; cada reserva se verifica en servidor. Si pierde conexión se bloquean las mutaciones remotas. Las ediciones directas en Sheets no pasan por estos bloqueos: conviene cambiar estados y responsables desde la app y reservar la hoja para carga y consulta.

## Etiquetas en respond.io

En Propiedades del script, configurar `RESPOND_TOKEN` con un token de Developer API. Añadir a cada contacto su ID numérico de respond.io en `respond_id`. Crear en respond.io las etiquetas `Escribió: Dani` y `Escribió: David` si la API del espacio requiere que existan previamente.

El botón **He escrito** guarda el autor y añade su etiqueta con `POST /v2/contact/id:{id}/tag`, usando un array de nombres de etiqueta según el [SDK oficial](https://github.com/respond-io/typescript-sdk/blob/master/src/clients/contact.ts). No envía mensajes. Si falta configuración o falla la API, conserva la actividad y muestra que la etiqueta está pendiente o falló. Se puede repetir el botón para reintentar. Conserva ambas etiquetas si ambos escribieron al contacto, y `last_writer` refleja el último autor registrado. No cambia las otras etiquetas.

No detecta automáticamente lo que se escribe directamente en respond.io. Esa atribución requiere configurar eventos de mensajes salientes y mapear sus usuarios; no se ha conectado ni probado contra vuestro espacio real todavía.

## Archivos y comprobaciones

- `index.html`, `style.css`, `app.js`: fuente editable de la interfaz.
- `Noches-de-Neon.html`: copia autónoma para abrir o compartir como maqueta funcional.
- `AppsScriptIndex.html`, `Code.gs`: interfaz y backend para Google Apps Script.
- `plantilla-contactos.csv`: encabezados compatibles con el backend.
- `node build.mjs`: reconstruye los HTML autónomos tras editar.
- `node check.mjs`: comprueba reservas, revisiones obsoletas, duplicados, responsables, registro de actividad, CSV y render inicial con servicios simulados.
- `node server.mjs`: vista local en http://127.0.0.1:4173.

No se ha publicado con Sites porque sus herramientas de creación y despliegue no están disponibles en esta sesión. No se ha configurado ninguna cuenta real de Google ni respond.io.

