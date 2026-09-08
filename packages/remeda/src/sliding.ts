import type {
  GreaterThanOrEqual,
  IsInteger,
  IsNumericLiteral,
  LessThan,
} from "type-fest";
import type { IterableContainer } from "./internal/types/IterableContainer";
import type { LazyEvaluator } from "./internal/types/LazyEvaluator";
import type { NTuple } from "./internal/types/NTuple";
import type { TupleParts } from "./internal/types/TupleParts";
import { SKIP_ITEM } from "./internal/utilityEvaluators";
import { purry } from "./purry";

// Typing a window as a fixed-width tuple costs one level of recursion per
// element, so beyond some width we give up the precise type instead of hitting
// typescript's recursion limit. The bound mirrors the one in `chunk`, where the
// recursion is significantly heavier; it is deliberately conservative here.
type MAX_LITERAL_SIZE = 350;

// The size is checked *before* the empty-input case (unlike `chunk`) so that
// the type agrees with the implementation, which throws on an invalid size
// regardless of what the input contains.
type Sliding<T extends IterableContainer, N extends number> =
  IsNumericLiteral<N> extends true
    ? LessThan<N, 1> extends true
      ? never
      : T extends readonly []
        ? []
        : // A non-integer size is truncated at runtime, but there's no
          // type-level truncation to match it, and `NTuple` would never stop
          // recursing on one. The generic type is a supertype of the precise
          // one, so falling back to it is always sound.
          IsInteger<N> extends true
          ? LessThan<N, MAX_LITERAL_SIZE> extends true
            ? SlidingWindows<T, NTuple<T[number], N>, N>
            : T[number][][]
          : T[number][][]
    : T extends readonly []
      ? []
      : T[number][][];

// Only the required and suffix elements are guaranteed to be there; optional
// and rest elements might not be. When those alone fill a whole window we know
// the output can't be empty.
type SlidingWindows<T extends IterableContainer, Window, N extends number> = [
  ...TupleParts<T>["required"],
  ...TupleParts<T>["suffix"],
]["length"] extends infer GuaranteedLength extends number
  ? GreaterThanOrEqual<GuaranteedLength, N> extends true
    ? [Window, ...Window[]]
    : Window[]
  : never;

/**
 * Returns every contiguous window of `size` elements, in order. Windows overlap
 * and advance one element at a time. Only complete windows are returned, so
 * when `size` is larger than the array the result is empty.
 *
 * Related operations:
 * - `chunk` - to split into non-overlapping groups instead.
 * - `zip` - to pair elements of two arrays instead of neighbors of one.
 *
 * @param array - The array.
 * @param size - The length of each window. Must be at least 1.
 * @signature
 *    sliding(array, size)
 * @example
 *    sliding([1, 2, 3, 4], 2) // => [[1, 2], [2, 3], [3, 4]]
 *    sliding([1, 2], 5) // => []
 * @dataFirst
 * @lazy
 * @category Array
 */
export function sliding<T extends IterableContainer, N extends number>(
  array: T,
  size: N,
): Sliding<T, N>;

/**
 * Returns every contiguous window of `size` elements, in order. Windows overlap
 * and advance one element at a time. Only complete windows are returned, so
 * when `size` is larger than the array the result is empty.
 *
 * Related operations:
 * - `chunk` - to split into non-overlapping groups instead.
 * - `zip` - to pair elements of two arrays instead of neighbors of one.
 *
 * @param size - The length of each window. Must be at least 1.
 * @signature
 *    sliding(size)(array)
 * @example
 *    pipe([1, 2, 3, 4], sliding(2)) // => [[1, 2], [2, 3], [3, 4]]
 *    pipe([1, 2], sliding(5)) // => []
 * @dataLast
 * @lazy
 * @category Array
 */
export function sliding<N extends number>(
  size: N,
): <T extends IterableContainer>(array: T) => Sliding<T, N>;

export function sliding(...args: readonly unknown[]): unknown {
  return purry(slidingImplementation, args, lazyImplementation);
}

function slidingImplementation<T>(data: readonly T[], size: number): T[][] {
  const width = windowWidth(size);
  const count = data.length - width + 1;

  if (count <= 0) {
    return [];
  }

  // eslint-disable-next-line unicorn/no-new-array -- This is OK, a sparse array allows us to handle very large arrays more efficiently.
  const result = new Array<T[]>(count);

  for (let index = 0; index < count; index += 1) {
    result[index] = data.slice(index, index + width);
  }

  return result;
}

function lazyImplementation<T>(size: number): LazyEvaluator<T, T[]> {
  const width = windowWidth(size);
  const window: T[] = [];

  return (value) => {
    window.push(value);

    if (window.length < width) {
      // Still warming up; the first complete window only exists once we've seen
      // `width` items.
      return SKIP_ITEM;
    }

    const next = [...window];
    window.shift();

    return { done: false, hasNext: true, next };
  };
}

function windowWidth(size: number): number {
  // Written as `!(size >= 1)` rather than `size < 1` so that `NaN` is rejected
  // here too, instead of surfacing later as an opaque "Invalid array length".
  if (!(size >= 1)) {
    throw new RangeError(
      `sliding: A window size of '${size.toString()}' is not a valid window size`,
    );
  }

  // Truncating up-front is what keeps the eager and lazy implementations in
  // agreement on a fractional size; neither can compare against a width no
  // window will ever have.
  return Math.trunc(size);
}
