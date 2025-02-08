# MatrixMap

MatrixMap is a JavaScript class that extends the built-in `Array` class, augmented with an efficient keyMap for O(1) key-based lookups. It keeps the keyMap automatically synchronized with array operations.

## Features

* Extends the built-in `Array` class with all native methods.
* Maintains an internal keyMap updated on modifications.
* Supports custom key fields (defaults to `_id`).
* Provides fast lookup with the `getByKey` method.

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
import { createMatrixMap } from '@chensational/matrixmap';

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

## License

MIT License
