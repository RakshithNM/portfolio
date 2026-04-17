export const HOMEPAGE_MARKDOWN = `---
title: Rakshith Nettar
canonical: https://rakshithnettar.com/
source: https://rakshithnettar.com/
---

# Rakshith Nettar

Senior Software Engineer at NUITEQ.

## Profiles

- [Twitter](https://twitter.com/rakshithbellare)
- [LinkedIn](https://linkedin.com/in/rakshithbellare/)
- [GitHub](https://github.com/RakshithNM)
- [CodePen](https://codepen.io/RakshithNM)
- [Blog](https://blog.rakshithnettar.com/)
- [TIL](https://til.rakshithnettar.com/)

## Current Role

### Senior Software Engineer - NUITEQ

NUITEQ® is a collaborative software company that enables teams, organizations, educational institutions, and businesses to add value through smarter human interaction.

At NUITEQ, I build software that enhances learning outcomes for kids, improves teacher efficiency, and strengthens collaboration in business. Over the past 9 years, I have worked on frontend UI design, animations, distributed systems, and real-time collaboration software used by schools and businesses around the world in over 70 countries.

## Previous Experience

- Intern - INMOBI

## Blog Posts

1. [Psuedolocalization tool](https://blog.rakshithnettar.com/psuedo-localization-tool/)
2. [Vim fun](https://blog.rakshithnettar.com/vim-fun/)
3. [Automating html generation using nodejs](https://blog.rakshithnettar.com/automating-html-generation-using-nodejs/)

## Projects

1. [Karnaugh Maps](https://karnaughmaps.rakshithnettar.com)
2. [Subscription Calculator](https://subcalc.rakshithnettar.com)
3. [Financial Calculators](https://calculators.rakshithnettar.com)
4. [Ingredients Dictionary](https://ingredientsdictionary.rakshithnettar.com/)
5. [Expense Splitting](https://splitclever.rakshithnettar.com/)
6. [VIM Logging Plugin](https://github.com/RakshithNM/logdebug.nvim)
7. [Temple Website](https://pernekshetra.com/)
8. [Cricket League Website](https://ganigapremierleague.com/)
9. [Community Website](https://ganigasanghadk.com/)
10. [Tech Team Website](https://arivugg.com/)
`;

const DISCOVERY_LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</.well-known/service-meta.json>; rel="service-meta"; type="application/json"',
  '</sitemap.xml>; rel="describedby"; type="application/xml"',
  '</robots.txt>; rel="describedby"; type="text/plain"',
];
const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=no';

export function requestAcceptsMarkdown(request) {
  const accept = request.headers.get('accept');
  if (!accept) {
    return false;
  }

  return accept.split(',').some((value) => {
    const [mediaType, ...params] = value.split(';').map((part) => part.trim().toLowerCase());
    if (mediaType !== 'text/markdown') {
      return false;
    }

    const qValue = params.find((param) => param.startsWith('q='));
    if (!qValue) {
      return true;
    }

    const quality = Number(qValue.slice(2));
    return Number.isFinite(quality) && quality > 0;
  });
}

function appendVary(headers, value) {
  const current = headers.get('vary');
  if (!current) {
    headers.set('vary', value);
    return;
  }

  const values = current.split(',').map((part) => part.trim().toLowerCase());
  if (!values.includes(value.toLowerCase())) {
    headers.set('vary', `${current}, ${value}`);
  }
}

function estimateMarkdownTokens(markdown) {
  return String(Math.ceil(markdown.length / 4));
}

export function createMarkdownResponse(sourceResponse, requestMethod = 'GET') {
  const headers = new Headers();
  const cacheControl = sourceResponse.headers.get('cache-control');

  if (cacheControl) {
    headers.set('cache-control', cacheControl);
  }

  headers.set('content-type', 'text/markdown; charset=utf-8');
  headers.set('content-signal', CONTENT_SIGNAL);
  headers.set('x-markdown-tokens', estimateMarkdownTokens(HOMEPAGE_MARKDOWN));
  appendVary(headers, 'Accept');

  for (const linkValue of DISCOVERY_LINKS) {
    headers.append('link', linkValue);
  }

  return new Response(requestMethod === 'HEAD' ? null : HOMEPAGE_MARKDOWN, {
    status: sourceResponse.status,
    statusText: sourceResponse.statusText,
    headers,
  });
}
