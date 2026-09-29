// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // The lucide index pulls every icon (~2.2 MB on web); icons are imported one by one in icons.ts.
    ignores: ["src/components/icons.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "lucide-react-native",
          message: "Import icons from '@/components/icons' (add new ones there) to keep the bundle small.",
          allowTypeImports: true,
        }],
      }],
    },
  },
]);
