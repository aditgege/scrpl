'use strict';

/* ---------- stickers ---------- */
/* Pure canvas helpers; no deps beyond the ctx passed in by drawElement.
   Both functions are pure aside from canvas side-effects. */
export function stickerPath(x,kind,w,hh){
  switch(kind){
    case 'star5':{
      const R=Math.min(w,hh)/2,r=R*0.44;
      x.beginPath();
      for(let i=0;i<10;i++){
        const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;
        const px=Math.cos(a)*w/2/(Math.min(w,hh)/2)*rr,py=Math.sin(a)*hh/2/(Math.min(w,hh)/2)*rr;
        i?x.lineTo(px,py):x.moveTo(px,py);
      }
      x.closePath();break;}
    case 'sparkle':{
      const R=Math.min(w,hh)/2,r=R*0.16;
      x.beginPath();
      for(let i=0;i<8;i++){
        const a=-Math.PI/2+i*Math.PI/4,rr=i%2?r:R;
        const px=Math.cos(a)*w/2/(Math.min(w,hh)/2)*rr,py=Math.sin(a)*hh/2/(Math.min(w,hh)/2)*rr;
        i?x.lineTo(px,py):x.moveTo(px,py);
      }
      x.closePath();break;}
    case 'heart':
      x.beginPath();
      x.moveTo(0,hh*0.36);
      x.bezierCurveTo(-w*0.56,hh*0.04,-w*0.30,-hh*0.44,0,-hh*0.12);
      x.bezierCurveTo(w*0.30,-hh*0.44,w*0.56,hh*0.04,0,hh*0.36);
      x.closePath();break;
    case 'leaf':
      x.beginPath();
      x.moveTo(0,-hh/2);
      x.quadraticCurveTo(w*0.52,-hh*0.08,0,hh/2);
      x.quadraticCurveTo(-w*0.52,-hh*0.08,0,-hh/2);
      x.closePath();break;
    case 'dot':
      x.beginPath();x.ellipse(0,0,w/2,hh/2,0,0,7);break;
    default:stickerPath(x,'star5',w,hh);
  }
}
export function drawStickerShape(x,kind,w,hh,fill,style){
  if(kind==='flower'){
    const R=Math.min(w,hh)/2;
    x.fillStyle=fill;
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2;
      x.beginPath();x.ellipse(Math.cos(a)*R*0.55,Math.sin(a)*R*0.55,R*0.48,R*0.26,a,0,7);x.fill();
    }
    x.beginPath();x.arc(0,0,R*0.22,0,7);x.fill();
    return;
  }
  if(kind==='sun'){
    const R=Math.min(w,hh)/2;
    if(style==='outline'){
      x.strokeStyle=fill;x.lineWidth=Math.max(2,R*0.08);
      x.beginPath();x.arc(0,0,R*0.42,0,7);x.stroke();
      for(let i=0;i<8;i++){
        const a=i/8*Math.PI*2;
        x.beginPath();x.moveTo(Math.cos(a)*R*0.62,Math.sin(a)*R*0.62);x.lineTo(Math.cos(a)*R,Math.sin(a)*R);x.stroke();
      }
      return;
    }
    x.fillStyle=fill;
    x.beginPath();x.arc(0,0,R*0.42,0,7);x.fill();
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      x.beginPath();
      x.moveTo(Math.cos(a-0.12)*R*0.55,Math.sin(a-0.12)*R*0.55);
      x.lineTo(Math.cos(a)*R,Math.sin(a)*R);
      x.lineTo(Math.cos(a+0.12)*R*0.55,Math.sin(a+0.12)*R*0.55);
      x.closePath();x.fill();
    }
    return;
  }
  if(kind==='asterisk'){
    const R=Math.min(w,hh)/2;
    x.strokeStyle=fill;x.lineCap='round';x.lineWidth=Math.max(2,R*0.16);
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2;
      x.beginPath();x.moveTo(Math.cos(a)*R*0.18,Math.sin(a)*R*0.18);x.lineTo(Math.cos(a)*R,Math.sin(a)*R);x.stroke();
    }
    return;
  }
  if(style==='outline'){
    x.strokeStyle=fill;x.lineWidth=Math.max(2,Math.min(w,hh)*0.05);
    stickerPath(x,kind,w,hh);x.stroke();
    if(kind==='leaf'){x.beginPath();x.moveTo(0,-hh*0.38);x.lineTo(0,hh*0.38);x.stroke()}
  }else{
    x.fillStyle=fill;
    stickerPath(x,kind,w,hh);x.fill();
  }
}
