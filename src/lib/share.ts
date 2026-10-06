import { Alert, Platform, Share } from 'react-native';

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

/**
 * Shares text through the system share sheet. On web, `Share.share` only works where the
 * browser has the Web Share API (not desktop Firefox and many desktop browsers) and otherwise
 * rejects, so fall back to downloading `filename` if given, or copying to the clipboard.
 */
export async function shareText({ title, message, filename }: { title: string; message: string; filename?: string }) {
  if (Platform.OS !== 'web' || typeof navigator.share === 'function') {
    try {
      await Share.share({ title, message });
    } catch (e) {
      // Dismissing the sheet rejects with AbortError on web; anything else is a real failure.
      if ((e as Error)?.name !== 'AbortError') notify('Couldn’t share', 'Please try again.');
    }
    return;
  }

  if (filename) {
    const url = URL.createObjectURL(new Blob([message], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  try {
    await navigator.clipboard.writeText(message);
    notify('Copied', 'The text is on your clipboard. Paste it into an email or message to the store.');
  } catch {
    notify('Couldn’t copy', 'Your browser blocked clipboard access. Please select and copy the text manually.');
  }
}
