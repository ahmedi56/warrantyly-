/**
 * Page titles are a web concern (see page-title.web.tsx). On iOS, `Head` would also publish
 * Handoff/Spotlight activity for every screen, so native renders nothing.
 */
export function PageTitle(_props: { title?: string }) {
  return null;
}

/** Link-preview tags only exist on web (see page-title.web.tsx). */
export function SiteMeta() {
  return null;
}
