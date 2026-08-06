/* ==== ACQSTORE LOAD WIRING TEMPLATE ====
 * Copy into the grafted monolith after inlined reference-view.js.
 * ADAPT ONLY the setImage(...) call site to match Phase A findings
 * (setter name / dual-channel option shape / channel role names).
 * Keep apiBase default and injectCss:false for file:// grafts with inlined CSS.
 * Policy: docs/acqstore-server-additions.md §0
 */
(function () {
  const RV = window.AcqStoreReferenceView;
  if (!RV) {
    console.error('AcqStoreReferenceView drop-in missing');
    return;
  }
  const host = document.getElementById('acqstoreReferenceHost');
  const btn = document.getElementById('acqstoreLoadBtn');
  const statusEl = document.getElementById('acqstoreLoadStatus');
  // injectCss:false — CSS must already be inlined in <style> (file:// safe).
  RV.mount(host, { apiBase: 'http://127.0.0.1:8767', injectCss: false });

  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.style.color = kind === 'ok' ? 'var(--ok)' : kind === 'err' ? 'var(--accent2,#fb7185)' : 'var(--muted)';
  }

  function applyPlaneAxes(plane) {
    if (!plane?.axes?.length) return;
    const byDim = {};
    for (const axis of plane.axes) byDim[axis.arrayDimension] = axis;
    const tAxis = byDim[0], xAxis = byDim[1];
    if (tAxis && Number(tAxis.step) > 0 && document.getElementById('msPerLine')) {
      let ms = Number(tAxis.step);
      const unit = String(tAxis.unit || '').trim().toLowerCase();
      if (['s', 'sec', 'second', 'seconds'].includes(unit)) ms *= 1000;
      document.getElementById('msPerLine').value = String(ms);
      const r = document.getElementById('msPerLineRange');
      if (r) r.value = String(ms);
    }
    if (xAxis && Number(xAxis.step) > 0 && document.getElementById('umPerPixel')) {
      let um = Number(xAxis.step);
      const unit = String(xAxis.unit || '').trim().toLowerCase();
      if (['m', 'meter', 'meters'].includes(unit)) um *= 1e6;
      else if (['mm', 'millimeter', 'millimeters'].includes(unit)) um *= 1e3;
      else if (['nm', 'nanometer', 'nanometers'].includes(unit)) um *= 1e-3;
      document.getElementById('umPerPixel').value = String(um);
      const r = document.getElementById('umPerPixelRange');
      if (r) r.value = String(um);
    }
    if (typeof updateCalInfo === 'function') updateCalInfo();
  }

  /**
   * Hand off AcqStore source planes into the client analysis setter.
   * v1.18 adapter: channels[0] → ocamp, channels[1] → fitc via setImage.
   * Dual-only clients: use ch0/ch1 and warn if extras exist (§0.4).
   */
  async function loadPrimary(payload) {
    const channels = payload.channels || [];
    if (!channels.length) throw new Error('Open response has no source channels');
    const plane = payload.plane;
    const ch0 = await RV.fetchPlane(channels[0], plane);
    const rows0 = RV.planeToRowMajor(ch0, plane.shape);
    const name = RV.sourceFileLabel(payload.source);
    const extraSrc = channels.length > 2 ? channels.length - 2 : 0;

    if (channels.length >= 2) {
      const ch1 = await RV.fetchPlane(channels[1], plane);
      const rows1 = RV.planeToRowMajor(ch1, plane.shape);
      // --- ADAPT THIS CALL for the target client (Phase A) ---
      setImage(rows0, name, {
        dualMode: true,
        channels: {
          ocamp: rows0,
          fitc: rows1,
          ocampName: name + ' ch0',
          fitcName: name + ' ch1',
        },
      });
    } else {
      // --- ADAPT THIS CALL for the target client (Phase A) ---
      setImage(rows0, name);
    }
    applyPlaneAxes(plane);
    return extraSrc;
  }

  async function onLoad() {
    btn.disabled = true;
    setStatus('Checking server…');
    try {
      await RV.health();
      setStatus('Opening acquisition…');
      let payload;
      try {
        payload = await RV.pickAndOpen();
      } catch (err) {
        if (err?.payload?.error === 'cancelled') {
          setStatus('Cancelled');
          return;
        }
        throw err;
      }
      const extraSrc = await loadPrimary(payload);
      const nRef = await RV.setFromOpenPayload(payload);
      let msg =
        'Loaded ' + RV.sourceFileLabel(payload.source) +
        ' · ' + (payload.channels?.length || 0) + ' src' +
        (nRef ? ' · ' + nRef + ' ref' : '');
      if (extraSrc > 0) {
        msg += ' · warning: ignored ' + extraSrc + ' extra source channel(s); used ch0/ch1 only';
      }
      setStatus(msg, extraSrc > 0 ? 'err' : 'ok');
      try { await RV.deleteSession(payload.sessionId); } catch (e) { console.warn(e); }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), 'err');
    } finally {
      btn.disabled = false;
    }
  }

  btn?.addEventListener('click', onLoad);
})();
