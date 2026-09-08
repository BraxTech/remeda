# `sliding`

Status: approved
Decisions: docs/specs/sliding.decisions.md

## Problem

Remeda has no way to iterate contiguous overlapping windows of an array. `chunk` partitions without overlap, so pairwise/rolling work (deltas, moving averages, "is this sequence ascending") falls back to a hand-rolled index loop that loses both the pipe composition and the fixed-width tuple type that makes destructuring safe. Ramda users migrating hit this directly: `aperture` sits in `packages/docs/src/content/mapping/ramda/__MISSING.md`.

## Solution

New function `src/sliding.ts`, purried and lazy, following `src/chunk.ts` for the literal-size type guard and `src/take.ts` for the evaluator shape. Also:

- `src/index.ts` — add `export * from "./sliding";` between `sliceString` (L123) and `sort` (L124).
- `src/chunk.ts` — add a `Related operations:` JSDoc line pointing at `sliding`, so the non-overlapping/overlapping pair is discoverable from either side.
- `packages/docs/src/content/mapping/ramda/aperture.md` — new page, `category: List`, `remeda: sliding`, empty body (direct equivalent). Remove `- aperture` from that directory's `__MISSING.md`.

## Interface

```ts
// src/sliding.ts
export function sliding<T extends IterableContainer, N extends number>(
  array: T,
  size: N,
): Sliding<T, N>;

export function sliding<N extends number>(
  size: N,
): <T extends IterableContainer>(array: T) => Sliding<T, N>;
```

```ts
// Literal, integral size in [1, MAX_LITERAL_SIZE) => exact-width tuple windows.
// Anything else => T[number][][]. The generic type is a supertype of the
// precise one, so falling back is always sound.
type MAX_LITERAL_SIZE = 350;

type Sliding<T extends IterableContainer, N extends number> =
  IsNumericLiteral<N> extends true
    ? LessThan<N, 1> extends true
      ? never
      : T extends readonly []
        ? []
        : IsInteger<N> extends true
          ? LessThan<N, MAX_LITERAL_SIZE> extends true
            ? SlidingWindows<T, NTuple<T[number], N>, N>
            : T[number][][]
          : T[number][][]
    : T extends readonly []
      ? []
      : T[number][][];

// Non-empty only when the input's *guaranteed* length (required + suffix
// elements; optional and rest elements can be absent) covers one full window.
type SlidingWindows<T extends IterableContainer, Window, N extends number> =
  GreaterThanOrEqual<
    [...TupleParts<T>["required"], ...TupleParts<T>["suffix"]]["length"],
    N
  > extends true
    ? [Window, ...Window[]]
    : Window[];
```

JSDoc: `@category Array`, `@lazy`, `@dataFirst`/`@dataLast`, and a `Related operations:` block naming `chunk` and `zip`.

## Behavior

Each bullet is one test.

- `sliding([1, 2, 3, 4], 2)` → `[[1, 2], [2, 3], [3, 4]]`.
- `sliding([1, 2, 3], 3)` → `[[1, 2, 3]]` — exactly one window when `size === length`.
- `sliding([1, 2], 5)` → `[]` — no partial window is ever emitted.
- `sliding([], 3)` → `[]`.
- `sliding([1, 2, 3], 1)` → `[[1], [2], [3]]`.
- `size < 1` (`0`, `-1`) throws `RangeError`, before any other work.
- `size` is `NaN` throws the same `RangeError` (guard is `!(size >= 1)`, not `size < 1`).
- `size` is fractional (`2.5`) behaves exactly as `2`: normalized once via `Math.trunc`.
- Input array is not mutated; every window is a fresh array; no two windows share an array instance.
- Data-last through `pipe` returns a value deep-equal to data-first for the same inputs.
- Lazy: `pipe([1, 2, 3, 4, 5], map(spy), sliding(2), take(1))` calls `spy` exactly 2 times.
- Lazy warm-up: the first `size - 1` items yield `SKIP_ITEM`; no window escapes early.

Type behavior (`.test-d.ts`):

- `sliding([1, 2, 3] as number[], 3)` → `[number, number, number][]`.
- `sliding([1, 2, 3] as [number, number, number], 2)` → `[[number, number], ...[number, number][]]` (non-empty).
- `sliding([1, 2] as [number, ...number[], number], 2)` → non-empty; with `3` → possibly empty.
- `sliding([1] as [number, number?], 2)` → possibly empty (optional element can't be counted).
- `sliding(data, 0)` / `sliding(data, -1)` → `never`.
- `sliding(data, 2 as number)` → `number[][]`.
- `sliding(data, 2.5)` → `number[][]` (falls back; runtime is more precise, which is sound).
- `sliding([] as [], 2)` → `[]`.
- Readonly inputs and `interface`/`class` element types are accepted (`T extends object` lattice).

## Not doing

- `step`/stride parameter. Partial trailing windows. Positional element types inside a window. `chunk`-grade exact output tuples with window count. Strings or non-array iterables. Any `slidingLast` variant.
- No `size === 1` fast path in the implementation — `chunk` has one, but the philosophy requires a benchmark to justify it and we have none.

## Verification

- Unit: `src/sliding.test.ts` (every runtime bullet above, both calling styles), `src/sliding.test-d.ts` (every type bullet), `src/sliding.test-prop.ts`.
- E2E: `npm run test:prop` green on four invariants — (1) every window has `length === size`; (2) window count `=== max(0, data.length - size + 1)`; (3) `sliding(d, s)[i][j] === d[i + j]`; (4) data-first result deep-equals the `pipe` result.
- The turn-end hook must pass for `packages/remeda` (`check` → `lint --fix` → `test:coverage` at 100% → `test:types`) and for `packages/docs` (needs a fresh `packages/remeda/dist`, since the mapping page makes that package dirty).

## Risks

- **`NTuple` recursion.** `NTuple<T, 2.5>` never terminates — `Result["length"] extends 2.5` is never true. The `IsInteger` branch is load-bearing, not defensive; dropping it hangs `tsc`. Test `sliding(data, 2.5)` at the type level to pin it.
- **`MAX_LITERAL_SIZE = 350` is copied from `chunk`, where it was tuned for far heavier recursion.** `sliding`'s type is one `NTuple` deep, so 350 is likely conservative. Not worth tuning without a failing case, but a reviewer may ask why.
- **Branch ordering diverges from `chunk`.** `chunk` checks `T extends readonly []` *before* the size check, so `chunk([] as [], 0)` types as `[]` while throwing at runtime. `sliding` checks size first so the type matches the throw. Deliberate; flag it in the PR.
- **Non-emptiness and `exactOptionalPropertyTypes`.** `TupleParts` splits optional elements out of `required`, so `[number, number?]` correctly yields a guaranteed length of 1. Verify against `TupleParts`' 10 documented tuple shapes rather than assuming.
- Single-session scope — one new file, three test files, a one-line export, a one-line JSDoc edit, and one docs page. No tickets file.
