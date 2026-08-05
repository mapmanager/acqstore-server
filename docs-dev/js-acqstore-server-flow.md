# JS demo → AcqStore Server API v2 flow

Roadmap of how `index.monolith.html` opens an acquisition and turns server responses into canvas pixels. Examined from source (not guessed).

Primary client:
`acqstore-server/src/acqstore_server/static/demo/v2/archive/index.monolith.html`

Maintained modular twin (same API usage):
`acqstore-server/src/acqstore_server/static/demo/v2/` (`js/app.js`, `js/plane.js`, `js/api.js`)

Server package roots:
`acqstore-server/src/acqstore_server/`

---

## 1. End-to-end sequence

```text
Browser demo (/demo/v2/ or archive monolith)
  │
  ├─ POST /api/v2/pick-and-open   {}     ← native file picker on server machine
  │     │
  │     ├─ dialogs.pick_acquisition_file()
  │     ├─ open_service.open_acquisition(path)   → OpenedAcquisition (NumPy planes)
  │     ├─ routes._register_opened()
  │     │     ├─ encode_raw_f32_le() per channel  → bytes
  │     │     ├─ SessionStore.create(SessionBuffers)
  │     │     └─ OpenResponse JSON (header + plane + dataUrl links)
  │     │
  │     └─ HTTP 200 JSON  OpenResponse (camelCase)
  │
  ├─ GET  /api/v2/sessions/{sessionId}           ← demo only; session metadata
  │
  ├─ for each channel / reference channel:
  │     GET  {channel.dataUrl}
  │       → application/octet-stream  (raw f32 LE bytes from SessionStore)
  │       → ArrayBuffer → Float32Array
  │       → optional client transpose → canvas
  │
  └─ DELETE /api/v2/sessions/{previousSessionId}  ← when opening a new file
```

Two payloads, not one:

| Kind | Content-Type | What it carries |
|------|--------------|-----------------|
| Open / session JSON | `application/json` | metadata, header, shape, axes, URLs |
| Plane bytes | `application/octet-stream` | row-major little-endian float32 samples |

Pixels are **never** embedded in the open JSON.

---

## 2. Browser entry (monolith)

Constants / helpers:

- `const API = '/api/v2'` (same origin as the running server)
- `jsonRequest(url, body)` → `POST` + `JSON.stringify` + parse JSON; throws if `!response.ok` or `payload.ok === false`
- `getJson(url, options)` → same check for GET/DELETE

User click → `runOpen()`:

1. `POST ${API}/pick-and-open` with `{}`
2. If a previous `sessionId` exists and differs, `DELETE ${API}/sessions/{id}`
3. Store `payload.sessionId`
4. `renderOpen(payload)`

`renderOpen(payload)`:

1. `GET ${API}/sessions/{sessionId}` → dump into `#sessionPre`
2. Dump `payload.header` and full `payload` into the other `<pre>` panels
3. `renderResources(payload.channels, payload.plane, 'source')`
4. If `payload.reference`, same for `reference.channels` / `reference.plane`
5. Mount canvases, contrast, split pane

`fetchPlane(resource, plane)` (binary decode):

```javascript
const response = await fetch(resource.dataUrl, {cache:'no-store'});
const buffer = await response.arrayBuffer();
// assert buffer.byteLength === resource.byteLength
const values = new Float32Array(buffer);
// assert values.length === plane.shape[0] * plane.shape[1]
```

Then `transposePlane(values, plane.shape)` for display (client-only; server does not transpose).

---

## 3. App wiring (server process)

`app.attach_api()` (`app.py`):

- Creates / reuses `SessionStore`
- Default picker: `dialogs.pick_acquisition_file`
- Default open: `open_service.open_acquisition`
- `app.include_router(create_v2_router(...))` → all routes under `/api/v2`
- Optionally mounts static demo at `/demo/v2/`

Router factory: `v2/routes.py` → `create_router(store=, pick_file=, open_fn=)`.

---

## 4. Open path (JSON construction)

### 4.1 Endpoint

`POST /api/v2/pick-and-open` (`PickAndOpenRequest`, body may be `{}`):

1. `await asyncio.to_thread(pick_file, request.extensions)`
2. Cancel → HTTP 200 `{ ok:false, error:"cancelled", ... }` (not a 4xx)
3. Else `_open_threaded(path, channel_indices)` → `open_fn` in a worker thread with timeout
4. `_register_opened(opened, store)` → `OpenResponse`

`POST /api/v2/open` is the same after the path is already known (`OpenRequest.path`).

### 4.2 Decode file → transport-neutral models

`open_service.open_acquisition(path, channel_indices=...)`:

