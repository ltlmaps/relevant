import { css } from 'styled-components';
import { lineColor } from './colors';
import sizing from './sizing';
// import { smallScreenWidth } from './layout';
import { responsiveHandler } from './responsive';

export const size = (value, screen) => {
  const units = responsiveHandler(value, screen);

  if (typeof units === 'number') return sizing(units);
  if (!units || units.match(/px|rem|em|vh|vw|auto|%|pt/)) return units;
  const uArray = units.split(' ');
  if (uArray.length === 1) sizing(Number(units));
  return uArray.map(u => sizing(Number(u))).join(' ');
};

export const color = css`
  ${p => (p.c ? `color: ${p.c};` : '')};
  ${p => (p.c ? `text-decoration-color: ${p.c};` : '')};
`;

export const padding = css`
  ${p => (p.p ? `padding: ${size(p.p)}` : '')};
  ${p => (p.pb ? `padding-bottom: ${size(p.pb)}` : '')};
  ${p => (p.pl ? `padding-left: ${size(p.pl)}` : '')};
  ${p => (p.pr ? `padding-right: ${size(p.pr)}` : '')};
  ${p => (p.pt ? `padding-top: ${size(p.pt)}` : '')};
`;

const margincss = (p, screen) => `
  ${p.m ? `margin: ${size(p.m, screen)}  !important` : ''};
  ${p.mb ? `margin-bottom: ${size(p.mb, screen)}  !important` : ''};
  ${p.ml ? `margin-left: ${size(p.ml, screen)}  !important` : ''};
  ${p.mr ? `margin-right: ${size(p.mr, screen)}  !important` : ''};
  ${p.mt ? `margin-top: ${size(p.mt, screen)} !important` : ''};
`;

// const MARGIN_VALS = {
//   m: 'margin',
//   mb: 'margin-bottom',
//   ml: 'margin-left',
//   mr: 'margin-right',
//   mt: 'margin-top',
// };

export const margin = css`
  ${p => margincss(p, 0)}
`;

export const font = css`
  ${p => (p.fs ? `font-size: ${size(p.fs)}` : '')};
  ${p => (p.lh ? `line-height: ${size(p.lh)}` : '')};
  ${p => (p.fw ? `font-weight: ${p.fw}` : '')};
  ${p => (p.ff ? `font-family: ${p.ff}` : '')};
  ${p => (p.td ? `text-decoration: ${p.td}; }` : '')};
`;

export const display = css`
  ${p => (p.d ? `display: ${p.d}` : '')};
`;

export const inheritfont = css`
  ${p =>
    p.inheritfont
      ? `
      font-size: 'inherit';
      line-height: 'inherit';
      font-family: 'inherit';`
      : ''};
`;

export const inheritcolor = css`
  ${p =>
    p.inheritcolor
      ? `
      color: 'inherit';`
      : ''};
`;

export const width = css`
  ${p => (p.w ? `width: ${size(p.w)};` : '')};
  ${p => (p.minwidth ? `min-width: ${size(p.minwidth)};` : '')};
`;

export const height = css`
  ${p => (p.h ? `height: ${size(p.h)};` : '')};
  ${p => (p.minHeight ? `min-height: ${size(p.minHeight)};` : '')};
  ${p => (p.maxheight ? `max-height: ${size(p.maxheight)};` : '')};
`;

export const background = css`
  ${p => (p.bg ? `background: ${p.bg};` : '')};
`;

export const borderRadius = css`
  ${p => (p.bradius ? `border-radius: ${size(p.bradius)};` : '')};
`;

const universalBorder = (side, c = lineColor, w = '1px') => `
  border${side ? `-${side}` : ''}-color: ${c};
  border${side ? `-${side}` : ''}-width: ${size(w)};
  border-style: solid;
`;

export const border = css`
  ${p => p.br && universalBorder('right', p.bc, p.bw)};
  ${p => p.bl && universalBorder('left', p.bc, p.bw)};
  ${p => p.bt && universalBorder('top', p.bc, p.bw)};
  ${p => p.bb && universalBorder('bottom', p.bc, p.bw)};
  ${p => p.border && universalBorder('', p.bc, p.bw)};
`;

export const flex = css`
  position: relative;
  ${p => (p.flex ? `flex: ${responsiveHandler(p.flex)}` : '')};
  ${p => (p.fdirection ? `flex-direction: ${responsiveHandler(p.fdirection)}` : '')};
  ${p => (p.justify ? `justify-content: ${responsiveHandler(p.justify)}` : '')};
  ${p => (p.align ? `align-items: ${responsiveHandler(p.align)}` : '')};
  ${p => (p.shrink ? `flex-shrink: ${responsiveHandler(p.shrink)}` : '')};
  ${p => (p.grow ? `flex-grow: ${responsiveHandler(p.grow)}` : '')};
  ${p => (p.wrap ? 'flex-wrap: wrap' : '')};
  ${p => (p.inline ? '' : 'display: flex')};
  ${p => (p.alignself ? `align-self: ${responsiveHandler(p.alignself)}` : '')};
`;

export const link = css`
  ${p => (p.color ? `color: ${p.color}` : '')};
  ${p => (p.hc ? `&:hover * { color: ${p.hc}; }` : '')};
  ${p => (p.hc ? `&:hover * { fill: ${p.hc}; }` : '')};
  ${p => (p.ac ? `&.active * { color: ${p.ac}; }` : '')};
  ${p => (p.ac ? `&.active * { fill: ${p.ac}; }` : '')};
  ${p => (p.td ? `text-decoration: ${p.td}; }` : '')};
`;

export const cursor = css`
  ${p => (p.cursor && !p.mobile ? `cursor: ${p.cursor}; }` : '')};
`;

export const zIndex = css`
  ${p => (p.zIndex ? `z-index: ${p.zIndex}` : '')};
`;
