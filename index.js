// MatrixMap.js

const MATRIXMAP_ELEMENT_VERSIONS = Symbol.for('matrixmap.elementVersions');
const MATRIXMAP_CHANGED_KEYS = Symbol.for('matrixmap.changedKeys');

const normalizeVersionKey = (key) => {
  if (key === undefined || key === null) return '';
  return typeof key === 'string' ? key : String(key);
};

const normalizeAffectedKeys = (keys) => {
  if (keys === undefined || keys === null) return [];
  const rawKeys = Array.isArray(keys) || keys instanceof Set ? Array.from(keys) : [keys];
  const seen = new Set();
  const normalized = [];
  rawKeys.forEach((key) => {
    const normalizedKey = normalizeVersionKey(key);
    if (!normalizedKey || seen.has(normalizedKey)) return;
    seen.add(normalizedKey);
    normalized.push(normalizedKey);
  });
  return normalized;
};

const isPlainObject = (value) =>
  Boolean(value) && Object.prototype.toString.call(value) === '[object Object]';

const areMatrixMapValuesEqual = (left, right, seen = new WeakMap()) => {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;

  let rightSeen = seen.get(left);
  if (rightSeen?.has(right)) return true;
  if (!rightSeen) {
    rightSeen = new WeakSet();
    seen.set(left, rightSeen);
  }
  rightSeen.add(right);

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!areMatrixMapValuesEqual(left[index], right[index], seen)) return false;
    }
    return true;
  }

  if (!isPlainObject(left) || !isPlainObject(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;

  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (!areMatrixMapValuesEqual(left[key], right[key], seen)) return false;
  }
  return true;
};

const getItemVersionKey = (item, keyField) => normalizeVersionKey(item?.[keyField]);

const getArrayIndexProperty = (property) => {
  const index = typeof property === 'string' ? Number(property) : property;
  return typeof index === 'number' && index >= 0 && Number.isInteger(index) ? index : null;
};

const isValidKeyedItem = (item, keyField) =>
  item && typeof item === 'object' && item[keyField] !== undefined && item[keyField] !== null;

/**
 * Creates a MatrixMap: an Array decorated with O(1) key lookups and optional
 * version metadata for mutable React/Jotai-style workflows.
 *
 * @param {Array|Object} [initialElements=[]] - Initial elements for the MatrixMap.
 * @param {Object} [options={}] - Options for configuration.
 * @param {string} [options.keyField='_id'] - The property name used as the key.
 * @param {boolean} [options.enableVersioning=false] - Enable collection and element versions.
 * @returns {Array} An array with MatrixMap helpers.
 */
