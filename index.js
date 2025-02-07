// MatrixMap.js

class MatrixMap extends Array {
  /**
   * Creates a new MatrixMap instance.
   * @param {Object} [options] - Optional config with keyField property
   * @param {...any} args - Initial elements or array length
   */
  constructor(...args) {
    // Check if the first argument is an options object with a keyField property.
    let keyField = '_id';
    if (
      (args.length > 0) &&
      (typeof args[0] === 'object') &&
      (args[0] !== null) &&
      (args[0].hasOwnProperty('keyField'))
    ) {
      keyField = args[0].keyField;
      args.shift(); // Remove the options object from the arguments passed to Array.
    }

    // Initialize the native Array with any provided elements.
    super(...args);

    // Save the key field to use for mapping.
    this._keyField = keyField;

    // Create a Map to hold key → value mappings.
    this.keyMap = new Map();

    // Internal flag to bypass per-assignment updates during bulk operations.
    this.__bulkUpdate = false;

    // Build the keyMap from any pre-existing elements.
    this._refreshKeyMap();

    // Wrap this instance in a Proxy to intercept direct index assignments,
    // deletions, and assignments to the "length" property.
    return new Proxy(this, {
      set: (target, property, value, receiver) => {
        if (target.__bulkUpdate) {
          return Reflect.set(target, property, value, receiver);
        }

        // Special-case assignment to the "length" property.
        if (property === 'length') {
          const newLength = value;
          const oldLength = target.length;
          if (newLength < oldLength) {
            for (let i = newLength; i < oldLength; i++) {
              const item = target[i];
              if (item && item[target._keyField] !== undefined) {
                target.keyMap.delete(item[target._keyField]);
              }
            }
          }
          return Reflect.set(target, property, value, receiver);
        }

        // Handle numeric indices.
        if (typeof property === 'string') {
          const index = Number(property);
          if (index >= 0 && ((index | 0) === index)) {
            const oldValue = target[index];
            if (oldValue && oldValue[target._keyField] !== undefined) {
              target.keyMap.delete(oldValue[target._keyField]);
            }
          }
          const success = Reflect.set(target, property, value, receiver);
          if (value && (value[target._keyField] !== undefined)) {
            target.keyMap.set(value[target._keyField], value);
          }
          return success;
        }

        // For non-numeric properties, default behavior.
        return Reflect.set(target, property, value, receiver);
      },

      // Trap deletions (e.g. delete matrixMap[3]) so that keyMap stays in sync.
      deleteProperty: (target, property) => {
        if (typeof property === 'string') {
          const index = Number(property);
          if (index >= 0 && ((index | 0) === index)) {
            const item = target[index];
            if (item && item[target._keyField] !== undefined) {
              target.keyMap.delete(item[target._keyField]);
            }
          }
        }
        return Reflect.deleteProperty(target, property);
      }
    });
  }

  /** Rebuild the keyMap by scanning the array */
  _refreshKeyMap() {
    this.keyMap.clear();
    for (let i = 0; i < this.length; i++) {
      const item = this[i];
      if (item && item[this._keyField] !== undefined) {
        this.keyMap.set(item[this._keyField], item);
      }
    }
  }

  /** Push items while updating keyMap */
  push(...items) {
    const result = super.push(...items);
    for (const item of items) {
      if (item && (item[this._keyField] !== undefined)) {
        this.keyMap.set(item[this._keyField], item);
      }
    }
    return result;
  }

  /** Pop item while removing from keyMap */
  pop() {
    const popped = super.pop();
    if (popped && (popped[this._keyField] !== undefined)) {
      this.keyMap.delete(popped[this._keyField]);
    }
    return popped;
  }

  /** Shift item while removing from keyMap */
  shift() {
    const shifted = super.shift();
    if (shifted && (shifted[this._keyField] !== undefined)) {
      this.keyMap.delete(shifted[this._keyField]);
    }
    return shifted;
  }

  /** Unshift items while updating keyMap */
  unshift(...items) {
    const result = super.unshift(...items);
    for (const item of items) {
      if (item && (item[this._keyField] !== undefined)) {
        this.keyMap.set(item[this._keyField], item);
      }
    }
    return result;
  }

  /** Splice items while updating keyMap */
  splice(start, deleteCount, ...items) {
    const removedItems = super.splice(start, deleteCount, ...items);
    for (const item of removedItems) {
      if (item && item[this._keyField] !== undefined) {
        this.keyMap.delete(item[this._keyField]);
      }
    }
    for (const item of items) {
      if (item && item[this._keyField] !== undefined) {
        this.keyMap.set(item[this._keyField], item);
      }
    }
    return removedItems;
  }

  /** Fill array while updating keyMap */
  fill(value, start = 0, end = this.length) {
    const len = this.length;
    start = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
    end = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);

    // Set bulk flag so that the proxy trap doesn’t duplicate work.
    const oldBulk = this.__bulkUpdate;
    this.__bulkUpdate = true;
    for (let i = start; i < end; i++) {
      const oldItem = this[i];
      if (oldItem && (oldItem[this._keyField] !== undefined)) {
        this.keyMap.delete(oldItem[this._keyField]);
      }
      Reflect.set(this, i, value);
      if (value && (value[this._keyField] !== undefined)) {
        this.keyMap.set(value[this._keyField], value);
      }
    }
    this.__bulkUpdate = oldBulk;
    return this;
  }

  /** Copy within array while updating keyMap */
  copyWithin(target, start, end = this.length) {
    const len = this.length;
    // Normalize indices.
    let to = target < 0 ? Math.max(len + target, 0) : Math.min(target, len);
    let from = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
    let final = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);
    const count = Math.min(final - from, len - to);

    // Delete keys for items that will be overwritten
    for (let i = to; i < to + count; i++) {
      const item = this[i];
      if (item && (item[this._keyField] !== undefined)) {
        this.keyMap.delete(item[this._keyField]);
      }
    }

    // Perform copyWithin in bulk
    const oldBulk = this.__bulkUpdate;
    this.__bulkUpdate = true;
    const result = super.copyWithin(target, start, end);
    this.__bulkUpdate = oldBulk;

    // Update keyMap with new items
    for (let i = to; i < to + count; i++) {
      const newItem = this[i];
      if (newItem && (newItem[this._keyField] !== undefined)) {
        this.keyMap.set(newItem[this._keyField], newItem);
      }
    }

    return result;
  }

  /** Sort array without updating keyMap */
  sort(compareFn) {
    const oldBulk = this.__bulkUpdate;
    this.__bulkUpdate = true;
    const result = super.sort(compareFn);
    this.__bulkUpdate = oldBulk;
    // No need to update keyMap because the objects remain unchanged.
    return result;
  }

  /** Reverse array without updating keyMap */
  reverse() {
    const oldBulk = this.__bulkUpdate;
    this.__bulkUpdate = true;
    const result = super.reverse();
    this.__bulkUpdate = oldBulk;
    return result;
  }

  /** Return MatrixMap instead of Array for derived methods */
  static get [Symbol.species]() {
    return MatrixMap;
  }
}

module.exports = MatrixMap;
