/**
 * Utilities Module for Depthquote
 * Exports all utility functions
 */

const errorHandler = require('./errorHandler');
const validation = require('./validation');

module.exports = {
  ...errorHandler,
  ...validation
};
