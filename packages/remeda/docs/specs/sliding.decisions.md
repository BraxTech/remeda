# `sliding` — decisions

Date: 2026-09-08

## Goal

Add `sliding(array, size)` — a lazy, purried Array function returning every contiguous window of exactly `size` elements, in order. Fills Ramda's `aperture`, currently listed in `packages/docs/src/content/mapping/ramda/__MISSING.md`.

## Decisions

1. Name? → **`sliding`** (why: matches the branch and Scala's `List.sliding(n)`; reads well data-last as `pipe(data, sliding(3))`, and `aperture` is Ramda jargon that fails remeda's naming philosophy)
2. `sliding([1, 2], 5)` → **`[]`** (why: only complete windows are ever emitted, so every window is provably `size` long — the invariant that makes this worth shipping over `chunk`; matches Ramda `aperture`, Rust `slice::windows`, Python `itertools.sliding_window`)
3. `size < 1` → **throw `RangeError` at runtime (guard written as `!(size >= 1)` so `NaN` throws too), `never` return type for literal sizes** (why: mirrors `chunk` exactly, and API consistency with the sibling function beats "prefer not throwing" when a 0-length window has no coherent meaning)
4. Lazy in `pipe`? → **Yes, `@lazy`** (why: rolling buffer enables real short-circuiting downstream; adding `@lazy` later would be a `fix:` behavior change rather than a free addition)
5. Return-type precision? → **Fixed-width windows + provable non-emptiness** (why: literal `size` yields exact-length tuple windows, and the outer array is typed `[W, ...W[]]` when required/suffix elements guarantee at least one window; ~40 lines of types instead of `chunk`'s ~180 lines of recursive combinatorics)
6. Element types inside a window? → **Uniform union `T[number]` per slot** (why: lossless for the homogeneous data sliding windows are actually used on; positional literals would reintroduce the rest-length combinatorics rejected in decision 5)
7. `step`/stride parameter? → **No, stride is always 1** (why: optional params are a stated code smell, and `step === size` is just `chunk` — a step param would differentiate `sliding` from `chunk` by argument instead of by name)
8. `sliding([1,2,3,4], 2.5)` → **Truncates to `size = 2`, no integrality guard** (why: matches `chunk`, which also doesn't guard; avoids adding a runtime safety net)

## Implementation notes

- Fractional `size` is normalized once, up front, with `Math.trunc`. This supersedes the `>=`-not-`===` note from the interview: `slice` truncation alone does *not* reproduce decision 8's stated output (it yields 2 windows for `size 2.5`, not the 3 that `size 2` gives), so the eager and lazy paths only agree if the size is normalized before either runs. After normalization the lazy evaluator can simply skip while `window.length < size`.
- Literal-`size` types need a `MAX_LITERAL_SIZE`-style guard like `chunk`'s, falling back to the generic type so large literal sizes don't blow TypeScript's recursion limit.
- `NTuple` (`src/internal/types/NTuple.ts`) is the existing building block for fixed-width windows; `chunk.ts` is the reference for the guard pattern and `take.ts` for the lazy evaluator shape.
- `LazyCallback` does **not** apply here: it types the `data` argument of a *callback*, and `sliding` takes no callback. The `CONTRIBUTING.md` note is only relevant to lazy functions like `filter`/`map`.
- The type-level `IsInteger<N>` branch is mandatory, not defensive: `NTuple<T, 2.5>` recurses forever because `Result["length"] extends 2.5` never holds.

## Not decided by the operator (recorded as defaults, flag if wrong)

- JSDoc `@category Array`; `Related operations:` block cross-linking `chunk` (non-overlapping partition) and `zip`.
- Ramda mapping page added under `packages/docs/src/content/mapping/ramda/`, and `aperture` removed from that directory's `__MISSING.md`. Required by `CONTRIBUTING.md` whenever an equivalent exists. No Lodash or Just equivalent exists, so no page for those.
- Commit/PR title `feat(sliding): ...` — new function, releases as a **patch** under remeda's inverted semantics.

## Explicitly out of scope

- `step`/stride parameter (decision 7).
- Partial/truncated trailing windows (decision 2).
- Positionally-precise window element types (decision 6).
- `chunk`-grade exact output tuples including window count (decision 5).
- Strings or non-array iterables as input — `IterableContainer` is arrays and tuples only.
- Any `slidingLast`/right-to-left variant.

## Done means

- `npm run test:prop` green on four invariants: (1) every window has `length === size`; (2) window count `=== max(0, data.length - size + 1)`; (3) `sliding(d, s)[i][j] === d[i + j]`; (4) the eager result equals the result through `pipe` (lazy path agrees with data-first).
- The automatic turn-end hook chain passes for `packages/remeda` (`check` → `lint --fix` → `test:coverage` at 100% thresholds → `test:types`) and, because the mapping page touches `packages/docs`, for that package too (`sync` → `check` → `lint` → `build`, which requires a fresh `packages/remeda/dist`).

## Open items

- None blocking. The three defaults under "Not decided by the operator" should be skimmed before implementation starts.
