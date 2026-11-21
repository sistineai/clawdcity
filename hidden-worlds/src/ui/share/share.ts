// SHARE-2/3: Web Share when available, otherwise the clipboard (inside the click handler) or a
// download, always confirmed on screen. Never alert(), never window.open().
export type ShareMethod = 'web-share' | 'clipboard' | 'download' | 'cancelled' | 'failed';

export function appBaseUrl(): string {
  return location.origin + location.pathname;
}

async function copy(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea method
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

const isAbort = (e: unknown) => e instanceof Error && e.name === 'AbortError';

export async function shareTextOrCopy(text: string): Promise<ShareMethod> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'web-share';
    } catch (e) {
      if (isAbort(e)) return 'cancelled';
    }
  }
  return (await copy(text)) ? 'clipboard' : 'failed';
}

export async function shareImage(blob: Blob, filename: string, text: string): Promise<ShareMethod> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'web-share';
    } catch (e) {
      if (isAbort(e)) return 'cancelled';
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return 'download';
  } catch {
    return 'failed';
  }
}
