const PROTOCOL_VERSION = '2025-11-25';
const SERVER_INFO = {
  name: 'rakshithnettar-mcp',
  title: 'Rakshith Nettar MCP Server',
  version: '1.0.0',
};

const PROFILE_DATA = {
  name: 'Rakshith Nettar',
  role: 'Senior Software Engineer',
  company: 'NUITEQ',
  summary: 'I build software that improves learning outcomes, teacher efficiency, and collaboration.',
  profiles: {
    github: 'https://github.com/RakshithNM',
    linkedin: 'https://linkedin.com/in/rakshithbellare/',
    x: 'https://twitter.com/rakshithbellare',
    blog: 'https://blog.rakshithnettar.com/',
    til: 'https://til.rakshithnettar.com/',
  },
  website: 'https://rakshithnettar.com/',
  updated: '2026-04-18',
};

const API_CATALOG = {
  linkset: [
    {
      anchor: 'https://rakshithnettar.com/.well-known/profile-api/profile.json',
      'service-desc': [
        {
          href: 'https://rakshithnettar.com/.well-known/profile-api/openapi.json',
          type: 'application/vnd.oai.openapi+json;version=3.1',
          title: 'Profile API OpenAPI description',
        },
      ],
      'service-doc': [
        {
          href: 'https://rakshithnettar.com/.well-known/profile-api/docs.html',
          type: 'text/html',
          title: 'Profile API documentation',
        },
      ],
      status: [
        {
          href: 'https://rakshithnettar.com/.well-known/profile-api/status.json',
          type: 'application/json',
          title: 'Profile API status',
        },
      ],
    },
  ],
};

const RESOURCE_MAP = {
  'profile://public-profile': {
    name: 'public_profile',
    title: 'Public Profile',
    description: 'Public profile metadata for Rakshith Nettar.',
    mimeType: 'application/json',
    text: JSON.stringify(PROFILE_DATA, null, 2),
  },
  'profile://api-catalog': {
    name: 'api_catalog',
    title: 'API Catalog',
    description: 'RFC 9727 API catalog for this site.',
    mimeType: 'application/linkset+json',
    text: JSON.stringify(API_CATALOG, null, 2),
  },
};

const TOOLS = [
  {
    name: 'get_profile',
    title: 'Get Public Profile',
    description: 'Return Rakshith Nettar public profile metadata.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
    },
  },
  {
    name: 'get_api_catalog',
    title: 'Get API Catalog',
    description: 'Return the RFC 9727 API catalog published by this site.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
    },
  },
];

function jsonRpcResult(id, result) {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

function jsonRpcError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  };
}

function makeJsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'mcp-protocol-version': PROTOCOL_VERSION,
      ...extraHeaders,
    },
  });
}

function makeEmptyResponse(status, extraHeaders = {}) {
  return new Response(null, {
    status,
    headers: {
      'cache-control': 'no-store',
      'mcp-protocol-version': PROTOCOL_VERSION,
      ...extraHeaders,
    },
  });
}

function validateOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }

  return origin === new URL(request.url).origin;
}

function getInitializeResult() {
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      resources: {},
      tools: {},
    },
    serverInfo: SERVER_INFO,
    instructions: 'This is a read-only MCP server for Rakshith Nettar public profile metadata and API discovery.',
  };
}

function getResourcesList() {
  return Object.entries(RESOURCE_MAP).map(([uri, resource]) => ({
    uri,
    name: resource.name,
    title: resource.title,
    description: resource.description,
    mimeType: resource.mimeType,
  }));
}

function getToolResult(name) {
  if (name === 'get_profile') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(PROFILE_DATA, null, 2),
        },
      ],
      structuredContent: PROFILE_DATA,
      isError: false,
    };
  }

  if (name === 'get_api_catalog') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(API_CATALOG, null, 2),
        },
      ],
      structuredContent: API_CATALOG,
      isError: false,
    };
  }

  return null;
}

function handleRpcMessage(message) {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
    return { kind: 'error', status: 400, body: jsonRpcError(undefined, -32600, 'Invalid Request') };
  }

  if (!('id' in message)) {
    return { kind: 'accepted' };
  }

  const { id, method, params = {} } = message;

  switch (method) {
    case 'initialize':
      return { kind: 'result', body: jsonRpcResult(id, getInitializeResult()) };
    case 'ping':
      return { kind: 'result', body: jsonRpcResult(id, {}) };
    case 'resources/list':
      return { kind: 'result', body: jsonRpcResult(id, { resources: getResourcesList() }) };
    case 'resources/read': {
      const resource = RESOURCE_MAP[params.uri];
      if (!resource) {
        return {
          kind: 'error',
          status: 404,
          body: jsonRpcError(id, -32002, 'Resource not found', { uri: params.uri }),
        };
      }

      return {
        kind: 'result',
        body: jsonRpcResult(id, {
          contents: [
            {
              uri: params.uri,
              mimeType: resource.mimeType,
              text: resource.text,
            },
          ],
        }),
      };
    }
    case 'tools/list':
      return { kind: 'result', body: jsonRpcResult(id, { tools: TOOLS }) };
    case 'tools/call': {
      const result = getToolResult(params.name);
      if (!result) {
        return {
          kind: 'error',
          status: 400,
          body: jsonRpcError(id, -32602, 'Unknown tool', { name: params.name }),
        };
      }

      return { kind: 'result', body: jsonRpcResult(id, result) };
    }
    default:
      return {
        kind: 'error',
        status: 404,
        body: jsonRpcError(id, -32601, 'Method not found', { method }),
      };
  }
}

export async function handleMcpRequest(request) {
  if (!validateOrigin(request)) {
    return makeJsonResponse(jsonRpcError(undefined, -32003, 'Forbidden origin'), 403);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': new URL(request.url).origin,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'Content-Type, Accept, MCP-Protocol-Version',
        'cache-control': 'no-store',
      },
    });
  }

  if (request.method === 'GET') {
    return makeEmptyResponse(405, {
      allow: 'POST, OPTIONS',
    });
  }

  if (request.method === 'DELETE') {
    return makeEmptyResponse(405, {
      allow: 'POST, OPTIONS',
    });
  }

  if (request.method !== 'POST') {
    return makeEmptyResponse(405, {
      allow: 'POST, OPTIONS',
    });
  }

  let message;
  try {
    message = await request.json();
  } catch {
    return makeJsonResponse(jsonRpcError(undefined, -32700, 'Parse error'), 400);
  }

  const result = handleRpcMessage(message);
  if (result.kind === 'accepted') {
    return makeEmptyResponse(202);
  }

  const status = result.kind === 'result' ? 200 : result.status;
  return makeJsonResponse(result.body, status);
}

export const mcpServerCard = {
  $schema: 'https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json',
  version: '1.0',
  protocolVersion: PROTOCOL_VERSION,
  serverInfo: SERVER_INFO,
};
