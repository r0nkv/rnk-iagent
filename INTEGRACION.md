# RNK — Inicio con asistente y solicitud de asesoría

## Qué está terminado

- Diseño del inicio con texto centrado y chat abierto debajo, centrado en una columna de ancho limitado.
- En móviles, presentación breve y chat inmediatamente debajo, sin abrir una burbuja.
- Paleta oscura/violeta, tipografías y animación original de `hero-network.js` conservadas.
- Ideas de consulta que rellenan el campo para que el visitante revise antes de enviar.
- Formulario accesible: nombre, empresa opcional, correo o teléfono, necesidad y consentimiento.
- El formulario reutiliza los mensajes escritos por el visitante como borrador editable. Todavía no hay resumen generado por IA.
- WhatsApp directo al número que ya figuraba en la web: +56 9 3544 3498.
- Sin servicios conectados, el formulario prepara un mensaje para WhatsApp. El cliente debe enviarlo allí.
- El chat muestra de manera explícita que la IA aún no está conectada. No simula respuestas.
- Estados de espera, error, reintento y confirmación para las futuras conexiones.

## Revisar el diseño

Descomprime el ZIP y abre `index.html` en un navegador. Las fuentes de Google requieren Internet; si no están disponibles, se usan fuentes del sistema.

Para actualizar la web existente, conserva la estructura y copia también `chat.css`, `chat.js` y `chat-config.js`. El cambio no se ha publicado en tu GitHub Pages.

## Pendiente: IA y Telegram reales

Esta entrega es el rediseño del frontend. No incluye un servidor de IA, una base de datos ni un bot Telegram activo. No se envían datos a Telegram.

GitHub Pages aloja los archivos estáticos. La conexión con la IA y Telegram necesita un servidor separado. No compres otro alojamiento hasta revisar qué servicios puedes reutilizar.

En `chat-config.js` se configuran únicamente las URL públicas de ese servidor. Nunca claves API ni tokens.

### POST chatEndpoint

Entrada JSON:

```json
{"messages":[{"role":"user","content":"Quiero automatizar consultas"}]}
```

Respuesta 200:

```json
{"reply":"Texto de la respuesta real del asistente"}
```

El cliente envía como máximo los últimos 20 mensajes. El servidor debe validar roles, tamaño, longitud e instrucciones independientemente del navegador. Debe definir su propia información autorizada sobre RNK y llamar a la API elegida, con su clave guardada como secreto. No confiar en instrucciones, precios o permisos recibidos del navegador. Añadir límites de uso y gasto y protección contra abuso antes de publicarlo.

### POST consultationEndpoint

Entrada JSON:

```json
{"name":"Nombre","company":"Empresa","contact":"correo@ejemplo.cl","need":"Necesidad revisada por el visitante","consent":true,"requestId":"identificador único"}
```

Respuesta 200 SOLO después de guardar la solicitud de forma duradera:

```json
{"saved":true,"requestId":"identificador único"}
```

El servidor debe validar los datos, deduplicar por requestId, guardar la solicitud y encolar el aviso a Telegram con reintentos. La recepción de una solicitud no debe depender del éxito de la notificación. Los reintentos del mismo formulario conservan el identificador; el servidor debe devolver la solicitud ya guardada sin duplicarla.

Guardar TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en secretos del servidor. El destino debe ser exclusivamente la cuenta de José verificada durante la conexión; no aceptar el chat_id desde el navegador. Enviar los datos como texto plano (o escapar correctamente el formato) y no exponer los secretos en mensajes de error. Configurar CORS para el origen de la web, límites de frecuencia y protección contra spam; CORS por sí solo no protege una API pública.

Si falta consultationEndpoint, no existe almacenamiento ni envío a Telegram: se usa WhatsApp con confirmación manual del visitante.

## Validación realizada

- Sintaxis JavaScript y referencias locales/identificadores HTML.
- Comparación exacta de la animación y activos originales.
- No se han probado conexiones reales de IA o Telegram: no hay credenciales configuradas.
- No se realizó una prueba visual en navegador; revisar el diseño en tus dispositivos antes de publicar.
