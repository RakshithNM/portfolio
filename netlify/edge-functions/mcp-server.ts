import { handleMcpRequest } from '../lib/mcp-core.mjs';

export default async (request: Request) => handleMcpRequest(request);

export const config = {
  path: '/mcp',
};
