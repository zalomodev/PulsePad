# Accesos de Spotify y versiones Clean (beta 1.2)

[English](SPOTIFY-CLEAN.en.md) · [Guía principal](GUIDE.es.md)

## Spotify sin OAuth

Abre **Spotify + Clean** y activa **Detectar lo que suena en la app de Spotify**. La sesión multimedia de Windows aporta título y artista de la app de escritorio. Cuando reproduce una canción aparece **¿Añadir esto vía Spotify?**. Solo se leen metadatos: no se accede al audio, cookies ni credenciales de la cuenta.

Pega un enlace exacto `https://open.spotify.com/track/...` para guardar un acceso que abra esa canción mediante `spotify:track:...`. Sin enlace, se guarda una búsqueda. Solo se intenta reanudar directamente la sesión actual si coinciden título y artista; en otro caso se abre una búsqueda para elegir la canción.

**Spotify sigue siendo el reproductor.** No se descarga nada. Esos accesos no pasan por el volumen, mezclador, bucles ni censura de PulsePad. No se ofrece reproducción completa integrada sin autorización. Necesitas Spotify instalado y tu sesión habitual. Esta integración no detecta Spotify abierto únicamente en el navegador.

Fuentes: [sesiones multimedia de Microsoft](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssessionmanager) y [requisitos de reproducción de Spotify](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started).

## Versiones Clean de archivos locales

La función opcional necesita **Python 3.11+**. Para que una IA elija cortes también necesitas **OpenCode**. Instálalos desde sus sitios oficiales y pulsa **Preparar herramientas gratuitas**. Se usan módulos compatibles ya instalados o se preparan dependencias fijadas en un entorno `clean-tools` propio. Los modelos locales ocupan unos 600 MB. La CPU puede tardar minutos por canción.

El audio original siempre se conserva. En el menú de un sonido local puedes elegir:

- **Censurar · crear versión Clean:** transcribe localmente, envía el texto con índices al modelo gratuito elegido, valida las selecciones y sustituye esos fragmentos de voz por acompañamiento separado localmente.
- **Censura manual · marcar cortes:** transcribe y permite marcar las palabras sin hacer una petición a OpenCode. Funciona aunque no tengas cuota gratuita.
- En una copia Clean, **Revisar cortes de esta Clean** permite cambiar selecciones y crear otra versión, sin sobrescribir las anteriores.

Los nombres son `Nombre original — Clean`, `Nombre original — Clean (2)`, etc. Quedan marcados **para revisión**. El margen y la transición suavizan los cortes; no hay pitidos y la duración se conserva. La separación puede dejar artefactos o restos de voz. La transcripción puede equivocarse o inventar palabras; los fragmentos inciertos/repetitivos se señalan o excluyen. El nombre Clean no certifica censura completa ni aprobación de una plataforma.

## Automático al importar

Empieza **apagado**. Si lo activas, primero se guarda cada archivo local nuevo y después se crea una copia Clean en la cola. No se procesan automáticamente sonidos antiguos, enlaces de Spotify ni las propias copias Clean. Un fallo, cancelación o herramienta ausente conserva el original y no se presenta como éxito. Puedes cancelar trabajos en el panel. Cerrar la app cancela sus trabajos y preparación; las tareas pendientes no se reanudan al abrir.

## Gratuito, sin alternativa de pago

PulsePad consulta el catálogo actual del CLI instalado y permite solo modelos activos de texto con coste de entrada/salida cero. Usa el CLI oficial; no disfraza peticiones para acceder a endpoints restringidos. El proveedor recibe la transcripción; el audio permanece local. OpenCode puede guardar historial de sesiones local y el proveedor tiene sus políticas de retención. PulsePad no recoge ni incluye claves de OpenCode.

El proveedor puede rechazar peticiones, cambiar modelos o agotar cuotas. Ese error detiene el trabajo, bloquea brevemente nuevos intentos de IA y conserva el original. **Nunca se selecciona un modelo de pago automáticamente.** El marcado manual sigue disponible. La prueba real de esta beta recibió cuota gratuita agotada; no se afirma una clasificación remota exitosa en esa prueba. Se comprobaron transcripción local, marcado manual, separación y copias con voz sintética. El flujo automático y la cola tienen además pruebas con ejecución simulada.

Referencias: [CLI de OpenCode](https://opencode.ai/docs/cli/) y [documentación vigente de modelos gratuitos](https://opencode.ai/docs/console/models/).

## Modelos y archivos privados

Los modelos quedan en `clean-models`, dentro de tus datos. El instrumental se descarga del [repositorio de UVR](https://github.com/TRvlvr/model_repo/releases/tag/all_public_uvr_models) y se verifica por SHA-256; la transcripción usa [faster-whisper](https://github.com/SYSTRAN/faster-whisper). Los modelos no se incluyen en la descarga de la app y conservan sus propias condiciones de uso.

`clean-jobs` contiene transcripciones, planes y salidas temporales; `clean-reports`, los informes editables de cada copia. Pueden contener letras y no forman parte de las publicaciones. Cierra PulsePad antes de respaldarlos o borrar temporales; conserva los informes si quieres revisar copias existentes.
