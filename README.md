# Noches de Neón · Cabina de ventas

Aplicación publicada: [abrir CRM compartido](https://script.google.com/macros/s/AKfycbwync77WImUjtzw022SUyzYp-7-axJwrUH5m3XpDo2yxykm1lIn0l_FQ0LIMKORZHOVQQ/exec).

El [enlace de GitHub Pages](https://artesbuhooficial-max.github.io/noches-de-neon-crm/) abre automáticamente esta aplicación compartida mediante `hosting.js`. La copia local conserva la demo. Google gestiona el inicio de sesión y el servidor mantiene la clave fuera del repositorio. La redirección no incluye claves ni datos de contactos.

Requiere cuenta de Google y clave privada del equipo en **Conexiones**. La clave no está incluida en este repositorio. Seleccionar Dani o David antes de trabajar, reservar el contacto, llamar desde el teléfono mostrado y guardar el resultado, notas y próxima llamada. La guía se puede mantener abierta durante la llamada. El enlace del Sheet y el endpoint se rellenan automáticamente en la aplicación publicada.

Abrir `Noches-de-Neon.html` para probar la interfaz completa. Las fotos son Dani (primera) y David (segunda). Los seis contactos iniciales son ficticios. El modo demo guarda cambios en este navegador; no coordina ordenadores distintos.

La pestaña **Conexiones** guarda el enlace del Google Sheet elegido. Guardar el enlace no activa la sincronización. Hay importación CSV y exportación CSV; los teléfonos duplicados se omiten. El selector de arriba cambia entre Dani y David y funciona como identidad de equipo, no como inicio de sesión individual.

## Guía de venta durante las llamadas

El botón **Guía de venta** abre un panel de consulta sin cambiar de contacto. Incluye tarifas de 2027, promoción, duración, logística y regalos; cuatro repertorios con Spotify y PDFs; el audio de Román, vídeos por formación/cantante, guion, mensajes y un índice de los documentos y carpetas de Drive. Permite buscar también dentro de los documentos con texto incorporado, filtrar recursos, abrir originales, copiar enlaces y solicitar una vista de archivos de Drive. La vista de Google puede requerir iniciar sesión; siempre hay enlace al original.

La referencia fue consultada el 15/10/2026 y se actualiza manualmente en `catalog.js`. No hay sincronización automática con Drive. Las condiciones de 2027 aparecen junto a su fuente; los ejemplos de las calculadoras y las notas de reunión se distinguen como referencias internas con precios y distancias distintos. Los documentos originales permiten consultar las versiones completas y sus actualizaciones. Las carpetas enlazadas dan acceso al resto de sus archivos. El panel no envía mensajes, reserva fechas ni aplica descuentos automáticamente.

La sección Repertorios usa como presentación principal los cuatro estilos del documento «Reper Mandar novios»: Brilli Brilli, 100% Orquesta, Rockéame el Cubata y Rumbatón y Fiestón. Conserva las descripciones completas y las cuatro listas de Spotify. Los PDF y dossiers organizados en tres repertorios están agrupados como material de referencia.

`library.js` contiene la interfaz y `library-check.mjs` comprueba el contenido esencial, búsqueda, filtros y generación de los HTML. `build.mjs` incorpora catálogo e interfaz en las versiones local y Apps Script.

## Conectar el CRM compartido

El proyecto incluye también `Team.gs`. `repartirTodoCRM()` aplica el reparto de **todo** el CRM entre Dani (Daniel en la hoja) y David, por teléfono único: mitades iguales o un contacto de diferencia si el total es impar. Equilibra también los contactos con mensajes salientes de respond.io. Conserva el histórico, notas y autor real de cada mensaje; una reasignación no significa que el nuevo responsable lo haya escrito. Las reservas activas se conservan. Las filas duplicadas de un mismo teléfono siempre van al mismo comercial. Las nuevas entradas se asignan para mantener el equilibrio total.

Las tarjetas y la lista se ordenan por fecha de solicitud de Bodas.net, **de más reciente a más antigua**. Los contactos sin fecha aparecen al final. Las llamadas con seguimiento futuro esperan hasta su fecha; entre los contactos que se pueden llamar, se mantiene el orden de entrada descendente. No se usa la fecha de boda como antigüedad del lead.

La cola telefónica distingue mensajes de llamadas: tener un mensaje enviado en respond.io no excluye la primera llamada. Una llamada atendida espera a la próxima fecha programada; los intentos sin respuesta de hoy no reaparecen automáticamente el mismo día. Desde **Ficha / agendar** se puede programar cualquier seguimiento del responsable. El contador de cada tarjeta muestra llamadas disponibles ahora y contactos totales asignados. **Reservar** requiere seleccionar el propio nombre y no tener otra llamada activa; el servidor valida responsable, reserva y revisión antes de guardar.

Tras actualizar `Code.gs`, `Team.gs` y la interfaz en Apps Script, ejecutar `repartirTodoCRM()` una vez y publicar una nueva versión de la implementación existente. El registro muestra los totales releídos de la hoja. `node team-check.mjs` comprueba mitades, distribución del histórico, duplicados y conservación de los datos.

1. Usar la versión nativa de Google Sheets del CRM (el Excel en Drive debe convertirse primero con Archivo → Guardar como hoja de cálculo de Google). Abrir Extensiones → Apps Script.
2. Copiar `Code.gs` al proyecto. Añadir un archivo HTML llamado `Index` y copiar dentro el contenido completo de `AppsScriptIndex.html` incluido.
3. Ejecutar `setup` y autorizar acceso a esa hoja. Genera `SHEET_ID` y una clave aleatoria `CRM_KEY` en Propiedades del script. Compartir esta clave solo con Daniel y David. El token de respond.io nunca se pega en la interfaz.

La aplicación web necesita el permiso de Google Sheets para abrir por ID el CRM configurado: los métodos de contexto activo de un script vinculado [no están disponibles en una app web](https://developers.google.com/apps-script/guides/bound). La autorización se solicita al propietario; `SHEET_ID` limita la hoja utilizada por este código. La activación amplía el desplegable de Comercial para admitir Daniel y David, conservando las opciones existentes.
4. El backend usa directamente `VENTA (SETTER Y CLOSSER)`, con sus encabezados en la fila 2. Conserva las columnas originales y añade columnas CRM al final. Crea `Actividad CRM` para el historial. Reparte los contactos sin comercial y con teléfono entre Daniel y David, manteniendo juntos los teléfonos repetidos y respetando los comerciales anteriores. Un teléfono vacío queda pendiente de revisión. La asignación inicial no significa que se haya contactado: se mantiene `Sin contactar` hasta registrar una acción.
5. Desplegar como aplicación web, ejecutada como propietario. Usar el nivel de acceso más restrictivo que permita entrar a ambos; nunca publicar el Sheet. La clave es obligatoria incluso si el acceso de la aplicación web fuera amplio.
6. Abrir el enlace `/exec` en ambos dispositivos. En Conexiones pegar el enlace del Sheet y la clave; la URL de conexión ya se rellena en la aplicación alojada. Guardar y pulsar Sincronizar. Recomendado usar esta app alojada en Apps Script, que llama al backend mediante `google.script.run` y evita problemas de CORS de un HTML local.
7. Los contactos aparecen desde la pestaña original. Las siguientes filas nuevas se detectan al sincronizar. El CSV de Conexiones permite añadir contactos con los encabezados de `plantilla-contactos.csv`. Los datos de demostración no se suben automáticamente.

El backend centraliza reservas de 30 minutos con `LockService`. Bloquea todas las filas de un mismo teléfono, aunque aparezca con prefijos distintos. Comprueba la revisión y una huella de los datos para detectar cambios directos en Sheets. Solo el responsable puede modificar una ficha asignada. La cola se actualiza cada 15 segundos y bloquea las mutaciones sin conexión. La identidad Dani/David es una selección compartida de equipo, no una autenticación individual.

Al terminar una llamada se registra uno de estos resultados: Atendida, No contesta, Ocupado, Volver a llamar o Teléfono incorrecto. Una llamada sin respuesta queda como `Intentado`. La próxima llamada y las notas se guardan en la misma hoja. Los teléfonos repetidos se muestran como una sola ficha en la cola y conservan sus filas de origen.

## Fecha de entrada desde Bodas.net

La exportación de solicitudes contiene `DÍA` con fecha y hora de entrada. El servidor admite la acción autenticada `enrich`, con un array `requests` de objetos `request_at` (YYYY-MM-DDTHH:mm:ss, hora de Madrid), `telefono`, `email`, `fecha_boda` y `bodas_estado`. La importación busca por teléfono y después por correo, contrasta la fecha de boda y no crea contactos nuevos. Si hay varias solicitudes para la misma boda conserva la fecha de entrada más antigua. Las coincidencias con fechas de boda diferentes se dejan para revisión.

La app muestra fecha y días transcurridos. Azul: 0–2 días; ámbar: 3–7; rojo: más de 7. La columna añadida `Fecha solicitud Bodas.net` usa el mismo criterio con formato condicional en Sheets. El color representa antigüedad de entrada. `Atendida` en Bodas.net se conserva como dato de origen y no acredita cuándo se envió la última respuesta.

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
- `node check.mjs`: comprueba reparto, reservas, revisiones, cambios directos en Sheets, duplicados, responsables, historial, cruce de fechas, CSV y render inicial con servicios simulados.
- `node server.mjs`: vista local en http://127.0.0.1:4173.

El repositorio no contiene contactos reales, enlaces privados del CRM, claves ni tokens. Los archivos privados de preparación quedan en `.local/`, excluido de Git.


## Guardado e histórico de conversaciones

El botón de guardado espera confirmación del servidor, conserva un borrador local y muestra los errores dentro de la ficha. Las sincronizaciones se pausan mientras se edita o la pestaña está oculta.

La cola automática excluye los contactos ya contactados sin una próxima llamada programada. Los intentos de hoy no vuelven a sugerirse inmediatamente. Se pueden reservar manualmente desde la lista.

El cotejo de respond.io guarda la última salida, entrada, origen (equipo, automatización o difusión), ID de evidencia y fecha de revisión. Solo admite el canal configurado de Noches de Neón y coincidencias exactas de teléfono o correo; separa fechas de boda contradictorias. Los entrantes sin salida quedan pendientes de contactar. Conserva responsables, notas, resultados de llamadas y estados comerciales avanzados.

Es una revisión del histórico exportado, no una sincronización continua de mensajes. El enlace de cada ficha abre su conversación en respond.io. Los archivos de exportación y el ayudante de importación quedan fuera del repositorio.

`node respond-check.mjs` verifica el cotejo, los casos de entrantes, fallos, conflictos, conservación e idempotencia.
