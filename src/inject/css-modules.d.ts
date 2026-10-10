// The build inlines the named css files as string modules (esbuild plugin in
// scripts/build-inject.ts); the runtime never fetches them as stylesheets.

declare module '*.css' {
  const content: string;
  export default content;
}
