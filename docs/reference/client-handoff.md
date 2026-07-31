# JavaScript client handoff

This page is the handoff checklist for a senior JavaScript developer or an expert LLM implementing a new AcqStore Server v2 client.

## Prerequisite

A running AcqStore Server is required.

- Use the packaged desktop app you requested and received.

Default server URL:

```text
http://127.0.0.1:8767
```

## Read in this order

1. [JavaScript client guide](javascript-client.md)
2. [API contract](api.md)
3. [Reference demo](demo.md)
4. Runtime OpenAPI at `http://127.0.0.1:8767/openapi.json` **when you can reach the user’s loopback**; otherwise stay on the public docs site and skip live OpenAPI.

## Minimum client behavior

A correct baseline client must:

- verify `/api/v2/health`;
- inspect `/api/v2/capabilities` rather than hard-code formats;
- open through `/api/v2/pick-and-open` or `/api/v2/open`;
- retain `sessionId` while using binary URLs;
- validate binary byte length and sample count;
- decode `raw-f32-le` explicitly;
- use `plane.shape` and `plane.axes` for geometry;
- treat display transpose as a client decision;
- display source (primary) planes and, when present, reference planes;
- show `reference.scanPath` / `reference.lineRoi` when the open response includes them;
- handle stable JSON errors;
- delete the session when finished.

## Acceptance check

The client is ready when it can reproduce the lifecycle shown by `/demo/v2/` — including primary images, reference images when present, and the reference line-scan path when available — without reading the Python implementation.
