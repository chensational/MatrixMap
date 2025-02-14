const { createMatrixMap } = require('./index.js');

function runPerformanceTest() {
  const size = 100000;
  const testData = Array.from({ length: size }, (_, i) => ({ _id: i, value: i }));

  // Create MatrixMap
  console.time('Create MatrixMap');
  const matrix = createMatrixMap(testData);
  console.timeEnd('Create MatrixMap');

  // Random access test
  console.time('Random access');
  for (let i = 0; i < 1000; i++) {
    const randomKey = Math.floor(Math.random() * size);
    matrix.getByKey(randomKey);
  }
  console.timeEnd('Random access');

  // Update test
  console.time('Updates');
  for (let i = 0; i < 1000; i++) {
    const randomKey = Math.floor(Math.random() * size);
    matrix.updateByKey(randomKey, { _id: randomKey, value: Math.random() });
  }
  console.timeEnd('Updates');
}

runPerformanceTest();
