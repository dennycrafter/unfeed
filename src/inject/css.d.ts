// CSS imports inside the inject bundle are inlined as strings by the text
// loader configured in scripts/build-inject.ts.
declare module '*.css' {
  const content: string;
  export default content;
}
