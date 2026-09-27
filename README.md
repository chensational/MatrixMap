# MatrixMap

MatrixMap is a JavaScript class that extends the built-in `Array` class, augmented with an efficient keyMap for O(1) key-based lookups. It keeps the keyMap automatically synchronized with array operations.

## Features

* Extends the built-in `Array` class with all native methods.
* Maintains an internal keyMap updated on modifications.
* Supports custom key fields (defaults to `_id`).
* Provides fast lookup with the `getByKey` method.
* Optionally tracks collection and per-element versions for mutable UI state.

## Installation

```bash
npm install @chensational/matrixmap
```

## Usage

### Creating a MatrixMap with the default key (`_id`):

```javascript
import { createMatrixMap } from '@chensational/matrixmap';

const mm = createMatrixMap([
  { _id: 1, value: 'a' },
  { _id: 2, value: 'b' },
]);

console.log(mm.getByKey(1)); // { _id: 1, value: 'a' }
```

### Creating a MatrixMap with a custom key:

```javascript

const mm = createMatrixMap([
  { customKey: 'foo', value: 'bar' },
  { customKey: 'baz', value: 'qux' },
], { keyField: 'customKey' });

console.log(mm.getByKey('foo')); // { customKey: 'foo', value: 'bar' }
```

## API

### Class: MatrixMap

Constructor: `new MatrixMap(options, ...items)`

- `options` (optional): An object that can include:
  - `keyField` (optional): The property to use as the key for lookups. Defaults to `_id`.
- `...items`: Initial elements of the MatrixMap.

#### Methods

- `push(...items)`: Adds elements and updates the keyMap.
- `pop()`: Removes the last element and updates the keyMap.
- `shift()`: Removes the first element and updates the keyMap.
- `unshift(...items)`: Adds elements to the beginning and updates the keyMap.
- `splice(start, deleteCount, ...items)`: Removes and/or adds elements while keeping the keyMap in sync.
- `fill(value, start, end)`: Fills the array and refreshes the keyMap.
- `copyWithin(target, start, end)`: Copies part of the array and maintains the keyMap.
- `sort(compareFn)`: Sorts the array while preserving the keyMap.
- `reverse()`: Reverses the array in place while keeping the keyMap updated.
- `getByKey(key)`: Retrieves an element using its key from the keyMap.
- `updateByKey(key, value)`: Updates an existing keyed element or inserts it when missing.
- `getIndexByKey(key)`: Retrieves the current array index for a key.
- `hasKey(key)`: Checks whether a keyed element exists.

### Optional Versioning

Pass `enableVersioning: true` for React/Jotai-friendly change tracking. Every mutation, including a same-key element update, advances the collection version, so `getVersionedInstance()` returns a new reference that subscribers comparing by identity will observe. Per-element versions and the last changed keys are also recorded, so consumers can skip rows that did not change. Equivalent updates are ignored and keep the same reference; `startBatch()`/`endBatch()` publish one new reference for many changes.

```javascript
const mm = createMatrixMap([{ _id: 'a', value: 1 }], { enableVersioning: true });
const view = mm.getVersionedInstance();

mm.updateByKey('a', { _id: 'a', value: 2 });

console.log(mm.getVersionedInstance() === view); // false: a row changed
console.log(mm.getElementVersion('a')); // 1
console.log(mm.getLastChangedElementKeys()); // ['a']

mm.updateByKey('a', { _id: 'a', value: 2 });
console.log(mm.getLastChangedElementKeys()); // ['a']: equivalent update, same reference
```

## License

MIT License
