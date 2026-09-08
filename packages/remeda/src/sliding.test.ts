import { describe, expect, test, vi } from "vitest";
import { map } from "./map";
import { pipe } from "./pipe";
import { sliding } from "./sliding";
import { take } from "./take";

describe("data-first", () => {
  test("overlapping windows", () => {
    expect(sliding([1, 2, 3, 4], 2)).toStrictEqual([
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
  });

  test("a single window when size matches the length", () => {
    expect(sliding([1, 2, 3], 3)).toStrictEqual([[1, 2, 3]]);
  });

  test("empty when size exceeds the length", () => {
    expect(sliding([1, 2], 5)).toStrictEqual([]);
  });

  test("empty array", () => {
    expect(sliding([], 3)).toStrictEqual([]);
  });

  test("windows of one", () => {
    expect(sliding([1, 2, 3], 1)).toStrictEqual([[1], [2], [3]]);
  });
});

describe("data-last", () => {
  test("in a pipe", () => {
    expect(pipe([1, 2, 3, 4], sliding(2))).toStrictEqual([
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
  });

  test("invoked directly", () => {
    expect(sliding(2)([1, 2, 3, 4])).toStrictEqual([
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
  });

  test("matches data-first when no full window exists", () => {
    expect(pipe([1, 2], sliding(5))).toStrictEqual(sliding([1, 2], 5));
  });
});

describe("invalid size", () => {
  test("zero", () => {
    expect(() => sliding([1, 2, 3], 0)).toThrow(RangeError);
  });

  test("negative", () => {
    expect(() => sliding([1, 2, 3], -1)).toThrow(RangeError);
  });

  test("naN", () => {
    expect(() => sliding([1, 2, 3], NaN)).toThrow(RangeError);
  });

  test("throws from the lazy implementation too", () => {
    expect(() => pipe([1, 2, 3], sliding(0))).toThrow(RangeError);
  });
});

describe("fractional size", () => {
  test("truncates towards the smaller window", () => {
    expect(sliding([1, 2, 3, 4], 2.5)).toStrictEqual(sliding([1, 2, 3, 4], 2));
  });

  test("the lazy implementation truncates identically", () => {
    expect(pipe([1, 2, 3, 4], sliding(2.5))).toStrictEqual(
      sliding([1, 2, 3, 4], 2.5),
    );
  });
});

describe("immutability", () => {
  test("doesn't mutate the input", () => {
    const data = [1, 2, 3];

    sliding(data, 2);

    expect(data).toStrictEqual([1, 2, 3]);
  });

  test("windows don't share an array instance", () => {
    const [first, second] = sliding([1, 2, 3], 2);

    expect(first).not.toBe(second);
  });
});

describe("lazy", () => {
  test("short-circuits downstream", () => {
    const mockFunc = vi.fn<(x: number) => number>((x) => x);

    pipe([1, 2, 3, 4, 5], map(mockFunc), sliding(2), take(1));

    expect(mockFunc).toHaveBeenCalledTimes(2);
  });

  test("emits nothing while warming up", () => {
    const mockFunc = vi.fn<(x: number) => number>((x) => x);

    pipe([1, 2, 3], sliding(5), map(mockFunc));

    expect(mockFunc).toHaveBeenCalledTimes(0);
  });
});
