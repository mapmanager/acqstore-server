// Save the on-screen channel/composite canvas as a PNG (what the user sees).
import {state} from './state.js';

/** Basename including extension, e.g. myfile.oir */
function sourceFileLabel(source) {
  const raw = source?.name || source?.path || 'acquisition';
  return String(raw).split(/[/\\]/).pop() || 'acquisition';
}

/**
 * @param {{group:'source'|'reference', channelIndex?:number, composite?:boolean}} opts
 */
function suggestedPngName(opts) {
  const stem = state.loadedSourceName || 'acquisition';
  const isRef = opts.group === 'reference';
  if (opts.composite) {
    return isRef ? `${stem}_ref.composite.png` : `${stem}.composite.png`;
  }
  const index = Number.isInteger(opts.channelIndex) ? opts.channelIndex : 0;
  return isRef ? `${stem}_ref.ch${index}.png` : `${stem}.ch${index}.png`;
}

async function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed'))),
      'image/png',
    );
  });
}

async function savePngBlob(blob, suggestedName) {
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{description: 'PNG image', accept: {'image/png': ['.png']}}],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
      // Fall back to download attribute.
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = suggestedName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Save the literal display canvas (zoom/pan, axes, scan path if drawn).
 * @param {HTMLCanvasElement} canvas
 * @param {{group:string, channelIndex?:number, composite?:boolean, viewport?:{redraw?:Function}}} opts
 */
async function saveDisplayCanvasPng(canvas, opts) {
  if (!canvas) throw new Error('No canvas to save');
  opts.viewport?.redraw?.();
  const suggestedName = suggestedPngName(opts);
  const blob = await canvasToPngBlob(canvas);
  await savePngBlob(blob, suggestedName);
}

function createSavePngButton({canvas, getViewport, group, channelIndex, composite=false}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'save-png-btn';
  button.textContent = 'Save PNG';
  button.title = 'Save the image as currently shown';
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      button.disabled = true;
      await saveDisplayCanvasPng(canvas, {
        group,
        channelIndex,
        composite,
        viewport: getViewport?.(),
      });
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

function createCardTitleRow(titleText, saveButton) {
  const row = document.createElement('div');
  row.className = 'card-title-row';
  const title = document.createElement('h2');
  title.textContent = titleText;
  row.append(title, saveButton);
  return row;
}

export {
  sourceFileLabel,
  suggestedPngName,
  saveDisplayCanvasPng,
  createSavePngButton,
  createCardTitleRow,
};
