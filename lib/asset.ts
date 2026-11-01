// Prefix a /public path with the GitHub Pages base path.
// next/link handles this automatically; plain <img> and <a href> to files do not.
export function asset(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;
}
