export const clamp=(x:number,min=-1,max=1)=>Math.max(min,Math.min(max,x));

export function interpolatePiecewise(x:number,points:[number,number][]){
 if(points.length===0)return null;
 const p=[...points].sort((a,b)=>a[0]-b[0]);
 if(x<=p[0][0])return p[0][1];
 if(x>=p[p.length-1][0])return p[p.length-1][1];
 for(let i=1;i<p.length;i++){
  if(x<=p[i][0]){
   const [x0,y0]=p[i-1],[x1,y1]=p[i];
   const t=(x-x0)/(x1-x0);
   return y0+t*(y1-y0);
  }
 }
 return null;
}

export function rangeDesirability(x:number,optimal:[number,number],soft:[number,number],hard:[number,number]){
 const [o0,o1]=optimal,[s0,s1]=soft,[h0,h1]=hard;
 if(x>=o0&&x<=o1)return 1;
 if(x<h0||x>h1)return -1;
 if(x<o0){
  if(x>=s0)return (x-s0)/(o0-s0);
  return -1+(x-h0)/(s0-h0);
 }
 if(x<=s1)return (s1-x)/(s1-o1);
 return -1+(h1-x)/(h1-s1);
}

export function robustZ(value:number,median:number,mad:number){
 if(!Number.isFinite(mad)||mad<=0)return null;
 return 0.67448975*(value-median)/mad;
}
