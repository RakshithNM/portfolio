import { createMarkdownResponse, requestAcceptsMarkdown } from '../lib/markdown-response.mjs';

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const { pathname } = new URL(request.url);
  if (pathname !== '/' && pathname !== '/index.html') {
    return;
  }

  if (!requestAcceptsMarkdown(request)) {
    return;
  }

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('text/html')) {
    return response;
  }

  return createMarkdownResponse(response, request.method);
};

export const config = {
  path: '/*',
};
