"""Static JavaScript demo coverage for API v2."""

from fastapi.testclient import TestClient

from acqstore_server.app import create_app
from acqstore_server.v2.demo import resolve_v2_demo_dir, resolve_v2_demo_index


def _load_v2_demo_sources() -> str:
    demo_dir = resolve_v2_demo_dir()
    assert demo_dir is not None
    parts = [(demo_dir / 'index.html').read_text(encoding='utf-8')]
    css_path = demo_dir / 'css' / 'demo.css'
    if css_path.is_file():
        parts.append(css_path.read_text(encoding='utf-8'))
    for js_path in sorted((demo_dir / 'js').glob('*.js')):
        parts.append(js_path.read_text(encoding='utf-8'))
    return '\n'.join(parts)


def test_v2_demo_file_exists_and_exercises_client_lifecycle() -> None:
    demo_dir = resolve_v2_demo_dir()
    assert demo_dir is not None
    index_path = resolve_v2_demo_index()
    assert index_path is not None
    index_html = index_path.read_text(encoding='utf-8')
    sources = _load_v2_demo_sources()

    assert 'type="module"' in index_html
    assert './js/app.js' in index_html
    assert './css/demo.css' in index_html
    assert (demo_dir / 'archive' / 'index.monolith.html').is_file()

    assert "const API = '/api/v2'" in sources
    assert '/api/v1' not in sources
    assert 'calciumChannel' not in sources
    assert 'vesselChannel' not in sources

    required_contract_terms = (
        '`${API}/pick-and-open`',
        '`${API}/sessions/${encodeURIComponent(payload.sessionId)}`',
        "method:'DELETE'",
        'dataUrl',
        'resource.byteLength',
        'plane.shape',
        'currentSessionId',
        'sessionPre',
    )
    for term in required_contract_terms:
        assert term in sources

    assert 'state.activeViews' in sources
    assert 'state.compositeSlots' in sources
    assert 'state.currentSessionId' in sources
    assert 'function ensureImageViewport(target,' in sources
    assert 'function resizeAllViewports()' in sources
    assert 'Display orientation invariants' in sources
    set_views = sources.split('setViews(nextViews)', 1)[1].split('reset()', 1)[0]
    assert 'mountGroupLayout' not in set_views
    assert 'redrawGroupDisplay' not in set_views
    assert 'mountContrastPanels' in set_views

    assert '`${API}/health`' not in sources
    assert '`${API}/capabilities`' not in sources
    assert 'function transposePlane(values, shape)' in sources
    assert 'const displayPlane = transposePlane(values, plane.shape)' in sources
    assert 'function renderPlaneBitmap(values, shape, display)' in sources
    assert 'function createImageViewport(canvas, options={})' in sources
    assert 'function createSplitPane({container, first, second, divider' in sources
    assert 'Shift+drag: pan' in sources
    assert 'axis-zooming' in sources
    assert 'region-zooming' in sources
    assert 'function isSquareImage()' in sources
    assert 'function applyRegionZoom(start, end)' in sources
    assert "mode = 'regionZoom'" in sources
    assert 'fillText(unit, right + 6, top + 2)' not in sources
    assert 'fillText(label, right + 6, y - 5)' not in sources
    assert 'let scaleX = 1;' in sources
    assert 'let scaleY = 1;' in sources
    assert "mode = 'axisPending'" in sources
    assert 'Stretch kymograph' in sources
    assert 'flex:1 1 0; min-height:0' in sources
    assert 'min-height:0; height:auto' in sources
    assert 'min-height:32px' not in sources
    assert 'minFirst=0' in sources
    assert 'id="sourceComposite"' in index_html
    assert 'id="referenceComposite"' in index_html
    assert 'id="sourceAxes"' in index_html
    assert 'id="referenceAxes"' in index_html
    assert 'function drawAxisLabels(ctx, drawState)' in sources
    assert 'function adaptiveAxisTicks(maxValue, pixelSpan, opts={})' in sources
    assert 'Plot-style Y after display transpose' in sources
    assert 'display width ← dim0' in sources
    assert 'function renderCompositeBitmap(viewA, viewB)' in sources
    assert 'function mountGroupLayout(group)' in sources
    assert 'Wheel or pinch to zoom' not in sources
    assert 'Composite (per pane):' not in sources
    assert 'Generic JavaScript client' not in sources
    assert 'Delete session' not in sources
    assert 'Allowed formats:' not in sources
    assert 'id="closeBtn"' not in index_html
    assert 'id="serverInfo"' not in index_html
    assert "label: `Channel ${resource.index}`" in sources
    assert 'Channel ${first.channelIndex} (${lutDisplayLabel(first.display?.lut)})' in sources
    assert 'function sampleLutRgb(lutName, t)' in sources
    assert 'function defaultLutForChannelIndex(channelIndex)' in sources
    assert "return 'green'" in sources
    assert "return 'magenta'" in sources
    assert 'ca[0] + cb[0]' in sources
    assert 'ignores per-channel LUT' not in sources
    assert 'Fixed v1 composite: channel 0' not in sources
    assert '<summary>AcqStore header</summary>' in index_html
    assert index_html.index('<summary>Open response</summary>') < index_html.index('<summary>Session</summary>')
    assert 'array dimension 1 horizontally' not in sources
    assert '>Open File</button>' in index_html
    assert 'class="page-header"' in index_html
    assert 'https://mapmanager.github.io/acqstore-server/users/demo/' in index_html
    assert 'min(85vh, 960px)' in sources
    assert 'min(70vh, 720px)' not in sources
    assert 'Server-accessible path' not in sources
    assert '>Open path</button>' not in index_html
    assert 'session TTL' not in sources
    assert 'capabilities.binary.encoding' not in sources
    assert '<summary>Session</summary>' in index_html
    assert '<summary>Open response</summary>' in index_html
    assert 'id="showScanPath" type="checkbox" checked' in index_html
    assert 'function drawScanPathOverlay(ctx, scanPath, lineRoi, viewScale)' in sources
    assert 'scanPathPoints(reference.scanPath, reference.lineRoi)' in sources
    assert "contrastController.redrawGroup('reference')" in sources
    assert 'function createContrastController(elements, redrawView)' in sources
    assert 'id="sourceContrast"' in index_html
    assert 'id="referenceContrast"' in index_html
    assert 'id="contrastTarget"' not in index_html
    assert 'id="contrastCard"' not in index_html
    assert 'id="contrastLut"' not in index_html
    assert 'id="rangeHistogram"' in index_html
    assert 'id="rangeMin"' in index_html
    assert 'id="rangeMax"' in index_html
    assert 'id="rangeAuto"' in index_html
    assert 'function createContrastController(elements, redrawView)' in sources
    assert 'mountContrastPanels' in sources
    assert 'contrast-row' in sources
    assert 'Math.log1p(count) / Math.log1p(maxCount)' in sources
    assert 'const LUT_TABLES = buildLutTables()' in sources
    assert 'lutColor(normalized, display.lut)' not in sources
    assert 'Drag the dark and light handles' not in sources
    for lut in (
        'gray',
        'yellow',
        'cyan',
        'magenta',
        'red',
        'green',
        'fire',
        'hot',
        'viridis',
        'magma',
        'inferno',
        'cividis',
    ):
        assert f"'{lut}'" in sources or f'"{lut}"' in sources


def test_v2_demo_is_served_at_versioned_path() -> None:
    client = TestClient(create_app())
    response = client.get('/demo/v2/')
    assert response.status_code == 200
    assert 'AcqStore Server API v2 demo' in response.text
    assert response.headers['content-type'].startswith('text/html')

    app_js = client.get('/demo/v2/js/app.js')
    assert app_js.status_code == 200
    assert 'javascript' in app_js.headers['content-type']
