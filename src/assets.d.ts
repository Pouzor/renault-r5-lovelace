// Vite inlines imported images as data URIs in library mode, which keeps the
// bundle a single self-contained file.
declare module '*.webp' {
  const src: string
  export default src
}
