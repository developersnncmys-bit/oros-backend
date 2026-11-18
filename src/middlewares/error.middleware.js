const errorHandler = (err, req, res, next) => {
    const status = err.status || err.statusCode || 500;

    // Log the full error server-side for debugging (never shown to clients)
    console.error("[errorHandler]", status, err.message, err.stack);

    // 5xx errors come from the internals (DB, network, bugs) — their raw
    // messages (e.g. "bad auth : authentication failed") must not reach
    // the browser. Business/validation errors should be thrown with an
    // explicit 4xx status so their message passes through unchanged.
    const message =
        status >= 500
            ? "Something went wrong. Please try again."
            : err.message || "Request failed";

    res.status(status).json({
        success: false,
        message,
    });
};

export default errorHandler;
