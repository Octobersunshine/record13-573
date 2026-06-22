const BUSINESS_LINE_HEADER = 'x-business-line';

const BUSINESS_LINE_ROUTES = {
  '/api/order': 'order_service',
  '/api/user': 'user_service',
  '/api/payment': 'payment_service',
  '/api/inventory': 'inventory_service',
  '/api/marketing': 'marketing_service'
};

const VALID_BUSINESS_LINES = [
  'order_service',
  'user_service',
  'payment_service',
  'inventory_service',
  'marketing_service',
  'unknown'
];

function isValidBusinessLine(line) {
  return VALID_BUSINESS_LINES.includes(line);
}

function detectBusinessLine(req) {
  const headerValue = req.headers[BUSINESS_LINE_HEADER];
  if (headerValue && isValidBusinessLine(headerValue)) {
    return headerValue;
  }

  const queryValue = req.query && req.query.business_line;
  if (queryValue && isValidBusinessLine(queryValue)) {
    return queryValue;
  }

  const path = (req.originalUrl || req.url || '').split('?')[0];
  for (const [prefix, businessLine] of Object.entries(BUSINESS_LINE_ROUTES)) {
    if (path.startsWith(prefix)) {
      return businessLine;
    }
  }

  return 'unknown';
}

function businessLabelMiddleware(req, res, next) {
  req.businessLine = detectBusinessLine(req);
  next();
}

function requireBusinessLine(req, res, next) {
  if (!req.businessLine || req.businessLine === 'unknown') {
    return res.status(400).json({
      error: 'Missing or invalid business line',
      message: `Please specify business line via '${BUSINESS_LINE_HEADER}' header, 'business_line' query param, or use a prefixed route`
    });
  }
  next();
}

module.exports = {
  businessLabelMiddleware,
  requireBusinessLine,
  detectBusinessLine,
  BUSINESS_LINE_HEADER,
  BUSINESS_LINE_ROUTES,
  VALID_BUSINESS_LINES
};
