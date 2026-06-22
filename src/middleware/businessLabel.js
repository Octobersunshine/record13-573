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

const MAX_LABEL_LENGTH = 64;
const DEFAULT_UNKNOWN = 'unknown';

function sanitizeLabelValue(value) {
  if (value === undefined || value === null) {
    return DEFAULT_UNKNOWN;
  }

  let str = String(value);

  if (str.length === 0) {
    return DEFAULT_UNKNOWN;
  }

  str = str.replace(/[\x00-\x1F\x7F]/g, '');

  str = str.replace(/[^a-zA-Z0-9_\-.:/]/g, '_');

  if (!/^[a-zA-Z_]/.test(str)) {
    str = '_' + str;
  }

  if (str.length > MAX_LABEL_LENGTH) {
    str = str.substring(0, MAX_LABEL_LENGTH);
  }

  return str;
}

function isValidBusinessLine(line) {
  return VALID_BUSINESS_LINES.includes(line);
}

function detectBusinessLine(req) {
  const headerValue = req.headers[BUSINESS_LINE_HEADER];
  if (headerValue) {
    const sanitized = sanitizeLabelValue(headerValue);
    if (sanitized !== DEFAULT_UNKNOWN) {
      return sanitized;
    }
  }

  const queryValue = req.query && req.query.business_line;
  if (queryValue) {
    const sanitized = sanitizeLabelValue(queryValue);
    if (sanitized !== DEFAULT_UNKNOWN) {
      return sanitized;
    }
  }

  const path = (req.originalUrl || req.url || '').split('?')[0];
  for (const [prefix, businessLine] of Object.entries(BUSINESS_LINE_ROUTES)) {
    if (path.startsWith(prefix)) {
      return businessLine;
    }
  }

  return DEFAULT_UNKNOWN;
}

function businessLabelMiddleware(req, res, next) {
  req.businessLine = detectBusinessLine(req);
  next();
}

function requireBusinessLine(req, res, next) {
  if (!req.businessLine || req.businessLine === DEFAULT_UNKNOWN) {
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
  sanitizeLabelValue,
  BUSINESS_LINE_HEADER,
  BUSINESS_LINE_ROUTES,
  VALID_BUSINESS_LINES,
  DEFAULT_UNKNOWN
};
