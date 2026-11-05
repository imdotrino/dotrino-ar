// Lo que esta app usa de dependencias que no publican tipos, y nada más.

declare module 'mind-ar/dist/mindar-image.prod.js' {
  /** Prepara las imágenes de referencia (lo que la cámara buscará). */
  export class Compiler {
    compileImageTargets (images: HTMLCanvasElement[], onProgress: (percent: number) => void): Promise<unknown>
    /** El paquete msgpack con una entrada por imagen. */
    exportData (): Uint8Array<ArrayBuffer>
  }

  export type ControllerUpdate =
    | { type: 'updateMatrix', targetIndex: number, worldMatrix: number[] | null }
    | { type: 'processDone' }

  /** El seguimiento de MindAR: dice dónde está cada obra en cada cuadro. */
  export class Controller {
    constructor (opts: {
      inputWidth: number
      inputHeight: number
      maxTrack?: number
      onUpdate?: ((data: ControllerUpdate) => void) | null
    })
    worker: Worker
    addImageTargetsFromBuffer (buffer: ArrayBuffer): { dimensions: [number, number][] }
    /** La matriz de proyección, por columnas (16 números). */
    getProjectionMatrix (): number[]
    dummyRun (input: HTMLVideoElement): void
    processVideo (input: HTMLVideoElement): void
    dispose (): void
  }
}

declare module '@dotrino/content-client/local' {
  export interface LocalEntry { cid: string, mime: string, size: number }
  /** Guarda un Blob (o bytes) en este aparato. */
  export function putLocal (data: Blob | ArrayBuffer | Uint8Array, opts?: { mime?: string }): Promise<LocalEntry>
  /** Los bytes de `cid` en este aparato. Lanza `local-missing` si no están. */
  export function getLocal (cid: string): Promise<Blob>
  export function removeLocal (cid: string): Promise<unknown>
}

declare module '@dotrino/content-client/session' {
  export interface ContentNode {
    put (data: Uint8Array, opts?: { mime?: string }): Promise<{ owner: string, cid: string, key: string | null, size: number, existed: boolean }>
    get (ref: { owner?: string, cid: string, key?: string | null }): Promise<Uint8Array<ArrayBuffer>>
    remove (cid: string): Promise<unknown>
  }
  /** El node del usuario para esta sesión: se intenta una vez. */
  export function nodeSession (getIdentity: () => Promise<unknown>, opts?: { onError?: (e: unknown) => void }): {
    node (): Promise<ContentNode | null>
    retry (): Promise<ContentNode | null>
    hasNode (): boolean
    lastError (): string | null
  }
}