function createMatrixMap(initialElements = [], options = {}) {
  const keyField = options.keyField || '_id';
  const enableVersioning = Boolean(options.enableVersioning);

  const arr = new Proxy([], {
    defineProperty(target, prop, desc) {
      if (typeof prop === 'string' && !Number.isNaN(parseInt(prop, 10))) {
        desc.configurable = true;
        desc.writable = true;
      }
      return Reflect.defineProperty(target, prop, desc);
    },
  });

  initialElements = Array.isArray(initialElements)
    ? initialElements.filter(Boolean)
    : [initialElements].filter(Boolean);
  initialElements.forEach((element) => arr.push(element));

  Object.defineProperties(arr, {
    keyMap: {
      value: new Map(),
      writable: true,
      enumerable: false,
      configurable: false,
    },
    indexMap: {
      value: new Map(),
      writable: true,
      enumerable: false,
      configurable: false,
    },
    keyField: {
      value: keyField,
      writable: false,
      enumerable: false,
      configurable: false,
    },
    isMatrixMap: {
      value: true,
      enumerable: false,
    },
    __isMatrixMap: {
      value: true,
      enumerable: false,
    },
    _suspendVersioning: {
      value: 0,
      writable: true,
      enumerable: false,
      configurable: false,
    },
    _withVersionSuppressed: {
      value: function (callback) {
        this._suspendVersioning += 1;
        try {
          return callback();
        } finally {
          this._suspendVersioning = Math.max(0, this._suspendVersioning - 1);
        }
      },
      enumerable: false,
    },
  });

  if (enableVersioning) {
    Object.defineProperties(arr, {
      _version: {
        value: 0,
        writable: true,
        enumerable: false,
        configurable: false,
      },
      _versionedInstances: {
        value: new Map(),
        writable: false,
        enumerable: false,
        configurable: false,
      },
      _elementVersions: {
        value: new Map(),
        writable: false,
        enumerable: false,
        configurable: false,
      },
      _lastChangedElementKeys: {
        value: [],
        writable: true,
        enumerable: false,
        configurable: false,
      },
      _batchDepth: {
        value: 0,
        writable: true,
        enumerable: false,
        configurable: false,
      },
      _pendingCollectionVersion: {
        value: false,
        writable: true,
        enumerable: false,
        configurable: false,
      },
      _pendingElementVersionKeys: {
        value: new Set(),
        writable: false,
        enumerable: false,
        configurable: false,
      },
      _setLastChangedElementKeys: {
        value: function (keys = []) {
          this._lastChangedElementKeys = normalizeAffectedKeys(keys);
        },
        enumerable: false,
      },
      _seedElementVersion: {
        value: function (key) {
          const normalizedKey = normalizeVersionKey(key);
          if (!normalizedKey || this._elementVersions.has(normalizedKey)) return;
          this._elementVersions.set(normalizedKey, 0);
        },
        enumerable: false,
      },
      _removeElementVersion: {
        value: function (key) {
          const normalizedKey = normalizeVersionKey(key);
          if (!normalizedKey) return;
          this._elementVersions.delete(normalizedKey);
        },
        enumerable: false,
      },
      getElementVersion: {
        value: function (key) {
          const normalizedKey = normalizeVersionKey(key);
          if (!normalizedKey) return 0;
          return this._elementVersions.get(normalizedKey) || 0;
        },
        enumerable: false,
      },
      getElementVersions: {
        value: function () {
          return new Map(this._elementVersions);
        },
        enumerable: false,
      },
      getLastChangedElementKeys: {
        value: function () {
          return Array.from(this._lastChangedElementKeys || []);
        },
        enumerable: false,
      },
      incrementElementVersion: {
        value: function (key) {
          const normalizedKey = normalizeVersionKey(key);
          if (!normalizedKey) return 0;
          const nextVersion = (this._elementVersions.get(normalizedKey) || 0) + 1;
          this._elementVersions.set(normalizedKey, nextVersion);
          this._setLastChangedElementKeys([normalizedKey]);
          return nextVersion;
        },
        enumerable: false,
      },
      startBatch: {
        value: function () {
          this._batchDepth += 1;
        },
        enumerable: false,
      },
      endBatch: {
        value: function () {
          this._batchDepth = Math.max(0, this._batchDepth - 1);
          if (this._batchDepth === 0) {
            if (this._pendingCollectionVersion) {
              this._pendingCollectionVersion = false;
              this._pendingElementVersionKeys.clear();
              this.incrementVersion();
            } else if (this._pendingElementVersionKeys.size > 0) {
              const keys = Array.from(this._pendingElementVersionKeys);
              this._pendingElementVersionKeys.clear();
              this.incrementVersion(keys);
            }
          }
        },
        enumerable: false,
      },
      incrementVersion: {
        value: function (affectedKeys = null) {
          const normalizedAffectedKeys = normalizeAffectedKeys(affectedKeys);
          if (normalizedAffectedKeys.length > 0) {
            if (this._batchDepth > 0) {
              normalizedAffectedKeys.forEach((key) => this._pendingElementVersionKeys.add(key));
              return;
            }
            normalizedAffectedKeys.forEach((key) => {
              const nextVersion = (this._elementVersions.get(key) || 0) + 1;
              this._elementVersions.set(key, nextVersion);
            });
            this._setLastChangedElementKeys(normalizedAffectedKeys);
            return;
          }

          if (this._batchDepth > 0) {
            this._pendingCollectionVersion = true;
            return;
          }

          this._version += 1;
          this._setLastChangedElementKeys([]);

          if (this._version % 100 === 0) {
            const currentVersion = this._version;
            for (const [version] of this._versionedInstances) {
              if (version < currentVersion - 10) {
                this._versionedInstances.delete(version);
              }
            }
          }
        },
        enumerable: false,
      },
      getVersionedInstance: {
        value: function () {
          const currentVersion = this._version;
          if (this._versionedInstances.has(currentVersion)) {
            return this._versionedInstances.get(currentVersion);
          }

          const versionedProxy = new Proxy(this, {
            get(target, prop) {
              if (prop === Symbol.for('matrixmap.version')) return currentVersion;
              if (prop === '__matrixMapVersion') return currentVersion;
              if (prop === '__matrixMapElementVersions' || prop === '__elementVersions') {
                return new Map(target._elementVersions || []);
              }
              if (prop === '__matrixMapChangedKeys' || prop === '__changedKeys') {
                return Array.from(target._lastChangedElementKeys || []);
              }
              if (prop === MATRIXMAP_ELEMENT_VERSIONS) {
                return new Map(target._elementVersions || []);
              }
              if (prop === MATRIXMAP_CHANGED_KEYS) {
                return Array.from(target._lastChangedElementKeys || []);
              }
              if (prop === '__isVersionedProxy') return true;
              if (prop === 'isMatrixMap' || prop === '__isMatrixMap') return true;
              return Reflect.get(target, prop);
            },
            set(target, prop, value) {
              return Reflect.set(target, prop, value);
            },
            has(target, prop) {
              return Reflect.has(target, prop);
            },
            ownKeys(target) {
              return Reflect.ownKeys(target);
            },
            getOwnPropertyDescriptor(target, prop) {
              return Reflect.getOwnPropertyDescriptor(target, prop);
            },
            defineProperty(target, prop, descriptor) {
              return Reflect.defineProperty(target, prop, descriptor);
            },
            deleteProperty(target, prop) {
              return Reflect.deleteProperty(target, prop);
            },
          });

          this._versionedInstances.set(currentVersion, versionedProxy);
          return versionedProxy;
        },
        enumerable: false,
      },
      batchUpdate: {
        value: function (updateFn) {
          this.startBatch();
          try {
            updateFn(this);
          } finally {
            this.endBatch();
          }
        },
        enumerable: false,
      },
    });
  }

  Object.defineProperty(arr, 'rebuildKeyMaps', {
    value: function (_start = 0) {
      this.keyMap.clear();
      this.indexMap.clear();
      for (let i = 0; i < this.length; i += 1) {
        const item = this[i];
        if (isValidKeyedItem(item, this.keyField)) {
          const key = item[this.keyField];
          this.keyMap.set(key, item);
          this.indexMap.set(key, i);
          if (enableVersioning && this._seedElementVersion) {
            this._seedElementVersion(key);
          }
        }
      }
    },
    enumerable: false,
  });

  arr.rebuildKeyMaps();

  Object.defineProperties(arr, {
    getByKey: {
      value: function (key) {
        return this.keyMap.get(key);
      },
      enumerable: false,
    },
    hasKey: {
      value: function (key) {
        return this.keyMap.has(key);
      },
      enumerable: false,
    },
    getIndexByKey: {
      value: function (key) {
        return this.indexMap.get(key);
      },
      enumerable: false,
    },
    deleteByKey: {
      value: function (key) {
        const index = this.indexMap.get(key);
        if (index === undefined) return false;
        this.splice(index, 1);
        return true;
      },
      enumerable: false,
    },
    updateByKey: {
      value: function (key, newValue) {
        if (newValue == null) return this;
        const valueKey = newValue?.[this?.keyField];
        if (valueKey === undefined || valueKey === null) {
          console.warn(
            `MatrixMap.updateByKey: newValue missing keyField '${this.keyField}' for key '${key}'`
          );
          return this;
        }

        const lookupKey = this.indexMap.has(key) ? key : valueKey;
        const index = this.indexMap.get(lookupKey);

        if (index === undefined) {
          this.push(newValue);
        } else {
          const previousValue = this[index];
          if (previousValue !== newValue && areMatrixMapValuesEqual(previousValue, newValue)) {
            return this;
          }

          this._withVersionSuppressed(() => {
            this[index] = newValue;
          });

          if (enableVersioning) {
            if (normalizeVersionKey(lookupKey) !== normalizeVersionKey(valueKey)) {
              this.incrementVersion();
            } else {
              this.incrementVersion([valueKey]);
            }
          }
        }

        return this;
      },
      enumerable: false,
    },
    push: {
      value: function (...items) {
        const validItems = items.filter((item) => isValidKeyedItem(item, this.keyField));
        const startIdx = this.length;
        const result = this._withVersionSuppressed(() =>
          Array.prototype.push.apply(this, validItems)
        );

        validItems.forEach((item, i) => {
          const key = item[this.keyField];
          this.keyMap.set(key, item);
          this.indexMap.set(key, startIdx + i);
          if (enableVersioning && this._seedElementVersion) {
            this._seedElementVersion(key);
          }
        });

        if (enableVersioning && validItems.length > 0) {
          this.incrementVersion();
        }

        return result;
      },
      enumerable: true,
    },
    pop: {
      value: function () {
        const item = this._withVersionSuppressed(() => Array.prototype.pop.call(this));
        if (item) {
          const key = item?.[this.keyField];
          this.keyMap.delete(key);
          this.indexMap.delete(key);
          if (enableVersioning && this._removeElementVersion) {
            this._removeElementVersion(key);
          }
          if (enableVersioning) {
            this.incrementVersion();
          }
        }
        return item;
      },
      enumerable: false,
    },
    shift: {
      value: function () {
        const item = this._withVersionSuppressed(() => Array.prototype.shift.call(this));
        if (item) {
          if (enableVersioning && this._removeElementVersion) {
            this._removeElementVersion(item?.[this.keyField]);
          }
          this.rebuildKeyMaps();
          if (enableVersioning) {
            this.incrementVersion();
          }
        }
        return item;
      },
      enumerable: false,
    },
    unshift: {
      value: function (...items) {
        const validItems = items.filter((item) => isValidKeyedItem(item, this.keyField));
        const result = this._withVersionSuppressed(() =>
          Array.prototype.unshift.apply(this, validItems)
        );
        this.rebuildKeyMaps();
        if (enableVersioning && validItems.length > 0) {
          this.incrementVersion();
        }
        return result;
      },
      enumerable: false,
    },
    splice: {
      value: function (start, deleteCount, ...items) {
        const validItems = items.filter((item) => isValidKeyedItem(item, this.keyField));
        const spliceArgs = arguments.length === 1 ? [start] : [start, deleteCount, ...validItems];
        const removed = this._withVersionSuppressed(() =>
          Array.prototype.splice.apply(this, spliceArgs)
        );

        removed.forEach((item) => {
          const key = item?.[this?.keyField];
          this.keyMap?.delete(key);
          this.indexMap?.delete(key);
          if (enableVersioning && this._removeElementVersion) {
            this._removeElementVersion(key);
          }
        });

        this.rebuildKeyMaps(start);

        if (enableVersioning && (removed.length > 0 || validItems.length > 0)) {
          this.incrementVersion();
        }

        return removed;
      },
      enumerable: false,
    },
    fill: {
      value: function (value, start = 0, end = this.length) {
        if (!isValidKeyedItem(value, this.keyField)) return this;
        const len = this.length;
        start = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
        end = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);
        if (end < start) end = start;

        let changed = false;
        this._withVersionSuppressed(() => {
          for (let i = start; i < end; i += 1) {
            const oldItem = this[i];
            const key = value?.[this.keyField];
            this.keyMap?.delete(oldItem?.[this.keyField]);
            this.indexMap?.delete(oldItem?.[this.keyField]);
            if (enableVersioning && this._removeElementVersion) {
              this._removeElementVersion(oldItem?.[this.keyField]);
            }
            Array.prototype.splice.call(this, i, 1, value);
            this.keyMap?.set(key, value);
            this.indexMap?.set(key, i);
            if (enableVersioning && this._seedElementVersion) {
              this._seedElementVersion(key);
            }
            changed = true;
          }
        });

        if (enableVersioning && changed) {
          this.incrementVersion();
        }

        return this;
      },
      enumerable: false,
    },
    copyWithin: {
      value: function (target, start, end) {
        const len = this.length;
        const to = target < 0 ? Math.max(len + target, 0) : Math.min(target, len);
        const from = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
        const final = end === undefined ? len : end < 0 ? Math.max(len + end, 0) : Math.min(end, len);
        const count = Math.min(final - from, len - to);

        for (let i = to; i < to + count; i += 1) {
          const item = this[i];
          const key = item?.[this.keyField];
          this.keyMap?.delete(key);
          this.indexMap?.delete(key);
          if (enableVersioning && this._removeElementVersion) {
            this._removeElementVersion(key);
          }
        }

        this._withVersionSuppressed(() => Array.prototype.copyWithin.call(this, target, start, end));

        for (let i = to; i < to + count; i += 1) {
          const newItem = this[i];
          const key = newItem?.[this.keyField];
          this.keyMap?.set(key, newItem);
          this.indexMap?.set(key, i);
          if (enableVersioning && this._seedElementVersion) {
            this._seedElementVersion(key);
          }
        }

        if (enableVersioning && count > 0) {
          this.incrementVersion();
        }

        return this;
      },
      enumerable: false,
    },
    sort: {
      value: function (compareFn) {
        this._withVersionSuppressed(() => Array.prototype.sort.call(this, compareFn));
        this.rebuildKeyMaps();
        if (enableVersioning) {
          this.incrementVersion();
        }
        return this;
      },
      enumerable: false,
    },
    reverse: {
      value: function () {
        this._withVersionSuppressed(() => Array.prototype.reverse.call(this));
        this.rebuildKeyMaps();
        if (enableVersioning) {
          this.incrementVersion();
        }
        return this;
      },
      enumerable: false,
    },
    map: {
      value: function (callbackfn, thisArg) {
        return Array.prototype.map.call(this, callbackfn, thisArg);
      },
      enumerable: false,
    },
    filter: {
      value: function (predicate, thisArg) {
        return Array.prototype.filter.call(this, predicate, thisArg);
      },
      enumerable: false,
    },
    slice: {
      value: function (start, end) {
        return Array.prototype.slice.call(this, start, end);
      },
      enumerable: false,
    },
    concat: {
      value: function (...items) {
        return Array.prototype.concat.apply(this, items);
      },
      enumerable: false,
    },
    toArray: {
      value: function () {
        return Array.from(this);
      },
      enumerable: false,
    },
    toJSON: {
      value: function () {
        return Array.from(this);
      },
      enumerable: false,
    },
  });

  const matrixMapProxy = new Proxy(arr, {
    set: (target, property, value, receiver) => {
      if (value == null && property !== 'length') return false;

      if (property === 'length') {
        const newLength = value;
        const oldLength = target.length;

        if (newLength < oldLength) {
          for (let i = newLength; i < oldLength; i += 1) {
            const item = target[i];
            const key = item?.[target.keyField];
            target.keyMap?.delete(key);
            target.indexMap?.delete(key);
            if (enableVersioning && target._removeElementVersion) {
              target._removeElementVersion(key);
            }
          }
          const result = Reflect.set(target, property, value, target);
          if (enableVersioning && target._suspendVersioning === 0) {
            target.incrementVersion();
          }
          return result;
        }
        return Reflect.set(target, property, value, target);
      }

      const index = getArrayIndexProperty(property);
      if (index !== null) {
        if (!isValidKeyedItem(value, target.keyField)) return true;

        const oldValue = target[index];
        const oldKey = oldValue?.[target.keyField];
        const newKey = value?.[target.keyField];
        const oldVersionKey = getItemVersionKey(oldValue, target.keyField);
        const newVersionKey = getItemVersionKey(value, target.keyField);
        const isExistingIndex = oldValue !== undefined;
        const isElementUpdate =
          isExistingIndex && oldVersionKey && oldVersionKey === newVersionKey;
        const isEqualElementUpdate =
          isElementUpdate &&
          oldValue !== value &&
          areMatrixMapValuesEqual(oldValue, value);

        if (isEqualElementUpdate) return true;

        const success = Reflect.set(target, property, value, target);
        if (!success) return false;

        if (oldKey !== undefined) {
          target.keyMap.delete(oldKey);
          target.indexMap.delete(oldKey);
        }
        if (enableVersioning && oldVersionKey && oldVersionKey !== newVersionKey) {
          target._removeElementVersion?.(oldVersionKey);
        }

        target.keyMap.set(newKey, value);
        target.indexMap.set(newKey, index);
        if (enableVersioning) {
          target._seedElementVersion?.(newKey);
        }

        if (enableVersioning && target._suspendVersioning === 0 && oldValue !== value) {
          if (isElementUpdate) {
            target.incrementVersion([newVersionKey]);
          } else {
            target.incrementVersion();
          }
        }

        return true;
      }

      return Reflect.set(target, property, value, receiver);
    },
    deleteProperty: (target, property) => {
      const index = getArrayIndexProperty(property);
      if (index !== null) {
        const item = target[index];
        if (isValidKeyedItem(item, target.keyField)) {
          const key = item[target.keyField];
          target.keyMap.delete(key);
          target.indexMap.delete(key);
          if (enableVersioning && target._removeElementVersion) {
            target._removeElementVersion(key);
          }

          const result = Reflect.deleteProperty(target, property);
          if (enableVersioning && target._suspendVersioning === 0 && result) {
            target.incrementVersion();
          }
          return result;
        }
      }
      return Reflect.deleteProperty(target, property);
    },
  });

  Object.defineProperty(matrixMapProxy, 'asArray', {
    value: function () {
      return Array.from(matrixMapProxy);
    },
    writable: false,
    enumerable: false,
    configurable: false,
  });

  return matrixMapProxy;
}

module.exports = { createMatrixMap };
