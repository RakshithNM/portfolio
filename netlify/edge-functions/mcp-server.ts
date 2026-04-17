import { handleMcpRequest } from './mcp-core.mjs';

export default async (request: Request) => handleMcpRequest(request);

export const config = {
  path: '/mcp',
};
