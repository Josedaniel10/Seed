export function formatUserMessage(
  message: string | undefined,
  fallback = 'No se pudo completar la operación. Intente nuevamente.',
): string {
  return (message ?? fallback)
    .replace(/\s*\((?:RNF?|RF)-\d+(?:\s*,\s*(?:RNF?|RF)-\d+)*\)/g, '')
    .replace(/\b(?:RNF?|RF)-\d+:\s*/g, '')
    .trim();
}