1. Resolve path; `AcqImage(..., load_images=True)`
2. Select channel indices (default: all)
3. For each index: `pixels.get_plane(c=index)` → validate 2-D → `ChannelPlane(array=...)`
4. Header: `acq.images.header.as_json_dict()` → `AcquisitionHeader`
5. Axes: physical Y/X steps + units → `AxisInfo` dim0=`Y`, dim1=`X`
6. Optional reference: planes + `line_roi` + `scan_path` → `ReferenceImageData`
7. Return `OpenedAcquisition` (NumPy arrays still in source dtype; no HTTP URLs yet)

Internal models live in `v2/models.py` (snake_case, no URLs).

### 4.3 Encode + session + OpenResponse

`_register_opened(opened, store)` in `routes.py`:

```text
for each source channel:
    channel_payloads[i] = encode_raw_f32_le(channel.array)

for each reference channel (if any):
    reference_payloads[i] = encode_raw_f32_le(channel.array)

session_id = store.create(SessionBuffers(channels=..., reference_channels=...))

return OpenResponse(
    session_id,
    source={path, name, format, source_dtype, num_channels},
    header={shape, dims, sizes, dtype, num_channels, physical_units, ...},
    plane={shape, served_dtype, encoding, layout, axes},
    channels=[{index, name, byte_length, data_url}, ...],
    reference= optional {plane, channels[{index, byte_length, data_url}], line_roi, scan_path},
)
```

Encoding (`v2/encoding.py`):

```python
np.asarray(plane, dtype='<f4', order='C').tobytes(order='C')
```

Binary is **precomputed at open time** and held in memory. Later `.../data` GETs only look up those bytes.

JSON field names are **camelCase** (`schemas.ApiModel` + `alias_generator=to_camel`):
`sessionId`, `byteLength`, `dataUrl`, `sourceDtype`, `lineRoi`, `scanPath`, etc.

Important `OpenResponse` pieces for image display:

- `header` — AcqStore header snapshot (full acquisition dims/shape, not only the served 2-D plane)
- `plane.shape` — `[rows, columns]` for the **served** 2-D plane
- `plane.encoding` — `"raw-f32-le"`; `servedDtype` `"float32"`; `layout` `"row-major"`
- `channels[].dataUrl` — e.g. `/api/v2/sessions/{id}/channels/{i}/data`
- `channels[].byteLength` — `rows * cols * 4`
- `reference` — same pattern under `/reference/channels/{i}/data`, plus optional scan path

---

## 5. Binary plane endpoints

Source:

`GET /api/v2/sessions/{session_id}/channels/{channel_index}/data`

```python
data = store.get_channel(session_id, channel_index)
return Response(
    content=data,
    media_type='application/octet-stream',
    headers={'Content-Length': str(len(data)), 'Cache-Control': 'no-store'},
)
```

Reference:

`GET /api/v2/sessions/{session_id}/reference/channels/{channel_index}/data`

Same body type via `store.get_reference_channel(...)`.

Client reshape contract:

```text
Float32Array length == plane.shape[0] * plane.shape[1]
index = row * columns + column   # row-major, dim0 then dim1
```

---

## 6. Session store

`v2/session_store.py`:

- In-memory `dict[session_id → SessionBuffers]`
- TTL (default 600s); expired sessions purged on access
- `create` → opaque `secrets.token_hex(16)`
- `get_channel` / `get_reference_channel` → `bytes | None`
- `describe` → used by `GET /sessions/{id}` (`ttlSecondsRemaining`, indices, `totalBytes`)
- `delete` → used when demo opens a new file

No disk cache of plane bytes; reopen = re-decode + re-encode.

---

## 7. Layer map (files)

| Layer | File | Role |
|-------|------|------|
| Demo UI | `static/demo/v2/archive/index.monolith.html` | pick-and-open, fetch planes, canvas |
| Demo mount | `v2/demo.py` | `/demo/v2/` static |
| App attach | `app.py` | wire router + picker + store |
| HTTP routes | `v2/routes.py` | open, session, binary GETs; build `OpenResponse` |
| JSON schema | `v2/schemas.py` | camelCase OpenAPI / response models |
| Domain open | `v2/open_service.py` | AcqImage → `OpenedAcquisition` |
| Domain models | `v2/models.py` | snake_case, NumPy planes, no URLs |
| Binary encode | `v2/encoding.py` | 2-D → raw f32 LE bytes |
| Session RAM | `v2/session_store.py` | TTL map of pre-encoded payloads |
| Native picker | `dialogs.py` | macOS / tkinter file dialog |

---

## 8. Mental model for Python → JS

```text
NumPy 2-D array (any source dtype)
  → encode_raw_f32_le  → bytes
  → FastAPI Response(application/octet-stream)
  → fetch().arrayBuffer()
  → new Float32Array(buffer)
  → values[row * cols + col]
```

Metadata path is separate:

```text
OpenedAcquisition / AcquisitionHeader
  → OpenResponse / HeaderResponse (Pydantic, camelCase JSON)
  → response.json() in the browser
```

Do not send nested JS arrays of pixels through JSON for this API. The contract is: JSON describes the plane; `dataUrl` returns the samples.
