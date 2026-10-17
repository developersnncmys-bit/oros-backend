import app from "../src/app.js";

// Vercel invokes this per request; the Express app handles routing.
export default function handler(req, res) {
    return app(req, res);
}
