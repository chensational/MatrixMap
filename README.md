# MatrixMap

A JavaScript class that extends the built-in `Array` class and adds a `keyMap` for efficient key-based lookups.

## Features

*   Extends the built-in `Array` class
*   Adds a `keyMap` for efficient key-based lookups
*   Overrides several methods of the `Array` class to keep the `keyMap` in sync with the array
*   MIT License

## Installation

```bash
npm install matrixmap
```

## Usage

```javascript
const MatrixMap = require('matrixmap');

const map = new MatrixMap([{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }], { keyField: 'id' });

console.log(map.keyMap.get(1)); // { id: 1, name: 'foo' }
```

## API

### Constructor

```javascript
new MatrixMap(options, ...args)
```

*   `options` (optional): An object with the following properties:
    *   `keyField` (optional): The name of the field to use as the key for the `keyMap`. Defaults to `_id`.
*   `...args` (optional): Initial elements to add to the array.

### Methods

*   `push(...items)`: Adds one or more elements to the end of the array and returns the new length of the array.
*   `pop()`: Removes the last element from the array and returns that element.
*   `shift()`: Removes the first element from the array and returns that element.
*   `unshift(...items)`: Adds one or more elements to the beginning of the array and returns the new length of the array.
*   `splice(start, deleteCount, ...items)`: Removes elements from the array and/or adds new elements to the array.
*   `fill(value, start, end)`: Fills all the elements in an array from a start index to an end index with a static value.
*   `copyWithin(target, start, end)`: Copies a sequence of array elements within the array.
*   `sort(compareFn)`: Sorts the elements of an array in place and returns the sorted array.
*   `reverse()`: Reverses the order of the elements in an array in place.

## License

MIT License
