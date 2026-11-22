# tcp-sequence-number-arithmetic-utils

Compare and add TCP sequence numbers using unsigned 32-bit wraparound semantics, for receive-window calculations.

```js
import { compareSeq, addSeq, distance, inWindow } from "./src/index.js";

compareSeq(100, 200);        // -1 (100 is before 200)
compareSeq(0xffffffff, 0);   // -1 (wraps around zero)
addSeq(0xffffffff, 1);       // 0
addSeq(0, -1);               // 4294967295
distance(0xfffffff0, 0x10);  // 32
inWindow(5, 0xfffffff0, 0x10); // true
```

## Why this exists

TCP sequence numbers are 32-bit unsigned integers that wrap around. Comparing them with `<` and `>` is wrong near the wrap point, and adding an offset with `+` produces a number outside the 32-bit range. This library implements the serial-number arithmetic TCP actually relies on: a sequence number `a` is "before" `b` when the forward distance from `a` to `b` is less than 2^31. That threshold is the trade-off — a window larger than 2^31 bytes cannot be expressed, which matches the protocol's own limit.

## The awkward edge

The half-open interval used by `inWindow(seq, start, end)` cannot represent a window that covers the entire 32-bit space, because that would require `start === end`. This library defines `start === end` as an empty window, so `inWindow(123, 0, 0)` returns `false`. If you need a full-space window, handle it as a special case in your own code.

## API

- `UINT32_MAX` — `4294967295`
- `SEQ_HALF` — `2147483648` (2^31), the comparison threshold
- `toUint32(value)` — coerce a value to an unsigned 32-bit integer
- `compareSeq(a, b)` — returns `-1`, `0`, or `1`
- `addSeq(seq, offset)` — add a signed offset modulo 2^32
- `distance(from, to)` — forward distance modulo 2^32
- `inWindow(seq, start, end)` — true when `seq` is in the half-open interval `[start, end)`

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

