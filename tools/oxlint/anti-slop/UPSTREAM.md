# Provenance

Source: https://github.com/dmmulroy/anti-slop

Exact commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`. Production assets copied unmodified from `skills/install-anti-slop/assets/anti-slop/` to `tools/oxlint/anti-slop/`. Root MIT license and nested ESLint Stylistic LICENSE/UPSTREAM.md are preserved.

## Integration

Oxlint and @oxlint/plugins are both exactly 1.86.0. All 18 generic custom rules plus native oxc/no-accumulating-spread are enabled. No direct Effect dependency exists, so Effect remains unregistered. Existing package manager, CI triggers, security checks and formatting commands are preserved.

Six documented no-runtime-typeof exceptions preserve existing save/custom-map boundary validation in native browser JavaScript. Unit tests: 34 passed. Full build/browser checks locally are limited by omitted binary assets and npm dependency tarball HTTP403; existing CI performs complete validation.

Initial diagnostic counts: {"anti-slop(no-runtime-typeof)": 6, "anti-slop(require-readable-spacing)": 310, "eslint(no-unused-vars)": 2}. Final lint: zero diagnostics using the matching, already verified local toolchain. No deployment or merge.
