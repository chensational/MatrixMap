const test = require('node:test');
const assert = require('node:assert/strict');

const { createMatrixMap } = require('./index.js');

test('supports O(1) keyed lookup and updates indexes after structural changes', () => {
  const matrix = createMatrixMap(
    [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ],
    { keyField: 'id' }
  );

  assert.equal(Array.isArray(matrix), true);
  assert.deepEqual(matrix.getByKey('a'), { id: 'a', label: 'Alpha' });

  matrix.unshift({ id: 'z', label: 'Zed' });
  assert.equal(matrix.getIndexByKey('z'), 0);
  assert.equal(matrix.getIndexByKey('a'), 1);

  matrix.deleteByKey('a');
  assert.equal(matrix.hasKey('a'), false);
  assert.equal(matrix.getIndexByKey('b'), 1);
});

test('updates an existing keyed element without bumping the collection version', () => {
  const matrix = createMatrixMap(
    [
      { _id: 'a', label: 'Alpha', nested: { count: 1 } },
      { _id: 'b', label: 'Beta', nested: { count: 2 } },
    ],
    { enableVersioning: true }
  );
  const viewBefore = matrix.getVersionedInstance();

  matrix.updateByKey('a', { _id: 'a', label: 'Alpha updated', nested: { count: 3 } });

  const viewAfter = matrix.getVersionedInstance();
  assert.equal(viewAfter, viewBefore);
  assert.equal(viewAfter.__matrixMapVersion, 0);
  assert.equal(matrix.getElementVersion('a'), 1);
  assert.equal(matrix.getElementVersion('b'), 0);
  assert.deepEqual(matrix.getLastChangedElementKeys(), ['a']);
});

test('ignores equivalent keyed updates', () => {
  const matrix = createMatrixMap(
    [{ _id: 'a', label: 'Alpha', nested: { count: 1, tags: ['one'] } }],
    { enableVersioning: true }
  );
  const viewBefore = matrix.getVersionedInstance();

  matrix.updateByKey('a', { _id: 'a', label: 'Alpha', nested: { count: 1, tags: ['one'] } });

  assert.equal(matrix.getVersionedInstance(), viewBefore);
  assert.equal(matrix.getElementVersion('a'), 0);
  assert.deepEqual(matrix.getLastChangedElementKeys(), []);
});

test('bumps the collection version for insertions and deletions', () => {
  const matrix = createMatrixMap([{ _id: 'a', label: 'Alpha' }], {
    enableVersioning: true,
  });
  const viewBeforeInsert = matrix.getVersionedInstance();

  matrix.updateByKey('b', { _id: 'b', label: 'Beta' });
  const viewAfterInsert = matrix.getVersionedInstance();

  assert.notEqual(viewAfterInsert, viewBeforeInsert);
  assert.equal(viewAfterInsert.__matrixMapVersion, 1);

  matrix.deleteByKey('b');
  const viewAfterDelete = matrix.getVersionedInstance();

  assert.notEqual(viewAfterDelete, viewAfterInsert);
  assert.equal(viewAfterDelete.__matrixMapVersion, 2);
});
