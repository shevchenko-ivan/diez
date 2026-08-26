// eslint-config-next v16 ships native flat configs. The previous setup piped
// them through FlatCompat (the eslintrc bridge), which v16 no longer survives —
// it throws "Converting circular structure to JSON" before linting a single
// file. Import the flat arrays directly instead.
//
// Both subpaths are needed: `core-web-vitals` carries Next's own rules, while
// `typescript` is what pulls in typescript-eslint's recommended set.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // v16 turns on the React Compiler rule set. These four flag patterns that
    // block compiler optimisation or risk cascading renders — worth fixing, but
    // none of them means anything is broken today, and there are ~44 across the
    // codebase (mostly the hydrate-from-localStorage-after-mount pattern).
    //
    // They stay as warnings on purpose. The error channel has to mean "this is
    // broken": `react-hooks/rules-of-hooks` had been reporting a real crash in
    // ChordHover for weeks and nobody saw it, because it sat in a pile of 22
    // errors nothing gated. Errors are now empty by default — anything new that
    // shows up there is signal. This is a backlog, not a permanent exemption.
    name: "diez/react-compiler-advisories",
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;
