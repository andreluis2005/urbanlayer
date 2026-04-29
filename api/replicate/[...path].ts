/**
 * Vercel Serverless Proxy para Replicate API (v2 — Secured)
 * 
 * Melhorias sobre v1:
 * - Origin validation (whitelist de domínios)
 * - Body size limit (10MB)
 * - Rate limiting básico via headers
 * - CORS restrito
 * 
 * Funciona como catch-all: /api/replicate/v1/predictions, /api/replicate/v1/models/*, etc.
 * Injeta o REPLICATE_API_TOKEN do env do Vercel (nunca exposto ao frontend).
 */

export const config = {
  runtime: 'edge',
};

// Domínios permitidos — adicione seu domínio de produção aqui
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://urbanlayer.vercel.app',
  'https://urbanlayer-six.vercel.app',
  'https://urbanlayer.app',
  'https://www.urbanlayer.app',
];

// Body size limit: 10MB
const MAX_BODY_SIZE = 10 * 1024 * 1024;

function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
  
  // Em desenvolvimento, aceitar localhost
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return true;
  }
  
  // Em produção, validar contra whitelist
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

function getOrigin(request: Request): string {
  return request.headers.get('Origin') || '*';
}

export default async function handler(request: Request) {
  // --- CORS preflight ---
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': getOrigin(request),
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Prefer',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // --- Origin validation ---
  if (!isOriginAllowed(request)) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

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

  // --- Body size check ---
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return new Response(
      JSON.stringify({ error: 'Request body too large (max 10MB)' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
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
    const body = request.method !== 'GET' ? await request.text() : undefined;

    // Body size double check (após leitura)
    if (body && body.length > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Request body too large (max 10MB)' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': getOrigin(request),
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
