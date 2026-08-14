export function createURL(path: string): string {
  return `petecho://${path.replace(/^\//, '')}`;
}

export default { createURL };
