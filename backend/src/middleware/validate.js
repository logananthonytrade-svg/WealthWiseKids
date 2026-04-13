/**
 * validate.js — shared input validation helpers
 *
 * All validators throw nothing; they return true/false so callers can
 * compose checks and emit a single descriptive 400 response.
 */

// RFC 4122 UUID (versions 1-5)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns true iff `v` is a non-empty string matching UUID v1–v5 format. */
function isUUID(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

/** Returns true iff `v` is a finite integer >= 1. */
function isPosInt(v) {
  return Number.isInteger(v) && v >= 1;
}

/**
 * validateBody — validates multiple fields from req.body at once.
 *
 * rules is an array of:
 *   { field, type: 'uuid'|'posInt'|'present', label? }
 *
 * Returns null when all pass, or a string describing the first failure.
 */
function validateBody(body, rules) {
  for (const rule of rules) {
    const val = body?.[rule.field];
    const label = rule.label ?? rule.field;

    switch (rule.type) {
      case 'uuid':
        if (!isUUID(val)) return `${label} must be a valid UUID.`;
        break;
      case 'posInt':
        if (!isPosInt(val)) return `${label} must be a positive integer.`;
        break;
      case 'present':
        if (val == null || val === '') return `${label} is required.`;
        break;
    }
  }
  return null;
}

/**
 * validateUUIDParam — Express middleware that validates a named route param
 * is a valid UUID.  Use as:  router.get('/foo/:child_id', validateUUIDParam('child_id'), handler)
 */
function validateUUIDParam(paramName) {
  return (req, res, next) => {
    if (!isUUID(req.params[paramName])) {
      return res.status(400).json({ error: `${paramName} must be a valid UUID.` });
    }
    next();
  };
}

module.exports = { isUUID, isPosInt, validateBody, validateUUIDParam };
