export interface MatrixMapOptions {
  /**
   * The property name used as the key for O(1) lookups.
   * @default '_id'
   */
  keyField?: string;

  /**
   * Enable collection and per-element version metadata.
   * @default false
   */
  enableVersioning?: boolean;
}

export interface MatrixMap<T = any> extends Array<T> {
  readonly keyMap: Map<any, T>;
  readonly indexMap: Map<any, number>;
  readonly keyField: string;
  readonly isMatrixMap: true;
  readonly __isMatrixMap: true;

  getByKey(key: string | number): T | undefined;
  hasKey(key: string | number): boolean;
  getIndexByKey(key: string | number): number | undefined;
  updateByKey(key: string | number, value: T): this;
  deleteByKey(key: string | number): boolean;
  rebuildKeyMaps(startIndex?: number): void;
  toArray(): T[];
  asArray(): T[];
  toJSON(): T[];

  startBatch?(): void;
  endBatch?(): void;
  batchUpdate?(updateFn: (map: this) => void): void;
  getVersionedInstance?(): this;
  incrementVersion?(affectedKeys?: string | number | Array<string | number> | Set<string | number>): void;
  incrementElementVersion?(key: string | number): number;
  getElementVersion?(key: string | number): number;
  getElementVersions?(): Map<string, number>;
  getLastChangedElementKeys?(): string[];
}

export declare function createMatrixMap<T = any>(
  initialElements?: T[] | T,
  options?: MatrixMapOptions
): MatrixMap<T>;
