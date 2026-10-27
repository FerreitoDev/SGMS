/**
 * Helper utilitário para acionar download programático de arquivos Blob no navegador
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Extrai a mensagem de erro de um payload RFC 7807 contido em resposta do Axios com responseType blob
 */
export async function parseBlobErrorResponse(errorData: unknown): Promise<string> {
  if (errorData instanceof Blob) {
    try {
      const text = await errorData.text();
      const parsed = JSON.parse(text) as { message?: string; detail?: string; title?: string };
      return parsed.message ?? parsed.detail ?? parsed.title ?? 'Erro ao processar requisição.';
    } catch {
      return 'Erro inesperado na geração do relatório.';
    }
  }

  if (typeof errorData === 'object' && errorData !== null) {
    const obj = errorData as { message?: string; detail?: string; title?: string };
    return obj.message ?? obj.detail ?? obj.title ?? 'Erro ao processar requisição.';
  }

  return 'Falha na comunicação com o servidor de relatórios.';
}
