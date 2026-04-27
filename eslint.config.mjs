import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: ["_legacy/**", ".next/**", "node_modules/**"],
  },
];

export default eslintConfig;
