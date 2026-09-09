import { describe, expectTypeOf, test } from "vitest";
import { pipe } from "./pipe";
import { sliding } from "./sliding";

describe("invalid sizes", () => {
  test("zero", () => {
    const result = sliding([1, 2, 3], 0);

    expectTypeOf(result).toEqualTypeOf<never>();
  });

  test("negative", () => {
    const result = sliding([1, 2, 3], -1);

    expectTypeOf(result).toEqualTypeOf<never>();
  });

  test("empty tuples are still rejected", () => {
    const result = sliding([] as [], 0);

    expectTypeOf(result).toEqualTypeOf<never>();
  });
});

describe("imprecise sizes fall back to the generic type", () => {
  test("non-literal size", () => {
    const result = sliding([1, 2, 3], 2 as number);

    expectTypeOf(result).toEqualTypeOf<number[][]>();
  });

  // `NTuple` recurses once per element and never terminates for a fractional
  // size, so this must not reach the literal branch.
  test("fractional size", () => {
    const result = sliding([1, 2, 3, 4], 2.5);

    expectTypeOf(result).toEqualTypeOf<number[][]>();
  });

  test("size beyond the literal limit", () => {
    const result = sliding([1, 2, 3], 1000);

    expectTypeOf(result).toEqualTypeOf<number[][]>();
  });
});

describe("empty inputs", () => {
  test("empty tuple", () => {
    const result = sliding([] as [], 2);

    expectTypeOf(result).toEqualTypeOf<[]>();
  });

  test("empty tuple with a non-literal size", () => {
    const result = sliding([] as [], 2 as number);

    expectTypeOf(result).toEqualTypeOf<[]>();
  });
});

describe("windows are fixed-width", () => {
  test("array", () => {
    const result = sliding([] as number[], 3);

    expectTypeOf(result).toEqualTypeOf<[number, number, number][]>();
  });

  test("readonly array", () => {
    const result = sliding([] as readonly number[], 2);

    expectTypeOf(result).toEqualTypeOf<[number, number][]>();
  });

  test("interface elements", () => {
    const result = sliding([] as Date[], 2);

    expectTypeOf(result).toEqualTypeOf<[Date, Date][]>();
  });

  test("elements are the union of the input's elements, not positional", () => {
    const result = sliding([1, 2, 3, 4] as const, 2);

    expectTypeOf(result).toEqualTypeOf<
      [[1 | 2 | 3 | 4, 1 | 2 | 3 | 4], ...[1 | 2 | 3 | 4, 1 | 2 | 3 | 4][]]
    >();
  });
});

describe("non-emptiness", () => {
  test("fixed tuple long enough for a window", () => {
    const result = sliding([] as unknown as [number, number, number], 2);

    expectTypeOf(result).toEqualTypeOf<
      [[number, number], ...[number, number][]]
    >();
  });

  test("required elements around a rest element", () => {
    const result = sliding([] as unknown as [number, ...number[], number], 2);

    expectTypeOf(result).toEqualTypeOf<
      [[number, number], ...[number, number][]]
    >();
  });

  test("rest elements can't be counted towards a window", () => {
    const result = sliding([] as unknown as [number, ...number[], number], 3);

    expectTypeOf(result).toEqualTypeOf<[number, number, number][]>();
  });

  test("optional elements can't be counted towards a window", () => {
    const result = sliding([] as unknown as [number, number?], 2);

    expectTypeOf(result).toEqualTypeOf<
      [number | undefined, number | undefined][]
    >();
  });
});

describe("data-last", () => {
  test("in a pipe", () => {
    const result = pipe([] as number[], sliding(2));

    expectTypeOf(result).toEqualTypeOf<[number, number][]>();
  });

  test("preserves non-emptiness", () => {
    const result = pipe([] as unknown as [number, number], sliding(2));

    expectTypeOf(result).toEqualTypeOf<
      [[number, number], ...[number, number][]]
    >();
  });
});
