"""Static JavaScript demo coverage for API v2."""

from fastapi.testclient import TestClient

from acqstore_server.app import create_app
from acqstore_server.v2.demo import resolve_v2_demo_index


def test_v2_demo_file_exists_and_exercises_client_lifecycle() -> None:
    path = resolve_v2_demo_index()
    assert path is not None
    html = path.read_text(encoding='utf-8')

    assert "const API = '/api/v2'" in html
    assert '/api/v1' not in html
    assert 'calciumChannel' not in html
    assert 'vesselChannel' not in html

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
        assert term in html

    assert '`${API}/health`' not in html
    assert '`${API}/capabilities`' not in html
    assert 'function transposePlane(values, shape)' in html
    assert 'const displayPlane = transposePlane(values, plane.shape)' in html
    assert 'function renderPlaneBitmap(values, shape, display)' in html
    assert 'function createImageViewport(canvas, options={})' in html
    assert 'function createSplitPane({container, first, second, divider' in html
    assert 'Shift+drag: pan' in html
    assert 'axis-zooming' in html
    assert 'region-zooming' in html
    assert 'function isSquareImage()' in html
    assert 'function applyRegionZoom(start, end)' in html
    assert "mode = 'regionZoom'" in html
    assert 'fillText(unit, right + 6, top + 2)' not in html
    assert 'fillText(label, right + 6, y - 5)' not in html
    assert 'let scaleX = 1;' in html
    assert 'let scaleY = 1;' in html
    assert "mode = 'axisPending'" in html
    assert 'Stretch kymograph' in html
    assert 'flex:1 1 0; min-height:0' in html
    assert 'min-height:0; height:auto' in html
    assert 'min-height:32px' not in html
    assert 'minFirst=0' in html
    assert 'id="sourceComposite"' in html
    assert 'id="referenceComposite"' in html
    assert 'id="sourceAxes"' in html
    assert 'id="referenceAxes"' in html
    assert 'function drawAxisLabels(ctx, state)' in html
    assert 'function adaptiveAxisTicks(maxValue, pixelSpan, opts={})' in html
    assert 'Plot-style Y after display transpose' in html
    assert 'display width ← dim0' in html
    assert 'function renderCompositeBitmap(viewA, viewB)' in html
    assert 'function mountGroupLayout(group)' in html
    assert 'Wheel or pinch to zoom' not in html
    assert 'Composite (per pane):' not in html
    assert 'Generic JavaScript client' not in html
    assert 'Delete session' not in html
    assert 'Allowed formats:' not in html
    assert 'id="closeBtn"' not in html
    assert 'id="serverInfo"' not in html
    assert "label: `Channel ${resource.index}`" in html
    assert 'Channel ${first.channelIndex} (green)' in html
    assert '<summary>AcqStore header</summary>' in html
    assert html.index('<summary>Open response</summary>') < html.index('<summary>Session</summary>')
    assert 'array dimension 1 horizontally' not in html
    assert '>Open File</button>' in html
    assert 'class="page-header"' in html
    assert 'https://mapmanager.github.io/acqstore-server/users/demo/' in html
    assert 'min(85vh, 960px)' in html
    assert 'min(70vh, 720px)' not in html
    assert 'Server-accessible path' not in html
    assert '>Open path</button>' not in html
    assert 'session TTL' not in html
    assert 'capabilities.binary.encoding' not in html
    assert '<summary>Session</summary>' in html
    assert '<summary>Open response</summary>' in html
    assert 'id="showScanPath" type="checkbox" checked' in html
    assert 'function drawScanPathOverlay(ctx, scanPath, lineRoi, viewScale)' in html
    assert 'scanPathPoints(reference.scanPath, reference.lineRoi)' in html
    assert "contrastController.redrawGroup('reference')" in html
    assert 'function createContrastController(elements, redrawView)' in html
    assert 'id="sourceContrast"' in html
    assert 'id="referenceContrast"' in html
    assert 'id="contrastTarget"' not in html
    assert 'id="contrastCard"' not in html
    assert 'id="contrastLut"' not in html
    assert 'id="rangeHistogram"' in html
    assert 'id="rangeMin"' in html
    assert 'id="rangeMax"' in html
    assert 'id="rangeAuto"' in html
    assert 'function createContrastController(elements, redrawView)' in html
    assert 'mountContrastPanels' in html
    assert 'contrast-row' in html
    assert 'Math.log1p(count) / Math.log1p(maxCount)' in html
    assert 'const LUT_TABLES = buildLutTables()' in html
    assert 'lutColor(normalized, display.lut)' not in html
    assert 'Drag the dark and light handles' not in html
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
        assert f"'{lut}'" in html or f'"{lut}"' in html


def test_v2_demo_is_served_at_versioned_path() -> None:
    client = TestClient(create_app())
    response = client.get('/demo/v2/')
    assert response.status_code == 200
    assert 'AcqStore Server API v2 demo' in response.text
    assert response.headers['content-type'].startswith('text/html')
