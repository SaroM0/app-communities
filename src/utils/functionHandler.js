function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Función de logueo de errores.
 */
function logError(error) {
  console.error("Error:", error);
}

/**
 * Returns a promise that resolves after a specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  asyncHandler,
  logError,
  sleep,
};
