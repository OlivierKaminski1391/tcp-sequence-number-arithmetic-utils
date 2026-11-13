"use strict";

/**
 * Public entry point for TCP sequence number arithmetic utilities.
 *
 * The implementation lives in `./core.js`; this module re-exports the names
 * that form the supported API so consumers can import from the package root.
 */

export {
  UINT32_MAX,
  SEQ_HALF,
  toUint32,
  compareSeq,
  addSeq,
  distance,
  inWindow,
} from "./core.js";
