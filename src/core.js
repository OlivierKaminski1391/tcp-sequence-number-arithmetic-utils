"use strict";

/**
 * TCP sequence number arithmetic with unsigned 32-bit wraparound semantics.
 *
 * TCP sequence numbers are 32-bit unsigned integers that wrap around. The
 * window size is at most 2^31 - 1 bytes, so a sequence number is considered
 * "after" another if the forward distance is less than 2^31. This module
 * implements that comparison and the modular addition used by window
 * calculations.
 *
 * All functions operate on plain JavaScript numbers and return unsigned
 * 32-bit integers (0 .. 4294967295). Inputs are coerced with `>>> 0`, which
 * truncates to 32 bits and maps negative numbers into the unsigned range.
 */

/** The largest unsigned 32-bit integer. */
export const UINT32_MAX = 0xffffffff;

/** Half of the sequence number space, used as the comparison threshold. */
export const SEQ_HALF = 0x80000000; // 2^31

/**
 * Coerce a value to an unsigned 32-bit integer.
 *
 * JavaScript bitwise operators already produce signed 32-bit results, so we
 * finish with `>>> 0` to get the unsigned representation. This is the single
 * place where coercion happens, which keeps the rest of the module simple.
 *
 * @param {number} value
 * @returns {number} an integer in [0, 4294967295]
 */
export function toUint32(value) {
  return value >>> 0;
}

/**
 * Compare two TCP sequence numbers using serial number arithmetic (RFC 1982).
 *
 * Returns -1 if `a` is before `b`, 1 if `a` is after `b`, and 0 if they are
 * equal. The comparison is only meaningful when the true distance between the
 * numbers is less than 2^31; this is the assumption TCP makes about windows.
 *
 * @param {number} a
 * @param {number} b
 * @returns {-1 | 0 | 1}
 */
export function compareSeq(a, b) {
  const x = toUint32(a);
  const y = toUint32(b);
  if (x === y) {
    return 0;
  }
  // Forward distance from x to y, modulo 2^32.
  const forward = (y - x) >>> 0;
  return forward < SEQ_HALF ? -1 : 1;
}

/**
 * Add a signed or unsigned offset to a sequence number modulo 2^32.
 *
 * The offset may be negative; it is reduced modulo 2^32 before addition, so
 * `addSeq(0, -1)` yields 0xffffffff. This is the operation used to advance a
 * sequence number by a window length or to step backwards for retransmission
 * bookkeeping.
 *
 * @param {number} seq
 * @param {number} offset
 * @returns {number} the resulting sequence number in [0, 4294967295]
 */
export function addSeq(seq, offset) {
  return (toUint32(seq) + (offset >>> 0)) >>> 0;
}

/**
 * Compute the forward distance from `from` to `to` modulo 2^32.
 *
 * This is the number of bytes you would advance to get from `from` to `to`,
 * assuming the distance is less than 2^31. It is the inverse of `addSeq`.
 *
 * @param {number} from
 * @param {number} to
 * @returns {number} distance in [0, 4294967295]
 */
export function distance(from, to) {
  return (toUint32(to) - toUint32(from)) >>> 0;
}

/**
 * Return true if `seq` lies in the half-open interval [start, end) using
 * sequence number arithmetic.
 *
 * This answers the question "is this sequence number inside the receive
 * window?" without materialising the window as a list of numbers. The
 * interval may wrap around zero.
 *
 * @param {number} seq
 * @param {number} start
 * @param {number} end
 * @returns {boolean}
 */
export function inWindow(seq, start, end) {
  const s = toUint32(seq);
  const a = toUint32(start);
  const b = toUint32(end);
  if (a === b) {
    // Empty window: nothing is inside it.
    return false;
  }
  return distance(a, s) < distance(a, b);
}
