'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const profit = require('../src/features/supply-orders/domain/profit.js');

test('weighted purchase cost and gross profit', () => {
  const result = profit.calculate(
    { delivered_quantity: 100, selling_unit_price: 5 },
    [
      { quantity: 60, purchase_unit_price: 4 },
      { quantity: 40, purchase_unit_price: 4.5 }
    ]
  );
  assert.equal(result.totalCost, 420);
  assert.equal(result.average, 4.2);
  assert.equal(result.revenue, 500);
  assert.equal(result.profit, 80);
});

test('does not invent profit with incomplete cost', () => {
  const result = profit.calculate(
    { delivered_quantity: 100, selling_unit_price: 5 },
    [{ quantity: 60, purchase_unit_price: 4 }]
  );
  assert.equal(result.costComplete, false);
  assert.equal(result.profit, null);
});

test('does not invent profit without purchases', () => {
  const result = profit.calculate(
    { delivered_quantity: 100, selling_unit_price: 5 }, []
  );
  assert.equal(result.average, null);
  assert.equal(result.profit, null);
});
