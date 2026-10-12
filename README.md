# dotrino-ar

Realidad aumentada sobre obras: apuntas la cámara a un cuadro, un cartel o una foto y
encima aparece una imagen o un video. PWA del ecosistema [Dotrino](https://dotrino.com/),
en `https://ar.dotrino.com/`.

**Estado: prototipo.** Sirve para medir el seguimiento en teléfonos reales. Las obras y
sus archivos viven en el aparato que las dio de alta; todavía no se comparten.

## Cómo funciona

| Pieza | Dónde | Qué hace |
|---|---|---|
| Preparar la obra | `src/ar/compile.js` | saca de la foto los puntos que la cámara buscará (MindAR, en el aparato) |
| Paquete de la galería | `src/ar/targets.js` | cada obra guarda sus datos; al abrir la cámara se juntan en un paquete |
| Seguimiento y escena | `src/ar/tracker.js` | cámara + `Controller` de MindAR + three.js |
| Lo que va encima | `src/ar/overlay.js` | un plano con la imagen o el video, del tamaño de la obra |
| Lista de obras | `src/works/repo.js` | `@dotrino/store`, atada al perfil |
| Bytes | `src/works/blobs.js` | IndexedDB local, por hash (`cid`), como en `dotrino-content` |

No se usa el envoltorio de three que trae MindAR (`mindar-image-three`): está hecho contra
un three antiguo. `tracker.js` hace lo mismo con el three actual.

## Lo que falta para compartir una galería

La galería de cada artista vivirá en su propio `dotrino-content`; quien mira elige el
perfil público del artista y la app le pide la galería a su node. No hay directorio
central. Para eso el pilar de contenido necesita:

- un **puntero público** a la galería vigente (hoy el content guarda versiones y no lista
  nada a terceros);
- **archivos grandes** en lectura pública (por el proxio el tope es 256 KB).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3230 (la cámara pide https o localhost)
npm test           # pruebas de unidad
npm run test:e2e   # de punta a punta con una cámara simulada; necesita red y ffmpeg
```

MIT.
