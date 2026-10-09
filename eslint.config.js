import tseslint from "typescript-eslint";

// Lint arme : regles recommandees de typescript-eslint (INFRA-212).
export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "error",
      // Un parametre prefixe par _ est volontairement inutilise (ex. test/store.spec.ts).
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
    }
  }
);
