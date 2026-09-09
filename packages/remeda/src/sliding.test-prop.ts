import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";
import { pipe } from "./pipe";
import { sliding } from "./sliding";

const array = fc.array(fc.anything(), { maxLength: 20 });
const windowSize = fc.integer({ min: 1, max: 10 });

test.prop([array, windowSize])(
  "every window has exactly `size` items",
  (data, size) => {
    expect(sliding(data, size).every(({ length }) => length === size)).toBe(
      true,
    );
  },
);

test.prop([array, windowSize])(
  "the window count accounts for every complete window",
  (data, size) => {
    expect(sliding(data, size)).toHaveLength(
      Math.max(0, data.length - size + 1),
    );
  },
);

test.prop([array, windowSize])(
  "windows slide one item at a time",
  (data, size) => {
    expect(
      sliding(data, size).every((window, index) =>
        window.every((item, offset) => Object.is(item, data[index + offset])),
      ),
    ).toBe(true);
  },
);

test.prop([array, windowSize])(
  "data-first and data-last produce the same result",
  (data, size) => {
    expect(sliding(data, size)).toStrictEqual(pipe(data, sliding(size)));
  },
);
