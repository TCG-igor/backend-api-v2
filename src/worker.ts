export function createWorkerHandler() {
  return async function handler(request: Request, env: Record<string, any> = {}, _ctx: any = {}) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', runtime: 'cloudflare-worker' });
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json(
        {
          error: 'This route is served by the Node/Express runtime in local development. Configure a Cloudflare Worker entrypoint and Hyperdrive binding for production.',
          runtime: 'cloudflare-worker',
          bindings: Object.keys(env || {}),
        },
        { status: 501 }
      );
    }

    return Response.json({ error: 'not found' }, { status: 404 });
  };
}

export default createWorkerHandler();
