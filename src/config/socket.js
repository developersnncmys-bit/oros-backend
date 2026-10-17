// Socket.IO lives on long-running hosts (Render), not Vercel serverless.
// Services import `io` from here instead of server.js so they work in both:
//   - On Render, server.js calls setIO(instance) at boot.
//   - On Vercel, io stays a no-op proxy and emit calls do nothing.

const noop = () => noopEmitter;
const noopEmitter = { emit: noop, to: noop };

let instance = noopEmitter;

export const setIO = (realIO) => {
    instance = realIO;
};

export const io = new Proxy(
    {},
    {
        get(_, prop) {
            return instance[prop]?.bind(instance) ?? noop;
        }
    }
);
