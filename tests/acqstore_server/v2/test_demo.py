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
        '`${API}/health`',
        '`${API}/capabilities`',
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

    assert 'function transposePlane(values, shape)' in html
    assert 'const displayPlane = transposePlane(values, plane.shape)' in html
    assert 'function drawPlane(canvas, values, shape, display)' in html
    assert 'array dimension 1 horizontally' not in html
    assert '>Open File</button>' in html
    assert 'Server-accessible path' not in html
    assert '>Open path</button>' not in html
    assert 'session TTL' not in html
    assert 'capabilities.binary.encoding' not in html
    assert '<summary>Session</summary>' in html
    assert '<summary>Open response</summary>' in html
    assert 'id="showScanPath" type="checkbox" checked' in html
    assert 'function drawScanPath(canvas, sourceShape, scanPath, lineRoi)' in html
    assert 'scanPathPoints(reference.scanPath, reference.lineRoi)' in html
    assert "contrastController.redrawGroup('reference')" in html
    assert 'function createContrastController(elements, redrawView)' in html
    assert 'id="contrastTarget"' in html
    assert 'id="contrastLut"' in html
    assert 'id="rangeHistogram"' in html
    assert 'id="rangeMin"' in html
    assert 'id="rangeMax"' in html
    assert 'id="rangeAuto"' in html
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
        assert f'<option value="{lut}">' in html


def test_v2_demo_is_served_at_versioned_path() -> None:
    client = TestClient(create_app())
    response = client.get('/demo/v2/')
    assert response.status_code == 200
    assert 'AcqStore Server API v2 demo' in response.text
    assert response.headers['content-type'].startswith('text/html')
