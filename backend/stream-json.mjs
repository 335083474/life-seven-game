// Read one top-level JSON string without exposing the surrounding model output.
function readString(raw,start){
  let text='';
  for(let i=start+1;i<raw.length;i++){
    const c=raw[i];if(c==='"')return {text,end:i+1,complete:true};
    if(c==='\\'){
      if(i+1>=raw.length)break;const e=raw[++i];
      if(e==='u'){
        const h=raw.slice(i+1,i+5);if(h.length<4)break;
        if(!/^[0-9a-f]{4}$/i.test(h))return null;
        text+=String.fromCharCode(parseInt(h,16));i+=4;
      }else if('"\\/bfnrt'.includes(e))text+=JSON.parse('"\\'+e+'"');
      else return null;
    }else if(c.charCodeAt(0)<32)return null;else text+=c;
  }
  if(/[\uD800-\uDBFF]$/.test(text))text=text.slice(0,-1);
  return {text,end:raw.length,complete:false};
}
export function prosePrefix(raw,field){
  let depth=0;
  for(let i=0;i<raw.length;i++){
    if(raw[i]==='{'||raw[i]==='[')depth++;
    else if(raw[i]==='}'||raw[i]===']')depth--;
    else if(raw[i]==='"'){
      const token=readString(raw,i);if(!token?.complete)return null;
      let next=token.end;while(next<raw.length&&/\s/.test(raw[next]))next++;
      if(depth===1&&token.text===field&&raw[next]===':'){
        next++;while(next<raw.length&&/\s/.test(raw[next]))next++;
        return raw[next]==='"'?readString(raw,next)?.text??null:null;
      }
      i=token.end-1;
    }
  }
  return null;
}
