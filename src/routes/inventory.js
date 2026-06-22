const express = require('express');

const router = express.Router();

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

router.get('/', (req, res) => {
  setTimeout(() => {
    res.json({
      service: 'inventory_service',
      businessLine: req.businessLine,
      items: [
        { sku: 'SKU001', name: 'Product A', stock: 150 },
        { sku: 'SKU002', name: 'Product B', stock: 25 },
        { sku: 'SKU003', name: 'Product C', stock: 0 }
      ]
    });
  }, randomDelay(50, 180));
});

router.get('/:sku', (req, res) => {
  setTimeout(() => {
    const stock = Math.floor(Math.random() * 100);
    res.json({
      sku: req.params.sku,
      businessLine: req.businessLine,
      name: 'Product ' + req.params.sku,
      stock,
      warehouse: 'WH-001'
    });
  }, randomDelay(40, 150));
});

module.exports = router;
