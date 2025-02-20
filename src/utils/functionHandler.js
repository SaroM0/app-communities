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

module.exports = {
  asyncHandler,
  logError,
};
