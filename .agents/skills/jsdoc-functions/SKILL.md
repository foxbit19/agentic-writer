---
name: jsdoc-functions
description: >-
  Always write a JSDoc comment for every function in this project. Use whenever
  adding, editing, or reviewing functions, methods, arrow function exports, or
  callbacks that deserve a named binding.
---

# Always write a JSDoc comment for a function

When adding or changing a function in this project, always write a JSDoc comment for it.

## What to document

- Named functions and methods
- Exported arrow functions and `const` function bindings
- Class methods and static methods

## How to write it

1. Place a `/** ... */` block immediately above the function.
2. Start with a short summary of what the function does (not how).
3. Document parameters with `@param` when types alone are not enough, or when intent is unclear.
4. Document return values with `@returns` when the result is non-obvious.
5. Document thrown errors with `@throws` when callers must handle them.
6. Keep comments accurate: update JSDoc in the same pass when behavior changes.
7. Prefer concise, useful docs over restating TypeScript types verbatim.

## Examples

```ts
// ❌ BAD — no JSDoc
export function loadArticle(slug: string) {
  return readArticle(slug);
}
```

```ts
/**
 * Loads a saved article by slug from local storage.
 *
 * @param slug - Article identifier used as the storage key
 * @returns The article draft, or `null` if none exists
 */
export function loadArticle(slug: string) {
  return readArticle(slug);
}
```
