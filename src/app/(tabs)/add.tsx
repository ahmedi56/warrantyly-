import { Redirect } from 'expo-router';

/** Placeholder route for the center tab; its button opens the scanner instead. */
export default function AddTab() {
  return <Redirect href="/scan" />;
}
