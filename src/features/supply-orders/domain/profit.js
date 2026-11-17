'use strict';

// Pure domain logic: no UI, network, or database dependencies.
// Gross profit is an estimate, not a booked accounting profit.
const BarakahSupplyProfit = {
  calculate(item, batches) {
    const delivered = Number(item.delivered_quantity);
    const unitPrice = Number(item.selling_unit_price);

    const purchased = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity), 0
    );
    const totalCost = batches.reduce(
      (sum, batch) =>
        sum + Number(batch.quantity) *
        Number(batch.purchase_unit_price), 0
    );

    const average = purchased > 0
      ? totalCost / purchased
      : null;

    const revenue = delivered * unitPrice;

    const costComplete = purchased >= delivered && purchased > 0;

    return {
      purchased,
      totalCost,
      average,
      delivered,
      revenue,
      costComplete,
      profit: costComplete
        ? revenue - delivered * average
        : null
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BarakahSupplyProfit;
}
if (typeof window !== 'undefined') {
  window.BarakahSupplyProfit = BarakahSupplyProfit;
}
