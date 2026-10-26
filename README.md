# Mi Bot IA para iPhone — versión 1.0

Este proyecto es una **aplicación web instalable (PWA)** que genera texto dentro de Safari usando Transformers.js y un modelo abierto. **No necesita cuenta, clave ni API de pago para conversar**. Se recomienda iOS 26 o posterior y Wi-Fi para la primera carga.

## Archivos incluidos

- `index.html`: interfaz de la aplicación.
- `styles.css`: diseño adaptado para iPhone.
- `app.js`: controles, historial, configuración y motor IA.
- `manifest.webmanifest`: datos de instalación de la PWA.
- `sw.js`: almacenamiento básico de los archivos de la interfaz.
- `icon-192.png`, `icon-512.png`, `icon-180.png`: iconos.

## Publicar gratis, solo desde el iPhone

1. Descarga el ZIP y pulsa sobre él en la app Archivos para descomprimirlo.
2. En Safari, entra a https://github.com y crea una cuenta o inicia sesión.
3. Crea un repositorio **público** llamado `mi-bot-ia`. Elige `Public` y añade un README opcional.
4. Dentro del repositorio toca **Add file → Upload files**. Selecciona todos los archivos que están DENTRO de la carpeta descomprimida; no subas solo el ZIP. Confirma con **Commit changes**. Si la interfaz móvil no muestra las opciones, en Safari pulsa `aA` / menú de página → **Solicitar sitio web de escritorio**.
5. En el repositorio, abre **Settings → Pages**. En **Build and deployment**, elige **Deploy from a branch**. Configura **main** y **/(root)**, después **Save**.
6. GitHub te mostrará la URL publicada en **Settings → Pages**. Normalmente será `https://TUUSUARIO.github.io/mi-bot-ia/` (reemplaza TUUSUARIO por tu cuenta).
7. Abre la URL desde Safari, pulsa **Cargar IA** y espera a que el modelo se descargue completamente. La primera descarga del modelo ligero ronda 118–137 MB, sin contar biblioteca y archivos adicionales. Se recomienda buena conexión Wi-Fi y espacio libre.
8. En Safari usa **Compartir → Añadir a pantalla de inicio → Abrir como app → Añadir** (los textos pueden variar por versión). Abre la aplicación desde el nuevo icono.
9. En Configuración puedes cambiar personalidad, probar el modelo Qwen (mucho más pesado), exportar y borrar las conversaciones.

## Advertencias de privacidad y capacidad

- El **código fuente** del repositorio es público con GitHub Free. No coloques claves, historiales ni datos confidenciales dentro de los archivos que subes.
- Los mensajes se guardan mediante `localStorage` **solo en el dispositivo y contexto de ese navegador** y no se suben al repositorio ni a un backend. No es almacenamiento cifrado ni apropiado para expedientes clínicos.
- Biblioteca y modelos se descargan desde terceros (jsDelivr y Hugging Face). Esos proveedores reciben solicitudes de red, pero el código de esta app no les envía las conversaciones para generar respuestas.
- La carga de un modelo grande podría fallar por restricciones de memoria o GPU de iOS. El tamaño y soporte no son garantía de rendimiento.
- El modelo ligero SmolLM2 135M es principalmente inglés y de **calidad muy limitada** en español. Qwen2.5 0.5B puede comprender mejor español, pero su archivo q4f16 ronda los 483 MB y requiere WebGPU. Ninguno equivale a un modelo grande comercial.
- El ícono y la interfaz pueden quedar en caché gracias al service worker. **No hay garantía de funcionamiento totalmente desconectado** porque el navegador podría descartar recursos y los archivos de terceros no se precargan desde el service worker.
- La aplicación es una PWA, no un paquete nativo firmado ni una publicación en App Store.
- No usar para dar diagnósticos ni recomendaciones clínicas automatizadas, ni introducir información identificable de pacientes.

## Archivo editable principal

`app.js` incluye `DEFAULT_PROMPT` para cambiar el comportamiento inicial y `MODELS` para seleccionar motores. Los modelos se cargan a petición, no automáticamente.

## Si algo falla

- Si no aparece el botón de publicar, usa Safari en modo escritorio.
- Si la URL de Pages da 404, confirma que `index.html` está en la raíz del repositorio y que Pages está configurado para publicar `main / (root)`.
- Si aparece «WebGPU no disponible», usa el modelo ligero (modo WASM) y revisa la versión de iOS.
- Si se detiene la carga, cierra otras apps, comprueba almacenamiento disponible, prueba Wi-Fi y vuelve al modelo ligero.
- Si nunca aparece «IA lista», copia el mensaje de error mostrado y revísalo en la próxima iteración de la app.

## Dependencias públicas

- Hugging Face Transformers.js (por CDN, fijado a 3.8.1).
- onnx-community/SmolLM2-135M-Instruct-ONNX-MHA (inicio).
- onnx-community/Qwen2.5-0.5B-Instruct (opcional).
