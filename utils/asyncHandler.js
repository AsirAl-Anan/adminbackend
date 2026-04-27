/**
 * DRY async wrapper — eliminates try/catch boilerplate in all controllers.
 * Usage: router.get('/', asyncHandler(controller.getAll))
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
