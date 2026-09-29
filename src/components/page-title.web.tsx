import Head from 'expo-router/head';

/**
 * Browser tab title for the focused screen ("Products · Warrantyly").
 * expo-router disables title-from-options, and `Head` only renders while its screen is focused.
 */
export function PageTitle({ title }: { title?: string }) {
  return (
    <Head>
      <title>{title ? `${title} · Warrantyly` : 'Warrantyly'}</title>
    </Head>
  );
}

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
const DESCRIPTION =
  'Scan receipts, track warranty expiry dates and get reminded before coverage ends. Every product warranty in one place.';
/** Link-preview crawlers need an absolute image URL, so set EXPO_PUBLIC_SITE_URL before deploying. */
const IMAGE = `${SITE_URL}/og-image.jpg`;

/**
 * Description and link-preview (Open Graph / Twitter) tags. Rendered once in the root layout,
 * so every pre-built page includes them for crawlers, which don't run the app's JavaScript.
 */
export function SiteMeta() {
  return (
    <Head>
      <meta name="description" content={DESCRIPTION} />
      <meta name="theme-color" content="#0B1020" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Warrantyly" />
      <meta property="og:title" content="Warrantyly — your warranty assistant" />
      <meta property="og:description" content={DESCRIPTION} />
      <meta property="og:image" content={IMAGE} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Warrantyly: all your product warranties in one place" />
      {SITE_URL ? <meta property="og:url" content={SITE_URL} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Warrantyly — your warranty assistant" />
      <meta name="twitter:description" content={DESCRIPTION} />
      <meta name="twitter:image" content={IMAGE} />
    </Head>
  );
}
