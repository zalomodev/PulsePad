# Guía de voz + música

[English](GUIDE.en.md) · [Volver](../README.es.md)

## 1. Conecta

Usa auriculares y un micrófono físico. Esta PC también necesita un puente virtual compatible: Steam Streaming Microphone si ya está activo, o VB-CABLE. PulsePad no incluye ni instala esos controladores.

Abre **Ayuda → Configurar voz y música**, o **Activar para juegos**. En Ajustes, elige el micrófono físico en **Sumar mi voz**, auriculares reales en **Escuchar aquí** y la salida del puente en **Enviar a llamadas**.

| Puente | Salida en PulsePad | Micrófono del juego |
| --- | --- | --- |
| Steam | Speakers (Steam Streaming Microphone) | Microphone (Steam Streaming Microphone) |
| VB-CABLE | CABLE Input | CABLE Output |

## 2. Mezcla

Habla normalmente y revisa el medidor de voz. Empieza con envío bajo (10% por defecto) y deja la música debajo de tu voz. Subir todo puede saturar el dispositivo. Mantén auriculares como salida local. No selecciones el micrófono virtual como fuente de tu voz física.

## 3. Graba y escucha

Elige una canción y la **entrada del micrófono virtual**. Graba seis segundos mientras hablas. Se captura esa entrada real. Detectar señal confirma que llegó algún audio; escucha para comprobar música y voz por separado y juntas. No acredita la calidad remota.

La grabación permanece en memoria durante esta sesión, sin subirse ni guardarse automáticamente. La prueba inicia la canción seleccionada y la detiene después. Su reproducción usa la salida local para evitar un bucle hacia la mezcla.

## 4. Entra al juego

Usa **Predeterminado** o la entrada virtual como micrófono del juego. Reconecta un chat que estuviera abierto. Con pulsar para hablar, mantén su tecla al activar sonidos. PulsePad debe seguir abierto para los atajos; otra app puede ocuparlos y un juego con distintos privilegios puede gestionar el teclado de otra forma.

Si corta la música, prueba a desactivar supresión de ruido/ganancia automática y ajustar sensibilidad en la app receptora. Son ajustes del juego/chat, no de PulsePad. Referencias: [soporte de Discord](https://support.discord.com/hc/en-us/articles/360045138471-Discord-Voice-and-Video-Troubleshooting-Guide) y [conexión de VB-CABLE](https://vb-audio.com/Cable/).

## Problemas frecuentes

- **Sin puente:** instala/habilita uno compatible y actualiza dispositivos. Puedes escuchar localmente sin él.
- **Solo música:** activa Sumar mi voz, elige el micrófono físico y revisa los permisos de Windows.
- **Solo voz:** activa Enviar a llamadas y revisa salida virtual, música y envío.
- **Eco:** usa auriculares, desactiva Escuchar este dispositivo en Windows para la entrada virtual y evita elegir el puente como altavoces locales.
- **Distorsión:** baja envío y música. El compresor no repara un original saturado ni toda ganancia del controlador.
- **Cortes:** revisa pulsar para hablar, filtros, sensibilidad, conexión y reinicio del chat.
- **Otra PC:** vuelve a elegir dispositivos; sus identificadores cambian y los perfiles no instalan controladores.

Desactivar o cerrar restaura los roles anteriores si todavía apuntan al puente de PulsePad. **Parar sonidos no silencia tu voz.** Un cierre forzado puede impedir restaurarlos; elige tu micrófono anterior en Sonido de Windows si hace falta.
