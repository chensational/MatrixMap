// MatrixMap.js

/**
 * Creates a MatrixMap—a plain Array decorated with key–indexing capabilities.
 *
 * @param {Array} [initialElements=[]] - Initial elements for the MatrixMap.
 * @param {Object} [options={}] - Options for configuration.
 * @param {string} [options.keyField='_id'] - The property name used as the key.
 * @returns {Array} A plain array with additional MatrixMap functionality.
 */
function createMatrixMap(initialElements = [], options = {}) {
  const keyField = options.keyField || '_id';
  // Create a plain array from the initial elements.
  const arr = new Proxy([], {
    defineProperty(target, prop, desc) {
      // Override property descriptor for numeric indices
      if (!isNaN(parseInt(prop))) {
        desc.configurable = true;
        desc.writable = true;
      }
      return Reflect.defineProperty(target, prop, desc);
    }
  });

  // Copy elements with proper descriptors
  initialElements.forEach(element => arr.push(element));

  // Attach a hidden property for the key map.
  Object.defineProperty(arr, 'keyMap', {
    value: new Map(),
    writable: true,
    enumerable: false,
    configurable: false,
  });

  // Attach a hidden property for the key field.
  Object.defineProperty(arr, '_keyField', {
    value: keyField,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  // Build the initial key map.
  arr.forEach(item => {
    if (item && item[keyField] !== undefined) {
      arr.keyMap.set(item[keyField], item);
    }
  });

  // Define array methods
  Object.defineProperties(arr, {
    /**
     * Returns the element corresponding to the given key.
     *
     * @param {*} key - The key value.
     * @returns {*} The matching element or undefined.
     */
    getByKey: {
      value: function(key) {
        return this.keyMap.get(key);
      },
      enumerable: false,
    },

    /**
     * Updates the element with the given key.
     *
     * @param {*} key - The key of the element to update.
     * @param {*} newValue - The new value to set.
     * @returns {boolean} True if updated; false if no element with the key exists.
     */
    updateByKey: {
      value: function(key, newValue) {
        console.log('updateByKey: ', { key, newValue });
        if (!newValue || newValue[this._keyField] === undefined) {
          return false;
        }

        const index = this.findIndex(item => item?.[this._keyField] === key);
        console.log('index: ', index);

        if (index === -1) {
          this.push(newValue);
          return false;
        }

        // The proxy's set trap will handle updating the keyMap
        this[index] = newValue;
        return true;
      },
      enumerable: false,
    },

    /**
     * Override push so that new items are added to the key map.
     */
    push: {
      value: function(...items) {
        console.log('push');
        const startIndex = this.length;
        items.forEach((item, i) => {
          Object.defineProperty(this, startIndex + i, {
            value: item,
            writable: true,
            enumerable: true,
            configurable: true
          });
          if (item && item[this._keyField] !== undefined) {
            this.keyMap.set(item[this._keyField], item);
          }
        });
        return this.length;
      },
      enumerable: false,
    },

    /**
     * Override pop so that removed items are deleted from the key map.
     */
    pop: {
      value: function() {
        const item = Array.prototype.pop.call(this);
        if (item && item[this._keyField] !== undefined) {
          this.keyMap.delete(item[this._keyField]);
        }
        return item;
      },
      enumerable: false,
    },

    /**
     * Override shift so that the key map is updated.
     */
    shift: {
      value: function() {
        const item = Array.prototype.shift.call(this);
        if (item && item[this._keyField] !== undefined) {
          this.keyMap.delete(item[this._keyField]);
        }
        return item;
      },
      enumerable: false,
    },

    /**
     * Override unshift so that new items are added to the key map.
     */
    unshift: {
      value: function(...items) {
        const result = Array.prototype.unshift.apply(this, items);
        items.forEach(item => {
          if (item && item[this._keyField] !== undefined) {
            this.keyMap.set(item[this._keyField], item);
          }
        });
        return result;
      },
      enumerable: false,
    },

    /**
     * Override splice so that both removal and insertion update the key map.
     */
    splice: {
      value: function(start, deleteCount, ...items) {
        const removed = Array.prototype.splice.apply(this, [start, deleteCount, ...items]);
        // Remove keys for removed items.
        removed.forEach(item => {
          if (item && item[this._keyField] !== undefined) {
            this.keyMap.delete(item[this._keyField]);
          }
        });
        // Add keys for inserted items.
        items.forEach(item => {
          if (item && item[this._keyField] !== undefined) {
            this.keyMap.set(item[this._keyField], item);
          }
        });
        return removed;
      },
      enumerable: false,
    },

    /**
     * Override fill so that affected indices update the key map.
     */
    fill: {
      value: function(value, start = 0, end = this.length) {
        const len = this.length;
        start = (start < 0) ? Math.max(len + start, 0) : Math.min(start, len);
        end = (end < 0) ? Math.max(len + end, 0) : Math.min(end, len);
        for (let i = start; i < end; i++) {
          const oldItem = this[i];
          if (oldItem && oldItem[this._keyField] !== undefined) {
            this.keyMap.delete(oldItem[this._keyField]);
          }
          this[i] = value;
          if (value && value[this._keyField] !== undefined) {
            this.keyMap.set(value[this._keyField], value);
          }
        }
        return this;
      },
      enumerable: false,
    },

    /**
     * Override copyWithin so that the key map is rebuilt after the operation.
     */
    copyWithin: {
      value: function(target, start, end) {
        const len = this.length;
        let to = target < 0 ? Math.max(len + target, 0) : Math.min(target, len);
        let from = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
        let final = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);
        const count = Math.min(final - from, len - to);

        // Delete keys for items that will be overwritten
        for (let i = to; i < to + count; i++) {
          const item = this[i];
          if (item && item[this._keyField] !== undefined) {
            this.keyMap.delete(item[this._keyField]);
          }
        }

        // Perform copyWithin in bulk
        Array.prototype.copyWithin.call(this, target, start, end);

        // Update keyMap with new items
        for (let i = to; i < to + count; i++) {
          const newItem = this[i];
          if (newItem && newItem[this._keyField] !== undefined) {
            this.keyMap.set(newItem[this._keyField], newItem);
          }
        }

        return this;
      },
      enumerable: false,
    },

    /**
     * Override sort so that the key map is rebuilt after sorting.
     */
    sort: {
      value: function(compareFn) {
        Array.prototype.sort.call(this, compareFn);
        return this;
      },
      enumerable: false,
    },

    /**
     * Override reverse so that the key map remains consistent.
     */
    reverse: {
      value: function() {
        Array.prototype.reverse.call(this);
        return this;
      },
      enumerable: false,
    },
  });

  // Wrap the array in a Proxy to intercept assignments
  return new Proxy(arr, {
    set: (target, property, value, receiver) => {
      console.log('proxy set trap: ', property, value?.value?.status);
      
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
        return Reflect.set(target, property, value, target);
      }

      // Convert property to numeric index if possible
      const index = (typeof property === 'string') ? Number(property) : property;
      
      // Handle array index assignments (both string and number types)
      if ((typeof index === 'number') && (index >= 0) && ((index | 0) === index)) {
        
        // Try to set directly on the target array first
        const success = Reflect.set(target, property, value, target);
        console.log('After set - success:', success, 'array[index]:', target[index]?.status?.status, 'matches value?:', target[index] === value);
        
        // If direct set fails, try setting the array value directly
        if (!success) {
          target[property] = value;
        }
        
        // Get the updated value to ensure it was set
        const currentValue = target[index]; 
        
        // Update keyMap if the array was successfully updated
        if (currentValue?.[target._keyField] === value?.[target._keyField]) {
          // Handle the case where new value is undefined/null (deletion)
          const oldValue = target[index];
          console.log('oldValue: ',oldValue?.status?.status)
          if (!value) {
            target.keyMap.delete(oldValue?.[target._keyField]);
            return true;
          }

          const newKey = value[target._keyField];
          
          // Only proceed if the new value has a valid key
          if (newKey !== undefined) {
            // Remove old value from keyMap
            target.keyMap.delete(oldValue?.[target._keyField]);
            target.keyMap.set(newKey, value);
            console.log('Updated keyMap - size:', target.keyMap.size, 'has new key:', target.keyMap.has(newKey), value?.status?.status);
          }
          return true;
        }
        
        return false;
      }

      // For non-index properties, just set the value
      return Reflect.set(target, property, value, receiver);
    },
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

module.exports = { createMatrixMap };
