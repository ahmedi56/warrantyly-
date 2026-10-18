import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

// Web only: when the Google popup lands back on this app, this closes it and hands the result to the opener.
WebBrowser.maybeCompleteAuthSession();

export type GoogleResult = { ok: true; userId: string; email: string } | { ok: false; cancelled?: boolean; message: string };

/** Reads the params Supabase puts after `?` or `#` on the redirect back into the app. */
function paramsOf(url: string) {
  const out = new URLSearchParams();
  const hash = url.indexOf('#');
  const query = url.indexOf('?');
  if (query !== -1) new URLSearchParams(url.slice(query + 1, hash > query ? hash : undefined)).forEach((v, k) => out.set(k, v));
  if (hash !== -1) new URLSearchParams(url.slice(hash + 1)).forEach((v, k) => out.set(k, v));
  return out;
}

/**
 * Google sign-in through Supabase. Needs only dashboard setup (Google provider turned on, and the redirect
 * URL below added to Supabase -> Authentication -> URL Configuration); no keys live in the app.
 * Redirects to the existing /login route so the router never lands on an unknown path.
 */
export async function signInWithGoogle(): Promise<GoogleResult> {
  try {
    const redirectTo = Linking.createURL('login');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (error || !data.url) return { ok: false, message: error?.message ?? 'Could not start Google sign-in.' };

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== 'success') return { ok: false, cancelled: true, message: 'Sign-in was cancelled.' };

    const p = paramsOf(res.url);
    const failure = p.get('error_description') ?? p.get('error');
    if (failure) return { ok: false, message: failure.replace(/\+/g, ' ') };

    const code = p.get('code');
    const access = p.get('access_token');
    const refresh = p.get('refresh_token');
    const session = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : access && refresh
        ? await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
        : null;
    const user = session?.data.user ?? session?.data.session?.user;
    if (!session || session.error || !user) return { ok: false, message: session?.error?.message ?? 'Google sign-in did not finish. Please try again.' };
    return { ok: true, userId: user.id, email: user.email ?? '' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Google sign-in failed.' };
  }
}
