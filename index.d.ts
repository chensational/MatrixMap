declare class MatrixMap<T extends Record<string, any>> extends Array<T> {
    constructor(initialElements?: T[], options?: { keyField?: string });
    keyMap: Map<any, T>;
    getByKey(key: any): T | undefined;
    updateByKey(key: any, newValue: T): boolean;
}

interface MatrixMapOptions {
    keyField?: string;
}

declare function createMatrixMap<T extends Record<string, any>>(initialElements?: T[], options?: MatrixMapOptions): T[] & {
    _keyMap: Map<any, T>;
    getByKey(key: any): T | undefined;
    updateByKey(key: any, newValue: T): boolean;
};

export { MatrixMap, createMatrixMap };
