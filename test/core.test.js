import { test } from "node:test";
import assert from "node:assert/strict";

import {
  UINT32_MAX,
  SEQ_HALF,
  toUint32,
  compareSeq,
  addSeq,
  distance,
  inWindow,
} from "../src/index.js";

// --- constants -------------------------------------------------------------

test("constants match the 32-bit sequence space", () => {
  assert.equal(UINT32_MAX, 4294967295);
  assert.equal(SEQ_HALF, 2147483648);
});

// --- toUint32 --------------------------------------------------------------

test("toUint32 truncates and maps negatives into the unsigned range", () => {
  assert.equal(toUint32(0), 0);
  assert.equal(toUint32(-1), UINT32_MAX);
  assert.equal(toUint32(0x1_0000_0000), 0);
  assert.equal(toUint32(0x1_0000_0001), 1);
  assert.equal(toUint32(4294967296 + 123), 123);
});

// --- compareSeq ------------------------------------------------------------

test("compareSeq orders small forward distances", () => {
  assert.equal(compareSeq(100, 200), -1);
  assert.equal(compareSeq(200, 100), 1);
  assert.equal(compareSeq(100, 100), 0);
});

test("compareSeq handles wraparound across zero", () => {
  // UINT32_MAX is before 0 by one step.
  assert.equal(compareSeq(UINT32_MAX, 0), -1);
  assert.equal(compareSeq(0, UINT32_MAX), 1);
  // A large forward distance is treated as "before" only when it is less
  // than half the space.
  assert.equal(compareSeq(0, SEQ_HALF - 1), -1);
  assert.equal(compareSeq(0, SEQ_HALF), 1);
});

test("compareSeq treats exactly half the space as after", () => {
  // 2^31 steps forward is not less than 2^31, so b is considered "after" a.
  assert.equal(compareSeq(0, SEQ_HALF), 1);
  assert.equal(compareSeq(SEQ_HALF, 0), 1);
});

// --- addSeq ----------------------------------------------------------------

test("addSeq adds positive offsets with wraparound", () => {
  assert.equal(addSeq(0, 1), 1);
  assert.equal(addSeq(UINT32_MAX, 1), 0);
  assert.equal(addSeq(UINT32_MAX - 5, 10), 4);
});

test("addSeq accepts negative offsets by reducing modulo 2^32", () => {
  assert.equal(addSeq(0, -1), UINT32_MAX);
  assert.equal(addSeq(5, -10), UINT32_MAX - 4);
  assert.equal(addSeq(0, 0x1_0000_0000), 0);
});

// --- distance --------------------------------------------------------------

test("distance is the forward gap modulo 2^32", () => {
  assert.equal(distance(0, 0), 0);
  assert.equal(distance(10, 20), 10);
  assert.equal(distance(UINT32_MAX, 0), 1);
  assert.equal(distance(0, UINT32_MAX), UINT32_MAX);
});

test("distance and addSeq are inverses for forward moves", () => {
  const start = 0xfffffff0;
  const end = 0x00000010;
  assert.equal(addSeq(start, distance(start, end)), end);
});

// --- inWindow --------------------------------------------------------------

test("inWindow is half-open", () => {
  assert.equal(inWindow(10, 10, 20), true);
  assert.equal(inWindow(19, 10, 20), true);
  assert.equal(inWindow(20, 10, 20), false);
  assert.equal(inWindow(9, 10, 20), false);
});

test("inWindow handles a window that wraps around zero", () => {
  const start = UINT32_MAX - 3; // 4294967292
  const end = 4;
  assert.equal(inWindow(UINT32_MAX, start, end), true);
  assert.equal(inWindow(0, start, end), true);
  assert.equal(inWindow(3, start, end), true);
  assert.equal(inWindow(4, start, end), false);
  assert.equal(inWindow(start - 1, start, end), false);
});

test("inWindow with an empty window contains nothing", () => {
  assert.equal(inWindow(0, 5, 5), false);
  assert.equal(inWindow(5, 5, 5), false);
});

test("inWindow rejects a sequence number outside a full-space window", () => {
  // A window covering the whole 32-bit space cannot be represented by a
  // half-open interval because start === end; we document that as empty.
  assert.equal(inWindow(123, 0, 0), false);
});
