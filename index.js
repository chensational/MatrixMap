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
  initialElements = Array.isArray(initialElements) ? initialElements.filter(Boolean) : [initialElements].filter(Boolean);

  initialElements.forEach(element => arr.push(element));

  // Attach a hidden property for the key map.
  Object.defineProperty(arr, 'keyMap', {
    value: new Map(),
    writable: true,
    enumerable: false,
    configurable: false,
  });

  // Attach a hidden property for the index map.
  Object.defineProperty(arr, 'indexMap', {
    value: new Map(),
    writable: true,
    enumerable: false,
    configurable: false,
  });

  // Attach a hidden property for the key field.
  Object.defineProperty(arr, 'keyField', {
    value: keyField,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  // Internal helper to rebuild both maps from scratch.
  Object.defineProperty(arr, 'rebuildKeyMaps', {
    value: function (idx = 0) {
      this.keyMap.clear();
      this.indexMap.clear();
      for (let i = idx; i < this.length; i++) {
        const item = this[i];
        if (item?.[this?.keyField] !== undefined) {
          const key = item[this.keyField];
          this.keyMap.set(key, item);
          this.indexMap.set(key, idx);
          idx++;
        }
      }
    },
    enumerable: false,
  });
  // Build the initial key map and index map.]
  let idx = 0;
  arr.forEach((item, index) => {
    if ((!arr?.indexMap?.has(item?.[arr?.keyField])) && item[arr?.keyField] !== undefined) {
      arr.keyMap.set(item[arr?.keyField], item);
      arr.indexMap.set(item[arr?.keyField], idx);
      idx++;
    }
  });

  // Define array methods
  Object.defineProperties(arr, {
    /**
     * Returns the element corresponding to the given key.k
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
     * Deletes the element with the given key.
     *
     * @param {*} key - The key of the element to delete.
     * @returns {boolean} True if the element was deleted; false if no element with the key exists.
     */
    deleteByKey: {
      value: function(key) {
        // Find the index of the element with the given key
        const index = this.indexMap.get(key);
        
        // If the key doesn't exist, return false
        if (index === undefined) {
          return false;
        }
        
        // Remove the element from the array using splice
        this.splice(index, 1);
        
        // The splice method already updates the keyMap and indexMap,
        // but ensure the key is removed
        this.keyMap.delete(key);
        this.indexMap.delete(key);
        
        return true;
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
        if (newValue == null) return this;  // Prevent null/undefined

        if (!newValue?.[this?.keyField]) {
          return this;
        }

        const index = this.indexMap.get(key);
        
        if (index === undefined) {
          this.push(newValue);
          this.keyMap.set(key, newValue);
          this.indexMap.set(key, this.length - 1);
          return this;
        }

        this[index] = newValue;
        this.keyMap.set(key, newValue);
        this.indexMap.set(key, index);
        return this;
      },
      enumerable: false,
    },

    /**
     * Override push so that new items are added to the key map and index map.
            
      Object.defineProperty(this, startIndex + idx, {
        value: item,
        writable: true,
        enumerable: true,
        configurable: true
      });
     */
    push: {
      value: function(...items) {
        const validItems = items.filter(item => 
          item && item[this.keyField] !== undefined
        );
    
        // Push all items at once
        const startIdx = this.length;
        const result = Array.prototype.push.apply(this, validItems);
    
        // Update maps
        validItems.forEach((item, i) => {
          const key = item[this.keyField];
          this.keyMap.set(key, item);
          this.indexMap.set(key, startIdx + i);
        });
    
        return result;
      },
      enumerable: true,
    },

    /**
     * Override pop so that removed items are deleted from the key map and index map.
     */
    pop: {
      value: function() {
        const item = Array.prototype.pop.call(this);
        const key = item?.[this.keyField];
        this.keyMap.delete(key);
        this.indexMap.delete(key);
        return item;
      },
      enumerable: false,
    },

    /**
     * Override shift so that the key map and index map are updated.
     */
    shift: {
      value: function() {
        // does this need to rebuild indexMap???
        const item = Array.prototype.shift.call(this);
        this.rebuildKeyMaps();
        return item;
      },
      enumerable: false,
    },

    /**
     * Override unshift so that new items are added to the key map and index map.
     */
    unshift: {
      value: function(...items) {
        const result = Array.prototype.unshift.apply(this, items);
        this.rebuildKeyMaps();
        return result;
      },
      enumerable: false,
    },

    /**
     * Override splice so that both removal and insertion update the key map and index map.
     */
    splice: {
      value: function(start, deleteCount, ...items) {
        const removed = Array.prototype.splice.apply(this, [start, deleteCount, ...items]);
        // Remove keys for removed items.

        removed.forEach(item => {
          const key = item?.[this?.keyField];
          this.keyMap?.delete(key);
          this.indexMap?.delete(key);
        });
        // Add keys for inserted items.
        this.rebuildKeyMaps(start);
        return removed;
      },
      enumerable: false,
    },

    /**
     * Override fill so that affected indices update the key map and index map.
     */
    fill: {
      value: function(value, start = 0, end = this.length) {
        const len = this.length;
        start = (start < 0) ? Math.max(len + start, 0) : Math.min(start, len);
        end = start+1
        for (let i = start; i < end; i++) {
          const oldItem = this[i];
          const key = value?.[this.keyField];
          this.keyMap?.delete(oldItem?.[this.keyField]);
          this.indexMap?.delete(oldItem?.[this.keyField]);
          arr[i] = value;
          this.keyMap?.set(key, value);
          this.indexMap?.set(key, i);
        }
        return this;
      },
      enumerable: false,
    },

    /**
     * Override copyWithin so that the key map and index map are rebuilt after the operation.
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
          const key = item?.[this.keyField];
          this.keyMap?.delete(key);
          this.indexMap?.delete(key);
        }

        // Perform copyWithin in bulk
        Array.prototype.copyWithin.call(this, target, start, end);

        // Update keyMap and indexMap with new items
        for (let i = to; i < to + count; i++) {
          const newItem = this[i];
          const key = newItem?.[this.keyField];
          this.keyMap?.set(key, newItem);
          this.indexMap?.set(key, i);
        }
        return this;
      },
      enumerable: false,
    },

    /**
     * Override sort so that the key map and index map are rebuilt after sorting.
     */
    sort: {
      value: function(compareFn) {
        Array.prototype.sort.call(this, compareFn);
        this.rebuildKeyMaps();
        return this;
      },
      enumerable: false,
    },

    /**
     * Override reverse so that the key map and index map remain consistent.
     */
    reverse: {
      value: function() {
        Array.prototype.reverse.call(this);
        this.rebuildKeyMaps();
        return this;
      },
      enumerable: false,
    },
  });

  // Wrap the array in a Proxy to intercept assignments
  return new Proxy(arr, {
    set: (target, property, value, receiver) => {
      if (value == null) return false;
      
      if (property === 'length') {
        const newLength = value;
        const oldLength = target.length;
        
        if (newLength < oldLength) {
          for (let i = newLength; i < oldLength; i++) {
            const item = target[i];
            const key = item?.[target.keyField];
            target.keyMap?.delete(key);
            target.indexMap?.delete(key);
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
        
        // If direct set fails, try setting the array value directly
        if (!success) {
          target[property] = value;
        }
        
        // Get the updated value to ensure it was set
        const currentValue = target[index]; 
        
        // Update keyMap and indexMap if the array was successfully updated
        if (currentValue?.[target.keyField] === value?.[target.keyField]) {
          // Handle the case where new value is undefined/null (deletion)
          const oldValue = target[index];
          if (!value) {
            target.keyMap.delete(oldValue?.[target.keyField]);
            target.indexMap.delete(oldValue?.[target.keyField]);
            return true;
          }

          const newKey = value[target.keyField];
          
          // Only proceed if the new value has a valid key
          if (newKey !== undefined) {
            // Remove old value from keyMap and indexMap
            target.keyMap.delete(oldValue?.[target.keyField]);
            target.indexMap.delete(oldValue?.[target.keyField]);
            target.keyMap.set(newKey, value);
            target.indexMap.set(newKey, index);
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
          if (item && item[target.keyField] !== undefined) {
            target.keyMap.delete(item[target.keyField]);
            target.indexMap.delete(item[target.keyField]);
          }
        }
      }
      return Reflect.deleteProperty(target, property);
    }
  });
}

module.exports = { createMatrixMap };
