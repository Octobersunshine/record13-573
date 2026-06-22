const express = require('express');

const router = express.Router();

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

router.get('/campaigns', (req, res) => {
  setTimeout(() => {
    res.json({
      service: 'marketing_service',
      businessLine: req.businessLine,
      campaigns: [
        { id: 1, name: 'Summer Sale 2024', status: 'active' },
        { id: 2, name: 'Black Friday', status: 'draft' }
      ]
    });
  }, randomDelay(60, 220));
});

router.post('/campaigns', (req, res) => {
  setTimeout(() => {
    const campaignId = 'CAMP_' + Date.now();
    res.status(201).json({
      id: campaignId,
      businessLine: req.businessLine,
      status: 'created',
      ...req.body
    });
  }, randomDelay(180, 700));
});

router.get('/coupons/:code', (req, res) => {
  setTimeout(() => {
    const code = req.params.code;
    if (code === 'EXPIRED') {
      return res.status(410).json({ error: 'Coupon expired' });
    }
    res.json({
      code,
      businessLine: req.businessLine,
      discount: code === 'SAVE20' ? 0.2 : 0.1,
      valid: true
    });
  }, randomDelay(30, 120));
});

module.exports = router;
