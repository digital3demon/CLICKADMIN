(function(){"use strict";/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const ye="srgb",Rn="srgb-linear",yi="linear",Zt="srgb",Ss="300 es";class Pn{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const i=this._listeners;return i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const r=this._listeners[t];if(r!==void 0){const s=r.indexOf(e);s!==-1&&r.splice(s,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const i=this._listeners[t.type];if(i!==void 0){t.target=this;const r=i.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,t);t.target=null}}}const _e=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Es=1234567;const ei=Math.PI/180,ni=180/Math.PI;function Dn(){const n=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(_e[n&255]+_e[n>>8&255]+_e[n>>16&255]+_e[n>>24&255]+"-"+_e[t&255]+_e[t>>8&255]+"-"+_e[t>>16&15|64]+_e[t>>24&255]+"-"+_e[e&63|128]+_e[e>>8&255]+"-"+_e[e>>16&255]+_e[e>>24&255]+_e[i&255]+_e[i>>8&255]+_e[i>>16&255]+_e[i>>24&255]).toLowerCase()}function Bt(n,t,e){return Math.max(t,Math.min(e,n))}function gr(n,t){return(n%t+t)%t}function bc(n,t,e,i,r){return i+(n-t)*(r-i)/(e-t)}function Tc(n,t,e){return n!==t?(e-n)/(t-n):0}function ii(n,t,e){return(1-e)*n+e*t}function wc(n,t,e,i){return ii(n,t,1-Math.exp(-e*i))}function Ac(n,t=1){return t-Math.abs(gr(n,t*2)-t)}function Cc(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*(3-2*n))}function Rc(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*n*(n*(n*6-15)+10))}function Pc(n,t){return n+Math.floor(Math.random()*(t-n+1))}function Dc(n,t){return n+Math.random()*(t-n)}function Lc(n){return n*(.5-Math.random())}function Ic(n){n!==void 0&&(Es=n);let t=Es+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Uc(n){return n*ei}function Fc(n){return n*ni}function Nc(n){return(n&n-1)===0&&n!==0}function Bc(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function Oc(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function kc(n,t,e,i,r){const s=Math.cos,a=Math.sin,o=s(e/2),c=a(e/2),l=s((t+i)/2),h=a((t+i)/2),u=s((t-i)/2),f=a((t-i)/2),m=s((i-t)/2),g=a((i-t)/2);switch(r){case"XYX":n.set(o*h,c*u,c*f,o*l);break;case"YZY":n.set(c*f,o*h,c*u,o*l);break;case"ZXZ":n.set(c*u,c*f,o*h,o*l);break;case"XZX":n.set(o*h,c*g,c*m,o*l);break;case"YXY":n.set(c*m,o*h,c*g,o*l);break;case"ZYZ":n.set(c*g,c*m,o*h,o*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Ln(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function Se(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const ri={DEG2RAD:ei,RAD2DEG:ni,generateUUID:Dn,clamp:Bt,euclideanModulo:gr,mapLinear:bc,inverseLerp:Tc,lerp:ii,damp:wc,pingpong:Ac,smoothstep:Cc,smootherstep:Rc,randInt:Pc,randFloat:Dc,randFloatSpread:Lc,seededRandom:Ic,degToRad:Uc,radToDeg:Fc,isPowerOfTwo:Nc,ceilPowerOfTwo:Bc,floorPowerOfTwo:Oc,setQuaternionFromProperEuler:kc,normalize:Se,denormalize:Ln};class Ot{constructor(t=0,e=0){Ot.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,i=this.y,r=t.elements;return this.x=r[0]*e+r[3]*i+r[6],this.y=r[1]*e+r[4]*i+r[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Bt(this.x,t.x,e.x),this.y=Bt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Bt(this.x,t,e),this.y=Bt(this.y,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Bt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(Bt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const i=Math.cos(e),r=Math.sin(e),s=this.x-t.x,a=this.y-t.y;return this.x=s*i-a*r+t.x,this.y=s*r+a*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Dt{constructor(t,e,i,r,s,a,o,c,l){Dt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,r,s,a,o,c,l)}set(t,e,i,r,s,a,o,c,l){const h=this.elements;return h[0]=t,h[1]=r,h[2]=o,h[3]=e,h[4]=s,h[5]=c,h[6]=i,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,r=e.elements,s=this.elements,a=i[0],o=i[3],c=i[6],l=i[1],h=i[4],u=i[7],f=i[2],m=i[5],g=i[8],_=r[0],p=r[3],d=r[6],b=r[1],y=r[4],E=r[7],L=r[2],w=r[5],R=r[8];return s[0]=a*_+o*b+c*L,s[3]=a*p+o*y+c*w,s[6]=a*d+o*E+c*R,s[1]=l*_+h*b+u*L,s[4]=l*p+h*y+u*w,s[7]=l*d+h*E+u*R,s[2]=f*_+m*b+g*L,s[5]=f*p+m*y+g*w,s[8]=f*d+m*E+g*R,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[1],r=t[2],s=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8];return e*a*h-e*o*l-i*s*h+i*o*c+r*s*l-r*a*c}invert(){const t=this.elements,e=t[0],i=t[1],r=t[2],s=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],u=h*a-o*l,f=o*c-h*s,m=l*s-a*c,g=e*u+i*f+r*m;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return t[0]=u*_,t[1]=(r*l-h*i)*_,t[2]=(o*i-r*a)*_,t[3]=f*_,t[4]=(h*e-r*c)*_,t[5]=(r*s-o*e)*_,t[6]=m*_,t[7]=(i*c-l*e)*_,t[8]=(a*e-i*s)*_,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,r,s,a,o){const c=Math.cos(s),l=Math.sin(s);return this.set(i*c,i*l,-i*(c*a+l*o)+a+t,-r*l,r*c,-r*(-l*a+c*o)+o+e,0,0,1),this}scale(t,e){return this.premultiply(_r.makeScale(t,e)),this}rotate(t){return this.premultiply(_r.makeRotation(-t)),this}translate(t,e){return this.premultiply(_r.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,i=t.elements;for(let r=0;r<9;r++)if(e[r]!==i[r])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const _r=new Dt;function bs(n){for(let t=n.length-1;t>=0;--t)if(n[t]>=65535)return!0;return!1}function Si(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function zc(){const n=Si("canvas");return n.style.display="block",n}const Ts={};function In(n){n in Ts||(Ts[n]=!0,console.warn(n))}function Gc(n,t,e){return new Promise(function(i,r){function s(){switch(n.clientWaitSync(t,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:r();break;case n.TIMEOUT_EXPIRED:setTimeout(s,e);break;default:i()}}setTimeout(s,e)})}function Hc(n){const t=n.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function Vc(n){const t=n.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const ws=new Dt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),As=new Dt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Wc(){const n={enabled:!0,workingColorSpace:Rn,spaces:{},convert:function(r,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===Zt&&(r.r=Ze(r.r),r.g=Ze(r.g),r.b=Ze(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===Zt&&(r.r=Un(r.r),r.g=Un(r.g),r.b=Un(r.b))),r},fromWorkingColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},toWorkingColorSpace:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===""?yi:this.spaces[r].transfer},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[Rn]:{primaries:t,whitePoint:i,transfer:yi,toXYZ:ws,fromXYZ:As,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:ye},outputColorSpaceConfig:{drawingBufferColorSpace:ye}},[ye]:{primaries:t,whitePoint:i,transfer:Zt,toXYZ:ws,fromXYZ:As,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:ye}}}),n}const Xt=Wc();function Ze(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Un(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Fn;class Xc{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{Fn===void 0&&(Fn=Si("canvas")),Fn.width=t.width,Fn.height=t.height;const i=Fn.getContext("2d");t instanceof ImageData?i.putImageData(t,0,0):i.drawImage(t,0,0,t.width,t.height),e=Fn}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Si("canvas");e.width=t.width,e.height=t.height;const i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);const r=i.getImageData(0,0,t.width,t.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=Ze(s[a]/255)*255;return i.putImageData(r,0,0),e}else if(t.data){const e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(Ze(e[i]/255)*255):e[i]=Ze(e[i]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let qc=0;class Cs{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:qc++}),this.uuid=Dn(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(vr(r[a].image)):s.push(vr(r[a]))}else s=vr(r);i.url=s}return e||(t.images[this.uuid]=i),i}}function vr(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Xc.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Yc=0;class ve extends Pn{constructor(t=ve.DEFAULT_IMAGE,e=ve.DEFAULT_MAPPING,i=1001,r=1001,s=1006,a=1008,o=1023,c=1009,l=ve.DEFAULT_ANISOTROPY,h=""){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Yc++}),this.uuid=Dn(),this.name="",this.source=new Cs(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new Ot(0,0),this.repeat=new Ot(1,1),this.center=new Ot(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Dt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==300)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case 1e3:t.x=t.x-Math.floor(t.x);break;case 1001:t.x=t.x<0?0:1;break;case 1002:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case 1e3:t.y=t.y-Math.floor(t.y);break;case 1001:t.y=t.y<0?0:1;break;case 1002:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}ve.DEFAULT_IMAGE=null,ve.DEFAULT_MAPPING=300,ve.DEFAULT_ANISOTROPY=1;class ie{constructor(t=0,e=0,i=0,r=1){ie.prototype.isVector4=!0,this.x=t,this.y=e,this.z=i,this.w=r}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,r){return this.x=t,this.y=e,this.z=i,this.w=r,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,i=this.y,r=this.z,s=this.w,a=t.elements;return this.x=a[0]*e+a[4]*i+a[8]*r+a[12]*s,this.y=a[1]*e+a[5]*i+a[9]*r+a[13]*s,this.z=a[2]*e+a[6]*i+a[10]*r+a[14]*s,this.w=a[3]*e+a[7]*i+a[11]*r+a[15]*s,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,r,s;const c=t.elements,l=c[0],h=c[4],u=c[8],f=c[1],m=c[5],g=c[9],_=c[2],p=c[6],d=c[10];if(Math.abs(h-f)<.01&&Math.abs(u-_)<.01&&Math.abs(g-p)<.01){if(Math.abs(h+f)<.1&&Math.abs(u+_)<.1&&Math.abs(g+p)<.1&&Math.abs(l+m+d-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const y=(l+1)/2,E=(m+1)/2,L=(d+1)/2,w=(h+f)/4,R=(u+_)/4,A=(g+p)/4;return y>E&&y>L?y<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(y),r=w/i,s=R/i):E>L?E<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(E),i=w/r,s=A/r):L<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(L),i=R/s,r=A/s),this.set(i,r,s,e),this}let b=Math.sqrt((p-g)*(p-g)+(u-_)*(u-_)+(f-h)*(f-h));return Math.abs(b)<.001&&(b=1),this.x=(p-g)/b,this.y=(u-_)/b,this.z=(f-h)/b,this.w=Math.acos((l+m+d-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Bt(this.x,t.x,e.x),this.y=Bt(this.y,t.y,e.y),this.z=Bt(this.z,t.z,e.z),this.w=Bt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Bt(this.x,t,e),this.y=Bt(this.y,t,e),this.z=Bt(this.z,t,e),this.w=Bt(this.w,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Bt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class jc extends Pn{constructor(t=1,e=1,i={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new ie(0,0,t,e),this.scissorTest=!1,this.viewport=new ie(0,0,t,e);const r={width:t,height:e,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);const s=new ve(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);s.flipY=!1,s.generateMipmaps=i.generateMipmaps,s.internalFormat=i.internalFormat,this.textures=[];const a=i.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=t,this.textures[r].image.height=e,this.textures[r].image.depth=i;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let i=0,r=t.textures.length;i<r;i++)this.textures[i]=t.textures[i].clone(),this.textures[i].isRenderTargetTexture=!0,this.textures[i].renderTarget=this;const e=Object.assign({},t.texture.image);return this.texture.source=new Cs(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class gn extends jc{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}}class Rs extends ve{constructor(t=null,e=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:r},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class Kc extends ve{constructor(t=null,e=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:r},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class De{constructor(t=0,e=0,i=0,r=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=r}static slerpFlat(t,e,i,r,s,a,o){let c=i[r+0],l=i[r+1],h=i[r+2],u=i[r+3];const f=s[a+0],m=s[a+1],g=s[a+2],_=s[a+3];if(o===0){t[e+0]=c,t[e+1]=l,t[e+2]=h,t[e+3]=u;return}if(o===1){t[e+0]=f,t[e+1]=m,t[e+2]=g,t[e+3]=_;return}if(u!==_||c!==f||l!==m||h!==g){let p=1-o;const d=c*f+l*m+h*g+u*_,b=d>=0?1:-1,y=1-d*d;if(y>Number.EPSILON){const L=Math.sqrt(y),w=Math.atan2(L,d*b);p=Math.sin(p*w)/L,o=Math.sin(o*w)/L}const E=o*b;if(c=c*p+f*E,l=l*p+m*E,h=h*p+g*E,u=u*p+_*E,p===1-o){const L=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=L,l*=L,h*=L,u*=L}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,i,r,s,a){const o=i[r],c=i[r+1],l=i[r+2],h=i[r+3],u=s[a],f=s[a+1],m=s[a+2],g=s[a+3];return t[e]=o*g+h*u+c*m-l*f,t[e+1]=c*g+h*f+l*u-o*m,t[e+2]=l*g+h*m+o*f-c*u,t[e+3]=h*g-o*u-c*f-l*m,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,r){return this._x=t,this._y=e,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const i=t._x,r=t._y,s=t._z,a=t._order,o=Math.cos,c=Math.sin,l=o(i/2),h=o(r/2),u=o(s/2),f=c(i/2),m=c(r/2),g=c(s/2);switch(a){case"XYZ":this._x=f*h*u+l*m*g,this._y=l*m*u-f*h*g,this._z=l*h*g+f*m*u,this._w=l*h*u-f*m*g;break;case"YXZ":this._x=f*h*u+l*m*g,this._y=l*m*u-f*h*g,this._z=l*h*g-f*m*u,this._w=l*h*u+f*m*g;break;case"ZXY":this._x=f*h*u-l*m*g,this._y=l*m*u+f*h*g,this._z=l*h*g+f*m*u,this._w=l*h*u-f*m*g;break;case"ZYX":this._x=f*h*u-l*m*g,this._y=l*m*u+f*h*g,this._z=l*h*g-f*m*u,this._w=l*h*u+f*m*g;break;case"YZX":this._x=f*h*u+l*m*g,this._y=l*m*u+f*h*g,this._z=l*h*g-f*m*u,this._w=l*h*u-f*m*g;break;case"XZY":this._x=f*h*u-l*m*g,this._y=l*m*u-f*h*g,this._z=l*h*g+f*m*u,this._w=l*h*u+f*m*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const i=e/2,r=Math.sin(i);return this._x=t.x*r,this._y=t.y*r,this._z=t.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,i=e[0],r=e[4],s=e[8],a=e[1],o=e[5],c=e[9],l=e[2],h=e[6],u=e[10],f=i+o+u;if(f>0){const m=.5/Math.sqrt(f+1);this._w=.25/m,this._x=(h-c)*m,this._y=(s-l)*m,this._z=(a-r)*m}else if(i>o&&i>u){const m=2*Math.sqrt(1+i-o-u);this._w=(h-c)/m,this._x=.25*m,this._y=(r+a)/m,this._z=(s+l)/m}else if(o>u){const m=2*Math.sqrt(1+o-i-u);this._w=(s-l)/m,this._x=(r+a)/m,this._y=.25*m,this._z=(c+h)/m}else{const m=2*Math.sqrt(1+u-i-o);this._w=(a-r)/m,this._x=(s+l)/m,this._y=(c+h)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<Number.EPSILON?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Bt(this.dot(t),-1,1)))}rotateTowards(t,e){const i=this.angleTo(t);if(i===0)return this;const r=Math.min(1,e/i);return this.slerp(t,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const i=t._x,r=t._y,s=t._z,a=t._w,o=e._x,c=e._y,l=e._z,h=e._w;return this._x=i*h+a*o+r*l-s*c,this._y=r*h+a*c+s*o-i*l,this._z=s*h+a*l+i*c-r*o,this._w=a*h-i*o-r*c-s*l,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const i=this._x,r=this._y,s=this._z,a=this._w;let o=a*t._w+i*t._x+r*t._y+s*t._z;if(o<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,o=-o):this.copy(t),o>=1)return this._w=a,this._x=i,this._y=r,this._z=s,this;const c=1-o*o;if(c<=Number.EPSILON){const m=1-e;return this._w=m*a+e*this._w,this._x=m*i+e*this._x,this._y=m*r+e*this._y,this._z=m*s+e*this._z,this.normalize(),this}const l=Math.sqrt(c),h=Math.atan2(l,o),u=Math.sin((1-e)*h)/l,f=Math.sin(e*h)/l;return this._w=a*u+this._w*f,this._x=i*u+this._x*f,this._y=r*u+this._y*f,this._z=s*u+this._z*f,this._onChangeCallback(),this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(t),r*Math.cos(t),s*Math.sin(e),s*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class P{constructor(t=0,e=0,i=0){P.prototype.isVector3=!0,this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Ps.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Ps.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,i=this.y,r=this.z,s=t.elements;return this.x=s[0]*e+s[3]*i+s[6]*r,this.y=s[1]*e+s[4]*i+s[7]*r,this.z=s[2]*e+s[5]*i+s[8]*r,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,i=this.y,r=this.z,s=t.elements,a=1/(s[3]*e+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*e+s[4]*i+s[8]*r+s[12])*a,this.y=(s[1]*e+s[5]*i+s[9]*r+s[13])*a,this.z=(s[2]*e+s[6]*i+s[10]*r+s[14])*a,this}applyQuaternion(t){const e=this.x,i=this.y,r=this.z,s=t.x,a=t.y,o=t.z,c=t.w,l=2*(a*r-o*i),h=2*(o*e-s*r),u=2*(s*i-a*e);return this.x=e+c*l+a*u-o*h,this.y=i+c*h+o*l-s*u,this.z=r+c*u+s*h-a*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,i=this.y,r=this.z,s=t.elements;return this.x=s[0]*e+s[4]*i+s[8]*r,this.y=s[1]*e+s[5]*i+s[9]*r,this.z=s[2]*e+s[6]*i+s[10]*r,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Bt(this.x,t.x,e.x),this.y=Bt(this.y,t.y,e.y),this.z=Bt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Bt(this.x,t,e),this.y=Bt(this.y,t,e),this.z=Bt(this.z,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Bt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const i=t.x,r=t.y,s=t.z,a=e.x,o=e.y,c=e.z;return this.x=r*c-s*o,this.y=s*a-i*c,this.z=i*o-r*a,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return xr.copy(this).projectOnVector(t),this.sub(xr)}reflect(t){return this.sub(xr.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(Bt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y,r=this.z-t.z;return e*e+i*i+r*r}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){const r=Math.sin(e)*t;return this.x=r*Math.sin(i),this.y=Math.cos(e)*t,this.z=r*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),r=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=r,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const xr=new P,Ps=new De;class Je{constructor(t=new P(1/0,1/0,1/0),e=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(Be.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(Be.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const i=Be.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const i=t.geometry;if(i!==void 0){const s=i.getAttribute("position");if(e===!0&&s!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,Be):Be.fromBufferAttribute(s,a),Be.applyMatrix4(t.matrixWorld),this.expandByPoint(Be);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Ei.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ei.copy(i.boundingBox)),Ei.applyMatrix4(t.matrixWorld),this.union(Ei)}const r=t.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Be),Be.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(si),bi.subVectors(this.max,si),Nn.subVectors(t.a,si),Bn.subVectors(t.b,si),On.subVectors(t.c,si),on.subVectors(Bn,Nn),an.subVectors(On,Bn),_n.subVectors(Nn,On);let e=[0,-on.z,on.y,0,-an.z,an.y,0,-_n.z,_n.y,on.z,0,-on.x,an.z,0,-an.x,_n.z,0,-_n.x,-on.y,on.x,0,-an.y,an.x,0,-_n.y,_n.x,0];return!Mr(e,Nn,Bn,On,bi)||(e=[1,0,0,0,1,0,0,0,1],!Mr(e,Nn,Bn,On,bi))?!1:(Ti.crossVectors(on,an),e=[Ti.x,Ti.y,Ti.z],Mr(e,Nn,Bn,On,bi))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Be).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Be).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Qe[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Qe[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Qe[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Qe[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Qe[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Qe[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Qe[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Qe[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Qe),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const Qe=[new P,new P,new P,new P,new P,new P,new P,new P],Be=new P,Ei=new Je,Nn=new P,Bn=new P,On=new P,on=new P,an=new P,_n=new P,si=new P,bi=new P,Ti=new P,vn=new P;function Mr(n,t,e,i,r){for(let s=0,a=n.length-3;s<=a;s+=3){vn.fromArray(n,s);const o=r.x*Math.abs(vn.x)+r.y*Math.abs(vn.y)+r.z*Math.abs(vn.z),c=t.dot(vn),l=e.dot(vn),h=i.dot(vn);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}const Zc=new Je,oi=new P,yr=new P;class wi{constructor(t=new P,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const i=this.center;e!==void 0?i.copy(e):Zc.setFromPoints(t).getCenter(i);let r=0;for(let s=0,a=t.length;s<a;s++)r=Math.max(r,i.distanceToSquared(t[s]));return this.radius=Math.sqrt(r),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;oi.subVectors(t,this.center);const e=oi.lengthSq();if(e>this.radius*this.radius){const i=Math.sqrt(e),r=(i-this.radius)*.5;this.center.addScaledVector(oi,r/i),this.radius+=r}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(yr.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(oi.copy(t.center).add(yr)),this.expandByPoint(oi.copy(t.center).sub(yr))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const $e=new P,Sr=new P,Ai=new P,cn=new P,Er=new P,Ci=new P,br=new P;class Tr{constructor(t=new P,e=new P(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,$e)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=$e.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):($e.copy(this.origin).addScaledVector(this.direction,e),$e.distanceToSquared(t))}distanceSqToSegment(t,e,i,r){Sr.copy(t).add(e).multiplyScalar(.5),Ai.copy(e).sub(t).normalize(),cn.copy(this.origin).sub(Sr);const s=t.distanceTo(e)*.5,a=-this.direction.dot(Ai),o=cn.dot(this.direction),c=-cn.dot(Ai),l=cn.lengthSq(),h=Math.abs(1-a*a);let u,f,m,g;if(h>0)if(u=a*c-o,f=a*o-c,g=s*h,u>=0)if(f>=-g)if(f<=g){const _=1/h;u*=_,f*=_,m=u*(u+a*f+2*o)+f*(a*u+f+2*c)+l}else f=s,u=Math.max(0,-(a*f+o)),m=-u*u+f*(f+2*c)+l;else f=-s,u=Math.max(0,-(a*f+o)),m=-u*u+f*(f+2*c)+l;else f<=-g?(u=Math.max(0,-(-a*s+o)),f=u>0?-s:Math.min(Math.max(-s,-c),s),m=-u*u+f*(f+2*c)+l):f<=g?(u=0,f=Math.min(Math.max(-s,-c),s),m=f*(f+2*c)+l):(u=Math.max(0,-(a*s+o)),f=u>0?s:Math.min(Math.max(-s,-c),s),m=-u*u+f*(f+2*c)+l);else f=a>0?-s:s,u=Math.max(0,-(a*f+o)),m=-u*u+f*(f+2*c)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(Sr).addScaledVector(Ai,f),m}intersectSphere(t,e){$e.subVectors(t.center,this.origin);const i=$e.dot(this.direction),r=$e.dot($e)-i*i,s=t.radius*t.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=i-a,c=i+a;return c<0?null:o<0?this.at(c,e):this.at(o,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){const i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,r,s,a,o,c;const l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,f=this.origin;return l>=0?(i=(t.min.x-f.x)*l,r=(t.max.x-f.x)*l):(i=(t.max.x-f.x)*l,r=(t.min.x-f.x)*l),h>=0?(s=(t.min.y-f.y)*h,a=(t.max.y-f.y)*h):(s=(t.max.y-f.y)*h,a=(t.min.y-f.y)*h),i>a||s>r||((s>i||isNaN(i))&&(i=s),(a<r||isNaN(r))&&(r=a),u>=0?(o=(t.min.z-f.z)*u,c=(t.max.z-f.z)*u):(o=(t.max.z-f.z)*u,c=(t.min.z-f.z)*u),i>c||o>r)||((o>i||i!==i)&&(i=o),(c<r||r!==r)&&(r=c),r<0)?null:this.at(i>=0?i:r,e)}intersectsBox(t){return this.intersectBox(t,$e)!==null}intersectTriangle(t,e,i,r,s){Er.subVectors(e,t),Ci.subVectors(i,t),br.crossVectors(Er,Ci);let a=this.direction.dot(br),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;cn.subVectors(this.origin,t);const c=o*this.direction.dot(Ci.crossVectors(cn,Ci));if(c<0)return null;const l=o*this.direction.dot(Er.cross(cn));if(l<0||c+l>a)return null;const h=-o*cn.dot(br);return h<0?null:this.at(h/a,s)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Jt{constructor(t,e,i,r,s,a,o,c,l,h,u,f,m,g,_,p){Jt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,r,s,a,o,c,l,h,u,f,m,g,_,p)}set(t,e,i,r,s,a,o,c,l,h,u,f,m,g,_,p){const d=this.elements;return d[0]=t,d[4]=e,d[8]=i,d[12]=r,d[1]=s,d[5]=a,d[9]=o,d[13]=c,d[2]=l,d[6]=h,d[10]=u,d[14]=f,d[3]=m,d[7]=g,d[11]=_,d[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Jt().fromArray(this.elements)}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){const e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,i=t.elements,r=1/kn.setFromMatrixColumn(t,0).length(),s=1/kn.setFromMatrixColumn(t,1).length(),a=1/kn.setFromMatrixColumn(t,2).length();return e[0]=i[0]*r,e[1]=i[1]*r,e[2]=i[2]*r,e[3]=0,e[4]=i[4]*s,e[5]=i[5]*s,e[6]=i[6]*s,e[7]=0,e[8]=i[8]*a,e[9]=i[9]*a,e[10]=i[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,i=t.x,r=t.y,s=t.z,a=Math.cos(i),o=Math.sin(i),c=Math.cos(r),l=Math.sin(r),h=Math.cos(s),u=Math.sin(s);if(t.order==="XYZ"){const f=a*h,m=a*u,g=o*h,_=o*u;e[0]=c*h,e[4]=-c*u,e[8]=l,e[1]=m+g*l,e[5]=f-_*l,e[9]=-o*c,e[2]=_-f*l,e[6]=g+m*l,e[10]=a*c}else if(t.order==="YXZ"){const f=c*h,m=c*u,g=l*h,_=l*u;e[0]=f+_*o,e[4]=g*o-m,e[8]=a*l,e[1]=a*u,e[5]=a*h,e[9]=-o,e[2]=m*o-g,e[6]=_+f*o,e[10]=a*c}else if(t.order==="ZXY"){const f=c*h,m=c*u,g=l*h,_=l*u;e[0]=f-_*o,e[4]=-a*u,e[8]=g+m*o,e[1]=m+g*o,e[5]=a*h,e[9]=_-f*o,e[2]=-a*l,e[6]=o,e[10]=a*c}else if(t.order==="ZYX"){const f=a*h,m=a*u,g=o*h,_=o*u;e[0]=c*h,e[4]=g*l-m,e[8]=f*l+_,e[1]=c*u,e[5]=_*l+f,e[9]=m*l-g,e[2]=-l,e[6]=o*c,e[10]=a*c}else if(t.order==="YZX"){const f=a*c,m=a*l,g=o*c,_=o*l;e[0]=c*h,e[4]=_-f*u,e[8]=g*u+m,e[1]=u,e[5]=a*h,e[9]=-o*h,e[2]=-l*h,e[6]=m*u+g,e[10]=f-_*u}else if(t.order==="XZY"){const f=a*c,m=a*l,g=o*c,_=o*l;e[0]=c*h,e[4]=-u,e[8]=l*h,e[1]=f*u+_,e[5]=a*h,e[9]=m*u-g,e[2]=g*u-m,e[6]=o*h,e[10]=_*u+f}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Jc,t,Qc)}lookAt(t,e,i){const r=this.elements;return Ae.subVectors(t,e),Ae.lengthSq()===0&&(Ae.z=1),Ae.normalize(),ln.crossVectors(i,Ae),ln.lengthSq()===0&&(Math.abs(i.z)===1?Ae.x+=1e-4:Ae.z+=1e-4,Ae.normalize(),ln.crossVectors(i,Ae)),ln.normalize(),Ri.crossVectors(Ae,ln),r[0]=ln.x,r[4]=Ri.x,r[8]=Ae.x,r[1]=ln.y,r[5]=Ri.y,r[9]=Ae.y,r[2]=ln.z,r[6]=Ri.z,r[10]=Ae.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,r=e.elements,s=this.elements,a=i[0],o=i[4],c=i[8],l=i[12],h=i[1],u=i[5],f=i[9],m=i[13],g=i[2],_=i[6],p=i[10],d=i[14],b=i[3],y=i[7],E=i[11],L=i[15],w=r[0],R=r[4],A=r[8],S=r[12],M=r[1],C=r[5],H=r[9],O=r[13],X=r[2],G=r[6],V=r[10],$=r[14],z=r[3],rt=r[7],ut=r[11],j=r[15];return s[0]=a*w+o*M+c*X+l*z,s[4]=a*R+o*C+c*G+l*rt,s[8]=a*A+o*H+c*V+l*ut,s[12]=a*S+o*O+c*$+l*j,s[1]=h*w+u*M+f*X+m*z,s[5]=h*R+u*C+f*G+m*rt,s[9]=h*A+u*H+f*V+m*ut,s[13]=h*S+u*O+f*$+m*j,s[2]=g*w+_*M+p*X+d*z,s[6]=g*R+_*C+p*G+d*rt,s[10]=g*A+_*H+p*V+d*ut,s[14]=g*S+_*O+p*$+d*j,s[3]=b*w+y*M+E*X+L*z,s[7]=b*R+y*C+E*G+L*rt,s[11]=b*A+y*H+E*V+L*ut,s[15]=b*S+y*O+E*$+L*j,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[4],r=t[8],s=t[12],a=t[1],o=t[5],c=t[9],l=t[13],h=t[2],u=t[6],f=t[10],m=t[14],g=t[3],_=t[7],p=t[11],d=t[15];return g*(+s*c*u-r*l*u-s*o*f+i*l*f+r*o*m-i*c*m)+_*(+e*c*m-e*l*f+s*a*f-r*a*m+r*l*h-s*c*h)+p*(+e*l*u-e*o*m-s*a*u+i*a*m+s*o*h-i*l*h)+d*(-r*o*h-e*c*u+e*o*f+r*a*u-i*a*f+i*c*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){const r=this.elements;return t.isVector3?(r[12]=t.x,r[13]=t.y,r[14]=t.z):(r[12]=t,r[13]=e,r[14]=i),this}invert(){const t=this.elements,e=t[0],i=t[1],r=t[2],s=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],u=t[9],f=t[10],m=t[11],g=t[12],_=t[13],p=t[14],d=t[15],b=u*p*l-_*f*l+_*c*m-o*p*m-u*c*d+o*f*d,y=g*f*l-h*p*l-g*c*m+a*p*m+h*c*d-a*f*d,E=h*_*l-g*u*l+g*o*m-a*_*m-h*o*d+a*u*d,L=g*u*c-h*_*c-g*o*f+a*_*f+h*o*p-a*u*p,w=e*b+i*y+r*E+s*L;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const R=1/w;return t[0]=b*R,t[1]=(_*f*s-u*p*s-_*r*m+i*p*m+u*r*d-i*f*d)*R,t[2]=(o*p*s-_*c*s+_*r*l-i*p*l-o*r*d+i*c*d)*R,t[3]=(u*c*s-o*f*s-u*r*l+i*f*l+o*r*m-i*c*m)*R,t[4]=y*R,t[5]=(h*p*s-g*f*s+g*r*m-e*p*m-h*r*d+e*f*d)*R,t[6]=(g*c*s-a*p*s-g*r*l+e*p*l+a*r*d-e*c*d)*R,t[7]=(a*f*s-h*c*s+h*r*l-e*f*l-a*r*m+e*c*m)*R,t[8]=E*R,t[9]=(g*u*s-h*_*s-g*i*m+e*_*m+h*i*d-e*u*d)*R,t[10]=(a*_*s-g*o*s+g*i*l-e*_*l-a*i*d+e*o*d)*R,t[11]=(h*o*s-a*u*s-h*i*l+e*u*l+a*i*m-e*o*m)*R,t[12]=L*R,t[13]=(h*_*r-g*u*r+g*i*f-e*_*f-h*i*p+e*u*p)*R,t[14]=(g*o*r-a*_*r-g*i*c+e*_*c+a*i*p-e*o*p)*R,t[15]=(a*u*r-h*o*r+h*i*c-e*u*c-a*i*f+e*o*f)*R,this}scale(t){const e=this.elements,i=t.x,r=t.y,s=t.z;return e[0]*=i,e[4]*=r,e[8]*=s,e[1]*=i,e[5]*=r,e[9]*=s,e[2]*=i,e[6]*=r,e[10]*=s,e[3]*=i,e[7]*=r,e[11]*=s,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],r=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,r))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const i=Math.cos(e),r=Math.sin(e),s=1-i,a=t.x,o=t.y,c=t.z,l=s*a,h=s*o;return this.set(l*a+i,l*o-r*c,l*c+r*o,0,l*o+r*c,h*o+i,h*c-r*a,0,l*c-r*o,h*c+r*a,s*c*c+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,r,s,a){return this.set(1,i,s,0,t,1,a,0,e,r,1,0,0,0,0,1),this}compose(t,e,i){const r=this.elements,s=e._x,a=e._y,o=e._z,c=e._w,l=s+s,h=a+a,u=o+o,f=s*l,m=s*h,g=s*u,_=a*h,p=a*u,d=o*u,b=c*l,y=c*h,E=c*u,L=i.x,w=i.y,R=i.z;return r[0]=(1-(_+d))*L,r[1]=(m+E)*L,r[2]=(g-y)*L,r[3]=0,r[4]=(m-E)*w,r[5]=(1-(f+d))*w,r[6]=(p+b)*w,r[7]=0,r[8]=(g+y)*R,r[9]=(p-b)*R,r[10]=(1-(f+_))*R,r[11]=0,r[12]=t.x,r[13]=t.y,r[14]=t.z,r[15]=1,this}decompose(t,e,i){const r=this.elements;let s=kn.set(r[0],r[1],r[2]).length();const a=kn.set(r[4],r[5],r[6]).length(),o=kn.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),t.x=r[12],t.y=r[13],t.z=r[14],Oe.copy(this);const l=1/s,h=1/a,u=1/o;return Oe.elements[0]*=l,Oe.elements[1]*=l,Oe.elements[2]*=l,Oe.elements[4]*=h,Oe.elements[5]*=h,Oe.elements[6]*=h,Oe.elements[8]*=u,Oe.elements[9]*=u,Oe.elements[10]*=u,e.setFromRotationMatrix(Oe),i.x=s,i.y=a,i.z=o,this}makePerspective(t,e,i,r,s,a,o=2e3){const c=this.elements,l=2*s/(e-t),h=2*s/(i-r),u=(e+t)/(e-t),f=(i+r)/(i-r);let m,g;if(o===2e3)m=-(a+s)/(a-s),g=-2*a*s/(a-s);else if(o===2001)m=-a/(a-s),g=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=l,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=h,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,i,r,s,a,o=2e3){const c=this.elements,l=1/(e-t),h=1/(i-r),u=1/(a-s),f=(e+t)*l,m=(i+r)*h;let g,_;if(o===2e3)g=(a+s)*u,_=-2*u;else if(o===2001)g=s*u,_=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-f,c[1]=0,c[5]=2*h,c[9]=0,c[13]=-m,c[2]=0,c[6]=0,c[10]=_,c[14]=-g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,i=t.elements;for(let r=0;r<16;r++)if(e[r]!==i[r])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}}const kn=new P,Oe=new Jt,Jc=new P(0,0,0),Qc=new P(1,1,1),ln=new P,Ri=new P,Ae=new P,Ds=new Jt,Ls=new De;class qe{constructor(t=0,e=0,i=0,r=qe.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=r}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,r=this._order){return this._x=t,this._y=e,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){const r=t.elements,s=r[0],a=r[4],o=r[8],c=r[1],l=r[5],h=r[9],u=r[2],f=r[6],m=r[10];switch(e){case"XYZ":this._y=Math.asin(Bt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,m),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(f,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Bt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,m),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,s),this._z=0);break;case"ZXY":this._x=Math.asin(Bt(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-u,m),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-Bt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(f,m),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(Bt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,s)):(this._x=0,this._y=Math.atan2(o,m));break;case"XZY":this._z=Math.asin(-Bt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(f,l),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-h,m),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return Ds.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Ds,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Ls.setFromEuler(this),this.setFromQuaternion(Ls,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}qe.DEFAULT_ORDER="XYZ";class wr{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let $c=0;const Is=new P,zn=new De,tn=new Jt,Pi=new P,ai=new P,tl=new P,el=new De,Us=new P(1,0,0),Fs=new P(0,1,0),Ns=new P(0,0,1),Bs={type:"added"},nl={type:"removed"},Gn={type:"childadded",child:null},Ar={type:"childremoved",child:null};class de extends Pn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:$c++}),this.uuid=Dn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=de.DEFAULT_UP.clone();const t=new P,e=new qe,i=new De,r=new P(1,1,1);function s(){i.setFromEuler(e,!1)}function a(){e.setFromQuaternion(i,void 0,!1)}e._onChange(s),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Jt},normalMatrix:{value:new Dt}}),this.matrix=new Jt,this.matrixWorld=new Jt,this.matrixAutoUpdate=de.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=de.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new wr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return zn.setFromAxisAngle(t,e),this.quaternion.multiply(zn),this}rotateOnWorldAxis(t,e){return zn.setFromAxisAngle(t,e),this.quaternion.premultiply(zn),this}rotateX(t){return this.rotateOnAxis(Us,t)}rotateY(t){return this.rotateOnAxis(Fs,t)}rotateZ(t){return this.rotateOnAxis(Ns,t)}translateOnAxis(t,e){return Is.copy(t).applyQuaternion(this.quaternion),this.position.add(Is.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Us,t)}translateY(t){return this.translateOnAxis(Fs,t)}translateZ(t){return this.translateOnAxis(Ns,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(tn.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?Pi.copy(t):Pi.set(t,e,i);const r=this.parent;this.updateWorldMatrix(!0,!1),ai.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?tn.lookAt(ai,Pi,this.up):tn.lookAt(Pi,ai,this.up),this.quaternion.setFromRotationMatrix(tn),r&&(tn.extractRotation(r.matrixWorld),zn.setFromRotationMatrix(tn),this.quaternion.premultiply(zn.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Bs),Gn.child=t,this.dispatchEvent(Gn),Gn.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(nl),Ar.child=t,this.dispatchEvent(Ar),Ar.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),tn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),tn.multiply(t.parent.matrixWorld)),t.applyMatrix4(tn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Bs),Gn.child=t,this.dispatchEvent(Gn),Gn.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,r=this.children.length;i<r;i++){const a=this.children[i].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ai,t,tl),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ai,el,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let i=0,r=e.length;i<r;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let i=0,r=e.length;i<r;i++)e[i].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let i=0,r=e.length;i<r;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e){const i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(t.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const u=c[l];s(t.shapes,u)}else s(t.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(t.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(s(t.materials,this.material[c]));r.material=o}else r.material=s(t.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];r.animations.push(s(t.animations,c))}}if(e){const o=a(t.geometries),c=a(t.materials),l=a(t.textures),h=a(t.images),u=a(t.shapes),f=a(t.skeletons),m=a(t.animations),g=a(t.nodes);o.length>0&&(i.geometries=o),c.length>0&&(i.materials=c),l.length>0&&(i.textures=l),h.length>0&&(i.images=h),u.length>0&&(i.shapes=u),f.length>0&&(i.skeletons=f),m.length>0&&(i.animations=m),g.length>0&&(i.nodes=g)}return i.object=r,i;function a(o){const c=[];for(const l in o){const h=o[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){const r=t.children[i];this.add(r.clone())}return this}}de.DEFAULT_UP=new P(0,1,0),de.DEFAULT_MATRIX_AUTO_UPDATE=!0,de.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const ke=new P,en=new P,Cr=new P,nn=new P,Hn=new P,Vn=new P,Os=new P,Rr=new P,Pr=new P,Dr=new P,Lr=new ie,Ir=new ie,Ur=new ie;class ze{constructor(t=new P,e=new P,i=new P){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,r){r.subVectors(i,e),ke.subVectors(t,e),r.cross(ke);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(t,e,i,r,s){ke.subVectors(r,e),en.subVectors(i,e),Cr.subVectors(t,e);const a=ke.dot(ke),o=ke.dot(en),c=ke.dot(Cr),l=en.dot(en),h=en.dot(Cr),u=a*l-o*o;if(u===0)return s.set(0,0,0),null;const f=1/u,m=(l*c-o*h)*f,g=(a*h-o*c)*f;return s.set(1-m-g,g,m)}static containsPoint(t,e,i,r){return this.getBarycoord(t,e,i,r,nn)===null?!1:nn.x>=0&&nn.y>=0&&nn.x+nn.y<=1}static getInterpolation(t,e,i,r,s,a,o,c){return this.getBarycoord(t,e,i,r,nn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,nn.x),c.addScaledVector(a,nn.y),c.addScaledVector(o,nn.z),c)}static getInterpolatedAttribute(t,e,i,r,s,a){return Lr.setScalar(0),Ir.setScalar(0),Ur.setScalar(0),Lr.fromBufferAttribute(t,e),Ir.fromBufferAttribute(t,i),Ur.fromBufferAttribute(t,r),a.setScalar(0),a.addScaledVector(Lr,s.x),a.addScaledVector(Ir,s.y),a.addScaledVector(Ur,s.z),a}static isFrontFacing(t,e,i,r){return ke.subVectors(i,e),en.subVectors(t,e),ke.cross(en).dot(r)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,r){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[r]),this}setFromAttributeAndIndices(t,e,i,r){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,r),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return ke.subVectors(this.c,this.b),en.subVectors(this.a,this.b),ke.cross(en).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return ze.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return ze.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,r,s){return ze.getInterpolation(t,this.a,this.b,this.c,e,i,r,s)}containsPoint(t){return ze.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return ze.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const i=this.a,r=this.b,s=this.c;let a,o;Hn.subVectors(r,i),Vn.subVectors(s,i),Rr.subVectors(t,i);const c=Hn.dot(Rr),l=Vn.dot(Rr);if(c<=0&&l<=0)return e.copy(i);Pr.subVectors(t,r);const h=Hn.dot(Pr),u=Vn.dot(Pr);if(h>=0&&u<=h)return e.copy(r);const f=c*u-h*l;if(f<=0&&c>=0&&h<=0)return a=c/(c-h),e.copy(i).addScaledVector(Hn,a);Dr.subVectors(t,s);const m=Hn.dot(Dr),g=Vn.dot(Dr);if(g>=0&&m<=g)return e.copy(s);const _=m*l-c*g;if(_<=0&&l>=0&&g<=0)return o=l/(l-g),e.copy(i).addScaledVector(Vn,o);const p=h*g-m*u;if(p<=0&&u-h>=0&&m-g>=0)return Os.subVectors(s,r),o=(u-h)/(u-h+(m-g)),e.copy(r).addScaledVector(Os,o);const d=1/(p+_+f);return a=_*d,o=f*d,e.copy(i).addScaledVector(Hn,a).addScaledVector(Vn,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const ks={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},hn={h:0,s:0,l:0},Di={h:0,s:0,l:0};function Fr(n,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?n+(t-n)*6*e:e<1/2?t:e<2/3?n+(t-n)*6*(2/3-e):n}class Ft{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){const r=t;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=ye){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Xt.toWorkingColorSpace(this,e),this}setRGB(t,e,i,r=Xt.workingColorSpace){return this.r=t,this.g=e,this.b=i,Xt.toWorkingColorSpace(this,r),this}setHSL(t,e,i,r=Xt.workingColorSpace){if(t=gr(t,1),e=Bt(e,0,1),i=Bt(i,0,1),e===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+e):i+e-i*e,a=2*i-s;this.r=Fr(a,s,t+1/3),this.g=Fr(a,s,t),this.b=Fr(a,s,t-1/3)}return Xt.toWorkingColorSpace(this,r),this}setStyle(t,e=ye){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(t)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,e);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,e);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(t)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(s,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=ye){const i=ks[t.toLowerCase()];return i!==void 0?this.setHex(i,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ze(t.r),this.g=Ze(t.g),this.b=Ze(t.b),this}copyLinearToSRGB(t){return this.r=Un(t.r),this.g=Un(t.g),this.b=Un(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=ye){return Xt.fromWorkingColorSpace(xe.copy(this),t),Math.round(Bt(xe.r*255,0,255))*65536+Math.round(Bt(xe.g*255,0,255))*256+Math.round(Bt(xe.b*255,0,255))}getHexString(t=ye){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Xt.workingColorSpace){Xt.fromWorkingColorSpace(xe.copy(this),e);const i=xe.r,r=xe.g,s=xe.b,a=Math.max(i,r,s),o=Math.min(i,r,s);let c,l;const h=(o+a)/2;if(o===a)c=0,l=0;else{const u=a-o;switch(l=h<=.5?u/(a+o):u/(2-a-o),a){case i:c=(r-s)/u+(r<s?6:0);break;case r:c=(s-i)/u+2;break;case s:c=(i-r)/u+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=Xt.workingColorSpace){return Xt.fromWorkingColorSpace(xe.copy(this),e),t.r=xe.r,t.g=xe.g,t.b=xe.b,t}getStyle(t=ye){Xt.fromWorkingColorSpace(xe.copy(this),t);const e=xe.r,i=xe.g,r=xe.b;return t!==ye?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(t,e,i){return this.getHSL(hn),this.setHSL(hn.h+t,hn.s+e,hn.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(hn),t.getHSL(Di);const i=ii(hn.h,Di.h,e),r=ii(hn.s,Di.s,e),s=ii(hn.l,Di.l,e);return this.setHSL(i,r,s),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,i=this.g,r=this.b,s=t.elements;return this.r=s[0]*e+s[3]*i+s[6]*r,this.g=s[1]*e+s[4]*i+s[7]*r,this.b=s[2]*e+s[5]*i+s[8]*r,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const xe=new Ft;Ft.NAMES=ks;let il=0;class xn extends Pn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:il++}),this.uuid=Dn(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ft(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const i=t[e];if(i===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const r=this[e];if(r===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[e]=i}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(i.blending=this.blending),this.side!==0&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==204&&(i.blendSrc=this.blendSrc),this.blendDst!==205&&(i.blendDst=this.blendDst),this.blendEquation!==100&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==7680&&(i.stencilFail=this.stencilFail),this.stencilZFail!==7680&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==7680&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const a=[];for(const o in s){const c=s[o];delete c.metadata,a.push(c)}return a}if(e){const s=r(t.textures),a=r(t.images);s.length>0&&(i.textures=s),a.length>0&&(i.images=a)}return i}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let i=null;if(e!==null){const r=e.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=e[s].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class ci extends xn{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ft(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qe,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const ae=new P,Li=new Ot;class Qt{constructor(t,e,i=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[t+r]=e.array[i+r];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)Li.fromBufferAttribute(this,e),Li.applyMatrix3(t),this.setXY(e,Li.x,Li.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)ae.fromBufferAttribute(this,e),ae.applyMatrix3(t),this.setXYZ(e,ae.x,ae.y,ae.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)ae.fromBufferAttribute(this,e),ae.applyMatrix4(t),this.setXYZ(e,ae.x,ae.y,ae.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)ae.fromBufferAttribute(this,e),ae.applyNormalMatrix(t),this.setXYZ(e,ae.x,ae.y,ae.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)ae.fromBufferAttribute(this,e),ae.transformDirection(t),this.setXYZ(e,ae.x,ae.y,ae.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=Ln(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=Se(i,this.array)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Ln(e,this.array)),e}setX(t,e){return this.normalized&&(e=Se(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Ln(e,this.array)),e}setY(t,e){return this.normalized&&(e=Se(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Ln(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Se(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Ln(e,this.array)),e}setW(t,e){return this.normalized&&(e=Se(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=Se(e,this.array),i=Se(i,this.array)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,r){return t*=this.itemSize,this.normalized&&(e=Se(e,this.array),i=Se(i,this.array),r=Se(r,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=r,this}setXYZW(t,e,i,r,s){return t*=this.itemSize,this.normalized&&(e=Se(e,this.array),i=Se(i,this.array),r=Se(r,this.array),s=Se(s,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=r,this.array[t+3]=s,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==35044&&(t.usage=this.usage),t}}class zs extends Qt{constructor(t,e,i){super(new Uint16Array(t),e,i)}}class Gs extends Qt{constructor(t,e,i){super(new Uint32Array(t),e,i)}}class Ge extends Qt{constructor(t,e,i){super(new Float32Array(t),e,i)}}let rl=0;const Le=new Jt,Nr=new de,Wn=new P,Ce=new Je,li=new Je,fe=new P;class He extends Pn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:rl++}),this.uuid=Dn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(bs(t)?Gs:zs)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new Dt().getNormalMatrix(t);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(t),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Le.makeRotationFromQuaternion(t),this.applyMatrix4(Le),this}rotateX(t){return Le.makeRotationX(t),this.applyMatrix4(Le),this}rotateY(t){return Le.makeRotationY(t),this.applyMatrix4(Le),this}rotateZ(t){return Le.makeRotationZ(t),this.applyMatrix4(Le),this}translate(t,e,i){return Le.makeTranslation(t,e,i),this.applyMatrix4(Le),this}scale(t,e,i){return Le.makeScale(t,e,i),this.applyMatrix4(Le),this}lookAt(t){return Nr.lookAt(t),Nr.updateMatrix(),this.applyMatrix4(Nr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Wn).negate(),this.translate(Wn.x,Wn.y,Wn.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const i=[];for(let r=0,s=t.length;r<s;r++){const a=t[r];i.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Ge(i,3))}else{const i=Math.min(t.length,e.count);for(let r=0;r<i;r++){const s=t[r];e.setXYZ(r,s.x,s.y,s.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Je);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,r=e.length;i<r;i++){const s=e[i];Ce.setFromBufferAttribute(s),this.morphTargetsRelative?(fe.addVectors(this.boundingBox.min,Ce.min),this.boundingBox.expandByPoint(fe),fe.addVectors(this.boundingBox.max,Ce.max),this.boundingBox.expandByPoint(fe)):(this.boundingBox.expandByPoint(Ce.min),this.boundingBox.expandByPoint(Ce.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new wi);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new P,1/0);return}if(t){const i=this.boundingSphere.center;if(Ce.setFromBufferAttribute(t),e)for(let s=0,a=e.length;s<a;s++){const o=e[s];li.setFromBufferAttribute(o),this.morphTargetsRelative?(fe.addVectors(Ce.min,li.min),Ce.expandByPoint(fe),fe.addVectors(Ce.max,li.max),Ce.expandByPoint(fe)):(Ce.expandByPoint(li.min),Ce.expandByPoint(li.max))}Ce.getCenter(i);let r=0;for(let s=0,a=t.count;s<a;s++)fe.fromBufferAttribute(t,s),r=Math.max(r,i.distanceToSquared(fe));if(e)for(let s=0,a=e.length;s<a;s++){const o=e[s],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)fe.fromBufferAttribute(o,l),c&&(Wn.fromBufferAttribute(t,l),fe.add(Wn)),r=Math.max(r,i.distanceToSquared(fe))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=e.position,r=e.normal,s=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Qt(new Float32Array(4*i.count),4));const a=this.getAttribute("tangent"),o=[],c=[];for(let A=0;A<i.count;A++)o[A]=new P,c[A]=new P;const l=new P,h=new P,u=new P,f=new Ot,m=new Ot,g=new Ot,_=new P,p=new P;function d(A,S,M){l.fromBufferAttribute(i,A),h.fromBufferAttribute(i,S),u.fromBufferAttribute(i,M),f.fromBufferAttribute(s,A),m.fromBufferAttribute(s,S),g.fromBufferAttribute(s,M),h.sub(l),u.sub(l),m.sub(f),g.sub(f);const C=1/(m.x*g.y-g.x*m.y);isFinite(C)&&(_.copy(h).multiplyScalar(g.y).addScaledVector(u,-m.y).multiplyScalar(C),p.copy(u).multiplyScalar(m.x).addScaledVector(h,-g.x).multiplyScalar(C),o[A].add(_),o[S].add(_),o[M].add(_),c[A].add(p),c[S].add(p),c[M].add(p))}let b=this.groups;b.length===0&&(b=[{start:0,count:t.count}]);for(let A=0,S=b.length;A<S;++A){const M=b[A],C=M.start,H=M.count;for(let O=C,X=C+H;O<X;O+=3)d(t.getX(O+0),t.getX(O+1),t.getX(O+2))}const y=new P,E=new P,L=new P,w=new P;function R(A){L.fromBufferAttribute(r,A),w.copy(L);const S=o[A];y.copy(S),y.sub(L.multiplyScalar(L.dot(S))).normalize(),E.crossVectors(w,S);const C=E.dot(c[A])<0?-1:1;a.setXYZW(A,y.x,y.y,y.z,C)}for(let A=0,S=b.length;A<S;++A){const M=b[A],C=M.start,H=M.count;for(let O=C,X=C+H;O<X;O+=3)R(t.getX(O+0)),R(t.getX(O+1)),R(t.getX(O+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Qt(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let f=0,m=i.count;f<m;f++)i.setXYZ(f,0,0,0);const r=new P,s=new P,a=new P,o=new P,c=new P,l=new P,h=new P,u=new P;if(t)for(let f=0,m=t.count;f<m;f+=3){const g=t.getX(f+0),_=t.getX(f+1),p=t.getX(f+2);r.fromBufferAttribute(e,g),s.fromBufferAttribute(e,_),a.fromBufferAttribute(e,p),h.subVectors(a,s),u.subVectors(r,s),h.cross(u),o.fromBufferAttribute(i,g),c.fromBufferAttribute(i,_),l.fromBufferAttribute(i,p),o.add(h),c.add(h),l.add(h),i.setXYZ(g,o.x,o.y,o.z),i.setXYZ(_,c.x,c.y,c.z),i.setXYZ(p,l.x,l.y,l.z)}else for(let f=0,m=e.count;f<m;f+=3)r.fromBufferAttribute(e,f+0),s.fromBufferAttribute(e,f+1),a.fromBufferAttribute(e,f+2),h.subVectors(a,s),u.subVectors(r,s),h.cross(u),i.setXYZ(f+0,h.x,h.y,h.z),i.setXYZ(f+1,h.x,h.y,h.z),i.setXYZ(f+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)fe.fromBufferAttribute(t,e),fe.normalize(),t.setXYZ(e,fe.x,fe.y,fe.z)}toNonIndexed(){function t(o,c){const l=o.array,h=o.itemSize,u=o.normalized,f=new l.constructor(c.length*h);let m=0,g=0;for(let _=0,p=c.length;_<p;_++){o.isInterleavedBufferAttribute?m=c[_]*o.data.stride+o.offset:m=c[_]*h;for(let d=0;d<h;d++)f[g++]=l[m++]}return new Qt(f,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new He,i=this.index.array,r=this.attributes;for(const o in r){const c=r[o],l=t(c,i);e.setAttribute(o,l)}const s=this.morphAttributes;for(const o in s){const c=[],l=s[o];for(let h=0,u=l.length;h<u;h++){const f=l[h],m=t(f,i);c.push(m)}e.morphAttributes[o]=c}e.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,c=a.length;o<c;o++){const l=a[o];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const i=this.attributes;for(const c in i){const l=i[c];t.data.attributes[c]=l.toJSON(t.data)}const r={};let s=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let u=0,f=l.length;u<f;u++){const m=l[u];h.push(m.toJSON(t.data))}h.length>0&&(r[c]=h,s=!0)}s&&(t.data.morphAttributes=r,t.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(t.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const i=t.index;i!==null&&this.setIndex(i.clone(e));const r=t.attributes;for(const l in r){const h=r[l];this.setAttribute(l,h.clone(e))}const s=t.morphAttributes;for(const l in s){const h=[],u=s[l];for(let f=0,m=u.length;f<m;f++)h.push(u[f].clone(e));this.morphAttributes[l]=h}this.morphTargetsRelative=t.morphTargetsRelative;const a=t.groups;for(let l=0,h=a.length;l<h;l++){const u=a[l];this.addGroup(u.start,u.count,u.materialIndex)}const o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Hs=new Jt,Mn=new Tr,Ii=new wi,Vs=new P,Ui=new P,Fi=new P,Ni=new P,Br=new P,Bi=new P,Ws=new P,Oi=new P;class Re extends de{constructor(t=new He,e=new ci){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const r=e[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(t,e){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,a=i.morphTargetsRelative;e.fromBufferAttribute(r,t);const o=this.morphTargetInfluences;if(s&&o){Bi.set(0,0,0);for(let c=0,l=s.length;c<l;c++){const h=o[c],u=s[c];h!==0&&(Br.fromBufferAttribute(u,t),a?Bi.addScaledVector(Br,h):Bi.addScaledVector(Br.sub(e),h))}e.add(Bi)}return e}raycast(t,e){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Ii.copy(i.boundingSphere),Ii.applyMatrix4(s),Mn.copy(t.ray).recast(t.near),!(Ii.containsPoint(Mn.origin)===!1&&(Mn.intersectSphere(Ii,Vs)===null||Mn.origin.distanceToSquared(Vs)>(t.far-t.near)**2))&&(Hs.copy(s).invert(),Mn.copy(t.ray).applyMatrix4(Hs),!(i.boundingBox!==null&&Mn.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,Mn)))}_computeIntersections(t,e,i){let r;const s=this.geometry,a=this.material,o=s.index,c=s.attributes.position,l=s.attributes.uv,h=s.attributes.uv1,u=s.attributes.normal,f=s.groups,m=s.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,_=f.length;g<_;g++){const p=f[g],d=a[p.materialIndex],b=Math.max(p.start,m.start),y=Math.min(o.count,Math.min(p.start+p.count,m.start+m.count));for(let E=b,L=y;E<L;E+=3){const w=o.getX(E),R=o.getX(E+1),A=o.getX(E+2);r=ki(this,d,t,i,l,h,u,w,R,A),r&&(r.faceIndex=Math.floor(E/3),r.face.materialIndex=p.materialIndex,e.push(r))}}else{const g=Math.max(0,m.start),_=Math.min(o.count,m.start+m.count);for(let p=g,d=_;p<d;p+=3){const b=o.getX(p),y=o.getX(p+1),E=o.getX(p+2);r=ki(this,a,t,i,l,h,u,b,y,E),r&&(r.faceIndex=Math.floor(p/3),e.push(r))}}else if(c!==void 0)if(Array.isArray(a))for(let g=0,_=f.length;g<_;g++){const p=f[g],d=a[p.materialIndex],b=Math.max(p.start,m.start),y=Math.min(c.count,Math.min(p.start+p.count,m.start+m.count));for(let E=b,L=y;E<L;E+=3){const w=E,R=E+1,A=E+2;r=ki(this,d,t,i,l,h,u,w,R,A),r&&(r.faceIndex=Math.floor(E/3),r.face.materialIndex=p.materialIndex,e.push(r))}}else{const g=Math.max(0,m.start),_=Math.min(c.count,m.start+m.count);for(let p=g,d=_;p<d;p+=3){const b=p,y=p+1,E=p+2;r=ki(this,a,t,i,l,h,u,b,y,E),r&&(r.faceIndex=Math.floor(p/3),e.push(r))}}}}function sl(n,t,e,i,r,s,a,o){let c;if(t.side===1?c=i.intersectTriangle(a,s,r,!0,o):c=i.intersectTriangle(r,s,a,t.side===0,o),c===null)return null;Oi.copy(o),Oi.applyMatrix4(n.matrixWorld);const l=e.ray.origin.distanceTo(Oi);return l<e.near||l>e.far?null:{distance:l,point:Oi.clone(),object:n}}function ki(n,t,e,i,r,s,a,o,c,l){n.getVertexPosition(o,Ui),n.getVertexPosition(c,Fi),n.getVertexPosition(l,Ni);const h=sl(n,t,e,i,Ui,Fi,Ni,Ws);if(h){const u=new P;ze.getBarycoord(Ws,Ui,Fi,Ni,u),r&&(h.uv=ze.getInterpolatedAttribute(r,o,c,l,u,new Ot)),s&&(h.uv1=ze.getInterpolatedAttribute(s,o,c,l,u,new Ot)),a&&(h.normal=ze.getInterpolatedAttribute(a,o,c,l,u,new P),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));const f={a:o,b:c,c:l,normal:new P,materialIndex:0};ze.getNormal(Ui,Fi,Ni,f.normal),h.face=f,h.barycoord=u}return h}class hi extends He{constructor(t=1,e=1,i=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const c=[],l=[],h=[],u=[];let f=0,m=0;g("z","y","x",-1,-1,i,e,t,a,s,0),g("z","y","x",1,-1,i,e,-t,a,s,1),g("x","z","y",1,1,t,i,e,r,a,2),g("x","z","y",1,-1,t,i,-e,r,a,3),g("x","y","z",1,-1,t,e,i,r,s,4),g("x","y","z",-1,-1,t,e,-i,r,s,5),this.setIndex(c),this.setAttribute("position",new Ge(l,3)),this.setAttribute("normal",new Ge(h,3)),this.setAttribute("uv",new Ge(u,2));function g(_,p,d,b,y,E,L,w,R,A,S){const M=E/R,C=L/A,H=E/2,O=L/2,X=w/2,G=R+1,V=A+1;let $=0,z=0;const rt=new P;for(let ut=0;ut<V;ut++){const j=ut*C-O;for(let dt=0;dt<G;dt++){const Mt=dt*M-H;rt[_]=Mt*b,rt[p]=j*y,rt[d]=X,l.push(rt.x,rt.y,rt.z),rt[_]=0,rt[p]=0,rt[d]=w>0?1:-1,h.push(rt.x,rt.y,rt.z),u.push(dt/R),u.push(1-ut/A),$+=1}}for(let ut=0;ut<A;ut++)for(let j=0;j<R;j++){const dt=f+j+G*ut,Mt=f+j+G*(ut+1),q=f+(j+1)+G*(ut+1),et=f+(j+1)+G*ut;c.push(dt,Mt,et),c.push(Mt,q,et),z+=6}o.addGroup(m,z,S),m+=z,f+=$}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new hi(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function Xn(n){const t={};for(const e in n){t[e]={};for(const i in n[e]){const r=n[e][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=r.clone():Array.isArray(r)?t[e][i]=r.slice():t[e][i]=r}}return t}function Ee(n){const t={};for(let e=0;e<n.length;e++){const i=Xn(n[e]);for(const r in i)t[r]=i[r]}return t}function ol(n){const t=[];for(let e=0;e<n.length;e++)t.push(n[e].clone());return t}function Xs(n){const t=n.getRenderTarget();return t===null?n.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Xt.workingColorSpace}const al={clone:Xn,merge:Ee};var cl=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,ll=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class un extends xn{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=cl,this.fragmentShader=ll,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Xn(t.uniforms),this.uniformsGroups=ol(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?e.uniforms[r]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[r]={type:"m4",value:a.toArray()}:e.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}}class qs extends de{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Jt,this.projectionMatrix=new Jt,this.projectionMatrixInverse=new Jt,this.coordinateSystem=2e3}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const dn=new P,Ys=new Ot,js=new Ot;class Ve extends qs{constructor(t=50,e=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=ni*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(ei*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return ni*2*Math.atan(Math.tan(ei*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){dn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(dn.x,dn.y).multiplyScalar(-t/dn.z),dn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(dn.x,dn.y).multiplyScalar(-t/dn.z)}getViewSize(t,e){return this.getViewBounds(t,Ys,js),e.subVectors(js,Ys)}setViewOffset(t,e,i,r,s,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(ei*.5*this.fov)/this.zoom,i=2*e,r=this.aspect*i,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const c=a.fullWidth,l=a.fullHeight;s+=a.offsetX*r/c,e-=a.offsetY*i/l,r*=a.width/c,i*=a.height/l}const o=this.filmOffset;o!==0&&(s+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,e,e-i,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const qn=-90,Yn=1;class hl extends de{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Ve(qn,Yn,t,e);r.layers=this.layers,this.add(r);const s=new Ve(qn,Yn,t,e);s.layers=this.layers,this.add(s);const a=new Ve(qn,Yn,t,e);a.layers=this.layers,this.add(a);const o=new Ve(qn,Yn,t,e);o.layers=this.layers,this.add(o);const c=new Ve(qn,Yn,t,e);c.layers=this.layers,this.add(c);const l=new Ve(qn,Yn,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[i,r,s,a,o,c]=e;for(const l of e)this.remove(l);if(t===2e3)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===2001)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,c,l,h]=this.children,u=t.getRenderTarget(),f=t.getActiveCubeFace(),m=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const _=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,t.setRenderTarget(i,0,r),t.render(e,s),t.setRenderTarget(i,1,r),t.render(e,a),t.setRenderTarget(i,2,r),t.render(e,o),t.setRenderTarget(i,3,r),t.render(e,c),t.setRenderTarget(i,4,r),t.render(e,l),i.texture.generateMipmaps=_,t.setRenderTarget(i,5,r),t.render(e,h),t.setRenderTarget(u,f,m),t.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class Ks extends ve{constructor(t,e,i,r,s,a,o,c,l,h){t=t!==void 0?t:[],e=e!==void 0?e:301,super(t,e,i,r,s,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class ul extends gn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const i={width:t,height:t,depth:1},r=[i,i,i,i,i,i];this.texture=new Ks(r,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:1006}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new hi(5,5,5),s=new un({name:"CubemapFromEquirect",uniforms:Xn(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:1,blending:0});s.uniforms.tEquirect.value=e;const a=new Re(r,s),o=e.minFilter;return e.minFilter===1008&&(e.minFilter=1006),new hl(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e,i,r){const s=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,i,r);t.setRenderTarget(s)}}class dl extends de{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new qe,this.environmentIntensity=1,this.environmentRotation=new qe,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class fl extends ve{constructor(t=null,e=1,i=1,r,s,a,o,c,l=1003,h=1003,u,f){super(null,a,o,c,l,h,r,s,u,f),this.isDataTexture=!0,this.image={data:t,width:e,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Or=new P,pl=new P,ml=new Dt;class fn{constructor(t=new P(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,r){return this.normal.set(t,e,i),this.constant=r,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){const r=Or.subVectors(i,e).cross(pl.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(r,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const i=t.delta(Or),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const s=-(t.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:e.copy(t.start).addScaledVector(i,s)}intersectsLine(t){const e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const i=e||ml.getNormalMatrix(t),r=this.coplanarPoint(Or).applyMatrix4(t),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const yn=new wi,zi=new P;class kr{constructor(t=new fn,e=new fn,i=new fn,r=new fn,s=new fn,a=new fn){this.planes=[t,e,i,r,s,a]}set(t,e,i,r,s,a){const o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(i),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(t){const e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=2e3){const i=this.planes,r=t.elements,s=r[0],a=r[1],o=r[2],c=r[3],l=r[4],h=r[5],u=r[6],f=r[7],m=r[8],g=r[9],_=r[10],p=r[11],d=r[12],b=r[13],y=r[14],E=r[15];if(i[0].setComponents(c-s,f-l,p-m,E-d).normalize(),i[1].setComponents(c+s,f+l,p+m,E+d).normalize(),i[2].setComponents(c+a,f+h,p+g,E+b).normalize(),i[3].setComponents(c-a,f-h,p-g,E-b).normalize(),i[4].setComponents(c-o,f-u,p-_,E-y).normalize(),e===2e3)i[5].setComponents(c+o,f+u,p+_,E+y).normalize();else if(e===2001)i[5].setComponents(o,u,_,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),yn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),yn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(yn)}intersectsSprite(t){return yn.center.set(0,0,0),yn.radius=.7071067811865476,yn.applyMatrix4(t.matrixWorld),this.intersectsSphere(yn)}intersectsSphere(t){const e=this.planes,i=t.center,r=-t.radius;for(let s=0;s<6;s++)if(e[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(t){const e=this.planes;for(let i=0;i<6;i++){const r=e[i];if(zi.x=r.normal.x>0?t.max.x:t.min.x,zi.y=r.normal.y>0?t.max.y:t.min.y,zi.z=r.normal.z>0?t.max.z:t.min.z,r.distanceToPoint(zi)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Zs extends xn{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ft(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}const Gi=new P,Hi=new P,Js=new Jt,ui=new Tr,Vi=new wi,zr=new P,Qs=new P;class gl extends de{constructor(t=new He,e=new Zs){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,i=[0];for(let r=1,s=e.count;r<s;r++)Gi.fromBufferAttribute(e,r-1),Hi.fromBufferAttribute(e,r),i[r]=i[r-1],i[r]+=Gi.distanceTo(Hi);t.setAttribute("lineDistance",new Ge(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,e){const i=this.geometry,r=this.matrixWorld,s=t.params.Line.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Vi.copy(i.boundingSphere),Vi.applyMatrix4(r),Vi.radius+=s,t.ray.intersectsSphere(Vi)===!1)return;Js.copy(r).invert(),ui.copy(t.ray).applyMatrix4(Js);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,h=i.index,f=i.attributes.position;if(h!==null){const m=Math.max(0,a.start),g=Math.min(h.count,a.start+a.count);for(let _=m,p=g-1;_<p;_+=l){const d=h.getX(_),b=h.getX(_+1),y=Wi(this,t,ui,c,d,b);y&&e.push(y)}if(this.isLineLoop){const _=h.getX(g-1),p=h.getX(m),d=Wi(this,t,ui,c,_,p);d&&e.push(d)}}else{const m=Math.max(0,a.start),g=Math.min(f.count,a.start+a.count);for(let _=m,p=g-1;_<p;_+=l){const d=Wi(this,t,ui,c,_,_+1);d&&e.push(d)}if(this.isLineLoop){const _=Wi(this,t,ui,c,g-1,m);_&&e.push(_)}}}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const r=e[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}function Wi(n,t,e,i,r,s){const a=n.geometry.attributes.position;if(Gi.fromBufferAttribute(a,r),Hi.fromBufferAttribute(a,s),e.distanceSqToSegment(Gi,Hi,zr,Qs)>i)return;zr.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(zr);if(!(c<t.near||c>t.far))return{distance:c,point:Qs.clone().applyMatrix4(n.matrixWorld),index:r,face:null,faceIndex:null,barycoord:null,object:n}}class Ie extends de{constructor(){super(),this.isGroup=!0,this.type="Group"}}class $s extends ve{constructor(t,e,i,r,s,a,o,c,l,h=1026){if(h!==1026&&h!==1027)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&h===1026&&(i=1014),i===void 0&&h===1027&&(i=1020),super(null,r,s,a,o,c,h,i,l),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=o!==void 0?o:1003,this.minFilter=c!==void 0?c:1003,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}class Xi extends He{constructor(t=1,e=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:r};const s=t/2,a=e/2,o=Math.floor(i),c=Math.floor(r),l=o+1,h=c+1,u=t/o,f=e/c,m=[],g=[],_=[],p=[];for(let d=0;d<h;d++){const b=d*f-a;for(let y=0;y<l;y++){const E=y*u-s;g.push(E,-b,0),_.push(0,0,1),p.push(y/o),p.push(1-d/c)}}for(let d=0;d<c;d++)for(let b=0;b<o;b++){const y=b+l*d,E=b+l*(d+1),L=b+1+l*(d+1),w=b+1+l*d;m.push(y,E,w),m.push(E,L,w)}this.setIndex(m),this.setAttribute("position",new Ge(g,3)),this.setAttribute("normal",new Ge(_,3)),this.setAttribute("uv",new Ge(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Xi(t.width,t.height,t.widthSegments,t.heightSegments)}}class qi extends He{constructor(t=1,e=32,i=16,r=0,s=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:i,phiStart:r,phiLength:s,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),i=Math.max(2,Math.floor(i));const c=Math.min(a+o,Math.PI);let l=0;const h=[],u=new P,f=new P,m=[],g=[],_=[],p=[];for(let d=0;d<=i;d++){const b=[],y=d/i;let E=0;d===0&&a===0?E=.5/e:d===i&&c===Math.PI&&(E=-.5/e);for(let L=0;L<=e;L++){const w=L/e;u.x=-t*Math.cos(r+w*s)*Math.sin(a+y*o),u.y=t*Math.cos(a+y*o),u.z=t*Math.sin(r+w*s)*Math.sin(a+y*o),g.push(u.x,u.y,u.z),f.copy(u).normalize(),_.push(f.x,f.y,f.z),p.push(w+E,1-y),b.push(l++)}h.push(b)}for(let d=0;d<i;d++)for(let b=0;b<e;b++){const y=h[d][b+1],E=h[d][b],L=h[d+1][b],w=h[d+1][b+1];(d!==0||a>0)&&m.push(y,E,w),(d!==i-1||c<Math.PI)&&m.push(E,L,w)}this.setIndex(m),this.setAttribute("position",new Ge(g,3)),this.setAttribute("normal",new Ge(_,3)),this.setAttribute("uv",new Ge(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new qi(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class Gr extends xn{constructor(t){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new Ft(16777215),this.specular=new Ft(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ft(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new Ot(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qe,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.specular.copy(t.specular),this.shininess=t.shininess,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class _l extends xn{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class vl extends xn{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class Hr extends de{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Ft(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}class xl extends Hr{constructor(t,e,i){super(t,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(de.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ft(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}}const Vr=new Jt,to=new P,eo=new P;class Ml{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ot(512,512),this.map=null,this.mapPass=null,this.matrix=new Jt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new kr,this._frameExtents=new Ot(1,1),this._viewportCount=1,this._viewports=[new ie(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,i=this.matrix;to.setFromMatrixPosition(t.matrixWorld),e.position.copy(to),eo.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(eo),e.updateMatrixWorld(),Vr.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Vr),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Vr)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class di extends qs{constructor(t=-1,e=1,i=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-t,a=i+t,o=r+e,c=r-e;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,a=s+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class yl extends Ml{constructor(){super(new di(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class no extends Hr{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(de.DEFAULT_UP),this.updateMatrix(),this.target=new de,this.shadow=new yl}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}class Sl extends Hr{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}}class El extends Ve{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}const io=new Jt;class ro{constructor(t,e,i=0,r=1/0){this.ray=new Tr(t,e),this.near=i,this.far=r,this.camera=null,this.layers=new wr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,(e.near+e.far)/(e.near-e.far)).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):console.error("THREE.Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return io.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(io),this}intersectObject(t,e=!0,i=[]){return Wr(t,this,i,e),i.sort(so),i}intersectObjects(t,e=!0,i=[]){for(let r=0,s=t.length;r<s;r++)Wr(t[r],this,i,e);return i.sort(so),i}}function so(n,t){return n.distance-t.distance}function Wr(n,t,e,i){let r=!0;if(n.layers.test(t.layers)&&n.raycast(t,e)===!1&&(r=!1),r===!0&&i===!0){const s=n.children;for(let a=0,o=s.length;a<o;a++)Wr(s[a],t,e,!0)}}function oo(n,t,e,i){const r=bl(i);switch(e){case 1021:return n*t;case 1024:return n*t;case 1025:return n*t*2;case 1028:return n*t/r.components*r.byteLength;case 1029:return n*t/r.components*r.byteLength;case 1030:return n*t*2/r.components*r.byteLength;case 1031:return n*t*2/r.components*r.byteLength;case 1022:return n*t*3/r.components*r.byteLength;case 1023:return n*t*4/r.components*r.byteLength;case 1033:return n*t*4/r.components*r.byteLength;case 33776:case 33777:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case 33778:case 33779:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case 35841:case 35843:return Math.max(n,16)*Math.max(t,8)/4;case 35840:case 35842:return Math.max(n,8)*Math.max(t,8)/2;case 36196:case 37492:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case 37496:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case 37808:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case 37809:return Math.floor((n+4)/5)*Math.floor((t+3)/4)*16;case 37810:return Math.floor((n+4)/5)*Math.floor((t+4)/5)*16;case 37811:return Math.floor((n+5)/6)*Math.floor((t+4)/5)*16;case 37812:return Math.floor((n+5)/6)*Math.floor((t+5)/6)*16;case 37813:return Math.floor((n+7)/8)*Math.floor((t+4)/5)*16;case 37814:return Math.floor((n+7)/8)*Math.floor((t+5)/6)*16;case 37815:return Math.floor((n+7)/8)*Math.floor((t+7)/8)*16;case 37816:return Math.floor((n+9)/10)*Math.floor((t+4)/5)*16;case 37817:return Math.floor((n+9)/10)*Math.floor((t+5)/6)*16;case 37818:return Math.floor((n+9)/10)*Math.floor((t+7)/8)*16;case 37819:return Math.floor((n+9)/10)*Math.floor((t+9)/10)*16;case 37820:return Math.floor((n+11)/12)*Math.floor((t+9)/10)*16;case 37821:return Math.floor((n+11)/12)*Math.floor((t+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(n/4)*Math.ceil(t/4)*16;case 36283:case 36284:return Math.ceil(n/4)*Math.ceil(t/4)*8;case 36285:case 36286:return Math.ceil(n/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function bl(n){switch(n){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"172"}})),typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="172");/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function ao(){let n=null,t=!1,e=null,i=null;function r(s,a){e(s,a),i=n.requestAnimationFrame(r)}return{start:function(){t!==!0&&e!==null&&(i=n.requestAnimationFrame(r),t=!0)},stop:function(){n.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(s){e=s},setContext:function(s){n=s}}}function Tl(n){const t=new WeakMap;function e(o,c){const l=o.array,h=o.usage,u=l.byteLength,f=n.createBuffer();n.bindBuffer(c,f),n.bufferData(c,l,h),o.onUploadCallback();let m;if(l instanceof Float32Array)m=n.FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?m=n.HALF_FLOAT:m=n.UNSIGNED_SHORT;else if(l instanceof Int16Array)m=n.SHORT;else if(l instanceof Uint32Array)m=n.UNSIGNED_INT;else if(l instanceof Int32Array)m=n.INT;else if(l instanceof Int8Array)m=n.BYTE;else if(l instanceof Uint8Array)m=n.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)m=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:f,type:m,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:u}}function i(o,c,l){const h=c.array,u=c.updateRanges;if(n.bindBuffer(l,o),u.length===0)n.bufferSubData(l,0,h);else{u.sort((m,g)=>m.start-g.start);let f=0;for(let m=1;m<u.length;m++){const g=u[f],_=u[m];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++f,u[f]=_)}u.length=f+1;for(let m=0,g=u.length;m<g;m++){const _=u[m];n.bufferSubData(l,_.start*h.BYTES_PER_ELEMENT,h,_.start,_.count)}c.clearUpdateRanges()}c.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);const c=t.get(o);c&&(n.deleteBuffer(c.buffer),t.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const l=t.get(o);if(l===void 0)t.set(o,e(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(l.buffer,o,c),l.version=o.version}}return{get:r,remove:s,update:a}}var wl=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Al=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Cl=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Rl=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Pl=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Dl=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Ll=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Il=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Ul=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Fl=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Nl=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Bl=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Ol=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,kl=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,zl=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Gl=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Hl=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Vl=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Wl=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Xl=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,ql=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Yl=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,jl=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Kl=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Zl=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Jl=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Ql=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,$l=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,th=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,eh=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,nh="gl_FragColor = linearToOutputTexel( gl_FragColor );",ih=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,rh=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,sh=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,oh=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,ah=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ch=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,lh=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,hh=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,uh=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,dh=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,fh=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,ph=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,mh=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,gh=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,_h=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,vh=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,xh=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Mh=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,yh=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Sh=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Eh=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,bh=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Th=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,wh=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Ah=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ch=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Rh=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ph=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Dh=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Lh=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Ih=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Uh=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Fh=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Nh=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Bh=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Oh=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,kh=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,zh=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Gh=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Hh=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Vh=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Wh=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Xh=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,qh=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Yh=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,jh=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Kh=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Zh=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Jh=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Qh=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,$h=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,tu=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,eu=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,nu=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,iu=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,ru=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,su=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,ou=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,au=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,cu=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,lu=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,hu=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,uu=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,du=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,fu=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,pu=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,mu=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,gu=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,_u=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,vu=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,xu=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Mu=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,yu=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Su=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Eu=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,bu=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const It={alphahash_fragment:wl,alphahash_pars_fragment:Al,alphamap_fragment:Cl,alphamap_pars_fragment:Rl,alphatest_fragment:Pl,alphatest_pars_fragment:Dl,aomap_fragment:Ll,aomap_pars_fragment:Il,batching_pars_vertex:Ul,batching_vertex:Fl,begin_vertex:Nl,beginnormal_vertex:Bl,bsdfs:Ol,iridescence_fragment:kl,bumpmap_pars_fragment:zl,clipping_planes_fragment:Gl,clipping_planes_pars_fragment:Hl,clipping_planes_pars_vertex:Vl,clipping_planes_vertex:Wl,color_fragment:Xl,color_pars_fragment:ql,color_pars_vertex:Yl,color_vertex:jl,common:Kl,cube_uv_reflection_fragment:Zl,defaultnormal_vertex:Jl,displacementmap_pars_vertex:Ql,displacementmap_vertex:$l,emissivemap_fragment:th,emissivemap_pars_fragment:eh,colorspace_fragment:nh,colorspace_pars_fragment:ih,envmap_fragment:rh,envmap_common_pars_fragment:sh,envmap_pars_fragment:oh,envmap_pars_vertex:ah,envmap_physical_pars_fragment:vh,envmap_vertex:ch,fog_vertex:lh,fog_pars_vertex:hh,fog_fragment:uh,fog_pars_fragment:dh,gradientmap_pars_fragment:fh,lightmap_pars_fragment:ph,lights_lambert_fragment:mh,lights_lambert_pars_fragment:gh,lights_pars_begin:_h,lights_toon_fragment:xh,lights_toon_pars_fragment:Mh,lights_phong_fragment:yh,lights_phong_pars_fragment:Sh,lights_physical_fragment:Eh,lights_physical_pars_fragment:bh,lights_fragment_begin:Th,lights_fragment_maps:wh,lights_fragment_end:Ah,logdepthbuf_fragment:Ch,logdepthbuf_pars_fragment:Rh,logdepthbuf_pars_vertex:Ph,logdepthbuf_vertex:Dh,map_fragment:Lh,map_pars_fragment:Ih,map_particle_fragment:Uh,map_particle_pars_fragment:Fh,metalnessmap_fragment:Nh,metalnessmap_pars_fragment:Bh,morphinstance_vertex:Oh,morphcolor_vertex:kh,morphnormal_vertex:zh,morphtarget_pars_vertex:Gh,morphtarget_vertex:Hh,normal_fragment_begin:Vh,normal_fragment_maps:Wh,normal_pars_fragment:Xh,normal_pars_vertex:qh,normal_vertex:Yh,normalmap_pars_fragment:jh,clearcoat_normal_fragment_begin:Kh,clearcoat_normal_fragment_maps:Zh,clearcoat_pars_fragment:Jh,iridescence_pars_fragment:Qh,opaque_fragment:$h,packing:tu,premultiplied_alpha_fragment:eu,project_vertex:nu,dithering_fragment:iu,dithering_pars_fragment:ru,roughnessmap_fragment:su,roughnessmap_pars_fragment:ou,shadowmap_pars_fragment:au,shadowmap_pars_vertex:cu,shadowmap_vertex:lu,shadowmask_pars_fragment:hu,skinbase_vertex:uu,skinning_pars_vertex:du,skinning_vertex:fu,skinnormal_vertex:pu,specularmap_fragment:mu,specularmap_pars_fragment:gu,tonemapping_fragment:_u,tonemapping_pars_fragment:vu,transmission_fragment:xu,transmission_pars_fragment:Mu,uv_pars_fragment:yu,uv_pars_vertex:Su,uv_vertex:Eu,worldpos_vertex:bu,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distanceRGBA_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distanceRGBA_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},it={common:{diffuse:{value:new Ft(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Dt},alphaMap:{value:null},alphaMapTransform:{value:new Dt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Dt}},envmap:{envMap:{value:null},envMapRotation:{value:new Dt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Dt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Dt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Dt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Dt},normalScale:{value:new Ot(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Dt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Dt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Dt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Dt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ft(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ft(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Dt},alphaTest:{value:0},uvTransform:{value:new Dt}},sprite:{diffuse:{value:new Ft(16777215)},opacity:{value:1},center:{value:new Ot(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Dt},alphaMap:{value:null},alphaMapTransform:{value:new Dt},alphaTest:{value:0}}},Ye={basic:{uniforms:Ee([it.common,it.specularmap,it.envmap,it.aomap,it.lightmap,it.fog]),vertexShader:It.meshbasic_vert,fragmentShader:It.meshbasic_frag},lambert:{uniforms:Ee([it.common,it.specularmap,it.envmap,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.fog,it.lights,{emissive:{value:new Ft(0)}}]),vertexShader:It.meshlambert_vert,fragmentShader:It.meshlambert_frag},phong:{uniforms:Ee([it.common,it.specularmap,it.envmap,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.fog,it.lights,{emissive:{value:new Ft(0)},specular:{value:new Ft(1118481)},shininess:{value:30}}]),vertexShader:It.meshphong_vert,fragmentShader:It.meshphong_frag},standard:{uniforms:Ee([it.common,it.envmap,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.roughnessmap,it.metalnessmap,it.fog,it.lights,{emissive:{value:new Ft(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:It.meshphysical_vert,fragmentShader:It.meshphysical_frag},toon:{uniforms:Ee([it.common,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.gradientmap,it.fog,it.lights,{emissive:{value:new Ft(0)}}]),vertexShader:It.meshtoon_vert,fragmentShader:It.meshtoon_frag},matcap:{uniforms:Ee([it.common,it.bumpmap,it.normalmap,it.displacementmap,it.fog,{matcap:{value:null}}]),vertexShader:It.meshmatcap_vert,fragmentShader:It.meshmatcap_frag},points:{uniforms:Ee([it.points,it.fog]),vertexShader:It.points_vert,fragmentShader:It.points_frag},dashed:{uniforms:Ee([it.common,it.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:It.linedashed_vert,fragmentShader:It.linedashed_frag},depth:{uniforms:Ee([it.common,it.displacementmap]),vertexShader:It.depth_vert,fragmentShader:It.depth_frag},normal:{uniforms:Ee([it.common,it.bumpmap,it.normalmap,it.displacementmap,{opacity:{value:1}}]),vertexShader:It.meshnormal_vert,fragmentShader:It.meshnormal_frag},sprite:{uniforms:Ee([it.sprite,it.fog]),vertexShader:It.sprite_vert,fragmentShader:It.sprite_frag},background:{uniforms:{uvTransform:{value:new Dt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:It.background_vert,fragmentShader:It.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Dt}},vertexShader:It.backgroundCube_vert,fragmentShader:It.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:It.cube_vert,fragmentShader:It.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:It.equirect_vert,fragmentShader:It.equirect_frag},distanceRGBA:{uniforms:Ee([it.common,it.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:It.distanceRGBA_vert,fragmentShader:It.distanceRGBA_frag},shadow:{uniforms:Ee([it.lights,it.fog,{color:{value:new Ft(0)},opacity:{value:1}}]),vertexShader:It.shadow_vert,fragmentShader:It.shadow_frag}};Ye.physical={uniforms:Ee([Ye.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Dt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Dt},clearcoatNormalScale:{value:new Ot(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Dt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Dt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Dt},sheen:{value:0},sheenColor:{value:new Ft(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Dt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Dt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Dt},transmissionSamplerSize:{value:new Ot},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Dt},attenuationDistance:{value:0},attenuationColor:{value:new Ft(0)},specularColor:{value:new Ft(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Dt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Dt},anisotropyVector:{value:new Ot},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Dt}}]),vertexShader:It.meshphysical_vert,fragmentShader:It.meshphysical_frag};const Yi={r:0,b:0,g:0},Sn=new qe,Tu=new Jt;function wu(n,t,e,i,r,s,a){const o=new Ft(0);let c=s===!0?0:1,l,h,u=null,f=0,m=null;function g(y){let E=y.isScene===!0?y.background:null;return E&&E.isTexture&&(E=(y.backgroundBlurriness>0?e:t).get(E)),E}function _(y){let E=!1;const L=g(y);L===null?d(o,c):L&&L.isColor&&(d(L,1),E=!0);const w=n.xr.getEnvironmentBlendMode();w==="additive"?i.buffers.color.setClear(0,0,0,1,a):w==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,a),(n.autoClear||E)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function p(y,E){const L=g(E);L&&(L.isCubeTexture||L.mapping===306)?(h===void 0&&(h=new Re(new hi(1,1,1),new un({name:"BackgroundCubeMaterial",uniforms:Xn(Ye.backgroundCube.uniforms),vertexShader:Ye.backgroundCube.vertexShader,fragmentShader:Ye.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(w,R,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(h)),Sn.copy(E.backgroundRotation),Sn.x*=-1,Sn.y*=-1,Sn.z*=-1,L.isCubeTexture&&L.isRenderTargetTexture===!1&&(Sn.y*=-1,Sn.z*=-1),h.material.uniforms.envMap.value=L,h.material.uniforms.flipEnvMap.value=L.isCubeTexture&&L.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Tu.makeRotationFromEuler(Sn)),h.material.toneMapped=Xt.getTransfer(L.colorSpace)!==Zt,(u!==L||f!==L.version||m!==n.toneMapping)&&(h.material.needsUpdate=!0,u=L,f=L.version,m=n.toneMapping),h.layers.enableAll(),y.unshift(h,h.geometry,h.material,0,0,null)):L&&L.isTexture&&(l===void 0&&(l=new Re(new Xi(2,2),new un({name:"BackgroundMaterial",uniforms:Xn(Ye.background.uniforms),vertexShader:Ye.background.vertexShader,fragmentShader:Ye.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(l)),l.material.uniforms.t2D.value=L,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.toneMapped=Xt.getTransfer(L.colorSpace)!==Zt,L.matrixAutoUpdate===!0&&L.updateMatrix(),l.material.uniforms.uvTransform.value.copy(L.matrix),(u!==L||f!==L.version||m!==n.toneMapping)&&(l.material.needsUpdate=!0,u=L,f=L.version,m=n.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function d(y,E){y.getRGB(Yi,Xs(n)),i.buffers.color.setClear(Yi.r,Yi.g,Yi.b,E,a)}function b(){h!==void 0&&(h.geometry.dispose(),h.material.dispose()),l!==void 0&&(l.geometry.dispose(),l.material.dispose())}return{getClearColor:function(){return o},setClearColor:function(y,E=1){o.set(y),c=E,d(o,c)},getClearAlpha:function(){return c},setClearAlpha:function(y){c=y,d(o,c)},render:_,addToRenderList:p,dispose:b}}function Au(n,t){const e=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=f(null);let s=r,a=!1;function o(M,C,H,O,X){let G=!1;const V=u(O,H,C);s!==V&&(s=V,l(s.object)),G=m(M,O,H,X),G&&g(M,O,H,X),X!==null&&t.update(X,n.ELEMENT_ARRAY_BUFFER),(G||a)&&(a=!1,E(M,C,H,O),X!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(X).buffer))}function c(){return n.createVertexArray()}function l(M){return n.bindVertexArray(M)}function h(M){return n.deleteVertexArray(M)}function u(M,C,H){const O=H.wireframe===!0;let X=i[M.id];X===void 0&&(X={},i[M.id]=X);let G=X[C.id];G===void 0&&(G={},X[C.id]=G);let V=G[O];return V===void 0&&(V=f(c()),G[O]=V),V}function f(M){const C=[],H=[],O=[];for(let X=0;X<e;X++)C[X]=0,H[X]=0,O[X]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:C,enabledAttributes:H,attributeDivisors:O,object:M,attributes:{},index:null}}function m(M,C,H,O){const X=s.attributes,G=C.attributes;let V=0;const $=H.getAttributes();for(const z in $)if($[z].location>=0){const ut=X[z];let j=G[z];if(j===void 0&&(z==="instanceMatrix"&&M.instanceMatrix&&(j=M.instanceMatrix),z==="instanceColor"&&M.instanceColor&&(j=M.instanceColor)),ut===void 0||ut.attribute!==j||j&&ut.data!==j.data)return!0;V++}return s.attributesNum!==V||s.index!==O}function g(M,C,H,O){const X={},G=C.attributes;let V=0;const $=H.getAttributes();for(const z in $)if($[z].location>=0){let ut=G[z];ut===void 0&&(z==="instanceMatrix"&&M.instanceMatrix&&(ut=M.instanceMatrix),z==="instanceColor"&&M.instanceColor&&(ut=M.instanceColor));const j={};j.attribute=ut,ut&&ut.data&&(j.data=ut.data),X[z]=j,V++}s.attributes=X,s.attributesNum=V,s.index=O}function _(){const M=s.newAttributes;for(let C=0,H=M.length;C<H;C++)M[C]=0}function p(M){d(M,0)}function d(M,C){const H=s.newAttributes,O=s.enabledAttributes,X=s.attributeDivisors;H[M]=1,O[M]===0&&(n.enableVertexAttribArray(M),O[M]=1),X[M]!==C&&(n.vertexAttribDivisor(M,C),X[M]=C)}function b(){const M=s.newAttributes,C=s.enabledAttributes;for(let H=0,O=C.length;H<O;H++)C[H]!==M[H]&&(n.disableVertexAttribArray(H),C[H]=0)}function y(M,C,H,O,X,G,V){V===!0?n.vertexAttribIPointer(M,C,H,X,G):n.vertexAttribPointer(M,C,H,O,X,G)}function E(M,C,H,O){_();const X=O.attributes,G=H.getAttributes(),V=C.defaultAttributeValues;for(const $ in G){const z=G[$];if(z.location>=0){let rt=X[$];if(rt===void 0&&($==="instanceMatrix"&&M.instanceMatrix&&(rt=M.instanceMatrix),$==="instanceColor"&&M.instanceColor&&(rt=M.instanceColor)),rt!==void 0){const ut=rt.normalized,j=rt.itemSize,dt=t.get(rt);if(dt===void 0)continue;const Mt=dt.buffer,q=dt.type,et=dt.bytesPerElement,pt=q===n.INT||q===n.UNSIGNED_INT||rt.gpuType===1013;if(rt.isInterleavedBufferAttribute){const at=rt.data,wt=at.stride,Rt=rt.offset;if(at.isInstancedInterleavedBuffer){for(let Nt=0;Nt<z.locationSize;Nt++)d(z.location+Nt,at.meshPerAttribute);M.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=at.meshPerAttribute*at.count)}else for(let Nt=0;Nt<z.locationSize;Nt++)p(z.location+Nt);n.bindBuffer(n.ARRAY_BUFFER,Mt);for(let Nt=0;Nt<z.locationSize;Nt++)y(z.location+Nt,j/z.locationSize,q,ut,wt*et,(Rt+j/z.locationSize*Nt)*et,pt)}else{if(rt.isInstancedBufferAttribute){for(let at=0;at<z.locationSize;at++)d(z.location+at,rt.meshPerAttribute);M.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=rt.meshPerAttribute*rt.count)}else for(let at=0;at<z.locationSize;at++)p(z.location+at);n.bindBuffer(n.ARRAY_BUFFER,Mt);for(let at=0;at<z.locationSize;at++)y(z.location+at,j/z.locationSize,q,ut,j*et,j/z.locationSize*at*et,pt)}}else if(V!==void 0){const ut=V[$];if(ut!==void 0)switch(ut.length){case 2:n.vertexAttrib2fv(z.location,ut);break;case 3:n.vertexAttrib3fv(z.location,ut);break;case 4:n.vertexAttrib4fv(z.location,ut);break;default:n.vertexAttrib1fv(z.location,ut)}}}}b()}function L(){A();for(const M in i){const C=i[M];for(const H in C){const O=C[H];for(const X in O)h(O[X].object),delete O[X];delete C[H]}delete i[M]}}function w(M){if(i[M.id]===void 0)return;const C=i[M.id];for(const H in C){const O=C[H];for(const X in O)h(O[X].object),delete O[X];delete C[H]}delete i[M.id]}function R(M){for(const C in i){const H=i[C];if(H[M.id]===void 0)continue;const O=H[M.id];for(const X in O)h(O[X].object),delete O[X];delete H[M.id]}}function A(){S(),a=!0,s!==r&&(s=r,l(s.object))}function S(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:A,resetDefaultState:S,dispose:L,releaseStatesOfGeometry:w,releaseStatesOfProgram:R,initAttributes:_,enableAttribute:p,disableUnusedAttributes:b}}function Cu(n,t,e){let i;function r(l){i=l}function s(l,h){n.drawArrays(i,l,h),e.update(h,i,1)}function a(l,h,u){u!==0&&(n.drawArraysInstanced(i,l,h,u),e.update(h,i,u))}function o(l,h,u){if(u===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,h,0,u);let m=0;for(let g=0;g<u;g++)m+=h[g];e.update(m,i,1)}function c(l,h,u,f){if(u===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let g=0;g<l.length;g++)a(l[g],h[g],f[g]);else{m.multiDrawArraysInstancedWEBGL(i,l,0,h,0,f,0,u);let g=0;for(let _=0;_<u;_++)g+=h[_]*f[_];e.update(g,i,1)}}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=c}function Ru(n,t,e,i){let r;function s(){if(r!==void 0)return r;if(t.has("EXT_texture_filter_anisotropic")===!0){const R=t.get("EXT_texture_filter_anisotropic");r=n.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(R){return!(R!==1023&&i.convert(R)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(R){const A=R===1016&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(R!==1009&&i.convert(R)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&R!==1015&&!A)}function c(R){if(R==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=e.precision!==void 0?e.precision:"highp";const h=c(l);h!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const u=e.logarithmicDepthBuffer===!0,f=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),m=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=n.getParameter(n.MAX_TEXTURE_SIZE),p=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),d=n.getParameter(n.MAX_VERTEX_ATTRIBS),b=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),y=n.getParameter(n.MAX_VARYING_VECTORS),E=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),L=g>0,w=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:u,reverseDepthBuffer:f,maxTextures:m,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:p,maxAttributes:d,maxVertexUniforms:b,maxVaryings:y,maxFragmentUniforms:E,vertexTextures:L,maxSamples:w}}function Pu(n){const t=this;let e=null,i=0,r=!1,s=!1;const a=new fn,o=new Dt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,f){const m=u.length!==0||f||i!==0||r;return r=f,i=u.length,m},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(u,f){e=h(u,f,0)},this.setState=function(u,f,m){const g=u.clippingPlanes,_=u.clipIntersection,p=u.clipShadows,d=n.get(u);if(!r||g===null||g.length===0||s&&!p)s?h(null):l();else{const b=s?0:i,y=b*4;let E=d.clippingState||null;c.value=E,E=h(g,f,y,m);for(let L=0;L!==y;++L)E[L]=e[L];d.clippingState=E,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=b}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function h(u,f,m,g){const _=u!==null?u.length:0;let p=null;if(_!==0){if(p=c.value,g!==!0||p===null){const d=m+_*4,b=f.matrixWorldInverse;o.getNormalMatrix(b),(p===null||p.length<d)&&(p=new Float32Array(d));for(let y=0,E=m;y!==_;++y,E+=4)a.copy(u[y]).applyMatrix4(b,o),a.normal.toArray(p,E),p[E+3]=a.constant}c.value=p,c.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,p}}function Du(n){let t=new WeakMap;function e(a,o){return o===303?a.mapping=301:o===304&&(a.mapping=302),a}function i(a){if(a&&a.isTexture){const o=a.mapping;if(o===303||o===304)if(t.has(a)){const c=t.get(a).texture;return e(c,a.mapping)}else{const c=a.image;if(c&&c.height>0){const l=new ul(c.height);return l.fromEquirectangularTexture(n,a),t.set(a,l),a.addEventListener("dispose",r),e(l.texture,a.mapping)}else return null}}return a}function r(a){const o=a.target;o.removeEventListener("dispose",r);const c=t.get(o);c!==void 0&&(t.delete(o),c.dispose())}function s(){t=new WeakMap}return{get:i,dispose:s}}const jn=4,co=[.125,.215,.35,.446,.526,.582],En=20,Xr=new di,lo=new Ft;let qr=null,Yr=0,jr=0,Kr=!1;const bn=(1+Math.sqrt(5))/2,Kn=1/bn,ho=[new P(-bn,Kn,0),new P(bn,Kn,0),new P(-Kn,0,bn),new P(Kn,0,bn),new P(0,bn,-Kn),new P(0,bn,Kn),new P(-1,1,-1),new P(1,1,-1),new P(-1,1,1),new P(1,1,1)];class uo{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,i=.1,r=100){qr=this._renderer.getRenderTarget(),Yr=this._renderer.getActiveCubeFace(),jr=this._renderer.getActiveMipmapLevel(),Kr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(t,i,r,s),e>0&&this._blur(s,0,0,e),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=mo(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=po(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(qr,Yr,jr),this._renderer.xr.enabled=Kr,t.scissorTest=!1,ji(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===301||t.mapping===302?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),qr=this._renderer.getRenderTarget(),Yr=this._renderer.getActiveCubeFace(),jr=this._renderer.getActiveMipmapLevel(),Kr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=e||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,i={magFilter:1006,minFilter:1006,generateMipmaps:!1,type:1016,format:1023,colorSpace:Rn,depthBuffer:!1},r=fo(t,e,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=fo(t,e,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Lu(s)),this._blurMaterial=Iu(s,t,e)}return r}_compileMaterial(t){const e=new Re(this._lodPlanes[0],t);this._renderer.compile(e,Xr)}_sceneToCubeUV(t,e,i,r){const o=new Ve(90,1,e,i),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,f=h.toneMapping;h.getClearColor(lo),h.toneMapping=0,h.autoClear=!1;const m=new ci({name:"PMREM.Background",side:1,depthWrite:!1,depthTest:!1}),g=new Re(new hi,m);let _=!1;const p=t.background;p?p.isColor&&(m.color.copy(p),t.background=null,_=!0):(m.color.copy(lo),_=!0);for(let d=0;d<6;d++){const b=d%3;b===0?(o.up.set(0,c[d],0),o.lookAt(l[d],0,0)):b===1?(o.up.set(0,0,c[d]),o.lookAt(0,l[d],0)):(o.up.set(0,c[d],0),o.lookAt(0,0,l[d]));const y=this._cubeSize;ji(r,b*y,d>2?y:0,y,y),h.setRenderTarget(r),_&&h.render(g,o),h.render(t,o)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=f,h.autoClear=u,t.background=p}_textureToCubeUV(t,e){const i=this._renderer,r=t.mapping===301||t.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=mo()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=po());const s=r?this._cubemapMaterial:this._equirectMaterial,a=new Re(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=t;const c=this._cubeSize;ji(e,0,0,3*c,2*c),i.setRenderTarget(e),i.render(a,Xr)}_applyPMREM(t){const e=this._renderer,i=e.autoClear;e.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const a=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),o=ho[(r-s-1)%ho.length];this._blur(t,s-1,s,a,o)}e.autoClear=i}_blur(t,e,i,r,s){const a=this._pingPongRenderTarget;this._halfBlur(t,a,e,i,r,"latitudinal",s),this._halfBlur(a,t,i,i,r,"longitudinal",s)}_halfBlur(t,e,i,r,s,a,o){const c=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,u=new Re(this._lodPlanes[r],l),f=l.uniforms,m=this._sizeLods[i]-1,g=isFinite(s)?Math.PI/(2*m):2*Math.PI/(2*En-1),_=s/g,p=isFinite(s)?1+Math.floor(h*_):En;p>En&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${En}`);const d=[];let b=0;for(let R=0;R<En;++R){const A=R/_,S=Math.exp(-A*A/2);d.push(S),R===0?b+=S:R<p&&(b+=2*S)}for(let R=0;R<d.length;R++)d[R]=d[R]/b;f.envMap.value=t.texture,f.samples.value=p,f.weights.value=d,f.latitudinal.value=a==="latitudinal",o&&(f.poleAxis.value=o);const{_lodMax:y}=this;f.dTheta.value=g,f.mipInt.value=y-i;const E=this._sizeLods[r],L=3*E*(r>y-jn?r-y+jn:0),w=4*(this._cubeSize-E);ji(e,L,w,3*E,2*E),c.setRenderTarget(e),c.render(u,Xr)}}function Lu(n){const t=[],e=[],i=[];let r=n;const s=n-jn+1+co.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);e.push(o);let c=1/o;a>n-jn?c=co[a-n+jn-1]:a===0&&(c=0),i.push(c);const l=1/(o-2),h=-l,u=1+l,f=[h,h,u,h,u,u,h,h,u,u,h,u],m=6,g=6,_=3,p=2,d=1,b=new Float32Array(_*g*m),y=new Float32Array(p*g*m),E=new Float32Array(d*g*m);for(let w=0;w<m;w++){const R=w%3*2/3-1,A=w>2?0:-1,S=[R,A,0,R+2/3,A,0,R+2/3,A+1,0,R,A,0,R+2/3,A+1,0,R,A+1,0];b.set(S,_*g*w),y.set(f,p*g*w);const M=[w,w,w,w,w,w];E.set(M,d*g*w)}const L=new He;L.setAttribute("position",new Qt(b,_)),L.setAttribute("uv",new Qt(y,p)),L.setAttribute("faceIndex",new Qt(E,d)),t.push(L),r>jn&&r--}return{lodPlanes:t,sizeLods:e,sigmas:i}}function fo(n,t,e){const i=new gn(n,t,e);return i.texture.mapping=306,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function ji(n,t,e,i,r){n.viewport.set(t,e,i,r),n.scissor.set(t,e,i,r)}function Iu(n,t,e){const i=new Float32Array(En),r=new P(0,1,0);return new un({name:"SphericalGaussianBlur",defines:{n:En,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Zr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function po(){return new un({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Zr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function mo(){return new un({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Zr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Zr(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Uu(n){let t=new WeakMap,e=null;function i(o){if(o&&o.isTexture){const c=o.mapping,l=c===303||c===304,h=c===301||c===302;if(l||h){let u=t.get(o);const f=u!==void 0?u.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==f)return e===null&&(e=new uo(n)),u=l?e.fromEquirectangular(o,u):e.fromCubemap(o,u),u.texture.pmremVersion=o.pmremVersion,t.set(o,u),u.texture;if(u!==void 0)return u.texture;{const m=o.image;return l&&m&&m.height>0||h&&m&&r(m)?(e===null&&(e=new uo(n)),u=l?e.fromEquirectangular(o):e.fromCubemap(o),u.texture.pmremVersion=o.pmremVersion,t.set(o,u),o.addEventListener("dispose",s),u.texture):null}}}return o}function r(o){let c=0;const l=6;for(let h=0;h<l;h++)o[h]!==void 0&&c++;return c===l}function s(o){const c=o.target;c.removeEventListener("dispose",s);const l=t.get(c);l!==void 0&&(t.delete(c),l.dispose())}function a(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:i,dispose:a}}function Fu(n){const t={};function e(i){if(t[i]!==void 0)return t[i];let r;switch(i){case"WEBGL_depth_texture":r=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=n.getExtension(i)}return t[i]=r,r}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){const r=e(i);return r===null&&In("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function Nu(n,t,e,i){const r={},s=new WeakMap;function a(u){const f=u.target;f.index!==null&&t.remove(f.index);for(const g in f.attributes)t.remove(f.attributes[g]);f.removeEventListener("dispose",a),delete r[f.id];const m=s.get(f);m&&(t.remove(m),s.delete(f)),i.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,e.memory.geometries--}function o(u,f){return r[f.id]===!0||(f.addEventListener("dispose",a),r[f.id]=!0,e.memory.geometries++),f}function c(u){const f=u.attributes;for(const m in f)t.update(f[m],n.ARRAY_BUFFER)}function l(u){const f=[],m=u.index,g=u.attributes.position;let _=0;if(m!==null){const b=m.array;_=m.version;for(let y=0,E=b.length;y<E;y+=3){const L=b[y+0],w=b[y+1],R=b[y+2];f.push(L,w,w,R,R,L)}}else if(g!==void 0){const b=g.array;_=g.version;for(let y=0,E=b.length/3-1;y<E;y+=3){const L=y+0,w=y+1,R=y+2;f.push(L,w,w,R,R,L)}}else return;const p=new(bs(f)?Gs:zs)(f,1);p.version=_;const d=s.get(u);d&&t.remove(d),s.set(u,p)}function h(u){const f=s.get(u);if(f){const m=u.index;m!==null&&f.version<m.version&&l(u)}else l(u);return s.get(u)}return{get:o,update:c,getWireframeAttribute:h}}function Bu(n,t,e){let i;function r(f){i=f}let s,a;function o(f){s=f.type,a=f.bytesPerElement}function c(f,m){n.drawElements(i,m,s,f*a),e.update(m,i,1)}function l(f,m,g){g!==0&&(n.drawElementsInstanced(i,m,s,f*a,g),e.update(m,i,g))}function h(f,m,g){if(g===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,m,0,s,f,0,g);let p=0;for(let d=0;d<g;d++)p+=m[d];e.update(p,i,1)}function u(f,m,g,_){if(g===0)return;const p=t.get("WEBGL_multi_draw");if(p===null)for(let d=0;d<f.length;d++)l(f[d]/a,m[d],_[d]);else{p.multiDrawElementsInstancedWEBGL(i,m,0,s,f,0,_,0,g);let d=0;for(let b=0;b<g;b++)d+=m[b]*_[b];e.update(d,i,1)}}this.setMode=r,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Ou(n){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,a,o){switch(e.calls++,a){case n.TRIANGLES:e.triangles+=o*(s/3);break;case n.LINES:e.lines+=o*(s/2);break;case n.LINE_STRIP:e.lines+=o*(s-1);break;case n.LINE_LOOP:e.lines+=o*s;break;case n.POINTS:e.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:r,update:i}}function ku(n,t,e){const i=new WeakMap,r=new ie;function s(a,o,c){const l=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=h!==void 0?h.length:0;let f=i.get(o);if(f===void 0||f.count!==u){let S=function(){R.dispose(),i.delete(o),o.removeEventListener("dispose",S)};f!==void 0&&f.texture.dispose();const m=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,_=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],d=o.morphAttributes.normal||[],b=o.morphAttributes.color||[];let y=0;m===!0&&(y=1),g===!0&&(y=2),_===!0&&(y=3);let E=o.attributes.position.count*y,L=1;E>t.maxTextureSize&&(L=Math.ceil(E/t.maxTextureSize),E=t.maxTextureSize);const w=new Float32Array(E*L*4*u),R=new Rs(w,E,L,u);R.type=1015,R.needsUpdate=!0;const A=y*4;for(let M=0;M<u;M++){const C=p[M],H=d[M],O=b[M],X=E*L*4*M;for(let G=0;G<C.count;G++){const V=G*A;m===!0&&(r.fromBufferAttribute(C,G),w[X+V+0]=r.x,w[X+V+1]=r.y,w[X+V+2]=r.z,w[X+V+3]=0),g===!0&&(r.fromBufferAttribute(H,G),w[X+V+4]=r.x,w[X+V+5]=r.y,w[X+V+6]=r.z,w[X+V+7]=0),_===!0&&(r.fromBufferAttribute(O,G),w[X+V+8]=r.x,w[X+V+9]=r.y,w[X+V+10]=r.z,w[X+V+11]=O.itemSize===4?r.w:1)}}f={count:u,texture:R,size:new Ot(E,L)},i.set(o,f),o.addEventListener("dispose",S)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(n,"morphTexture",a.morphTexture,e);else{let m=0;for(let _=0;_<l.length;_++)m+=l[_];const g=o.morphTargetsRelative?1:1-m;c.getUniforms().setValue(n,"morphTargetBaseInfluence",g),c.getUniforms().setValue(n,"morphTargetInfluences",l)}c.getUniforms().setValue(n,"morphTargetsTexture",f.texture,e),c.getUniforms().setValue(n,"morphTargetsTextureSize",f.size)}return{update:s}}function zu(n,t,e,i){let r=new WeakMap;function s(c){const l=i.render.frame,h=c.geometry,u=t.get(c,h);if(r.get(u)!==l&&(t.update(u),r.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",o)===!1&&c.addEventListener("dispose",o),r.get(c)!==l&&(e.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,n.ARRAY_BUFFER),r.set(c,l))),c.isSkinnedMesh){const f=c.skeleton;r.get(f)!==l&&(f.update(),r.set(f,l))}return u}function a(){r=new WeakMap}function o(c){const l=c.target;l.removeEventListener("dispose",o),e.remove(l.instanceMatrix),l.instanceColor!==null&&e.remove(l.instanceColor)}return{update:s,dispose:a}}const go=new ve,_o=new $s(1,1),vo=new Rs,xo=new Kc,Mo=new Ks,yo=[],So=[],Eo=new Float32Array(16),bo=new Float32Array(9),To=new Float32Array(4);function Zn(n,t,e){const i=n[0];if(i<=0||i>0)return n;const r=t*e;let s=yo[r];if(s===void 0&&(s=new Float32Array(r),yo[r]=s),t!==0){i.toArray(s,0);for(let a=1,o=0;a!==t;++a)o+=e,n[a].toArray(s,o)}return s}function le(n,t){if(n.length!==t.length)return!1;for(let e=0,i=n.length;e<i;e++)if(n[e]!==t[e])return!1;return!0}function he(n,t){for(let e=0,i=t.length;e<i;e++)n[e]=t[e]}function Ki(n,t){let e=So[t];e===void 0&&(e=new Int32Array(t),So[t]=e);for(let i=0;i!==t;++i)e[i]=n.allocateTextureUnit();return e}function Gu(n,t){const e=this.cache;e[0]!==t&&(n.uniform1f(this.addr,t),e[0]=t)}function Hu(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(le(e,t))return;n.uniform2fv(this.addr,t),he(e,t)}}function Vu(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(n.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(le(e,t))return;n.uniform3fv(this.addr,t),he(e,t)}}function Wu(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(le(e,t))return;n.uniform4fv(this.addr,t),he(e,t)}}function Xu(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(le(e,t))return;n.uniformMatrix2fv(this.addr,!1,t),he(e,t)}else{if(le(e,i))return;To.set(i),n.uniformMatrix2fv(this.addr,!1,To),he(e,i)}}function qu(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(le(e,t))return;n.uniformMatrix3fv(this.addr,!1,t),he(e,t)}else{if(le(e,i))return;bo.set(i),n.uniformMatrix3fv(this.addr,!1,bo),he(e,i)}}function Yu(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(le(e,t))return;n.uniformMatrix4fv(this.addr,!1,t),he(e,t)}else{if(le(e,i))return;Eo.set(i),n.uniformMatrix4fv(this.addr,!1,Eo),he(e,i)}}function ju(n,t){const e=this.cache;e[0]!==t&&(n.uniform1i(this.addr,t),e[0]=t)}function Ku(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(le(e,t))return;n.uniform2iv(this.addr,t),he(e,t)}}function Zu(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(le(e,t))return;n.uniform3iv(this.addr,t),he(e,t)}}function Ju(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(le(e,t))return;n.uniform4iv(this.addr,t),he(e,t)}}function Qu(n,t){const e=this.cache;e[0]!==t&&(n.uniform1ui(this.addr,t),e[0]=t)}function $u(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(le(e,t))return;n.uniform2uiv(this.addr,t),he(e,t)}}function td(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(le(e,t))return;n.uniform3uiv(this.addr,t),he(e,t)}}function ed(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(le(e,t))return;n.uniform4uiv(this.addr,t),he(e,t)}}function nd(n,t,e){const i=this.cache,r=e.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);let s;this.type===n.SAMPLER_2D_SHADOW?(_o.compareFunction=515,s=_o):s=go,e.setTexture2D(t||s,r)}function id(n,t,e){const i=this.cache,r=e.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),e.setTexture3D(t||xo,r)}function rd(n,t,e){const i=this.cache,r=e.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),e.setTextureCube(t||Mo,r)}function sd(n,t,e){const i=this.cache,r=e.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),e.setTexture2DArray(t||vo,r)}function od(n){switch(n){case 5126:return Gu;case 35664:return Hu;case 35665:return Vu;case 35666:return Wu;case 35674:return Xu;case 35675:return qu;case 35676:return Yu;case 5124:case 35670:return ju;case 35667:case 35671:return Ku;case 35668:case 35672:return Zu;case 35669:case 35673:return Ju;case 5125:return Qu;case 36294:return $u;case 36295:return td;case 36296:return ed;case 35678:case 36198:case 36298:case 36306:case 35682:return nd;case 35679:case 36299:case 36307:return id;case 35680:case 36300:case 36308:case 36293:return rd;case 36289:case 36303:case 36311:case 36292:return sd}}function ad(n,t){n.uniform1fv(this.addr,t)}function cd(n,t){const e=Zn(t,this.size,2);n.uniform2fv(this.addr,e)}function ld(n,t){const e=Zn(t,this.size,3);n.uniform3fv(this.addr,e)}function hd(n,t){const e=Zn(t,this.size,4);n.uniform4fv(this.addr,e)}function ud(n,t){const e=Zn(t,this.size,4);n.uniformMatrix2fv(this.addr,!1,e)}function dd(n,t){const e=Zn(t,this.size,9);n.uniformMatrix3fv(this.addr,!1,e)}function fd(n,t){const e=Zn(t,this.size,16);n.uniformMatrix4fv(this.addr,!1,e)}function pd(n,t){n.uniform1iv(this.addr,t)}function md(n,t){n.uniform2iv(this.addr,t)}function gd(n,t){n.uniform3iv(this.addr,t)}function _d(n,t){n.uniform4iv(this.addr,t)}function vd(n,t){n.uniform1uiv(this.addr,t)}function xd(n,t){n.uniform2uiv(this.addr,t)}function Md(n,t){n.uniform3uiv(this.addr,t)}function yd(n,t){n.uniform4uiv(this.addr,t)}function Sd(n,t,e){const i=this.cache,r=t.length,s=Ki(e,r);le(i,s)||(n.uniform1iv(this.addr,s),he(i,s));for(let a=0;a!==r;++a)e.setTexture2D(t[a]||go,s[a])}function Ed(n,t,e){const i=this.cache,r=t.length,s=Ki(e,r);le(i,s)||(n.uniform1iv(this.addr,s),he(i,s));for(let a=0;a!==r;++a)e.setTexture3D(t[a]||xo,s[a])}function bd(n,t,e){const i=this.cache,r=t.length,s=Ki(e,r);le(i,s)||(n.uniform1iv(this.addr,s),he(i,s));for(let a=0;a!==r;++a)e.setTextureCube(t[a]||Mo,s[a])}function Td(n,t,e){const i=this.cache,r=t.length,s=Ki(e,r);le(i,s)||(n.uniform1iv(this.addr,s),he(i,s));for(let a=0;a!==r;++a)e.setTexture2DArray(t[a]||vo,s[a])}function wd(n){switch(n){case 5126:return ad;case 35664:return cd;case 35665:return ld;case 35666:return hd;case 35674:return ud;case 35675:return dd;case 35676:return fd;case 5124:case 35670:return pd;case 35667:case 35671:return md;case 35668:case 35672:return gd;case 35669:case 35673:return _d;case 5125:return vd;case 36294:return xd;case 36295:return Md;case 36296:return yd;case 35678:case 36198:case 36298:case 36306:case 35682:return Sd;case 35679:case 36299:case 36307:return Ed;case 35680:case 36300:case 36308:case 36293:return bd;case 36289:case 36303:case 36311:case 36292:return Td}}class Ad{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=od(e.type)}}class Cd{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=wd(e.type)}}class Rd{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(t,e[o.id],i)}}}const Jr=/(\w+)(\])?(\[|\.)?/g;function wo(n,t){n.seq.push(t),n.map[t.id]=t}function Pd(n,t,e){const i=n.name,r=i.length;for(Jr.lastIndex=0;;){const s=Jr.exec(i),a=Jr.lastIndex;let o=s[1];const c=s[2]==="]",l=s[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===r){wo(e,l===void 0?new Ad(o,n,t):new Cd(o,n,t));break}else{let u=e.map[o];u===void 0&&(u=new Rd(o),wo(e,u)),e=u}}}class Zi{constructor(t,e){this.seq=[],this.map={};const i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const s=t.getActiveUniform(e,r),a=t.getUniformLocation(e,s.name);Pd(s,a,this)}}setValue(t,e,i,r){const s=this.map[e];s!==void 0&&s.setValue(t,i,r)}setOptional(t,e,i){const r=e[i];r!==void 0&&this.setValue(t,i,r)}static upload(t,e,i,r){for(let s=0,a=e.length;s!==a;++s){const o=e[s],c=i[o.id];c.needsUpdate!==!1&&o.setValue(t,c.value,r)}}static seqWithValue(t,e){const i=[];for(let r=0,s=t.length;r!==s;++r){const a=t[r];a.id in e&&i.push(a)}return i}}function Ao(n,t,e){const i=n.createShader(t);return n.shaderSource(i,e),n.compileShader(i),i}const Dd=37297;let Ld=0;function Id(n,t){const e=n.split(`
`),i=[],r=Math.max(t-6,0),s=Math.min(t+6,e.length);for(let a=r;a<s;a++){const o=a+1;i.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return i.join(`
`)}const Co=new Dt;function Ud(n){Xt._getMatrix(Co,Xt.workingColorSpace,n);const t=`mat3( ${Co.elements.map(e=>e.toFixed(4))} )`;switch(Xt.getTransfer(n)){case yi:return[t,"LinearTransferOETF"];case Zt:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",n),[t,"LinearTransferOETF"]}}function Ro(n,t,e){const i=n.getShaderParameter(t,n.COMPILE_STATUS),r=n.getShaderInfoLog(t).trim();if(i&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const a=parseInt(s[1]);return e.toUpperCase()+`

`+r+`

`+Id(n.getShaderSource(t),a)}else return r}function Fd(n,t){const e=Ud(t);return[`vec4 ${n}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function Nd(n,t){let e;switch(t){case 1:e="Linear";break;case 2:e="Reinhard";break;case 3:e="Cineon";break;case 4:e="ACESFilmic";break;case 6:e="AgX";break;case 7:e="Neutral";break;case 5:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+n+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const Ji=new P;function Bd(){Xt.getLuminanceCoefficients(Ji);const n=Ji.x.toFixed(4),t=Ji.y.toFixed(4),e=Ji.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Od(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(fi).join(`
`)}function kd(n){const t=[];for(const e in n){const i=n[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function zd(n,t){const e={},i=n.getProgramParameter(t,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=n.getActiveAttrib(t,r),a=s.name;let o=1;s.type===n.FLOAT_MAT2&&(o=2),s.type===n.FLOAT_MAT3&&(o=3),s.type===n.FLOAT_MAT4&&(o=4),e[a]={type:s.type,location:n.getAttribLocation(t,a),locationSize:o}}return e}function fi(n){return n!==""}function Po(n,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Do(n,t){return n.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Gd=/^[ \t]*#include +<([\w\d./]+)>/gm;function Qr(n){return n.replace(Gd,Vd)}const Hd=new Map;function Vd(n,t){let e=It[t];if(e===void 0){const i=Hd.get(t);if(i!==void 0)e=It[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return Qr(e)}const Wd=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Lo(n){return n.replace(Wd,Xd)}function Xd(n,t,e,i){let r="";for(let s=parseInt(t);s<parseInt(e);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Io(n){let t=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?t+=`
#define HIGH_PRECISION`:n.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function qd(n){let t="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===1?t="SHADOWMAP_TYPE_PCF":n.shadowMapType===2?t="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===3&&(t="SHADOWMAP_TYPE_VSM"),t}function Yd(n){let t="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case 301:case 302:t="ENVMAP_TYPE_CUBE";break;case 306:t="ENVMAP_TYPE_CUBE_UV";break}return t}function jd(n){let t="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case 302:t="ENVMAP_MODE_REFRACTION";break}return t}function Kd(n){let t="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case 0:t="ENVMAP_BLENDING_MULTIPLY";break;case 1:t="ENVMAP_BLENDING_MIX";break;case 2:t="ENVMAP_BLENDING_ADD";break}return t}function Zd(n){const t=n.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:i,maxMip:e}}function Jd(n,t,e,i){const r=n.getContext(),s=e.defines;let a=e.vertexShader,o=e.fragmentShader;const c=qd(e),l=Yd(e),h=jd(e),u=Kd(e),f=Zd(e),m=Od(e),g=kd(s),_=r.createProgram();let p,d,b=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(fi).join(`
`),p.length>0&&(p+=`
`),d=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(fi).join(`
`),d.length>0&&(d+=`
`)):(p=[Io(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(fi).join(`
`),d=[Io(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==0?"#define TONE_MAPPING":"",e.toneMapping!==0?It.tonemapping_pars_fragment:"",e.toneMapping!==0?Nd("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",It.colorspace_pars_fragment,Fd("linearToOutputTexel",e.outputColorSpace),Bd(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(fi).join(`
`)),a=Qr(a),a=Po(a,e),a=Do(a,e),o=Qr(o),o=Po(o,e),o=Do(o,e),a=Lo(a),o=Lo(o),e.isRawShaderMaterial!==!0&&(b=`#version 300 es
`,p=[m,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,d=["#define varying in",e.glslVersion===Ss?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Ss?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+d);const y=b+p+a,E=b+d+o,L=Ao(r,r.VERTEX_SHADER,y),w=Ao(r,r.FRAGMENT_SHADER,E);r.attachShader(_,L),r.attachShader(_,w),e.index0AttributeName!==void 0?r.bindAttribLocation(_,0,e.index0AttributeName):e.morphTargets===!0&&r.bindAttribLocation(_,0,"position"),r.linkProgram(_);function R(C){if(n.debug.checkShaderErrors){const H=r.getProgramInfoLog(_).trim(),O=r.getShaderInfoLog(L).trim(),X=r.getShaderInfoLog(w).trim();let G=!0,V=!0;if(r.getProgramParameter(_,r.LINK_STATUS)===!1)if(G=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,_,L,w);else{const $=Ro(r,L,"vertex"),z=Ro(r,w,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(_,r.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+H+`
`+$+`
`+z)}else H!==""?console.warn("THREE.WebGLProgram: Program Info Log:",H):(O===""||X==="")&&(V=!1);V&&(C.diagnostics={runnable:G,programLog:H,vertexShader:{log:O,prefix:p},fragmentShader:{log:X,prefix:d}})}r.deleteShader(L),r.deleteShader(w),A=new Zi(r,_),S=zd(r,_)}let A;this.getUniforms=function(){return A===void 0&&R(this),A};let S;this.getAttributes=function(){return S===void 0&&R(this),S};let M=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return M===!1&&(M=r.getProgramParameter(_,Dd)),M},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(_),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Ld++,this.cacheKey=t,this.usedTimes=1,this.program=_,this.vertexShader=L,this.fragmentShader=w,this}let Qd=0;class $d{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,i=t.fragmentShader,r=this._getShaderStage(e),s=this._getShaderStage(i),a=this._getShaderCacheForMaterial(t);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){const e=this.shaderCache;let i=e.get(t);return i===void 0&&(i=new tf(t),e.set(t,i)),i}}class tf{constructor(t){this.id=Qd++,this.code=t,this.usedTimes=0}}function ef(n,t,e,i,r,s,a){const o=new wr,c=new $d,l=new Set,h=[],u=r.logarithmicDepthBuffer,f=r.vertexTextures;let m=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(S){return l.add(S),S===0?"uv":`uv${S}`}function p(S,M,C,H,O){const X=H.fog,G=O.geometry,V=S.isMeshStandardMaterial?H.environment:null,$=(S.isMeshStandardMaterial?e:t).get(S.envMap||V),z=$&&$.mapping===306?$.image.height:null,rt=g[S.type];S.precision!==null&&(m=r.getMaxPrecision(S.precision),m!==S.precision&&console.warn("THREE.WebGLProgram.getParameters:",S.precision,"not supported, using",m,"instead."));const ut=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,j=ut!==void 0?ut.length:0;let dt=0;G.morphAttributes.position!==void 0&&(dt=1),G.morphAttributes.normal!==void 0&&(dt=2),G.morphAttributes.color!==void 0&&(dt=3);let Mt,q,et,pt;if(rt){const Kt=Ye[rt];Mt=Kt.vertexShader,q=Kt.fragmentShader}else Mt=S.vertexShader,q=S.fragmentShader,c.update(S),et=c.getVertexShaderID(S),pt=c.getFragmentShaderID(S);const at=n.getRenderTarget(),wt=n.state.buffers.depth.getReversed(),Rt=O.isInstancedMesh===!0,Nt=O.isBatchedMesh===!0,ne=!!S.map,Ht=!!S.matcap,oe=!!$,D=!!S.aoMap,Ue=!!S.lightMap,kt=!!S.bumpMap,zt=!!S.normalMap,St=!!S.displacementMap,te=!!S.emissiveMap,yt=!!S.metalnessMap,T=!!S.roughnessMap,v=S.anisotropy>0,N=S.clearcoat>0,K=S.dispersion>0,J=S.iridescence>0,Y=S.sheen>0,xt=S.transmission>0,ct=v&&!!S.anisotropyMap,mt=N&&!!S.clearcoatMap,Vt=N&&!!S.clearcoatNormalMap,nt=N&&!!S.clearcoatRoughnessMap,gt=J&&!!S.iridescenceMap,Tt=J&&!!S.iridescenceThicknessMap,At=Y&&!!S.sheenColorMap,_t=Y&&!!S.sheenRoughnessMap,Gt=!!S.specularMap,Ut=!!S.specularColorMap,$t=!!S.specularIntensityMap,I=xt&&!!S.transmissionMap,st=xt&&!!S.thicknessMap,W=!!S.gradientMap,Z=!!S.alphaMap,ht=S.alphaTest>0,lt=!!S.alphaHash,Lt=!!S.extensions;let re=0;S.toneMapped&&(at===null||at.isXRRenderTarget===!0)&&(re=n.toneMapping);const Me={shaderID:rt,shaderType:S.type,shaderName:S.name,vertexShader:Mt,fragmentShader:q,defines:S.defines,customVertexShaderID:et,customFragmentShaderID:pt,isRawShaderMaterial:S.isRawShaderMaterial===!0,glslVersion:S.glslVersion,precision:m,batching:Nt,batchingColor:Nt&&O._colorsTexture!==null,instancing:Rt,instancingColor:Rt&&O.instanceColor!==null,instancingMorph:Rt&&O.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:at===null?n.outputColorSpace:at.isXRRenderTarget===!0?at.texture.colorSpace:Rn,alphaToCoverage:!!S.alphaToCoverage,map:ne,matcap:Ht,envMap:oe,envMapMode:oe&&$.mapping,envMapCubeUVHeight:z,aoMap:D,lightMap:Ue,bumpMap:kt,normalMap:zt,displacementMap:f&&St,emissiveMap:te,normalMapObjectSpace:zt&&S.normalMapType===1,normalMapTangentSpace:zt&&S.normalMapType===0,metalnessMap:yt,roughnessMap:T,anisotropy:v,anisotropyMap:ct,clearcoat:N,clearcoatMap:mt,clearcoatNormalMap:Vt,clearcoatRoughnessMap:nt,dispersion:K,iridescence:J,iridescenceMap:gt,iridescenceThicknessMap:Tt,sheen:Y,sheenColorMap:At,sheenRoughnessMap:_t,specularMap:Gt,specularColorMap:Ut,specularIntensityMap:$t,transmission:xt,transmissionMap:I,thicknessMap:st,gradientMap:W,opaque:S.transparent===!1&&S.blending===1&&S.alphaToCoverage===!1,alphaMap:Z,alphaTest:ht,alphaHash:lt,combine:S.combine,mapUv:ne&&_(S.map.channel),aoMapUv:D&&_(S.aoMap.channel),lightMapUv:Ue&&_(S.lightMap.channel),bumpMapUv:kt&&_(S.bumpMap.channel),normalMapUv:zt&&_(S.normalMap.channel),displacementMapUv:St&&_(S.displacementMap.channel),emissiveMapUv:te&&_(S.emissiveMap.channel),metalnessMapUv:yt&&_(S.metalnessMap.channel),roughnessMapUv:T&&_(S.roughnessMap.channel),anisotropyMapUv:ct&&_(S.anisotropyMap.channel),clearcoatMapUv:mt&&_(S.clearcoatMap.channel),clearcoatNormalMapUv:Vt&&_(S.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:nt&&_(S.clearcoatRoughnessMap.channel),iridescenceMapUv:gt&&_(S.iridescenceMap.channel),iridescenceThicknessMapUv:Tt&&_(S.iridescenceThicknessMap.channel),sheenColorMapUv:At&&_(S.sheenColorMap.channel),sheenRoughnessMapUv:_t&&_(S.sheenRoughnessMap.channel),specularMapUv:Gt&&_(S.specularMap.channel),specularColorMapUv:Ut&&_(S.specularColorMap.channel),specularIntensityMapUv:$t&&_(S.specularIntensityMap.channel),transmissionMapUv:I&&_(S.transmissionMap.channel),thicknessMapUv:st&&_(S.thicknessMap.channel),alphaMapUv:Z&&_(S.alphaMap.channel),vertexTangents:!!G.attributes.tangent&&(zt||v),vertexColors:S.vertexColors,vertexAlphas:S.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,pointsUvs:O.isPoints===!0&&!!G.attributes.uv&&(ne||Z),fog:!!X,useFog:S.fog===!0,fogExp2:!!X&&X.isFogExp2,flatShading:S.flatShading===!0,sizeAttenuation:S.sizeAttenuation===!0,logarithmicDepthBuffer:u,reverseDepthBuffer:wt,skinning:O.isSkinnedMesh===!0,morphTargets:G.morphAttributes.position!==void 0,morphNormals:G.morphAttributes.normal!==void 0,morphColors:G.morphAttributes.color!==void 0,morphTargetsCount:j,morphTextureStride:dt,numDirLights:M.directional.length,numPointLights:M.point.length,numSpotLights:M.spot.length,numSpotLightMaps:M.spotLightMap.length,numRectAreaLights:M.rectArea.length,numHemiLights:M.hemi.length,numDirLightShadows:M.directionalShadowMap.length,numPointLightShadows:M.pointShadowMap.length,numSpotLightShadows:M.spotShadowMap.length,numSpotLightShadowsWithMaps:M.numSpotLightShadowsWithMaps,numLightProbes:M.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:S.dithering,shadowMapEnabled:n.shadowMap.enabled&&C.length>0,shadowMapType:n.shadowMap.type,toneMapping:re,decodeVideoTexture:ne&&S.map.isVideoTexture===!0&&Xt.getTransfer(S.map.colorSpace)===Zt,decodeVideoTextureEmissive:te&&S.emissiveMap.isVideoTexture===!0&&Xt.getTransfer(S.emissiveMap.colorSpace)===Zt,premultipliedAlpha:S.premultipliedAlpha,doubleSided:S.side===2,flipSided:S.side===1,useDepthPacking:S.depthPacking>=0,depthPacking:S.depthPacking||0,index0AttributeName:S.index0AttributeName,extensionClipCullDistance:Lt&&S.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Lt&&S.extensions.multiDraw===!0||Nt)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:S.customProgramCacheKey()};return Me.vertexUv1s=l.has(1),Me.vertexUv2s=l.has(2),Me.vertexUv3s=l.has(3),l.clear(),Me}function d(S){const M=[];if(S.shaderID?M.push(S.shaderID):(M.push(S.customVertexShaderID),M.push(S.customFragmentShaderID)),S.defines!==void 0)for(const C in S.defines)M.push(C),M.push(S.defines[C]);return S.isRawShaderMaterial===!1&&(b(M,S),y(M,S),M.push(n.outputColorSpace)),M.push(S.customProgramCacheKey),M.join()}function b(S,M){S.push(M.precision),S.push(M.outputColorSpace),S.push(M.envMapMode),S.push(M.envMapCubeUVHeight),S.push(M.mapUv),S.push(M.alphaMapUv),S.push(M.lightMapUv),S.push(M.aoMapUv),S.push(M.bumpMapUv),S.push(M.normalMapUv),S.push(M.displacementMapUv),S.push(M.emissiveMapUv),S.push(M.metalnessMapUv),S.push(M.roughnessMapUv),S.push(M.anisotropyMapUv),S.push(M.clearcoatMapUv),S.push(M.clearcoatNormalMapUv),S.push(M.clearcoatRoughnessMapUv),S.push(M.iridescenceMapUv),S.push(M.iridescenceThicknessMapUv),S.push(M.sheenColorMapUv),S.push(M.sheenRoughnessMapUv),S.push(M.specularMapUv),S.push(M.specularColorMapUv),S.push(M.specularIntensityMapUv),S.push(M.transmissionMapUv),S.push(M.thicknessMapUv),S.push(M.combine),S.push(M.fogExp2),S.push(M.sizeAttenuation),S.push(M.morphTargetsCount),S.push(M.morphAttributeCount),S.push(M.numDirLights),S.push(M.numPointLights),S.push(M.numSpotLights),S.push(M.numSpotLightMaps),S.push(M.numHemiLights),S.push(M.numRectAreaLights),S.push(M.numDirLightShadows),S.push(M.numPointLightShadows),S.push(M.numSpotLightShadows),S.push(M.numSpotLightShadowsWithMaps),S.push(M.numLightProbes),S.push(M.shadowMapType),S.push(M.toneMapping),S.push(M.numClippingPlanes),S.push(M.numClipIntersection),S.push(M.depthPacking)}function y(S,M){o.disableAll(),M.supportsVertexTextures&&o.enable(0),M.instancing&&o.enable(1),M.instancingColor&&o.enable(2),M.instancingMorph&&o.enable(3),M.matcap&&o.enable(4),M.envMap&&o.enable(5),M.normalMapObjectSpace&&o.enable(6),M.normalMapTangentSpace&&o.enable(7),M.clearcoat&&o.enable(8),M.iridescence&&o.enable(9),M.alphaTest&&o.enable(10),M.vertexColors&&o.enable(11),M.vertexAlphas&&o.enable(12),M.vertexUv1s&&o.enable(13),M.vertexUv2s&&o.enable(14),M.vertexUv3s&&o.enable(15),M.vertexTangents&&o.enable(16),M.anisotropy&&o.enable(17),M.alphaHash&&o.enable(18),M.batching&&o.enable(19),M.dispersion&&o.enable(20),M.batchingColor&&o.enable(21),S.push(o.mask),o.disableAll(),M.fog&&o.enable(0),M.useFog&&o.enable(1),M.flatShading&&o.enable(2),M.logarithmicDepthBuffer&&o.enable(3),M.reverseDepthBuffer&&o.enable(4),M.skinning&&o.enable(5),M.morphTargets&&o.enable(6),M.morphNormals&&o.enable(7),M.morphColors&&o.enable(8),M.premultipliedAlpha&&o.enable(9),M.shadowMapEnabled&&o.enable(10),M.doubleSided&&o.enable(11),M.flipSided&&o.enable(12),M.useDepthPacking&&o.enable(13),M.dithering&&o.enable(14),M.transmission&&o.enable(15),M.sheen&&o.enable(16),M.opaque&&o.enable(17),M.pointsUvs&&o.enable(18),M.decodeVideoTexture&&o.enable(19),M.decodeVideoTextureEmissive&&o.enable(20),M.alphaToCoverage&&o.enable(21),S.push(o.mask)}function E(S){const M=g[S.type];let C;if(M){const H=Ye[M];C=al.clone(H.uniforms)}else C=S.uniforms;return C}function L(S,M){let C;for(let H=0,O=h.length;H<O;H++){const X=h[H];if(X.cacheKey===M){C=X,++C.usedTimes;break}}return C===void 0&&(C=new Jd(n,M,S,s),h.push(C)),C}function w(S){if(--S.usedTimes===0){const M=h.indexOf(S);h[M]=h[h.length-1],h.pop(),S.destroy()}}function R(S){c.remove(S)}function A(){c.dispose()}return{getParameters:p,getProgramCacheKey:d,getUniforms:E,acquireProgram:L,releaseProgram:w,releaseShaderCache:R,programs:h,dispose:A}}function nf(){let n=new WeakMap;function t(a){return n.has(a)}function e(a){let o=n.get(a);return o===void 0&&(o={},n.set(a,o)),o}function i(a){n.delete(a)}function r(a,o,c){n.get(a)[o]=c}function s(){n=new WeakMap}return{has:t,get:e,remove:i,update:r,dispose:s}}function rf(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.material.id!==t.material.id?n.material.id-t.material.id:n.z!==t.z?n.z-t.z:n.id-t.id}function Uo(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.z!==t.z?t.z-n.z:n.id-t.id}function Fo(){const n=[];let t=0;const e=[],i=[],r=[];function s(){t=0,e.length=0,i.length=0,r.length=0}function a(u,f,m,g,_,p){let d=n[t];return d===void 0?(d={id:u.id,object:u,geometry:f,material:m,groupOrder:g,renderOrder:u.renderOrder,z:_,group:p},n[t]=d):(d.id=u.id,d.object=u,d.geometry=f,d.material=m,d.groupOrder=g,d.renderOrder=u.renderOrder,d.z=_,d.group=p),t++,d}function o(u,f,m,g,_,p){const d=a(u,f,m,g,_,p);m.transmission>0?i.push(d):m.transparent===!0?r.push(d):e.push(d)}function c(u,f,m,g,_,p){const d=a(u,f,m,g,_,p);m.transmission>0?i.unshift(d):m.transparent===!0?r.unshift(d):e.unshift(d)}function l(u,f){e.length>1&&e.sort(u||rf),i.length>1&&i.sort(f||Uo),r.length>1&&r.sort(f||Uo)}function h(){for(let u=t,f=n.length;u<f;u++){const m=n[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:e,transmissive:i,transparent:r,init:s,push:o,unshift:c,finish:h,sort:l}}function sf(){let n=new WeakMap;function t(i,r){const s=n.get(i);let a;return s===void 0?(a=new Fo,n.set(i,[a])):r>=s.length?(a=new Fo,s.push(a)):a=s[r],a}function e(){n=new WeakMap}return{get:t,dispose:e}}function of(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new P,color:new Ft};break;case"SpotLight":e={position:new P,direction:new P,color:new Ft,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new P,color:new Ft,distance:0,decay:0};break;case"HemisphereLight":e={direction:new P,skyColor:new Ft,groundColor:new Ft};break;case"RectAreaLight":e={color:new Ft,position:new P,halfWidth:new P,halfHeight:new P};break}return n[t.id]=e,e}}}function af(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ot};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ot};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ot,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[t.id]=e,e}}}let cf=0;function lf(n,t){return(t.castShadow?2:0)-(n.castShadow?2:0)+(t.map?1:0)-(n.map?1:0)}function hf(n){const t=new of,e=af(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)i.probe.push(new P);const r=new P,s=new Jt,a=new Jt;function o(l){let h=0,u=0,f=0;for(let S=0;S<9;S++)i.probe[S].set(0,0,0);let m=0,g=0,_=0,p=0,d=0,b=0,y=0,E=0,L=0,w=0,R=0;l.sort(lf);for(let S=0,M=l.length;S<M;S++){const C=l[S],H=C.color,O=C.intensity,X=C.distance,G=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)h+=H.r*O,u+=H.g*O,f+=H.b*O;else if(C.isLightProbe){for(let V=0;V<9;V++)i.probe[V].addScaledVector(C.sh.coefficients[V],O);R++}else if(C.isDirectionalLight){const V=t.get(C);if(V.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const $=C.shadow,z=e.get(C);z.shadowIntensity=$.intensity,z.shadowBias=$.bias,z.shadowNormalBias=$.normalBias,z.shadowRadius=$.radius,z.shadowMapSize=$.mapSize,i.directionalShadow[m]=z,i.directionalShadowMap[m]=G,i.directionalShadowMatrix[m]=C.shadow.matrix,b++}i.directional[m]=V,m++}else if(C.isSpotLight){const V=t.get(C);V.position.setFromMatrixPosition(C.matrixWorld),V.color.copy(H).multiplyScalar(O),V.distance=X,V.coneCos=Math.cos(C.angle),V.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),V.decay=C.decay,i.spot[_]=V;const $=C.shadow;if(C.map&&(i.spotLightMap[L]=C.map,L++,$.updateMatrices(C),C.castShadow&&w++),i.spotLightMatrix[_]=$.matrix,C.castShadow){const z=e.get(C);z.shadowIntensity=$.intensity,z.shadowBias=$.bias,z.shadowNormalBias=$.normalBias,z.shadowRadius=$.radius,z.shadowMapSize=$.mapSize,i.spotShadow[_]=z,i.spotShadowMap[_]=G,E++}_++}else if(C.isRectAreaLight){const V=t.get(C);V.color.copy(H).multiplyScalar(O),V.halfWidth.set(C.width*.5,0,0),V.halfHeight.set(0,C.height*.5,0),i.rectArea[p]=V,p++}else if(C.isPointLight){const V=t.get(C);if(V.color.copy(C.color).multiplyScalar(C.intensity),V.distance=C.distance,V.decay=C.decay,C.castShadow){const $=C.shadow,z=e.get(C);z.shadowIntensity=$.intensity,z.shadowBias=$.bias,z.shadowNormalBias=$.normalBias,z.shadowRadius=$.radius,z.shadowMapSize=$.mapSize,z.shadowCameraNear=$.camera.near,z.shadowCameraFar=$.camera.far,i.pointShadow[g]=z,i.pointShadowMap[g]=G,i.pointShadowMatrix[g]=C.shadow.matrix,y++}i.point[g]=V,g++}else if(C.isHemisphereLight){const V=t.get(C);V.skyColor.copy(C.color).multiplyScalar(O),V.groundColor.copy(C.groundColor).multiplyScalar(O),i.hemi[d]=V,d++}}p>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=it.LTC_FLOAT_1,i.rectAreaLTC2=it.LTC_FLOAT_2):(i.rectAreaLTC1=it.LTC_HALF_1,i.rectAreaLTC2=it.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=u,i.ambient[2]=f;const A=i.hash;(A.directionalLength!==m||A.pointLength!==g||A.spotLength!==_||A.rectAreaLength!==p||A.hemiLength!==d||A.numDirectionalShadows!==b||A.numPointShadows!==y||A.numSpotShadows!==E||A.numSpotMaps!==L||A.numLightProbes!==R)&&(i.directional.length=m,i.spot.length=_,i.rectArea.length=p,i.point.length=g,i.hemi.length=d,i.directionalShadow.length=b,i.directionalShadowMap.length=b,i.pointShadow.length=y,i.pointShadowMap.length=y,i.spotShadow.length=E,i.spotShadowMap.length=E,i.directionalShadowMatrix.length=b,i.pointShadowMatrix.length=y,i.spotLightMatrix.length=E+L-w,i.spotLightMap.length=L,i.numSpotLightShadowsWithMaps=w,i.numLightProbes=R,A.directionalLength=m,A.pointLength=g,A.spotLength=_,A.rectAreaLength=p,A.hemiLength=d,A.numDirectionalShadows=b,A.numPointShadows=y,A.numSpotShadows=E,A.numSpotMaps=L,A.numLightProbes=R,i.version=cf++)}function c(l,h){let u=0,f=0,m=0,g=0,_=0;const p=h.matrixWorldInverse;for(let d=0,b=l.length;d<b;d++){const y=l[d];if(y.isDirectionalLight){const E=i.directional[u];E.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),E.direction.sub(r),E.direction.transformDirection(p),u++}else if(y.isSpotLight){const E=i.spot[m];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(p),E.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),E.direction.sub(r),E.direction.transformDirection(p),m++}else if(y.isRectAreaLight){const E=i.rectArea[g];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(p),a.identity(),s.copy(y.matrixWorld),s.premultiply(p),a.extractRotation(s),E.halfWidth.set(y.width*.5,0,0),E.halfHeight.set(0,y.height*.5,0),E.halfWidth.applyMatrix4(a),E.halfHeight.applyMatrix4(a),g++}else if(y.isPointLight){const E=i.point[f];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(p),f++}else if(y.isHemisphereLight){const E=i.hemi[_];E.direction.setFromMatrixPosition(y.matrixWorld),E.direction.transformDirection(p),_++}}}return{setup:o,setupView:c,state:i}}function No(n){const t=new hf(n),e=[],i=[];function r(h){l.camera=h,e.length=0,i.length=0}function s(h){e.push(h)}function a(h){i.push(h)}function o(){t.setup(e)}function c(h){t.setupView(e,h)}const l={lightsArray:e,shadowsArray:i,camera:null,lights:t,transmissionRenderTarget:{}};return{init:r,state:l,setupLights:o,setupLightsView:c,pushLight:s,pushShadow:a}}function uf(n){let t=new WeakMap;function e(r,s=0){const a=t.get(r);let o;return a===void 0?(o=new No(n),t.set(r,[o])):s>=a.length?(o=new No(n),a.push(o)):o=a[s],o}function i(){t=new WeakMap}return{get:e,dispose:i}}const df=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,ff=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function pf(n,t,e){let i=new kr;const r=new Ot,s=new Ot,a=new ie,o=new _l({depthPacking:3201}),c=new vl,l={},h=e.maxTextureSize,u={0:1,1:0,2:2},f=new un({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ot},radius:{value:4}},vertexShader:df,fragmentShader:ff}),m=f.clone();m.defines.HORIZONTAL_PASS=1;const g=new He;g.setAttribute("position",new Qt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new Re(g,f),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let d=this.type;this.render=function(w,R,A){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||w.length===0)return;const S=n.getRenderTarget(),M=n.getActiveCubeFace(),C=n.getActiveMipmapLevel(),H=n.state;H.setBlending(0),H.buffers.color.setClear(1,1,1,1),H.buffers.depth.setTest(!0),H.setScissorTest(!1);const O=d!==3&&this.type===3,X=d===3&&this.type!==3;for(let G=0,V=w.length;G<V;G++){const $=w[G],z=$.shadow;if(z===void 0){console.warn("THREE.WebGLShadowMap:",$,"has no shadow.");continue}if(z.autoUpdate===!1&&z.needsUpdate===!1)continue;r.copy(z.mapSize);const rt=z.getFrameExtents();if(r.multiply(rt),s.copy(z.mapSize),(r.x>h||r.y>h)&&(r.x>h&&(s.x=Math.floor(h/rt.x),r.x=s.x*rt.x,z.mapSize.x=s.x),r.y>h&&(s.y=Math.floor(h/rt.y),r.y=s.y*rt.y,z.mapSize.y=s.y)),z.map===null||O===!0||X===!0){const j=this.type!==3?{minFilter:1003,magFilter:1003}:{};z.map!==null&&z.map.dispose(),z.map=new gn(r.x,r.y,j),z.map.texture.name=$.name+".shadowMap",z.camera.updateProjectionMatrix()}n.setRenderTarget(z.map),n.clear();const ut=z.getViewportCount();for(let j=0;j<ut;j++){const dt=z.getViewport(j);a.set(s.x*dt.x,s.y*dt.y,s.x*dt.z,s.y*dt.w),H.viewport(a),z.updateMatrices($,j),i=z.getFrustum(),E(R,A,z.camera,$,this.type)}z.isPointLightShadow!==!0&&this.type===3&&b(z,A),z.needsUpdate=!1}d=this.type,p.needsUpdate=!1,n.setRenderTarget(S,M,C)};function b(w,R){const A=t.update(_);f.defines.VSM_SAMPLES!==w.blurSamples&&(f.defines.VSM_SAMPLES=w.blurSamples,m.defines.VSM_SAMPLES=w.blurSamples,f.needsUpdate=!0,m.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new gn(r.x,r.y)),f.uniforms.shadow_pass.value=w.map.texture,f.uniforms.resolution.value=w.mapSize,f.uniforms.radius.value=w.radius,n.setRenderTarget(w.mapPass),n.clear(),n.renderBufferDirect(R,null,A,f,_,null),m.uniforms.shadow_pass.value=w.mapPass.texture,m.uniforms.resolution.value=w.mapSize,m.uniforms.radius.value=w.radius,n.setRenderTarget(w.map),n.clear(),n.renderBufferDirect(R,null,A,m,_,null)}function y(w,R,A,S){let M=null;const C=A.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(C!==void 0)M=C;else if(M=A.isPointLight===!0?c:o,n.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0){const H=M.uuid,O=R.uuid;let X=l[H];X===void 0&&(X={},l[H]=X);let G=X[O];G===void 0&&(G=M.clone(),X[O]=G,R.addEventListener("dispose",L)),M=G}if(M.visible=R.visible,M.wireframe=R.wireframe,S===3?M.side=R.shadowSide!==null?R.shadowSide:R.side:M.side=R.shadowSide!==null?R.shadowSide:u[R.side],M.alphaMap=R.alphaMap,M.alphaTest=R.alphaTest,M.map=R.map,M.clipShadows=R.clipShadows,M.clippingPlanes=R.clippingPlanes,M.clipIntersection=R.clipIntersection,M.displacementMap=R.displacementMap,M.displacementScale=R.displacementScale,M.displacementBias=R.displacementBias,M.wireframeLinewidth=R.wireframeLinewidth,M.linewidth=R.linewidth,A.isPointLight===!0&&M.isMeshDistanceMaterial===!0){const H=n.properties.get(M);H.light=A}return M}function E(w,R,A,S,M){if(w.visible===!1)return;if(w.layers.test(R.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&M===3)&&(!w.frustumCulled||i.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(A.matrixWorldInverse,w.matrixWorld);const O=t.update(w),X=w.material;if(Array.isArray(X)){const G=O.groups;for(let V=0,$=G.length;V<$;V++){const z=G[V],rt=X[z.materialIndex];if(rt&&rt.visible){const ut=y(w,rt,S,M);w.onBeforeShadow(n,w,R,A,O,ut,z),n.renderBufferDirect(A,null,O,ut,w,z),w.onAfterShadow(n,w,R,A,O,ut,z)}}}else if(X.visible){const G=y(w,X,S,M);w.onBeforeShadow(n,w,R,A,O,G,null),n.renderBufferDirect(A,null,O,G,w,null),w.onAfterShadow(n,w,R,A,O,G,null)}}const H=w.children;for(let O=0,X=H.length;O<X;O++)E(H[O],R,A,S,M)}function L(w){w.target.removeEventListener("dispose",L);for(const A in l){const S=l[A],M=w.target.uuid;M in S&&(S[M].dispose(),delete S[M])}}}const mf={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3};function gf(n,t){function e(){let I=!1;const st=new ie;let W=null;const Z=new ie(0,0,0,0);return{setMask:function(ht){W!==ht&&!I&&(n.colorMask(ht,ht,ht,ht),W=ht)},setLocked:function(ht){I=ht},setClear:function(ht,lt,Lt,re,Me){Me===!0&&(ht*=re,lt*=re,Lt*=re),st.set(ht,lt,Lt,re),Z.equals(st)===!1&&(n.clearColor(ht,lt,Lt,re),Z.copy(st))},reset:function(){I=!1,W=null,Z.set(-1,0,0,0)}}}function i(){let I=!1,st=!1,W=null,Z=null,ht=null;return{setReversed:function(lt){if(st!==lt){const Lt=t.get("EXT_clip_control");st?Lt.clipControlEXT(Lt.LOWER_LEFT_EXT,Lt.ZERO_TO_ONE_EXT):Lt.clipControlEXT(Lt.LOWER_LEFT_EXT,Lt.NEGATIVE_ONE_TO_ONE_EXT);const re=ht;ht=null,this.setClear(re)}st=lt},getReversed:function(){return st},setTest:function(lt){lt?at(n.DEPTH_TEST):wt(n.DEPTH_TEST)},setMask:function(lt){W!==lt&&!I&&(n.depthMask(lt),W=lt)},setFunc:function(lt){if(st&&(lt=mf[lt]),Z!==lt){switch(lt){case 0:n.depthFunc(n.NEVER);break;case 1:n.depthFunc(n.ALWAYS);break;case 2:n.depthFunc(n.LESS);break;case 3:n.depthFunc(n.LEQUAL);break;case 4:n.depthFunc(n.EQUAL);break;case 5:n.depthFunc(n.GEQUAL);break;case 6:n.depthFunc(n.GREATER);break;case 7:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}Z=lt}},setLocked:function(lt){I=lt},setClear:function(lt){ht!==lt&&(st&&(lt=1-lt),n.clearDepth(lt),ht=lt)},reset:function(){I=!1,W=null,Z=null,ht=null,st=!1}}}function r(){let I=!1,st=null,W=null,Z=null,ht=null,lt=null,Lt=null,re=null,Me=null;return{setTest:function(Kt){I||(Kt?at(n.STENCIL_TEST):wt(n.STENCIL_TEST))},setMask:function(Kt){st!==Kt&&!I&&(n.stencilMask(Kt),st=Kt)},setFunc:function(Kt,We,sn){(W!==Kt||Z!==We||ht!==sn)&&(n.stencilFunc(Kt,We,sn),W=Kt,Z=We,ht=sn)},setOp:function(Kt,We,sn){(lt!==Kt||Lt!==We||re!==sn)&&(n.stencilOp(Kt,We,sn),lt=Kt,Lt=We,re=sn)},setLocked:function(Kt){I=Kt},setClear:function(Kt){Me!==Kt&&(n.clearStencil(Kt),Me=Kt)},reset:function(){I=!1,st=null,W=null,Z=null,ht=null,lt=null,Lt=null,re=null,Me=null}}}const s=new e,a=new i,o=new r,c=new WeakMap,l=new WeakMap;let h={},u={},f=new WeakMap,m=[],g=null,_=!1,p=null,d=null,b=null,y=null,E=null,L=null,w=null,R=new Ft(0,0,0),A=0,S=!1,M=null,C=null,H=null,O=null,X=null;const G=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let V=!1,$=0;const z=n.getParameter(n.VERSION);z.indexOf("WebGL")!==-1?($=parseFloat(/^WebGL (\d)/.exec(z)[1]),V=$>=1):z.indexOf("OpenGL ES")!==-1&&($=parseFloat(/^OpenGL ES (\d)/.exec(z)[1]),V=$>=2);let rt=null,ut={};const j=n.getParameter(n.SCISSOR_BOX),dt=n.getParameter(n.VIEWPORT),Mt=new ie().fromArray(j),q=new ie().fromArray(dt);function et(I,st,W,Z){const ht=new Uint8Array(4),lt=n.createTexture();n.bindTexture(I,lt),n.texParameteri(I,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(I,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Lt=0;Lt<W;Lt++)I===n.TEXTURE_3D||I===n.TEXTURE_2D_ARRAY?n.texImage3D(st,0,n.RGBA,1,1,Z,0,n.RGBA,n.UNSIGNED_BYTE,ht):n.texImage2D(st+Lt,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,ht);return lt}const pt={};pt[n.TEXTURE_2D]=et(n.TEXTURE_2D,n.TEXTURE_2D,1),pt[n.TEXTURE_CUBE_MAP]=et(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),pt[n.TEXTURE_2D_ARRAY]=et(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),pt[n.TEXTURE_3D]=et(n.TEXTURE_3D,n.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),at(n.DEPTH_TEST),a.setFunc(3),kt(!1),zt(1),at(n.CULL_FACE),D(0);function at(I){h[I]!==!0&&(n.enable(I),h[I]=!0)}function wt(I){h[I]!==!1&&(n.disable(I),h[I]=!1)}function Rt(I,st){return u[I]!==st?(n.bindFramebuffer(I,st),u[I]=st,I===n.DRAW_FRAMEBUFFER&&(u[n.FRAMEBUFFER]=st),I===n.FRAMEBUFFER&&(u[n.DRAW_FRAMEBUFFER]=st),!0):!1}function Nt(I,st){let W=m,Z=!1;if(I){W=f.get(st),W===void 0&&(W=[],f.set(st,W));const ht=I.textures;if(W.length!==ht.length||W[0]!==n.COLOR_ATTACHMENT0){for(let lt=0,Lt=ht.length;lt<Lt;lt++)W[lt]=n.COLOR_ATTACHMENT0+lt;W.length=ht.length,Z=!0}}else W[0]!==n.BACK&&(W[0]=n.BACK,Z=!0);Z&&n.drawBuffers(W)}function ne(I){return g!==I?(n.useProgram(I),g=I,!0):!1}const Ht={100:n.FUNC_ADD,101:n.FUNC_SUBTRACT,102:n.FUNC_REVERSE_SUBTRACT};Ht[103]=n.MIN,Ht[104]=n.MAX;const oe={200:n.ZERO,201:n.ONE,202:n.SRC_COLOR,204:n.SRC_ALPHA,210:n.SRC_ALPHA_SATURATE,208:n.DST_COLOR,206:n.DST_ALPHA,203:n.ONE_MINUS_SRC_COLOR,205:n.ONE_MINUS_SRC_ALPHA,209:n.ONE_MINUS_DST_COLOR,207:n.ONE_MINUS_DST_ALPHA,211:n.CONSTANT_COLOR,212:n.ONE_MINUS_CONSTANT_COLOR,213:n.CONSTANT_ALPHA,214:n.ONE_MINUS_CONSTANT_ALPHA};function D(I,st,W,Z,ht,lt,Lt,re,Me,Kt){if(I===0){_===!0&&(wt(n.BLEND),_=!1);return}if(_===!1&&(at(n.BLEND),_=!0),I!==5){if(I!==p||Kt!==S){if((d!==100||E!==100)&&(n.blendEquation(n.FUNC_ADD),d=100,E=100),Kt)switch(I){case 1:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case 2:n.blendFunc(n.ONE,n.ONE);break;case 3:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case 4:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}else switch(I){case 1:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case 2:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case 3:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case 4:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}b=null,y=null,L=null,w=null,R.set(0,0,0),A=0,p=I,S=Kt}return}ht=ht||st,lt=lt||W,Lt=Lt||Z,(st!==d||ht!==E)&&(n.blendEquationSeparate(Ht[st],Ht[ht]),d=st,E=ht),(W!==b||Z!==y||lt!==L||Lt!==w)&&(n.blendFuncSeparate(oe[W],oe[Z],oe[lt],oe[Lt]),b=W,y=Z,L=lt,w=Lt),(re.equals(R)===!1||Me!==A)&&(n.blendColor(re.r,re.g,re.b,Me),R.copy(re),A=Me),p=I,S=!1}function Ue(I,st){I.side===2?wt(n.CULL_FACE):at(n.CULL_FACE);let W=I.side===1;st&&(W=!W),kt(W),I.blending===1&&I.transparent===!1?D(0):D(I.blending,I.blendEquation,I.blendSrc,I.blendDst,I.blendEquationAlpha,I.blendSrcAlpha,I.blendDstAlpha,I.blendColor,I.blendAlpha,I.premultipliedAlpha),a.setFunc(I.depthFunc),a.setTest(I.depthTest),a.setMask(I.depthWrite),s.setMask(I.colorWrite);const Z=I.stencilWrite;o.setTest(Z),Z&&(o.setMask(I.stencilWriteMask),o.setFunc(I.stencilFunc,I.stencilRef,I.stencilFuncMask),o.setOp(I.stencilFail,I.stencilZFail,I.stencilZPass)),te(I.polygonOffset,I.polygonOffsetFactor,I.polygonOffsetUnits),I.alphaToCoverage===!0?at(n.SAMPLE_ALPHA_TO_COVERAGE):wt(n.SAMPLE_ALPHA_TO_COVERAGE)}function kt(I){M!==I&&(I?n.frontFace(n.CW):n.frontFace(n.CCW),M=I)}function zt(I){I!==0?(at(n.CULL_FACE),I!==C&&(I===1?n.cullFace(n.BACK):I===2?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):wt(n.CULL_FACE),C=I}function St(I){I!==H&&(V&&n.lineWidth(I),H=I)}function te(I,st,W){I?(at(n.POLYGON_OFFSET_FILL),(O!==st||X!==W)&&(n.polygonOffset(st,W),O=st,X=W)):wt(n.POLYGON_OFFSET_FILL)}function yt(I){I?at(n.SCISSOR_TEST):wt(n.SCISSOR_TEST)}function T(I){I===void 0&&(I=n.TEXTURE0+G-1),rt!==I&&(n.activeTexture(I),rt=I)}function v(I,st,W){W===void 0&&(rt===null?W=n.TEXTURE0+G-1:W=rt);let Z=ut[W];Z===void 0&&(Z={type:void 0,texture:void 0},ut[W]=Z),(Z.type!==I||Z.texture!==st)&&(rt!==W&&(n.activeTexture(W),rt=W),n.bindTexture(I,st||pt[I]),Z.type=I,Z.texture=st)}function N(){const I=ut[rt];I!==void 0&&I.type!==void 0&&(n.bindTexture(I.type,null),I.type=void 0,I.texture=void 0)}function K(){try{n.compressedTexImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function J(){try{n.compressedTexImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Y(){try{n.texSubImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function xt(){try{n.texSubImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ct(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function mt(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Vt(){try{n.texStorage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function nt(){try{n.texStorage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function gt(){try{n.texImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Tt(){try{n.texImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function At(I){Mt.equals(I)===!1&&(n.scissor(I.x,I.y,I.z,I.w),Mt.copy(I))}function _t(I){q.equals(I)===!1&&(n.viewport(I.x,I.y,I.z,I.w),q.copy(I))}function Gt(I,st){let W=l.get(st);W===void 0&&(W=new WeakMap,l.set(st,W));let Z=W.get(I);Z===void 0&&(Z=n.getUniformBlockIndex(st,I.name),W.set(I,Z))}function Ut(I,st){const Z=l.get(st).get(I);c.get(st)!==Z&&(n.uniformBlockBinding(st,Z,I.__bindingPointIndex),c.set(st,Z))}function $t(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),a.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),h={},rt=null,ut={},u={},f=new WeakMap,m=[],g=null,_=!1,p=null,d=null,b=null,y=null,E=null,L=null,w=null,R=new Ft(0,0,0),A=0,S=!1,M=null,C=null,H=null,O=null,X=null,Mt.set(0,0,n.canvas.width,n.canvas.height),q.set(0,0,n.canvas.width,n.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:at,disable:wt,bindFramebuffer:Rt,drawBuffers:Nt,useProgram:ne,setBlending:D,setMaterial:Ue,setFlipSided:kt,setCullFace:zt,setLineWidth:St,setPolygonOffset:te,setScissorTest:yt,activeTexture:T,bindTexture:v,unbindTexture:N,compressedTexImage2D:K,compressedTexImage3D:J,texImage2D:gt,texImage3D:Tt,updateUBOMapping:Gt,uniformBlockBinding:Ut,texStorage2D:Vt,texStorage3D:nt,texSubImage2D:Y,texSubImage3D:xt,compressedTexSubImage2D:ct,compressedTexSubImage3D:mt,scissor:At,viewport:_t,reset:$t}}function _f(n,t,e,i,r,s,a){const o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Ot,h=new WeakMap;let u;const f=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(T,v){return m?new OffscreenCanvas(T,v):Si("canvas")}function _(T,v,N){let K=1;const J=yt(T);if((J.width>N||J.height>N)&&(K=N/Math.max(J.width,J.height)),K<1)if(typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&T instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&T instanceof ImageBitmap||typeof VideoFrame<"u"&&T instanceof VideoFrame){const Y=Math.floor(K*J.width),xt=Math.floor(K*J.height);u===void 0&&(u=g(Y,xt));const ct=v?g(Y,xt):u;return ct.width=Y,ct.height=xt,ct.getContext("2d").drawImage(T,0,0,Y,xt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+J.width+"x"+J.height+") to ("+Y+"x"+xt+")."),ct}else return"data"in T&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+J.width+"x"+J.height+")."),T;return T}function p(T){return T.generateMipmaps}function d(T){n.generateMipmap(T)}function b(T){return T.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:T.isWebGL3DRenderTarget?n.TEXTURE_3D:T.isWebGLArrayRenderTarget||T.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function y(T,v,N,K,J=!1){if(T!==null){if(n[T]!==void 0)return n[T];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+T+"'")}let Y=v;if(v===n.RED&&(N===n.FLOAT&&(Y=n.R32F),N===n.HALF_FLOAT&&(Y=n.R16F),N===n.UNSIGNED_BYTE&&(Y=n.R8)),v===n.RED_INTEGER&&(N===n.UNSIGNED_BYTE&&(Y=n.R8UI),N===n.UNSIGNED_SHORT&&(Y=n.R16UI),N===n.UNSIGNED_INT&&(Y=n.R32UI),N===n.BYTE&&(Y=n.R8I),N===n.SHORT&&(Y=n.R16I),N===n.INT&&(Y=n.R32I)),v===n.RG&&(N===n.FLOAT&&(Y=n.RG32F),N===n.HALF_FLOAT&&(Y=n.RG16F),N===n.UNSIGNED_BYTE&&(Y=n.RG8)),v===n.RG_INTEGER&&(N===n.UNSIGNED_BYTE&&(Y=n.RG8UI),N===n.UNSIGNED_SHORT&&(Y=n.RG16UI),N===n.UNSIGNED_INT&&(Y=n.RG32UI),N===n.BYTE&&(Y=n.RG8I),N===n.SHORT&&(Y=n.RG16I),N===n.INT&&(Y=n.RG32I)),v===n.RGB_INTEGER&&(N===n.UNSIGNED_BYTE&&(Y=n.RGB8UI),N===n.UNSIGNED_SHORT&&(Y=n.RGB16UI),N===n.UNSIGNED_INT&&(Y=n.RGB32UI),N===n.BYTE&&(Y=n.RGB8I),N===n.SHORT&&(Y=n.RGB16I),N===n.INT&&(Y=n.RGB32I)),v===n.RGBA_INTEGER&&(N===n.UNSIGNED_BYTE&&(Y=n.RGBA8UI),N===n.UNSIGNED_SHORT&&(Y=n.RGBA16UI),N===n.UNSIGNED_INT&&(Y=n.RGBA32UI),N===n.BYTE&&(Y=n.RGBA8I),N===n.SHORT&&(Y=n.RGBA16I),N===n.INT&&(Y=n.RGBA32I)),v===n.RGB&&N===n.UNSIGNED_INT_5_9_9_9_REV&&(Y=n.RGB9_E5),v===n.RGBA){const xt=J?yi:Xt.getTransfer(K);N===n.FLOAT&&(Y=n.RGBA32F),N===n.HALF_FLOAT&&(Y=n.RGBA16F),N===n.UNSIGNED_BYTE&&(Y=xt===Zt?n.SRGB8_ALPHA8:n.RGBA8),N===n.UNSIGNED_SHORT_4_4_4_4&&(Y=n.RGBA4),N===n.UNSIGNED_SHORT_5_5_5_1&&(Y=n.RGB5_A1)}return(Y===n.R16F||Y===n.R32F||Y===n.RG16F||Y===n.RG32F||Y===n.RGBA16F||Y===n.RGBA32F)&&t.get("EXT_color_buffer_float"),Y}function E(T,v){let N;return T?v===null||v===1014||v===1020?N=n.DEPTH24_STENCIL8:v===1015?N=n.DEPTH32F_STENCIL8:v===1012&&(N=n.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===1014||v===1020?N=n.DEPTH_COMPONENT24:v===1015?N=n.DEPTH_COMPONENT32F:v===1012&&(N=n.DEPTH_COMPONENT16),N}function L(T,v){return p(T)===!0||T.isFramebufferTexture&&T.minFilter!==1003&&T.minFilter!==1006?Math.log2(Math.max(v.width,v.height))+1:T.mipmaps!==void 0&&T.mipmaps.length>0?T.mipmaps.length:T.isCompressedTexture&&Array.isArray(T.image)?v.mipmaps.length:1}function w(T){const v=T.target;v.removeEventListener("dispose",w),A(v),v.isVideoTexture&&h.delete(v)}function R(T){const v=T.target;v.removeEventListener("dispose",R),M(v)}function A(T){const v=i.get(T);if(v.__webglInit===void 0)return;const N=T.source,K=f.get(N);if(K){const J=K[v.__cacheKey];J.usedTimes--,J.usedTimes===0&&S(T),Object.keys(K).length===0&&f.delete(N)}i.remove(T)}function S(T){const v=i.get(T);n.deleteTexture(v.__webglTexture);const N=T.source,K=f.get(N);delete K[v.__cacheKey],a.memory.textures--}function M(T){const v=i.get(T);if(T.depthTexture&&(T.depthTexture.dispose(),i.remove(T.depthTexture)),T.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(v.__webglFramebuffer[K]))for(let J=0;J<v.__webglFramebuffer[K].length;J++)n.deleteFramebuffer(v.__webglFramebuffer[K][J]);else n.deleteFramebuffer(v.__webglFramebuffer[K]);v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer[K])}else{if(Array.isArray(v.__webglFramebuffer))for(let K=0;K<v.__webglFramebuffer.length;K++)n.deleteFramebuffer(v.__webglFramebuffer[K]);else n.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&n.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let K=0;K<v.__webglColorRenderbuffer.length;K++)v.__webglColorRenderbuffer[K]&&n.deleteRenderbuffer(v.__webglColorRenderbuffer[K]);v.__webglDepthRenderbuffer&&n.deleteRenderbuffer(v.__webglDepthRenderbuffer)}const N=T.textures;for(let K=0,J=N.length;K<J;K++){const Y=i.get(N[K]);Y.__webglTexture&&(n.deleteTexture(Y.__webglTexture),a.memory.textures--),i.remove(N[K])}i.remove(T)}let C=0;function H(){C=0}function O(){const T=C;return T>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+T+" texture units while this GPU supports only "+r.maxTextures),C+=1,T}function X(T){const v=[];return v.push(T.wrapS),v.push(T.wrapT),v.push(T.wrapR||0),v.push(T.magFilter),v.push(T.minFilter),v.push(T.anisotropy),v.push(T.internalFormat),v.push(T.format),v.push(T.type),v.push(T.generateMipmaps),v.push(T.premultiplyAlpha),v.push(T.flipY),v.push(T.unpackAlignment),v.push(T.colorSpace),v.join()}function G(T,v){const N=i.get(T);if(T.isVideoTexture&&St(T),T.isRenderTargetTexture===!1&&T.version>0&&N.__version!==T.version){const K=T.image;if(K===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(K.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{q(N,T,v);return}}e.bindTexture(n.TEXTURE_2D,N.__webglTexture,n.TEXTURE0+v)}function V(T,v){const N=i.get(T);if(T.version>0&&N.__version!==T.version){q(N,T,v);return}e.bindTexture(n.TEXTURE_2D_ARRAY,N.__webglTexture,n.TEXTURE0+v)}function $(T,v){const N=i.get(T);if(T.version>0&&N.__version!==T.version){q(N,T,v);return}e.bindTexture(n.TEXTURE_3D,N.__webglTexture,n.TEXTURE0+v)}function z(T,v){const N=i.get(T);if(T.version>0&&N.__version!==T.version){et(N,T,v);return}e.bindTexture(n.TEXTURE_CUBE_MAP,N.__webglTexture,n.TEXTURE0+v)}const rt={1e3:n.REPEAT,1001:n.CLAMP_TO_EDGE,1002:n.MIRRORED_REPEAT},ut={1003:n.NEAREST,1004:n.NEAREST_MIPMAP_NEAREST,1005:n.NEAREST_MIPMAP_LINEAR,1006:n.LINEAR,1007:n.LINEAR_MIPMAP_NEAREST,1008:n.LINEAR_MIPMAP_LINEAR},j={512:n.NEVER,519:n.ALWAYS,513:n.LESS,515:n.LEQUAL,514:n.EQUAL,518:n.GEQUAL,516:n.GREATER,517:n.NOTEQUAL};function dt(T,v){if(v.type===1015&&t.has("OES_texture_float_linear")===!1&&(v.magFilter===1006||v.magFilter===1007||v.magFilter===1005||v.magFilter===1008||v.minFilter===1006||v.minFilter===1007||v.minFilter===1005||v.minFilter===1008)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(T,n.TEXTURE_WRAP_S,rt[v.wrapS]),n.texParameteri(T,n.TEXTURE_WRAP_T,rt[v.wrapT]),(T===n.TEXTURE_3D||T===n.TEXTURE_2D_ARRAY)&&n.texParameteri(T,n.TEXTURE_WRAP_R,rt[v.wrapR]),n.texParameteri(T,n.TEXTURE_MAG_FILTER,ut[v.magFilter]),n.texParameteri(T,n.TEXTURE_MIN_FILTER,ut[v.minFilter]),v.compareFunction&&(n.texParameteri(T,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(T,n.TEXTURE_COMPARE_FUNC,j[v.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===1003||v.minFilter!==1005&&v.minFilter!==1008||v.type===1015&&t.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||i.get(v).__currentAnisotropy){const N=t.get("EXT_texture_filter_anisotropic");n.texParameterf(T,N.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,r.getMaxAnisotropy())),i.get(v).__currentAnisotropy=v.anisotropy}}}function Mt(T,v){let N=!1;T.__webglInit===void 0&&(T.__webglInit=!0,v.addEventListener("dispose",w));const K=v.source;let J=f.get(K);J===void 0&&(J={},f.set(K,J));const Y=X(v);if(Y!==T.__cacheKey){J[Y]===void 0&&(J[Y]={texture:n.createTexture(),usedTimes:0},a.memory.textures++,N=!0),J[Y].usedTimes++;const xt=J[T.__cacheKey];xt!==void 0&&(J[T.__cacheKey].usedTimes--,xt.usedTimes===0&&S(v)),T.__cacheKey=Y,T.__webglTexture=J[Y].texture}return N}function q(T,v,N){let K=n.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(K=n.TEXTURE_2D_ARRAY),v.isData3DTexture&&(K=n.TEXTURE_3D);const J=Mt(T,v),Y=v.source;e.bindTexture(K,T.__webglTexture,n.TEXTURE0+N);const xt=i.get(Y);if(Y.version!==xt.__version||J===!0){e.activeTexture(n.TEXTURE0+N);const ct=Xt.getPrimaries(Xt.workingColorSpace),mt=v.colorSpace===""?null:Xt.getPrimaries(v.colorSpace),Vt=v.colorSpace===""||ct===mt?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Vt);let nt=_(v.image,!1,r.maxTextureSize);nt=te(v,nt);const gt=s.convert(v.format,v.colorSpace),Tt=s.convert(v.type);let At=y(v.internalFormat,gt,Tt,v.colorSpace,v.isVideoTexture);dt(K,v);let _t;const Gt=v.mipmaps,Ut=v.isVideoTexture!==!0,$t=xt.__version===void 0||J===!0,I=Y.dataReady,st=L(v,nt);if(v.isDepthTexture)At=E(v.format===1027,v.type),$t&&(Ut?e.texStorage2D(n.TEXTURE_2D,1,At,nt.width,nt.height):e.texImage2D(n.TEXTURE_2D,0,At,nt.width,nt.height,0,gt,Tt,null));else if(v.isDataTexture)if(Gt.length>0){Ut&&$t&&e.texStorage2D(n.TEXTURE_2D,st,At,Gt[0].width,Gt[0].height);for(let W=0,Z=Gt.length;W<Z;W++)_t=Gt[W],Ut?I&&e.texSubImage2D(n.TEXTURE_2D,W,0,0,_t.width,_t.height,gt,Tt,_t.data):e.texImage2D(n.TEXTURE_2D,W,At,_t.width,_t.height,0,gt,Tt,_t.data);v.generateMipmaps=!1}else Ut?($t&&e.texStorage2D(n.TEXTURE_2D,st,At,nt.width,nt.height),I&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,nt.width,nt.height,gt,Tt,nt.data)):e.texImage2D(n.TEXTURE_2D,0,At,nt.width,nt.height,0,gt,Tt,nt.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){Ut&&$t&&e.texStorage3D(n.TEXTURE_2D_ARRAY,st,At,Gt[0].width,Gt[0].height,nt.depth);for(let W=0,Z=Gt.length;W<Z;W++)if(_t=Gt[W],v.format!==1023)if(gt!==null)if(Ut){if(I)if(v.layerUpdates.size>0){const ht=oo(_t.width,_t.height,v.format,v.type);for(const lt of v.layerUpdates){const Lt=_t.data.subarray(lt*ht/_t.data.BYTES_PER_ELEMENT,(lt+1)*ht/_t.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,W,0,0,lt,_t.width,_t.height,1,gt,Lt)}v.clearLayerUpdates()}else e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,W,0,0,0,_t.width,_t.height,nt.depth,gt,_t.data)}else e.compressedTexImage3D(n.TEXTURE_2D_ARRAY,W,At,_t.width,_t.height,nt.depth,0,_t.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Ut?I&&e.texSubImage3D(n.TEXTURE_2D_ARRAY,W,0,0,0,_t.width,_t.height,nt.depth,gt,Tt,_t.data):e.texImage3D(n.TEXTURE_2D_ARRAY,W,At,_t.width,_t.height,nt.depth,0,gt,Tt,_t.data)}else{Ut&&$t&&e.texStorage2D(n.TEXTURE_2D,st,At,Gt[0].width,Gt[0].height);for(let W=0,Z=Gt.length;W<Z;W++)_t=Gt[W],v.format!==1023?gt!==null?Ut?I&&e.compressedTexSubImage2D(n.TEXTURE_2D,W,0,0,_t.width,_t.height,gt,_t.data):e.compressedTexImage2D(n.TEXTURE_2D,W,At,_t.width,_t.height,0,_t.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ut?I&&e.texSubImage2D(n.TEXTURE_2D,W,0,0,_t.width,_t.height,gt,Tt,_t.data):e.texImage2D(n.TEXTURE_2D,W,At,_t.width,_t.height,0,gt,Tt,_t.data)}else if(v.isDataArrayTexture)if(Ut){if($t&&e.texStorage3D(n.TEXTURE_2D_ARRAY,st,At,nt.width,nt.height,nt.depth),I)if(v.layerUpdates.size>0){const W=oo(nt.width,nt.height,v.format,v.type);for(const Z of v.layerUpdates){const ht=nt.data.subarray(Z*W/nt.data.BYTES_PER_ELEMENT,(Z+1)*W/nt.data.BYTES_PER_ELEMENT);e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,Z,nt.width,nt.height,1,gt,Tt,ht)}v.clearLayerUpdates()}else e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,nt.width,nt.height,nt.depth,gt,Tt,nt.data)}else e.texImage3D(n.TEXTURE_2D_ARRAY,0,At,nt.width,nt.height,nt.depth,0,gt,Tt,nt.data);else if(v.isData3DTexture)Ut?($t&&e.texStorage3D(n.TEXTURE_3D,st,At,nt.width,nt.height,nt.depth),I&&e.texSubImage3D(n.TEXTURE_3D,0,0,0,0,nt.width,nt.height,nt.depth,gt,Tt,nt.data)):e.texImage3D(n.TEXTURE_3D,0,At,nt.width,nt.height,nt.depth,0,gt,Tt,nt.data);else if(v.isFramebufferTexture){if($t)if(Ut)e.texStorage2D(n.TEXTURE_2D,st,At,nt.width,nt.height);else{let W=nt.width,Z=nt.height;for(let ht=0;ht<st;ht++)e.texImage2D(n.TEXTURE_2D,ht,At,W,Z,0,gt,Tt,null),W>>=1,Z>>=1}}else if(Gt.length>0){if(Ut&&$t){const W=yt(Gt[0]);e.texStorage2D(n.TEXTURE_2D,st,At,W.width,W.height)}for(let W=0,Z=Gt.length;W<Z;W++)_t=Gt[W],Ut?I&&e.texSubImage2D(n.TEXTURE_2D,W,0,0,gt,Tt,_t):e.texImage2D(n.TEXTURE_2D,W,At,gt,Tt,_t);v.generateMipmaps=!1}else if(Ut){if($t){const W=yt(nt);e.texStorage2D(n.TEXTURE_2D,st,At,W.width,W.height)}I&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,gt,Tt,nt)}else e.texImage2D(n.TEXTURE_2D,0,At,gt,Tt,nt);p(v)&&d(K),xt.__version=Y.version,v.onUpdate&&v.onUpdate(v)}T.__version=v.version}function et(T,v,N){if(v.image.length!==6)return;const K=Mt(T,v),J=v.source;e.bindTexture(n.TEXTURE_CUBE_MAP,T.__webglTexture,n.TEXTURE0+N);const Y=i.get(J);if(J.version!==Y.__version||K===!0){e.activeTexture(n.TEXTURE0+N);const xt=Xt.getPrimaries(Xt.workingColorSpace),ct=v.colorSpace===""?null:Xt.getPrimaries(v.colorSpace),mt=v.colorSpace===""||xt===ct?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,mt);const Vt=v.isCompressedTexture||v.image[0].isCompressedTexture,nt=v.image[0]&&v.image[0].isDataTexture,gt=[];for(let Z=0;Z<6;Z++)!Vt&&!nt?gt[Z]=_(v.image[Z],!0,r.maxCubemapSize):gt[Z]=nt?v.image[Z].image:v.image[Z],gt[Z]=te(v,gt[Z]);const Tt=gt[0],At=s.convert(v.format,v.colorSpace),_t=s.convert(v.type),Gt=y(v.internalFormat,At,_t,v.colorSpace),Ut=v.isVideoTexture!==!0,$t=Y.__version===void 0||K===!0,I=J.dataReady;let st=L(v,Tt);dt(n.TEXTURE_CUBE_MAP,v);let W;if(Vt){Ut&&$t&&e.texStorage2D(n.TEXTURE_CUBE_MAP,st,Gt,Tt.width,Tt.height);for(let Z=0;Z<6;Z++){W=gt[Z].mipmaps;for(let ht=0;ht<W.length;ht++){const lt=W[ht];v.format!==1023?At!==null?Ut?I&&e.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht,0,0,lt.width,lt.height,At,lt.data):e.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht,Gt,lt.width,lt.height,0,lt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Ut?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht,0,0,lt.width,lt.height,At,_t,lt.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht,Gt,lt.width,lt.height,0,At,_t,lt.data)}}}else{if(W=v.mipmaps,Ut&&$t){W.length>0&&st++;const Z=yt(gt[0]);e.texStorage2D(n.TEXTURE_CUBE_MAP,st,Gt,Z.width,Z.height)}for(let Z=0;Z<6;Z++)if(nt){Ut?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,gt[Z].width,gt[Z].height,At,_t,gt[Z].data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,Gt,gt[Z].width,gt[Z].height,0,At,_t,gt[Z].data);for(let ht=0;ht<W.length;ht++){const Lt=W[ht].image[Z].image;Ut?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht+1,0,0,Lt.width,Lt.height,At,_t,Lt.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht+1,Gt,Lt.width,Lt.height,0,At,_t,Lt.data)}}else{Ut?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,At,_t,gt[Z]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,Gt,At,_t,gt[Z]);for(let ht=0;ht<W.length;ht++){const lt=W[ht];Ut?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht+1,0,0,At,_t,lt.image[Z]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht+1,Gt,At,_t,lt.image[Z])}}}p(v)&&d(n.TEXTURE_CUBE_MAP),Y.__version=J.version,v.onUpdate&&v.onUpdate(v)}T.__version=v.version}function pt(T,v,N,K,J,Y){const xt=s.convert(N.format,N.colorSpace),ct=s.convert(N.type),mt=y(N.internalFormat,xt,ct,N.colorSpace),Vt=i.get(v),nt=i.get(N);if(nt.__renderTarget=v,!Vt.__hasExternalTextures){const gt=Math.max(1,v.width>>Y),Tt=Math.max(1,v.height>>Y);J===n.TEXTURE_3D||J===n.TEXTURE_2D_ARRAY?e.texImage3D(J,Y,mt,gt,Tt,v.depth,0,xt,ct,null):e.texImage2D(J,Y,mt,gt,Tt,0,xt,ct,null)}e.bindFramebuffer(n.FRAMEBUFFER,T),zt(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,K,J,nt.__webglTexture,0,kt(v)):(J===n.TEXTURE_2D||J>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&J<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,K,J,nt.__webglTexture,Y),e.bindFramebuffer(n.FRAMEBUFFER,null)}function at(T,v,N){if(n.bindRenderbuffer(n.RENDERBUFFER,T),v.depthBuffer){const K=v.depthTexture,J=K&&K.isDepthTexture?K.type:null,Y=E(v.stencilBuffer,J),xt=v.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ct=kt(v);zt(v)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ct,Y,v.width,v.height):N?n.renderbufferStorageMultisample(n.RENDERBUFFER,ct,Y,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,Y,v.width,v.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,xt,n.RENDERBUFFER,T)}else{const K=v.textures;for(let J=0;J<K.length;J++){const Y=K[J],xt=s.convert(Y.format,Y.colorSpace),ct=s.convert(Y.type),mt=y(Y.internalFormat,xt,ct,Y.colorSpace),Vt=kt(v);N&&zt(v)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,Vt,mt,v.width,v.height):zt(v)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Vt,mt,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,mt,v.width,v.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function wt(T,v){if(v&&v.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(n.FRAMEBUFFER,T),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const K=i.get(v.depthTexture);K.__renderTarget=v,(!K.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),G(v.depthTexture,0);const J=K.__webglTexture,Y=kt(v);if(v.depthTexture.format===1026)zt(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,J,0,Y):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,J,0);else if(v.depthTexture.format===1027)zt(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,J,0,Y):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,J,0);else throw new Error("Unknown depthTexture format")}function Rt(T){const v=i.get(T),N=T.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==T.depthTexture){const K=T.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),K){const J=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,K.removeEventListener("dispose",J)};K.addEventListener("dispose",J),v.__depthDisposeCallback=J}v.__boundDepthTexture=K}if(T.depthTexture&&!v.__autoAllocateDepthBuffer){if(N)throw new Error("target.depthTexture not supported in Cube render targets");wt(v.__webglFramebuffer,T)}else if(N){v.__webglDepthbuffer=[];for(let K=0;K<6;K++)if(e.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer[K]),v.__webglDepthbuffer[K]===void 0)v.__webglDepthbuffer[K]=n.createRenderbuffer(),at(v.__webglDepthbuffer[K],T,!1);else{const J=T.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Y=v.__webglDepthbuffer[K];n.bindRenderbuffer(n.RENDERBUFFER,Y),n.framebufferRenderbuffer(n.FRAMEBUFFER,J,n.RENDERBUFFER,Y)}}else if(e.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=n.createRenderbuffer(),at(v.__webglDepthbuffer,T,!1);else{const K=T.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,J=v.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,J),n.framebufferRenderbuffer(n.FRAMEBUFFER,K,n.RENDERBUFFER,J)}e.bindFramebuffer(n.FRAMEBUFFER,null)}function Nt(T,v,N){const K=i.get(T);v!==void 0&&pt(K.__webglFramebuffer,T,T.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),N!==void 0&&Rt(T)}function ne(T){const v=T.texture,N=i.get(T),K=i.get(v);T.addEventListener("dispose",R);const J=T.textures,Y=T.isWebGLCubeRenderTarget===!0,xt=J.length>1;if(xt||(K.__webglTexture===void 0&&(K.__webglTexture=n.createTexture()),K.__version=v.version,a.memory.textures++),Y){N.__webglFramebuffer=[];for(let ct=0;ct<6;ct++)if(v.mipmaps&&v.mipmaps.length>0){N.__webglFramebuffer[ct]=[];for(let mt=0;mt<v.mipmaps.length;mt++)N.__webglFramebuffer[ct][mt]=n.createFramebuffer()}else N.__webglFramebuffer[ct]=n.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){N.__webglFramebuffer=[];for(let ct=0;ct<v.mipmaps.length;ct++)N.__webglFramebuffer[ct]=n.createFramebuffer()}else N.__webglFramebuffer=n.createFramebuffer();if(xt)for(let ct=0,mt=J.length;ct<mt;ct++){const Vt=i.get(J[ct]);Vt.__webglTexture===void 0&&(Vt.__webglTexture=n.createTexture(),a.memory.textures++)}if(T.samples>0&&zt(T)===!1){N.__webglMultisampledFramebuffer=n.createFramebuffer(),N.__webglColorRenderbuffer=[],e.bindFramebuffer(n.FRAMEBUFFER,N.__webglMultisampledFramebuffer);for(let ct=0;ct<J.length;ct++){const mt=J[ct];N.__webglColorRenderbuffer[ct]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,N.__webglColorRenderbuffer[ct]);const Vt=s.convert(mt.format,mt.colorSpace),nt=s.convert(mt.type),gt=y(mt.internalFormat,Vt,nt,mt.colorSpace,T.isXRRenderTarget===!0),Tt=kt(T);n.renderbufferStorageMultisample(n.RENDERBUFFER,Tt,gt,T.width,T.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ct,n.RENDERBUFFER,N.__webglColorRenderbuffer[ct])}n.bindRenderbuffer(n.RENDERBUFFER,null),T.depthBuffer&&(N.__webglDepthRenderbuffer=n.createRenderbuffer(),at(N.__webglDepthRenderbuffer,T,!0)),e.bindFramebuffer(n.FRAMEBUFFER,null)}}if(Y){e.bindTexture(n.TEXTURE_CUBE_MAP,K.__webglTexture),dt(n.TEXTURE_CUBE_MAP,v);for(let ct=0;ct<6;ct++)if(v.mipmaps&&v.mipmaps.length>0)for(let mt=0;mt<v.mipmaps.length;mt++)pt(N.__webglFramebuffer[ct][mt],T,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ct,mt);else pt(N.__webglFramebuffer[ct],T,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0);p(v)&&d(n.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(xt){for(let ct=0,mt=J.length;ct<mt;ct++){const Vt=J[ct],nt=i.get(Vt);e.bindTexture(n.TEXTURE_2D,nt.__webglTexture),dt(n.TEXTURE_2D,Vt),pt(N.__webglFramebuffer,T,Vt,n.COLOR_ATTACHMENT0+ct,n.TEXTURE_2D,0),p(Vt)&&d(n.TEXTURE_2D)}e.unbindTexture()}else{let ct=n.TEXTURE_2D;if((T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(ct=T.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(ct,K.__webglTexture),dt(ct,v),v.mipmaps&&v.mipmaps.length>0)for(let mt=0;mt<v.mipmaps.length;mt++)pt(N.__webglFramebuffer[mt],T,v,n.COLOR_ATTACHMENT0,ct,mt);else pt(N.__webglFramebuffer,T,v,n.COLOR_ATTACHMENT0,ct,0);p(v)&&d(ct),e.unbindTexture()}T.depthBuffer&&Rt(T)}function Ht(T){const v=T.textures;for(let N=0,K=v.length;N<K;N++){const J=v[N];if(p(J)){const Y=b(T),xt=i.get(J).__webglTexture;e.bindTexture(Y,xt),d(Y),e.unbindTexture()}}}const oe=[],D=[];function Ue(T){if(T.samples>0){if(zt(T)===!1){const v=T.textures,N=T.width,K=T.height;let J=n.COLOR_BUFFER_BIT;const Y=T.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,xt=i.get(T),ct=v.length>1;if(ct)for(let mt=0;mt<v.length;mt++)e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+mt,n.RENDERBUFFER,null),e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+mt,n.TEXTURE_2D,null,0);e.bindFramebuffer(n.READ_FRAMEBUFFER,xt.__webglMultisampledFramebuffer),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,xt.__webglFramebuffer);for(let mt=0;mt<v.length;mt++){if(T.resolveDepthBuffer&&(T.depthBuffer&&(J|=n.DEPTH_BUFFER_BIT),T.stencilBuffer&&T.resolveStencilBuffer&&(J|=n.STENCIL_BUFFER_BIT)),ct){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,xt.__webglColorRenderbuffer[mt]);const Vt=i.get(v[mt]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Vt,0)}n.blitFramebuffer(0,0,N,K,0,0,N,K,J,n.NEAREST),c===!0&&(oe.length=0,D.length=0,oe.push(n.COLOR_ATTACHMENT0+mt),T.depthBuffer&&T.resolveDepthBuffer===!1&&(oe.push(Y),D.push(Y),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,D)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,oe))}if(e.bindFramebuffer(n.READ_FRAMEBUFFER,null),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),ct)for(let mt=0;mt<v.length;mt++){e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+mt,n.RENDERBUFFER,xt.__webglColorRenderbuffer[mt]);const Vt=i.get(v[mt]).__webglTexture;e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+mt,n.TEXTURE_2D,Vt,0)}e.bindFramebuffer(n.DRAW_FRAMEBUFFER,xt.__webglMultisampledFramebuffer)}else if(T.depthBuffer&&T.resolveDepthBuffer===!1&&c){const v=T.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[v])}}}function kt(T){return Math.min(r.maxSamples,T.samples)}function zt(T){const v=i.get(T);return T.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function St(T){const v=a.render.frame;h.get(T)!==v&&(h.set(T,v),T.update())}function te(T,v){const N=T.colorSpace,K=T.format,J=T.type;return T.isCompressedTexture===!0||T.isVideoTexture===!0||N!==Rn&&N!==""&&(Xt.getTransfer(N)===Zt?(K!==1023||J!==1009)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",N)),v}function yt(T){return typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement?(l.width=T.naturalWidth||T.width,l.height=T.naturalHeight||T.height):typeof VideoFrame<"u"&&T instanceof VideoFrame?(l.width=T.displayWidth,l.height=T.displayHeight):(l.width=T.width,l.height=T.height),l}this.allocateTextureUnit=O,this.resetTextureUnits=H,this.setTexture2D=G,this.setTexture2DArray=V,this.setTexture3D=$,this.setTextureCube=z,this.rebindTextures=Nt,this.setupRenderTarget=ne,this.updateRenderTargetMipmap=Ht,this.updateMultisampleRenderTarget=Ue,this.setupDepthRenderbuffer=Rt,this.setupFrameBufferTexture=pt,this.useMultisampledRTT=zt}function vf(n,t){function e(i,r=""){let s;const a=Xt.getTransfer(r);if(i===1009)return n.UNSIGNED_BYTE;if(i===1017)return n.UNSIGNED_SHORT_4_4_4_4;if(i===1018)return n.UNSIGNED_SHORT_5_5_5_1;if(i===35902)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===1010)return n.BYTE;if(i===1011)return n.SHORT;if(i===1012)return n.UNSIGNED_SHORT;if(i===1013)return n.INT;if(i===1014)return n.UNSIGNED_INT;if(i===1015)return n.FLOAT;if(i===1016)return n.HALF_FLOAT;if(i===1021)return n.ALPHA;if(i===1022)return n.RGB;if(i===1023)return n.RGBA;if(i===1024)return n.LUMINANCE;if(i===1025)return n.LUMINANCE_ALPHA;if(i===1026)return n.DEPTH_COMPONENT;if(i===1027)return n.DEPTH_STENCIL;if(i===1028)return n.RED;if(i===1029)return n.RED_INTEGER;if(i===1030)return n.RG;if(i===1031)return n.RG_INTEGER;if(i===1033)return n.RGBA_INTEGER;if(i===33776||i===33777||i===33778||i===33779)if(a===Zt)if(s=t.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===33776)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===33777)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===33778)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===33779)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=t.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===33776)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===33777)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===33778)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===33779)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===35840||i===35841||i===35842||i===35843)if(s=t.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===35840)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===35841)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===35842)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===35843)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===36196||i===37492||i===37496)if(s=t.get("WEBGL_compressed_texture_etc"),s!==null){if(i===36196||i===37492)return a===Zt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===37496)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===37808||i===37809||i===37810||i===37811||i===37812||i===37813||i===37814||i===37815||i===37816||i===37817||i===37818||i===37819||i===37820||i===37821)if(s=t.get("WEBGL_compressed_texture_astc"),s!==null){if(i===37808)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===37809)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===37810)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===37811)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===37812)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===37813)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===37814)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===37815)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===37816)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===37817)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===37818)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===37819)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===37820)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===37821)return a===Zt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===36492||i===36494||i===36495)if(s=t.get("EXT_texture_compression_bptc"),s!==null){if(i===36492)return a===Zt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===36494)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===36495)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===36283||i===36284||i===36285||i===36286)if(s=t.get("EXT_texture_compression_rgtc"),s!==null){if(i===36492)return s.COMPRESSED_RED_RGTC1_EXT;if(i===36284)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===36285)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===36286)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===1020?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:e}}const xf={type:"move"};class $r{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ie,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ie,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ie,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let r=null,s=null,a=null;const o=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){a=!0;for(const _ of t.hand.values()){const p=e.getJointPose(_,i),d=this._getHandJoint(l,_);p!==null&&(d.matrix.fromArray(p.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,d.jointRadius=p.radius),d.visible=p!==null}const h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],f=h.position.distanceTo(u.position),m=.02,g=.005;l.inputState.pinching&&f>m+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&f<=m-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(s=e.getPose(t.gripSpace,i),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1));o!==null&&(r=e.getPose(t.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(xf)))}return o!==null&&(o.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const i=new Ie;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}}const Mf=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,yf=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Sf{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,i){if(this.texture===null){const r=new ve,s=t.properties.get(r);s.__webglTexture=e.texture,(e.depthNear!==i.depthNear||e.depthFar!==i.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,i=new un({vertexShader:Mf,fragmentShader:yf,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Re(new Xi(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Ef extends Pn{constructor(t,e){super();const i=this;let r=null,s=1,a=null,o="local-floor",c=1,l=null,h=null,u=null,f=null,m=null,g=null;const _=new Sf,p=e.getContextAttributes();let d=null,b=null;const y=[],E=[],L=new Ot;let w=null;const R=new Ve;R.viewport=new ie;const A=new Ve;A.viewport=new ie;const S=[R,A],M=new El;let C=null,H=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(q){let et=y[q];return et===void 0&&(et=new $r,y[q]=et),et.getTargetRaySpace()},this.getControllerGrip=function(q){let et=y[q];return et===void 0&&(et=new $r,y[q]=et),et.getGripSpace()},this.getHand=function(q){let et=y[q];return et===void 0&&(et=new $r,y[q]=et),et.getHandSpace()};function O(q){const et=E.indexOf(q.inputSource);if(et===-1)return;const pt=y[et];pt!==void 0&&(pt.update(q.inputSource,q.frame,l||a),pt.dispatchEvent({type:q.type,data:q.inputSource}))}function X(){r.removeEventListener("select",O),r.removeEventListener("selectstart",O),r.removeEventListener("selectend",O),r.removeEventListener("squeeze",O),r.removeEventListener("squeezestart",O),r.removeEventListener("squeezeend",O),r.removeEventListener("end",X),r.removeEventListener("inputsourceschange",G);for(let q=0;q<y.length;q++){const et=E[q];et!==null&&(E[q]=null,y[q].disconnect(et))}C=null,H=null,_.reset(),t.setRenderTarget(d),m=null,f=null,u=null,r=null,b=null,Mt.stop(),i.isPresenting=!1,t.setPixelRatio(w),t.setSize(L.width,L.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(q){s=q,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(q){o=q,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(q){l=q},this.getBaseLayer=function(){return f!==null?f:m},this.getBinding=function(){return u},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(q){if(r=q,r!==null){if(d=t.getRenderTarget(),r.addEventListener("select",O),r.addEventListener("selectstart",O),r.addEventListener("selectend",O),r.addEventListener("squeeze",O),r.addEventListener("squeezestart",O),r.addEventListener("squeezeend",O),r.addEventListener("end",X),r.addEventListener("inputsourceschange",G),p.xrCompatible!==!0&&await e.makeXRCompatible(),w=t.getPixelRatio(),t.getSize(L),r.enabledFeatures!==void 0&&r.enabledFeatures.includes("layers")){let pt=null,at=null,wt=null;p.depth&&(wt=p.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,pt=p.stencil?1027:1026,at=p.stencil?1020:1014);const Rt={colorFormat:e.RGBA8,depthFormat:wt,scaleFactor:s};u=new XRWebGLBinding(r,e),f=u.createProjectionLayer(Rt),r.updateRenderState({layers:[f]}),t.setPixelRatio(1),t.setSize(f.textureWidth,f.textureHeight,!1),b=new gn(f.textureWidth,f.textureHeight,{format:1023,type:1009,depthTexture:new $s(f.textureWidth,f.textureHeight,at,void 0,void 0,void 0,void 0,void 0,void 0,pt),stencilBuffer:p.stencil,colorSpace:t.outputColorSpace,samples:p.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1})}else{const pt={antialias:p.antialias,alpha:!0,depth:p.depth,stencil:p.stencil,framebufferScaleFactor:s};m=new XRWebGLLayer(r,e,pt),r.updateRenderState({baseLayer:m}),t.setPixelRatio(1),t.setSize(m.framebufferWidth,m.framebufferHeight,!1),b=new gn(m.framebufferWidth,m.framebufferHeight,{format:1023,type:1009,colorSpace:t.outputColorSpace,stencilBuffer:p.stencil})}b.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await r.requestReferenceSpace(o),Mt.setContext(r),Mt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function G(q){for(let et=0;et<q.removed.length;et++){const pt=q.removed[et],at=E.indexOf(pt);at>=0&&(E[at]=null,y[at].disconnect(pt))}for(let et=0;et<q.added.length;et++){const pt=q.added[et];let at=E.indexOf(pt);if(at===-1){for(let Rt=0;Rt<y.length;Rt++)if(Rt>=E.length){E.push(pt),at=Rt;break}else if(E[Rt]===null){E[Rt]=pt,at=Rt;break}if(at===-1)break}const wt=y[at];wt&&wt.connect(pt)}}const V=new P,$=new P;function z(q,et,pt){V.setFromMatrixPosition(et.matrixWorld),$.setFromMatrixPosition(pt.matrixWorld);const at=V.distanceTo($),wt=et.projectionMatrix.elements,Rt=pt.projectionMatrix.elements,Nt=wt[14]/(wt[10]-1),ne=wt[14]/(wt[10]+1),Ht=(wt[9]+1)/wt[5],oe=(wt[9]-1)/wt[5],D=(wt[8]-1)/wt[0],Ue=(Rt[8]+1)/Rt[0],kt=Nt*D,zt=Nt*Ue,St=at/(-D+Ue),te=St*-D;if(et.matrixWorld.decompose(q.position,q.quaternion,q.scale),q.translateX(te),q.translateZ(St),q.matrixWorld.compose(q.position,q.quaternion,q.scale),q.matrixWorldInverse.copy(q.matrixWorld).invert(),wt[10]===-1)q.projectionMatrix.copy(et.projectionMatrix),q.projectionMatrixInverse.copy(et.projectionMatrixInverse);else{const yt=Nt+St,T=ne+St,v=kt-te,N=zt+(at-te),K=Ht*ne/T*yt,J=oe*ne/T*yt;q.projectionMatrix.makePerspective(v,N,K,J,yt,T),q.projectionMatrixInverse.copy(q.projectionMatrix).invert()}}function rt(q,et){et===null?q.matrixWorld.copy(q.matrix):q.matrixWorld.multiplyMatrices(et.matrixWorld,q.matrix),q.matrixWorldInverse.copy(q.matrixWorld).invert()}this.updateCamera=function(q){if(r===null)return;let et=q.near,pt=q.far;_.texture!==null&&(_.depthNear>0&&(et=_.depthNear),_.depthFar>0&&(pt=_.depthFar)),M.near=A.near=R.near=et,M.far=A.far=R.far=pt,(C!==M.near||H!==M.far)&&(r.updateRenderState({depthNear:M.near,depthFar:M.far}),C=M.near,H=M.far),R.layers.mask=q.layers.mask|2,A.layers.mask=q.layers.mask|4,M.layers.mask=R.layers.mask|A.layers.mask;const at=q.parent,wt=M.cameras;rt(M,at);for(let Rt=0;Rt<wt.length;Rt++)rt(wt[Rt],at);wt.length===2?z(M,R,A):M.projectionMatrix.copy(R.projectionMatrix),ut(q,M,at)};function ut(q,et,pt){pt===null?q.matrix.copy(et.matrixWorld):(q.matrix.copy(pt.matrixWorld),q.matrix.invert(),q.matrix.multiply(et.matrixWorld)),q.matrix.decompose(q.position,q.quaternion,q.scale),q.updateMatrixWorld(!0),q.projectionMatrix.copy(et.projectionMatrix),q.projectionMatrixInverse.copy(et.projectionMatrixInverse),q.isPerspectiveCamera&&(q.fov=ni*2*Math.atan(1/q.projectionMatrix.elements[5]),q.zoom=1)}this.getCamera=function(){return M},this.getFoveation=function(){if(!(f===null&&m===null))return c},this.setFoveation=function(q){c=q,f!==null&&(f.fixedFoveation=q),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=q)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(M)};let j=null;function dt(q,et){if(h=et.getViewerPose(l||a),g=et,h!==null){const pt=h.views;m!==null&&(t.setRenderTargetFramebuffer(b,m.framebuffer),t.setRenderTarget(b));let at=!1;pt.length!==M.cameras.length&&(M.cameras.length=0,at=!0);for(let Rt=0;Rt<pt.length;Rt++){const Nt=pt[Rt];let ne=null;if(m!==null)ne=m.getViewport(Nt);else{const oe=u.getViewSubImage(f,Nt);ne=oe.viewport,Rt===0&&(t.setRenderTargetTextures(b,oe.colorTexture,f.ignoreDepthValues?void 0:oe.depthStencilTexture),t.setRenderTarget(b))}let Ht=S[Rt];Ht===void 0&&(Ht=new Ve,Ht.layers.enable(Rt),Ht.viewport=new ie,S[Rt]=Ht),Ht.matrix.fromArray(Nt.transform.matrix),Ht.matrix.decompose(Ht.position,Ht.quaternion,Ht.scale),Ht.projectionMatrix.fromArray(Nt.projectionMatrix),Ht.projectionMatrixInverse.copy(Ht.projectionMatrix).invert(),Ht.viewport.set(ne.x,ne.y,ne.width,ne.height),Rt===0&&(M.matrix.copy(Ht.matrix),M.matrix.decompose(M.position,M.quaternion,M.scale)),at===!0&&M.cameras.push(Ht)}const wt=r.enabledFeatures;if(wt&&wt.includes("depth-sensing")){const Rt=u.getDepthInformation(pt[0]);Rt&&Rt.isValid&&Rt.texture&&_.init(t,Rt,r.renderState)}}for(let pt=0;pt<y.length;pt++){const at=E[pt],wt=y[pt];at!==null&&wt!==void 0&&wt.update(at,et,l||a)}j&&j(q,et),et.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:et}),g=null}const Mt=new ao;Mt.setAnimationLoop(dt),this.setAnimationLoop=function(q){j=q},this.dispose=function(){}}}const Tn=new qe,bf=new Jt;function Tf(n,t){function e(p,d){p.matrixAutoUpdate===!0&&p.updateMatrix(),d.value.copy(p.matrix)}function i(p,d){d.color.getRGB(p.fogColor.value,Xs(n)),d.isFog?(p.fogNear.value=d.near,p.fogFar.value=d.far):d.isFogExp2&&(p.fogDensity.value=d.density)}function r(p,d,b,y,E){d.isMeshBasicMaterial||d.isMeshLambertMaterial?s(p,d):d.isMeshToonMaterial?(s(p,d),u(p,d)):d.isMeshPhongMaterial?(s(p,d),h(p,d)):d.isMeshStandardMaterial?(s(p,d),f(p,d),d.isMeshPhysicalMaterial&&m(p,d,E)):d.isMeshMatcapMaterial?(s(p,d),g(p,d)):d.isMeshDepthMaterial?s(p,d):d.isMeshDistanceMaterial?(s(p,d),_(p,d)):d.isMeshNormalMaterial?s(p,d):d.isLineBasicMaterial?(a(p,d),d.isLineDashedMaterial&&o(p,d)):d.isPointsMaterial?c(p,d,b,y):d.isSpriteMaterial?l(p,d):d.isShadowMaterial?(p.color.value.copy(d.color),p.opacity.value=d.opacity):d.isShaderMaterial&&(d.uniformsNeedUpdate=!1)}function s(p,d){p.opacity.value=d.opacity,d.color&&p.diffuse.value.copy(d.color),d.emissive&&p.emissive.value.copy(d.emissive).multiplyScalar(d.emissiveIntensity),d.map&&(p.map.value=d.map,e(d.map,p.mapTransform)),d.alphaMap&&(p.alphaMap.value=d.alphaMap,e(d.alphaMap,p.alphaMapTransform)),d.bumpMap&&(p.bumpMap.value=d.bumpMap,e(d.bumpMap,p.bumpMapTransform),p.bumpScale.value=d.bumpScale,d.side===1&&(p.bumpScale.value*=-1)),d.normalMap&&(p.normalMap.value=d.normalMap,e(d.normalMap,p.normalMapTransform),p.normalScale.value.copy(d.normalScale),d.side===1&&p.normalScale.value.negate()),d.displacementMap&&(p.displacementMap.value=d.displacementMap,e(d.displacementMap,p.displacementMapTransform),p.displacementScale.value=d.displacementScale,p.displacementBias.value=d.displacementBias),d.emissiveMap&&(p.emissiveMap.value=d.emissiveMap,e(d.emissiveMap,p.emissiveMapTransform)),d.specularMap&&(p.specularMap.value=d.specularMap,e(d.specularMap,p.specularMapTransform)),d.alphaTest>0&&(p.alphaTest.value=d.alphaTest);const b=t.get(d),y=b.envMap,E=b.envMapRotation;y&&(p.envMap.value=y,Tn.copy(E),Tn.x*=-1,Tn.y*=-1,Tn.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(Tn.y*=-1,Tn.z*=-1),p.envMapRotation.value.setFromMatrix4(bf.makeRotationFromEuler(Tn)),p.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=d.reflectivity,p.ior.value=d.ior,p.refractionRatio.value=d.refractionRatio),d.lightMap&&(p.lightMap.value=d.lightMap,p.lightMapIntensity.value=d.lightMapIntensity,e(d.lightMap,p.lightMapTransform)),d.aoMap&&(p.aoMap.value=d.aoMap,p.aoMapIntensity.value=d.aoMapIntensity,e(d.aoMap,p.aoMapTransform))}function a(p,d){p.diffuse.value.copy(d.color),p.opacity.value=d.opacity,d.map&&(p.map.value=d.map,e(d.map,p.mapTransform))}function o(p,d){p.dashSize.value=d.dashSize,p.totalSize.value=d.dashSize+d.gapSize,p.scale.value=d.scale}function c(p,d,b,y){p.diffuse.value.copy(d.color),p.opacity.value=d.opacity,p.size.value=d.size*b,p.scale.value=y*.5,d.map&&(p.map.value=d.map,e(d.map,p.uvTransform)),d.alphaMap&&(p.alphaMap.value=d.alphaMap,e(d.alphaMap,p.alphaMapTransform)),d.alphaTest>0&&(p.alphaTest.value=d.alphaTest)}function l(p,d){p.diffuse.value.copy(d.color),p.opacity.value=d.opacity,p.rotation.value=d.rotation,d.map&&(p.map.value=d.map,e(d.map,p.mapTransform)),d.alphaMap&&(p.alphaMap.value=d.alphaMap,e(d.alphaMap,p.alphaMapTransform)),d.alphaTest>0&&(p.alphaTest.value=d.alphaTest)}function h(p,d){p.specular.value.copy(d.specular),p.shininess.value=Math.max(d.shininess,1e-4)}function u(p,d){d.gradientMap&&(p.gradientMap.value=d.gradientMap)}function f(p,d){p.metalness.value=d.metalness,d.metalnessMap&&(p.metalnessMap.value=d.metalnessMap,e(d.metalnessMap,p.metalnessMapTransform)),p.roughness.value=d.roughness,d.roughnessMap&&(p.roughnessMap.value=d.roughnessMap,e(d.roughnessMap,p.roughnessMapTransform)),d.envMap&&(p.envMapIntensity.value=d.envMapIntensity)}function m(p,d,b){p.ior.value=d.ior,d.sheen>0&&(p.sheenColor.value.copy(d.sheenColor).multiplyScalar(d.sheen),p.sheenRoughness.value=d.sheenRoughness,d.sheenColorMap&&(p.sheenColorMap.value=d.sheenColorMap,e(d.sheenColorMap,p.sheenColorMapTransform)),d.sheenRoughnessMap&&(p.sheenRoughnessMap.value=d.sheenRoughnessMap,e(d.sheenRoughnessMap,p.sheenRoughnessMapTransform))),d.clearcoat>0&&(p.clearcoat.value=d.clearcoat,p.clearcoatRoughness.value=d.clearcoatRoughness,d.clearcoatMap&&(p.clearcoatMap.value=d.clearcoatMap,e(d.clearcoatMap,p.clearcoatMapTransform)),d.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=d.clearcoatRoughnessMap,e(d.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),d.clearcoatNormalMap&&(p.clearcoatNormalMap.value=d.clearcoatNormalMap,e(d.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(d.clearcoatNormalScale),d.side===1&&p.clearcoatNormalScale.value.negate())),d.dispersion>0&&(p.dispersion.value=d.dispersion),d.iridescence>0&&(p.iridescence.value=d.iridescence,p.iridescenceIOR.value=d.iridescenceIOR,p.iridescenceThicknessMinimum.value=d.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=d.iridescenceThicknessRange[1],d.iridescenceMap&&(p.iridescenceMap.value=d.iridescenceMap,e(d.iridescenceMap,p.iridescenceMapTransform)),d.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=d.iridescenceThicknessMap,e(d.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),d.transmission>0&&(p.transmission.value=d.transmission,p.transmissionSamplerMap.value=b.texture,p.transmissionSamplerSize.value.set(b.width,b.height),d.transmissionMap&&(p.transmissionMap.value=d.transmissionMap,e(d.transmissionMap,p.transmissionMapTransform)),p.thickness.value=d.thickness,d.thicknessMap&&(p.thicknessMap.value=d.thicknessMap,e(d.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=d.attenuationDistance,p.attenuationColor.value.copy(d.attenuationColor)),d.anisotropy>0&&(p.anisotropyVector.value.set(d.anisotropy*Math.cos(d.anisotropyRotation),d.anisotropy*Math.sin(d.anisotropyRotation)),d.anisotropyMap&&(p.anisotropyMap.value=d.anisotropyMap,e(d.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=d.specularIntensity,p.specularColor.value.copy(d.specularColor),d.specularColorMap&&(p.specularColorMap.value=d.specularColorMap,e(d.specularColorMap,p.specularColorMapTransform)),d.specularIntensityMap&&(p.specularIntensityMap.value=d.specularIntensityMap,e(d.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,d){d.matcap&&(p.matcap.value=d.matcap)}function _(p,d){const b=t.get(d).light;p.referencePosition.value.setFromMatrixPosition(b.matrixWorld),p.nearDistance.value=b.shadow.camera.near,p.farDistance.value=b.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function wf(n,t,e,i){let r={},s={},a=[];const o=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function c(b,y){const E=y.program;i.uniformBlockBinding(b,E)}function l(b,y){let E=r[b.id];E===void 0&&(g(b),E=h(b),r[b.id]=E,b.addEventListener("dispose",p));const L=y.program;i.updateUBOMapping(b,L);const w=t.render.frame;s[b.id]!==w&&(f(b),s[b.id]=w)}function h(b){const y=u();b.__bindingPointIndex=y;const E=n.createBuffer(),L=b.__size,w=b.usage;return n.bindBuffer(n.UNIFORM_BUFFER,E),n.bufferData(n.UNIFORM_BUFFER,L,w),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,y,E),E}function u(){for(let b=0;b<o;b++)if(a.indexOf(b)===-1)return a.push(b),b;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(b){const y=r[b.id],E=b.uniforms,L=b.__cache;n.bindBuffer(n.UNIFORM_BUFFER,y);for(let w=0,R=E.length;w<R;w++){const A=Array.isArray(E[w])?E[w]:[E[w]];for(let S=0,M=A.length;S<M;S++){const C=A[S];if(m(C,w,S,L)===!0){const H=C.__offset,O=Array.isArray(C.value)?C.value:[C.value];let X=0;for(let G=0;G<O.length;G++){const V=O[G],$=_(V);typeof V=="number"||typeof V=="boolean"?(C.__data[0]=V,n.bufferSubData(n.UNIFORM_BUFFER,H+X,C.__data)):V.isMatrix3?(C.__data[0]=V.elements[0],C.__data[1]=V.elements[1],C.__data[2]=V.elements[2],C.__data[3]=0,C.__data[4]=V.elements[3],C.__data[5]=V.elements[4],C.__data[6]=V.elements[5],C.__data[7]=0,C.__data[8]=V.elements[6],C.__data[9]=V.elements[7],C.__data[10]=V.elements[8],C.__data[11]=0):(V.toArray(C.__data,X),X+=$.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,H,C.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function m(b,y,E,L){const w=b.value,R=y+"_"+E;if(L[R]===void 0)return typeof w=="number"||typeof w=="boolean"?L[R]=w:L[R]=w.clone(),!0;{const A=L[R];if(typeof w=="number"||typeof w=="boolean"){if(A!==w)return L[R]=w,!0}else if(A.equals(w)===!1)return A.copy(w),!0}return!1}function g(b){const y=b.uniforms;let E=0;const L=16;for(let R=0,A=y.length;R<A;R++){const S=Array.isArray(y[R])?y[R]:[y[R]];for(let M=0,C=S.length;M<C;M++){const H=S[M],O=Array.isArray(H.value)?H.value:[H.value];for(let X=0,G=O.length;X<G;X++){const V=O[X],$=_(V),z=E%L,rt=z%$.boundary,ut=z+rt;E+=rt,ut!==0&&L-ut<$.storage&&(E+=L-ut),H.__data=new Float32Array($.storage/Float32Array.BYTES_PER_ELEMENT),H.__offset=E,E+=$.storage}}}const w=E%L;return w>0&&(E+=L-w),b.__size=E,b.__cache={},this}function _(b){const y={boundary:0,storage:0};return typeof b=="number"||typeof b=="boolean"?(y.boundary=4,y.storage=4):b.isVector2?(y.boundary=8,y.storage=8):b.isVector3||b.isColor?(y.boundary=16,y.storage=12):b.isVector4?(y.boundary=16,y.storage=16):b.isMatrix3?(y.boundary=48,y.storage=48):b.isMatrix4?(y.boundary=64,y.storage=64):b.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",b),y}function p(b){const y=b.target;y.removeEventListener("dispose",p);const E=a.indexOf(y.__bindingPointIndex);a.splice(E,1),n.deleteBuffer(r[y.id]),delete r[y.id],delete s[y.id]}function d(){for(const b in r)n.deleteBuffer(r[b]);a=[],r={},s={}}return{bind:c,update:l,dispose:d}}class Af{constructor(t={}){const{canvas:e=zc(),context:i=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reverseDepthBuffer:f=!1}=t;this.isWebGLRenderer=!0;let m;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=i.getContextAttributes().alpha}else m=a;const g=new Uint32Array(4),_=new Int32Array(4);let p=null,d=null;const b=[],y=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=ye,this.toneMapping=0,this.toneMappingExposure=1;const E=this;let L=!1,w=0,R=0,A=null,S=-1,M=null;const C=new ie,H=new ie;let O=null;const X=new Ft(0);let G=0,V=e.width,$=e.height,z=1,rt=null,ut=null;const j=new ie(0,0,V,$),dt=new ie(0,0,V,$);let Mt=!1;const q=new kr;let et=!1,pt=!1;this.transmissionResolutionScale=1;const at=new Jt,wt=new Jt,Rt=new P,Nt=new ie,ne={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ht=!1;function oe(){return A===null?z:1}let D=i;function Ue(x,U){return e.getContext(x,U)}try{const x={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine","three.js r172"),e.addEventListener("webglcontextlost",Z,!1),e.addEventListener("webglcontextrestored",ht,!1),e.addEventListener("webglcontextcreationerror",lt,!1),D===null){const U="webgl2";if(D=Ue(U,x),D===null)throw Ue(U)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(x){throw console.error("THREE.WebGLRenderer: "+x.message),x}let kt,zt,St,te,yt,T,v,N,K,J,Y,xt,ct,mt,Vt,nt,gt,Tt,At,_t,Gt,Ut,$t,I;function st(){kt=new Fu(D),kt.init(),Ut=new vf(D,kt),zt=new Ru(D,kt,t,Ut),St=new gf(D,kt),zt.reverseDepthBuffer&&f&&St.buffers.depth.setReversed(!0),te=new Ou(D),yt=new nf,T=new _f(D,kt,St,yt,zt,Ut,te),v=new Du(E),N=new Uu(E),K=new Tl(D),$t=new Au(D,K),J=new Nu(D,K,te,$t),Y=new zu(D,J,K,te),At=new ku(D,zt,T),nt=new Pu(yt),xt=new ef(E,v,N,kt,zt,$t,nt),ct=new Tf(E,yt),mt=new sf,Vt=new uf(kt),Tt=new wu(E,v,N,St,Y,m,c),gt=new pf(E,Y,zt),I=new wf(D,te,zt,St),_t=new Cu(D,kt,te),Gt=new Bu(D,kt,te),te.programs=xt.programs,E.capabilities=zt,E.extensions=kt,E.properties=yt,E.renderLists=mt,E.shadowMap=gt,E.state=St,E.info=te}st();const W=new Ef(E,D);this.xr=W,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const x=kt.get("WEBGL_lose_context");x&&x.loseContext()},this.forceContextRestore=function(){const x=kt.get("WEBGL_lose_context");x&&x.restoreContext()},this.getPixelRatio=function(){return z},this.setPixelRatio=function(x){x!==void 0&&(z=x,this.setSize(V,$,!1))},this.getSize=function(x){return x.set(V,$)},this.setSize=function(x,U,B=!0){if(W.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}V=x,$=U,e.width=Math.floor(x*z),e.height=Math.floor(U*z),B===!0&&(e.style.width=x+"px",e.style.height=U+"px"),this.setViewport(0,0,x,U)},this.getDrawingBufferSize=function(x){return x.set(V*z,$*z).floor()},this.setDrawingBufferSize=function(x,U,B){V=x,$=U,z=B,e.width=Math.floor(x*B),e.height=Math.floor(U*B),this.setViewport(0,0,x,U)},this.getCurrentViewport=function(x){return x.copy(C)},this.getViewport=function(x){return x.copy(j)},this.setViewport=function(x,U,B,k){x.isVector4?j.set(x.x,x.y,x.z,x.w):j.set(x,U,B,k),St.viewport(C.copy(j).multiplyScalar(z).round())},this.getScissor=function(x){return x.copy(dt)},this.setScissor=function(x,U,B,k){x.isVector4?dt.set(x.x,x.y,x.z,x.w):dt.set(x,U,B,k),St.scissor(H.copy(dt).multiplyScalar(z).round())},this.getScissorTest=function(){return Mt},this.setScissorTest=function(x){St.setScissorTest(Mt=x)},this.setOpaqueSort=function(x){rt=x},this.setTransparentSort=function(x){ut=x},this.getClearColor=function(x){return x.copy(Tt.getClearColor())},this.setClearColor=function(){Tt.setClearColor.apply(Tt,arguments)},this.getClearAlpha=function(){return Tt.getClearAlpha()},this.setClearAlpha=function(){Tt.setClearAlpha.apply(Tt,arguments)},this.clear=function(x=!0,U=!0,B=!0){let k=0;if(x){let F=!1;if(A!==null){const tt=A.texture.format;F=tt===1033||tt===1031||tt===1029}if(F){const tt=A.texture.type,ot=tt===1009||tt===1014||tt===1012||tt===1020||tt===1017||tt===1018,ft=Tt.getClearColor(),vt=Tt.getClearAlpha(),Ct=ft.r,Pt=ft.g,Et=ft.b;ot?(g[0]=Ct,g[1]=Pt,g[2]=Et,g[3]=vt,D.clearBufferuiv(D.COLOR,0,g)):(_[0]=Ct,_[1]=Pt,_[2]=Et,_[3]=vt,D.clearBufferiv(D.COLOR,0,_))}else k|=D.COLOR_BUFFER_BIT}U&&(k|=D.DEPTH_BUFFER_BIT),B&&(k|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(k)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",Z,!1),e.removeEventListener("webglcontextrestored",ht,!1),e.removeEventListener("webglcontextcreationerror",lt,!1),Tt.dispose(),mt.dispose(),Vt.dispose(),yt.dispose(),v.dispose(),N.dispose(),Y.dispose(),$t.dispose(),I.dispose(),xt.dispose(),W.dispose(),W.removeEventListener("sessionstart",_c),W.removeEventListener("sessionend",vc),An.stop()};function Z(x){x.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),L=!0}function ht(){console.log("THREE.WebGLRenderer: Context Restored."),L=!1;const x=te.autoReset,U=gt.enabled,B=gt.autoUpdate,k=gt.needsUpdate,F=gt.type;st(),te.autoReset=x,gt.enabled=U,gt.autoUpdate=B,gt.needsUpdate=k,gt.type=F}function lt(x){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",x.statusMessage)}function Lt(x){const U=x.target;U.removeEventListener("dispose",Lt),re(U)}function re(x){Me(x),yt.remove(x)}function Me(x){const U=yt.get(x).programs;U!==void 0&&(U.forEach(function(B){xt.releaseProgram(B)}),x.isShaderMaterial&&xt.releaseShaderCache(x))}this.renderBufferDirect=function(x,U,B,k,F,tt){U===null&&(U=ne);const ot=F.isMesh&&F.matrixWorld.determinant()<0,ft=sg(x,U,B,k,F);St.setMaterial(k,ot);let vt=B.index,Ct=1;if(k.wireframe===!0){if(vt=J.getWireframeAttribute(B),vt===void 0)return;Ct=2}const Pt=B.drawRange,Et=B.attributes.position;let Wt=Pt.start*Ct,Yt=(Pt.start+Pt.count)*Ct;tt!==null&&(Wt=Math.max(Wt,tt.start*Ct),Yt=Math.min(Yt,(tt.start+tt.count)*Ct)),vt!==null?(Wt=Math.max(Wt,0),Yt=Math.min(Yt,vt.count)):Et!=null&&(Wt=Math.max(Wt,0),Yt=Math.min(Yt,Et.count));const ce=Yt-Wt;if(ce<0||ce===1/0)return;$t.setup(F,k,ft,B,vt);let se,qt=_t;if(vt!==null&&(se=K.get(vt),qt=Gt,qt.setIndex(se)),F.isMesh)k.wireframe===!0?(St.setLineWidth(k.wireframeLinewidth*oe()),qt.setMode(D.LINES)):qt.setMode(D.TRIANGLES);else if(F.isLine){let bt=k.linewidth;bt===void 0&&(bt=1),St.setLineWidth(bt*oe()),F.isLineSegments?qt.setMode(D.LINES):F.isLineLoop?qt.setMode(D.LINE_LOOP):qt.setMode(D.LINE_STRIP)}else F.isPoints?qt.setMode(D.POINTS):F.isSprite&&qt.setMode(D.TRIANGLES);if(F.isBatchedMesh)if(F._multiDrawInstances!==null)qt.renderMultiDrawInstances(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount,F._multiDrawInstances);else if(kt.get("WEBGL_multi_draw"))qt.renderMultiDraw(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount);else{const bt=F._multiDrawStarts,ge=F._multiDrawCounts,jt=F._multiDrawCount,Xe=vt?K.get(vt).bytesPerElement:1,ti=yt.get(k).currentProgram.getUniforms();for(let Pe=0;Pe<jt;Pe++)ti.setValue(D,"_gl_DrawID",Pe),qt.render(bt[Pe]/Xe,ge[Pe])}else if(F.isInstancedMesh)qt.renderInstances(Wt,ce,F.count);else if(B.isInstancedBufferGeometry){const bt=B._maxInstanceCount!==void 0?B._maxInstanceCount:1/0,ge=Math.min(B.instanceCount,bt);qt.renderInstances(Wt,ce,ge)}else qt.render(Wt,ce)};function Kt(x,U,B){x.transparent===!0&&x.side===2&&x.forceSinglePass===!1?(x.side=1,x.needsUpdate=!0,mr(x,U,B),x.side=0,x.needsUpdate=!0,mr(x,U,B),x.side=2):mr(x,U,B)}this.compile=function(x,U,B=null){B===null&&(B=x),d=Vt.get(B),d.init(U),y.push(d),B.traverseVisible(function(F){F.isLight&&F.layers.test(U.layers)&&(d.pushLight(F),F.castShadow&&d.pushShadow(F))}),x!==B&&x.traverseVisible(function(F){F.isLight&&F.layers.test(U.layers)&&(d.pushLight(F),F.castShadow&&d.pushShadow(F))}),d.setupLights();const k=new Set;return x.traverse(function(F){if(!(F.isMesh||F.isPoints||F.isLine||F.isSprite))return;const tt=F.material;if(tt)if(Array.isArray(tt))for(let ot=0;ot<tt.length;ot++){const ft=tt[ot];Kt(ft,B,F),k.add(ft)}else Kt(tt,B,F),k.add(tt)}),y.pop(),d=null,k},this.compileAsync=function(x,U,B=null){const k=this.compile(x,U,B);return new Promise(F=>{function tt(){if(k.forEach(function(ot){yt.get(ot).currentProgram.isReady()&&k.delete(ot)}),k.size===0){F(x);return}setTimeout(tt,10)}kt.get("KHR_parallel_shader_compile")!==null?tt():setTimeout(tt,10)})};let We=null;function sn(x){We&&We(x)}function _c(){An.stop()}function vc(){An.start()}const An=new ao;An.setAnimationLoop(sn),typeof self<"u"&&An.setContext(self),this.setAnimationLoop=function(x){We=x,W.setAnimationLoop(x),x===null?An.stop():An.start()},W.addEventListener("sessionstart",_c),W.addEventListener("sessionend",vc),this.render=function(x,U){if(U!==void 0&&U.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(L===!0)return;if(x.matrixWorldAutoUpdate===!0&&x.updateMatrixWorld(),U.parent===null&&U.matrixWorldAutoUpdate===!0&&U.updateMatrixWorld(),W.enabled===!0&&W.isPresenting===!0&&(W.cameraAutoUpdate===!0&&W.updateCamera(U),U=W.getCamera()),x.isScene===!0&&x.onBeforeRender(E,x,U,A),d=Vt.get(x,y.length),d.init(U),y.push(d),wt.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),q.setFromProjectionMatrix(wt),pt=this.localClippingEnabled,et=nt.init(this.clippingPlanes,pt),p=mt.get(x,b.length),p.init(),b.push(p),W.enabled===!0&&W.isPresenting===!0){const tt=E.xr.getDepthSensingMesh();tt!==null&&Ms(tt,U,-1/0,E.sortObjects)}Ms(x,U,0,E.sortObjects),p.finish(),E.sortObjects===!0&&p.sort(rt,ut),Ht=W.enabled===!1||W.isPresenting===!1||W.hasDepthSensing()===!1,Ht&&Tt.addToRenderList(p,x),this.info.render.frame++,et===!0&&nt.beginShadows();const B=d.state.shadowsArray;gt.render(B,x,U),et===!0&&nt.endShadows(),this.info.autoReset===!0&&this.info.reset();const k=p.opaque,F=p.transmissive;if(d.setupLights(),U.isArrayCamera){const tt=U.cameras;if(F.length>0)for(let ot=0,ft=tt.length;ot<ft;ot++){const vt=tt[ot];Mc(k,F,x,vt)}Ht&&Tt.render(x);for(let ot=0,ft=tt.length;ot<ft;ot++){const vt=tt[ot];xc(p,x,vt,vt.viewport)}}else F.length>0&&Mc(k,F,x,U),Ht&&Tt.render(x),xc(p,x,U);A!==null&&R===0&&(T.updateMultisampleRenderTarget(A),T.updateRenderTargetMipmap(A)),x.isScene===!0&&x.onAfterRender(E,x,U),$t.resetDefaultState(),S=-1,M=null,y.pop(),y.length>0?(d=y[y.length-1],et===!0&&nt.setGlobalState(E.clippingPlanes,d.state.camera)):d=null,b.pop(),b.length>0?p=b[b.length-1]:p=null};function Ms(x,U,B,k){if(x.visible===!1)return;if(x.layers.test(U.layers)){if(x.isGroup)B=x.renderOrder;else if(x.isLOD)x.autoUpdate===!0&&x.update(U);else if(x.isLight)d.pushLight(x),x.castShadow&&d.pushShadow(x);else if(x.isSprite){if(!x.frustumCulled||q.intersectsSprite(x)){k&&Nt.setFromMatrixPosition(x.matrixWorld).applyMatrix4(wt);const ot=Y.update(x),ft=x.material;ft.visible&&p.push(x,ot,ft,B,Nt.z,null)}}else if((x.isMesh||x.isLine||x.isPoints)&&(!x.frustumCulled||q.intersectsObject(x))){const ot=Y.update(x),ft=x.material;if(k&&(x.boundingSphere!==void 0?(x.boundingSphere===null&&x.computeBoundingSphere(),Nt.copy(x.boundingSphere.center)):(ot.boundingSphere===null&&ot.computeBoundingSphere(),Nt.copy(ot.boundingSphere.center)),Nt.applyMatrix4(x.matrixWorld).applyMatrix4(wt)),Array.isArray(ft)){const vt=ot.groups;for(let Ct=0,Pt=vt.length;Ct<Pt;Ct++){const Et=vt[Ct],Wt=ft[Et.materialIndex];Wt&&Wt.visible&&p.push(x,ot,Wt,B,Nt.z,Et)}}else ft.visible&&p.push(x,ot,ft,B,Nt.z,null)}}const tt=x.children;for(let ot=0,ft=tt.length;ot<ft;ot++)Ms(tt[ot],U,B,k)}function xc(x,U,B,k){const F=x.opaque,tt=x.transmissive,ot=x.transparent;d.setupLightsView(B),et===!0&&nt.setGlobalState(E.clippingPlanes,B),k&&St.viewport(C.copy(k)),F.length>0&&pr(F,U,B),tt.length>0&&pr(tt,U,B),ot.length>0&&pr(ot,U,B),St.buffers.depth.setTest(!0),St.buffers.depth.setMask(!0),St.buffers.color.setMask(!0),St.setPolygonOffset(!1)}function Mc(x,U,B,k){if((B.isScene===!0?B.overrideMaterial:null)!==null)return;d.state.transmissionRenderTarget[k.id]===void 0&&(d.state.transmissionRenderTarget[k.id]=new gn(1,1,{generateMipmaps:!0,type:kt.has("EXT_color_buffer_half_float")||kt.has("EXT_color_buffer_float")?1016:1009,minFilter:1008,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Xt.workingColorSpace}));const tt=d.state.transmissionRenderTarget[k.id],ot=k.viewport||C;tt.setSize(ot.z*E.transmissionResolutionScale,ot.w*E.transmissionResolutionScale);const ft=E.getRenderTarget();E.setRenderTarget(tt),E.getClearColor(X),G=E.getClearAlpha(),G<1&&E.setClearColor(16777215,.5),E.clear(),Ht&&Tt.render(B);const vt=E.toneMapping;E.toneMapping=0;const Ct=k.viewport;if(k.viewport!==void 0&&(k.viewport=void 0),d.setupLightsView(k),et===!0&&nt.setGlobalState(E.clippingPlanes,k),pr(x,B,k),T.updateMultisampleRenderTarget(tt),T.updateRenderTargetMipmap(tt),kt.has("WEBGL_multisampled_render_to_texture")===!1){let Pt=!1;for(let Et=0,Wt=U.length;Et<Wt;Et++){const Yt=U[Et],ce=Yt.object,se=Yt.geometry,qt=Yt.material,bt=Yt.group;if(qt.side===2&&ce.layers.test(k.layers)){const ge=qt.side;qt.side=1,qt.needsUpdate=!0,yc(ce,B,k,se,qt,bt),qt.side=ge,qt.needsUpdate=!0,Pt=!0}}Pt===!0&&(T.updateMultisampleRenderTarget(tt),T.updateRenderTargetMipmap(tt))}E.setRenderTarget(ft),E.setClearColor(X,G),Ct!==void 0&&(k.viewport=Ct),E.toneMapping=vt}function pr(x,U,B){const k=U.isScene===!0?U.overrideMaterial:null;for(let F=0,tt=x.length;F<tt;F++){const ot=x[F],ft=ot.object,vt=ot.geometry,Ct=k===null?ot.material:k,Pt=ot.group;ft.layers.test(B.layers)&&yc(ft,U,B,vt,Ct,Pt)}}function yc(x,U,B,k,F,tt){x.onBeforeRender(E,U,B,k,F,tt),x.modelViewMatrix.multiplyMatrices(B.matrixWorldInverse,x.matrixWorld),x.normalMatrix.getNormalMatrix(x.modelViewMatrix),F.onBeforeRender(E,U,B,k,x,tt),F.transparent===!0&&F.side===2&&F.forceSinglePass===!1?(F.side=1,F.needsUpdate=!0,E.renderBufferDirect(B,U,k,F,x,tt),F.side=0,F.needsUpdate=!0,E.renderBufferDirect(B,U,k,F,x,tt),F.side=2):E.renderBufferDirect(B,U,k,F,x,tt),x.onAfterRender(E,U,B,k,F,tt)}function mr(x,U,B){U.isScene!==!0&&(U=ne);const k=yt.get(x),F=d.state.lights,tt=d.state.shadowsArray,ot=F.state.version,ft=xt.getParameters(x,F.state,tt,U,B),vt=xt.getProgramCacheKey(ft);let Ct=k.programs;k.environment=x.isMeshStandardMaterial?U.environment:null,k.fog=U.fog,k.envMap=(x.isMeshStandardMaterial?N:v).get(x.envMap||k.environment),k.envMapRotation=k.environment!==null&&x.envMap===null?U.environmentRotation:x.envMapRotation,Ct===void 0&&(x.addEventListener("dispose",Lt),Ct=new Map,k.programs=Ct);let Pt=Ct.get(vt);if(Pt!==void 0){if(k.currentProgram===Pt&&k.lightsStateVersion===ot)return Ec(x,ft),Pt}else ft.uniforms=xt.getUniforms(x),x.onBeforeCompile(ft,E),Pt=xt.acquireProgram(ft,vt),Ct.set(vt,Pt),k.uniforms=ft.uniforms;const Et=k.uniforms;return(!x.isShaderMaterial&&!x.isRawShaderMaterial||x.clipping===!0)&&(Et.clippingPlanes=nt.uniform),Ec(x,ft),k.needsLights=ag(x),k.lightsStateVersion=ot,k.needsLights&&(Et.ambientLightColor.value=F.state.ambient,Et.lightProbe.value=F.state.probe,Et.directionalLights.value=F.state.directional,Et.directionalLightShadows.value=F.state.directionalShadow,Et.spotLights.value=F.state.spot,Et.spotLightShadows.value=F.state.spotShadow,Et.rectAreaLights.value=F.state.rectArea,Et.ltc_1.value=F.state.rectAreaLTC1,Et.ltc_2.value=F.state.rectAreaLTC2,Et.pointLights.value=F.state.point,Et.pointLightShadows.value=F.state.pointShadow,Et.hemisphereLights.value=F.state.hemi,Et.directionalShadowMap.value=F.state.directionalShadowMap,Et.directionalShadowMatrix.value=F.state.directionalShadowMatrix,Et.spotShadowMap.value=F.state.spotShadowMap,Et.spotLightMatrix.value=F.state.spotLightMatrix,Et.spotLightMap.value=F.state.spotLightMap,Et.pointShadowMap.value=F.state.pointShadowMap,Et.pointShadowMatrix.value=F.state.pointShadowMatrix),k.currentProgram=Pt,k.uniformsList=null,Pt}function Sc(x){if(x.uniformsList===null){const U=x.currentProgram.getUniforms();x.uniformsList=Zi.seqWithValue(U.seq,x.uniforms)}return x.uniformsList}function Ec(x,U){const B=yt.get(x);B.outputColorSpace=U.outputColorSpace,B.batching=U.batching,B.batchingColor=U.batchingColor,B.instancing=U.instancing,B.instancingColor=U.instancingColor,B.instancingMorph=U.instancingMorph,B.skinning=U.skinning,B.morphTargets=U.morphTargets,B.morphNormals=U.morphNormals,B.morphColors=U.morphColors,B.morphTargetsCount=U.morphTargetsCount,B.numClippingPlanes=U.numClippingPlanes,B.numIntersection=U.numClipIntersection,B.vertexAlphas=U.vertexAlphas,B.vertexTangents=U.vertexTangents,B.toneMapping=U.toneMapping}function sg(x,U,B,k,F){U.isScene!==!0&&(U=ne),T.resetTextureUnits();const tt=U.fog,ot=k.isMeshStandardMaterial?U.environment:null,ft=A===null?E.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:Rn,vt=(k.isMeshStandardMaterial?N:v).get(k.envMap||ot),Ct=k.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,Pt=!!B.attributes.tangent&&(!!k.normalMap||k.anisotropy>0),Et=!!B.morphAttributes.position,Wt=!!B.morphAttributes.normal,Yt=!!B.morphAttributes.color;let ce=0;k.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(ce=E.toneMapping);const se=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,qt=se!==void 0?se.length:0,bt=yt.get(k),ge=d.state.lights;if(et===!0&&(pt===!0||x!==M)){const be=x===M&&k.id===S;nt.setState(k,x,be)}let jt=!1;k.version===bt.__version?(bt.needsLights&&bt.lightsStateVersion!==ge.state.version||bt.outputColorSpace!==ft||F.isBatchedMesh&&bt.batching===!1||!F.isBatchedMesh&&bt.batching===!0||F.isBatchedMesh&&bt.batchingColor===!0&&F.colorTexture===null||F.isBatchedMesh&&bt.batchingColor===!1&&F.colorTexture!==null||F.isInstancedMesh&&bt.instancing===!1||!F.isInstancedMesh&&bt.instancing===!0||F.isSkinnedMesh&&bt.skinning===!1||!F.isSkinnedMesh&&bt.skinning===!0||F.isInstancedMesh&&bt.instancingColor===!0&&F.instanceColor===null||F.isInstancedMesh&&bt.instancingColor===!1&&F.instanceColor!==null||F.isInstancedMesh&&bt.instancingMorph===!0&&F.morphTexture===null||F.isInstancedMesh&&bt.instancingMorph===!1&&F.morphTexture!==null||bt.envMap!==vt||k.fog===!0&&bt.fog!==tt||bt.numClippingPlanes!==void 0&&(bt.numClippingPlanes!==nt.numPlanes||bt.numIntersection!==nt.numIntersection)||bt.vertexAlphas!==Ct||bt.vertexTangents!==Pt||bt.morphTargets!==Et||bt.morphNormals!==Wt||bt.morphColors!==Yt||bt.toneMapping!==ce||bt.morphTargetsCount!==qt)&&(jt=!0):(jt=!0,bt.__version=k.version);let Xe=bt.currentProgram;jt===!0&&(Xe=mr(k,U,F));let ti=!1,Pe=!1,Mi=!1;const ee=Xe.getUniforms(),Fe=bt.uniforms;if(St.useProgram(Xe.program)&&(ti=!0,Pe=!0,Mi=!0),k.id!==S&&(S=k.id,Pe=!0),ti||M!==x){St.buffers.depth.getReversed()?(at.copy(x.projectionMatrix),Hc(at),Vc(at),ee.setValue(D,"projectionMatrix",at)):ee.setValue(D,"projectionMatrix",x.projectionMatrix),ee.setValue(D,"viewMatrix",x.matrixWorldInverse);const we=ee.map.cameraPosition;we!==void 0&&we.setValue(D,Rt.setFromMatrixPosition(x.matrixWorld)),zt.logarithmicDepthBuffer&&ee.setValue(D,"logDepthBufFC",2/(Math.log(x.far+1)/Math.LN2)),(k.isMeshPhongMaterial||k.isMeshToonMaterial||k.isMeshLambertMaterial||k.isMeshBasicMaterial||k.isMeshStandardMaterial||k.isShaderMaterial)&&ee.setValue(D,"isOrthographic",x.isOrthographicCamera===!0),M!==x&&(M=x,Pe=!0,Mi=!0)}if(F.isSkinnedMesh){ee.setOptional(D,F,"bindMatrix"),ee.setOptional(D,F,"bindMatrixInverse");const be=F.skeleton;be&&(be.boneTexture===null&&be.computeBoneTexture(),ee.setValue(D,"boneTexture",be.boneTexture,T))}F.isBatchedMesh&&(ee.setOptional(D,F,"batchingTexture"),ee.setValue(D,"batchingTexture",F._matricesTexture,T),ee.setOptional(D,F,"batchingIdTexture"),ee.setValue(D,"batchingIdTexture",F._indirectTexture,T),ee.setOptional(D,F,"batchingColorTexture"),F._colorsTexture!==null&&ee.setValue(D,"batchingColorTexture",F._colorsTexture,T));const Ne=B.morphAttributes;if((Ne.position!==void 0||Ne.normal!==void 0||Ne.color!==void 0)&&At.update(F,B,Xe),(Pe||bt.receiveShadow!==F.receiveShadow)&&(bt.receiveShadow=F.receiveShadow,ee.setValue(D,"receiveShadow",F.receiveShadow)),k.isMeshGouraudMaterial&&k.envMap!==null&&(Fe.envMap.value=vt,Fe.flipEnvMap.value=vt.isCubeTexture&&vt.isRenderTargetTexture===!1?-1:1),k.isMeshStandardMaterial&&k.envMap===null&&U.environment!==null&&(Fe.envMapIntensity.value=U.environmentIntensity),Pe&&(ee.setValue(D,"toneMappingExposure",E.toneMappingExposure),bt.needsLights&&og(Fe,Mi),tt&&k.fog===!0&&ct.refreshFogUniforms(Fe,tt),ct.refreshMaterialUniforms(Fe,k,z,$,d.state.transmissionRenderTarget[x.id]),Zi.upload(D,Sc(bt),Fe,T)),k.isShaderMaterial&&k.uniformsNeedUpdate===!0&&(Zi.upload(D,Sc(bt),Fe,T),k.uniformsNeedUpdate=!1),k.isSpriteMaterial&&ee.setValue(D,"center",F.center),ee.setValue(D,"modelViewMatrix",F.modelViewMatrix),ee.setValue(D,"normalMatrix",F.normalMatrix),ee.setValue(D,"modelMatrix",F.matrixWorld),k.isShaderMaterial||k.isRawShaderMaterial){const be=k.uniformsGroups;for(let we=0,ys=be.length;we<ys;we++){const Cn=be[we];I.update(Cn,Xe),I.bind(Cn,Xe)}}return Xe}function og(x,U){x.ambientLightColor.needsUpdate=U,x.lightProbe.needsUpdate=U,x.directionalLights.needsUpdate=U,x.directionalLightShadows.needsUpdate=U,x.pointLights.needsUpdate=U,x.pointLightShadows.needsUpdate=U,x.spotLights.needsUpdate=U,x.spotLightShadows.needsUpdate=U,x.rectAreaLights.needsUpdate=U,x.hemisphereLights.needsUpdate=U}function ag(x){return x.isMeshLambertMaterial||x.isMeshToonMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isShadowMaterial||x.isShaderMaterial&&x.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return R},this.getRenderTarget=function(){return A},this.setRenderTargetTextures=function(x,U,B){yt.get(x.texture).__webglTexture=U,yt.get(x.depthTexture).__webglTexture=B;const k=yt.get(x);k.__hasExternalTextures=!0,k.__autoAllocateDepthBuffer=B===void 0,k.__autoAllocateDepthBuffer||kt.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),k.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(x,U){const B=yt.get(x);B.__webglFramebuffer=U,B.__useDefaultFramebuffer=U===void 0};const cg=D.createFramebuffer();this.setRenderTarget=function(x,U=0,B=0){A=x,w=U,R=B;let k=!0,F=null,tt=!1,ot=!1;if(x){const vt=yt.get(x);if(vt.__useDefaultFramebuffer!==void 0)St.bindFramebuffer(D.FRAMEBUFFER,null),k=!1;else if(vt.__webglFramebuffer===void 0)T.setupRenderTarget(x);else if(vt.__hasExternalTextures)T.rebindTextures(x,yt.get(x.texture).__webglTexture,yt.get(x.depthTexture).__webglTexture);else if(x.depthBuffer){const Et=x.depthTexture;if(vt.__boundDepthTexture!==Et){if(Et!==null&&yt.has(Et)&&(x.width!==Et.image.width||x.height!==Et.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");T.setupDepthRenderbuffer(x)}}const Ct=x.texture;(Ct.isData3DTexture||Ct.isDataArrayTexture||Ct.isCompressedArrayTexture)&&(ot=!0);const Pt=yt.get(x).__webglFramebuffer;x.isWebGLCubeRenderTarget?(Array.isArray(Pt[U])?F=Pt[U][B]:F=Pt[U],tt=!0):x.samples>0&&T.useMultisampledRTT(x)===!1?F=yt.get(x).__webglMultisampledFramebuffer:Array.isArray(Pt)?F=Pt[B]:F=Pt,C.copy(x.viewport),H.copy(x.scissor),O=x.scissorTest}else C.copy(j).multiplyScalar(z).floor(),H.copy(dt).multiplyScalar(z).floor(),O=Mt;if(B!==0&&(F=cg),St.bindFramebuffer(D.FRAMEBUFFER,F)&&k&&St.drawBuffers(x,F),St.viewport(C),St.scissor(H),St.setScissorTest(O),tt){const vt=yt.get(x.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+U,vt.__webglTexture,B)}else if(ot){const vt=yt.get(x.texture),Ct=U;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,vt.__webglTexture,B,Ct)}else if(x!==null&&B!==0){const vt=yt.get(x.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,vt.__webglTexture,B)}S=-1},this.readRenderTargetPixels=function(x,U,B,k,F,tt,ot){if(!(x&&x.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ft=yt.get(x).__webglFramebuffer;if(x.isWebGLCubeRenderTarget&&ot!==void 0&&(ft=ft[ot]),ft){St.bindFramebuffer(D.FRAMEBUFFER,ft);try{const vt=x.texture,Ct=vt.format,Pt=vt.type;if(!zt.textureFormatReadable(Ct)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!zt.textureTypeReadable(Pt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=x.width-k&&B>=0&&B<=x.height-F&&D.readPixels(U,B,k,F,Ut.convert(Ct),Ut.convert(Pt),tt)}finally{const vt=A!==null?yt.get(A).__webglFramebuffer:null;St.bindFramebuffer(D.FRAMEBUFFER,vt)}}},this.readRenderTargetPixelsAsync=async function(x,U,B,k,F,tt,ot){if(!(x&&x.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ft=yt.get(x).__webglFramebuffer;if(x.isWebGLCubeRenderTarget&&ot!==void 0&&(ft=ft[ot]),ft){const vt=x.texture,Ct=vt.format,Pt=vt.type;if(!zt.textureFormatReadable(Ct))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!zt.textureTypeReadable(Pt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(U>=0&&U<=x.width-k&&B>=0&&B<=x.height-F){St.bindFramebuffer(D.FRAMEBUFFER,ft);const Et=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,Et),D.bufferData(D.PIXEL_PACK_BUFFER,tt.byteLength,D.STREAM_READ),D.readPixels(U,B,k,F,Ut.convert(Ct),Ut.convert(Pt),0);const Wt=A!==null?yt.get(A).__webglFramebuffer:null;St.bindFramebuffer(D.FRAMEBUFFER,Wt);const Yt=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await Gc(D,Yt,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,Et),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,tt),D.deleteBuffer(Et),D.deleteSync(Yt),tt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(x,U=null,B=0){x.isTexture!==!0&&(In("WebGLRenderer: copyFramebufferToTexture function signature has changed."),U=arguments[0]||null,x=arguments[1]);const k=Math.pow(2,-B),F=Math.floor(x.image.width*k),tt=Math.floor(x.image.height*k),ot=U!==null?U.x:0,ft=U!==null?U.y:0;T.setTexture2D(x,0),D.copyTexSubImage2D(D.TEXTURE_2D,B,0,0,ot,ft,F,tt),St.unbindTexture()};const lg=D.createFramebuffer(),hg=D.createFramebuffer();this.copyTextureToTexture=function(x,U,B=null,k=null,F=0,tt=null){x.isTexture!==!0&&(In("WebGLRenderer: copyTextureToTexture function signature has changed."),k=arguments[0]||null,x=arguments[1],U=arguments[2],tt=arguments[3]||0,B=null),tt===null&&(F!==0?(In("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),tt=F,F=0):tt=0);let ot,ft,vt,Ct,Pt,Et,Wt,Yt,ce;const se=x.isCompressedTexture?x.mipmaps[tt]:x.image;if(B!==null)ot=B.max.x-B.min.x,ft=B.max.y-B.min.y,vt=B.isBox3?B.max.z-B.min.z:1,Ct=B.min.x,Pt=B.min.y,Et=B.isBox3?B.min.z:0;else{const Ne=Math.pow(2,-F);ot=Math.floor(se.width*Ne),ft=Math.floor(se.height*Ne),x.isDataArrayTexture?vt=se.depth:x.isData3DTexture?vt=Math.floor(se.depth*Ne):vt=1,Ct=0,Pt=0,Et=0}k!==null?(Wt=k.x,Yt=k.y,ce=k.z):(Wt=0,Yt=0,ce=0);const qt=Ut.convert(U.format),bt=Ut.convert(U.type);let ge;U.isData3DTexture?(T.setTexture3D(U,0),ge=D.TEXTURE_3D):U.isDataArrayTexture||U.isCompressedArrayTexture?(T.setTexture2DArray(U,0),ge=D.TEXTURE_2D_ARRAY):(T.setTexture2D(U,0),ge=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,U.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,U.unpackAlignment);const jt=D.getParameter(D.UNPACK_ROW_LENGTH),Xe=D.getParameter(D.UNPACK_IMAGE_HEIGHT),ti=D.getParameter(D.UNPACK_SKIP_PIXELS),Pe=D.getParameter(D.UNPACK_SKIP_ROWS),Mi=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,se.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,se.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Ct),D.pixelStorei(D.UNPACK_SKIP_ROWS,Pt),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Et);const ee=x.isDataArrayTexture||x.isData3DTexture,Fe=U.isDataArrayTexture||U.isData3DTexture;if(x.isDepthTexture){const Ne=yt.get(x),be=yt.get(U),we=yt.get(Ne.__renderTarget),ys=yt.get(be.__renderTarget);St.bindFramebuffer(D.READ_FRAMEBUFFER,we.__webglFramebuffer),St.bindFramebuffer(D.DRAW_FRAMEBUFFER,ys.__webglFramebuffer);for(let Cn=0;Cn<vt;Cn++)ee&&(D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,yt.get(x).__webglTexture,F,Et+Cn),D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,yt.get(U).__webglTexture,tt,ce+Cn)),D.blitFramebuffer(Ct,Pt,ot,ft,Wt,Yt,ot,ft,D.DEPTH_BUFFER_BIT,D.NEAREST);St.bindFramebuffer(D.READ_FRAMEBUFFER,null),St.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else if(F!==0||x.isRenderTargetTexture||yt.has(x)){const Ne=yt.get(x),be=yt.get(U);St.bindFramebuffer(D.READ_FRAMEBUFFER,lg),St.bindFramebuffer(D.DRAW_FRAMEBUFFER,hg);for(let we=0;we<vt;we++)ee?D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Ne.__webglTexture,F,Et+we):D.framebufferTexture2D(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Ne.__webglTexture,F),Fe?D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,be.__webglTexture,tt,ce+we):D.framebufferTexture2D(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,be.__webglTexture,tt),F!==0?D.blitFramebuffer(Ct,Pt,ot,ft,Wt,Yt,ot,ft,D.COLOR_BUFFER_BIT,D.NEAREST):Fe?D.copyTexSubImage3D(ge,tt,Wt,Yt,ce+we,Ct,Pt,ot,ft):D.copyTexSubImage2D(ge,tt,Wt,Yt,Ct,Pt,ot,ft);St.bindFramebuffer(D.READ_FRAMEBUFFER,null),St.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else Fe?x.isDataTexture||x.isData3DTexture?D.texSubImage3D(ge,tt,Wt,Yt,ce,ot,ft,vt,qt,bt,se.data):U.isCompressedArrayTexture?D.compressedTexSubImage3D(ge,tt,Wt,Yt,ce,ot,ft,vt,qt,se.data):D.texSubImage3D(ge,tt,Wt,Yt,ce,ot,ft,vt,qt,bt,se):x.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,tt,Wt,Yt,ot,ft,qt,bt,se.data):x.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,tt,Wt,Yt,se.width,se.height,qt,se.data):D.texSubImage2D(D.TEXTURE_2D,tt,Wt,Yt,ot,ft,qt,bt,se);D.pixelStorei(D.UNPACK_ROW_LENGTH,jt),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Xe),D.pixelStorei(D.UNPACK_SKIP_PIXELS,ti),D.pixelStorei(D.UNPACK_SKIP_ROWS,Pe),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Mi),tt===0&&U.generateMipmaps&&D.generateMipmap(ge),St.unbindTexture()},this.copyTextureToTexture3D=function(x,U,B=null,k=null,F=0){return x.isTexture!==!0&&(In("WebGLRenderer: copyTextureToTexture3D function signature has changed."),B=arguments[0]||null,k=arguments[1]||null,x=arguments[2],U=arguments[3],F=arguments[4]||0),In('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(x,U,B,k,F)},this.initRenderTarget=function(x){yt.get(x).__webglFramebuffer===void 0&&T.setupRenderTarget(x)},this.initTexture=function(x){x.isCubeTexture?T.setTextureCube(x,0):x.isData3DTexture?T.setTexture3D(x,0):x.isDataArrayTexture||x.isCompressedArrayTexture?T.setTexture2DArray(x,0):T.setTexture2D(x,0),St.unbindTexture()},this.resetState=function(){w=0,R=0,A=null,St.reset(),$t.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return 2e3}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=Xt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Xt._getUnpackColorSpace()}}function Bo(){return document.documentElement.dataset.d3dUiScrub==="1"}const Oo=new Ot,ko=new P,zo=new fn,Go=new ro;function Cf(n,t,e){return n.updateMatrixWorld(!0),n.getWorldDirection(ko),zo.setFromNormalAndCoplanarPoint(ko,t),Oo.set(0,0),Go.setFromCamera(Oo,n),Go.ray.intersectPlane(zo,e)??e.copy(t)}const Ho="frustumHalfHeight";function Rf(n,t=.1,e=1e5){const r=new di(-50*n,50*n,50,-50,t,e);return r.userData[Ho]=50,r.zoom=1,r.position.copy(rn),r}function Vo(n){const t=n.userData[Ho];return typeof t=="number"&&t>0?t:Math.abs(n.top-n.bottom)*.5}function Pf(n,t){if(t<=0)return 1;const e=Math.max(n.zoom,1e-6),i=Vo(n),r=(n.right-n.left)/Math.max(n.top-n.bottom,1e-6);return 2*i*r/(e*t)}new P,new Ie,new di(-1,1,1,-1,.01,1e6);function Wo(n,t){if(t<=0)return 1;const e=Math.max(n.zoom,1e-6);return 2*Vo(n)/(e*t)}function Df(n,t){return Wo(n,t)}const rn=new P(0,0,0),Lf=1.5,If=new P(0,1,0),Xo=new P(0,0,1),Uf=.1,Ff=20,Nf=250,qo={top:new P(0,0,1),bottom:new P(0,0,-1),front:new P(0,1,0),back:new P(0,-1,0),left:new P(1,0,0),right:new P(-1,0,0),"front-right":new P(-1,1,.2),"front-left":new P(1,1,.2),"back-right":new P(-1,-1,.2),"back-left":new P(1,-1,.2)},Yo=new P(0,1,0),Bf=new P(0,0,1),Qi=new P,jo=new Jt,$i=new De,tr=new P,je=new P,Jn=new P,pi=new P,wn=new P;function Ko(n,t){const{min:e,max:i}=n,r=[e.x,i.x],s=[e.y,i.y],a=[e.z,i.z];let o=0;for(const c of r)for(const l of s)for(const h of a)t[o]?.set(c,l,h),o+=1}function Zo(n,t,e,i=1.15){if(n.isEmpty())return 200;const r=n.getCenter(new P),s=Array.from({length:8},()=>new P);Ko(n,s);const a=new di(-1,1,1,-1,e,1e5);a.quaternion.copy(t);let o=Math.max(n.getSize(new P).length()*.5,50);for(let c=0;c<32;c+=1){a.position.copy(r),a.updateMatrixWorld(!0),a.getWorldDirection(Jn),a.position.addScaledVector(Jn,-o),a.updateMatrixWorld(!0);let l=!0;for(const h of s)if(wn.copy(h).applyMatrix4(a.matrixWorldInverse),wn.z>=-e){l=!1;break}if(l)return o*i;o*=1.35}return o*i}function Jo(n){return n==="top"||n==="bottom"?Yo:Bf}function ts(n,t){return Qo(new De,n,t)}function Qo(n,t,e){return Qi.copy(t).normalize(),jo.lookAt(Qi,rn,e),n.setFromRotationMatrix(jo)}const Of=.82;function kf(n){if(n.length!==16)return new De;if(pi.set(n[8],n[9],n[10]),pi.lengthSq()<1e-8)return new De;pi.normalize(),Qi.copy(pi).negate();const t=Math.abs(pi.z)>Of?Yo:Xo;return Qo(new De,Qi,t)}function zf(n,t){return t.dentalWebGlMatrix&&t.dentalWebGlMatrix.length===16?(os(n),n.rotation.copy(kf(t.dentalWebGlMatrix)),!0):t.preset?(ha(n,t.preset,{resetPan:t.resetPan}),!0):!1}function Gf(n,t,e,i,r){const s=r.isEmpty()?new P(0,0,0):r.getCenter(new P),a=e.length===16;return a&&zf(t,{dentalWebGlMatrix:e,resetPan:!0}),r.isEmpty()?pe(n,t,i,s):la(t,n,r,i,{preserveRotation:a}),s.clone()}function $o(n){return{rotation:n.rotation.clone(),panX:n.panX,panY:n.panY,zoom:n.zoom,frustumHalfHeight:n.frustumHalfHeight,viewDistance:n.viewDistance,near:n.near,far:n.far}}function es(n,t=new Ie){return t.name="viewport-rig",n.parent&&n.parent.remove(n),t.add(n),t}function Hf(n){if(n.parent instanceof Ie)return n.parent;const t=n.userData.viewportRig;if(t instanceof Ie)return n.parent!==t&&es(n,t),t;const e=new Ie;return e.name="viewport-rig",es(n,e),n.userData.viewportRig=e,e}function Vf(n,t){if(t.isEmpty())return;const e=t.getSize(new P),i=Math.max(e.length(),50);n.near=Uf,n.far=i*Ff;let r=i*4;const s=["front","top","left","right","front-right","back-left"];for(const a of s){Jn.copy(qo[a]).normalize();const o=ts(Jn,Jo(a));r=Math.max(r,Zo(t,o,n.near,1.2))}n.viewDistance=r}function pe(n,t,e,i=rn,r){const s=Hf(n);s.position.copy(i),s.quaternion.copy(t.rotation),n.position.set(0,0,t.viewDistance),n.quaternion.set(0,0,0,1),n.rotation.set(0,0,0),n.zoom=Math.max(t.zoom,1e-6),n.near=t.near,n.far=t.far,n.userData.frustumHalfHeight=t.frustumHalfHeight;const a=t.frustumHalfHeight,o=a*e;n.left=-o+t.panX,n.right=o+t.panX,n.top=a+t.panY,n.bottom=-a+t.panY,n.clearViewOffset(),n.updateProjectionMatrix(),s.updateMatrixWorld(!0),n.updateMatrixWorld(!0)}function ns(n,t){return n.frustumHalfHeight*t}function pn(n,t,e,i,r,s,a=rn){if(s<=0)return;const o=r/Math.max(s,1);pe(t,n,o,a);const c=Pf(t,r),l=Wo(t,s);n.panX-=e*c,n.panY+=i*l}const ta=.22,ea=.005;function Wf(n,t,e,i=ea){if(!(t===0&&e===0)){if(t!==0){const r=Math.min(Math.abs(t)*i,ta);tr.set(0,1,0).applyQuaternion(n),$i.setFromAxisAngle(tr,-Math.sign(t)*r),n.premultiply($i)}if(e!==0){const r=Math.min(Math.abs(e)*i,ta);tr.set(1,0,0).applyQuaternion(n),$i.setFromAxisAngle(tr,-Math.sign(e)*r),n.premultiply($i)}n.normalize()}}function er(n,t,e,i,r,s,a=rn){e===0&&i===0||(pe(t,n,s,a),Wf(n.rotation,e,i,r))}function Xf(n,t,e,i,r,s){pe(t,n,r,e),t.updateMatrixWorld(!0);const a=s.clone().project(t);pe(t,n,r,i),t.updateMatrixWorld(!0);const o=s.clone().project(t),c=Math.max(n.zoom,1e-6),l=n.frustumHalfHeight,h=ns(n,r);n.panX+=(o.x-a.x)*h/c,n.panY+=(o.y-a.y)*l/c}const na=Array.from({length:8},()=>new P);function qf(n,t,e,i,r=rn){if(e.isEmpty()||i<=0)return;pe(t,n,i,r),Ko(e,na);let s=1/0,a=-1/0,o=1/0,c=-1/0;for(const b of na)je.copy(b).project(t),!(!Number.isFinite(je.x)||!Number.isFinite(je.y))&&(s=Math.min(s,je.x),a=Math.max(a,je.x),o=Math.min(o,je.y),c=Math.max(c,je.y));const l=a-s,h=c-o;if(!Number.isFinite(l)||!Number.isFinite(h)||l<1e-8||h<1e-8)return;const u=Math.min(l*.5,2),f=Math.min(h*.5,2);let m=0,g=0;if(a<-1+u?m=-1+u-a:s>1-u&&(m=1-u-s),c<-1+f?g=-1+f-c:o>1-f&&(g=1-f-o),Math.abs(m)<1e-8&&Math.abs(g)<1e-8)return;const _=Math.max(n.zoom,1e-6),p=n.frustumHalfHeight,d=ns(n,i);n.panX-=m*d/_,n.panY-=g*p/_}function ia(n,t,e,i){let r=.01,s=500;if(e&&!e.isEmpty()&&i>0){const a=e.getSize(new P),o=Math.max(a.x,a.y,a.z,1),c=Math.max(2*t.frustumHalfHeight,1),l=o/c;r=Math.max(l*.003,.01),s=Math.min(l*350,2e3)}return ri.clamp(n,r,s)}function ra(n,t,e=.001,i,r,s=!0){const a=Math.exp(-t*e),o=n.zoom*a;n.zoom=s?ia(o,n,i,r??800):Math.max(o,1e-8)}const nr=new P,sa=new P,is=new P,oa=new P,aa=new P;function rs(n,t,e,i,r,s,a){const o=i.getBoundingClientRect();if(o.width<=0||o.height<=0)return!1;const c=o.width/Math.max(o.height,1);return pe(n,t,c,e),n.updateMatrixWorld(!0),nr.set((r-o.left)/o.width*2-1,-((s-o.top)/o.height)*2+1,0),a.copy(nr).unproject(n),!0}function ss(n,t,e,i,r,s,a){const o=i.getBoundingClientRect();if(o.width<=0||o.height<=0)return;const c=o.width/Math.max(o.height,1);pe(t,n,c,e),t.updateMatrixWorld(!0),nr.set((r-o.left)/o.width*2-1,-((s-o.top)/o.height)*2+1,0),sa.copy(nr).unproject(t),is.subVectors(a,sa),oa.set(1,0,0).transformDirection(t.matrixWorld),aa.set(0,1,0).transformDirection(t.matrixWorld),n.panX+=is.dot(oa),n.panY+=is.dot(aa)}function Yf(n,t,e,i,r=rn){const s=$o(n);return ca(s,t,e,i,r),{panX:s.panX,panY:s.panY}}function jf(n,t,e,i){const r=ri.clamp(i,0,1);n.panX=ri.lerp(n.panX,t,r),n.panY=ri.lerp(n.panY,e,r)}function Kf(n){const t=ri.clamp(n,0,1);return 1-Math.pow(1-t,3)}const Zf=Nf;function ca(n,t,e,i,r=rn){pe(t,n,i,r),je.copy(e).project(t);const s=Math.max(n.zoom,1e-6),a=n.frustumHalfHeight,o=ns(n,i);n.panX+=je.x*o/s,n.panY+=je.y*a/s}function os(n){n.panX=0,n.panY=0}function Jf(n,t){if(n.isEmpty())return{halfH:50,halfW:50};t.updateMatrixWorld(!0);const e=t.matrixWorldInverse;let i=1/0,r=-1/0,s=1/0,a=-1/0;const{min:o,max:c}=n;for(const l of[o.x,c.x])for(const h of[o.y,c.y])for(const u of[o.z,c.z])wn.set(l,h,u).applyMatrix4(e),i=Math.min(i,wn.x),r=Math.max(r,wn.x),s=Math.min(s,wn.y),a=Math.max(a,wn.y);return{halfH:Math.max((a-s)*.5,.5),halfW:Math.max((r-i)*.5,.5)}}function la(n,t,e,i,r){if(e.isEmpty())return 0;os(n),n.zoom=1,r?.preserveRotation||n.rotation.copy(ts(If,Xo));const s=e.getCenter(new P);Vf(n,e);const a=e.getSize(new P);n.frustumHalfHeight=Math.max(a.length(),1)*.5,pe(t,n,i,s);const o=Jf(e,t);return n.frustumHalfHeight=Math.max(o.halfH,o.halfW/i)*Lf,pe(t,n,i,s),ca(n,t,s,i,s),pe(t,n,i,s),n.frustumHalfHeight*2}function ha(n,t,e={}){e.resetPan&&os(n),Jn.copy(qo[t]).normalize(),n.rotation.copy(ts(Jn,Jo(t)))}function ua(n){const t=n.frustumHalfHeight,e=new De(...n.quaternion);return{rotation:e,panX:n.panX??n.panLocalX??0,panY:n.panY??n.panLocalY??0,zoom:n.zoom,frustumHalfHeight:t,viewDistance:n.viewDistance??Zo(new Je(new P(-t,-t,-t),new P(t,t,t)),e,n.near),near:n.near,far:n.far}}const ue={Left:1,Right:2,Middle:4},da={0:ue.Left,1:ue.Middle,2:ue.Right},fa=["input","button","select","textarea","label","a",".mesh-panel",".articulator-panel",".exocad-views-panel",".layers-dock",".view-orientation-widget",".mesh-overlay",".mobile-sheet",".mobile-dock",".cut-view-panel",".heatmap-legend",".heatmap-range-control","#password-gate"].join(",");function Qf(n){return n instanceof Element?n:n instanceof Node?n.parentElement:null}function $f(n){return Qf(n)?.closest(fa)!=null}const as=0,ir=10,cs=5,ls=ea,pa=.0025,tp=36,ep=32,ma=40,ga=72,np=5,ip=5,rp=48,sp=12,rr=180,op=220,ap=16,cp=800,lp=4,hp=.15;function _a(n,t,e){const i=Math.abs(n),r=Math.abs(t);return e!==0?r>=i:r>0&&i<=Math.max(lp,r*hp)}function up(n,t,e){return e!==0||_a(n,t,e)?!1:Math.abs(n)+Math.abs(t)>0}function sr(n,t,e){let i=n;return t===1?i*=ap:t===2?i*=cp:t===0&&!e?.pinch&&e?.pixelBoost!==!1&&Math.abs(i)>0&&Math.abs(i)<rp&&(i*=ip),e?.pinch&&(i*=np),i}class me{camera;domElement;state;pivot=new P;gestureMode="none";pressedButtons=0;leftEverInGesture=!1;panRotationLock=null;rotationAtRmbDown=null;isDragging=!1;suppressContextMenu=!1;dragStartX=0;dragStartY=0;lastX=0;lastY=0;activePointerId=null;pivotPickHandler=null;middleClickHandler=null;onPivotChanged=null;onPivotPicked=null;onChange=null;rightButtonOrbitEnabled=!0;leftButtonOrbitEnabled=!1;middleButtonPanEnabled=!0;interactionEnabled=!0;middleClickHandledByPointerUp=!1;lastMiddleClickSignature="";lastMiddleClickTime=0;pivotChangeAnchor=new P;zoomCursorWorldBefore=new P;contentBoxProvider=null;panBoundsEnabled=!1;zoomClampEnabled=!0;gestureHooks={};pivotPanAnim=null;touchNavigationEnabled=!1;desktopOneFingerOrbitEnabled=!0;touchMode="none";touchPointers=new Map;touchPinchStartDistance=0;touchPinchStartZoom=1;touchPinchCenterX=0;touchPinchCenterY=0;touchPanLastCenter=null;desktopTouchPointers=new Map;desktopThreeFingerMode="none";desktopTwoFingerMode="none";desktopOneFingerMode="none";desktopTouchDragged=!1;desktopTouchStartCenter={x:0,y:0};desktopTouchLastCenter={x:0,y:0};desktopTouchModifiers={shift:!1,ctrl:!1};desktopPinchStartDistance=0;desktopPinchStartZoom=1;desktopPinchZoomArmed=!1;desktopTwoFingerPinchRaf=0;wheelPanAccumX=0;wheelPanAccumY=0;wheelPanRaf=0;wheelPanLastX=0;wheelPanLastY=0;wheelPanLastXAt=0;wheelPanLastYAt=0;wheelPanLastAt=0;wheelGesture="none";wheelGestureAt=0;wheelZoomAccum=0;wheelZoomClientX=0;wheelZoomClientY=0;wheelZoomRaf=0;wheelZoomLastTs=0;wheelZoomGesturing=!1;handledWheelEvents=new WeakSet;wheelBoundsEl=null;trackpadWheelPanEnabled=!0;static pointerCapture={capture:!0};static wheelCapture={passive:!1,capture:!0};constructor(t,e,i){this.camera=t,this.state=e,this.domElement=i,i.style.touchAction="none",i.style.msTouchAction="none",i.addEventListener("pointerdown",this.onPointerDown,me.pointerCapture),i.addEventListener("pointermove",this.onPointerMove,me.pointerCapture),i.addEventListener("pointerup",this.onPointerUp,me.pointerCapture),i.addEventListener("pointercancel",this.onPointerUp,me.pointerCapture),i.addEventListener("pointerleave",this.onPointerLeave),window.addEventListener("wheel",this.onWindowWheel,me.wheelCapture),i.addEventListener("wheel",this.onWheel,me.wheelCapture),window.addEventListener("keydown",this.onZoomKeyDown,!0),i.addEventListener("contextmenu",this.onContextMenu),i.addEventListener("auxclick",this.onAuxClick),window.addEventListener("blur",this.onBlur),window.addEventListener("pointerup",this.onWindowPointerUp)}bothButtons(t){return(t&ue.Left)!==0&&(t&ue.Right)!==0}getAspect(){const t=this.wheelBoundsEl??this.domElement,e=t.clientWidth||this.domElement.clientWidth,i=t.clientHeight||this.domElement.clientHeight;return e/Math.max(i,1)}syncCamera(t=!0){pe(this.camera,this.state,this.getAspect(),this.pivot),t&&this.onChange?.()}getContentBox(){return this.contentBoxProvider?.()}setContentBoxProvider(t){this.contentBoxProvider=t}setPanBoundsEnabled(t){this.panBoundsEnabled=t}setZoomClampEnabled(t){this.zoomClampEnabled=t}clampPanIfNeeded(){if(!this.panBoundsEnabled)return;const t=this.getContentBox();!t||t.isEmpty()||qf(this.state,this.camera,t,this.getAspect(),this.pivot)}applyClampedZoom(t){if(this.zoomClampEnabled){this.state.zoom=ia(t,this.state,this.getContentBox(),this.domElement.clientHeight);return}this.state.zoom=Math.max(t,1e-8)}setWheelBoundsElement(t){this.wheelBoundsEl&&this.wheelBoundsEl!==this.domElement&&this.wheelBoundsEl.removeEventListener("wheel",this.onWheel,me.wheelCapture),this.wheelBoundsEl=t,t&&t!==this.domElement&&(t.style.touchAction="none",t.addEventListener("wheel",this.onWheel,me.wheelCapture))}setGestureHooks(t){this.gestureHooks=t}notifyGestureBegin(){this.gestureHooks.onBegin?.()}notifyGestureMove(){this.gestureHooks.onMove?.()}notifyGestureEnd(){this.gestureHooks.onEnd?.()}resolveGestureMode(t){return this.gestureMode==="pan"||this.leftEverInGesture?this.bothButtons(t)||this.middleButtonPanActive(t)||this.gestureMode==="pan"?"pan":"none":this.bothButtons(t)||this.middleButtonPanActive(t)?"pan":(t&ue.Right)!==0&&this.rightButtonOrbitEnabled?(t&ue.Left)!==0?"pan":"orbit":this.leftButtonOrbitEnabled&&(t&ue.Left)!==0?"orbit":"none"}canPanWithButtons(t){return this.bothButtons(t)||this.middleButtonPanActive(t)}middleButtonPanActive(t){return this.middleButtonPanEnabled&&(t&ue.Middle)!==0}dragThresholdForCurrentGesture(){return(this.pressedButtons&ue.Middle)!==0&&!this.bothButtons(this.pressedButtons)?cs:as}canOrbitNow(){return this.leftEverInGesture||this.gestureMode==="pan"?!1:!this.bothButtons(this.pressedButtons)}clearRotationAtRmbDown(){this.rotationAtRmbDown=null}releaseActivePointerCapture(){if(this.activePointerId!==null){try{this.domElement.hasPointerCapture(this.activePointerId)&&this.domElement.releasePointerCapture(this.activePointerId)}catch{}this.activePointerId=null}}syncPressedButtonsFromEvent(t){if(t===0){this.pressedButtons=0;return}this.pressedButtons=t,this.rightButtonOrbitEnabled||(this.pressedButtons&=-3)}clearGestureIfButtonsReleased(t){return t.buttons!==0?!1:((this.pressedButtons!==0||this.isDragging||this.gestureMode!=="none")&&(this.resetPointerState(),this.releaseActivePointerCapture()),!0)}onPointerDown=t=>{if(!this.interactionEnabled||Bo()||$f(t.target))return;if(this.touchNavigationEnabled&&t.pointerType==="touch"){this.handleTouchPointerDown(t);return}if(!this.touchNavigationEnabled&&t.pointerType==="touch"){this.handleDesktopTouchDown(t);return}if(t.button===2&&!this.rightButtonOrbitEnabled)return;this.pivotPanAnim&&this.cancelPivotPanAnim();const e=da[t.button]??0;if(this.pressedButtons=t.buttons|e,this.rightButtonOrbitEnabled||(this.pressedButtons&=-3),t.button===0&&this.bothButtons(this.pressedButtons)&&(this.leftEverInGesture=!0,this.rotationAtRmbDown&&(this.state.rotation.copy(this.rotationAtRmbDown),this.syncCamera())),t.button===2&&(this.rotationAtRmbDown=this.state.rotation.clone(),(this.pressedButtons&ue.Left)!==0&&(this.leftEverInGesture=!0)),this.canPanWithButtons(this.pressedButtons)){const i=this.gestureMode!=="pan";this.gestureMode="pan",this.rotationAtRmbDown&&this.bothButtons(this.pressedButtons)&&(this.state.rotation.copy(this.rotationAtRmbDown),this.syncCamera()),this.panRotationLock||(this.panRotationLock=this.state.rotation.clone()),i&&(this.lastX=t.clientX,this.lastY=t.clientY,this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.isDragging=!1)}else this.gestureMode==="none"&&((this.pressedButtons&ue.Right)!==0&&(this.pressedButtons&ue.Left)===0&&!this.leftEverInGesture||this.leftButtonOrbitEnabled&&(this.pressedButtons&ue.Left)!==0&&(this.pressedButtons&ue.Right)===0)&&(this.gestureMode="orbit");if(this.resolveGestureMode(this.pressedButtons)!=="none"){this.lastX=t.clientX,this.lastY=t.clientY,this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.isDragging=!1,this.suppressContextMenu=!1,this.middleClickHandledByPointerUp=!1,this.activePointerId=t.pointerId;try{this.domElement.setPointerCapture(t.pointerId)}catch{}}};onPointerMove=t=>{if(!this.interactionEnabled)return;if(Bo()){(this.isDragging||this.touchMode!=="none"||this.gestureMode!=="none")&&this.cancelActiveGestures();return}if(this.touchNavigationEnabled&&this.touchMode!=="none"){this.handleTouchPointerMove(t);return}if(!this.touchNavigationEnabled&&t.pointerType==="touch"){this.handleDesktopTouchMove(t);return}if(this.clearGestureIfButtonsReleased(t))return;this.syncPressedButtonsFromEvent(t.buttons);const e=this.resolveGestureMode(this.pressedButtons);if(e==="none")return;if(e==="pan"&&this.gestureMode!=="pan"){this.gestureMode="pan",this.panRotationLock=this.state.rotation.clone(),this.lastX=t.clientX,this.lastY=t.clientY,this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.isDragging=!1;return}const i=t.clientX,r=t.clientY;if(!this.isDragging){const o=i-this.dragStartX,c=r-this.dragStartY,l=this.dragThresholdForCurrentGesture();if(Math.abs(o)<=l&&Math.abs(c)<=l)return;this.notifyGestureBegin(),this.isDragging=!0,this.suppressContextMenu=!0}const s=i-this.lastX,a=r-this.lastY;if(!(s===0&&a===0)){if(e==="pan"){if(!this.canPanWithButtons(this.pressedButtons))return;const o=this.domElement.clientWidth,c=this.domElement.clientHeight;pn(this.state,this.camera,s,a,o,c,this.pivot),this.clampPanIfNeeded(),this.panRotationLock&&this.state.rotation.copy(this.panRotationLock),this.syncCamera(),this.notifyGestureMove(),this.lastX=i,this.lastY=r;return}if(e==="orbit"){const o=this.leftButtonOrbitEnabled&&(this.pressedButtons&ue.Left)!==0&&(this.pressedButtons&ue.Right)===0,c=(this.pressedButtons&ue.Right)!==0;if(!o&&!c){this.lastX=i,this.lastY=r;return}if(this.bothButtons(this.pressedButtons)||!this.canOrbitNow()){this.lastX=i,this.lastY=r;return}er(this.state,this.camera,s,a,ls,this.getAspect(),this.pivot),this.syncCamera(),this.notifyGestureMove(),this.lastX=i,this.lastY=r}}};onPointerUp=t=>{if(this.touchNavigationEnabled&&t.pointerType==="touch"){this.handleTouchPointerUp(t);return}if(!this.touchNavigationEnabled&&t.pointerType==="touch"){this.handleDesktopTouchUp(t);return}const e=this.pressedButtons,i=t.button===1&&(e&ue.Middle)!==0&&!this.isDragging,r=da[t.button]??0;this.pressedButtons=t.buttons!==0?t.buttons:this.pressedButtons&~r,this.rightButtonOrbitEnabled||(this.pressedButtons&=-3),i&&(this.middleClickHandledByPointerUp=!0,this.onMiddleClick(t.clientX,t.clientY,{shift:t.shiftKey,ctrl:t.ctrlKey})),this.pressedButtons===0&&(this.isDragging&&this.notifyGestureEnd(),this.gestureMode="none",this.leftEverInGesture=!1,this.panRotationLock=null,this.clearRotationAtRmbDown(),this.isDragging=!1,this.releaseActivePointerCapture())};onWindowPointerUp=t=>{const e=t.target;(!(e instanceof Node)||!this.domElement.contains(e))&&this.onPointerUp(t)};onWindowWheel=t=>{!(t.ctrlKey||t.metaKey||t.altKey)&&!this.isWheelOverViewport(t)||this.onWheel(t)};isWheelOverViewport(t){const e=typeof t.composedPath=="function"?t.composedPath():[];for(const s of e)if(s instanceof Element&&s.closest(fa))return!1;const i=this.wheelBoundsEl??this.domElement;if(e.includes(this.domElement)||e.includes(i))return!0;const r=i.getBoundingClientRect();return t.clientX>=r.left&&t.clientX<=r.right&&t.clientY>=r.top&&t.clientY<=r.bottom}onZoomKeyDown=t=>{(t.ctrlKey||t.metaKey)&&(t.key==="+"||t.key==="-"||t.key==="="||t.key==="_"||t.code==="NumpadAdd"||t.code==="NumpadSubtract")&&t.preventDefault()};onWheel=t=>{if(this.handledWheelEvents.has(t))return;if(this.handledWheelEvents.add(t),t.shiftKey&&!(t.ctrlKey||t.metaKey||t.altKey)){this.stopWheelZoomSmoothing(),t.preventDefault();return}t.preventDefault();const e=performance.now();e-this.wheelGestureAt>op&&(this.wheelGesture="none"),this.wheelGestureAt=e;const i=t.ctrlKey||t.metaKey||t.altKey,r=this.trackpadWheelPanEnabled&&!i&&up(t.deltaX,t.deltaY,t.deltaMode),s=_a(t.deltaX,t.deltaY,t.deltaMode),a=this.wheelGesture==="pan"&&!i&&e-this.wheelPanLastXAt<rr;if(r||a?this.wheelGesture="pan":(i||s)&&(this.wheelGesture="zoom"),i||s&&!a||!r&&!a){const u=sr(t.deltaY,t.deltaMode,{pinch:i,pixelBoost:i}),f=sr(t.deltaX,t.deltaMode,{pinch:i,pixelBoost:i}),m=Math.abs(u)>=Math.abs(f)?u:f;if(m===0)return;let g=t.clientX,_=t.clientY;if(i&&!this.isWheelOverViewport(t)){const p=this.domElement.getBoundingClientRect();g=p.left+p.width*.5,_=p.top+p.height*.5}this.queueWheelZoom(m,g,_,i);return}this.stopWheelZoomSmoothing();const o=sr(t.deltaX,t.deltaMode,{pinch:!1}),c=sr(t.deltaY,t.deltaMode,{pinch:!1});e-this.wheelPanLastAt>rr&&(this.wheelPanLastX=0,this.wheelPanLastY=0),this.wheelPanLastAt=e;const l=Math.abs(o)>=.01?-o:0,h=Math.abs(c)>=.01?-c:0;Math.abs(l)>=.01&&(this.wheelPanLastX=l,this.wheelPanLastXAt=e),Math.abs(h)>=.01&&(this.wheelPanLastY=h,this.wheelPanLastYAt=e),!(Math.abs(l)<.01&&Math.abs(h)<.01)&&this.queueWheelPan(l,h)};queueWheelPan(t,e){this.wheelPanAccumX+=t,this.wheelPanAccumY+=e,!this.wheelPanRaf&&(this.wheelPanRaf=requestAnimationFrame(()=>{this.wheelPanRaf=0;let i=this.wheelPanAccumX,r=this.wheelPanAccumY;this.wheelPanAccumX=0,this.wheelPanAccumY=0;const s=performance.now();if(Math.abs(i)>=.5&&Math.abs(r)<.5&&s-this.wheelPanLastYAt<rr&&(r+=this.wheelPanLastY),Math.abs(r)>=.5&&Math.abs(i)<.5&&s-this.wheelPanLastXAt<rr&&(i+=this.wheelPanLastX),Math.abs(i)<1e-6&&Math.abs(r)<1e-6)return;const a=this.domElement.clientWidth,o=this.domElement.clientHeight;this.notifyGestureBegin(),pn(this.state,this.camera,i,r,a,o,this.pivot),this.clampPanIfNeeded(),this.syncCamera(),this.notifyGestureMove(),this.notifyGestureEnd()}))}softenWheelZoomDelta(t,e){if(e)return t;const i=Math.abs(t);if(i<1e-6)return 0;if(i<48)return Math.sign(t)*Math.min(i*.55,ma);const r=i>=80?100:48,s=i/r*ep;return Math.sign(t)*Math.min(s,ma)}stopWheelZoomSmoothing(){this.wheelZoomRaf&&(cancelAnimationFrame(this.wheelZoomRaf),this.wheelZoomRaf=0),this.wheelZoomAccum=0,this.wheelZoomGesturing&&(this.wheelZoomGesturing=!1,this.notifyGestureEnd())}queueWheelZoom(t,e,i,r=!1){const s=this.softenWheelZoomDelta(t,r);if(s===0)return;if(!r){this.stopWheelZoomSmoothing(),this.dolly(s,e,i);return}if(this.wheelZoomAccum+=s,Math.abs(this.wheelZoomAccum)>ga&&(this.wheelZoomAccum=Math.sign(this.wheelZoomAccum)*ga),this.wheelZoomClientX=e,this.wheelZoomClientY=i,this.wheelZoomRaf)return;this.wheelZoomGesturing||(this.wheelZoomGesturing=!0,this.notifyGestureBegin()),this.wheelZoomLastTs=performance.now();const a=()=>{const o=performance.now(),c=Math.min(32,Math.max(8,o-this.wheelZoomLastTs));this.wheelZoomLastTs=o;const l=Math.max(.45,1-Math.exp(-c/tp)),h=this.wheelZoomAccum*l;if(this.wheelZoomAccum-=h,Math.abs(h)>=.04&&this.dolly(h,this.wheelZoomClientX,this.wheelZoomClientY,!0),Math.abs(this.wheelZoomAccum)<.2){this.wheelZoomAccum=0,this.wheelZoomRaf=0,this.wheelZoomGesturing=!1,this.notifyGestureEnd();return}this.wheelZoomRaf=requestAnimationFrame(a)};this.wheelZoomRaf=requestAnimationFrame(a)}onContextMenu=t=>{t.preventDefault()};onBlur=()=>{this.resetPointerState(),this.resetTouchState(),this.resetDesktopTouchState(),this.wheelGesture="none",this.isDragging=!1};onPointerLeave=t=>{if(this.isDragging||this.gestureMode!=="none")try{if(this.domElement.hasPointerCapture(t.pointerId))return}catch{}t.buttons===0&&this.resetPointerState()};onAuxClick=t=>{if(!(t.button!==1||this.isDragging)){if(this.middleClickHandledByPointerUp){this.middleClickHandledByPointerUp=!1;return}t.preventDefault(),this.onMiddleClick(t.clientX,t.clientY,{shift:t.shiftKey,ctrl:t.ctrlKey})}};resetPointerState(){(this.isDragging||this.gestureMode!=="none")&&this.notifyGestureEnd(),this.pressedButtons=0,this.gestureMode="none",this.leftEverInGesture=!1,this.panRotationLock=null,this.clearRotationAtRmbDown(),this.isDragging=!1,this.releaseActivePointerCapture()}setPivotPickHandler(t){this.pivotPickHandler=t}setMiddleClickHandler(t){this.middleClickHandler=t}setOnPivotChanged(t){this.onPivotChanged=t}setOnPivotPicked(t){this.onPivotPicked=t}setOnChange(t){this.onChange=t}setRightButtonOrbitEnabled(t){this.rightButtonOrbitEnabled=t,t||this.resetPointerState()}setLeftButtonOrbitEnabled(t){this.leftButtonOrbitEnabled=t}setMiddleButtonPanEnabled(t){this.middleButtonPanEnabled=t}setTrackpadWheelPanEnabled(t){this.trackpadWheelPanEnabled=t}setInteractionEnabled(t){this.interactionEnabled=t,t||(this.resetPointerState(),this.resetTouchState(),this.resetDesktopTouchState())}cancelActiveGestures(){(this.isDragging||this.gestureMode!=="none"||this.touchMode!=="none")&&this.isDragging&&this.notifyGestureEnd(),this.pressedButtons=0,this.gestureMode="none",this.leftEverInGesture=!1,this.panRotationLock=null,this.clearRotationAtRmbDown(),this.isDragging=!1,this.releaseActivePointerCapture(),this.resetTouchState(),this.resetDesktopTouchState()}setTouchNavigationEnabled(t){this.touchNavigationEnabled=t,t||(this.resetTouchState(),this.resetDesktopTouchState())}setDesktopOneFingerOrbitEnabled(t){this.desktopOneFingerOrbitEnabled=t,!t&&this.desktopOneFingerMode==="orbit"&&(this.desktopOneFingerMode="none",this.desktopTouchPointers.clear())}isTouchNavigationEnabled(){return this.touchNavigationEnabled}resetTouchState(){this.touchMode="none",this.touchPointers.clear(),this.touchPinchStartDistance=0,this.touchPinchStartZoom=1,this.touchPanLastCenter=null}resetDesktopTouchState(){this.desktopTwoFingerPinchRaf&&(cancelAnimationFrame(this.desktopTwoFingerPinchRaf),this.desktopTwoFingerPinchRaf=0),this.desktopTouchPointers.clear(),this.desktopThreeFingerMode="none",this.desktopTwoFingerMode="none",this.desktopOneFingerMode="none",this.desktopTouchDragged=!1,this.desktopPinchStartDistance=0,this.desktopPinchStartZoom=1,this.desktopPinchZoomArmed=!1}scheduleDesktopTwoFingerPinchEval(){this.desktopTwoFingerPinchRaf||(this.desktopTwoFingerPinchRaf=requestAnimationFrame(()=>{this.desktopTwoFingerPinchRaf=0,this.applyDesktopTwoFingerPinchZoom()}))}applyDesktopTwoFingerPinchZoom(){if(this.desktopTwoFingerMode!=="pinch"||this.desktopTouchPointers.size!==2)return;const t=this.desktopTouchPointerDistance();if(t<.001||this.desktopPinchStartDistance<.001)return;if(!this.desktopPinchZoomArmed){if(Math.abs(t-this.desktopPinchStartDistance)<sp)return;this.desktopPinchZoomArmed=!0}const e=t/this.desktopPinchStartDistance;this.applyClampedZoom(this.desktopPinchStartZoom*e),this.syncCamera(),this.notifyGestureMove()}readDesktopTouchCenter(){const t=[...this.desktopTouchPointers.values()];if(t.length===0)return{x:0,y:0};let e=0,i=0;for(const r of t)e+=r.x,i+=r.y;return{x:e/t.length,y:i/t.length}}desktopTouchPointerDistance(){const t=[...this.desktopTouchPointers.values()];return t.length<2?0:Math.hypot(t[1].x-t[0].x,t[1].y-t[0].y)}beginDesktopThreeFinger(t){const e=this.readDesktopTouchCenter();this.desktopTwoFingerMode="none",this.desktopThreeFingerMode="pending",this.desktopTouchDragged=!1,this.desktopTouchStartCenter=e,this.desktopTouchLastCenter=e,this.desktopTouchModifiers={shift:t.shiftKey,ctrl:t.ctrlKey},this.panRotationLock||(this.panRotationLock=this.state.rotation.clone())}beginDesktopTwoFinger(){const t=this.desktopTouchPointerDistance();if(t<.001)return;this.desktopThreeFingerMode="none",this.desktopTwoFingerMode="pinch",this.desktopPinchStartDistance=t,this.desktopPinchStartZoom=this.state.zoom,this.desktopPinchZoomArmed=!1;const e=this.readDesktopTouchCenter();this.desktopTouchStartCenter=e,this.desktopTouchLastCenter=e,this.panRotationLock||(this.panRotationLock=this.state.rotation.clone()),this.notifyGestureBegin(),this.isDragging=!0}handleDesktopTouchDown(t){if(this.desktopTouchPointers.set(t.pointerId,{x:t.clientX,y:t.clientY}),this.desktopTouchPointers.size===1){if(!this.desktopOneFingerOrbitEnabled){this.desktopTouchPointers.delete(t.pointerId),this.desktopOneFingerMode="none";return}t.preventDefault();try{this.domElement.setPointerCapture(t.pointerId)}catch{}this.pivotPanAnim&&this.cancelPivotPanAnim(),this.desktopOneFingerMode="orbit",this.lastX=t.clientX,this.lastY=t.clientY,this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.isDragging=!1;return}if(this.desktopOneFingerMode="none",this.desktopTouchPointers.size===2){t.preventDefault();try{this.domElement.setPointerCapture(t.pointerId)}catch{}this.pivotPanAnim&&this.cancelPivotPanAnim(),this.beginDesktopTwoFinger();return}if(!(this.desktopTouchPointers.size<3)){t.preventDefault();try{this.domElement.setPointerCapture(t.pointerId)}catch{}this.pivotPanAnim&&this.cancelPivotPanAnim(),this.desktopThreeFingerMode==="none"&&this.beginDesktopThreeFinger(t)}}handleDesktopTouchMove(t){if(!this.desktopTouchPointers.has(t.pointerId))return;if(this.desktopTouchPointers.set(t.pointerId,{x:t.clientX,y:t.clientY}),this.desktopTouchPointers.size===1&&this.desktopOneFingerMode==="orbit"){t.preventDefault();const o=t.clientX,c=t.clientY;if(!this.isDragging){const u=o-this.dragStartX,f=c-this.dragStartY;if(Math.abs(u)<=as&&Math.abs(f)<=as)return;this.notifyGestureBegin(),this.isDragging=!0}const l=o-this.lastX,h=c-this.lastY;if(l===0&&h===0)return;er(this.state,this.camera,l,h,ls,this.getAspect(),this.pivot),this.syncCamera(),this.notifyGestureMove(),this.lastX=o,this.lastY=c;return}if(this.desktopTouchPointers.size===2&&this.desktopTwoFingerMode==="pinch"){t.preventDefault();const o=this.readDesktopTouchCenter(),c=o.x-this.desktopTouchLastCenter.x,l=o.y-this.desktopTouchLastCenter.y;if(c!==0||l!==0){const h=this.domElement.clientWidth,u=this.domElement.clientHeight;pn(this.state,this.camera,c,l,h,u,this.pivot),this.clampPanIfNeeded(),this.panRotationLock&&this.state.rotation.copy(this.panRotationLock),this.syncCamera(),this.notifyGestureMove()}this.desktopTouchLastCenter=o,this.scheduleDesktopTwoFingerPinchEval();return}if(this.desktopTouchPointers.size<3||this.desktopThreeFingerMode==="none")return;t.preventDefault();const e=this.readDesktopTouchCenter();if(this.desktopThreeFingerMode==="pending"){const o=e.x-this.desktopTouchStartCenter.x,c=e.y-this.desktopTouchStartCenter.y;if(Math.abs(o)<=cs&&Math.abs(c)<=cs){this.desktopTouchLastCenter=e;return}this.desktopThreeFingerMode="pan",this.desktopTouchDragged=!0,this.notifyGestureBegin(),this.isDragging=!0,this.desktopTouchLastCenter=e;return}const i=e.x-this.desktopTouchLastCenter.x,r=e.y-this.desktopTouchLastCenter.y;if(i===0&&r===0)return;const s=this.domElement.clientWidth,a=this.domElement.clientHeight;pn(this.state,this.camera,i,r,s,a,this.pivot),this.clampPanIfNeeded(),this.panRotationLock&&this.state.rotation.copy(this.panRotationLock),this.syncCamera(),this.notifyGestureMove(),this.desktopTouchLastCenter=e}handleDesktopTouchUp(t){const e=this.desktopThreeFingerMode!=="none",i=this.desktopTwoFingerMode!=="none",r=this.desktopOneFingerMode==="orbit",s=this.desktopTouchDragged||i,a=this.readDesktopTouchCenter(),o=this.desktopTouchModifiers;this.desktopTouchPointers.delete(t.pointerId);try{this.domElement.hasPointerCapture(t.pointerId)&&this.domElement.releasePointerCapture(t.pointerId)}catch{}if(!(this.desktopTouchPointers.size>=3)){if(r&&this.desktopTouchPointers.size===0&&!i&&!e){this.isDragging&&this.notifyGestureEnd(),this.isDragging=!1,this.resetDesktopTouchState();return}if(this.desktopTouchPointers.size===2&&!e){this.beginDesktopTwoFinger();return}if(e&&this.desktopTouchPointers.size===0){s&&this.desktopThreeFingerMode==="pan"?this.notifyGestureEnd():s||this.onMiddleClick(a.x,a.y,o),this.isDragging=!1,this.panRotationLock=null,this.resetDesktopTouchState();return}if(i&&this.desktopTouchPointers.size<2){this.notifyGestureEnd(),this.isDragging=!1,this.desktopTwoFingerMode="none",this.desktopTouchPointers.size===0&&(this.panRotationLock=null,this.resetDesktopTouchState());return}this.desktopTouchPointers.size<3&&(e&&s&&(this.notifyGestureEnd(),this.isDragging=!1),this.desktopThreeFingerMode="none",this.desktopTouchDragged=!1,this.desktopTouchPointers.size===0&&(this.panRotationLock=null,this.resetDesktopTouchState()))}}touchPointerDistance(){const t=[...this.touchPointers.values()];return t.length<2?0:Math.hypot(t[1].x-t[0].x,t[1].y-t[0].y)}readTouchPointerCenter(){const t=[...this.touchPointers.values()];return t.length===0?{x:0,y:0}:t.length===1?{x:t[0].x,y:t[0].y}:{x:(t[0].x+t[1].x)*.5,y:(t[0].y+t[1].y)*.5}}isTouchNearViewportEdge(t,e){const i=this.domElement.getBoundingClientRect(),r=64;return t-i.left<=r||i.right-t<=r||e-i.top<=r||i.bottom-e<=r}beginTouchPinch(){const t=this.touchPointerDistance();if(t<.001)return;this.touchMode="pinch",this.touchPinchStartDistance=t,this.touchPinchStartZoom=this.state.zoom;const e=this.readTouchPointerCenter();this.touchPinchCenterX=e.x,this.touchPinchCenterY=e.y,this.touchPanLastCenter={x:e.x,y:e.y}}handleTouchPointerDown(t){t.preventDefault(),this.pivotPanAnim&&this.cancelPivotPanAnim(),this.touchPointers.set(t.pointerId,{x:t.clientX,y:t.clientY});try{this.domElement.setPointerCapture(t.pointerId)}catch{}if(this.touchPointers.size===1){this.touchMode=this.isTouchNearViewportEdge(t.clientX,t.clientY)?"pan":"orbit",this.lastX=t.clientX,this.lastY=t.clientY,this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.touchPanLastCenter={x:t.clientX,y:t.clientY},this.isDragging=!1;return}this.touchPointers.size>=2&&(this.isDragging||(this.notifyGestureBegin(),this.isDragging=!0),this.beginTouchPinch())}handleTouchPointerMove(t){if(this.touchPointers.has(t.pointerId)){if(t.preventDefault(),this.touchPointers.set(t.pointerId,{x:t.clientX,y:t.clientY}),this.touchMode==="pinch"&&this.touchPointers.size>=2){const e=this.domElement.clientWidth,i=this.domElement.clientHeight;if(e<=0||i<=0)return;const r=this.readTouchPointerCenter();if(this.touchPanLastCenter){const a=r.x-this.touchPanLastCenter.x,o=r.y-this.touchPanLastCenter.y;(Math.abs(a)>.5||Math.abs(o)>.5)&&(pn(this.state,this.camera,a,o,e,i,this.pivot),this.clampPanIfNeeded())}this.touchPanLastCenter={x:r.x,y:r.y},this.touchPinchCenterX=r.x,this.touchPinchCenterY=r.y;const s=this.touchPointerDistance();if(s>=.001&&this.touchPinchStartDistance>=.001){this.syncCamera();const a=rs(this.camera,this.state,this.pivot,this.domElement,this.touchPinchCenterX,this.touchPinchCenterY,this.zoomCursorWorldBefore),o=s/this.touchPinchStartDistance,c=this.state.zoom;this.applyClampedZoom(this.touchPinchStartZoom*o),a&&Math.abs(this.state.zoom-c)>1e-6&&ss(this.state,this.camera,this.pivot,this.domElement,this.touchPinchCenterX,this.touchPinchCenterY,this.zoomCursorWorldBefore),this.clampPanIfNeeded()}this.syncCamera(),this.notifyGestureMove();return}if(this.touchMode==="pan"&&this.touchPointers.size===1){const e=t.clientX,i=t.clientY;if(!this.isDragging){const a=e-this.dragStartX,o=i-this.dragStartY;if(Math.abs(a)<=ir&&Math.abs(o)<=ir)return;this.notifyGestureBegin(),this.isDragging=!0}const r=this.domElement.clientWidth,s=this.domElement.clientHeight;if(r>0&&s>0&&this.touchPanLastCenter){const a=e-this.touchPanLastCenter.x,o=i-this.touchPanLastCenter.y;(Math.abs(a)>.5||Math.abs(o)>.5)&&(pn(this.state,this.camera,a,o,r,s,this.pivot),this.clampPanIfNeeded(),this.syncCamera(),this.notifyGestureMove())}this.touchPanLastCenter={x:e,y:i},this.lastX=e,this.lastY=i;return}if(this.touchMode==="orbit"&&this.touchPointers.size===1){const e=t.clientX,i=t.clientY;if(!this.isDragging){const a=e-this.dragStartX,o=i-this.dragStartY;if(Math.abs(a)<=ir&&Math.abs(o)<=ir)return;this.notifyGestureBegin(),this.isDragging=!0}const r=e-this.lastX,s=i-this.lastY;if(r===0&&s===0)return;er(this.state,this.camera,r,s,ls,this.getAspect(),this.pivot),this.syncCamera(),this.notifyGestureMove(),this.lastX=e,this.lastY=i}}}handleTouchPointerUp(t){t.preventDefault(),this.touchPointers.delete(t.pointerId);try{this.domElement.hasPointerCapture(t.pointerId)&&this.domElement.releasePointerCapture(t.pointerId)}catch{}if(this.touchPointers.size===0){this.isDragging&&this.notifyGestureEnd(),this.resetTouchState(),this.isDragging=!1;return}if(this.touchPointers.size===1&&this.touchMode==="pinch"){const e=[...this.touchPointers.values()][0];this.touchMode="orbit",this.lastX=e.x,this.lastY=e.y,this.dragStartX=e.x,this.dragStartY=e.y,this.isDragging=!1}}isDragGesture(){return this.isDragging}takeContextMenuSuppressed(){const t=this.suppressContextMenu;return this.suppressContextMenu=!1,t}getInteractionMode(){return this.resolveGestureMode(this.pressedButtons)}getPressedButtons(){return this.pressedButtons}setPivot(t){this.pivot.copy(t),this.onPivotChanged?.(this.getPivot())}setPivotKeepingView(t){if(this.pivot.distanceToSquared(t)<1e-12)return;const e=this.domElement.clientWidth,i=this.domElement.clientHeight;if(e<=0||i<=0){this.setPivot(t),this.syncCamera();return}this.cancelPivotPanAnim();const r=this.pivot.clone(),s=this.getAspect();pe(this.camera,this.state,s,r),Cf(this.camera,r,this.pivotChangeAnchor),Xf(this.state,this.camera,r,t,s,this.pivotChangeAnchor),this.pivot.copy(t),this.syncCamera(),this.onPivotChanged?.(this.getPivot())}getPivot(){return this.pivot.clone()}pivotAtClientPoint(t,e){if(!this.pivotPickHandler)return!1;const i=this.pivotPickHandler(t,e);return i?(this.setPivot(i),this.centerPivotInView(),this.onPivotPicked?.(i.clone()),!0):!1}centerPivotInView(){this.cancelPivotPanAnim();const t=this.getAspect(),e=Yf(this.state,this.camera,this.pivot,t,this.pivot);this.pivotPanAnim={startPanX:this.state.panX,startPanY:this.state.panY,targetPanX:e.panX,targetPanY:e.panY,startedAt:performance.now()},this.syncCamera()}tickPivotPanAnim(t=performance.now()){if(!this.pivotPanAnim)return!1;const{targetPanX:e,targetPanY:i,startedAt:r}=this.pivotPanAnim,s=Kf((t-r)/Zf);return jf(this.state,e,i,s),this.syncCamera(),s>=1?(this.state.panX=e,this.state.panY=i,this.pivotPanAnim=null,this.syncCamera(),!1):!0}isPivotPanAnimating(){return this.pivotPanAnim!==null}cancelPivotPanAnim(){this.pivotPanAnim=null}panByPixels(t,e){const i=this.domElement.clientWidth,r=this.domElement.clientHeight;i<=0||r<=0||(this.cancelPivotPanAnim(),pn(this.state,this.camera,t,e,i,r,this.pivot),this.clampPanIfNeeded(),this.syncCamera())}applySpaceMouseMotion(t,e,i,r,s,a){const o=this.domElement.clientWidth,c=this.domElement.clientHeight;if(o<=0||c<=0)return;if(this.cancelPivotPanAnim(),(t!==0||e!==0)&&(pn(this.state,this.camera,t,e,o,c,this.pivot),this.clampPanIfNeeded()),i!==0){this.syncCamera();const h=o*.5,u=c*.5,f=rs(this.camera,this.state,this.pivot,this.domElement,h,u,this.zoomCursorWorldBefore);ra(this.state,-i*120,pa,this.getContentBox(),c,this.zoomClampEnabled),f&&ss(this.state,this.camera,this.pivot,this.domElement,h,u,this.zoomCursorWorldBefore),this.clampPanIfNeeded()}const l=this.getAspect();if((r!==0||s!==0)&&er(this.state,this.camera,r,s,1,l,this.pivot),a!==0){const h=new De().setFromAxisAngle(new P(0,0,1),-a);this.state.rotation.premultiply(h)}this.syncCamera()}update(){this.syncCamera(!1)}dispose(){this.desktopTwoFingerPinchRaf&&(cancelAnimationFrame(this.desktopTwoFingerPinchRaf),this.desktopTwoFingerPinchRaf=0),this.wheelPanRaf&&(cancelAnimationFrame(this.wheelPanRaf),this.wheelPanRaf=0),this.stopWheelZoomSmoothing(),this.domElement.removeEventListener("pointerdown",this.onPointerDown,me.pointerCapture),this.domElement.removeEventListener("pointermove",this.onPointerMove,me.pointerCapture),this.domElement.removeEventListener("pointerup",this.onPointerUp,me.pointerCapture),this.domElement.removeEventListener("pointercancel",this.onPointerUp,me.pointerCapture),this.domElement.removeEventListener("pointerleave",this.onPointerLeave),window.removeEventListener("wheel",this.onWindowWheel,me.wheelCapture),this.domElement.removeEventListener("wheel",this.onWheel,me.wheelCapture),this.wheelBoundsEl&&this.wheelBoundsEl!==this.domElement&&this.wheelBoundsEl.removeEventListener("wheel",this.onWheel,me.wheelCapture),this.wheelBoundsEl=null,window.removeEventListener("keydown",this.onZoomKeyDown,!0),this.domElement.removeEventListener("contextmenu",this.onContextMenu),this.domElement.removeEventListener("auxclick",this.onAuxClick),window.removeEventListener("blur",this.onBlur),window.removeEventListener("pointerup",this.onWindowPointerUp)}dolly(t,e,i,r=!1){r||this.notifyGestureBegin(),this.syncCamera();const s=rs(this.camera,this.state,this.pivot,this.domElement,e,i,this.zoomCursorWorldBefore);if(ra(this.state,t,pa,this.getContentBox(),this.wheelBoundsEl?.clientHeight||this.domElement.clientHeight,this.zoomClampEnabled),s){ss(this.state,this.camera,this.pivot,this.domElement,e,i,this.zoomCursorWorldBefore),this.clampPanIfNeeded(),this.syncCamera(),this.notifyGestureMove(),r||this.notifyGestureEnd();return}this.onChange?.(),this.notifyGestureMove(),r||this.notifyGestureEnd()}onMiddleClick(t,e,i){const r=`${Math.round(t)}:${Math.round(e)}:${i.shift?1:0}:${i.ctrl?1:0}`,s=performance.now();(i.shift||i.ctrl)&&s-this.wheelGestureAt<180||r===this.lastMiddleClickSignature&&s-this.lastMiddleClickTime<80||(this.lastMiddleClickSignature=r,this.lastMiddleClickTime=s,!((i.shift||i.ctrl)&&this.middleClickHandler?.(t,e,i))&&this.onPivotClickAt(t,e))}onPivotClickAt(t,e){if(!this.pivotPickHandler)return;const i=this.pivotPickHandler(t,e);i&&(this.setPivot(i),this.centerPivotInView(),this.onPivotPicked?.(i.clone()))}}function dp(n,t,e,i,r=rn,s){ha(t,e,s),pe(n,t,i,r)}function fp(n){return n.length>=3&&n[0]===255&&n[1]===216&&n[2]===255}function pp(n){return n.length>=8&&n[0]===137&&n[1]===80&&n[2]===78&&n[3]===71}function mp(n){if(n%4!==0)return null;const t=n/4,e=Math.round(Math.sqrt(t));return e>0&&e*e*4===n?e:null}function hs(n,t){const e=new Uint8Array(n.byteLength);e.set(n);const i=new Blob([e],{type:t}),r=URL.createObjectURL(i);return new Promise((s,a)=>{const o=new Image;o.onload=()=>{URL.revokeObjectURL(r);const c=new ve(o);c.colorSpace=ye,c.flipY=!1,c.needsUpdate=!0,s(c)},o.onerror=()=>{URL.revokeObjectURL(r),a(new Error(`exocad photo decode failed (${t})`))},o.src=r})}function gp(n,t){const e=new fl(n,t,t,1023);return e.colorSpace=ye,e.flipY=!0,e.needsUpdate=!0,e}function _p(n){if(fp(n))return hs(n,"image/jpeg");if(pp(n))return hs(n,"image/png");const t=mp(n.length);return t!==null?Promise.resolve(gp(n,t)):hs(n,"image/jpeg")}function vp(n,t){const e=n.getAttribute("position");if(!e||e.count===0)return new Float32Array(0);const i=e.count,r=new P(1/0,1/0,1/0),s=new P(-1/0,-1/0,-1/0);for(let y=0;y<i;y+=1)r.x=Math.min(r.x,e.getX(y)),r.y=Math.min(r.y,e.getY(y)),r.z=Math.min(r.z,e.getZ(y)),s.x=Math.max(s.x,e.getX(y)),s.y=Math.max(s.y,e.getY(y)),s.z=Math.max(s.z,e.getZ(y));const a=s.x-r.x,o=s.y-r.y,c=s.z-r.z;let l=2;a<=o&&a<=c?l=0:o<=a&&o<=c&&(l=1);const h=l===0?1:0,u=l===2?1:2,f=r.getComponent(h),m=r.getComponent(u),g=Math.max(s.getComponent(h)-f,1e-6),_=Math.max(s.getComponent(u)-m,1e-6),p=g/_,d=Math.max(t,1e-6),b=new Float32Array(i*2);for(let y=0;y<i;y+=1){let E=(e.getComponent(h,y)-f)/g,L=(e.getComponent(u,y)-m)/_;if(d>p){const w=p/d;E=(E-.5)*w+.5}else if(d<p){const w=d/p;L=(L-.5)*w+.5}b[y*2]=E,b[y*2+1]=L}return b}function xp(n){const t=atob(n),e=new Uint8Array(t.length);for(let i=0;i<t.length;i+=1)e[i]=t.charCodeAt(i);return new Float32Array(e.buffer.slice(0))}function Mp(n,t,e,i,r,s){const a=e.getCenter(new P),o=la(t,n,e,r,s);return i(a),pe(n,t,r,a),o}function yp(n,t,e,i,r){const s=ua(e.view);t.state.rotation.copy(s.rotation),t.state.panX=s.panX,t.state.panY=s.panY,t.state.zoom=s.zoom,t.state.frustumHalfHeight=s.frustumHalfHeight,t.state.near=s.near,t.state.far=s.far,t.state.viewDistance=s.viewDistance;const a=new P(...e.pivot);t.setPivot(a),pe(n,t.state,i,a)}function va(n){return n==="Default view"?"Вид по умолчанию":n}const us={front:"front",back:"back",top:"top",bottom:"bottom",left:"left",right:"right"};function Sp(n){const t=n.trim();return t==="Default view"?!0:/умолчан/i.test(t)}function xa(n){if(n.view_preset&&n.view_preset in us)return us[n.view_preset]??null;const t=n.label.trim();if(t.startsWith("View ")){const e=t.slice(5).toLowerCase();return us[e]??null}return Sp(t)?"front":null}function Ep(n){return xa(n)===null}new Je(new P(-50,-50,-50),new P(50,50,50));const Ma=new P(62,48,22),bp=new P(42,58,18),Tp=new P(-52,22,38);function wp(n){return n==="exocad"||n==="d3dHtml"?bp:Ma}function ya(n,t,e){n.color.setHex(16777215),t.color.setHex(16777215),e.color.setHex(16777215),e.groundColor.setHex(16777215)}const Ap={ambient:.5,hemisphere:.06,key:.68,fill:.26},Sa={ambient:.5,hemisphere:.06,key:.68,fill:.26},Ea={mesh:Ap,exocad:Sa,d3dHtml:Sa};function ba(n){return 1}const Cp=2.8,Ta=.48;function Qn(n,t,e){const i=Rp(n);i.cavityStrength.value=t?e?.strength??Cp:0,i.cavityFloor.value=e?.floor??Ta}function Rp(n){const t=n.userData.dentalCavityUniforms;if(t)return t;const e={cavityStrength:{value:0},cavityFloor:{value:Ta}};n.userData.dentalCavityUniforms=e,n.userData.dentalCavityAo=!0;const i=n.onBeforeCompile;n.onBeforeCompile=(s,a)=>{typeof i=="function"&&i.call(n,s,a),s.uniforms.cavityStrength=e.cavityStrength,s.uniforms.cavityFloor=e.cavityFloor,s.fragmentShader=s.fragmentShader.replace("#include <common>",`#include <common>
uniform float cavityStrength;
uniform float cavityFloor;`).replace("#include <opaque_fragment>",`if (cavityStrength > 0.001) {
	vec3 pdx = dFdx(vViewPosition);
	vec3 pdy = dFdy(vViewPosition);
	vec3 ndx = dFdx(normal);
	vec3 ndy = dFdy(normal);
	float conc = max(0.0, -dot(ndx, normalize(pdx + vec3(1e-6))) - dot(ndy, normalize(pdy + vec3(1e-6))));
	outgoingLight *= mix(1.0, cavityFloor, saturate(conc * cavityStrength));
}
#include <opaque_fragment>`)};const r=n.customProgramCacheKey.bind(n);return n.customProgramCacheKey=()=>`${r()}|dental-cavity-ao|flat=${n.flatShading?1:0}`,n.needsUpdate=!0,e}const Pp=657930,Dp=22,Lp=0,Ip=1,ds=0;function wa(n,t){Aa(n,t),Qn(n,!0)}function Aa(n,t){n.vertexColors=!1,n.toneMapped=!1,typeof t=="number"?n.color.setHex(t):n.color.copy(t),n.emissive.setRGB(0,0,0),n.specular.setHex(Pp),n.shininess=Dp,Qn(n,!1),n.needsUpdate=!0}function Ca(n){n.vertexColors=!0,n.toneMapped=!1,n.color.setHex(16777215),n.emissive.setRGB(ds,ds,ds),n.specular.setHex(Lp),n.shininess=Ip,Qn(n,!0),n.needsUpdate=!0}function Up(n){const t=n.opacity??1,e=t>.999,i=n.vertexColors===!0,r=new Gr({color:16777215,flatShading:n.flatShading??!0,side:2,vertexColors:i,transparent:!e,opacity:t,depthWrite:e,toneMapped:!1});return i?Ca(r):Aa(r,n.solidColor??15124648),r}const mi=1e6;function Ra(n){return n==="intersectionsOnly"?1:n==="proximity"?2:0}function Pa(n,t){const e=n,i={uContactsScaleMin:{value:t.scaleMinMm},uContactsScaleMax:{value:t.scaleMaxMm},uContactsMode:{value:Ra(t.mode)},uContactsActive:{value:1},uRangeActive:{value:0},uRangeMap:{value:null},uRangeView:{value:new Jt},uRangeProj:{value:new Jt},uRangeTexel:{value:new Ot(1/320,1/320)}};e.userData.contactsDistanceShader=!0,e.userData.contactsDistanceUniforms=i,e.onBeforeCompile=r=>{Object.assign(r.uniforms,i),r.vertexShader=r.vertexShader.replace("#include <common>",`#include <common>
attribute float contactsDistance;
uniform float uContactsScaleMin;
uniform float uContactsScaleMax;
uniform int uContactsMode;
varying float vContactsDistance;
varying float vContactsInRange;
varying vec3 vContactsWorld;

bool contactsInPaintRange(float d, int mode, float sMin, float sMax) {
  if (d > 5.0e5) { return false; }
  if (mode == 1) { return d <= 1e-4 && d >= sMin; }
  if (mode == 2) { return d <= sMax; }
  if (d > sMax) { return false; }
  if (d < 0.0) { return true; }
  return d >= sMin;
}`).replace("#include <begin_vertex>",`#include <begin_vertex>
// FAR не интерполируем как 1e6 (россыпь/паутина по ребру). Нет хита → чуть за шкалой.
float dDisp = contactsDistance;
if (dDisp > 5.0e5) {
  dDisp = uContactsScaleMax + max(uContactsScaleMax, 0.4);
}
vContactsDistance = dDisp;
vContactsInRange = contactsInPaintRange(contactsDistance, uContactsMode, uContactsScaleMin, uContactsScaleMax) ? 1.0 : 0.0;
vContactsWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`),r.fragmentShader=r.fragmentShader.replace("#include <common>",`#include <common>
uniform float uContactsScaleMin;
uniform float uContactsScaleMax;
uniform int uContactsMode;
uniform float uContactsActive;
uniform float uRangeActive;
uniform sampler2D uRangeMap;
uniform mat4 uRangeView;
uniform mat4 uRangeProj;
uniform vec2 uRangeTexel;
varying float vContactsDistance;
varying float vContactsInRange;
varying vec3 vContactsWorld;

float contactsDisplayT(float t) {
  // Linear — match CAD@0.2 (pow/contrast made HTML look like CAD@0.195).
  return clamp(t, 0.0, 1.0);
}

vec3 contactsJetRgb(float t) {
  float x = 1.0 - contactsDisplayT(t);
  float r = clamp(1.5 - abs(4.0 * x - 3.0), 0.0, 1.0);
  float g = clamp(1.5 - abs(4.0 * x - 2.0), 0.0, 1.0);
  float b = clamp(1.5 - abs(4.0 * x - 1.0), 0.0, 1.0);
  return vec3(r, g, b);
}

bool contactsFragmentPaint(float d, int mode, float sMin, float sMax, out vec3 rgb) {
  if (d > 5.0e5) { return false; }
  if (mode == 1) {
    if (d > 1e-4 || d < sMin) { return false; }
    if (d >= 0.0) { rgb = vec3(1.0, 0.0, 0.0); return true; }
    float u = sMin < 0.0 ? clamp(d / sMin, 0.0, 1.0) : 0.0;
    rgb = mix(vec3(1.0, 0.0, 0.0), vec3(0.8, 0.0, 0.0), u);
    return true;
  }
  if (mode == 2) {
    if (d > sMax) { return false; }
    if (d < 0.0) { rgb = contactsJetRgb(0.0); return true; }
    float lo = max(sMin, 0.0);
    float span = max(sMax - lo, 1e-6);
    rgb = contactsJetRgb(clamp((d - lo) / span, 0.0, 1.0));
    return true;
  }
  if (d > sMax) { return false; }
  if (d < 0.0) { rgb = contactsJetRgb(0.0); return true; }
  if (d < sMin) { return false; }
  float span2 = max(sMax - sMin, 1e-6);
  rgb = contactsJetRgb(clamp((d - sMin) / span2, 0.0, 1.0));
  return true;
}
`).replace("#include <color_fragment>",`#include <color_fragment>
if (uContactsActive > 0.5) {
  float d = vContactsDistance;
  if (uRangeActive > 0.5) {
    vec4 rv = uRangeView * vec4(vContactsWorld, 1.0);
    vec4 rp = uRangeProj * rv;
    vec2 uv = rp.xy / max(rp.w, 1e-6) * 0.5 + 0.5;
    float antZ = texture2D(uRangeMap, uv).r;
    float myZ = -rv.z;
    float ax = texture2D(uRangeMap, uv + vec2(uRangeTexel.x, 0.0)).r;
    float ay = texture2D(uRangeMap, uv + vec2(0.0, uRangeTexel.y)).r;
    bool miss = uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0
      || antZ < 1.0e-4 || ax < 1.0e-4 || ay < 1.0e-4
      || abs(antZ - ax) > 1.25 || abs(antZ - ay) > 1.25;
    d = miss ? 1.0e6 : (antZ - myZ);
  }
  vec3 cPaint;
  if (contactsFragmentPaint(d, uContactsMode, uContactsScaleMin, uContactsScaleMax, cPaint)) {
    diffuseColor.rgb = cPaint;
  }
}
`)},e.needsUpdate=!0}function fs(n,t,e,i,r){const a=n.userData.contactsDistanceUniforms;if(!a)return;a.uRangeActive.value=0,a.uRangeMap.value=e,a.uRangeView.value.copy(i),a.uRangeProj.value.copy(r),a.uRangeTexel||(a.uRangeTexel={value:new Ot(1/320,1/320)}),a.uRangeTexel.value.set(1/320,1/320)}function Fp(n,t){const i=n.userData.contactsDistanceUniforms;if(!i){Pa(n,t);return}i.uContactsScaleMin.value=t.scaleMinMm,i.uContactsScaleMax.value=t.scaleMaxMm,i.uContactsMode.value=Ra(t.mode),i.uContactsActive.value=1}function Da(n){const t=n;t.userData.contactsDistanceShader&&(delete t.userData.contactsDistanceShader,delete t.userData.contactsDistanceUniforms,t.onBeforeCompile=()=>{},t.needsUpdate=!0)}const Np=1396912964,Bp=1,or=32767,Op=.001,kp=1;function zp(n){return n===or?mi:n*Op}function ar(n){n.fill(mi)}function Gp(n,t){return n>=mi*.5?t:t>=mi*.5||n<t?n:t}function La(n,t){let e=0,i=0;for(;t.i<n.length;){const r=n[t.i];if(t.i+=1,e|=(r&127)<<i,(r&128)===0)return e>>>0;i+=7}return e>>>0}class Hp{vertexCount;frameCount;frames;state;cursor=-1;constructor(t){if(t.length<16)throw new Error("contacts sparse: too short");const e=new DataView(t.buffer,t.byteOffset,t.byteLength);if(e.getUint32(0,!0)!==Np)throw new Error("contacts sparse: bad magic");if(e.getUint16(4,!0)!==Bp)throw new Error("contacts sparse: bad version");this.vertexCount=e.getUint32(6,!0),this.frameCount=e.getUint32(12,!0),this.state=new Int16Array(this.vertexCount),this.state.fill(or),this.frames=[];const i={i:16};for(let r=0;r<this.frameCount;r+=1){const s=t[i.i]??0;i.i+=1;const a=La(t,i),o=new Array(a);let c=0;for(let h=0;h<a;h+=1)c+=La(t,i),o[h]=c;const l=new Int16Array(a);for(let h=0;h<a;h+=1){const u=t[i.i]??0,f=t[i.i+1]??0;i.i+=2;let m=f<<8|u;m>=32768&&(m-=65536),l[h]=m}this.frames.push({keyframe:(s&kp)!==0,indices:o,values:l})}}applyFrame(t,e){const i=Math.max(0,Math.min(this.frameCount-1,t));if(this.frameCount===0||e.length<this.vertexCount){ar(e);return}for(i<this.cursor&&(this.state.fill(or),this.cursor=-1);this.cursor<i;){this.cursor+=1;const r=this.frames[this.cursor];r.keyframe&&this.state.fill(or);for(let s=0;s<r.indices.length;s+=1)this.state[r.indices[s]]=r.values[s]}for(let r=0;r<this.vertexCount;r+=1)e[r]=zp(this.state[r])}}function Vp(n,t){const e=Math.min(n.length,t.length);for(let i=0;i<e;i+=1)n[i]=Gp(n[i],t[i])}function Wp(n){return n.length>=2&&n[0]===31&&n[1]===139}function Ia(n){const t=atob(n),e=new Uint8Array(t.length);for(let i=0;i<t.length;i+=1)e[i]=t.charCodeAt(i);return e}async function Ua(n){if(!Wp(n))return n;if(typeof DecompressionStream>"u")throw new Error("contacts sparse: no DecompressionStream");const t=new Blob([n]).stream().pipeThrough(new DecompressionStream("gzip"));return new Uint8Array(await new Response(t).arrayBuffer())}function Fa(n){return new Hp(n)}const Na=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];function Xp(n){if(!n||n.length!==16)return[...Na];const t=Math.abs(n[12]??0)+Math.abs(n[13]??0)+Math.abs(n[14]??0);return Math.abs(n[3]??0)+Math.abs(n[7]??0)+Math.abs(n[11]??0)<=t+1e-8?[...n]:[n[0],n[4],n[8],n[12],n[1],n[5],n[9],n[13],n[2],n[6],n[10],n[14],n[3],n[7],n[11],n[15]]}function qp(n,t){const e=new Array(16);for(let i=0;i<4;i+=1)for(let r=0;r<4;r+=1){let s=0;for(let a=0;a<4;a+=1)s+=(n[a*4+r]??0)*(t[i*4+a]??0);e[i*4+r]=s}return e}function Yp(n){if(n.length!==16)return[...Na];const t=n[0]??1,e=n[1]??0,i=n[2]??0,r=n[4]??0,s=n[5]??1,a=n[6]??0,o=n[8]??0,c=n[9]??0,l=n[10]??1,h=n[12]??0,u=n[13]??0,f=n[14]??0;return[t,r,o,0,e,s,c,0,i,a,l,0,-(t*h+e*u+i*f),-(r*h+s*u+a*f),-(o*h+c*u+l*f),1]}function jp(n){const t=n.toLowerCase();if(t.includes("18-...-28")||t.includes("18-…-28")||t.includes("зубы 18")||t.includes("зубы 11"))return"upper";if(t.includes("38-...-48")||t.includes("38-…-48")||t.includes("зубы 38")||t.includes("зубы 31"))return"lower";if(t.includes("вчч")||t.includes("верхн")||t.includes("maxilla")||t.includes("maxillary"))return"upper";if(t.includes("нчч")||t.includes("нижн")||t.includes("mandib"))return"lower";const e=n.match(/^(\d{1,2})\s*[:.]/)??n.match(/зубы?\s+(\d{1,2})/i)??n.match(/\btooth\s+(\d{1,2})\b/i);if(e){const i=Number(e[1]),r=Math.floor(i/10);if(r===1||r===2)return"upper";if(r===3||r===4)return"lower"}return/\bupper\b/.test(t)?"upper":/\blower\b/.test(t)?"lower":null}function Kp(n){const t=(n.name||"").toLowerCase(),e=n.buffers?.triangle_count??0;return t.includes("исходник")||t.includes("исходный")||t.includes("3d-объект визуализации")||t.includes("3d visualization object")||t.includes("visualization object")||t.includes("вирт. оттиск")||t.includes("virtual imprint")||n.visible===!1?!0:e>=2e6}function ps(n){return n.jaw==="upper"||n.jaw==="lower"?n.jaw:jp(n.name)}const gi='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',_i='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',mn='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>',vi='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';function Ba(n){const t=n.indexOf(" - ");return t<=0||t+3>=n.length?null:{prefix:n.slice(0,t).trim(),suffix:n.slice(t+3).trim()}}function Oa(n,t){const e=new Map,i=[];for(const a of n){const o=t(a);if(!o){i.push(a);continue}const c=e.get(o);c?c.push(a):e.set(o,[a])}if(![...e.values()].some(a=>a.length>=2))return null;const s=[];for(const[a,o]of e)o.length>=2?s.push({kind:"group",id:`g:${a}`,label:a,meshes:o}):o[0]&&s.push({kind:"mesh",mesh:o[0]});for(const a of i)s.push({kind:"mesh",mesh:a});return s}function ka(n){const t=[],e=[],i=[];for(const s of n){const a=ps(s);a==="upper"?t.push(s):a==="lower"?e.push(s):i.push(s)}if(t.length===0&&e.length===0)return null;const r=[];t.length>0&&r.push({kind:"group",id:"g:upper",label:"Верхняя челюсть",meshes:t}),e.length>0&&r.push({kind:"group",id:"g:lower",label:"Нижняя челюсть",meshes:e});for(const s of i)r.push({kind:"mesh",mesh:s});return r}function cr(n,t){n?.closest(".mesh-panel__op-track")?.style.setProperty("--op",String(t))}function Zp(n,t){document.querySelectorAll(`[data-op="${CSS.escape(n)}"]`).forEach(e=>{e.value=String(t),cr(e,t)}),document.querySelectorAll(`[data-mesh-id="${CSS.escape(n)}"]`).forEach(e=>{const i=e.closest(".mesh-panel__group");if(!i)return;const r=i.querySelectorAll("[data-op]");let s=0,a=0;r.forEach(l=>{s+=Number(l.value),a+=1});const o=a>0?s/a:t,c=i.querySelector("[data-group-op]");c&&(c.value=String(o),cr(c,o))})}function Jp(n){return n.map(t=>{if(t.kind!=="group"||t.children?.length)return t;const e=ka(t.meshes);return!e||!e.some(i=>i.kind==="group")?t:{...t,children:e}})}function Qp(n,t){const e=new Map(t.map(r=>[r.id,r])),i=r=>{if(r.kind==="mesh"){const o=e.get(r.mesh_id);return o?{kind:"mesh",mesh:o}:null}const s=r.mesh_ids.map(o=>e.get(o)).filter(o=>o!=null),a=(r.children??[]).map(i).filter(o=>o!=null);return{kind:"group",id:r.id,label:r.label,meshes:s,children:a.length>0?a:void 0}};return n.nodes.map(i).filter(r=>r!=null)}function $p(n,t){if(t&&t.nodes.length>0)return Qp(t,n);const e=Oa(n,i=>Ba(i.name)?.suffix??null)??Oa(n,i=>Ba(i.name)?.prefix??null);return e?Jp(e):ka(n)??n.map(i=>({kind:"mesh",mesh:i}))}function za(n,t,e,i){n.replaceChildren();const r=n.closest(".mesh-panel, .mobile-sheet"),s=$p(e.meshes,e.object_tree),a=s.some(g=>g.kind==="group");r?.classList.toggle("mesh-panel--grouped",a),n.classList.toggle("mesh-panel__list--grouped",a);const o=new Set,c=()=>{const g=document.getElementById(i.visibilityAll);if(!g)return;const _=t.allMeshesHidden();g.classList.toggle("mesh-panel__visibility-all--hidden",_),g.innerHTML=_?_i:gi},l=()=>s.filter(g=>g.kind==="group").every(g=>o.has(g.id)),h=()=>{const g=document.getElementById(i.collapseAll);g&&(g.innerHTML=l()?vi:mn)},u=(g,_,p)=>{const d=document.createElement("li");d.className=p?"mesh-panel__item mesh-panel__item--nested":"mesh-panel__item",_.visible||d.classList.add("mesh-panel__item--hidden"),d.dataset.meshId=_.id;const b=document.createElement("div");b.className="mesh-panel__row";const y=document.createElement("button");y.type="button",y.className="mesh-panel__visibility",y.innerHTML=_.visible?gi:_i,y.addEventListener("pointerdown",A=>A.stopPropagation()),y.addEventListener("click",A=>{A.stopPropagation(),t.toggleMeshVisible(_.id),c()});const E=document.createElement("div");E.className="mesh-panel__op-track",E.style.setProperty("--op",String(_.opacity));const L=document.createElement("div");L.className="mesh-panel__row-fill";const w=document.createElement("input");w.type="range",w.className="mesh-panel__opacity-slider",w.min="0.05",w.max="1",w.step="0.01",w.value=String(_.opacity),w.dataset.op=_.id,w.setAttribute("aria-label","Прозрачность"),w.addEventListener("pointerdown",A=>A.stopPropagation());const R=document.createElement("span");R.className="mesh-panel__name",R.textContent=_.name,R.title=_.name,E.append(L,w,R),b.append(y,E),d.appendChild(b),g.appendChild(d)},f=(g,_,p)=>{const d=document.createElement("li");d.className=p?"mesh-panel__group":"mesh-panel__group mesh-panel__group--nested",d.dataset.groupId=g.id;const b=document.createElement("div");b.className="mesh-panel__group-header";const y=document.createElement("div");y.className="mesh-panel__row mesh-panel__row--group";const E=document.createElement("button");E.type="button",E.className="mesh-panel__visibility";const L=g.meshes.every(G=>G.visible);E.innerHTML=L?gi:_i,E.classList.toggle("mesh-panel__visibility--hidden",!L),E.addEventListener("pointerdown",G=>G.stopPropagation()),E.addEventListener("click",G=>{G.stopPropagation();const V=!g.meshes.every($=>{const z=n.querySelector(`[data-mesh-id="${CSS.escape($.id)}"]`);return z?!z.classList.contains("mesh-panel__item--hidden"):$.visible});for(const $ of g.meshes)t.setMeshVisible($.id,V);E.innerHTML=V?gi:_i,E.classList.toggle("mesh-panel__visibility--hidden",!V),c()});const w=document.createElement("button");w.type="button",w.className="mesh-panel__collapse mesh-panel__collapse--group",w.innerHTML=mn;const R=G=>{d.classList.toggle("mesh-panel__group--collapsed",G),w.innerHTML=G?vi:mn,G?o.add(g.id):o.delete(g.id)};w.addEventListener("pointerdown",G=>G.stopPropagation()),w.addEventListener("click",G=>{G.stopPropagation(),R(!o.has(g.id)),h()});const A=g.meshes.reduce((G,V)=>G+V.opacity,0)/Math.max(1,g.meshes.length),S=document.createElement("div");S.className="mesh-panel__op-track",S.style.setProperty("--op",String(A));const M=document.createElement("div");M.className="mesh-panel__row-fill";const C=document.createElement("input");C.type="range",C.className="mesh-panel__opacity-slider",C.min="0.05",C.max="1",C.step="0.01",C.value=String(A),C.dataset.groupOp=g.id,C.setAttribute("aria-label","Прозрачность группы"),C.addEventListener("pointerdown",G=>G.stopPropagation()),C.addEventListener("input",()=>{const G=Number(C.value);S.style.setProperty("--op",String(G));for(const V of g.meshes){t.setMeshOpacity(V.id,G);const $=n.querySelector(`[data-op="${CSS.escape(V.id)}"]`);$&&($.value=String(G),cr($,G))}});const H=document.createElement("span");H.className="mesh-panel__name mesh-panel__name--group",H.textContent=g.label,H.title=g.label,S.append(M,C,H),y.append(E,w,S),b.append(y);const O=document.createElement("ul");O.className="mesh-panel__group-children";const X=new Set;if(g.children?.length)for(const G of g.children)G.kind==="group"?(G.meshes.forEach(V=>X.add(V.id)),f(G,O,!1)):(X.add(G.mesh.id),u(O,G.mesh,!0));for(const G of g.meshes)X.has(G.id)||u(O,G,!0);d.append(b,O),_.appendChild(d),R(p)};for(const g of s)g.kind==="group"?f(g,n,!0):u(n,g.mesh,!1);n.querySelectorAll("[data-op]").forEach(g=>{g.addEventListener("input",()=>{const _=Number(g.value);t.setMeshOpacity(g.dataset.op,_),cr(g,_)})});const m=document.getElementById(i.collapseAll);m&&(m.hidden=!a),document.getElementById(i.visibilityAll)?.addEventListener("click",g=>{g.stopPropagation(),t.toggleAllVisible(),c()}),document.getElementById(i.collapseAll)?.addEventListener("click",g=>{g.stopPropagation();const _=!l();for(const p of s){if(p.kind!=="group")continue;const d=n.querySelector(`[data-group-id="${CSS.escape(p.id)}"]`);if(!d)continue;d.classList.toggle("mesh-panel__group--collapsed",_);const b=d.querySelector(".mesh-panel__collapse--group");b&&(b.innerHTML=_?vi:mn),_?o.add(p.id):o.delete(p.id)}h()}),c(),h()}const ms=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],Ga=[{slot:"protrusion",label:"Протрузия"},{slot:"retrusion",label:"Ретрузия"},{slot:"latero_left",label:"Латеротризия влево"},{slot:"latero_right",label:"Латеротризия вправо"}];function Ha(n){return!!n?.tracks?.some(t=>t.steps.length>0)}function tm(n){const t=n?.contacts?.meshes;return t?.length?t.some(e=>{const i=e.tracks??{};return Object.values(i).some(r=>!!r)}):!1}function em(n){return!!n?.contacts?.meshes?.some(t=>!!t.imprintAll)}function lr(n){if(!n)return null;const t=n,e=t.contacts??null;let i=null;if(e){const a=e.meshes,o=Array.isArray(a)?a.map(c=>{const l=c,h=l.tracks??l.Tracks??{};return{id:String(l.id??""),role:String(l.role??l.Role??"design"),vertexCount:Number(l.vertexCount??l.vertex_count??0),tracks:h,imprintAll:l.imprintAll??l.imprint_all??null}}):[];i={bandMm:Number(e.bandMm??e.band_mm??2),scaleMinMm:Number(e.scaleMinMm??e.scale_min_mm??-.5),scaleMaxMm:Number(e.scaleMaxMm??e.scale_max_mm??.2),mode:String(e.mode??"free"),quantMm:e.quantMm!=null||e.quant_mm!=null?Number(e.quantMm??e.quant_mm):void 0,keyframeEvery:e.keyframeEvery!=null||e.keyframe_every!=null?Number(e.keyframeEvery??e.keyframe_every):void 0,meshes:o}}const r=Array.isArray(n.tracks)?n.tracks:[],s={articulatorName:n.articulatorName??t.articulator_name??null,tracks:r,contacts:i};return!Ha(s)&&!tm(s)&&!em(s)?null:s}function nm(n,t){if(!t)return n;const e={articulatorName:n.articulatorName??t.articulatorName??null,tracks:Ha(n)?n.tracks:t.tracks,contacts:n.contacts??t.contacts??null};if(e.contacts&&t.contacts&&n.contacts){const i=new Map(e.contacts.meshes.map(r=>[r.id,r]));for(const r of t.contacts.meshes){const s=i.get(r.id);if(!s){i.set(r.id,r);continue}i.set(r.id,{...s,vertexCount:s.vertexCount||r.vertexCount,tracks:{...r.tracks,...s.tracks},imprintAll:s.imprintAll??r.imprintAll??null})}e.contacts={...e.contacts,meshes:[...i.values()]}}return e}function hr(n){const t=lr(n.articulator),e=lr(window.__D3D_ARTICULATOR__);return t&&e?lr(nm(t,e)):t??e}function im(n){const t=[],e=[];for(const i of n){const r=ps(i);r==="upper"?t.push(i.id):r==="lower"&&e.push(i.id)}return{upper:t,lower:e}}function rm(n){return n.toLowerCase().replace(/[\s_\-]+/g,"")}function sm(n){const t=rm(n);if(t.includes("retrus")||t.includes("ретруз"))return"retrusion";if(t.includes("protrus")||t.includes("протруз"))return"protrusion";const e=t.includes("latero")||t.includes("латеро");return e&&(t.includes("left")||t.includes("лев"))?"latero_left":e&&(t.includes("right")||t.includes("прав"))?"latero_right":"other"}function Va(n){return!n||n.length!==16?!0:n.every((t,e)=>Math.abs(t-(ms[e]??0))<=1e-5)}function om(n,t,e,i,r){const s=r==="upper",a=s?i.upper:i.lower,o=s?i.lower:i.upper,c=t?.steps[e],l=(t?.moving??"lower").toLowerCase().startsWith("up");let h=c&&c.length===16&&!Va(c)?Xp(c):ms;s!==l&&h!==ms&&(h=Yp(h));for(const u of a){const f=n.getRestMatrix(u);f&&n.setMeshMatrix(u,qp(h,f))}for(const u of o){const f=n.getRestMatrix(u);f&&n.setMeshMatrix(u,f)}}function Ke(n){for(const t of n){const e=document.querySelector(t);if(e)return e}return null}function Wa(n,t){if(n)for(const e of t){const i=n.querySelector(e);if(i)return i}return Ke(t)}function Xa(n,t){const e=Wa(n,[`#${t}`,"[data-articulator-frame]",'input[type="range"]']);if(e)return e;if(!n)return null;const i=document.createElement("input");return i.type="range",i.id=t,i.className="articulator-panel__slider",i.min="0",i.max="0",i.value="0",n.appendChild(i),i}function qa(n,t){const e=Wa(n,[`#${t}`,"[data-articulator-movements]",".articulator-panel__radios",".articulator-panel__movements"]);if(e)return e.classList.add("articulator-panel__radios"),e;if(!n)return null;const i=document.createElement("div");return i.id=t,i.className="articulator-panel__radios",n.appendChild(i),i}function am(n,t){const e=hr(t),i=Ke(["#articulator-panel","[data-articulator-panel]",".articulator-panel"]),r=Ke(["#mobile-sheet-articulator",'[data-mobile-sheet="articulator"]']),s=document.querySelector('#mobile-dock [data-mobile-sheet="articulator"]');if(!e||e.tracks.length===0){i?.classList.add("articulator-panel--hidden"),s&&(s.hidden=!0);return}i?.classList.remove("articulator-panel--hidden"),i?.addEventListener("pointerdown",j=>j.stopPropagation()),i?.addEventListener("pointerup",j=>j.stopPropagation()),s&&(s.hidden=!1);const a=im(t.meshes),o=Ke(["#articulator-name","[data-articulator-name]"]);o&&(o.textContent="Движения в артикуляторе");const c=Ke(["#articulator-header",".articulator-panel__header"]),l=Ke(["#articulator-collapse",".articulator-panel__collapse"]);l&&!l.innerHTML.trim()&&(l.innerHTML=mn);const h=j=>{i?.classList.toggle("articulator-panel--collapsed",j),l&&(l.title=j?"Развернуть":"Свернуть",l.innerHTML=j?vi:mn)},u=j=>{j.stopPropagation(),h(!i?.classList.contains("articulator-panel--collapsed"))};l?.addEventListener("click",u),c?.addEventListener("click",j=>{j.target instanceof Element&&j.target.closest("button")||u(j)}),h(!1),document.querySelectorAll(".articulator-panel__jaw .articulator-panel__label").forEach(j=>{j.textContent="Движущаяся челюсть"});const f=e.tracks.some(j=>/bite|прикус|occlus/i.test(j.type))||t.meshes.some(j=>{const dt=j.source_pose??j.source_pose_matrix;return dt!=null&&dt.length===16&&!Va(dt)}),m=new Map,g=[];e.tracks.forEach((j,dt)=>{const Mt=sm(j.type);if(Mt!=="other"&&!m.has(Mt)){m.set(Mt,dt);return}g.push({index:dt,label:j.type||`Движение ${dt+1}`})});const _=Ga.map(j=>m.get(j.slot)).find(j=>j!==void 0)??g[0]?.index??0,p=i?.querySelector(".articulator-panel__body")??i,d=qa(p,"articulator-movements"),b=qa(r,"articulator-movements-mobile"),y=Xa(p,"articulator-frame"),E=Xa(r,"articulator-frame-mobile"),L=[Ke(["#articulator-jaw","[data-articulator-jaw]"]),Ke(["#articulator-jaw-mobile","[data-articulator-jaw-mobile]"])],w=[Ke(["#articulator-bite","[data-articulator-bite]"]),Ke(["#articulator-bite-mobile","[data-articulator-bite-mobile]"])];let R=_,A=0,S=(e.tracks[R]?.moving??"lower").toLowerCase().startsWith("up")?"upper":"lower";const M=()=>e.tracks[R],C=j=>{if(!j)return;j.replaceChildren();const dt=(Mt,q)=>{const et=document.createElement("button");et.type="button",et.className="articulator-panel__radio",et.dataset.index=String(Mt),et.addEventListener("pointerdown",pt=>{pt.stopPropagation()}),et.addEventListener("click",pt=>{pt.stopPropagation(),pt.preventDefault(),V(Mt)}),et.textContent=q,j.appendChild(et)};for(const Mt of Ga){const q=m.get(Mt.slot);q!==void 0&&dt(q,Mt.label)}for(const Mt of g)dt(Mt.index,Mt.label)};C(d),C(b);const H=()=>{for(const j of[d,b])j?.querySelectorAll(".articulator-panel__radio").forEach(dt=>{dt.classList.toggle("articulator-panel__radio--active",dt.dataset.index===String(R))})},O=()=>{for(const j of L)j?.querySelectorAll("[data-jaw]").forEach(dt=>{dt.classList.toggle("is-active",dt.dataset.jaw===S)})},X=()=>{const dt=Math.max(1,M()?.steps.length??1)-1;A=Math.min(A,dt);for(const Mt of[y,E])Mt&&(Mt.max=String(dt),Mt.value=String(A))},G=()=>{om(n,M(),A,a,S);const j=M();j&&n.applyArticulatorContactFrame?.(j.type,A)},V=j=>{R=Math.max(0,Math.min(j,e.tracks.length-1)),A=0,H(),X(),z(),G()},$=j=>{S!==j&&(S=j,O(),G())},z=()=>{const j=A>0,dt=j?"Закрыть прикус":"Открыть прикус";for(const Mt of w)Mt&&(Mt.hidden=!f,Mt.textContent=dt,Mt.classList.toggle("is-open",j))},rt=j=>{const dt=Math.max(0,(M()?.steps.length??1)-1);A=j?dt:0,X(),z(),G()},ut=j=>{A=Math.max(0,j),X(),z(),G()};for(const j of L)j?.querySelectorAll("[data-jaw]").forEach(dt=>{dt.addEventListener("pointerdown",Mt=>Mt.stopPropagation()),dt.addEventListener("click",Mt=>{Mt.stopPropagation(),Mt.preventDefault(),$(dt.dataset.jaw==="upper"?"upper":"lower")})});y?.addEventListener("input",()=>ut(Number(y.value))),E?.addEventListener("input",()=>ut(Number(E.value)));for(const j of w)j?.addEventListener("click",()=>rt(A===0));H(),O(),X(),z(),G()}const cm=-.5,lm=.2,$n=new Jt;class hm{constructor(t){this.meshes=t}enabled=!1;dynamicEnabled=!1;showOnJaws=!1;sidecar=null;mapsReady=!1;imprints=new Map;scratch=new Map;meshRoles=new Map;lastTrack="";lastFrame=0;mappedDecoders=new Map;get scaleMinMm(){return this.sidecar?.contacts?.scaleMinMm??cm}get scaleMaxMm(){return this.sidecar?.contacts?.scaleMaxMm??lm}get paintMode(){const t=String(this.sidecar?.contacts?.mode??"free").toLowerCase();return t==="proximity"||t==="distance"||t==="дистанция"?"proximity":t==="intersectionsonly"||t==="intersections"||t==="пересечения"?"intersectionsOnly":"free"}hasMaps(){return this.mapsReady}hasImprint(){return this.imprints.size>0}hasJawScanMaps(){for(const[t]of this.mappedDecoders)if(this.isScanRole(t))return!0;return!1}isScanRole(t){const e=(this.meshRoles.get(t)??"design").toLowerCase();return e==="scan"||e==="jaw"||e==="antagonist"}async loadSidecar(t){const e=lr(t);this.sidecar=e,this.mapsReady=!1,this.mappedDecoders.clear(),this.imprints.clear(),this.scratch.clear(),this.meshRoles.clear();const i=e?.contacts;if(!i?.meshes?.length)return;const r=new Map(this.meshes().map(s=>[s.id,s]));for(const s of i.meshes){this.meshRoles.set(s.id,String(s.role??"design"));const a=new Map;for(const[o,c]of Object.entries(s.tracks??{}))if(c)try{const l=await Ua(Ia(c));a.set(o,Fa(l))}catch{}if(a.size>0&&this.mappedDecoders.set(s.id,a),s.imprintAll)try{const o=await Ua(Ia(s.imprintAll)),c=Fa(o),l=s.vertexCount||r.get(s.id)?.mesh.geometry.getAttribute("position")?.count||c.vertexCount,h=new Float32Array(l);c.applyFrame(0,h),this.imprints.set(s.id,h)}catch{}}this.mapsReady=this.mappedDecoders.size>0}setEnabled(t){if(this.enabled=t,!t){this.clearPaint();return}this.applyCurrent()}setDynamicEnabled(t){this.dynamicEnabled=t,this.enabled&&this.applyCurrent()}setShowOnJaws(t){this.showOnJaws=t,this.enabled&&(t||this.clearScanPaint(),this.applyCurrent())}applyFrame(t,e){this.lastTrack=t,this.lastFrame=e,this.enabled&&this.applyCurrent()}refreshAfterMaterialChange(){this.enabled&&this.applyCurrent()}applyCurrent(){if(!this.hasMaps())return;const t=this.lastTrack;for(const e of this.meshes()){if(e.photo||this.isScanRole(e.id)&&!this.showOnJaws)continue;const i=e.mesh.geometry.getAttribute("position");if(!i)continue;const r=this.mappedDecoders.get(e.id),s=this.imprints.get(e.id);if(!r&&!s)continue;const a=this.scratchFor(e.id,i.count);ar(a);const o=r?.get(t)??r?.values().next().value;o&&o.applyFrame(this.lastFrame,a),this.dynamicEnabled&&s&&Vp(a,s),this.paintMesh(e,a)}}scratchFor(t,e){let i=this.scratch.get(t);return(!i||i.length!==e)&&(i=new Float32Array(e),this.scratch.set(t,i)),i}ensurePatched(t){const e=t.mesh.geometry;if(!e.getAttribute("contactsDistance")){const s=e.getAttribute("position")?.count??1,a=new Float32Array(s);a.fill(mi),e.setAttribute("contactsDistance",new Qt(a,1))}const i=t.mesh.material;if(Array.isArray(i))return;const r={scaleMinMm:this.scaleMinMm,scaleMaxMm:this.scaleMaxMm,mode:this.paintMode};i.userData.contactsDistanceShader?Fp(i,r):Pa(i,r)}paintMesh(t,e){const i=t.mesh.geometry,r=i.getAttribute("contactsDistance");if(r&&r.array instanceof Float32Array&&r.array.length===e.length)r.array!==e&&r.array.set(e),r.needsUpdate=!0;else{const a=new Qt(e,1);a.setUsage(35048),i.setAttribute("contactsDistance",a)}this.ensurePatched(t);const s=t.mesh.material;Array.isArray(s)||fs(s,!1,null,$n,$n)}clearScanPaint(){for(const t of this.meshes()){if(!this.isScanRole(t.id))continue;const e=t.mesh.material;Array.isArray(e)||(fs(e,!1,null,$n,$n),Da(e));const i=t.mesh.geometry.getAttribute("contactsDistance");i&&i.array instanceof Float32Array&&(ar(i.array),i.needsUpdate=!0)}}clearPaint(){for(const t of this.meshes()){const e=t.mesh.material;Array.isArray(e)||(fs(e,!1,null,$n,$n),Da(e));const i=t.mesh.geometry.getAttribute("contactsDistance");i&&i.array instanceof Float32Array&&(ar(i.array),i.needsUpdate=!0)}}}const Ya=2.5,ja=1.3,Ka=.7;function Te(n){const t=atob(n),e=t.length,i=new Uint8Array(e),r=32768;for(let s=0;s<e;s+=r){const a=Math.min(s+r,e);for(let o=s;o<a;o+=1)i[o]=t.charCodeAt(o)}return i}function um(n){let e="";for(let i=0;i<n.length;i+=32768){const r=n.subarray(i,Math.min(i+32768,n.length));e+=String.fromCharCode(...r)}return btoa(e)}const Za={};(function(n){n.OutWindow=function(){this._windowSize=0},n.OutWindow.prototype.create=function(t){(!this._buffer||this._windowSize!==t)&&(this._buffer=new Uint8Array(t)),this._windowSize=t,this._pos=0,this._streamPos=0},n.OutWindow.prototype.flush=function(){var t=this._pos-this._streamPos;if(t!==0){if(this._stream.writeBytes)this._stream.writeBytes(this._buffer,t);else for(var e=0;e<t;e++)this._stream.writeByte(this._buffer[e]);this._pos>=this._windowSize&&(this._pos=0),this._streamPos=this._pos}},n.OutWindow.prototype.releaseStream=function(){this.flush(),this._stream=null},n.OutWindow.prototype.setStream=function(t){this.releaseStream(),this._stream=t},n.OutWindow.prototype.init=function(t){t||(this._streamPos=0,this._pos=0)},n.OutWindow.prototype.copyBlock=function(t,e){var i=this._pos-t-1;for(i<0&&(i+=this._windowSize);e--;)i>=this._windowSize&&(i=0),this._buffer[this._pos++]=this._buffer[i++],this._pos>=this._windowSize&&this.flush()},n.OutWindow.prototype.putByte=function(t){this._buffer[this._pos++]=t,this._pos>=this._windowSize&&this.flush()},n.OutWindow.prototype.getByte=function(t){var e=this._pos-t-1;return e<0&&(e+=this._windowSize),this._buffer[e]},n.RangeDecoder=function(){},n.RangeDecoder.prototype.setStream=function(t){this._stream=t},n.RangeDecoder.prototype.releaseStream=function(){this._stream=null},n.RangeDecoder.prototype.init=function(){var t=5;for(this._code=0,this._range=-1;t--;)this._code=this._code<<8|this._stream.readByte()},n.RangeDecoder.prototype.decodeDirectBits=function(t){for(var e=0,i=t,r;i--;)this._range>>>=1,r=this._code-this._range>>>31,this._code-=this._range&r-1,e=e<<1|1-r,(this._range&4278190080)===0&&(this._code=this._code<<8|this._stream.readByte(),this._range<<=8);return e},n.RangeDecoder.prototype.decodeBit=function(t,e){var i=t[e],r=(this._range>>>11)*i;return(this._code^2147483648)<(r^2147483648)?(this._range=r,t[e]+=2048-i>>>5,(this._range&4278190080)===0&&(this._code=this._code<<8|this._stream.readByte(),this._range<<=8),0):(this._range-=r,this._code-=r,t[e]-=i>>>5,(this._range&4278190080)===0&&(this._code=this._code<<8|this._stream.readByte(),this._range<<=8),1)},n.initBitModels=function(t,e){for(;e--;)t[e]=1024},n.BitTreeDecoder=function(t){this._models=[],this._numBitLevels=t},n.BitTreeDecoder.prototype.init=function(){n.initBitModels(this._models,1<<this._numBitLevels)},n.BitTreeDecoder.prototype.decode=function(t){for(var e=1,i=this._numBitLevels;i--;)e=e<<1|t.decodeBit(this._models,e);return e-(1<<this._numBitLevels)},n.BitTreeDecoder.prototype.reverseDecode=function(t){for(var e=1,i=0,r=0,s;r<this._numBitLevels;++r)s=t.decodeBit(this._models,e),e=e<<1|s,i|=s<<r;return i},n.reverseDecode2=function(t,e,i,r){for(var s=1,a=0,o=0,c;o<r;++o)c=i.decodeBit(t,e+s),s=s<<1|c,a|=c<<o;return a},n.LenDecoder=function(){this._choice=[],this._lowCoder=[],this._midCoder=[],this._highCoder=new n.BitTreeDecoder(8),this._numPosStates=0},n.LenDecoder.prototype.create=function(t){for(;this._numPosStates<t;++this._numPosStates)this._lowCoder[this._numPosStates]=new n.BitTreeDecoder(3),this._midCoder[this._numPosStates]=new n.BitTreeDecoder(3)},n.LenDecoder.prototype.init=function(){var t=this._numPosStates;for(n.initBitModels(this._choice,2);t--;)this._lowCoder[t].init(),this._midCoder[t].init();this._highCoder.init()},n.LenDecoder.prototype.decode=function(t,e){return t.decodeBit(this._choice,0)===0?this._lowCoder[e].decode(t):t.decodeBit(this._choice,1)===0?8+this._midCoder[e].decode(t):16+this._highCoder.decode(t)},n.Decoder2=function(){this._decoders=[]},n.Decoder2.prototype.init=function(){n.initBitModels(this._decoders,768)},n.Decoder2.prototype.decodeNormal=function(t){var e=1;do e=e<<1|t.decodeBit(this._decoders,e);while(e<256);return e&255},n.Decoder2.prototype.decodeWithMatchByte=function(t,e){var i=1,r,s;do if(r=e>>7&1,e<<=1,s=t.decodeBit(this._decoders,(1+r<<8)+i),i=i<<1|s,r!==s){for(;i<256;)i=i<<1|t.decodeBit(this._decoders,i);break}while(i<256);return i&255},n.LiteralDecoder=function(){},n.LiteralDecoder.prototype.create=function(t,e){var i;if(!(this._coders&&this._numPrevBits===e&&this._numPosBits===t))for(this._numPosBits=t,this._posMask=(1<<t)-1,this._numPrevBits=e,this._coders=[],i=1<<this._numPrevBits+this._numPosBits;i--;)this._coders[i]=new n.Decoder2},n.LiteralDecoder.prototype.init=function(){for(var t=1<<this._numPrevBits+this._numPosBits;t--;)this._coders[t].init()},n.LiteralDecoder.prototype.getDecoder=function(t,e){return this._coders[((t&this._posMask)<<this._numPrevBits)+((e&255)>>>8-this._numPrevBits)]},n.Decoder=function(){this._outWindow=new n.OutWindow,this._rangeDecoder=new n.RangeDecoder,this._isMatchDecoders=[],this._isRepDecoders=[],this._isRepG0Decoders=[],this._isRepG1Decoders=[],this._isRepG2Decoders=[],this._isRep0LongDecoders=[],this._posSlotDecoder=[],this._posDecoders=[],this._posAlignDecoder=new n.BitTreeDecoder(4),this._lenDecoder=new n.LenDecoder,this._repLenDecoder=new n.LenDecoder,this._literalDecoder=new n.LiteralDecoder,this._dictionarySize=-1,this._dictionarySizeCheck=-1,this._posSlotDecoder[0]=new n.BitTreeDecoder(6),this._posSlotDecoder[1]=new n.BitTreeDecoder(6),this._posSlotDecoder[2]=new n.BitTreeDecoder(6),this._posSlotDecoder[3]=new n.BitTreeDecoder(6)},n.Decoder.prototype.setDictionarySize=function(t){return t<0?!1:(this._dictionarySize!==t&&(this._dictionarySize=t,this._dictionarySizeCheck=Math.max(this._dictionarySize,1),this._outWindow.create(Math.max(this._dictionarySizeCheck,4096))),!0)},n.Decoder.prototype.setLcLpPb=function(t,e,i){var r=1<<i;return t>8||e>4||i>4?!1:(this._literalDecoder.create(e,t),this._lenDecoder.create(r),this._repLenDecoder.create(r),this._posStateMask=r-1,!0)},n.Decoder.prototype.setProperties=function(t){if(!this.setLcLpPb(t.lc,t.lp,t.pb))throw Error("Incorrect stream properties");if(!this.setDictionarySize(t.dictionarySize))throw Error("Invalid dictionary size")},n.Decoder.prototype.decodeHeader=function(t){var e,i,r,s,a,o;return t.size<13?!1:(e=t.readByte(),i=e%9,e=~~(e/9),r=e%5,s=~~(e/5),o=t.readByte(),o|=t.readByte()<<8,o|=t.readByte()<<16,o+=t.readByte()*16777216,a=t.readByte(),a|=t.readByte()<<8,a|=t.readByte()<<16,a+=t.readByte()*16777216,t.readByte(),t.readByte(),t.readByte(),t.readByte(),{lc:i,lp:r,pb:s,dictionarySize:o,uncompressedSize:a})},n.Decoder.prototype.init=function(){var t=4;for(this._outWindow.init(!1),n.initBitModels(this._isMatchDecoders,192),n.initBitModels(this._isRep0LongDecoders,192),n.initBitModels(this._isRepDecoders,12),n.initBitModels(this._isRepG0Decoders,12),n.initBitModels(this._isRepG1Decoders,12),n.initBitModels(this._isRepG2Decoders,12),n.initBitModels(this._posDecoders,114),this._literalDecoder.init();t--;)this._posSlotDecoder[t].init();this._lenDecoder.init(),this._repLenDecoder.init(),this._posAlignDecoder.init(),this._rangeDecoder.init()},n.Decoder.prototype.decodeBody=function(t,e,i){var r=0,s=0,a=0,o=0,c=0,l=0,h=0,u,f,m,g,_,p;for(this._rangeDecoder.setStream(t),this._outWindow.setStream(e),this.init();i<0||l<i;)if(u=l&this._posStateMask,this._rangeDecoder.decodeBit(this._isMatchDecoders,(r<<4)+u)===0)f=this._literalDecoder.getDecoder(l++,h),r>=7?h=f.decodeWithMatchByte(this._rangeDecoder,this._outWindow.getByte(s)):h=f.decodeNormal(this._rangeDecoder),this._outWindow.putByte(h),r=r<4?0:r-(r<10?3:6);else{if(this._rangeDecoder.decodeBit(this._isRepDecoders,r)===1)m=0,this._rangeDecoder.decodeBit(this._isRepG0Decoders,r)===0?this._rangeDecoder.decodeBit(this._isRep0LongDecoders,(r<<4)+u)===0&&(r=r<7?9:11,m=1):(this._rangeDecoder.decodeBit(this._isRepG1Decoders,r)===0?g=a:(this._rangeDecoder.decodeBit(this._isRepG2Decoders,r)===0?g=o:(g=c,c=o),o=a),a=s,s=g),m===0&&(m=2+this._repLenDecoder.decode(this._rangeDecoder,u),r=r<7?8:11);else if(c=o,o=a,a=s,m=2+this._lenDecoder.decode(this._rangeDecoder,u),r=r<7?7:10,_=this._posSlotDecoder[m<=5?m-2:3].decode(this._rangeDecoder),_>=4){if(p=(_>>1)-1,s=(2|_&1)<<p,_<14)s+=n.reverseDecode2(this._posDecoders,s-_-1,this._rangeDecoder,p);else if(s+=this._rangeDecoder.decodeDirectBits(p-4)<<4,s+=this._posAlignDecoder.reverseDecode(this._rangeDecoder),s<0){if(s===-1)break;return!1}}else s=_;if(s>=l||s>=this._dictionarySizeCheck)return!1;this._outWindow.copyBlock(s,m),l+=m,h=this._outWindow.getByte(0)}return this._outWindow.flush(),this._outWindow.releaseStream(),this._rangeDecoder.releaseStream(),!0},n.Decoder.prototype.setDecoderProperties=function(t){var e,i,r,s,a;return t.size<5||(e=t.readByte(),i=e%9,e=~~(e/9),r=e%5,s=~~(e/5),!this.setLcLpPb(i,r,s))?!1:(a=t.readByte(),a|=t.readByte()<<8,a|=t.readByte()<<16,a+=t.readByte()*16777216,this.setDictionarySize(a))},n.decompress=function(t,e,i,r){var s=new n.Decoder;if(!s.setDecoderProperties(t))throw Error("Incorrect lzma stream properties");if(!s.decodeBody(e,i,r))throw Error("Error in lzma data stream");return i},n.decompressFile=function(t,e){t instanceof ArrayBuffer&&(t=new n.iStream(t)),!e&&n.oStream&&(e=new n.oStream);var i=new n.Decoder,r=i.decodeHeader(t),s=r.uncompressedSize;if(i.setProperties(r),!i.decodeBody(t,e,s))throw Error("Error in lzma data stream");return e},n.decode=n.decompressFile})(Za);const Q={};Q.CompressionMethod={RAW:5718354,MG1:3229517,MG2:3295053},Q.Flags={NORMALS:1},Q.File=function(n){this.load(n)},Q.File.prototype.load=function(n){this.header=new Q.FileHeader(n),this.body=new Q.FileBody(this.header),this.getReader().read(n,this.body)},Q.File.prototype.getReader=function(){var n;switch(this.header.compressionMethod){case Q.CompressionMethod.RAW:n=new Q.ReaderRAW;break;case Q.CompressionMethod.MG1:n=new Q.ReaderMG1;break;case Q.CompressionMethod.MG2:n=new Q.ReaderMG2;break}return n},Q.FileHeader=function(n){n.readInt32(),this.fileFormat=n.readInt32(),this.compressionMethod=n.readInt32(),this.vertexCount=n.readInt32(),this.triangleCount=n.readInt32(),this.uvMapCount=n.readInt32(),this.attrMapCount=n.readInt32(),this.flags=n.readInt32(),this.comment=n.readString()},Q.FileHeader.prototype.hasNormals=function(){return this.flags&Q.Flags.NORMALS},Q.FileBody=function(n){var t=n.triangleCount*3,e=n.vertexCount*3,i=n.hasNormals()?n.vertexCount*3:0,r=n.vertexCount*2,s=n.vertexCount*4,a=0,o=new ArrayBuffer((t+e+i+r*n.uvMapCount+s*n.attrMapCount)*4);if(this.indices=new Uint32Array(o,0,t),this.vertices=new Float32Array(o,t*4,e),n.hasNormals()&&(this.normals=new Float32Array(o,(t+e)*4,i)),n.uvMapCount)for(this.uvMaps=[],a=0;a<n.uvMapCount;++a)this.uvMaps[a]={uv:new Float32Array(o,(t+e+i+a*r)*4,r)};if(n.attrMapCount)for(this.attrMaps=[],a=0;a<n.attrMapCount;++a)this.attrMaps[a]={attr:new Float32Array(o,(t+e+i+r*n.uvMapCount+a*s)*4,s)}},Q.FileMG2Header=function(n){n.readInt32(),this.vertexPrecision=n.readFloat32(),this.normalPrecision=n.readFloat32(),this.lowerBoundx=n.readFloat32(),this.lowerBoundy=n.readFloat32(),this.lowerBoundz=n.readFloat32(),this.higherBoundx=n.readFloat32(),this.higherBoundy=n.readFloat32(),this.higherBoundz=n.readFloat32(),this.divx=n.readInt32(),this.divy=n.readInt32(),this.divz=n.readInt32(),this.sizex=(this.higherBoundx-this.lowerBoundx)/this.divx,this.sizey=(this.higherBoundy-this.lowerBoundy)/this.divy,this.sizez=(this.higherBoundz-this.lowerBoundz)/this.divz},Q.ReaderRAW=function(){},Q.ReaderRAW.prototype.read=function(n,t){this.readIndices(n,t.indices),this.readVertices(n,t.vertices),t.normals&&this.readNormals(n,t.normals),t.uvMaps&&this.readUVMaps(n,t.uvMaps),t.attrMaps&&this.readAttrMaps(n,t.attrMaps)},Q.ReaderRAW.prototype.readIndices=function(n,t){n.readInt32(),n.readArrayInt32(t)},Q.ReaderRAW.prototype.readVertices=function(n,t){n.readInt32(),n.readArrayFloat32(t)},Q.ReaderRAW.prototype.readNormals=function(n,t){n.readInt32(),n.readArrayFloat32(t)},Q.ReaderRAW.prototype.readUVMaps=function(n,t){for(var e=0;e<t.length;++e)n.readInt32(),t[e].name=n.readString(),t[e].filename=n.readString(),n.readArrayFloat32(t[e].uv)},Q.ReaderRAW.prototype.readAttrMaps=function(n,t){for(var e=0;e<t.length;++e)n.readInt32(),t[e].name=n.readString(),n.readArrayFloat32(t[e].attr)},Q.ReaderMG1=function(){},Q.ReaderMG1.prototype.read=function(n,t){this.readIndices(n,t.indices),this.readVertices(n,t.vertices),t.normals&&this.readNormals(n,t.normals),t.uvMaps&&this.readUVMaps(n,t.uvMaps),t.attrMaps&&this.readAttrMaps(n,t.attrMaps)},Q.ReaderMG1.prototype.readIndices=function(n,t){n.readInt32();var e=n.readInt32(),i=new Q.InterleavedStream(t,3);Q.decompress(n,e,i),Q.restoreIndices(t,t.length)},Q.ReaderMG1.prototype.readVertices=function(n,t){n.readInt32();var e=n.readInt32(),i=new Q.InterleavedStream(t,1);Q.decompress(n,e,i)},Q.ReaderMG1.prototype.readNormals=function(n,t){n.readInt32();var e=n.readInt32(),i=new Q.InterleavedStream(t,3);Q.decompress(n,e,i)},Q.ReaderMG1.prototype.readUVMaps=function(n,t){for(var e=0;e<t.length;++e){n.readInt32(),t[e].name=n.readString(),t[e].filename=n.readString();var i=n.readInt32(),r=new Q.InterleavedStream(t[e].uv,2);Q.decompress(n,i,r)}},Q.ReaderMG1.prototype.readAttrMaps=function(n,t){for(var e=0;e<t.length;++e){n.readInt32(),t[e].name=n.readString();var i=n.readInt32(),r=new Q.InterleavedStream(t[e].attr,4);Q.decompress(n,i,r)}},Q.ReaderMG2=function(){},Q.ReaderMG2.prototype.read=function(n,t){this.MG2Header=new Q.FileMG2Header(n),this.readVertices(n,t.vertices),this.readIndices(n,t.indices),t.normals&&this.readNormals(n,t),t.uvMaps&&this.readUVMaps(n,t.uvMaps),t.attrMaps&&this.readAttrMaps(n,t.attrMaps)},Q.ReaderMG2.prototype.readVertices=function(n,t){n.readInt32();var e=n.readInt32(),i=new Q.InterleavedStream(t,3);Q.decompress(n,e,i);var r=this.readGridIndices(n,t);Q.restoreVertices(t,this.MG2Header,r,this.MG2Header.vertexPrecision)},Q.ReaderMG2.prototype.readGridIndices=function(n,t){n.readInt32();var e=n.readInt32(),i=new Uint32Array(t.length/3),r=new Q.InterleavedStream(i,1);return Q.decompress(n,e,r),Q.restoreGridIndices(i,i.length),i},Q.ReaderMG2.prototype.readIndices=function(n,t){n.readInt32();var e=n.readInt32(),i=new Q.InterleavedStream(t,3);Q.decompress(n,e,i),Q.restoreIndices(t,t.length)},Q.ReaderMG2.prototype.readNormals=function(n,t){n.readInt32();var e=n.readInt32(),i=new Q.InterleavedStream(t.normals,3);Q.decompress(n,e,i);var r=Q.calcSmoothNormals(t.indices,t.vertices);Q.restoreNormals(t.normals,r,this.MG2Header.normalPrecision)},Q.ReaderMG2.prototype.readUVMaps=function(n,t){for(var e=0;e<t.length;++e){n.readInt32(),t[e].name=n.readString(),t[e].filename=n.readString();var i=n.readFloat32(),r=n.readInt32(),s=new Q.InterleavedStream(t[e].uv,2);Q.decompress(n,r,s),Q.restoreMap(t[e].uv,2,i)}},Q.ReaderMG2.prototype.readAttrMaps=function(n,t){for(var e=0;e<t.length;++e){n.readInt32(),t[e].name=n.readString();var i=n.readFloat32(),r=n.readInt32(),s=new Q.InterleavedStream(t[e].attr,4);Q.decompress(n,r,s),Q.restoreMap(t[e].attr,4,i)}},Q.decompress=function(n,t,e){var i=n.offset;Za.decompress(n,n,e,e.data.length),n.offset=i+5+t},Q.restoreIndices=function(n,t){var e=3;for(t>0&&(n[2]+=n[0],n[1]+=n[0]);e<t;e+=3)n[e]+=n[e-3],n[e]===n[e-3]?n[e+1]+=n[e-2]:n[e+1]+=n[e],n[e+2]+=n[e]},Q.restoreGridIndices=function(n,t){for(var e=1;e<t;++e)n[e]+=n[e-1]},Q.restoreVertices=function(n,t,e,i){for(var r,s,a,o,c,l=new Uint32Array(n.buffer,n.byteOffset,n.length),h=t.divx,u=h*t.divy,f=2147483647,m=0,g=0,_=0,p=e.length;g<p;_+=3)a=r=e[g++],c=~~(a/u),a-=~~(c*u),o=~~(a/h),a-=~~(o*h),s=l[_],r===f&&(s+=m),n[_]=t.lowerBoundx+a*t.sizex+i*s,n[_+1]=t.lowerBoundy+o*t.sizey+i*l[_+1],n[_+2]=t.lowerBoundz+c*t.sizez+i*l[_+2],f=r,m=s},Q.restoreNormals=function(n,t,e){for(var i,r,s,a,o,c,l,h,u,f,m=new Uint32Array(n.buffer,n.byteOffset,n.length),g=0,_=n.length,p=3.141592653589793*.5;g<_;g+=3)i=m[g]*e,r=m[g+1],r===0?(n[g]=t[g]*i,n[g+1]=t[g+1]*i,n[g+2]=t[g+2]*i):(r<=4?s=(m[g+2]-2)*p:s=(m[g+2]*4/r-2)*p,r*=e*p,a=i*Math.sin(r),o=a*Math.cos(s),c=a*Math.sin(s),l=i*Math.cos(r),u=t[g+1],h=t[g]-t[g+2],f=Math.sqrt(2*u*u+h*h),f>1e-20&&(h/=f,u/=f),n[g]=t[g]*l+(t[g+1]*u-t[g+2]*h)*c-u*o,n[g+1]=t[g+1]*l-(t[g+2]+t[g])*u*c+h*o,n[g+2]=t[g+2]*l+(t[g]*h+t[g+1]*u)*c+u*o)},Q.restoreMap=function(n,t,e){for(var i,r,s=new Uint32Array(n.buffer,n.byteOffset,n.length),a=0,o,c=n.length;a<t;++a)for(i=0,o=a;o<c;o+=t)r=s[o],i+=r&1?-(r+1>>1):r>>1,n[o]=i*e},Q.calcSmoothNormals=function(n,t){var e=new Float32Array(t.length),i,r,s,a,o,c,l,h,u,f,m,g,_,p,d;for(p=0,d=n.length;p<d;)i=n[p++]*3,r=n[p++]*3,s=n[p++]*3,l=t[r]-t[i],f=t[s]-t[i],h=t[r+1]-t[i+1],m=t[s+1]-t[i+1],u=t[r+2]-t[i+2],g=t[s+2]-t[i+2],a=h*g-u*m,o=u*f-l*g,c=l*m-h*f,_=Math.sqrt(a*a+o*o+c*c),_>1e-10&&(a/=_,o/=_,c/=_),e[i]+=a,e[i+1]+=o,e[i+2]+=c,e[r]+=a,e[r+1]+=o,e[r+2]+=c,e[s]+=a,e[s+1]+=o,e[s+2]+=c;for(p=0,d=e.length;p<d;p+=3)_=Math.sqrt(e[p]*e[p]+e[p+1]*e[p+1]+e[p+2]*e[p+2]),_>1e-10&&(e[p]/=_,e[p+1]/=_,e[p+2]/=_);return e},Q.isLittleEndian=(function(){var n=new ArrayBuffer(2),t=new Uint8Array(n),e=new Uint16Array(n);return t[0]=1,e[0]===1})(),Q.InterleavedStream=function(n,t){this.data=new Uint8Array(n.buffer,n.byteOffset,n.byteLength),this.offset=Q.isLittleEndian?3:0,this.count=t*4,this.len=this.data.length},Q.InterleavedStream.prototype.writeByte=function(n){this.data[this.offset]=n,this.offset+=this.count,this.offset>=this.len&&(this.offset-=this.len-4,this.offset>=this.count&&(this.offset-=this.count+(Q.isLittleEndian?1:-1)))},Q.Stream=function(n){this.data=n,this.offset=0},Q.Stream.prototype.TWO_POW_MINUS23=Math.pow(2,-23),Q.Stream.prototype.TWO_POW_MINUS126=Math.pow(2,-126),Q.Stream.prototype.readByte=function(){return this.data.charCodeAt(this.offset++)&255},Q.Stream.prototype.readInt32=function(){var n=this.readByte();return n|=this.readByte()<<8,n|=this.readByte()<<16,n|this.readByte()<<24},Q.Stream.prototype.readFloat32=function(){var n=this.readByte();n+=this.readByte()<<8;var t=this.readByte(),e=this.readByte();n+=(t&127)<<16;var i=(e&127)<<1|(t&128)>>>7,r=e&128?-1:1;return i===255?n!==0?NaN:r*(1/0):i>0?r*(1+n*this.TWO_POW_MINUS23)*Math.pow(2,i-127):n!==0?r*n*this.TWO_POW_MINUS126:r*0},Q.Stream.prototype.readString=function(){var n=this.readInt32();return this.offset+=n,this.data.substr(this.offset-n,n)},Q.Stream.prototype.readArrayInt32=function(n){for(var t=0,e=n.length;t<e;)n[t++]=this.readInt32();return n},Q.Stream.prototype.readArrayFloat32=function(n){for(var t=0,e=n.length;t<e;)n[t++]=this.readFloat32();return n};function dm(n){let e="";for(let i=0;i<n.length;i+=32768){const r=Math.min(i+32768,n.length);e+=String.fromCharCode(...n.subarray(i,r))}return e}function fm(n){if(n.length<12)throw new Error("CTM data too short");const t=new Q.Stream(dm(n)),e=new Q.File(t),i=e.body.vertices,r=e.body.indices;if(!i?.length||!r?.length)throw new Error("CTM mesh is empty");return{positions:i,indices:r,normals:e.body.normals??null}}const pm=1364013892,mm=1,gm=2,_m=4;function Ja(n){if(n.byteLength<40)throw new Error("D3MQ: слишком короткий буфер");const t=new DataView(n.buffer,n.byteOffset,n.byteLength);if(t.getUint32(0,!0)!==pm)throw new Error("D3MQ: неверная сигнатура");const e=t.getUint8(4);if(e!==1&&e!==2)throw new Error(`D3MQ: версия ${String(e)}`);const i=t.getUint8(5),r=(i&mm)!==0,s=e>=2&&(i&gm)!==0,a=e>=2&&(i&_m)!==0,o=t.getUint32(8,!0),c=t.getUint32(12,!0),l=t.getFloat32(16,!0),h=t.getFloat32(20,!0),u=t.getFloat32(24,!0),f=t.getFloat32(28,!0),m=t.getFloat32(32,!0),g=t.getFloat32(36,!0),_=(f-l)/65535,p=(m-h)/65535,d=(g-u)/65535;let b=40;const y=new Float32Array(o*3);if(a){let w=0,R=0,A=0;const S={offset:b};for(let M=0;M<o;M+=1){w+=ur(n,S),R+=ur(n,S),A+=ur(n,S);const C=M*3;y[C]=l+w*_,y[C+1]=h+R*p,y[C+2]=u+A*d}b=S.offset}else for(let w=0;w<o;w+=1){const R=w*3;y[R]=l+t.getUint16(b,!0)*_,y[R+1]=h+t.getUint16(b+2,!0)*p,y[R+2]=u+t.getUint16(b+4,!0)*d,b+=6}const E=c*3,L=new Uint32Array(E);if(s){let w=0;const R={offset:b};for(let A=0;A<E;A+=1)w+=ur(n,R),L[A]=w>>>0}else if(r)for(let w=0;w<E;w+=1)L[w]=t.getUint32(b,!0),b+=4;else for(let w=0;w<E;w+=1)L[w]=t.getUint16(b,!0),b+=2;return{positions:y,indices:L}}function ur(n,t){let e=0,i=0;for(;t.offset<n.length;){const r=n[t.offset];if(t.offset+=1,e|=(r&127)<<i,(r&128)===0)break;i+=7}return e>>>1^-(e&1)}const vm=1111765828;function xm(n){return n.length<12?!1:n[0]===68&&n[1]===51&&n[2]===68&&n[3]===66}function Mm(n){const t=new DataView(n.buffer,n.byteOffset,n.byteLength);if(t.getUint32(0,!0)!==vm)throw new Error("D3DB: неверная сигнатура");const e=t.getUint32(4,!0);if(e!==1&&e!==2)throw new Error(`D3DB: версия ${String(e)}`);const i=t.getUint32(8,!0),r=12,s=r+i;if(s>n.byteLength)throw new Error("D3DB: json обрезан");const a=n.subarray(r,s);let o=s+3&-4;const c=[];if(o+4>n.byteLength)return{json:a,packs:c};const l=t.getInt32(o,!0);o+=4;for(let h=0;h<l&&!(o+4>n.byteLength);h+=1){const u=t.getInt32(o,!0);o+=4;const f=n.subarray(o,o+u);o+=u;let m=null;if(o+4<=n.byteLength){const p=t.getInt32(o,!0);o+=4,p>0&&(m=n.subarray(o,o+p),o+=p)}let g=null,_=null;if(e>=2){if(o+4<=n.byteLength){const p=t.getInt32(o,!0);o+=4,p>0&&(g=n.subarray(o,o+p),o+=p)}if(o+4<=n.byteLength){const p=t.getInt32(o,!0);o+=4,p>0&&(_=n.subarray(o,o+p),o+=p)}}c.push({pack:f,colors:m,image:g,uvs:_})}return{json:a,packs:c}}const Qa="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAD1SSURBVHhe7X0HVJNZt/Y79sGCIk066T2BhCQUuzPq2B177+OMYx2749h7770riti7oqiA2BERld4CCb03ETj/ek5e/P/rWve/8907M3e+73OvlUUgyZtkn332fvaz9z4wzBf5Il/ki3yRL/JFvsjnIpFI7JVKidbDw6O/p1z1k07ttVqn81qt0XjOUas9Jms0mi5KpbLl56/7Iv9NcXV1bSmVSn2VcuVcL43mtk6jifTV6xO81OrTWrXmiK9ed8nHW3dQq9Uc8fHxDtV5ad976/XvtBrNEYlEIvn8el/kd4hWy2shlUo7ajw912o0nnf1Wu0rrZf2fjsfv9U+Op/v9Z6ecoZhmjEM05hhmPoMwzRgGKYFbjwez6ZdO5+2fj7ee/Ve6khPT9Vm9jlf5L8SDofjIhaL+3qpPc/pddpX3jptkF6vWaFTq/0YhrFjld6aYRhhu3adeg0ZMmTQggVLBv30089jhg8fNdTHx0fDMIyIXQzG11er9/HWPdBr9XPc3d3lIpHoW6VcPsdDKfvZQ6kcoVQqO3pKpVwbGxtc999XxB5iV4lEOFClUOzTeHi89FJ7HlIqlb4Mw7RiGKYJwzCCQYMGfb9z5+6V12/cuvb6dXS0yZSZZ0jLqDRmZJJMUw4pyC+sTEtNNz1//vL2ug0bfsJGYhjGwtPTk9ulc6fI9u3a3fLx9jnlrdef8dbrL+m02qu+Pj4P/Xy87/vo9c/0Xl6BerXHTK1K9e/jttRqdUOhUOijUMj2ab08r+h0XuvUSnUHVukOGo2u94kTp9ZFRr55nJ2VW0ZYqakkJC8zn8RFx5MX4REk8sUb8vZ1LMnOyDM/Xl1LwsOfXHdzc+pqZWXl2KZNGwuFQmHraumK4Ax31Qg/5XJ5qy5dfF3at/fr0t7PZ62P1ut8Oz+fTOw8jUYzVqVS2Xz+mf9lRMnnOypkksUeHspbHh6KQA8PeTtW8XYjR44cduHC5QsZRlNBndJN6Tkk6GZw2Y4tO9Nm/jzr2eABQ/d079JjW+cO35xt59Nhi593u3NjRo6P3rPjYI4xJZu+5lXEq4gGDRp4sy6JZ2FhoZTJZN46nU5n6+SEOMJhGMYJO6Xuc/n4+Ag7tPOb1ta3bZi3TvfCQ6lc+i+3EHKRyFMhk63w9PR45uWpHMMwDCzTslOnbwbevHH7jDHDVAEFlpdUkqePnlVu2bA1YWC/wRsd27SZxDDMIIZhujaysOhubW39HS7HMIybtXVLLKCiYb16E8eOHP848kW0eRFevQm/ezf42Pv3MY/DHoa9jY56a0hLNZjevY1JeP78xbOQkJDLp08HbJw6dfo4K6sWcFtN2Y/ZoHN73w6+3toHPjpdkqdKBbeG3fPPK4QwX4nF4rYKmeSAUqm8LBQKETSbNG3atMOxYyd2Z2SYiqG0yrIP5PbV23lTJk3xd3V0hUtSMQyjd3Z29hMKhV1FIlEPXEcgEHi5ubm14/P5XRDAhUKhg6urq55hmD7dv+195PnT13UbiEpFUSUxpmTRW9y7RJKVnmN+oJqQnOw8Eh8fH3PvXvCBGTNmfMsGfUgDnUYzyUevjdB5aYI9PT07fva1/klk4MD6crm4s0IhvaBUypeyyVLLvn2/HxESEv6+TklPQx+Xzp42+2R9hsEX9bGzs9MKhUI5l8v1hvKFQi4W4Bs7OztbWKutrS3Hzc1Nx+fzlTwe7xuBQODH4XA09RvVH9Cre/+9p08Elp4/c+HDuuXr3k/7acbl0SPGhowbNeH6+FE/XFy5ZF30lvU7Ui6dvUreRr4nBTnFpDCvhKQbTB+eP3l+9ddflwxjXRQzYMCAr/18fde3betb6KXxXOfq6gp3+U8j9WQyWV+5XH5cIhEtYLeyZP7chYvTUg0lUHxeZg7ZvXnnU6E7rxfDMJ42NjY8kUikFgqFvbhcrk+LFi24DMPYMwzTkL3mVwzDWDMM48IwjBXcEMMw8NWt7ezspBKJROvoaD+qVatWgxs3bjimHsMMxi5iGKaD3lc/rH//Pl0ZhuE3bFhvtFgoXN27e++AmVNm39uyYWdZxLM3pLaKEJMxi4SFhl8cPnw4dgTNrn19tUpvrfaJj077UKfT8f/j1/wbSvv27Rt4KBT9pWLpPpFI9DOLQDzXr99wyJBupFYf/iCscuLo8UvxdNs2tt9IJJJusGhYMsMwzvjyYoXC48Cho2NDQh7tCQ0NvxYTExv+OjLKFPM+Lv3du5iEyMioh0FB93Zs376rB/saYPvmbdq0cXFxcfERCASdPD09ezRv1dzn4rlLb86fu3B/ya9Lent6evZr08bFk2EYR+w4hmGG9+71/d7tW/bkpiaZP19aSlrJqVOntyGQs9+pmY+Pfheybi8PDwT5v69oVBoflUKxUywWL2Qt3+vAgcMX6lzOxdPnn0r4oqFApXw+X8e6kU6wTlj4zJlzta9evdqalJScW1lRSUgtobfajzWksrySVFV+IFUVVXWXIxXlFSQ2Ns54/uLFPT169FNi9zVq1EiABcVOgis7H3j51onjp8L8TwYkX7108x4Su8WLl/U7fPjo9O7du+O9NZbNm48b9P2wmyePna7ISDESUkPI69evH33//fd9GIb5Gt/NV6ud4aPTvfFUKv+ecQHEmUwmWyCTyfbzeDxAQdmePfvP19QSUvOxhpw4eOQJwzDtLCwtPcVcsZTH4+ldXV3FsODvvuutexHx+lBWZnYlqaklBbl5xJiWTtJTUkl6qoFkpKaTtKQUkpaSQowZRpKeZiBZJhPJMmWS6qqPdDEMBkPVjRs3/DUaDeBmYwcHB6FEIhm9dvX6kB3b98TcvH47cdeOXTemT/+l/+lTZ6oO7T9SffTIqRBHR0cdu4tUzSyaLR4zYuLrRyHP6DUz0jPyN2/eDDQGd8i09/Mb6KvXJWg9PeGm/j6i1+u/lkiEY5RK5W6xmANr5qxevf5ABayYELJ3287LDMNwW7du7QUUIxQKO9jb23vBp1+4cHlBusFY9vFDFSnIySPpqWkkNTmFpCQkktTEZJKWkkqS4hJIYmw8SU9LIxlpBvqclHg8nkQyDOkkOzOLVJZTNEsS4hMLdu/YC6UxTu5OXm4ct53Ll66MvXn1dkWvHj0Wr12z/vL+vQeL/E+efXdo/9GPWzdv33Lo0PEpp06d/lnn56dgGKZvxw6dQ48ePFUNxFRYUEQOHTgElynANX19df299TqTVqvF7vlbyFcCgcBXLpdvA2SEPx4zZtzmjIxMqpCTR44Gwd86Obm1F4vFFMFYWVlpLS0t1XfvBAeVl1eQitJykpaUSjJS00iW0UTSkpJJQlwcSYpNIGmJWIB4kmEwEENqGol//56kJCSRtOQUYjSkk8wMEzEaDHRh8Dfqpj5+JAGBgVvw4cQKsUdbve/4ju07LsNGnTp1+uFtW3flnzh6smrPrv05Rw6dSL157XbO0iUrU2ZMm7EaAb5x48bd7O3tt6xeuT4lN7OIVH34SA4fPrq9Li5467yWab3Uid7e3uCi/neFJdV+lUgkM5FgeXnpJz95/IyinTvXbr5o1qiRqE2bNp58Pl/l7u7u1bBhQ3mrVq28g4NDkvCcnMwcYkzPIKb0DGrRUGJqUjJJjIsnhuRUkpqQTFISk6jVp6em092QAfeEnZCSSndKcnwCMeB1iUnURRUWmJPqe/cenAU7am1tLbC1tVVwOBy+lVWLb0cOG3V22uQpj4YNGbLq/NmLKRfOX47Zs2d/4u7d+05s3boPZKBNw4YNPVq0bLng5ymz3hnTTKSqsops3bp9E8Mw7vjeOi/1Th9vfahEIvnfI/eAj/l8fg+JRLJFKBS6tWrVSnbrZlAcvvybFxHpvhpd90aNGvG5XC5PKpXCb4rFYnnbly9ev6qtIdR1ZKSlUeWZMjJIZoaRKh4Kh5UnJyaStORkuijJ8YnEaMggpgwjdTsJMbEk/n0M/YnHccNj6SlpxJCUQnKzzBRFWNij81iEZs2aWeNz8PlKICCQcGqmAaPXa/UzFs7/9d6JoyciD+4/lHbG/1zS8uVr5syfPx9gwcaiceMxY4aPS0+MTSW5Oflk9uy5ixiGQV7CaNVeQXqtHojpf0d4PJ5EJBCs5HK5QAbWs2fN21ZR/oFkZRjJT+Mn/gi62JXH8+ByueqmTRsqdDrf7iEPH2VWf6gh2Zk5xJRupJYPS4ZS4VIMKak0BsANweXA0s0uKIMkxScQk9FE0tPSqeXjhucnJySStMRkEhv9jsYMuCPcCvPNO+HGjdvXkIW3bt3aAciIw+H4cjgcGbLrxo0bf6NSqX7cvXNvWdDt4OLT/gHxe3bvMwWcDnwzefI0GTZ5vXr1fpg5bW5sflYhiY9NKB8wYPBI5CjIXbRe2ihvb++en+vmTxc7O7umYoF4sEgkmtW6NdO8XbuOvaOi3pZ8rPxAjuzZfwLQksvlSvGFW7duLbK2buMZHvo0pbaqmloqFiAnK5dkG010J8DFmNhFwA0KRBA2pBoo+klKSKI7I+7de7o46fD7hnTqfpITk0hyQhK1fiwSdWkZRrqA+bm5dBGuXr16AIkbsmdAXxgFsm0ej9eLz+dPW7l0ZeTaNRvC16zZcOu0f8Djyxevpyz9bfki7GDYWrNmzSauWbExtfYjdlV4nI2NDfIIRqVS/Kjz8nr0l5dGXVxc3CUSyRKhUNgbgXfnjj238UVfhD/OsmpupXN2d28LDsfJzETa3w168KCipJzkmLJJpjGTKhxWDbcDZVHrZ9EPhZ+wYkM6SU1KIQmx8SQ1OZUqNOF9DLV43K97bmJcHDGw6AiLkxiDmJBKFyIlKfnTTti+fftcmuiJxV34fH5/WLBAIOjMFQp7N2rUCFl5R3t7+x+PHD4ec/rU2Zc3rt4kc+cumLtyzZpRgNVubpyV/icCKbQ7ceLkLTYzr6fTej3SajXjPtfRnyZOTk5fi8Xi70Qi0WIXF5c2arV21LNnEVXVVVVky7oN8xCMuVxuVz6fD9bS9tSpgMAP5VUk25RJck1ZJDczlxjTjTTYQtFQEoWXrLsB5DSkmP06hZopBhIfE0cSYmOpy4JyUxISqPKxaHShEpMockJugAWibg35gtFEf5aXl5P09PTqPn36gPBzFwqF3yMZZAk+rUgk8haLxR5WVlZ6qVQ6PvDMucorl67VHD183LRvz8EzI0aMGA9qo0fX3idSkzJIUWFx7aRJEwB3G6tUsu90Ws1NNgf580UkcmkjEAjG4wZl79i+5+aHyiryNDQ8sxHDiMHPINGChcyePX+20ZCJKhbJyjCRzPQMkm1EZSuTKsaUYVYQFEeDaVIKVWBibBxJS04lSYlmlIPFgnuh6IhFP0bsEnYnUHRkyKDXQL6QaTSaFyclle4yLC4kIiIiyc7OTubo6NhRIBD0Bf+EXezi4uLp7u6uQNGoSZMmfh3bd9y4f8/B1F8XLl38y6w5x84FXjJyudxuLVu02Lh86Wp6sQf3H7yoI/D0Wq8bWq1m9ue6+jPkK1dXe7FAIJiCTFYolPqEhT4pr6mqIYf2HABCgJ/t5uTk1K5BgyZ+QXceGspLKqjFw+fD/UCBUAhcBDLd7MxskgSrB5JJz6ALAIVDmRSCpqTRgA0XA6XTGJCSSu9jx+AGhGQwpNMFwvOxK/D8nMwsurjmuJNFF+Ho0WM7GYaBEXWXSCS9sRPqblwu11MgEAyyaGHRbfiQ4eNOnTz95sK5y0X79uw/wzCMFDUJT5Vmx/PHESQ/N796vBlsNPH09Bzk5aU5plarQRr+eSIUCptDwTweD9bf6tdfl+yH9b99HV3Jc3X1aNKqiQvwfvPmjYSzps8bk2HIJLlQfIaRKiLLlPUpyBphqbBO+G7WcuvyAcBLLBQCsyEZUNWcqFFrR1acYs6YEYBxP9Nooq6MLgDcGnICQzq9Hn7CFRlTDaSirIzEx8WXyGSy9s7Ozlw+n9/Pzc1N6e7uLhCJRHoej+eBOgOCtKOjY6cFcxfsOx94Oeb82Qtxt27cvnb+7OWpDMOMXDB38Qss5q3rt5/BKbRRq1GTvqTX6/t9rrM/VOzs7NzEYvFklnBzCDh9LhQf5M61m7eB85EVA97BNZ09e/nhxw8fqXIAH+toBEMqYCcWIJ3uArMLMn2iIXCDsrELkB/gcQRdPD+VzYJNBgTYJLpraBIGpAREFI9EzQxDcQ3qhtjdBniMG+TixYsrgG7c3d3bwurRSYGk0t3d3Q7xAEbm5uYmBAWxY+uuyEsXriTduRlUsmDBovGWlpadNJ5e/q9evCFFRUUfR48eC2NsoFKp5mu12hVLliyp97ne/ij5CvhZJBINcXd376Xx9vZ6EBxSWFZSRjat3TStYcOGKgS0xo0Z3tCho4fEvI0judlZJCc7h/rzOl9PMX86i4AMJpJtyqIWCn4Hi1AHS+vyABqI2UWgiRj+lmxGRzQ+AIbGJ5LE+HiaB8BdxcfE0oXH++CGa9KcI81AaqprSHR0dCTDMJ34fH5bZOkwGqlUCq5KixuYWpFI5GllZdVi5LCRw65cum4If/S07ODBw1saNWoksbCwGLdj2950LObp0wHguqw9FIpuak/PEyAmP1fcHyJgOfFBhULh5GbNmkmmT/9lTlZmDkmMSygV8Xh6e3t7Mfwodsaxo/7nKsoqSV5OHqUO4EKgBARg+G4oHPHAlG7eGXhORlrGp/iAHQOXAmoBSqeWbUinf6NkHc2WzckaLB/WDuUDLcW9i/m0gOYkzkxd4H3ycvNIQV4+yc7Krh06dOjYpk2byrhcbgeJROKHwg4bCzhAechhsDhwtQf3HQl5/OgZOXjgyDMLCwv8zW3IwOFniwpKyZuot+ktW7ZUcLlOPKVScUmlUnX5XHd/iDg5OVnBOiQS0UognHVrtlyDBTwNewI/2Abb2MbJhmdn59jpUeizovLiMuo2YOlmazSSjFQDdS1QGCwSCZYBdERKKpTCYv8k6irM/A+QkpE+BkvH8/CcuhvcEfx+LBI0dmEy0hGAzfAW70tdIFxQZqY5FhlN1A0dPHh4I8MwHjAqLADrPjvD+sEb1VXoYPH9+va7v2fn/pqb1++krl27cQmYCMc2jhNv3wyuKi4uIRN++GEiPISHh/KoUqmc8bnu/ihphORKLBaDWZQePeKfCK7//NlzR2ERgHCIA9Onz56VnJBWk2PMokE0Jwucj4EYUhADzJaIv4MHqnM3cFM0IQPOh5KxIKZMkp5sRjRQ3ifkxCIcE6BmSirNjgFbcb/udzxe5+7wfsi4oXwsYk5WNqmtqSWRryJPwXB4PF5PsVjcji2L+qA6h846gUCgcHFx4bi6unbs0KFDnw3rN5+9dOFqasCZcyFff/01YHa/fXsORdDF3H9wN4o3MplsrFwuXySRSFAN/GMF/tDFxUXi6ur6na2tQ5erV28X1NbWkiN7Dy2GD0RBvXHjxu5HD5+8i8QL1gjLrUM2UMonv8wiFCg9NzfP/HeaUCWT3OwcugOwS6AsvC4lPoE+BwuGXAEuypiRQYNyeoqBJIIngoLZ5I3SGnVxw2gkeTm59HH8xDVR9Tp/7iJwPJoAfLAACMZAQuxCdORwOJ2xI1hQ4bBp06bfAgPOvz/tHxDWoEED34YNGfmsaXOufaysJmFhYW9Q2PH09FSr1eqT6Fv9XH9/hNQH5+/m5jxKo/Pt/iT8JUEhZdWKFUABLUFPIMkJuv0guTC/iOTnFVC3AGum1DHlbBIpjqd4PjnFbKVpBmqdgJhQfn4u4obZ2oGCwAVhN0CpeA0N3qAZ4L4opQH8H0djAeIAKmo0JtTVDNjqGa6LGxbxQ2UFefHipQkQ0tHREfCzPTgiWD2UL5fL2yEfwALw+fzvbGxslIMGDNr89MmLwqA798KGDx81AmioU4dvN8e8i6tNiE/IR+uNkMPRKOXyqyKRCETeHy8ymWyym5vLtM6dvx0e+epNDRKdyePGgQ+ys7W1lctkHt4h98OLSgpLqGVC0XXJU50Px2J8cjepQC3mekBuZhYxUHxvLsxQ6EoRkxHlQTN/xC4WMmq8BtYM60eQhrLxPkkJiebXZZgREBaubvfglmU0kuKiYtATNUFBQUBD9q6urkBCvgi6YHc9PDy8EZRxXygUDnNzc+ut0+hGnDkdEI9dcOjAkQ0NGjTwE4kkMyNevK4wGbOqBw4cOPTrr792VCkUJ0FrfK67P0K+lkqli9A01alTlxnRb95XQgGzZ8zwbdq0qRQwdODA4UNfv4ymnA8wuJEGUsDJumTKQBUHRdLMlrVg+PfiwmJy8ujxtJD7YR+waFAaFA+6ApaN37FD8J64n8Vm0ligOiobOwJBnT5uMiu9brHrdgHIOVAjSBAhx44dQyXMRSKRjEG5FP6fXQgsQje4JLFc3N3FxaXH6hVr3wYFBVevXLlmjLW1taeFhUX3W9eDCqqra8iCBQtQlGoulUq3y2Sibz5X3n9LWrVqRYk1Dw/FOI3Gc5tYLNxkb28vGTRo+AxDakaNMS2jdvzIMWgbBBHFnTlz/rT4mCRiTDPjfHNh3Zx4JcclsBUtc1Ck2SmrOFh7eWk5mT9nTuS1K9dLivLzP2XPda4IisTzKKphGVQ8B4/D8hE3sLh4HIuEG1yXOQPPpL+Xl5STiOevyfo1W0uDbt2vRSwoKSkhv/wyr4ODgwNqF12BfkBbIxuG+2Fdk5+1tbV6/ryFB0/7B7y8eO7yS0tLS079+vV7nDtzgeYD69atQyC2UilVmxQKKWoG/z3hcDiWsASxWLhQrfY46e2tO6VUyg95eHj0srW1hKKtO3f+9sf4mMTq/MxcMmn8+BFohoUV/fLL/DUpCQZKH9RZdl3AhaIpWmEzVPhoaqE0YKaTyooK8tvixY8fBoeWFeUX0KoWAiiUTeEkUBF2DYuEzJZt5v1xDYp06hI8lvvBDW4S10Lh/t6de8XeOu91lpaWK2ZOn/Ni2ZKVKVcv36jYtWvPbOQ2IBERD8Ri8SBQFICkQqFwAEckkllaWnZcuXzl/vPnLr7bvWtvIJhTMKsnj50JwQLs27f/MHaAXCxdJpVKBw8cOPAfGxYBdHJycnJUymQ/e3lpHms0nge1WnVftVoN3ht9PrZSqVS5Y8e+VQnxSdno2SkpKiHrlq/u3bhxY3SruY4f/+PcmOj42rzsPBpUaZIFZdWhEtZNYGeA06GF+AwjteCignyyaOH8ExcCr2QU5hWS7Cyz+4DbgdIRxM0B1UQLMnU7o6iwiBTkFdICPoJ/QV4ByTKarT43J4e+Hm4nNzOndua0mWgY85QpZT0aNGjQHt0mrVu3niyTyVaAA2JzAV+4ISAimUwmwtgUj8f73tXVdciA/gNW9ezZD6wn4kX/Rgwj2bBucyQWwN8/AAtgIxQKZ4tEIlTJ/jFKQqFQyDQajxEajeaAQqFAcboemmDRyTBn1sIJW7fsvnT2zJWC99GJJDEujVy9fLNi7+69F/v27csFR4Sd0aFDp+nPn0XUgF4A+QXFptUFXyg+OdWMglh8jvt1MDUvO6d22LAhe3ft3J9cmF/IupNM6qroroGlm9A1YWZCiwqKSEpiGgm6FVyxb+9hw8zps8mSX5el7N6+LzPy5RtadSssKKR+v7KsHFDxLWrBAoGgD4fD6QdIDQoaSAecDyp4aJuRyWQKLAaHw+mOvIfliBSIBy1btmyPTNjV1dUDBB4SuW2bdoSVl5WTvXv3HYQhKpXKXdDZ5/r9LwVElFKpdMRqA4YB03I4HNuePXvPWbFs7dtL52+SAP8LpRvXbr8yYtioTba2tn3Rj89Wx/zgEzt16jbg4YMntPJFAylKg2ylCz/rAjJ+pxAVik1JpW6iuKi4dtKECbP27j3yABQ2Wk5ysrPpIuHxvNx8WqwxpRpIVkYmuXLxeub4MZOC+HzhVEtLy4HW1q1QIFHUq1dvXL8+A4OfP4moqSgvJ4X5+aSirJxs2LABNDS6qzVQKizdycmp2/Dhwzvcvh00x9XV1Y3P54sBQ8EDCc2iAUPK4XD88BiLlOg1WJqCd/yofwjaazZs2PQbFkChUKzS6/Wb1B7qpTweD32u/7hoNJruKpUKRZfBo0aOe3zy+LnclEQDiX4TlbJly0bATipI2YGdBQKByNnZXuPs7Nb74vlrefnZBSQlMfkTzqdMZ2IS5WZoxYoWY4wkncXquTm56IL4oNFoeq9ZszG4ML+YTZpyqO9HgQXPyzZmkRxTLjntf9bQpEkzuBC1g4MN+kG72djY2OPzODg4+NRrUO/HyxeuF5cVl5KPVVXk1atXDxCjQJdAcfD1uN+sWTPR5EmT59wPDknDLnB1dfVG8AX8xHNggFKpFBxXOywEdgESMwRlFxcXNGeJ7t55EPOxqpoMHz4K8wzCpk2b2rVv317v5+NzTOvlle2h9FiGCdD/qOH/RFBudHBwwHAcpJGnp+d0kUi0burPMy9fvniDJMWDJk4jL549OztiwADaqOTq6oq2xO9EIh4UItixbW8YfDGy2qQ4c3mQJlSJKSQxxsxY1vE44IWM6WZ2tLiwiEyb9vMyrZfP+ajXbymRB6WDykCJMj8b2Ww22bxhx4kWrVp1hfVKJBLARSkUJ5fLwePoUSaFb5829Zd4LCTYzzdv3oTis7EWDb6/D6wc7mTJr8u2v4qITGvVqqnMxcUFHRMa5AUoOMH14D52BVsjUMCqAVGbNGni6u7O7wJUBUmIT4hYs27ddHwWZM7QTXu/9l30Xjp/vVYb4+GhRE0and7/f0EwRh8++0W+UqlU3/AEvMUqper4nFm/JoU8fEbKiivJ26jogiuXzo/FaywsLOzZLSmdN3fR9YJc8wJkZpj5nKSYOIrn0VxFs1d2V2AXmNsQk8jHjx/JGf+TaGnve+JoQGleTj7JMpk5/NLCYvLsyfPMUaPGLWcYBn5Zg9lgmUAgcnNzc8UOBFGI++zMsHLixCm7M41ZpKigkHyo/ACcPgKKAWWCPiaVSvVd/fr1e+7atvdI+KOniA9OXK6zlHUzOvh4d3d3rbOzsxTgBPUBmUwG14Nubhe0t6jV2plbNu5MfRr+ki4C6h8J8UmpgYGB23U6HTwFneJs1853kF7nFaFRKVb+Lp4IQ3Xg/gFH8btAoHAXi4VzODy3HX16Dzi7f+/xGsxy1XysJY/DHx8HdMXzrK0tPdu27bgyLORZTWlxGckC2cbGgjo3BIVDqTksvVDXFwQYevnyZRR2vBbMX3YoP7eQPl6Qm0+iI99WDh4wGCVPiUgkGg2XgMobqGS4QFgkFAarhQVaWlqq1q5evzU/N58SeZDQ0FD0BwHNWXG53L5cLndQ48b1O+/YvOPG68goI1wU3BcsHu6GbVvpiYCLRcP1WToe4iASifqhToxRKo2n153lS1fFPnr4mI5bQS9paYZcf/+AHVqtFnD1a29vb1e1p8crhULx+7NkiUSCYNUdAZrH4zVWqVQDXV2dF6jVXod/W7wy6+lj8/aLi42NP3DggNrS0hLjpup9e4/EQ4Ho68nNzv7UdkJruAmJn+iHT7SEwUDKikvIk8dPLoDWGDRg2NrYd/GkIDuXvI16k9e+fceVSP0RCOHuwFrC6qEQuBRYJRImuCQws+fOnttfXFhUDQQEmFpcVEQ/5/17D8OGDRvWCi6lefPmwoYNGw6ZP2f+o49VH8nu3btBI7vhmnK5fBh6WdnMeDSujffm8/mOuKHLzuz+pM5wa9bWrZCMjnJu47xzyqTp2VEv35JMQyapLK0i8+Ys3k9tWCDoLJWKl4nNNZPfLyjEIPjgA+F3rKBcLp/r4Oy8aOCA4RHXrwbRL/cmKjqKbWQSzJ497/DD4EckJRGEGxIks8Vnm0wk9l1s7ZvXMSQzI4vkZ+fR3QF0g8bagIAAWHnjaVNnrchIM5Ka6mry7OmzQJB9SJBYJAJIOBRugvb1cLlqZ2dnzIypkCyNGjWq46OQx8Wo1KH4UphXQBHV+jUbDZMmTo5bvnw57Z5WSaWAih2OHDxyC58/NjY208PDAxQ0cgHUvRErpGy50hcZMmApPgeYUycnJx7cLtwRO8HDmzFjxvzQBw+MyJFKi8vJucBzb7p27TpBIBBMQN4g5fPFUjO7+o8L6zt7YUHoNIyHx1Q3N5ff2rXruCcs9AVJSUqp7ta5sweqTH5+fksO7DtUFPH8dTUoAIposrNJaVExiYyIKB40YOj5lSs2xEdGvCOpSaAmskn8+1hD584dMatld/vWvSBkrmUlJeRd9Ls4T09PubOzswaKQZIjl8vbsgUTT3t7e1e2m0FhaWnZ5bvvel6+cyuYIJdAo25ZUTF5/vQZSLeB6CA5evTYndCQkKg3r6Oyo99EP8jJyqnKzzPPHZ89ew7HHTjjWihXYtQV7ohtWekIRARICneE90SXNwxu5LBhA58/eX6XXgRFqscvy6ZNnekP2MvjcWZIpVLozYbn6qr/HzX0SiQSK2SJwMwI0CIR71sOh7dyx7YDJVUVH8mlC+fmIyDb2dkhdnRfv277i7LSCpqZonUkLyeHVFdXk4S42GBPleePPJ5k3sQJP769dOE6WblsxWlzoiTpdO/uw/yy0jLqviD+J06g8wxFn95gKVG/hY9GZwOaq2ChbDZu07l9l3UpiamfiDcE4X179q1ljzawXrxwaSg4oNIi2sRN0Re6NaiLuv/wECwZNAQCPXYA6+aQC8jwE+4HLgmIqH/v/l2uX75yC601kCxTDtm9c+8jkUA0oWnTplN4AsFPiBfYpQIud1BdrPyfylcoT+IO0ISLi9PUqVPnPCsrqSLRkVHB+JL4kA0bMlK1Wrfq6uXb1fnZ+TQrRVaL3QDJzMzMDQgIQBfyIAcHh9murs7LuFzuQpVKPepe0MNKZLpQIlxTWFjYQZQB+Xz+RLgBlUo1DL4XC8HhcOB/W44fP54q5taNO/fwGlg1lB8V+bpEq9UOAHtJ8wQ7uzm7d+zPBDFXVFBA8nNyKaUCGnzcuHHjGjZsKEPghWtBAzLeg8X+nVEPQVxwdaUjteKwB2GUhigqKCGnTwe+GTRgyPqGDRuO5XK5U0DbIF6IBeI+bJfgP0ZN/B5p3VrYnMfjLf7mm25X7wc/qjKmmyp6de0qtbBoiTdviy0/dszku2kpRqoMKD8fRZecXFL98SOprakh5wMD17ATkchA0cb+7bEjJzMqyipogEY2m5iYmIvd0aZNG1SrNKAL2L5UlEGtQ0NDxwWcCbi6ZeOW50UFxdTnmxevklw4f/5KvXr1xqDCBUvERv5h0s+nkSO8fhVFnj+LIKmJGeRC4NUrKHkAScHagaxcXV1FcD34Llg8lhfq2diysbu32nsgGgnKyirI3LmLjiGecLnctUqlcoSDg6i1TCjUsA3MgPN/mnwlFPLG8Xi8344fC6hC3/+lwEDw4q3gN9HyZ2dnt2z/3uN5HytraXIF5edlm0myspJSUv2xmsTFxhknTZgwGVBQq9UOfPXydUkx3TFmShoSFBS0h31PpZWN1fdQ/KJFi4a/i34XUFNTQ9LS0kpM6Rm1CLpwKVjw9DTDx+HDh8+xtbVFL1MffB64mEULFi/ctWNvJI8rWt+9a88LgwcPP21nZ9eDx3Nrj4XicDhAPTrW3VIKguWNfNlr2MybMW81Pld8fMIHsVj6I4/HWyWVSufgA/Ld3GCAQGR/niAQYwHc3WkfzfxZsxaE5+YUkndR0WHomEYSw5JSvJ49+wWcOHY2PzsrlxSwXH9pIci0dJIYn2p2SSZT5Z3bd0Lev40pLSkqplx+XfGlqLCQVFZWkufPnz9YunTp9D59+ny3a8euzSDcSHUt9fWIGeCMUKSBu/tQUUkiX716YW1tPZjL5Q4GAYeZ5AYNmHbr16wPTjekp0gkAuB4uAeZO98dgV2DG3YALB4ddOxguAR/xyI485zB76j9j52+iM99905wopWVlU4qlS4XCATuYAb+quFuugA8ntzJzc1lU9euPbY/uP+IFObkkw0rlnQAJyIQcPzAsuIDu7hwZwfdeVgDC4WCn4U/LRs5bOyd9eu2Z6K/htRiLpVQRYJ2NvP9oCKyKX0BlwIpLSklRqOpuqy0lO6kgrw8UlZcTINqESpd2Tm0DlD1oYoEBgaeRPBly4wjJkyYgP5OweQfpgTduX0vFI3E6AFCiyLL/SPTxdEIyH2A3fFaxA56dALiAeBus2bNfMNDH9PzD7Zt2w334yISCWYJBBxfzE58rqg/U1B0qC8U8oYJxdLlWzftMiIgPQ0PR9bJoMkJXwapI/z1ogXLX+JxZL3r168HMnHg8QR79+4+XJFlzCXZpmyKSoCW6ron4IIQO+p6fBCcUb7EwmB+GK+7d+cB2bv7QO3DuyHVKOZg8bAAZ86c2dykSRMfCwuLbucDL5xZu3YdGFHhmhVrdm3bsgO0hxtaT2DlUDxbDaNkG1AQEj6pVNoBO4B1Sd6WVpZdRg4ZPg6fISU5tar7t91HtWxJY95ELNrvohr+QKHkEoIin89f8/33gy+Ehz2rLS0uIWtXrsQRAU1YTkXesmVLuUgkmXf+3OUPsJzg27enAEm0adMGvnnT6FFjz8+b8+vT6NcxJC87n8aHT/VctiIGpdMeT6OJoPPu7p2HOcOGjvZv0aLVPDcXt6lPwp/kAwFhobCjnjx5gkEKkGNd161a9+TKpSuPv+nceXFaaqrp7LlzY7A44JBYKkPBDm2gaxqURx0rCuhJKQpwTYhvWzZuoQMpIQ9DY+gcnEAwiM/nj2ZrBH+5AF59JRTyx8jl8t27dh4s/VhVS6KjooxWVlbon2/KbmG5hUVDpV6r37hy5brw5UuWj8H0IqzM2tEaGbS9pZXluM6duj44fOD4h/ycAlJSWEQL83VuBXwS6sUlhaXk+DH/9yKRZBaS2pj3MTvKy8qy8Ly6/h+4uZzc3Npbt24d2LNr19wH94JNcFto5IVcu3YdqKcVyDYEV7ZLGpkuKmHfADqyjGhb8E7IfOFWHRwcujwOe1JO3c/WXXstLRtzeDzeZAGyZXN+9NdKXcAB5sXUTI8efQ9fvniTHjPw5HH4XXbcv4VUKsTxAepGjRrBHXk3b9WcUsjY7mIxaBY+iDRV69ath3O5/D2bN24vzM7MI+VIyFDbNWWRyrJKEnz3YfFvv664Y21tDUrBa96chXvLSj8QcP/glGg92JRF68llZZ8O3yLlJWU0joCeAO+UmJCY0bJly7Y4pQUuiFU+FzQ1biz3QzNfMKEshHVcOHf+MnBLMe/jK3t27/k9BtAFAsFcBO4/Bev/TqEFaKVSOcjJyXHTqBHjQl8+Nx+k9Djs0U2FQEDna+3t7W3wJR0dHZ2QrMHPwrqgeMBEZ2cbIIwmFhYN1W5ubptnTJtdGPrwSW1CfAr8LdmyafsVoUC8g2GY79q0aYPMFrd+J46dNpUUFFPqAQrGzADtxGNZWGTi5jkC87QMrTNk59bOmTNvQoMGDeCC0AEBQs8d/r6uYoZFwd/oLrW2hntxCw4Kpj3up08HhMP7Ii/AbvlvlSH/QMHKNwCNrVKpVgoEgvVTp85+9ij0OcH0THRkZP6RfQeB3SFf4wuy5wJ1YJlNwES/H374gX/x4hU8D7vG3tHRfoRMJjs4bNjwyN69+z1q2rTprDZtbLqCBm7RooVm5syZ3QIC/EcMGzzyLLh/IKK6/h9ajWOn79GPhBEp0Nv4e2F+Qc2l81fJoQPHMCeAQg1OWsToKog4BdwNaxyU6gYkRcfDrOmzZn2o+EBMxkwyZMiIudbWlmjunckmbX9OW/rvFZTv2rRpY63X661UKtUOa2ur8XNmL3r2LjqRVJZXE7CTTx4/Clg4ZyGOpgGERZnOFlsX1gOqQKvWz42NSSBRUa9vDe7TB4dotBKJROhGRjHFBaSWQqH4nuV+OvbtO2Anzvp5EHw/wZCSVktrxzk5NB+g/UHZ2SQnM5vCVSxAwvuY2oK8IpKakkGWLV3x2N3dfQDbFSeqqwOzLrEPm/VKwLTiQEAsVHhYOB1EP3vmQhwqt3RWjkMhqxbG97lO/mqpB8WA9cOQglwu345R1qFDRwecDbj88f3beFJTVUvrAS9fvLzkf8J/XNeuXYHLQXmjzNfH0tJq/MUL1ykzFvUqMrtl06Y4QKPDmjVrZr549mwB6r4YDkGgtLOz08lk8tNRke9pvEEyVtf7iT4gGrhZCIsuuOwMLEZO9e7d+9P37jn4cejQwdu7deuGkqMH4CWuiZ0A1AOXAsXDNaHpABT5quWrNtRW19KJ+dEjx85HEwKXy53Exgdanv07CBp40drniBMIJRLJFDc3t7noFJg2bfaTa1eDSF5OEVUYOuEyM0wV5wMDZ8LC2OEO5by5v74syC2kXNGriIh7QbdujXv/9j2dz126dOl4nOOgVCqlcF0ajWbwkt9WPXl4L6wiIS6FwLqxCClJGNhIJ69eRFZfuXSLxLyLq163ekNVUmJqtW8771/WrV0ff+7sudxD+4/gekrMDuMgWSicngAgEmFXtmOPUHPWKXS6pPgkyiKeC7wcg+AvEAhGsp1zvn8H6/9/pR4CK1tTZjw8PL5Xq9WHORzOfD+/dltWrdr44uTxwKrnT6NITTXBOFERzoNDl7KFhYV62LCRu+Njk0lJsZkuriyroMkZzhLyP3kSwyGoQqFptmOLFi287OzsBj0KeRwzZfLPD5ctXf0WHXszp88MPXTgaNKdW3dS2vm2vxX1KjpLp9VdePUyqir0wYO3a1esTSwuLCV7dx/ErBuK8RwW7dA2dUBS82I40jHUaxeuXMdniXkfT7p27T4dpCCfz1+IbmgJn1bh/n6CBWAPZQI6ctNqNXMkEslvzs7Oi1xc3FYOGTz6QVxMCiXo5v7yS3+M+eDAD7Va993jRy8qS4qLKaVsJu9y6SGtd27fBrUANwTLVNvatu7cq0ffzc+fRZK5c38Zr/PyXZWTnU8mThw7bfWqtRdys3Oq+/cbcCgy4g0JCwl79zD4UWF+bgHxP3GmfNuWXadat24Nqhg4H8FWLRajYCVA5wOCKxCW5c5NO+egqA9j2bB+60VAUaFQuBDHHLClyb808/2HBLwIfCibQeK4FFcPD4/OfD6nv0ymWHHj2t0qtI0cP3oUmN4Cwx/29o79r18LKqL4n7YlptfevXW/Fr03ka8iMFTBtbS0dGMHK/ryeIIlvr5td6m16qF6ne+l69fuVE+fPnVPnz4D/BMTUkiPHj1urF65rvJcwEXTujUby+bNm/fWjcPBeBIKORQGswwoWla4cEGsT3cZ0H/A+NTk1GpY//Vrt402Ng4+mIF2d3dHqyKlMT7/zn9H+Yp1R58OQ1UoFL+h3+j8+auUYbtz4wbgoDWoXgsLi1FHj57KKy0qM0PI9PSPSxcvS84wmNBFlyOXy3ujfx87wdnZuS1aDD085J3t7Vu6AtVYWFiMt7GxGalUKsd27Nh5D5frNsne3nGUo6Mj3A0qa531er0WcQSH/LHWDvCAGjC4fyWSRalIOirufSzlwh+HPyXt2nVYgXkxcD4I0MD//7QHvEokkuHu7u4r1q7elI+A/PzJkxuApXAtLVo0+3HXzv0x5aUVFMeXFJfU+p88+fTF05elUMaKZUvWrlq19vqd6zehUFTmODu37QkJf/T0HNolQ+7fHzJ72jSFWq0aOGXSJA2H4+K7asnyvl5entOuXLzSa/bM2T9s37br3IABA+ROTk7t0VYJFFTn9wF9+e7ubSOePU+gfv9tfO3E8T9uYRowIOZ+xPNAO0jYquA/pcB6HB0dl07/+ZfQkqJy8u7Nm3jsAGTKTZo08B08cMRjxIeyolIKI4sKCmsyjaYaEHTxsbEZo0eMjkqISSSx72Pe9uvde8juXftTjx07ju6Jnx+HvSCBAYHHfhg/ec+76Pcf+/bqvyssJJzMmjnz9rmAC+Urli6L3Lf3wMGWti3lyMjZdkUM6WFXcTv4+XV+F/WG4v2crHwydcq0I2g4k8lk82VK2QjwPQjUn3+nfyoxdx1w14wdO/FMUoIBSs2zt7KStGrVSgpyrHXr1iuWL1tnev0qhhQXFFM+CDi/rjoWHxtbnpiQQM+wPLzvQHbk89dlCfHxCXNnz753Lyi44tbNm1eGDhq6Ly4mrmbm1BlnIl68Kj914kTwu+j3NSgIPTW3ushANSMrt7GhFIj+lxkzBiXFJ9I8JDszn8ybuyisWbMm2CFTZDLZcAcu11lsLrX+c4tcLudwue4LBgwYsink/pNqzBNsXLXqm8aNG/PMR1rai5s2bTK4V6/+97ds2mUMffCUDlhgAA+JFs4MRXzAoqQkJVempaTUYGAQ51bgzNGM9PSi+JjYgry83NqUpKR8FHFQOwAJB7Lut99+G41MGpSzhSUdvG554uixdbgOlJ+SlE7mz/0VNQ1kxSg3InY04vF4A9A/+/n3+WcT1BC+UsgkK8Vi4aLT/oGU3Lpz8xY6H9BpIQQ7iuBoYdEQbXwdevcc4H/vdujHksJiiozMZ8Oh99RoZkuzzaVLEHFoBEY7OtxVMSplJaXm2bLMLLpg796+ywfV4ODg4I0DOdrq9donj8LvoEEA7SoPH4TXjhk9EcMWQFkLcTQDMnuhUDjwX0H5n0QmkYx1dXXZunjR0ggjaILsnMofJ0xQo78HNDUmVJDmi7lc0BXSXr0G7XwU+pIgS0ZcoBMw7BwYBjnMNQPzcDZ2B+YQ6BwZhvvY52HnvH/7/nGTJk2GIQBrtb76iGcRtLSI5oCrl29ktfXphOaAdiqVYh3aUNg5uY7/62TbHy1WPPoPfOZ6aXTrrl81N5W9fvXqOfIBwDw0NLF1WbQiouNZN2zoOP/oqFiz1aNgzx57Rsda6VBf1qdJSnRg4+9ob69r0qpCoT7y9XtQCej/GTV83EI0EeOA1h3b94Ta29sPdHZ2/kGpxJEDai2UjoTrryqy/+Uil8vRM7lmzuyF72LfJ9NFCH1wDx1yCNRo8EJZEPwMGnBVjRs3nDBv7uI49BnhpF0o2qxwnENkPhUFB/VR2pmOtZqZUNqPhEbd/AKSmJhUwf5vAM3iBUsOw/JfPo8sYOoxI/h8/lKZTLYZiRg7MdOW7f741xRMjigU8h18Pn/OimXr0w0p5oM07t2+vZV9Sku4InQjgB4WiXjfWFlZTV+1fFNCeloWQdsjhjZAZ6AWQCcr2YlJHJNAZ9VYN4T5BNrqkp1NZsyYMRw01aG9h0/T+HM7ONHS0nKAQqE4UpcJs023/9JCy3c4p0GplM3z8tL9euTQqarSonJSW11Nbl2/DvyNSps1mFJMn4vFKr6dXSuZjY3NnFEjJ0QdP3a6eM7sRVXXrtwhJlM2qUDZMcdcP647Z6JuWBuTlB/KK9FKn6PRaHrVr898t2vrLnqC7/GjJ0Nx8rpIJJrBVuf+/v8v4A+Q+nW+VaPRTMcxOJ07frP2xLEzFXnZ5qMmn4aH30AswHPYNkH069OjkNF57O7u8r2ji+NEhVwVvH7d9o9Bt0NIVmYeAY2BqRr0fpaVlpDS4lLy+lU0iXgRRZYvW36wadOmONNnwK2btxPxPqtXrUOBHvz+FC6XO/J3z3T9swt49Dpop1Z7zBIIeD/5+XXcs2/P0fLcrHy6CG/fvEnevX1Ldzzn66+/doJfFovFnSUSCQ+HaOBEXAcHh57WrawHeXl535g48eeY1Ss3Z1+/FkSePH5B3r9LIOfPXUlq3/7b2e3bdlxWvz7Tq42z8zcOdg6D30W9K8dwxsqVa8FF4cSvBaAZ/qX9/ucCxrR169bNcV+j0SwRi4VrJBLZijWrN6W9fRNPFwFdCI8ePtzeokULyr9YWlq6gzRDTQADIyic4+h8G5tWflBwy5YtR7o6uy9UKj1PderU7bK7u/ssUBwg8MD7o694y+qNi6o/1pDIV1EfvLy8uzo42PXk8Xg/SQUCPO/fS7AL6lr6FArFSPzDt+bNm4+aMO6nK/fuPiTlpZUE5cCk+PisW9duLBGxxR4oEt0KoJHZwTo56tKgGPh8Nx1qDOicwD90wILZ2tpiXqvRD2PGf2dISaUNYvv3HQb0dedyuQvQzSwXiUDI/fsJZg5Q2Md9uVyu9vb2Xu3u6rrI17ft4oXzf4tMTDA38UKSExONocEPDuzYtLWfo7n5q+5/T8J3Y5egjotjk8Hro1+H/psUFyt7ydmT/qtSk5Ipj/T08YsPvXv36+fu7txWJBL9xB5b+e/h//8TaVBXBFcoFE11Gt1YsVg8zcXFaXa/foOO7Np1KDk66tN/wqITlMkJSbmvX0aEBd+5u/vKhXNztq/fOGbzmvV91qxY0WX16tXeK5ct67Vk0eKVwXfuHop585YGXcjzpxF5ffv2n2NpaYFGrAXYIQj0n3+gfzvBNCYqaOxCMO3ateMjNvB4nA3Ozs4L+vTpv3nNqk3PLl24XhX9Jo5UlP3ff+wDqSqrJOXFpXQ4z2gwkvwcczCnUgurjyC7dh6I69Gt95AmTRq0l8vla9lD+xT4X5Sff55/W3FxcUHf5qd/QatSqbprNJoFIpFoha2t9UweT7Dxmy7fHfrphxm3Nm7c/vbQweOGwDNXau7fC6t9FPqMPH8aScLDnpMH98PJ7Vv3a0+fDsz6Zda8EJ3Od3oTiyYjOTzOfIVCMZ/H4zkhhiCQf/4ZvggbG1i/TNsfNRqNTKvV9lUqlXN5PM5cd677Wmtr6xl2dnZL+Xz+TplE9pta7bVer2+7QOflvUyl0iwUCsXLrKysZlpaWk6SSESLccqtRCLphKE5djCbdj98kf+PYCEcHByc2R1BFwNJGkZJVSpVew+Nx0ihUDhcKhbPVnt4rJZLpXPFUvFCqVQ6QywWz0UZFJSGTCbD/45sgnZDdrz1zz1w+19NECOwI1jYipaQr3GkJvvwVwyP1xizuPDnOGycTfSQWDVByROxBZ0QdRn2F/mfyVdQtLu7Lfr2W7MHrVJ3BUob05dYANDKbAuh85dA+9cIqm51vfr/9RExX+SLfJEv8u8n/wcD8zru+9Kv3QAAAABJRU5ErkJggg==",ym={top:"bottom",bottom:"top",front:"front",back:"back",left:"right",right:"left","front-right":"back-left","front-left":"back-right","back-right":"front-left","back-left":"front-right"},$a=[{preset:"top",angleDeg:0,label:"Сверху"},{preset:"back",angleDeg:45,label:"Сзади"},{preset:"left",angleDeg:90,label:"Слева"},{preset:"front",angleDeg:135,label:"Спереди"},{preset:"bottom",angleDeg:180,label:"Снизу"},{preset:"front",angleDeg:225,label:"Спереди"},{preset:"right",angleDeg:270,label:"Справа"},{preset:"back",angleDeg:315,label:"Сзади"}],Sm='<svg viewBox="0 0 16 20" width="18" height="22" aria-hidden="true"><path fill="currentColor" d="M8 18 L2 4 h12z"/></svg>';function Em(){const n=document.createElementNS("http://www.w3.org/2000/svg","svg");n.setAttribute("class","view-orientation-widget__logo"),n.setAttribute("viewBox","0 0 100 100"),n.setAttribute("aria-hidden","true");for(const t of $a){const e=document.createElementNS("http://www.w3.org/2000/svg","g");e.setAttribute("transform",`rotate(${t.angleDeg} 50 50)`),e.dataset.preset=t.preset,e.dataset.label=t.label;const i=document.createElementNS("http://www.w3.org/2000/svg","path");i.setAttribute("class","view-orientation-widget__hit"),i.setAttribute("d","M50 1.6 L65 25.5 H35 Z");const r=document.createElementNS("http://www.w3.org/2000/svg","path");r.setAttribute("class","view-orientation-widget__mark"),r.setAttribute("d","M50 7.2 L56.6 19 H43.4 Z"),e.append(i,r),n.appendChild(e)}return n}function bm(){const n=document.createElement("div");n.className="view-orientation-widget__ring";for(const t of $a){const e=document.createElement("button");e.type="button",e.className="view-orientation-widget__arrow",e.style.setProperty("--vo-angle",`${t.angleDeg}deg`),e.dataset.preset=t.preset,e.dataset.label=t.label,e.innerHTML=Sm,n.appendChild(e)}return n}function tc(n,t,e){const i=n.dataset.preset,r=n.dataset.label??"";i&&(n.addEventListener("click",s=>{s.stopPropagation(),t(ym[i])}),n.addEventListener("pointerdown",s=>s.stopPropagation()),n.addEventListener("mouseenter",()=>{e.textContent=r,e.hidden=!1,n.classList.add("is-hover")}),n.addEventListener("mouseleave",()=>{e.hidden=!0,n.classList.remove("is-hover")}))}function Tm(n,t){n.classList.add("view-orientation-widget"),n.hidden=!1,n.replaceChildren();const e=Em(),i=document.createElement("img");i.className="view-orientation-widget__brand",i.src=Qa,i.alt="",i.draggable=!1;const r=bm(),s=document.createElement("div");s.className="view-orientation-widget__tooltip",s.hidden=!0,e.querySelectorAll("g").forEach(a=>tc(a,t,s)),r.querySelectorAll("button").forEach(a=>tc(a,t,s)),n.append(e,i,r,s)}const ec="(max-width: 768px), (pointer: coarse) and (max-width: 1024px)",wm=[{preset:"front",label:"Спереди"},{preset:"back",label:"Сзади"},{preset:"left",label:"Слева"},{preset:"right",label:"Справа"},{preset:"top",label:"Сверху"},{preset:"bottom",label:"Снизу"}];function nc(){return window.matchMedia(ec).matches}function Am(n){return{comments:n.comments.length>0,ruler:n.measurements.some(t=>t.kind==="ruler"),thickness:n.measurements.some(t=>t.kind==="thickness"),marker:n.meshes.some(t=>!!t.buffers.marker_colors_b64)}}function dr(n,t,e,i){const r=document.getElementById(t);r&&(r.checked=n.layers[e],r.addEventListener("change",()=>{n.layers[e]=r.checked,n.applyLayers(),i?.()}))}function xi(n){for(const[t,e]of[["layer-comments-mobile","comments"],["layer-ruler-mobile","ruler"],["layer-thickness-mobile","thickness"],["layer-marker-mobile","marker"]]){const i=document.getElementById(t);i&&(i.checked=n.layers[e])}for(const t of["comments","ruler","thickness","marker"]){const e=document.querySelector(`#layers-dock [data-layer="${t}"]`);e&&!e.hidden&&e.classList.toggle("layers-dock__btn--active",n.layers[t])}}function ic(n){return n.meshes.some(t=>t.buffers.has_vertex_colors&&!!t.buffers.colors_b64)}function gs(n,t){const e=[document.getElementById("flat-shading"),document.getElementById("flat-shading-mobile")],i=n.isFlatShadingEnabled();for(const m of e)m&&(m.classList.toggle("layers-dock__btn--active",i),m.setAttribute("aria-pressed",i?"true":"false"));const r=n.hasIndependentVertexColors?.()??ic(t),s=[document.getElementById("vertex-colors"),document.getElementById("vertex-colors-mobile")];for(const m of s)m&&(m.hidden=!r,m.classList.toggle("layers-dock__btn--active",n.isVertexColorsEnabled()));const a=n.canShowContacts?.()??!1,o=n.isContactsEnabled?.()??!1;for(const m of["html-contacts","html-contacts-mobile"]){const g=document.getElementById(m);g&&(g.hidden=!a,g.classList.toggle("layers-dock__btn--active",o),g.classList.toggle("mobile-contacts-bar__btn--active",o))}const c=n.hasContactImprint?.()??!1,l=n.isContactsDynamicEnabled?.()??!1;for(const m of["html-contacts-dynamic","html-contacts-dynamic-mobile"]){const g=document.getElementById(m);g&&(g.hidden=!c,g.classList.toggle("layers-dock__btn--active",l),g.classList.toggle("mobile-contacts-bar__btn--active",l))}const h=n.canShowContactsOnJaws?.()??!1,u=n.isContactsOnJawsEnabled?.()??!1;for(const m of["html-contacts-jaws","html-contacts-jaws-mobile"]){const g=document.getElementById(m);g&&(g.hidden=!h,g.classList.toggle("layers-dock__btn--active",u),g.classList.toggle("mobile-contacts-bar__btn--active",u))}const f=document.getElementById("mobile-contacts-bar");f&&(f.hidden=!(a||c||h))}function Cm(n,t){const e=document.getElementById("mobile-mesh-list");e&&za(e,n,t,{visibilityAll:"mobile-mesh-visibility-all",collapseAll:"mobile-mesh-collapse-all"})}function Rm(n,t){const e=document.getElementById("mobile-dock"),i=document.getElementById("mobile-sheet-backdrop");if(!e||!i)return;Cm(n,t);const r=document.getElementById("mobile-mesh-title");r&&(r.textContent="Объекты");const s=document.querySelector(".mesh-overlay__toggle-label");s&&(s.textContent="Объекты"),document.querySelectorAll(".viewer-brand-logo").forEach(A=>{A.src=Qa});const a=document.querySelector('#mobile-dock [data-mobile-sheet="meshes"]');a&&(a.hidden=!0);const o=Am(t),c=o.comments||o.ruler||o.thickness||o.marker;for(const A of["comments","ruler","thickness","marker"]){const S=document.querySelector(`#mobile-sheet-layers [data-layer-row="${A}"]`);S&&(S.hidden=!o[A])}const l=document.querySelector('#mobile-dock [data-mobile-sheet="layers"]');l&&(l.hidden=!c),o.comments&&dr(n,"layer-comments-mobile","comments",()=>xi(n)),o.ruler&&dr(n,"layer-ruler-mobile","ruler",()=>xi(n)),o.thickness&&dr(n,"layer-thickness-mobile","thickness",()=>xi(n)),o.marker&&dr(n,"layer-marker-mobile","marker",()=>xi(n)),xi(n);const h=document.getElementById("flat-shading-mobile");h&&h.addEventListener("click",()=>{n.setFlatShading(!n.isFlatShadingEnabled()),gs(n,t)});const u=document.getElementById("vertex-colors-mobile");u&&ic(t)&&u.addEventListener("click",()=>{n.setVertexColorsEnabled(!n.isVertexColorsEnabled()),gs(n,t)}),gs(n,t);let f=null;const m=document.getElementById("mesh-overlay"),g=document.getElementById("mesh-overlay-toggle"),_=document.getElementById("mobile-sheet-meshes"),p=A=>{const S=document.getElementById("mobile-contacts-bar");if(!S)return;if(A!=="articulator"){S.style.bottom="",S.classList.remove("mobile-contacts-bar--lifted");return}const M=()=>{const C=document.getElementById("mobile-sheet-articulator"),O=document.getElementById("mobile-dock")?.getBoundingClientRect().height??68,X=C?.getBoundingClientRect().height??0;S.style.bottom=`${Math.round(O+X+8)}px`,S.classList.add("mobile-contacts-bar--lifted")};requestAnimationFrame(()=>requestAnimationFrame(M))},d=A=>{m?.classList.toggle("mesh-overlay--collapsed",!A),g?.setAttribute("aria-expanded",String(A)),_?.classList.toggle("mobile-sheet--open",A),e.querySelector('[data-mobile-sheet="meshes"]')?.classList.toggle("mobile-dock__btn--active",A)},b=()=>{f=null,i.hidden=!0,document.querySelectorAll(".mobile-sheet").forEach(A=>{A.classList.remove("mobile-sheet--open")}),e.querySelectorAll(".mobile-dock__btn").forEach(A=>{A.classList.remove("mobile-dock__btn--active")}),d(!1),p(null)},y=A=>{A(),requestAnimationFrame(()=>n.resize?.())},E=document.getElementById("mobile-views-grid");if(E){E.replaceChildren();const A=t.views??[];for(const M of A){const C=document.createElement("button");C.type="button",C.className="mobile-views-grid__btn mobile-views-grid__btn--accent",C.textContent=M.label==="Default view"?"Вид по умолчанию":M.label,C.addEventListener("click",H=>{H.preventDefault(),H.stopPropagation(),y(()=>n.applyExocadView?.(M))}),E.appendChild(C)}for(const{preset:M,label:C}of wm){const H=document.createElement("button");H.type="button",H.className="mobile-views-grid__btn",H.textContent=C,H.addEventListener("click",O=>{O.preventDefault(),O.stopPropagation(),y(()=>n.snapView(M))}),E.appendChild(H)}const S=document.createElement("button");S.type="button",S.className="mobile-views-grid__btn mobile-views-grid__btn--accent",S.textContent="Вписать в экран",S.addEventListener("click",M=>{M.preventDefault(),M.stopPropagation(),y(()=>n.fitToContent({preserveRotation:!0}))}),E.appendChild(S)}const L=A=>{if(A==="meshes"){const S=f!=="meshes";b(),S&&(f="meshes",d(!0));return}if(f===A){b();return}b(),f=A,i.hidden=!1,document.getElementById(`mobile-sheet-${A}`)?.classList.add("mobile-sheet--open"),e.querySelector(`[data-mobile-sheet="${A}"]`)?.classList.add("mobile-dock__btn--active"),p(A)};e.querySelectorAll("[data-mobile-sheet]").forEach(A=>{A.addEventListener("click",S=>{S.stopPropagation(),L(A.dataset.mobileSheet)})}),g?.addEventListener("click",A=>{A.stopPropagation(),L("meshes")}),i.addEventListener("click",b),document.getElementById("viewport")?.addEventListener("pointerdown",A=>{if(f!=="meshes"||n.pickMeshId?.(A.clientX,A.clientY))return;document.querySelector("#mobile-mesh-list .mesh-panel__group:not(.mesh-panel__group--collapsed)")&&document.getElementById("mobile-mesh-collapse-all")?.click()});const R=()=>{document.documentElement.classList.toggle("layout-mobile",nc()),nc()||b()};R(),window.matchMedia(ec).addEventListener("change",R)}const rc="d3d-mesh-context-menu-style",Pm=`
.d3d-mesh-menu {
  position: fixed;
  z-index: 80;
  min-width: 196px;
  max-width: min(280px, calc(100vw - 16px));
  max-height: min(50vh, 360px);
  overflow-y: auto;
  padding: 4px 0;
  background: var(--c-panel-glass, rgba(30, 30, 36, 0.96));
  border: 1px solid var(--c-border, #4a4a54);
  border-radius: 8px;
  box-shadow: var(--c-panel-shadow, 0 8px 24px rgba(0, 0, 0, 0.45));
  backdrop-filter: blur(8px);
  user-select: none;
  -webkit-overflow-scrolling: touch;
}
.d3d-mesh-menu--hidden { display: none; }
.d3d-mesh-menu__title {
  padding: 6px 12px 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-text-muted, #a0a0a8);
  border-bottom: 1px solid var(--c-border-soft, #3a3a42);
  margin-bottom: 4px;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.d3d-mesh-menu__item {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--c-text, #e8e8ec);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.d3d-mesh-menu__item:hover,
.d3d-mesh-menu__item:active { background: var(--c-item-hover, rgba(255, 255, 255, 0.06)); }
.d3d-mesh-menu__hint {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: var(--c-text-dim, #787880);
}
.d3d-mesh-menu__empty {
  padding: 12px;
  font-size: 12px;
  color: var(--c-text-muted, #a0a0a8);
}
`;function Dm(){return window.matchMedia("(pointer: coarse), (max-width: 768px)").matches}class Lm{constructor(t){this.callbacks=t,Im(),this.el=document.createElement("div"),this.el.className="d3d-mesh-menu d3d-mesh-menu--hidden",this.el.setAttribute("role","menu"),document.body.appendChild(this.el),document.addEventListener("pointerdown",this.onDocPointer,!0),window.addEventListener("blur",this.hide),window.addEventListener("resize",this.hide)}el;target=null;show(t,e,i){this.target=i,this.renderMeshMenu(),this.place(t,e)}showHiddenList(t,e,i){this.target=null,this.el.replaceChildren();const r=document.createElement("div");if(r.className="d3d-mesh-menu__title",r.textContent="Скрытые объекты",this.el.appendChild(r),i.length===0){const s=document.createElement("div");s.className="d3d-mesh-menu__empty",s.textContent="Нет скрытых объектов",this.el.appendChild(s)}else for(const s of i)this.addItem(s.name,"",()=>{this.callbacks.onRevealHidden?.(s.id),this.hide()});this.place(t,e)}hide=()=>{this.target=null,this.el.classList.add("d3d-mesh-menu--hidden")};dispose(){document.removeEventListener("pointerdown",this.onDocPointer,!0),window.removeEventListener("blur",this.hide),window.removeEventListener("resize",this.hide),this.el.remove()}place(t,e){this.el.classList.remove("d3d-mesh-menu--hidden");const i=this.el.getBoundingClientRect(),r=Math.min(t,window.innerWidth-i.width-8),s=Math.min(e,window.innerHeight-i.height-8);this.el.style.left=`${Math.max(8,r)}px`,this.el.style.top=`${Math.max(8,s)}px`}onDocPointer=t=>{this.el.classList.contains("d3d-mesh-menu--hidden")||t.button!==2&&(this.el.contains(t.target)||this.hide())};renderMeshMenu(){const t=this.target;if(!t)return;this.el.replaceChildren();const e=document.createElement("div");e.className="d3d-mesh-menu__title",e.textContent=t.name,this.el.appendChild(e);const i=Dm();this.addItem(t.visible?"Скрыть объект":"Показать объект",i?"":"Ctrl+СКМ",()=>{this.callbacks.onToggleVisible(t.id),this.hide()}),this.addItem(t.halfTransparent?"Прозрачность 0%":"Прозрачность 50%",i?"":"Shift+СКМ",()=>{this.callbacks.onToggleOpacity(t.id),this.hide()})}addItem(t,e,i){const r=document.createElement("button");r.type="button",r.className="d3d-mesh-menu__item",r.setAttribute("role","menuitem");const s=document.createElement("span");if(s.textContent=t,r.append(s),e){const a=document.createElement("span");a.className="d3d-mesh-menu__hint",a.textContent=e,r.append(a)}r.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),i()}),this.el.appendChild(r)}}function Im(){if(document.getElementById(rc))return;const n=document.createElement("style");n.id=rc,n.textContent=Pm,document.head.appendChild(n)}const sc=1,Um=6;function Fm(n,t=1e-4){if(n.length<6)return!0;const e=n[0],i=n[1],r=n[2];for(let s=3;s<n.length;s+=3)if(Math.abs(n[s]-e)>t||Math.abs(n[s+1]-i)>t||Math.abs(n[s+2]-r)>t)return!1;return!0}function Nm(n){return n==="exocad"||n==="d3dHtml"||n==="mesh"?n:"mesh"}function oc(n,t){const e=new Uint8Array(Te(n)),i=new Float32Array(e.length);e.length/3;{for(let r=0;r<e.length;r+=1)i[r]=(e[r]??0)/255;return i}}function ac(n){return oc(n)}function Bm(n){const t=Math.floor(n.length/3);if(t<32)return!1;const e=40/255;let i=0,r=0;for(let a=0;a<t;a+=1){const o=n[a*3],c=n[a*3+1],l=n[a*3+2],h=Math.max(o,c,l),u=Math.min(o,c,l);h-u<=e||(i+=1,(l>o+.08||c>o+.08)&&(r+=1))}const s=i/t;return s>.08&&s<.85&&r/i>.55}function Om(n){const t=Math.floor(n.length/3),e=40/255,i=new Map;let r=-1,s=0;for(let a=0;a<t;a+=1){const o=n[a*3],c=n[a*3+1],l=n[a*3+2];if(Math.max(o,c,l)-Math.min(o,c,l)>e)continue;const h=Math.round(o*15)<<8|Math.round(c*15)<<4|Math.round(l*15),u=(i.get(h)??0)+1;i.set(h,u),u>s&&(s=u,r=h)}return r<0||s<8?null:new Ft((r>>8&15)/15,(r>>4&15)/15,(r&15)/15)}function cc(n){if(n.length<3)return!0;const t=n[0],e=n[1],i=n[2];for(let r=0;r<n.length;r+=3)if(n[r]!==t||n[r+1]!==e||n[r+2]!==i)return!1;return!0}function fr(n,t){return n.length===t*3}function _s(n,t){return!!n&&fr(n,t)&&!cc(n)}function km(n,t,e=2/255){if(n.length!==t.length||n.length<3)return!1;let i=0;const r=n.length/3;for(let s=0;s<n.length;s+=3)Math.abs(n[s]-t[s])<=e&&Math.abs(n[s+1]-t[s+1])<=e&&Math.abs(n[s+2]-t[s+2])<=e&&(i+=1);return i/r>.995}function zm(n){const t=n.buffers.image_bytes;if(t&&t.length>0)return t;const e=n.buffers.image_b64?.trim();return e?Te(e):null}function Gm(n,t){const e=n.buffers.uvs_bytes;if(e&&e.length>=t*8){const r=new Uint8Array(e.byteLength);return r.set(e),new Float32Array(r.buffer)}const i=n.buffers.uvs_b64?.trim();if(i)try{const r=xp(i);if(r.length>=t*2)return r}catch{return null}return null}function vs(n,t){const e=new Float32Array(t*3);for(let i=0;i<t;i+=1)e[i*3]=n.r,e[i*3+1]=n.g,e[i*3+2]=n.b;return e}function lc(n,t,e,i=2/255){const r=new Float32Array(n.length),s=Math.floor(n.length/3);for(let a=0;a<s;a+=1){const o=a*3,c=n[o],l=n[o+1],h=n[o+2],u=t?t[o]:e.r,f=t?t[o+1]:e.g,m=t?t[o+2]:e.b;Math.abs(c-u)>i||Math.abs(l-f)>i||Math.abs(h-m)>i?(r[o]=c,r[o+1]=l,r[o+2]=h):(r[o]=e.r,r[o+1]=e.g,r[o+2]=e.b)}return r}const xs={strength:2.8,floor:.48};function Hm(n,t,e){n.deleteAttribute("color"),wa(t,e),Qn(t,!0,xs)}function Vm(n,t,e){n.setAttribute("color",new Qt(e.slice(),3)),Ca(t),Qn(t,!0,xs)}function hc(n){const t=Up(n);return n.vertexColors||wa(t,n.solidColor),Qn(t,!0,xs),t}async function uc(n){if(typeof DecompressionStream<"u"){const t=new Blob([n]).stream().pipeThrough(new DecompressionStream("gzip")),e=await new Response(t).arrayBuffer();return new Uint8Array(e)}throw new Error("Браузер не поддерживает gzip")}async function Wm(n){return crypto.subtle.digest("SHA-256",n)}function Xm(n){return n.replace(/[\s\-_]/g,"").toUpperCase()}function qm(n,t){const e=Te(n),i=new Uint8Array(e.length);for(let r=0;r<e.length;r+=1)i[r]=e[r]^t[r%t.length]^90+r*13&255;return new TextDecoder().decode(i).replace(/\0+$/g,"").trim()}function dc(){const t=document.querySelector('meta[name="d3d-wrap"]')?.getAttribute("content")?.trim()??"";if(t)return t;const i=document.getElementById("d3d-scene-encrypted")?.getAttribute("data-wrap")?.trim()??"";return i||(document.querySelector("[data-wrap]")?.getAttribute("data-wrap")?.trim()??"")}async function fc(n,t){const i=new TextEncoder().encode(n),r=new Uint8Array(t.length+i.length);return r.set(t,0),r.set(i,t.length),new Uint8Array(await Wm(r))}async function Ym(n,t,e){const i=await fc(n,t);return crypto.subtle.importKey("raw",i,{name:e},!1,["decrypt"])}function jm(n,t){if(n.length!==t.length)return!1;let e=0;for(let i=0;i<n.length;i+=1)e|=n[i]^t[i];return e===0}async function Km(n,t,e,i,r){const s=await fc(r,n),a=await crypto.subtle.importKey("raw",s,{name:"HMAC",hash:"SHA-256"},!1,["sign"]),o=new Uint8Array(t.length+i.length);o.set(t,0),o.set(i,t.length);const c=new Uint8Array(await crypto.subtle.sign("HMAC",a,o));if(!jm(c,e))throw new Error("NEED_PASSWORD");const l=await crypto.subtle.importKey("raw",s,{name:"AES-CBC"},!1,["decrypt"]),h=await crypto.subtle.decrypt({name:"AES-CBC",iv:t},l,i);return new Uint8Array(h)}async function Zm(n,t,e,i,r,s){const a=Te(n),o=Te(t),c=Te(e);if(r==="aes-256-cbc"){const u=Te(s??""),f=[i,Xm(i)].filter((g,_,p)=>g.length>0&&p.indexOf(g)===_);let m;for(const g of f)try{return await Km(a,o,u,c,g)}catch(_){m=_}throw m instanceof Error?m:new Error("NEED_PASSWORD")}const l=await Ym(i,a,"AES-GCM"),h=await crypto.subtle.decrypt({name:"AES-GCM",iv:o},l,c);return new Uint8Array(h)}async function Jm(n){const t=document.getElementById("d3d-scene-encrypted");let e;if(t){const o=t.getAttribute("data-salt")??"",c=t.getAttribute("data-nonce")??"",l=t.textContent?.trim()??"",h=t.getAttribute("data-alg"),u=t.getAttribute("data-mac"),f=dc();let m=n;if(!m&&f&&(m=qm(f,Te(o))),!m)throw new Error("NEED_PASSWORD");e=await Zm(o,c,l,m,h,u)}else{const c=document.getElementById("d3d-scene-payload")?.textContent?.trim()??"";e=Te(c)}const i=await uc(e).catch(()=>e);if(xm(i)){const o=Mm(i),c=JSON.parse(new TextDecoder().decode(o.json));for(const h of c.meshes){const u=h.buffers.pack_index;if(u==null||!o.packs[u])continue;const f=o.packs[u];h.buffers.pack_bytes=f.pack,f.colors&&f.colors.length>0&&(h.buffers.colors_b64=um(f.colors),h.buffers.has_vertex_colors=!0),f.image&&f.image.length>0&&(h.buffers.image_bytes=f.image,h.buffers.has_image=!0),f.uvs&&f.uvs.length>0&&(h.buffers.uvs_bytes=f.uvs,h.buffers.has_uvs=!0)}const l=hr(c);return l&&(c.articulator=l),c}const r=new TextDecoder().decode(i),s=JSON.parse(r),a=hr(s);return a&&(s.articulator=a),s}async function Qm(n){const t=new He,e=n.buffers.pack_bytes,i=n.buffers.pack_b64?.trim();if(e&&e.length>0){const h=Ja(e);return t.setAttribute("position",new Qt(h.positions,3)),t.setIndex(new Qt(h.indices,1)),t.computeVertexNormals(),t}if(i){const h=Te(i),u=await uc(h).catch(()=>h),f=Ja(u);return t.setAttribute("position",new Qt(f.positions,3)),t.setIndex(new Qt(f.indices,1)),t.computeVertexNormals(),t}const r=n.buffers.ctm_b64?.trim(),s=!!n.buffers.positions_b64?.length;if(r&&!s){const h=fm(Te(r));return t.setAttribute("position",new Qt(h.positions,3)),t.setIndex(new Qt(h.indices,1)),h.normals?t.setAttribute("normal",new Qt(h.normals,3)):t.computeVertexNormals(),t}const a=Te(n.buffers.positions_b64),o=new Float32Array(a.buffer,a.byteOffset,a.byteLength/4),c=Te(n.buffers.indices_b64),l=new Uint32Array(c.buffer,c.byteOffset,c.byteLength/4);if(t.setAttribute("position",new Qt(o,3)),t.setIndex(new Qt(l,1)),n.buffers.normals_b64){const h=Te(n.buffers.normals_b64),u=new Float32Array(h.buffer,h.byteOffset,h.byteLength/4);t.setAttribute("normal",new Qt(u,3))}else t.computeVertexNormals();return t}function pc(n){return new Ft(n)}class $m{scene=new dl;viewportRig=new Ie;camera;renderer;controls;viewportWrap;canvas;pickRay=new ro;pickNdc=new Ot;meshEntries=new Map;hiddenMeshStack=[];lastRevealHiddenAt=0;meshMenu=null;contacts=new hm(()=>[...this.meshEntries.entries()].filter(([,t])=>!t.photo).map(([t,e])=>({id:t,name:e.name,jaw:e.jaw,mesh:e.mesh,restMatrix:e.restMatrix,photo:e.photo})));contentBox=new Je;ambientLight;hemisphereLight;keyLight;fillLight;keyLightOffset=Ma.clone();layers={comments:!0,ruler:!0,thickness:!0,marker:!1};commentGroup=new Ie;measureGroup=new Ie;bubbleRoot;labelRoot;flatShading=!1;vertexColorsEnabled=!0;meshColor="#e6c8a8";sceneData;constructor(t,e,i,r,s){this.viewportWrap=e,this.canvas=t,this.bubbleRoot=i,this.labelRoot=r,this.renderer=new Af({canvas:t,antialias:!0,alpha:!0,logarithmicDepthBuffer:!0}),t.tabIndex=-1,t.style.background="transparent",this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.outputColorSpace=ye,this.renderer.toneMapping=1,this.renderer.toneMappingExposure=ba(),this.scene.background=null,this.applyTheme("dark"),this.camera=Rf(1),es(this.camera,this.viewportRig),this.scene.add(this.viewportRig),this.controls=new me(this.camera,s,t),this.controls.setWheelBoundsElement(e),this.controls.setLeftButtonOrbitEnabled(!0),this.controls.setMiddleButtonPanEnabled(!1),this.controls.setTrackpadWheelPanEnabled(!0),this.controls.setContentBoxProvider(()=>this.contentBox),this.controls.setOnChange(()=>{this.syncCamera()}),this.controls.setPivotPickHandler((l,h)=>this.pickPivotAt(l,h)),this.controls.setMiddleClickHandler((l,h,u)=>this.handleMiddleClick(l,h,u)),this.meshMenu=new Lm({onToggleVisible:l=>this.hideOrShowMesh(l),onToggleOpacity:l=>this.toggleMeshHalfOpacity(l),onRevealHidden:l=>this.setMeshVisible(l,!0)}),this.bindMeshContextMenu();const a=window.matchMedia("(max-width: 768px), (pointer: coarse) and (max-width: 1024px)"),o=()=>{this.controls.setTouchNavigationEnabled(a.matches)};o(),a.addEventListener("change",o),this.scene.add(this.commentGroup),this.scene.add(this.measureGroup);const c=Ea.mesh;this.ambientLight=new Sl(16777215,c.ambient),this.scene.add(this.ambientLight),this.hemisphereLight=new xl(16777215,16777215,c.hemisphere),this.scene.add(this.hemisphereLight),this.keyLight=new no(16777215,c.key),this.fillLight=new no(16777215,c.fill),ya(this.keyLight,this.fillLight,this.hemisphereLight),this.scene.add(this.keyLight.target),this.scene.add(this.fillLight.target),this.camera.add(this.keyLight),this.camera.add(this.fillLight),this.bindTouchMeshGestures()}bindTouchMeshGestures(){let s=0,a=0,o=0,c=null,l=!1,h=null,u=null;const f=()=>{c!==null&&(window.clearTimeout(c),c=null)},m=_=>!!_?.closest(".mesh-panel, .articulator-panel, .mobile-sheet, .mobile-dock, .mobile-contacts-bar, .mesh-overlay, .d3d-mesh-menu, .layers-dock");this.canvas.addEventListener("pointerdown",_=>{if(!m(_.target)){if(_.pointerType==="touch"){if(_.isPrimary===!1){f(),l=!1,h=null,u=null;return}}else if(_.button!==0)return;u=_.pointerId,s=_.clientX,a=_.clientY,o=performance.now(),l=!1,f(),(_.pointerType==="touch"||window.matchMedia("(pointer: coarse)").matches)&&(c=window.setTimeout(()=>{if(c=null,u===null)return;l=!0,h=null;const p=this.controls.pivotAtClientPoint(s,a);this.controls.cancelActiveGestures(),p||this.controls.cancelActiveGestures(),this.meshMenu?.hide()},480))}}),this.canvas.addEventListener("pointermove",_=>{if(u===null||_.pointerId!==u)return;const p=_.clientX-s,d=_.clientY-a;p*p+d*d>196&&f()});const g=_=>{if(u===null||_.pointerId!==u)return;if(f(),u=null,l){l=!1;return}if(_.pointerType!=="touch"&&_.button!==0)return;const p=_.clientX-s,d=_.clientY-a;if(p*p+d*d>196){h=null;return}if(performance.now()-o>560){h=null;return}const b=performance.now();if(h!==null&&b-h.t<380&&(_.clientX-h.x)**2+(_.clientY-h.y)**2<1600){h=null,this.openTapContextMenu(_.clientX,_.clientY);return}h={t:b,x:_.clientX,y:_.clientY}};this.canvas.addEventListener("pointerup",g),this.canvas.addEventListener("pointercancel",g)}openTapContextMenu(t,e){const i=this.pickMeshHit(t,e);if(i){const s=this.meshEntries.get(i.id);if(!s)return;this.meshMenu?.show(t,e,{id:i.id,name:s.name,visible:s.mesh.visible,halfTransparent:this.isHalfTransparent(i.id)});return}const r=this.listHiddenMeshes();this.meshMenu?.showHiddenList(t,e,r)}listHiddenMeshes(){const t=[];for(const[e,i]of this.meshEntries)i.mesh.visible||t.push({id:e,name:i.name});return t}pickMeshId(t,e){return this.pickMeshHit(t,e)?.id??null}pickMeshHit(t,e){const i=this.canvas.getBoundingClientRect();if(i.width<=0||i.height<=0)return null;this.pickNdc.set((t-i.left)/i.width*2-1,-((e-i.top)/i.height)*2+1),this.pickRay.setFromCamera(this.pickNdc,this.camera);const r=[...this.meshEntries.values()].filter(o=>o.mesh.visible).map(o=>o.mesh),a=this.pickRay.intersectObjects(r,!1)[0];if(!a)return null;for(const[o,c]of this.meshEntries)if(c.mesh===a.object)return{id:o,point:a.point};return null}handleMiddleClick(t,e,i){if(i.shift&&i.ctrl){const s=performance.now();return s-this.lastRevealHiddenAt<400||(this.lastRevealHiddenAt=s,this.revealNextHiddenMesh()),!0}const r=this.pickMeshHit(t,e);return r?i.ctrl?(this.setMeshVisible(r.id,!1),!0):i.shift?(this.toggleMeshHalfOpacity(r.id),!0):!1:i.shift||i.ctrl}hideOrShowMesh(t){const e=this.meshEntries.get(t);e&&this.setMeshVisible(t,!e.mesh.visible)}revealNextHiddenMesh(){for(;this.hiddenMeshStack.length>0;){const t=this.hiddenMeshStack.pop();if(!t)continue;const e=this.meshEntries.get(t);if(e&&!e.mesh.visible)return this.setMeshVisible(t,!0),e.name}return null}bindMeshContextMenu(){this.viewportWrap.addEventListener("contextmenu",t=>{if(t.preventDefault(),t.target?.closest(".mesh-panel, .articulator-panel, .mobile-sheet, .mesh-overlay, .d3d-mesh-menu"))return;if(this.controls.takeContextMenuSuppressed()){this.meshMenu?.hide();return}const i=this.pickMeshHit(t.clientX,t.clientY);if(!i){this.meshMenu?.hide();return}const r=this.meshEntries.get(i.id);r&&this.meshMenu?.show(t.clientX,t.clientY,{id:i.id,name:r.name,visible:r.mesh.visible,halfTransparent:this.isHalfTransparent(i.id)})},!0)}isHalfTransparent(t){return Math.abs(this.getMeshOpacity(t)-.5)<.02}getMeshOpacity(t){const e=this.meshEntries.get(t);return e?e.mesh.material.opacity??1:1}pickPivotAt(t,e){return this.pickMeshHit(t,e)?.point??null}toggleMeshHalfOpacity(t){const e=this.meshEntries.get(t);if(!e)return;const i=e.mesh.material.opacity??1;this.setMeshOpacity(t,Math.abs(i-.5)<.02?1:.5)}async addPhotoMesh(t,e,i){const r=e.getAttribute("position")?.count??0,s=Gm(t,r);s&&e.setAttribute("uv",new Qt(s,2));let a;try{a=await _p(i)}catch(u){console.warn(`[d3d-viewer] photo texture failed for "${t.name}"`,u);return}if(!e.getAttribute("uv")){const u=a.image,f=u&&u.width&&u.height&&u.width>0&&u.height>0?u.width/u.height:4/3;e.setAttribute("uv",new Qt(vp(e,f),2))}const o=(t.opacity??1)>.999,c=new ci({map:a,color:16777215,side:2,transparent:!o,opacity:t.opacity??1,depthWrite:o,toneMapped:!1}),l=new Re(e,c);l.userData.meshId=t.id,l.visible=t.visible,l.castShadow=!1,l.receiveShadow=!1,t.transform.length===16&&(l.matrix.fromArray(t.transform),l.matrixAutoUpdate=!1,l.updateMatrixWorld(!0)),this.scene.add(l);const h=new Ft(16777215);this.meshEntries.set(t.id,{mesh:l,name:t.name,markerColors:null,markerPaintOnSolid:null,baseVertexColors:null,baseDisplayColors:vs(h,r),usesFileVertexColors:!1,baseColor:h,flatShading:!0,restMatrix:Array.from(l.matrix.elements),jaw:null,photo:!0})}async load(t){this.sceneData=t,this.meshColor=t.viewer_defaults.mesh_color,this.flatShading=t.viewer_defaults.flat_shading,this.applyPresentation(Nm(t.viewer_defaults.lighting_profile),t.viewer_defaults.theme==="light"?"light":"dark"),this.contentBox.makeEmpty();for(const e of t.meshes){const i=await Qm(e);i.computeBoundingBox();const r=zm(e);if(r){await this.addPhotoMesh(e,i,r);continue}const s=pc(e.mesh_color??this.meshColor),a=i.getAttribute("position").count;let o=null;e.buffers.colors_b64&&(o=oc(e.buffers.colors_b64));const c=o!==null&&fr(o,a);e.buffers.colors_b64&&!c&&console.warn(`[d3d-viewer] vertex colors count mismatch for "${e.name}": ${String((o?.length??0)/3)} vs ${String(a)} vertices`);let l=!!e.buffers.colors_b64&&c;if(l&&o&&Bm(o)){const y=Om(o);y&&s.copy(y),o=null,l=!1}const h=l&&o!==null&&Fm(o);h&&o&&s.setRGB(o[0],o[1],o[2]);const u=l&&!h,f=u,m=o&&!h?o:vs(s,a),g=hc({solidColor:s,opacity:e.opacity,flatShading:e.flat_shading,vertexColors:f});f&&o&&i.setAttribute("color",new Qt(o.slice(),3));const _=new Re(i,g);_.userData.meshId=e.id,_.visible=e.visible,e.transform.length===16&&(_.matrix.fromArray(e.transform),_.matrixAutoUpdate=!1,_.updateMatrixWorld(!0));let p=null;if(e.buffers.marker_colors_b64){const y=ac(e.buffers.marker_colors_b64);_s(y,a)?p=y:fr(y,a)&&cc(y)?console.warn(`[d3d-viewer] ignoring uniform stub marker for "${e.name}" (no real paint)`):console.warn(`[d3d-viewer] marker colors count mismatch for "${e.name}": ${String(y.length/3)} vs ${String(a)} vertices`)}let d=u?o:null;p&&d&&km(p,d)&&(console.warn(`[d3d-viewer] «${e.name}»: colors≈marker (краска в слое Цвет) — слой Цвет отключён`),d=null),this.scene.add(_);const b=p?lc(p,d,s):null;this.meshEntries.set(e.id,{mesh:_,name:e.name,markerColors:p,markerPaintOnSolid:b,baseVertexColors:d,baseDisplayColors:m,usesFileVertexColors:d!==null,baseColor:s.clone(),flatShading:e.flat_shading,restMatrix:Array.from(_.matrix.elements),jaw:e.jaw==="upper"||e.jaw==="lower"?e.jaw:ps({id:e.id,name:e.name,jaw:e.jaw}),photo:!1})}this.rebuildContentBox(),this.applyCamera(t.camera),this.buildComments(t),this.buildMeasurements(t),this.applyLayers(),this.setFlatShading(this.flatShading),this.syncCamera(),await this.contacts.loadSidecar(hr(t)??t.articulator)}applyTheme(t){document.documentElement.dataset.theme=t,this.renderer.setClearColor(2763312,1)}applyPresentation(t,e){this.applyTheme(e);const i=Ea[t];this.ambientLight.intensity=i.ambient*ja,this.hemisphereLight.intensity=i.hemisphere*ja*Ka,this.keyLight.intensity=i.key*Ya,this.fillLight.intensity=i.fill*Ya*Ka,ya(this.keyLight,this.fillLight,this.hemisphereLight),this.keyLightOffset.copy(wp(t)),this.renderer.toneMapping=1,this.renderer.toneMappingExposure=ba()}toggleAllVisible(){const e=![...this.meshEntries.values()].every(i=>i.mesh.visible);for(const i of this.meshEntries.keys())this.setMeshVisible(i,e);return e}getMeshInfos(){return[...this.meshEntries.entries()].map(([t,e])=>({id:t,name:e.name}))}hasContactMaps(){return this.contacts.hasMaps()}hasContactImprint(){return this.contacts.hasImprint()}canShowContacts(){return this.contacts.hasMaps()}canShowContactsOnJaws(){return this.contacts.hasJawScanMaps()}isContactsEnabled(){return this.contacts.enabled}isContactsDynamicEnabled(){return this.contacts.dynamicEnabled}isContactsOnJawsEnabled(){return this.contacts.showOnJaws}setContactsEnabled(t){try{this.contacts.setEnabled(t),t||this.contacts.setShowOnJaws(!1)}catch(e){console.warn("[d3d-viewer] contacts toggle failed",e)}}setContactsDynamicEnabled(t){try{this.contacts.setDynamicEnabled(t)}catch(e){console.warn("[d3d-viewer] contacts dynamic toggle failed",e)}}setContactsOnJawsEnabled(t){try{t&&!this.contacts.enabled&&this.contacts.setEnabled(!0),this.contacts.setShowOnJaws(t)}catch(e){console.warn("[d3d-viewer] contacts on jaws toggle failed",e)}}applyArticulatorContactFrame(t,e){this.contacts.applyFrame(t,e)}getRestMatrix(t){const e=this.meshEntries.get(t);return e?[...e.restMatrix]:null}setMeshMatrix(t,e){const i=this.meshEntries.get(t);!i||e.length!==16||(i.mesh.matrix.fromArray(e),i.mesh.matrixAutoUpdate=!1,i.mesh.updateMatrixWorld(!0))}allMeshesHidden(){return[...this.meshEntries.values()].every(t=>!t.mesh.visible)}applyCamera(t){const e=t&&typeof t=="object"?t.view:void 0,i=t&&typeof t=="object"?t.pivot:void 0,r=!!e&&Array.isArray(i)&&i.length>=3;r&&yp(this.camera,this.controls,t,this.aspect(),this.contentBox),this.fitToContent({preserveRotation:r})}rebuildContentBox(){this.contentBox.makeEmpty();const t=new Je;for(const e of this.meshEntries.values())e.mesh.updateMatrixWorld(!0),t.setFromObject(e.mesh),t.isEmpty()||this.contentBox.union(t)}fitToContent(t){this.rebuildContentBox(),!this.contentBox.isEmpty()&&(Mp(this.camera,this.controls.state,this.contentBox,e=>{this.controls.setPivotKeepingView(e)},this.aspect(),{preserveRotation:t?.preserveRotation!==!1}),this.syncCamera())}syncCamera(){pe(this.camera,this.controls.state,this.aspect(),this.controls.getPivot())}buildComments(t){for(const e of t.comments){const i=new qi(1,12,12),r=new ci({color:16746666,depthTest:!1}),s=new Re(i,r);s.position.set(e.x,e.y,e.z),s.userData={commentId:e.id,text:e.text},this.commentGroup.add(s);const a=document.createElement("div");a.className="comment-bubble",a.textContent=e.text||"(пусто)",a.dataset.commentId=e.id,this.bubbleRoot.appendChild(a)}}buildMeasurements(t){for(const e of t.measurements){const i=new P(e.ax,e.ay,e.az),r=new P(e.bx,e.by,e.bz),s=e.kind==="thickness"?4508927:16763972,a=new He().setFromPoints([i,r]),o=new gl(a,new Zs({color:s}));o.userData={kind:e.kind,id:e.id,isMeasureLine:!0};const c=this.makeMeasureHandle(i,s,e.kind,e.id),l=this.makeMeasureHandle(r,s,e.kind,e.id);this.measureGroup.add(o,c,l);const h=document.createElement("div");h.className=`measure-label ${e.kind}`,h.textContent=`${e.distance_mm.toFixed(2)} mm`,h.dataset.measureId=e.id,this.labelRoot.appendChild(h)}}makeMeasureHandle(t,e,i,r){const s=new qi(sc,12,12),a=new ci({color:e,depthTest:!1,transparent:!0,opacity:.95}),o=new Re(s,a);return o.position.copy(t),o.renderOrder=900,o.userData={kind:i,id:r,isMeasureHandle:!0},o}applyLayers(){this.commentGroup.visible=this.layers.comments;for(const t of this.bubbleRoot.children)t.style.display=this.layers.comments?"":"none";for(const t of this.measureGroup.children){const e=t.userData.kind,i=e==="ruler"&&this.layers.ruler||e==="thickness"&&this.layers.thickness;t.visible=i}for(const t of this.labelRoot.children){const e=t,i=e.classList.contains("thickness");e.style.display=i&&this.layers.thickness||!i&&this.layers.ruler?"":"none"}for(const[,t]of this.meshEntries){if(t.photo)continue;const e=t.mesh.geometry,i=t.mesh.material.opacity??1,r=e.getAttribute("position")?.count??0,s=this.layers.marker&&_s(t.markerColors,r),a=this.vertexColorsEnabled&&t.usesFileVertexColors&&t.baseVertexColors&&fr(t.baseVertexColors,r);let o=null;s&&a&&t.markerColors?o=t.markerColors:s&&t.markerPaintOnSolid?o=t.markerPaintOnSolid:a&&t.baseVertexColors&&(o=t.baseVertexColors),o?(this.ensureLitPhongMaterial(t,i),Vm(e,t.mesh.material,o)):(this.ensureLitPhongMaterial(t,i),Hm(e,t.mesh.material,t.baseColor))}this.contacts.enabled&&this.contacts.refreshAfterMaterialChange()}ensureLitPhongMaterial(t,e){const i=t.mesh.material;if(i instanceof Gr){i.opacity=e,i.transparent=e<.999,i.depthWrite=e>.999,i.flatShading=t.flatShading;return}i instanceof xn&&i.dispose(),t.mesh.material=hc({solidColor:t.baseColor,opacity:e,flatShading:t.flatShading,vertexColors:!1})}toggleMeshVisible(t){const e=this.meshEntries.get(t);e&&this.setMeshVisible(t,!e.mesh.visible)}setMeshVisible(t,e){const i=this.meshEntries.get(t);if(!i||i.mesh.visible===e)return;if(i.mesh.visible=e,!e)this.hiddenMeshStack.push(t);else for(let s=this.hiddenMeshStack.length-1;s>=0;s-=1)this.hiddenMeshStack[s]===t&&this.hiddenMeshStack.splice(s,1);const r=document.querySelector(`.mesh-panel__item[data-mesh-id="${t}"]`);if(r){r.classList.toggle("mesh-panel__item--hidden",!e);const s=r.querySelector(".mesh-panel__visibility");s&&(s.classList.toggle("mesh-panel__visibility--hidden",!e),s.innerHTML=e?gi:_i)}}setMeshOpacity(t,e){const r=this.meshEntries.get(t).mesh.material;r.opacity=e,r.transparent=e<.999,r.depthWrite=e>.999,r.needsUpdate=!0;const s=document.querySelector(`[data-op-value="${t}"]`);s&&(s.textContent=`${Math.round(e*100)}%`),Zp(t,e)}setMeshColor(t){this.meshColor=t;const e=pc(t);for(const[,i]of this.meshEntries)if(!i.usesFileVertexColors){i.baseColor.copy(e);const r=i.mesh.geometry.getAttribute("position").count;i.baseDisplayColors=vs(e,r),i.markerColors&&(i.markerPaintOnSolid=lc(i.markerColors,i.baseVertexColors,e))}this.applyLayers()}setVertexColorsEnabled(t){this.vertexColorsEnabled=t,this.applyLayers()}isVertexColorsEnabled(){return this.vertexColorsEnabled}hasIndependentVertexColors(){for(const[,t]of this.meshEntries)if(t.usesFileVertexColors&&t.baseVertexColors)return!0;return!1}setFlatShading(t){this.flatShading=t;for(const[,e]of this.meshEntries){e.flatShading=t;const i=e.mesh.geometry;i.getAttribute("normal")||i.computeVertexNormals();const r=e.mesh.material;r instanceof Gr&&(r.flatShading=!t,r.needsUpdate=!0)}}isFlatShadingEnabled(){return this.flatShading}snapView(t){dp(this.camera,this.controls.state,t,this.aspect(),this.controls.getPivot(),{resetPan:!0}),this.syncCamera()}applyExocadView(t){if(this.rebuildContentBox(),this.contentBox.isEmpty())return;if(t.camera_matrix&&t.camera_matrix.length===16){const i=Gf(this.camera,this.controls.state,Array.from(t.camera_matrix),this.aspect(),this.contentBox);this.controls.setPivotKeepingView(i),this.syncCamera();return}const e=xa(t);if(e){this.snapView(e);return}this.fitToContent()}getViewportRotation(){return this.controls.state.rotation.clone()}updateLighting(){this.keyLight.position.copy(this.keyLightOffset),this.fillLight.position.copy(Tp);const t=this.controls.getPivot();this.keyLight.target.position.copy(t),this.fillLight.target.position.copy(t),this.keyLight.target.updateMatrixWorld(),this.fillLight.target.updateMatrixWorld()}aspect(){const t=this.viewportWrap.clientWidth||this.canvas.clientWidth,e=this.viewportWrap.clientHeight||this.canvas.clientHeight;return e>0?t/e:1}resize(){const t=this.viewportWrap.clientWidth||this.canvas.clientWidth,e=this.viewportWrap.clientHeight||this.canvas.clientHeight;this.renderer.setSize(t,e,!1),this.syncCamera()}projectLabels(){const t=this.renderer.domElement,e=t.clientWidth,i=t.clientHeight,r=a=>{const o=a.clone().project(this.camera);return o.z>1||o.z<-1?{x:0,y:0,ok:!1}:{x:(o.x*.5+.5)*e,y:(-o.y*.5+.5)*i,ok:!0}};for(const a of this.commentGroup.children){const o=a.userData.commentId,c=this.bubbleRoot.querySelector(`[data-comment-id="${o}"]`);if(!c)continue;const l=r(a.position);c.style.display=l.ok&&this.layers.comments?"block":"none",c.style.left=`${String(l.x)}px`,c.style.top=`${String(l.y)}px`}let s=0;for(const a of this.measureGroup.children){if(!a.userData.isMeasureLine)continue;const o=this.labelRoot.children[s];if(s+=1,!o)continue;const l=a.geometry.getAttribute("position"),h=new P((l.getX(0)+l.getX(1))/2,(l.getY(0)+l.getY(1))/2,(l.getZ(0)+l.getZ(1))/2),u=r(h),f=a.userData.kind,m=f==="ruler"&&this.layers.ruler||f==="thickness"&&this.layers.thickness;o.style.display=u.ok&&m?"block":"none",o.style.left=`${String(u.x)}px`,o.style.top=`${String(u.y)}px`}}updateMeasurementHandles(){const t=this.canvas.clientHeight;if(t<=0)return;const i=Df(this.camera,t)*Um/sc;for(const r of this.measureGroup.children)r.userData.isMeasureHandle&&r.scale.set(i,i,i)}render(){this.controls.tickPivotPanAnim(),this.updateLighting(),this.updateMeasurementHandles(),this.renderer.render(this.scene,this.camera),this.projectLabels()}}function tg(n){return{comments:n.comments.length>0,ruler:n.measurements.some(t=>t.kind==="ruler"),thickness:n.measurements.some(t=>t.kind==="thickness"),marker:n.meshes.some(t=>{if(!t.buffers.marker_colors_b64)return!1;try{const e=ac(t.buffers.marker_colors_b64),i=t.buffers.vertex_count||Math.floor(e.length/3);return _s(e,i)}catch{return!1}})}}function eg(n,t){const e=document.getElementById("layers-dock"),i=tg(t),r=n.hasIndependentVertexColors(),s=i.comments||i.ruler||i.thickness||i.marker;e&&(e.hidden=!1);const a=()=>{for(const b of["comments","ruler","thickness","marker"]){const y=document.querySelector(`#layers-dock [data-layer="${b}"]`);if(!y)continue;const E=i[b];y.hidden=!E,E&&y.classList.toggle("layers-dock__btn--active",n.layers[b])}const l=document.querySelector("#layers-dock [data-layers-sep]");l&&(l.hidden=!s);const h=document.getElementById("flat-shading");if(h){const b=n.isFlatShadingEnabled();h.classList.toggle("layers-dock__btn--active",b),h.setAttribute("aria-pressed",b?"true":"false")}const u=document.getElementById("flat-shading-mobile");if(u){const b=n.isFlatShadingEnabled();u.classList.toggle("layers-dock__btn--active",b),u.setAttribute("aria-pressed",b?"true":"false")}const f=document.getElementById("vertex-colors");f&&(f.hidden=!r,f.classList.toggle("layers-dock__btn--active",n.isVertexColorsEnabled()));const m=document.getElementById("vertex-colors-mobile");m&&(m.hidden=!r,m.classList.toggle("layers-dock__btn--active",n.isVertexColorsEnabled()));const g=n.canShowContacts(),_=n.hasContactImprint(),p=n.canShowContactsOnJaws();for(const b of["html-contacts","html-contacts-mobile"]){const y=document.getElementById(b);y&&(y.hidden=!g,y.classList.toggle("layers-dock__btn--active",n.isContactsEnabled()),y.classList.toggle("mobile-contacts-bar__btn--active",n.isContactsEnabled()),y.setAttribute("aria-pressed",n.isContactsEnabled()?"true":"false"))}for(const b of["html-contacts-dynamic","html-contacts-dynamic-mobile"]){const y=document.getElementById(b);y&&(y.hidden=!_,y.classList.toggle("layers-dock__btn--active",n.isContactsDynamicEnabled()),y.classList.toggle("mobile-contacts-bar__btn--active",n.isContactsDynamicEnabled()),y.setAttribute("aria-pressed",n.isContactsDynamicEnabled()?"true":"false"))}for(const b of["html-contacts-jaws","html-contacts-jaws-mobile"]){const y=document.getElementById(b);y&&(y.hidden=!p,y.classList.toggle("layers-dock__btn--active",n.isContactsOnJawsEnabled()),y.classList.toggle("mobile-contacts-bar__btn--active",n.isContactsOnJawsEnabled()),y.setAttribute("aria-pressed",n.isContactsOnJawsEnabled()?"true":"false"))}const d=document.getElementById("mobile-contacts-bar");d&&(d.hidden=!(g||_||p))};for(const l of["comments","ruler","thickness","marker"]){const h=document.querySelector(`#layers-dock [data-layer="${l}"]`);!h||!i[l]||h.addEventListener("click",()=>{n.layers[l]=!n.layers[l],n.applyLayers(),a()})}n.layers.comments=i.comments,n.layers.ruler=i.ruler,n.layers.thickness=i.thickness,n.layers.marker=i.marker,n.applyLayers(),a(),window.addEventListener("keydown",l=>{if(l.key!=="f"&&l.key!=="F")return;const h=l.target;h&&(h.tagName==="INPUT"||h.tagName==="TEXTAREA"||h.isContentEditable)||(l.preventDefault(),n.fitToContent())});const o=document.getElementById("flat-shading");o&&o.addEventListener("click",()=>{n.setFlatShading(!n.isFlatShadingEnabled()),a()});const c=document.getElementById("vertex-colors");c&&r&&c.addEventListener("click",()=>{n.setVertexColorsEnabled(!n.isVertexColorsEnabled()),a()});for(const l of["html-contacts","html-contacts-mobile"])document.getElementById(l)?.addEventListener("click",()=>{n.setContactsEnabled(!n.isContactsEnabled()),a()});for(const l of["html-contacts-dynamic","html-contacts-dynamic-mobile"])document.getElementById(l)?.addEventListener("click",()=>{n.setContactsDynamicEnabled(!n.isContactsDynamicEnabled()),n.isContactsDynamicEnabled()&&!n.isContactsEnabled()&&n.setContactsEnabled(!0),a()});for(const l of["html-contacts-jaws","html-contacts-jaws-mobile"])document.getElementById(l)?.addEventListener("click",()=>{n.setContactsOnJawsEnabled(!n.isContactsOnJawsEnabled()),a()});a()}function ng(n,t){const e=document.getElementById("mesh-list");e&&(za(e,n,t,{visibilityAll:"mesh-panel-visibility-all",collapseAll:"mesh-panel-collapse-all"}),document.getElementById("viewport")?.addEventListener("pointerdown",i=>{if(n.pickMeshId(i.clientX,i.clientY))return;document.querySelector("#mesh-list .mesh-panel__group:not(.mesh-panel__group--collapsed)")&&document.getElementById("mesh-panel-collapse-all")?.click()}))}function ig(n,t){const e=document.getElementById("exocad-views-panel"),i=document.getElementById("exocad-views-list"),r=document.getElementById("exocad-views-collapse");if(!e||!i)return;const s=(t.views??[]).filter(Ep);if(s.length===0){e.classList.add("exocad-views-panel--hidden");return}e.classList.remove("exocad-views-panel--hidden"),i.replaceChildren();let a=!1;r&&(r.innerHTML=mn,r.addEventListener("click",o=>{o.stopPropagation(),a=!a,e.classList.toggle("exocad-views-panel--collapsed",a),r.innerHTML=a?vi:mn}));for(const o of s){const c=document.createElement("li");if(c.className="exocad-views-panel__item",c.title=va(o.label),o.thumbnail_png_b64){const h=document.createElement("img");h.className="exocad-views-panel__thumb",h.alt=o.label,h.src=`data:image/png;base64,${o.thumbnail_png_b64}`,c.appendChild(h)}else{const h=document.createElement("span");h.className="exocad-views-panel__thumb exocad-views-panel__thumb--empty",h.textContent="◫",c.appendChild(h)}const l=document.createElement("span");l.className="exocad-views-panel__label",l.textContent=va(o.label),c.appendChild(l),c.addEventListener("click",()=>{n.applyExocadView(o)}),i.appendChild(c)}}function mc(n,t){const e=document.getElementById("password-gate"),i=document.getElementById("app"),r=document.getElementById("password-error"),s=document.getElementById("password-input"),a=document.getElementById("password-submit"),o=document.getElementById("password-hint");e.classList.remove("hidden"),i.hidden=!0,r&&(r.style.display="block",r.textContent=n),s&&(s.style.display=t?"":"none"),a&&(a.style.display=t?"":"none"),o&&(o.style.display=t?"":"none")}async function gc(){const n=document.getElementById("password-gate"),t=document.getElementById("app"),e=document.getElementById("d3d-scene-encrypted"),i=dc();n.classList.add("hidden");const r=e!=null&&!i,s=async a=>{const o=await Jm(a);o.meshes=o.meshes.filter(m=>!Kp(m));const c=document.getElementById("viewport-wrap"),l=document.getElementById("viewport"),h=$o(ua({quaternion:[0,0,0,1],zoom:1,frustumHalfHeight:100,viewDistance:500,near:.1,far:1e5,panX:0,panY:0}));t.hidden=!1,n.classList.add("hidden"),t.offsetHeight;const u=new $m(l,c,document.getElementById("comment-bubbles"),document.getElementById("measure-labels"),h);await u.load(o),u.resize(),eg(u,o),ng(u,o),ig(u,o),Tm(document.getElementById("view-orientation-mount"),m=>{u.snapView(m)});try{am(u,o)}catch(m){console.error(m)}Rm(u,o),u.resize(),u.fitToContent();const f=()=>{u.resize(),u.render(),requestAnimationFrame(f)};f()};if(r)n.classList.remove("hidden"),document.getElementById("password-submit").addEventListener("click",()=>{const a=document.getElementById("password-input").value;s(a).catch(o=>{const c=o instanceof DOMException||o instanceof Error&&/decrypt|OperationError|NEED_PASSWORD/i.test(o.message);mc(c?"Неверный пароль":o instanceof Error?o.message:"Не удалось открыть сцену",!0)})});else try{await s()}catch(a){console.error(a),mc(a instanceof Error?a.message:"Не удалось открыть сцену",!1)}}function rg(){document.addEventListener("contextmenu",n=>n.preventDefault()),document.addEventListener("dragstart",n=>n.preventDefault()),document.addEventListener("keydown",n=>{const t=n.key.toLowerCase();(n.ctrlKey||n.metaKey)&&(t==="s"||t==="p")&&n.preventDefault()})}window.D3dSceneViewer={boot:gc},rg(),gc()})();
