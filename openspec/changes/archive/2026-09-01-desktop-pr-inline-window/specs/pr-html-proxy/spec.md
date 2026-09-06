# Delta for pr-html-proxy

## ADDED Requirements

### Requirement: PR URL Validation and SSRF Guard

System MUST expose `GET /api/pr-html?url=` and allowlist only `^https://github\.com/[^/]+/[^/]+/pull/\d+/?$`. Missing or non-matching MUST return `400` plaintext and MUST NOT fetch upstream.

#### Scenario: Valid PR is proxied

- GIVEN `GET /api/pr-html?url=https://github.com/mark3labs/mcp-go/pull/966`
- WHEN validated
- THEN system MUST fetch upstream

#### Scenario: Non-PR is rejected

- GIVEN `GET /api/pr-html?url=https://evil.com/pull/1`
- WHEN validated
- THEN MUST return `400` with no fetch

### Requirement: Sanitized HTML Response

System MUST fetch with `User-Agent: Mozilla/5.0`, 8s timeout, 1.5 MB cap; resolve every `<include-fragment>` server-side, strip all `<script>`, inject `<base href="https://github.com/" target="_blank">` in `<head>`, return `text/html; charset=utf-8`.

#### Scenario: Success is sanitized

- GIVEN upstream 200 HTML with `<script>` and `<include-fragment>`
- WHEN proxy responds
- THEN body MUST have no `<script>`, MUST contain base tag, fragments MUST be replaced

### Requirement: Caching

System MUST set `revalidate=3600` and on success return `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.

#### Scenario: Cache headers

- GIVEN valid PR succeeds
- WHEN responded
- THEN `Cache-Control` MUST be `public, s-maxage=3600, stale-while-revalidate=86400` and `Content-Type` MUST be `text/html; charset=utf-8`

### Requirement: Failure Fallback

On failure (non-2xx, timeout, >1.5 MB, network) system MUST return `200` fallback HTML with `Open on GitHub` anchor to original `url` (`target="_blank" rel="noopener noreferrer"`). Fallback MUST be sanitized with base tag, no traces.

#### Scenario: Failure returns fallback

- GIVEN fetch 500 or timeout
- WHEN proxy responds
- THEN status MUST be `200` with anchor `href="<originalUrl>"` text `Open on GitHub`

#### Scenario: Fallback sanitized

- GIVEN fallback returned
- WHEN inspected
- THEN it MUST have no `<script>` and MUST contain base tag
