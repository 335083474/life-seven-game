export type BookView='spread'|'left'|'right';
export const bookViewX=(view:BookView)=>view==='left'?-1.51:view==='right'?1.51:0;
/** Fit the whole opened cover, including both leaves, in a narrow viewport. */
export function spreadFov(aspect:number,distance:number,preferred=32){
  return Math.max(preferred,2*Math.atan(7.4/(2*distance*aspect))*180/Math.PI);
}
export const pageFov=(aspect:number,distance:number)=>Math.max(28,2*Math.atan(3.6/(2*distance*aspect))*180/Math.PI);
