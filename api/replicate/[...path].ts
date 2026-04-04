/**
 * Vercel Serverless Proxy para Replicate API
 * 
 * Funciona como catch-all: /api/replicate/v1/predictions, /api/replicate/v1/models/*, etc.
 * Injeta o REPLICATE_API_TOKEN do env do Vercel (nunca exposto ao frontend).
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  
  // Remove /api/replicate do path para obter o path real da API
  const replicatePath = url.pathname.replace(/^\/api\/replicate/, '');
  const targetUrl = `https://api.replicate.com${replicatePath}${url.search}`;

  const token = process.env.REPLICATE_API_TOKEN || '';
  
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'REPLICATE_API_TOKEN not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Headers do request original (sem Authorization do browser)
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  
  // Adiciona Prefer: wait para aguardar resultado (se o cliente pediu)
  const preferHeader = request.headers.get('Prefer');
  if (preferHeader) {
    headers.set('Prefer', preferHeader);
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
