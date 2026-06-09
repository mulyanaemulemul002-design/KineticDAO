---
name: Vite env types
description: How to fix "Property 'env' does not exist on type 'ImportMeta'" in .ts files
---

Add `/// <reference types="vite/client" />` at the top of any `.ts` file that accesses `import.meta.env`.

**Why:** Vite's `ImportMeta` augmentation lives in `vite/client` types. Without it, TypeScript doesn't know about `import.meta.env`.

**How to apply:** One-liner at the very top of the file, before any imports.
