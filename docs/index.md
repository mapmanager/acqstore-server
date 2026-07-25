# AcqStore Server

AcqStore Server is a small **local** HTTP service that uses [AcqStore](https://github.com/mapmanager/acqstore) to open scientific image acquisitions and expose metadata and image planes to thin clients (browser demos, custom JavaScript/Python clients, and a native status UI).

API **v2** is the current client target. API **v1** remains available for existing integrations.

## Start here

- [Getting Started](getting-started.md) — install, run, and local URLs
- [Client Roadmap](client-roadmap.md) — first client workflow for API v2
- [API Reference](reference/api.md) — detailed v2 contract
- [JavaScript Client](reference/javascript-client.md)
- [Python Client](reference/python-client.md)
- [Demo](reference/demo.md)

Archived API v1 documentation lives under [API v1](v1/index.md).

## Local-only networking

The server binds to loopback by default (`127.0.0.1:8767`) and refuses non-loopback hosts unless you change the bind policy in code. It is intended for local clients on the same machine, not remote network access.

## Repository status

This project is under private / development use. Documentation in this site is for local browsing and CI build validation; it is not a published public documentation deployment.
