---
name: remove-dead-code
description: >-
  Always remove dead code when editing this project. Use whenever writing,
  refactoring, or reviewing code — unused imports, unreachable branches,
  obsolete helpers, commented-out code, and unused exports.
---

# Always remove dead code

When changing code in this project, always remove dead code. Do not leave unused symbols behind.

## What counts as dead code

- Unused imports, variables, parameters, types, and exports
- Unreachable branches and functions nothing calls
- Commented-out code blocks kept "just in case"
- Obsolete helpers, wrappers, or config left after a refactor
- Duplicate logic replaced by a new path

## How to apply

1. After every edit, scan the touched files (and their direct callers/imports) for leftovers from the change.
2. Delete dead code in the same pass — do not defer cleanup to a follow-up.
3. Prefer deleting over commenting out.
4. If removing an export, confirm nothing else in the repo still imports it; then remove the definition.
5. Keep behavior-preserving cleanups focused: do not expand scope into unrelated refactors.

## Do not keep

```ts
// ❌ BAD — leftover after refactor
// const oldHelper = () => { ... }

import { unusedUtil } from "./utils"; // never referenced

export function obsoletePath() {
  // no callers remain
}
```

```ts
// ✅ GOOD — only what is used remains
import { activeUtil } from "./utils";

export function currentPath() {
  return activeUtil();
}
```
