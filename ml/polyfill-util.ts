// Polyfill for removed Node.js util APIs used by older @tensorflow/tfjs-node
// Node.js v22+ removed util.isNullOrUndefined, util.isArray, etc.
// This must be loaded before tfjs-node.

import util from 'node:util';

if (!('isNullOrUndefined' in util)) {
  (util as any).isNullOrUndefined = (x: unknown) => x === null || x === undefined;
}
if (!('isArray' in util)) {
  (util as any).isArray = Array.isArray;
}
if (!('isString' in util)) {
  (util as any).isString = (x: unknown) => typeof x === 'string';
}
if (!('isNumber' in util)) {
  (util as any).isNumber = (x: unknown) => typeof x === 'number';
}
if (!('isBoolean' in util)) {
  (util as any).isBoolean = (x: unknown) => typeof x === 'boolean';
}
if (!('isObject' in util)) {
  (util as any).isObject = (x: unknown) => x !== null && typeof x === 'object';
}
