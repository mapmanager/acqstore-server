// App bootstrap, open workflow, and event wiring for the demo.
import {state} from './state.js';
import {
  API,
  pickBtn,
  statusEl,
  channelsEl,
  referencesEl,
  referenceEmptyEl,
  scanPathControl,
  showScanPath,
  sourceComposite,
  referenceComposite,
  referenceCompositeControl,
  sourceAxes,
  referenceAxes,
  responsePre,
  headerPre,
  sessionPre,
  imageSplit,
  sourcePane,
  referencePane,
  imageSplitDivider,
  sourceContrast,
  referenceContrast,
  rangePopover,
  rangeTitle,
  rangeHistogram,
  rangeMin,
  rangeMax,
  rangeAuto,
} from './dom.js';
import {jsonRequest, getJson} from './api.js';
import {fetchPlane, transposePlane, displayAxesFromPlane} from './plane.js';
import {scanPathPoints} from './scan-path.js';
import {createSplitPane} from './split-pane.js';
import {createContrastController} from './contrast.js';
import {
  destroyActiveViews,
  updateCompositeControls,
  updateAxesControls,
  mountGroupLayout,
  redrawGroupDisplay,
  drawChannelView,
  redrawAxesOnly,
  resizeAllViewports,
  onCompositeChange,
} from './layout.js';
import {sourceFileLabel} from './save-png.js';

function setBusy(busy) {
  pickBtn.disabled = busy;
}
function setStatus(message, kind='') {
  statusEl.className = 'status ' + kind;
  statusEl.textContent = message;
}
async function renderResources(resources, plane, group, reference=null) {
  // Data only — DOM cards are mounted by mountGroupLayout (solo or composite).
  const views = [];
  const axes = displayAxesFromPlane(plane);
  for (const resource of resources) {
    const values = await fetchPlane(resource, plane);
    const displayPlane = transposePlane(values, plane.shape);
    views.push({
      id: `${group}:${resource.index}`,
      group,
      channelIndex: resource.index,
      label: `Channel ${resource.index}`,
      axes,
      canvas: null,
      values: displayPlane.values,
      displayShape: displayPlane.shape,
      sourceShape: plane.shape,
      scanPath: reference?.scanPath || null,
      lineRoi: reference?.lineRoi || null,
    });
  }
  return views;
}
async function renderOpen(payload) {
  const session = await getJson(`${API}/sessions/${encodeURIComponent(payload.sessionId)}`);
  sessionPre.textContent = JSON.stringify(session, null, 2);
  headerPre.textContent = JSON.stringify(payload.header, null, 2);
  responsePre.textContent = JSON.stringify(payload, null, 2);
  destroyActiveViews();
  state.loadedSourceName = sourceFileLabel(payload.source);
  sourceComposite.checked = false;
  referenceComposite.checked = false;
  sourceAxes.checked = false;
  referenceAxes.checked = false;
  const views = await renderResources(payload.channels, payload.plane, 'source');
  const reference = payload.reference;
  referenceEmptyEl.hidden = Boolean(reference);
  referencesEl.replaceChildren();
  channelsEl.replaceChildren();
  if (reference) {
    const hasScanPath = scanPathPoints(reference.scanPath, reference.lineRoi).length > 0;
    scanPathControl.hidden = !hasScanPath;
    showScanPath.disabled = !hasScanPath;
    views.push(...await renderResources(
      reference.channels,
      reference.plane,
      'reference',
      reference,
    ));
  } else {
    scanPathControl.hidden = true;
    showScanPath.disabled = true;
    referenceCompositeControl.hidden = true;
    referenceComposite.checked = false;
  }
  state.activeViews = views;
  updateCompositeControls();
  updateAxesControls();
  splitPane.setEnabled(Boolean(reference));
  contrastController.setViews(views);
  mountGroupLayout('source');
  mountGroupLayout('reference');
  redrawGroupDisplay('source', {resetView:true});
  redrawGroupDisplay('reference', {resetView:true});
  // Layout may settle after split-pane enable; re-fit so first ref panel is not offset.
  requestAnimationFrame(() => {
    resizeAllViewports();
    requestAnimationFrame(() => resizeAllViewports());
  });
}
const splitPane = createSplitPane({
  container: imageSplit,
  first: sourcePane,
  second: referencePane,
  divider: imageSplitDivider,
  onResize() {
    resizeAllViewports();
  },
});
const contrastController = createContrastController(
  {
    sourcePanel: sourceContrast,
    referencePanel: referenceContrast,
    popover: rangePopover,
    title: rangeTitle,
    histogram: rangeHistogram,
    min: rangeMin,
    max: rangeMax,
    auto: rangeAuto,
  },
  drawChannelView,
);
async function runOpen() {
  setBusy(true); setStatus('Opening acquisition…');
  try {
    const previousSessionId = state.currentSessionId;
    const payload = await jsonRequest(`${API}/pick-and-open`, {});
    if (previousSessionId && previousSessionId !== payload.sessionId) {
      try {
        await getJson(`${API}/sessions/${encodeURIComponent(previousSessionId)}`, {method:'DELETE'});
      } catch (error) {
        console.warn(`Could not delete previous session ${previousSessionId}:`, error);
      }
    }
    state.currentSessionId = payload.sessionId;
    await renderOpen(payload);
    setStatus(`Loaded ${payload.source.name}: ${payload.channels.length} channel(s).`, 'ok');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'err');
  } finally {
    setBusy(false);
  }
}
pickBtn.addEventListener('click', runOpen);
showScanPath.addEventListener('change', () => contrastController.redrawGroup('reference'));
sourceComposite.addEventListener('change', () => onCompositeChange('source'));
referenceComposite.addEventListener('change', () => onCompositeChange('reference'));
sourceAxes.addEventListener('change', () => redrawAxesOnly('source'));
referenceAxes.addEventListener('change', () => redrawAxesOnly('reference'));
