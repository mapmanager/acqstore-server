// LUT color tables and lookup for channel display.
import {clamp} from './util.js';

const LUT_OPTION_LABELS = {
  gray:'Gray', yellow:'Yellow', cyan:'Cyan', magenta:'Magenta', red:'Red', green:'Green',
  fire:'Fire', hot:'Hot', viridis:'Viridis', magma:'Magma', inferno:'Inferno', cividis:'Cividis',
};

function rgbStops(t, stops) {
  t = clamp(t, 0, 1);
  for (let index = 0; index < stops.length - 1; index++) {
    const left = stops[index], right = stops[index + 1];
    if (t >= left[0] && t <= right[0]) {
      const fraction = (t - left[0]) / Math.max(1e-12, right[0] - left[0]);
      return [0, 1, 2].map(channel =>
        Math.round(left[1][channel] + (right[1][channel] - left[1][channel]) * fraction)
      );
    }
  }
  return stops[stops.length - 1][1];
}
const LUT_COLOR_STOPS = {
  hot: [[0,[0,0,0]],[0.33,[220,0,0]],[0.67,[255,220,0]],[1,[255,255,255]]],
  viridis: [[0,[68,1,84]],[0.25,[59,82,139]],[0.5,[33,145,140]],[0.75,[94,201,98]],[1,[253,231,37]]],
  magma: [[0,[0,0,4]],[0.25,[74,16,112]],[0.5,[181,54,122]],[0.75,[251,136,97]],[1,[252,253,191]]],
  inferno: [[0,[0,0,4]],[0.25,[87,15,109]],[0.5,[187,55,84]],[0.75,[249,142,8]],[1,[252,255,164]]],
  cividis: [[0,[0,32,76]],[0.25,[70,82,103]],[0.5,[118,118,107]],[0.75,[166,161,113]],[1,[255,233,69]]],
  red: [[0,[0,0,0]],[0.35,[110,0,0]],[0.75,[255,45,25]],[1,[255,235,230]]],
  yellow: [[0,[0,0,0]],[0.35,[105,80,0]],[0.75,[255,210,0]],[1,[255,255,220]]],
  green: [[0,[0,0,0]],[0.35,[0,90,42]],[0.75,[0,220,85]],[1,[235,255,235]]],
  cyan: [[0,[0,0,0]],[0.35,[0,77,102]],[0.75,[0,200,255]],[1,[230,255,255]]],
  magenta: [[0,[0,0,0]],[0.35,[95,0,105]],[0.75,[255,0,220]],[1,[255,230,255]]],
};
function lutColor(t, lut) {
  if (lut === 'fire') {
    return [
      clamp(Math.round(255 * 3 * t), 0, 255),
      clamp(Math.round(255 * (3 * t - 1)), 0, 255),
      clamp(Math.round(255 * (3 * t - 2)), 0, 255),
    ];
  }
  if (LUT_COLOR_STOPS[lut]) return rgbStops(t, LUT_COLOR_STOPS[lut]);
  const gray = Math.round(clamp(t, 0, 1) * 255);
  return [gray, gray, gray];
}
function buildLutTables() {
  const names = ['gray', 'yellow', 'cyan', 'magenta', 'red', 'green', 'fire', 'hot', 'viridis', 'magma', 'inferno', 'cividis'];
  return Object.fromEntries(names.map(name => {
    const table = new Uint8ClampedArray(256 * 3);
    for (let index = 0; index < 256; index++) {
      const color = lutColor(index / 255, name);
      const offset = index * 3;
      table[offset] = color[0];
      table[offset + 1] = color[1];
      table[offset + 2] = color[2];
    }
    return [name, table];
  }));
}
const LUT_TABLES = buildLutTables();

/** Sample RGB from a named LUT at normalized intensity t in [0, 1]. */
function sampleLutRgb(lutName, t) {
  const lut = LUT_TABLES[lutName] || LUT_TABLES.gray;
  const lutOffset = Math.round(clamp(t, 0, 1) * 255) * 3;
  return [lut[lutOffset], lut[lutOffset + 1], lut[lutOffset + 2]];
}

function defaultLutForChannelIndex(channelIndex) {
  if (channelIndex === 0) return 'green';
  if (channelIndex === 1) return 'magenta';
  return 'gray';
}

function lutDisplayLabel(lutName) {
  return LUT_OPTION_LABELS[lutName] || lutName || 'Gray';
}

export {
  LUT_TABLES,
  LUT_OPTION_LABELS,
  sampleLutRgb,
  defaultLutForChannelIndex,
  lutDisplayLabel,
};
