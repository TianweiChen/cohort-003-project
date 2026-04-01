# Claude Code Instructions

## Code Style

### Object Parameters for Same-Type Arguments

When a function has two or more parameters of the same type, use an object parameter instead of positional parameters. This prevents accidentally swapping arguments when calling the function.

```ts
// BAD — easy to swap userId and lessonId, compiler won't catch it
const toggleBookmark = (userId: number, lessonId: number) => {};

// GOOD — named at the call site, impossible to mix up
const toggleBookmark = (opts: { userId: number; lessonId: number }) => {};
```

This applies to **all new functions** you write. Do not change existing functions in the codebase that already use positional parameters.

### Service Files Require Tests

Any file named as a service (e.g. `authTokenService.ts`, `bookmarkService.ts`) must have a corresponding `.test.ts` file (e.g. `authTokenService.test.ts`) in the same directory. Write tests for all exported functions when creating or modifying a service file.

### No `any` Types

Do not use `any` as a type annotation. If the type is genuinely unknown, use `unknown` and narrow it. If you are working with a dynamic record, use `Record<string, unknown>` or a more specific type.

```ts
// BAD
const updates: Record<string, any> = {};

// GOOD
const updates: Record<string, unknown> = {};
```
