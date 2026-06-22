const client = require('prom-client');
const { sanitizeLabelValue } = require('./businessLabel');

const register = new client.Registry();

const MAX_ROUTE_LENGTH = 128;

client.collectDefaultMetrics({ register });

function sanitizeMethod(value) {
  if (!value) return 'UNKNOWN';
  const str = String(value).toUpperCase();
  const valid = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'UNKNOWN'];
  return valid.includes(str) ? str : 'UNKNOWN';
}

function sanitizeRoute(value) {
  if (!value) return '/';
  let str = String(value).split('?')[0];
  str = str.replace(/[\x00-\x1F\x7F "']/g, '');
  str = str.replace(/[^a-zA-Z0-9_\-.:/{}]/g, '_');
  if (str.length > MAX_ROUTE_LENGTH) {
    str = str.substring(0, MAX_ROUTE_LENGTH);
  }
  return str || '/';
}

function sanitizeStatusCode(value) {
  const code = parseInt(value, 10);
  if (isNaN(code) || code < 100 || code > 599) {
    return '0';
  }
  return String(code);
}

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'business_line'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new client.Counter({
  name: 'http_request_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'business_line']
});

const httpRequestErrorsTotal = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'status_code', 'business_line']
});

const httpRequestInProgress = new client.Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests in progress',
  labelNames: ['method', 'business_line']
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrorsTotal);
register.registerMetric(httpRequestInProgress);

function monitoringMiddleware(req, res, next) {
  const startEpoch = Date.now();
  const initialRoute = sanitizeRoute((req.originalUrl || req.url));
  const method = sanitizeMethod(req.method);
  const startBusinessLine = sanitizeLabelValue(req.businessLine);

  httpRequestInProgress.inc({ method, business_line: startBusinessLine });

  res.on('finish', () => {
    const businessLine = sanitizeLabelValue(req.businessLine || startBusinessLine);
    const rawRoute = req.route ? req.baseUrl + req.route.path : initialRoute;
    const route = sanitizeRoute(rawRoute);
    const responseTimeInMs = Date.now() - startEpoch;
    const statusCode = sanitizeStatusCode(res.statusCode);

    httpRequestInProgress.dec({ method, business_line: businessLine });

    const labels = {
      method,
      route,
      status_code: statusCode,
      business_line: businessLine
    };

    httpRequestTotal.inc(labels);
    httpRequestDurationMicroseconds.observe(labels, responseTimeInMs / 1000);

    if (parseInt(statusCode, 10) >= 400) {
      httpRequestErrorsTotal.inc(labels);
    }
  });

  next();
}

async function metricsEndpoint(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
}

function matchesLabel(labels, key, filterValue) {
  if (!filterValue) return true;
  const actualValue = labels[key];
  if (actualValue === undefined) return false;
  return actualValue === filterValue;
}

function matchesLabelPrefix(labels, key, prefix) {
  if (!prefix) return true;
  const actualValue = labels[key];
  if (actualValue === undefined) return false;
  return actualValue.startsWith(prefix);
}

function filterMetric(metric, filters) {
  const filteredValues = metric.values.filter(item => {
    const labels = item.labels || {};
    if (!matchesLabel(labels, 'business_line', filters.business_line)) return false;
    if (!matchesLabel(labels, 'method', filters.method)) return false;
    if (!matchesLabel(labels, 'status_code', filters.status_code)) return false;
    if (!matchesLabelPrefix(labels, 'route', filters.route_prefix)) return false;
    return true;
  });

  return {
    ...metric,
    values: filteredValues
  };
}

async function queryMetrics(filters = {}) {
  const allMetrics = await register.getMetricsAsJSON();

  let filteredMetrics = allMetrics;

  if (filters.name) {
    filteredMetrics = filteredMetrics.filter(m => m.name === filters.name);
  }

  filteredMetrics = filteredMetrics.map(metric => filterMetric(metric, filters));

  if (filters.only_non_empty) {
    filteredMetrics = filteredMetrics.filter(m => m.values.length > 0);
  }

  return {
    timestamp: new Date().toISOString(),
    filters,
    metrics: filteredMetrics
  };
}

async function metricsQueryEndpoint(req, res) {
  try {
    const filters = {
      business_line: req.query.business_line || null,
      method: req.query.method ? String(req.query.method).toUpperCase() : null,
      status_code: req.query.status_code ? String(req.query.status_code) : null,
      route_prefix: req.query.route_prefix || null,
      name: req.query.name || null,
      only_non_empty: req.query.only_non_empty === 'true'
    };

    const result = await queryMetrics(filters);

    res.set('Content-Type', 'application/json');
    res.json(result);
  } catch (err) {
    console.error('Query metrics error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function listLabelsEndpoint(req, res) {
  try {
    const labelName = req.params.label;
    const validLabels = ['business_line', 'method', 'route', 'status_code'];

    if (!validLabels.includes(labelName)) {
      return res.status(400).json({
        error: 'Invalid label name',
        valid_labels: validLabels
      });
    }

    const allMetrics = await register.getMetricsAsJSON();
    const valuesSet = new Set();

    for (const metric of allMetrics) {
      if (!metric.values) continue;

      for (const item of metric.values) {
        if (item.labels && item.labels[labelName] !== undefined) {
          valuesSet.add(item.labels[labelName]);
        }
      }
    }

    res.json({
      label: labelName,
      values: Array.from(valuesSet).sort()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  monitoringMiddleware,
  metricsEndpoint,
  metricsQueryEndpoint,
  listLabelsEndpoint,
  queryMetrics,
  register,
  httpRequestDurationMicroseconds,
  httpRequestTotal,
  httpRequestErrorsTotal,
  httpRequestInProgress
};
