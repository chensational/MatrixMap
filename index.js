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
     * @param {*} newValue - The new value to set. Must have the keyField property set.
     * @returns {boolean} True if updated; false if no element with the key exists.
     */
    updateByKey: {
      value: function(key, newValue) {
        if (newValue == null) return this;  // Prevent null/undefined

        // IMPORTANT: newValue must have the keyField property set
        // If it doesn't, we return without updating
        if (!newValue?.[this?.keyField]) {
          console.warn(`MatrixMap.updateByKey: newValue missing keyField '${this.keyField}' for key '${key}'`);
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
  const matrixMapProxy = new Proxy(arr, {
    set: (target, property, value, receiver) => {
      console.log('MatrixMap set operation', { property, index: typeof property === 'string' ? Number(property) : property });
      if (value == null) return false;
      
      if (property === 'length') {
        const newLength = value;
        const oldLength = target.length;
        
        console.log('MatrixMap length change', { oldLength, newLength });
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
        console.log('MatrixMap index set', { index, value: value ? !!value[target.keyField] : value });
        // Try to set directly on the target array first
        const success = Reflect.set(target, property, value, target);
        
        // If direct set fails, try setting the array value directly
        if (!success) {
          target[property] = value;
        }
        
        // Get the updated value to ensure it was set
        const currentValue = target[index]; 
        
        // Handle keyMap and indexMap updates
        const oldValue = target[index];
        const oldKey = oldValue?.[target.keyField];
        
        // Remove old key if it exists
        if (oldKey !== undefined) {
          console.log('MatrixMap removing old key', { oldKey });
          target.keyMap.delete(oldKey);
          target.indexMap.delete(oldKey);
        }
        
        // Add new key if value exists and has keyField
        if (value && value[target.keyField] !== undefined) {
          const newKey = value[target.keyField];
          console.log('MatrixMap adding new key', { newKey, index });
          target.keyMap.set(newKey, value);
          target.indexMap.set(newKey, index);
        }
        
        return true;
      }

      // For non-index properties, just set the value
      return Reflect.set(target, property, value, receiver);
    },
    deleteProperty: (target, property) => {
      console.log('MatrixMap delete operation', { property });
      if (typeof property === 'string') {
        const index = Number(property);
        if (index >= 0 && ((index | 0) === index)) {
          const item = target[index];
          if (item && item[target.keyField] !== undefined) {
            const key = item[target.keyField];
            console.log('MatrixMap deleting key', { key });
            target.keyMap.delete(key);
            target.indexMap.delete(key);
          }
        }
      }
      return Reflect.deleteProperty(target, property);
    }
  });
  
  // Add a method to check if this is a MatrixMap
  Object.defineProperty(matrixMapProxy, 'isMatrixMap', {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });
  
  // Add a method to convert to a plain array for compatibility
  // This is O(1) - just returns the underlying array without the Proxy
  Object.defineProperty(matrixMapProxy, 'toArray', {
    value: function() {
      return arr;
    },
    writable: false,
    enumerable: false,
    configurable: false
  });
  
  // Add a method that returns an array-compatible wrapper
  // This creates a facade that will pass Array.isArray checks
  Object.defineProperty(matrixMapProxy, 'asArray', {
    value: function() {
      // Return a real array that delegates to this MatrixMap
      const arrayFacade = new Proxy([], {
        get(target, prop) {
          // Handle numeric indices - delegate to MatrixMap
          if (typeof prop === 'string' && !isNaN(prop)) {
            const index = parseInt(prop, 10);
            if (index >= 0 && index < matrixMapProxy.length) {
              return matrixMapProxy[index];
            }
            return undefined;
          }
          
          // Handle length property
          if (prop === 'length') {
            return matrixMapProxy.length;
          }
          
          // Handle array methods - delegate to MatrixMap
          if (typeof Array.prototype[prop] === 'function') {
            return function(...args) {
              return Array.prototype[prop].apply(matrixMapProxy, args);
            };
          }
          
          // Handle MatrixMap's custom methods
          if (prop === 'getByKey') return matrixMapProxy.getByKey;
          if (prop === 'updateByKey') return matrixMapProxy.updateByKey;
          if (prop === 'deleteByKey') return matrixMapProxy.deleteByKey;
          if (prop === 'isMatrixMap') return true;
          
          // Handle Symbol.iterator
          if (prop === Symbol.iterator) {
            return function* () {
              for (let i = 0; i < matrixMapProxy.length; i++) {
                yield matrixMapProxy[i];
              }
            };
          }
          
          return Reflect.get(target, prop);
        },
        
        set(target, prop, value) {
          // Delegate all sets to the MatrixMap
          if (typeof prop === 'string' && !isNaN(prop)) {
            const index = parseInt(prop, 10);
            if (index >= 0) {
              matrixMapProxy[index] = value;
              return true;
            }
          }
          
          if (prop === 'length') {
            matrixMapProxy.length = value;
            return true;
          }
          
          return Reflect.set(target, prop, value);
        },
        
        has(target, prop) {
          if (typeof prop === 'string' && !isNaN(prop)) {
            const index = parseInt(prop, 10);
            return index >= 0 && index < matrixMapProxy.length;
          }
          return Reflect.has(target, prop);
        },
        
        ownKeys(target) {
          const keys = [];
          for (let i = 0; i < matrixMapProxy.length; i++) {
            keys.push(String(i));
          }
          return keys;
        },
        
        getOwnPropertyDescriptor(target, prop) {
          if (typeof prop === 'string' && !isNaN(prop)) {
            const index = parseInt(prop, 10);
            if (index >= 0 && index < matrixMapProxy.length) {
              return {
                configurable: true,
                enumerable: true,
                value: matrixMapProxy[index]
              };
            }
          }
          return Reflect.getOwnPropertyDescriptor(target, prop);
        }
      });
      
      return arrayFacade;
    },
    writable: false,
    enumerable: false,
    configurable: false
  });
  
  return matrixMapProxy;
}

module.exports = { createMatrixMap };
