const { ValidationError } = require('../errors');

const DEFAULTS = { category: 'General', quantity: 0, lowStockThreshold: 5 };

const isNonNegativeInt = (v) => Number.isInteger(v) && v >= 0;

/**
 * Validates and normalises product input.
 * partial = true  -> only validates fields that are present (used by update)
 * partial = false -> requires name, sku, price and applies defaults (used by add)
 */
function validateProduct(data, { partial = false } = {}) {
  const errors = [];
  const out = {};
  const has = (k) => data[k] !== undefined;

  if (!data || typeof data !== 'object') {
    throw new ValidationError(['Request body must be a JSON object']);
  }

  if (!partial || has('name')) {
    if (typeof data.name !== 'string' || !data.name.trim()) errors.push('name is required');
    else if (data.name.trim().length > 100) errors.push('name must be at most 100 characters');
    else out.name = data.name.trim();
  }

  if (!partial || has('sku')) {
    if (typeof data.sku !== 'string' || !data.sku.trim()) errors.push('sku is required');
    else out.sku = data.sku.trim().toUpperCase();
  }

  if (!partial || has('price')) {
    if (typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0) {
      errors.push('price must be a number >= 0');
    } else out.price = data.price;
  }

  if (has('category')) {
    if (typeof data.category !== 'string' || !data.category.trim()) errors.push('category must be a non-empty string');
    else out.category = data.category.trim();
  } else if (!partial) out.category = DEFAULTS.category;

  if (has('quantity')) {
    if (!isNonNegativeInt(data.quantity)) errors.push('quantity must be an integer >= 0');
    else out.quantity = data.quantity;
  } else if (!partial) out.quantity = DEFAULTS.quantity;

  if (has('lowStockThreshold')) {
    if (!isNonNegativeInt(data.lowStockThreshold)) errors.push('lowStockThreshold must be an integer >= 0');
    else out.lowStockThreshold = data.lowStockThreshold;
  } else if (!partial) out.lowStockThreshold = DEFAULTS.lowStockThreshold;

  if (errors.length) throw new ValidationError(errors);
  return out;
}

module.exports = { validateProduct };
