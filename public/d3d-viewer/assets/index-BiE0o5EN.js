(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function e(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(s){if(s.ep)return;s.ep=!0;const r=e(s);fetch(s.href,r)}})();/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const zo="172",Zh=0,da=1,Qh=2,fl=1,$h=2,cn=3,Cn=0,Ae=1,Ye=2,Tn=0,fi=1,fa=2,pa=3,ma=4,tu=5,kn=100,eu=101,nu=102,iu=103,su=104,ru=200,ou=201,au=202,cu=203,qr=204,jr=205,lu=206,hu=207,uu=208,du=209,fu=210,pu=211,mu=212,gu=213,_u=214,Kr=0,Jr=1,Zr=2,gi=3,Qr=4,$r=5,to=6,eo=7,Ho=0,vu=1,xu=2,An=0,no=1,Mu=2,yu=3,Su=4,Eu=5,bu=6,wu=7,pl=300,_i=301,vi=302,io=303,so=304,Zs=306,ro=1e3,Gn=1001,oo=1002,Le=1003,Tu=1004,ts=1005,$e=1006,ir=1007,Wn=1008,fn=1009,ml=1010,gl=1011,Yi=1012,Vo=1013,Xn=1014,ln=1015,Ki=1016,Go=1017,Wo=1018,xi=1020,_l=35902,vl=1021,xl=1022,Be=1023,Ml=1024,yl=1025,pi=1026,Mi=1027,Sl=1028,Xo=1029,El=1030,Yo=1031,qo=1033,Ds=33776,Ls=33777,Is=33778,Us=33779,ao=35840,co=35841,lo=35842,ho=35843,uo=36196,fo=37492,po=37496,mo=37808,go=37809,_o=37810,vo=37811,xo=37812,Mo=37813,yo=37814,So=37815,Eo=37816,bo=37817,wo=37818,To=37819,Ao=37820,Co=37821,Fs=36492,Ro=36494,Po=36495,bl=36283,Do=36284,Lo=36285,Io=36286,Au=3200,Cu=3201,wl=0,Ru=1,bn="",be="srgb",yi="srgb-linear",Vs="linear",Jt="srgb",Kn=7680,ga=519,Pu=512,Du=513,Lu=514,Tl=515,Iu=516,Uu=517,Fu=518,Nu=519,_a=35044,Bu=35048,va="300 es",hn=2e3,Gs=2001;class wi{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const i=this._listeners;return i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const s=this._listeners[t];if(s!==void 0){const r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const i=this._listeners[t.type];if(i!==void 0){t.target=this;const s=i.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}}const ve=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let xa=1234567;const zi=Math.PI/180,qi=180/Math.PI;function Ti(){const n=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(ve[n&255]+ve[n>>8&255]+ve[n>>16&255]+ve[n>>24&255]+"-"+ve[t&255]+ve[t>>8&255]+"-"+ve[t>>16&15|64]+ve[t>>24&255]+"-"+ve[e&63|128]+ve[e>>8&255]+"-"+ve[e>>16&255]+ve[e>>24&255]+ve[i&255]+ve[i>>8&255]+ve[i>>16&255]+ve[i>>24&255]).toLowerCase()}function Bt(n,t,e){return Math.max(t,Math.min(e,n))}function jo(n,t){return(n%t+t)%t}function Ou(n,t,e,i,s){return i+(n-t)*(s-i)/(e-t)}function ku(n,t,e){return n!==t?(e-n)/(t-n):0}function Hi(n,t,e){return(1-e)*n+e*t}function zu(n,t,e,i){return Hi(n,t,1-Math.exp(-e*i))}function Hu(n,t=1){return t-Math.abs(jo(n,t*2)-t)}function Vu(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*(3-2*n))}function Gu(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*n*(n*(n*6-15)+10))}function Wu(n,t){return n+Math.floor(Math.random()*(t-n+1))}function Xu(n,t){return n+Math.random()*(t-n)}function Yu(n){return n*(.5-Math.random())}function qu(n){n!==void 0&&(xa=n);let t=xa+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function ju(n){return n*zi}function Ku(n){return n*qi}function Ju(n){return(n&n-1)===0&&n!==0}function Zu(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function Qu(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function $u(n,t,e,i,s){const r=Math.cos,o=Math.sin,a=r(e/2),c=o(e/2),l=r((t+i)/2),h=o((t+i)/2),u=r((t-i)/2),d=o((t-i)/2),m=r((i-t)/2),g=o((i-t)/2);switch(s){case"XYX":n.set(a*h,c*u,c*d,a*l);break;case"YZY":n.set(c*d,a*h,c*u,a*l);break;case"ZXZ":n.set(c*u,c*d,a*h,a*l);break;case"XZX":n.set(a*h,c*g,c*m,a*l);break;case"YXY":n.set(c*m,a*h,c*g,a*l);break;case"ZYZ":n.set(c*g,c*m,a*h,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function hi(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function Se(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const Vi={DEG2RAD:zi,RAD2DEG:qi,generateUUID:Ti,clamp:Bt,euclideanModulo:jo,mapLinear:Ou,inverseLerp:ku,lerp:Hi,damp:zu,pingpong:Hu,smoothstep:Vu,smootherstep:Gu,randInt:Wu,randFloat:Xu,randFloatSpread:Yu,seededRandom:qu,degToRad:ju,radToDeg:Ku,isPowerOfTwo:Ju,ceilPowerOfTwo:Zu,floorPowerOfTwo:Qu,setQuaternionFromProperEuler:$u,normalize:Se,denormalize:hi};class Ht{constructor(t=0,e=0){Ht.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,i=this.y,s=t.elements;return this.x=s[0]*e+s[3]*i+s[6],this.y=s[1]*e+s[4]*i+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Bt(this.x,t.x,e.x),this.y=Bt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Bt(this.x,t,e),this.y=Bt(this.y,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Bt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(Bt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const i=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*i-o*s+t.x,this.y=r*s+o*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Lt{constructor(t,e,i,s,r,o,a,c,l){Lt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,o,a,c,l)}set(t,e,i,s,r,o,a,c,l){const h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=c,h[6]=i,h[7]=o,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,s=e.elements,r=this.elements,o=i[0],a=i[3],c=i[6],l=i[1],h=i[4],u=i[7],d=i[2],m=i[5],g=i[8],_=s[0],p=s[3],f=s[6],b=s[1],y=s[4],E=s[7],L=s[2],T=s[5],R=s[8];return r[0]=o*_+a*b+c*L,r[3]=o*p+a*y+c*T,r[6]=o*f+a*E+c*R,r[1]=l*_+h*b+u*L,r[4]=l*p+h*y+u*T,r[7]=l*f+h*E+u*R,r[2]=d*_+m*b+g*L,r[5]=d*p+m*y+g*T,r[8]=d*f+m*E+g*R,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8];return e*o*h-e*a*l-i*r*h+i*a*c+s*r*l-s*o*c}invert(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8],u=h*o-a*l,d=a*c-h*r,m=l*r-o*c,g=e*u+i*d+s*m;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return t[0]=u*_,t[1]=(s*l-h*i)*_,t[2]=(a*i-s*o)*_,t[3]=d*_,t[4]=(h*e-s*c)*_,t[5]=(s*r-a*e)*_,t[6]=m*_,t[7]=(i*c-l*e)*_,t[8]=(o*e-i*r)*_,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,s,r,o,a){const c=Math.cos(r),l=Math.sin(r);return this.set(i*c,i*l,-i*(c*o+l*a)+o+t,-s*l,s*c,-s*(-l*o+c*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(sr.makeScale(t,e)),this}rotate(t){return this.premultiply(sr.makeRotation(-t)),this}translate(t,e){return this.premultiply(sr.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,i=t.elements;for(let s=0;s<9;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const sr=new Lt;function Al(n){for(let t=n.length-1;t>=0;--t)if(n[t]>=65535)return!0;return!1}function Ws(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function td(){const n=Ws("canvas");return n.style.display="block",n}const Ma={};function ui(n){n in Ma||(Ma[n]=!0,console.warn(n))}function ed(n,t,e){return new Promise(function(i,s){function r(){switch(n.clientWaitSync(t,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:i()}}setTimeout(r,e)})}function nd(n){const t=n.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function id(n){const t=n.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const ya=new Lt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Sa=new Lt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function sd(){const n={enabled:!0,workingColorSpace:yi,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===Jt&&(s.r=un(s.r),s.g=un(s.g),s.b=un(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===Jt&&(s.r=mi(s.r),s.g=mi(s.g),s.b=mi(s.b))),s},fromWorkingColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},toWorkingColorSpace:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===bn?Vs:this.spaces[s].transfer},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[yi]:{primaries:t,whitePoint:i,transfer:Vs,toXYZ:ya,fromXYZ:Sa,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:be},outputColorSpaceConfig:{drawingBufferColorSpace:be}},[be]:{primaries:t,whitePoint:i,transfer:Jt,toXYZ:ya,fromXYZ:Sa,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:be}}}),n}const Yt=sd();function un(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function mi(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Jn;class rd{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{Jn===void 0&&(Jn=Ws("canvas")),Jn.width=t.width,Jn.height=t.height;const i=Jn.getContext("2d");t instanceof ImageData?i.putImageData(t,0,0):i.drawImage(t,0,0,t.width,t.height),e=Jn}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Ws("canvas");e.width=t.width,e.height=t.height;const i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);const s=i.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=un(r[o]/255)*255;return i.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(un(e[i]/255)*255):e[i]=un(e[i]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let od=0;class Cl{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:od++}),this.uuid=Ti(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(rr(s[o].image)):r.push(rr(s[o]))}else r=rr(s);i.url=r}return e||(t.images[this.uuid]=i),i}}function rr(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?rd.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let ad=0;class Me extends wi{constructor(t=Me.DEFAULT_IMAGE,e=Me.DEFAULT_MAPPING,i=Gn,s=Gn,r=$e,o=Wn,a=Be,c=fn,l=Me.DEFAULT_ANISOTROPY,h=bn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:ad++}),this.uuid=Ti(),this.name="",this.source=new Cl(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new Ht(0,0),this.repeat=new Ht(1,1),this.center=new Ht(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Lt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==pl)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case ro:t.x=t.x-Math.floor(t.x);break;case Gn:t.x=t.x<0?0:1;break;case oo:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case ro:t.y=t.y-Math.floor(t.y);break;case Gn:t.y=t.y<0?0:1;break;case oo:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Me.DEFAULT_IMAGE=null;Me.DEFAULT_MAPPING=pl;Me.DEFAULT_ANISOTROPY=1;class re{constructor(t=0,e=0,i=0,s=1){re.prototype.isVector4=!0,this.x=t,this.y=e,this.z=i,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,s){return this.x=t,this.y=e,this.z=i,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,i=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*i+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*i+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*i+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*i+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,s,r;const c=t.elements,l=c[0],h=c[4],u=c[8],d=c[1],m=c[5],g=c[9],_=c[2],p=c[6],f=c[10];if(Math.abs(h-d)<.01&&Math.abs(u-_)<.01&&Math.abs(g-p)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+_)<.1&&Math.abs(g+p)<.1&&Math.abs(l+m+f-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const y=(l+1)/2,E=(m+1)/2,L=(f+1)/2,T=(h+d)/4,R=(u+_)/4,A=(g+p)/4;return y>E&&y>L?y<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(y),s=T/i,r=R/i):E>L?E<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(E),i=T/s,r=A/s):L<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(L),i=R/r,s=A/r),this.set(i,s,r,e),this}let b=Math.sqrt((p-g)*(p-g)+(u-_)*(u-_)+(d-h)*(d-h));return Math.abs(b)<.001&&(b=1),this.x=(p-g)/b,this.y=(u-_)/b,this.z=(d-h)/b,this.w=Math.acos((l+m+f-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Bt(this.x,t.x,e.x),this.y=Bt(this.y,t.y,e.y),this.z=Bt(this.z,t.z,e.z),this.w=Bt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Bt(this.x,t,e),this.y=Bt(this.y,t,e),this.z=Bt(this.z,t,e),this.w=Bt(this.w,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Bt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class cd extends wi{constructor(t=1,e=1,i={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new re(0,0,t,e),this.scissorTest=!1,this.viewport=new re(0,0,t,e);const s={width:t,height:e,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:$e,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);const r=new Me(s,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);r.flipY=!1,r.generateMipmaps=i.generateMipmaps,r.internalFormat=i.internalFormat,this.textures=[];const o=i.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=i;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let i=0,s=t.textures.length;i<s;i++)this.textures[i]=t.textures[i].clone(),this.textures[i].isRenderTargetTexture=!0,this.textures[i].renderTarget=this;const e=Object.assign({},t.texture.image);return this.texture.source=new Cl(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Yn extends cd{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}}class Rl extends Me{constructor(t=null,e=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=Le,this.minFilter=Le,this.wrapR=Gn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class ld extends Me{constructor(t=null,e=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=Le,this.minFilter=Le,this.wrapR=Gn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ke{constructor(t=0,e=0,i=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=s}static slerpFlat(t,e,i,s,r,o,a){let c=i[s+0],l=i[s+1],h=i[s+2],u=i[s+3];const d=r[o+0],m=r[o+1],g=r[o+2],_=r[o+3];if(a===0){t[e+0]=c,t[e+1]=l,t[e+2]=h,t[e+3]=u;return}if(a===1){t[e+0]=d,t[e+1]=m,t[e+2]=g,t[e+3]=_;return}if(u!==_||c!==d||l!==m||h!==g){let p=1-a;const f=c*d+l*m+h*g+u*_,b=f>=0?1:-1,y=1-f*f;if(y>Number.EPSILON){const L=Math.sqrt(y),T=Math.atan2(L,f*b);p=Math.sin(p*T)/L,a=Math.sin(a*T)/L}const E=a*b;if(c=c*p+d*E,l=l*p+m*E,h=h*p+g*E,u=u*p+_*E,p===1-a){const L=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=L,l*=L,h*=L,u*=L}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,i,s,r,o){const a=i[s],c=i[s+1],l=i[s+2],h=i[s+3],u=r[o],d=r[o+1],m=r[o+2],g=r[o+3];return t[e]=a*g+h*u+c*m-l*d,t[e+1]=c*g+h*d+l*u-a*m,t[e+2]=l*g+h*m+a*d-c*u,t[e+3]=h*g-a*u-c*d-l*m,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,s){return this._x=t,this._y=e,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const i=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,c=Math.sin,l=a(i/2),h=a(s/2),u=a(r/2),d=c(i/2),m=c(s/2),g=c(r/2);switch(o){case"XYZ":this._x=d*h*u+l*m*g,this._y=l*m*u-d*h*g,this._z=l*h*g+d*m*u,this._w=l*h*u-d*m*g;break;case"YXZ":this._x=d*h*u+l*m*g,this._y=l*m*u-d*h*g,this._z=l*h*g-d*m*u,this._w=l*h*u+d*m*g;break;case"ZXY":this._x=d*h*u-l*m*g,this._y=l*m*u+d*h*g,this._z=l*h*g+d*m*u,this._w=l*h*u-d*m*g;break;case"ZYX":this._x=d*h*u-l*m*g,this._y=l*m*u+d*h*g,this._z=l*h*g-d*m*u,this._w=l*h*u+d*m*g;break;case"YZX":this._x=d*h*u+l*m*g,this._y=l*m*u+d*h*g,this._z=l*h*g-d*m*u,this._w=l*h*u-d*m*g;break;case"XZY":this._x=d*h*u-l*m*g,this._y=l*m*u-d*h*g,this._z=l*h*g+d*m*u,this._w=l*h*u+d*m*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const i=e/2,s=Math.sin(i);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,i=e[0],s=e[4],r=e[8],o=e[1],a=e[5],c=e[9],l=e[2],h=e[6],u=e[10],d=i+a+u;if(d>0){const m=.5/Math.sqrt(d+1);this._w=.25/m,this._x=(h-c)*m,this._y=(r-l)*m,this._z=(o-s)*m}else if(i>a&&i>u){const m=2*Math.sqrt(1+i-a-u);this._w=(h-c)/m,this._x=.25*m,this._y=(s+o)/m,this._z=(r+l)/m}else if(a>u){const m=2*Math.sqrt(1+a-i-u);this._w=(r-l)/m,this._x=(s+o)/m,this._y=.25*m,this._z=(c+h)/m}else{const m=2*Math.sqrt(1+u-i-a);this._w=(o-s)/m,this._x=(r+l)/m,this._y=(c+h)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<Number.EPSILON?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Bt(this.dot(t),-1,1)))}rotateTowards(t,e){const i=this.angleTo(t);if(i===0)return this;const s=Math.min(1,e/i);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const i=t._x,s=t._y,r=t._z,o=t._w,a=e._x,c=e._y,l=e._z,h=e._w;return this._x=i*h+o*a+s*l-r*c,this._y=s*h+o*c+r*a-i*l,this._z=r*h+o*l+i*c-s*a,this._w=o*h-i*a-s*c-r*l,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const i=this._x,s=this._y,r=this._z,o=this._w;let a=o*t._w+i*t._x+s*t._y+r*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=o,this._x=i,this._y=s,this._z=r,this;const c=1-a*a;if(c<=Number.EPSILON){const m=1-e;return this._w=m*o+e*this._w,this._x=m*i+e*this._x,this._y=m*s+e*this._y,this._z=m*r+e*this._z,this.normalize(),this}const l=Math.sqrt(c),h=Math.atan2(l,a),u=Math.sin((1-e)*h)/l,d=Math.sin(e*h)/l;return this._w=o*u+this._w*d,this._x=i*u+this._x*d,this._y=s*u+this._y*d,this._z=r*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class P{constructor(t=0,e=0,i=0){P.prototype.isVector3=!0,this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Ea.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Ea.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*i+r[6]*s,this.y=r[1]*e+r[4]*i+r[7]*s,this.z=r[2]*e+r[5]*i+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,i=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*i+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*i+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*i+r[10]*s+r[14])*o,this}applyQuaternion(t){const e=this.x,i=this.y,s=this.z,r=t.x,o=t.y,a=t.z,c=t.w,l=2*(o*s-a*i),h=2*(a*e-r*s),u=2*(r*i-o*e);return this.x=e+c*l+o*u-a*h,this.y=i+c*h+a*l-r*u,this.z=s+c*u+r*h-o*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*i+r[8]*s,this.y=r[1]*e+r[5]*i+r[9]*s,this.z=r[2]*e+r[6]*i+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Bt(this.x,t.x,e.x),this.y=Bt(this.y,t.y,e.y),this.z=Bt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Bt(this.x,t,e),this.y=Bt(this.y,t,e),this.z=Bt(this.z,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Bt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const i=t.x,s=t.y,r=t.z,o=e.x,a=e.y,c=e.z;return this.x=s*c-r*a,this.y=r*o-i*c,this.z=i*a-s*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return or.copy(this).projectOnVector(t),this.sub(or)}reflect(t){return this.sub(or.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(Bt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y,s=this.z-t.z;return e*e+i*i+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){const s=Math.sin(e)*t;return this.x=s*Math.sin(i),this.y=Math.cos(e)*t,this.z=s*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const or=new P,Ea=new ke;class pn{constructor(t=new P(1/0,1/0,1/0),e=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(Ve.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(Ve.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const i=Ve.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const i=t.geometry;if(i!==void 0){const r=i.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Ve):Ve.fromBufferAttribute(r,o),Ve.applyMatrix4(t.matrixWorld),this.expandByPoint(Ve);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),es.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),es.copy(i.boundingBox)),es.applyMatrix4(t.matrixWorld),this.union(es)}const s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Ve),Ve.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Pi),ns.subVectors(this.max,Pi),Zn.subVectors(t.a,Pi),Qn.subVectors(t.b,Pi),$n.subVectors(t.c,Pi),gn.subVectors(Qn,Zn),_n.subVectors($n,Qn),Ln.subVectors(Zn,$n);let e=[0,-gn.z,gn.y,0,-_n.z,_n.y,0,-Ln.z,Ln.y,gn.z,0,-gn.x,_n.z,0,-_n.x,Ln.z,0,-Ln.x,-gn.y,gn.x,0,-_n.y,_n.x,0,-Ln.y,Ln.x,0];return!ar(e,Zn,Qn,$n,ns)||(e=[1,0,0,0,1,0,0,0,1],!ar(e,Zn,Qn,$n,ns))?!1:(is.crossVectors(gn,_n),e=[is.x,is.y,is.z],ar(e,Zn,Qn,$n,ns))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Ve).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Ve).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(nn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),nn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),nn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),nn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),nn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),nn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),nn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),nn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(nn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const nn=[new P,new P,new P,new P,new P,new P,new P,new P],Ve=new P,es=new pn,Zn=new P,Qn=new P,$n=new P,gn=new P,_n=new P,Ln=new P,Pi=new P,ns=new P,is=new P,In=new P;function ar(n,t,e,i,s){for(let r=0,o=n.length-3;r<=o;r+=3){In.fromArray(n,r);const a=s.x*Math.abs(In.x)+s.y*Math.abs(In.y)+s.z*Math.abs(In.z),c=t.dot(In),l=e.dot(In),h=i.dot(In);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>a)return!1}return!0}const hd=new pn,Di=new P,cr=new P;class Qs{constructor(t=new P,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const i=this.center;e!==void 0?i.copy(e):hd.setFromPoints(t).getCenter(i);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,i.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Di.subVectors(t,this.center);const e=Di.lengthSq();if(e>this.radius*this.radius){const i=Math.sqrt(e),s=(i-this.radius)*.5;this.center.addScaledVector(Di,s/i),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(cr.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Di.copy(t.center).add(cr)),this.expandByPoint(Di.copy(t.center).sub(cr))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const sn=new P,lr=new P,ss=new P,vn=new P,hr=new P,rs=new P,ur=new P;class Ko{constructor(t=new P,e=new P(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,sn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=sn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(sn.copy(this.origin).addScaledVector(this.direction,e),sn.distanceToSquared(t))}distanceSqToSegment(t,e,i,s){lr.copy(t).add(e).multiplyScalar(.5),ss.copy(e).sub(t).normalize(),vn.copy(this.origin).sub(lr);const r=t.distanceTo(e)*.5,o=-this.direction.dot(ss),a=vn.dot(this.direction),c=-vn.dot(ss),l=vn.lengthSq(),h=Math.abs(1-o*o);let u,d,m,g;if(h>0)if(u=o*c-a,d=o*a-c,g=r*h,u>=0)if(d>=-g)if(d<=g){const _=1/h;u*=_,d*=_,m=u*(u+o*d+2*a)+d*(o*u+d+2*c)+l}else d=r,u=Math.max(0,-(o*d+a)),m=-u*u+d*(d+2*c)+l;else d=-r,u=Math.max(0,-(o*d+a)),m=-u*u+d*(d+2*c)+l;else d<=-g?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-c),r),m=-u*u+d*(d+2*c)+l):d<=g?(u=0,d=Math.min(Math.max(-r,-c),r),m=d*(d+2*c)+l):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-c),r),m=-u*u+d*(d+2*c)+l);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),m=-u*u+d*(d+2*c)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(lr).addScaledVector(ss,d),m}intersectSphere(t,e){sn.subVectors(t.center,this.origin);const i=sn.dot(this.direction),s=sn.dot(sn)-i*i,r=t.radius*t.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=i-o,c=i+o;return c<0?null:a<0?this.at(c,e):this.at(a,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){const i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,s,r,o,a,c;const l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return l>=0?(i=(t.min.x-d.x)*l,s=(t.max.x-d.x)*l):(i=(t.max.x-d.x)*l,s=(t.min.x-d.x)*l),h>=0?(r=(t.min.y-d.y)*h,o=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,o=(t.min.y-d.y)*h),i>o||r>s||((r>i||isNaN(i))&&(i=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(t.min.z-d.z)*u,c=(t.max.z-d.z)*u):(a=(t.max.z-d.z)*u,c=(t.min.z-d.z)*u),i>c||a>s)||((a>i||i!==i)&&(i=a),(c<s||s!==s)&&(s=c),s<0)?null:this.at(i>=0?i:s,e)}intersectsBox(t){return this.intersectBox(t,sn)!==null}intersectTriangle(t,e,i,s,r){hr.subVectors(e,t),rs.subVectors(i,t),ur.crossVectors(hr,rs);let o=this.direction.dot(ur),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;vn.subVectors(this.origin,t);const c=a*this.direction.dot(rs.crossVectors(vn,rs));if(c<0)return null;const l=a*this.direction.dot(hr.cross(vn));if(l<0||c+l>o)return null;const h=-a*vn.dot(ur);return h<0?null:this.at(h/o,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Zt{constructor(t,e,i,s,r,o,a,c,l,h,u,d,m,g,_,p){Zt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,o,a,c,l,h,u,d,m,g,_,p)}set(t,e,i,s,r,o,a,c,l,h,u,d,m,g,_,p){const f=this.elements;return f[0]=t,f[4]=e,f[8]=i,f[12]=s,f[1]=r,f[5]=o,f[9]=a,f[13]=c,f[2]=l,f[6]=h,f[10]=u,f[14]=d,f[3]=m,f[7]=g,f[11]=_,f[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Zt().fromArray(this.elements)}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){const e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,i=t.elements,s=1/ti.setFromMatrixColumn(t,0).length(),r=1/ti.setFromMatrixColumn(t,1).length(),o=1/ti.setFromMatrixColumn(t,2).length();return e[0]=i[0]*s,e[1]=i[1]*s,e[2]=i[2]*s,e[3]=0,e[4]=i[4]*r,e[5]=i[5]*r,e[6]=i[6]*r,e[7]=0,e[8]=i[8]*o,e[9]=i[9]*o,e[10]=i[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,i=t.x,s=t.y,r=t.z,o=Math.cos(i),a=Math.sin(i),c=Math.cos(s),l=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(t.order==="XYZ"){const d=o*h,m=o*u,g=a*h,_=a*u;e[0]=c*h,e[4]=-c*u,e[8]=l,e[1]=m+g*l,e[5]=d-_*l,e[9]=-a*c,e[2]=_-d*l,e[6]=g+m*l,e[10]=o*c}else if(t.order==="YXZ"){const d=c*h,m=c*u,g=l*h,_=l*u;e[0]=d+_*a,e[4]=g*a-m,e[8]=o*l,e[1]=o*u,e[5]=o*h,e[9]=-a,e[2]=m*a-g,e[6]=_+d*a,e[10]=o*c}else if(t.order==="ZXY"){const d=c*h,m=c*u,g=l*h,_=l*u;e[0]=d-_*a,e[4]=-o*u,e[8]=g+m*a,e[1]=m+g*a,e[5]=o*h,e[9]=_-d*a,e[2]=-o*l,e[6]=a,e[10]=o*c}else if(t.order==="ZYX"){const d=o*h,m=o*u,g=a*h,_=a*u;e[0]=c*h,e[4]=g*l-m,e[8]=d*l+_,e[1]=c*u,e[5]=_*l+d,e[9]=m*l-g,e[2]=-l,e[6]=a*c,e[10]=o*c}else if(t.order==="YZX"){const d=o*c,m=o*l,g=a*c,_=a*l;e[0]=c*h,e[4]=_-d*u,e[8]=g*u+m,e[1]=u,e[5]=o*h,e[9]=-a*h,e[2]=-l*h,e[6]=m*u+g,e[10]=d-_*u}else if(t.order==="XZY"){const d=o*c,m=o*l,g=a*c,_=a*l;e[0]=c*h,e[4]=-u,e[8]=l*h,e[1]=d*u+_,e[5]=o*h,e[9]=m*u-g,e[2]=g*u-m,e[6]=a*h,e[10]=_*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(ud,t,dd)}lookAt(t,e,i){const s=this.elements;return Re.subVectors(t,e),Re.lengthSq()===0&&(Re.z=1),Re.normalize(),xn.crossVectors(i,Re),xn.lengthSq()===0&&(Math.abs(i.z)===1?Re.x+=1e-4:Re.z+=1e-4,Re.normalize(),xn.crossVectors(i,Re)),xn.normalize(),os.crossVectors(Re,xn),s[0]=xn.x,s[4]=os.x,s[8]=Re.x,s[1]=xn.y,s[5]=os.y,s[9]=Re.y,s[2]=xn.z,s[6]=os.z,s[10]=Re.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,s=e.elements,r=this.elements,o=i[0],a=i[4],c=i[8],l=i[12],h=i[1],u=i[5],d=i[9],m=i[13],g=i[2],_=i[6],p=i[10],f=i[14],b=i[3],y=i[7],E=i[11],L=i[15],T=s[0],R=s[4],A=s[8],S=s[12],M=s[1],C=s[5],V=s[9],O=s[13],Y=s[2],z=s[6],W=s[10],K=s[14],H=s[3],st=s[7],ut=s[11],j=s[15];return r[0]=o*T+a*M+c*Y+l*H,r[4]=o*R+a*C+c*z+l*st,r[8]=o*A+a*V+c*W+l*ut,r[12]=o*S+a*O+c*K+l*j,r[1]=h*T+u*M+d*Y+m*H,r[5]=h*R+u*C+d*z+m*st,r[9]=h*A+u*V+d*W+m*ut,r[13]=h*S+u*O+d*K+m*j,r[2]=g*T+_*M+p*Y+f*H,r[6]=g*R+_*C+p*z+f*st,r[10]=g*A+_*V+p*W+f*ut,r[14]=g*S+_*O+p*K+f*j,r[3]=b*T+y*M+E*Y+L*H,r[7]=b*R+y*C+E*z+L*st,r[11]=b*A+y*V+E*W+L*ut,r[15]=b*S+y*O+E*K+L*j,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[4],s=t[8],r=t[12],o=t[1],a=t[5],c=t[9],l=t[13],h=t[2],u=t[6],d=t[10],m=t[14],g=t[3],_=t[7],p=t[11],f=t[15];return g*(+r*c*u-s*l*u-r*a*d+i*l*d+s*a*m-i*c*m)+_*(+e*c*m-e*l*d+r*o*d-s*o*m+s*l*h-r*c*h)+p*(+e*l*u-e*a*m-r*o*u+i*o*m+r*a*h-i*l*h)+f*(-s*a*h-e*c*u+e*a*d+s*o*u-i*o*d+i*c*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=i),this}invert(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8],u=t[9],d=t[10],m=t[11],g=t[12],_=t[13],p=t[14],f=t[15],b=u*p*l-_*d*l+_*c*m-a*p*m-u*c*f+a*d*f,y=g*d*l-h*p*l-g*c*m+o*p*m+h*c*f-o*d*f,E=h*_*l-g*u*l+g*a*m-o*_*m-h*a*f+o*u*f,L=g*u*c-h*_*c-g*a*d+o*_*d+h*a*p-o*u*p,T=e*b+i*y+s*E+r*L;if(T===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const R=1/T;return t[0]=b*R,t[1]=(_*d*r-u*p*r-_*s*m+i*p*m+u*s*f-i*d*f)*R,t[2]=(a*p*r-_*c*r+_*s*l-i*p*l-a*s*f+i*c*f)*R,t[3]=(u*c*r-a*d*r-u*s*l+i*d*l+a*s*m-i*c*m)*R,t[4]=y*R,t[5]=(h*p*r-g*d*r+g*s*m-e*p*m-h*s*f+e*d*f)*R,t[6]=(g*c*r-o*p*r-g*s*l+e*p*l+o*s*f-e*c*f)*R,t[7]=(o*d*r-h*c*r+h*s*l-e*d*l-o*s*m+e*c*m)*R,t[8]=E*R,t[9]=(g*u*r-h*_*r-g*i*m+e*_*m+h*i*f-e*u*f)*R,t[10]=(o*_*r-g*a*r+g*i*l-e*_*l-o*i*f+e*a*f)*R,t[11]=(h*a*r-o*u*r-h*i*l+e*u*l+o*i*m-e*a*m)*R,t[12]=L*R,t[13]=(h*_*s-g*u*s+g*i*d-e*_*d-h*i*p+e*u*p)*R,t[14]=(g*a*s-o*_*s-g*i*c+e*_*c+o*i*p-e*a*p)*R,t[15]=(o*u*s-h*a*s+h*i*c-e*u*c-o*i*d+e*a*d)*R,this}scale(t){const e=this.elements,i=t.x,s=t.y,r=t.z;return e[0]*=i,e[4]*=s,e[8]*=r,e[1]*=i,e[5]*=s,e[9]*=r,e[2]*=i,e[6]*=s,e[10]*=r,e[3]*=i,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,s))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const i=Math.cos(e),s=Math.sin(e),r=1-i,o=t.x,a=t.y,c=t.z,l=r*o,h=r*a;return this.set(l*o+i,l*a-s*c,l*c+s*a,0,l*a+s*c,h*a+i,h*c-s*o,0,l*c-s*a,h*c+s*o,r*c*c+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,s,r,o){return this.set(1,i,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,i){const s=this.elements,r=e._x,o=e._y,a=e._z,c=e._w,l=r+r,h=o+o,u=a+a,d=r*l,m=r*h,g=r*u,_=o*h,p=o*u,f=a*u,b=c*l,y=c*h,E=c*u,L=i.x,T=i.y,R=i.z;return s[0]=(1-(_+f))*L,s[1]=(m+E)*L,s[2]=(g-y)*L,s[3]=0,s[4]=(m-E)*T,s[5]=(1-(d+f))*T,s[6]=(p+b)*T,s[7]=0,s[8]=(g+y)*R,s[9]=(p-b)*R,s[10]=(1-(d+_))*R,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,i){const s=this.elements;let r=ti.set(s[0],s[1],s[2]).length();const o=ti.set(s[4],s[5],s[6]).length(),a=ti.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),t.x=s[12],t.y=s[13],t.z=s[14],Ge.copy(this);const l=1/r,h=1/o,u=1/a;return Ge.elements[0]*=l,Ge.elements[1]*=l,Ge.elements[2]*=l,Ge.elements[4]*=h,Ge.elements[5]*=h,Ge.elements[6]*=h,Ge.elements[8]*=u,Ge.elements[9]*=u,Ge.elements[10]*=u,e.setFromRotationMatrix(Ge),i.x=r,i.y=o,i.z=a,this}makePerspective(t,e,i,s,r,o,a=hn){const c=this.elements,l=2*r/(e-t),h=2*r/(i-s),u=(e+t)/(e-t),d=(i+s)/(i-s);let m,g;if(a===hn)m=-(o+r)/(o-r),g=-2*o*r/(o-r);else if(a===Gs)m=-o/(o-r),g=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=l,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=h,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,i,s,r,o,a=hn){const c=this.elements,l=1/(e-t),h=1/(i-s),u=1/(o-r),d=(e+t)*l,m=(i+s)*h;let g,_;if(a===hn)g=(o+r)*u,_=-2*u;else if(a===Gs)g=r*u,_=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-d,c[1]=0,c[5]=2*h,c[9]=0,c[13]=-m,c[2]=0,c[6]=0,c[10]=_,c[14]=-g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,i=t.elements;for(let s=0;s<16;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}}const ti=new P,Ge=new Zt,ud=new P(0,0,0),dd=new P(1,1,1),xn=new P,os=new P,Re=new P,ba=new Zt,wa=new ke;class tn{constructor(t=0,e=0,i=0,s=tn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,s=this._order){return this._x=t,this._y=e,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){const s=t.elements,r=s[0],o=s[4],a=s[8],c=s[1],l=s[5],h=s[9],u=s[2],d=s[6],m=s[10];switch(e){case"XYZ":this._y=Math.asin(Bt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,m),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Bt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,m),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Bt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,m),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-Bt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,m),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(Bt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,m));break;case"XZY":this._z=Math.asin(-Bt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,l),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,m),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return ba.makeRotationFromQuaternion(t),this.setFromRotationMatrix(ba,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return wa.setFromEuler(this),this.setFromQuaternion(wa,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}tn.DEFAULT_ORDER="XYZ";class Jo{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let fd=0;const Ta=new P,ei=new ke,rn=new Zt,as=new P,Li=new P,pd=new P,md=new ke,Aa=new P(1,0,0),Ca=new P(0,1,0),Ra=new P(0,0,1),Pa={type:"added"},gd={type:"removed"},ni={type:"childadded",child:null},dr={type:"childremoved",child:null};class fe extends wi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:fd++}),this.uuid=Ti(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=fe.DEFAULT_UP.clone();const t=new P,e=new tn,i=new ke,s=new P(1,1,1);function r(){i.setFromEuler(e,!1)}function o(){e.setFromQuaternion(i,void 0,!1)}e._onChange(r),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Zt},normalMatrix:{value:new Lt}}),this.matrix=new Zt,this.matrixWorld=new Zt,this.matrixAutoUpdate=fe.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=fe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Jo,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return ei.setFromAxisAngle(t,e),this.quaternion.multiply(ei),this}rotateOnWorldAxis(t,e){return ei.setFromAxisAngle(t,e),this.quaternion.premultiply(ei),this}rotateX(t){return this.rotateOnAxis(Aa,t)}rotateY(t){return this.rotateOnAxis(Ca,t)}rotateZ(t){return this.rotateOnAxis(Ra,t)}translateOnAxis(t,e){return Ta.copy(t).applyQuaternion(this.quaternion),this.position.add(Ta.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Aa,t)}translateY(t){return this.translateOnAxis(Ca,t)}translateZ(t){return this.translateOnAxis(Ra,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(rn.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?as.copy(t):as.set(t,e,i);const s=this.parent;this.updateWorldMatrix(!0,!1),Li.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?rn.lookAt(Li,as,this.up):rn.lookAt(as,Li,this.up),this.quaternion.setFromRotationMatrix(rn),s&&(rn.extractRotation(s.matrixWorld),ei.setFromRotationMatrix(rn),this.quaternion.premultiply(ei.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Pa),ni.child=t,this.dispatchEvent(ni),ni.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(gd),dr.child=t,this.dispatchEvent(dr),dr.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),rn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),rn.multiply(t.parent.matrixWorld)),t.applyMatrix4(rn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Pa),ni.child=t,this.dispatchEvent(ni),ni.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,s=this.children.length;i<s;i++){const o=this.children[i].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Li,t,pd),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Li,md,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e){const i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function r(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const u=c[l];r(t.shapes,u)}else r(t.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(r(t.materials,this.material[c]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const c=this.animations[a];s.animations.push(r(t.animations,c))}}if(e){const a=o(t.geometries),c=o(t.materials),l=o(t.textures),h=o(t.images),u=o(t.shapes),d=o(t.skeletons),m=o(t.animations),g=o(t.nodes);a.length>0&&(i.geometries=a),c.length>0&&(i.materials=c),l.length>0&&(i.textures=l),h.length>0&&(i.images=h),u.length>0&&(i.shapes=u),d.length>0&&(i.skeletons=d),m.length>0&&(i.animations=m),g.length>0&&(i.nodes=g)}return i.object=s,i;function o(a){const c=[];for(const l in a){const h=a[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){const s=t.children[i];this.add(s.clone())}return this}}fe.DEFAULT_UP=new P(0,1,0);fe.DEFAULT_MATRIX_AUTO_UPDATE=!0;fe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const We=new P,on=new P,fr=new P,an=new P,ii=new P,si=new P,Da=new P,pr=new P,mr=new P,gr=new P,_r=new re,vr=new re,xr=new re;class qe{constructor(t=new P,e=new P,i=new P){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,s){s.subVectors(i,e),We.subVectors(t,e),s.cross(We);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,i,s,r){We.subVectors(s,e),on.subVectors(i,e),fr.subVectors(t,e);const o=We.dot(We),a=We.dot(on),c=We.dot(fr),l=on.dot(on),h=on.dot(fr),u=o*l-a*a;if(u===0)return r.set(0,0,0),null;const d=1/u,m=(l*c-a*h)*d,g=(o*h-a*c)*d;return r.set(1-m-g,g,m)}static containsPoint(t,e,i,s){return this.getBarycoord(t,e,i,s,an)===null?!1:an.x>=0&&an.y>=0&&an.x+an.y<=1}static getInterpolation(t,e,i,s,r,o,a,c){return this.getBarycoord(t,e,i,s,an)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,an.x),c.addScaledVector(o,an.y),c.addScaledVector(a,an.z),c)}static getInterpolatedAttribute(t,e,i,s,r,o){return _r.setScalar(0),vr.setScalar(0),xr.setScalar(0),_r.fromBufferAttribute(t,e),vr.fromBufferAttribute(t,i),xr.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(_r,r.x),o.addScaledVector(vr,r.y),o.addScaledVector(xr,r.z),o}static isFrontFacing(t,e,i,s){return We.subVectors(i,e),on.subVectors(t,e),We.cross(on).dot(s)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,s){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,i,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return We.subVectors(this.c,this.b),on.subVectors(this.a,this.b),We.cross(on).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return qe.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return qe.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,s,r){return qe.getInterpolation(t,this.a,this.b,this.c,e,i,s,r)}containsPoint(t){return qe.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return qe.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const i=this.a,s=this.b,r=this.c;let o,a;ii.subVectors(s,i),si.subVectors(r,i),pr.subVectors(t,i);const c=ii.dot(pr),l=si.dot(pr);if(c<=0&&l<=0)return e.copy(i);mr.subVectors(t,s);const h=ii.dot(mr),u=si.dot(mr);if(h>=0&&u<=h)return e.copy(s);const d=c*u-h*l;if(d<=0&&c>=0&&h<=0)return o=c/(c-h),e.copy(i).addScaledVector(ii,o);gr.subVectors(t,r);const m=ii.dot(gr),g=si.dot(gr);if(g>=0&&m<=g)return e.copy(r);const _=m*l-c*g;if(_<=0&&l>=0&&g<=0)return a=l/(l-g),e.copy(i).addScaledVector(si,a);const p=h*g-m*u;if(p<=0&&u-h>=0&&m-g>=0)return Da.subVectors(r,s),a=(u-h)/(u-h+(m-g)),e.copy(s).addScaledVector(Da,a);const f=1/(p+_+d);return o=_*f,a=d*f,e.copy(i).addScaledVector(ii,o).addScaledVector(si,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const Pl={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Mn={h:0,s:0,l:0},cs={h:0,s:0,l:0};function Mr(n,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?n+(t-n)*6*e:e<1/2?t:e<2/3?n+(t-n)*6*(2/3-e):n}class Nt{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=be){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Yt.toWorkingColorSpace(this,e),this}setRGB(t,e,i,s=Yt.workingColorSpace){return this.r=t,this.g=e,this.b=i,Yt.toWorkingColorSpace(this,s),this}setHSL(t,e,i,s=Yt.workingColorSpace){if(t=jo(t,1),e=Bt(e,0,1),i=Bt(i,0,1),e===0)this.r=this.g=this.b=i;else{const r=i<=.5?i*(1+e):i+e-i*e,o=2*i-r;this.r=Mr(o,r,t+1/3),this.g=Mr(o,r,t),this.b=Mr(o,r,t-1/3)}return Yt.toWorkingColorSpace(this,s),this}setStyle(t,e=be){function i(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=be){const i=Pl[t.toLowerCase()];return i!==void 0?this.setHex(i,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=un(t.r),this.g=un(t.g),this.b=un(t.b),this}copyLinearToSRGB(t){return this.r=mi(t.r),this.g=mi(t.g),this.b=mi(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=be){return Yt.fromWorkingColorSpace(xe.copy(this),t),Math.round(Bt(xe.r*255,0,255))*65536+Math.round(Bt(xe.g*255,0,255))*256+Math.round(Bt(xe.b*255,0,255))}getHexString(t=be){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Yt.workingColorSpace){Yt.fromWorkingColorSpace(xe.copy(this),e);const i=xe.r,s=xe.g,r=xe.b,o=Math.max(i,s,r),a=Math.min(i,s,r);let c,l;const h=(a+o)/2;if(a===o)c=0,l=0;else{const u=o-a;switch(l=h<=.5?u/(o+a):u/(2-o-a),o){case i:c=(s-r)/u+(s<r?6:0);break;case s:c=(r-i)/u+2;break;case r:c=(i-s)/u+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=Yt.workingColorSpace){return Yt.fromWorkingColorSpace(xe.copy(this),e),t.r=xe.r,t.g=xe.g,t.b=xe.b,t}getStyle(t=be){Yt.fromWorkingColorSpace(xe.copy(this),t);const e=xe.r,i=xe.g,s=xe.b;return t!==be?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(t,e,i){return this.getHSL(Mn),this.setHSL(Mn.h+t,Mn.s+e,Mn.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(Mn),t.getHSL(cs);const i=Hi(Mn.h,cs.h,e),s=Hi(Mn.s,cs.s,e),r=Hi(Mn.l,cs.l,e);return this.setHSL(i,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,i=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*i+r[6]*s,this.g=r[1]*e+r[4]*i+r[7]*s,this.b=r[2]*e+r[5]*i+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const xe=new Nt;Nt.NAMES=Pl;let _d=0;class qn extends wi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:_d++}),this.uuid=Ti(),this.name="",this.type="Material",this.blending=fi,this.side=Cn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=qr,this.blendDst=jr,this.blendEquation=kn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Nt(0,0,0),this.blendAlpha=0,this.depthFunc=gi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ga,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Kn,this.stencilZFail=Kn,this.stencilZPass=Kn,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const i=t[e];if(i===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[e]=i}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==fi&&(i.blending=this.blending),this.side!==Cn&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==qr&&(i.blendSrc=this.blendSrc),this.blendDst!==jr&&(i.blendDst=this.blendDst),this.blendEquation!==kn&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==gi&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==ga&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Kn&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Kn&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Kn&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){const o=[];for(const a in r){const c=r[a];delete c.metadata,o.push(c)}return o}if(e){const r=s(t.textures),o=s(t.images);r.length>0&&(i.textures=r),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let i=null;if(e!==null){const s=e.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=e[r].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class Gi extends qn{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Nt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new tn,this.combine=Ho,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const ce=new P,ls=new Ht;class $t{constructor(t,e,i=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=_a,this.updateRanges=[],this.gpuType=ln,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[i+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)ls.fromBufferAttribute(this,e),ls.applyMatrix3(t),this.setXY(e,ls.x,ls.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)ce.fromBufferAttribute(this,e),ce.applyMatrix3(t),this.setXYZ(e,ce.x,ce.y,ce.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)ce.fromBufferAttribute(this,e),ce.applyMatrix4(t),this.setXYZ(e,ce.x,ce.y,ce.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)ce.fromBufferAttribute(this,e),ce.applyNormalMatrix(t),this.setXYZ(e,ce.x,ce.y,ce.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)ce.fromBufferAttribute(this,e),ce.transformDirection(t),this.setXYZ(e,ce.x,ce.y,ce.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=hi(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=Se(i,this.array)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=hi(e,this.array)),e}setX(t,e){return this.normalized&&(e=Se(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=hi(e,this.array)),e}setY(t,e){return this.normalized&&(e=Se(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=hi(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Se(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=hi(e,this.array)),e}setW(t,e){return this.normalized&&(e=Se(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=Se(e,this.array),i=Se(i,this.array)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,s){return t*=this.itemSize,this.normalized&&(e=Se(e,this.array),i=Se(i,this.array),s=Se(s,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this}setXYZW(t,e,i,s,r){return t*=this.itemSize,this.normalized&&(e=Se(e,this.array),i=Se(i,this.array),s=Se(s,this.array),r=Se(r,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==_a&&(t.usage=this.usage),t}}class Dl extends $t{constructor(t,e,i){super(new Uint16Array(t),e,i)}}class Ll extends $t{constructor(t,e,i){super(new Uint32Array(t),e,i)}}class je extends $t{constructor(t,e,i){super(new Float32Array(t),e,i)}}let vd=0;const Ne=new Zt,yr=new fe,ri=new P,Pe=new pn,Ii=new pn,de=new P;class Ke extends wi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:vd++}),this.uuid=Ti(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Al(t)?Ll:Dl)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const r=new Lt().getNormalMatrix(t);i.applyNormalMatrix(r),i.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Ne.makeRotationFromQuaternion(t),this.applyMatrix4(Ne),this}rotateX(t){return Ne.makeRotationX(t),this.applyMatrix4(Ne),this}rotateY(t){return Ne.makeRotationY(t),this.applyMatrix4(Ne),this}rotateZ(t){return Ne.makeRotationZ(t),this.applyMatrix4(Ne),this}translate(t,e,i){return Ne.makeTranslation(t,e,i),this.applyMatrix4(Ne),this}scale(t,e,i){return Ne.makeScale(t,e,i),this.applyMatrix4(Ne),this}lookAt(t){return yr.lookAt(t),yr.updateMatrix(),this.applyMatrix4(yr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ri).negate(),this.translate(ri.x,ri.y,ri.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const i=[];for(let s=0,r=t.length;s<r;s++){const o=t[s];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new je(i,3))}else{const i=Math.min(t.length,e.count);for(let s=0;s<i;s++){const r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new pn);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,s=e.length;i<s;i++){const r=e[i];Pe.setFromBufferAttribute(r),this.morphTargetsRelative?(de.addVectors(this.boundingBox.min,Pe.min),this.boundingBox.expandByPoint(de),de.addVectors(this.boundingBox.max,Pe.max),this.boundingBox.expandByPoint(de)):(this.boundingBox.expandByPoint(Pe.min),this.boundingBox.expandByPoint(Pe.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Qs);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new P,1/0);return}if(t){const i=this.boundingSphere.center;if(Pe.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){const a=e[r];Ii.setFromBufferAttribute(a),this.morphTargetsRelative?(de.addVectors(Pe.min,Ii.min),Pe.expandByPoint(de),de.addVectors(Pe.max,Ii.max),Pe.expandByPoint(de)):(Pe.expandByPoint(Ii.min),Pe.expandByPoint(Ii.max))}Pe.getCenter(i);let s=0;for(let r=0,o=t.count;r<o;r++)de.fromBufferAttribute(t,r),s=Math.max(s,i.distanceToSquared(de));if(e)for(let r=0,o=e.length;r<o;r++){const a=e[r],c=this.morphTargetsRelative;for(let l=0,h=a.count;l<h;l++)de.fromBufferAttribute(a,l),c&&(ri.fromBufferAttribute(t,l),de.add(ri)),s=Math.max(s,i.distanceToSquared(de))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=e.position,s=e.normal,r=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new $t(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],c=[];for(let A=0;A<i.count;A++)a[A]=new P,c[A]=new P;const l=new P,h=new P,u=new P,d=new Ht,m=new Ht,g=new Ht,_=new P,p=new P;function f(A,S,M){l.fromBufferAttribute(i,A),h.fromBufferAttribute(i,S),u.fromBufferAttribute(i,M),d.fromBufferAttribute(r,A),m.fromBufferAttribute(r,S),g.fromBufferAttribute(r,M),h.sub(l),u.sub(l),m.sub(d),g.sub(d);const C=1/(m.x*g.y-g.x*m.y);isFinite(C)&&(_.copy(h).multiplyScalar(g.y).addScaledVector(u,-m.y).multiplyScalar(C),p.copy(u).multiplyScalar(m.x).addScaledVector(h,-g.x).multiplyScalar(C),a[A].add(_),a[S].add(_),a[M].add(_),c[A].add(p),c[S].add(p),c[M].add(p))}let b=this.groups;b.length===0&&(b=[{start:0,count:t.count}]);for(let A=0,S=b.length;A<S;++A){const M=b[A],C=M.start,V=M.count;for(let O=C,Y=C+V;O<Y;O+=3)f(t.getX(O+0),t.getX(O+1),t.getX(O+2))}const y=new P,E=new P,L=new P,T=new P;function R(A){L.fromBufferAttribute(s,A),T.copy(L);const S=a[A];y.copy(S),y.sub(L.multiplyScalar(L.dot(S))).normalize(),E.crossVectors(T,S);const C=E.dot(c[A])<0?-1:1;o.setXYZW(A,y.x,y.y,y.z,C)}for(let A=0,S=b.length;A<S;++A){const M=b[A],C=M.start,V=M.count;for(let O=C,Y=C+V;O<Y;O+=3)R(t.getX(O+0)),R(t.getX(O+1)),R(t.getX(O+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new $t(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let d=0,m=i.count;d<m;d++)i.setXYZ(d,0,0,0);const s=new P,r=new P,o=new P,a=new P,c=new P,l=new P,h=new P,u=new P;if(t)for(let d=0,m=t.count;d<m;d+=3){const g=t.getX(d+0),_=t.getX(d+1),p=t.getX(d+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,_),o.fromBufferAttribute(e,p),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(i,g),c.fromBufferAttribute(i,_),l.fromBufferAttribute(i,p),a.add(h),c.add(h),l.add(h),i.setXYZ(g,a.x,a.y,a.z),i.setXYZ(_,c.x,c.y,c.z),i.setXYZ(p,l.x,l.y,l.z)}else for(let d=0,m=e.count;d<m;d+=3)s.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),i.setXYZ(d+0,h.x,h.y,h.z),i.setXYZ(d+1,h.x,h.y,h.z),i.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)de.fromBufferAttribute(t,e),de.normalize(),t.setXYZ(e,de.x,de.y,de.z)}toNonIndexed(){function t(a,c){const l=a.array,h=a.itemSize,u=a.normalized,d=new l.constructor(c.length*h);let m=0,g=0;for(let _=0,p=c.length;_<p;_++){a.isInterleavedBufferAttribute?m=c[_]*a.data.stride+a.offset:m=c[_]*h;for(let f=0;f<h;f++)d[g++]=l[m++]}return new $t(d,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Ke,i=this.index.array,s=this.attributes;for(const a in s){const c=s[a],l=t(c,i);e.setAttribute(a,l)}const r=this.morphAttributes;for(const a in r){const c=[],l=r[a];for(let h=0,u=l.length;h<u;h++){const d=l[h],m=t(d,i);c.push(m)}e.morphAttributes[a]=c}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,c=o.length;a<c;a++){const l=o[a];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const i=this.attributes;for(const c in i){const l=i[c];t.data.attributes[c]=l.toJSON(t.data)}const s={};let r=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let u=0,d=l.length;u<d;u++){const m=l[u];h.push(m.toJSON(t.data))}h.length>0&&(s[c]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const i=t.index;i!==null&&this.setIndex(i.clone(e));const s=t.attributes;for(const l in s){const h=s[l];this.setAttribute(l,h.clone(e))}const r=t.morphAttributes;for(const l in r){const h=[],u=r[l];for(let d=0,m=u.length;d<m;d++)h.push(u[d].clone(e));this.morphAttributes[l]=h}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let l=0,h=o.length;l<h;l++){const u=o[l];this.addGroup(u.start,u.count,u.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const La=new Zt,Un=new Ko,hs=new Qs,Ia=new P,us=new P,ds=new P,fs=new P,Sr=new P,ps=new P,Ua=new P,ms=new P;class De extends fe{constructor(t=new Ke,e=new Gi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){const i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,o=i.morphTargetsRelative;e.fromBufferAttribute(s,t);const a=this.morphTargetInfluences;if(r&&a){ps.set(0,0,0);for(let c=0,l=r.length;c<l;c++){const h=a[c],u=r[c];h!==0&&(Sr.fromBufferAttribute(u,t),o?ps.addScaledVector(Sr,h):ps.addScaledVector(Sr.sub(e),h))}e.add(ps)}return e}raycast(t,e){const i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),hs.copy(i.boundingSphere),hs.applyMatrix4(r),Un.copy(t.ray).recast(t.near),!(hs.containsPoint(Un.origin)===!1&&(Un.intersectSphere(hs,Ia)===null||Un.origin.distanceToSquared(Ia)>(t.far-t.near)**2))&&(La.copy(r).invert(),Un.copy(t.ray).applyMatrix4(La),!(i.boundingBox!==null&&Un.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,Un)))}_computeIntersections(t,e,i){let s;const r=this.geometry,o=this.material,a=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,m=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,_=d.length;g<_;g++){const p=d[g],f=o[p.materialIndex],b=Math.max(p.start,m.start),y=Math.min(a.count,Math.min(p.start+p.count,m.start+m.count));for(let E=b,L=y;E<L;E+=3){const T=a.getX(E),R=a.getX(E+1),A=a.getX(E+2);s=gs(this,f,t,i,l,h,u,T,R,A),s&&(s.faceIndex=Math.floor(E/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{const g=Math.max(0,m.start),_=Math.min(a.count,m.start+m.count);for(let p=g,f=_;p<f;p+=3){const b=a.getX(p),y=a.getX(p+1),E=a.getX(p+2);s=gs(this,o,t,i,l,h,u,b,y,E),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}else if(c!==void 0)if(Array.isArray(o))for(let g=0,_=d.length;g<_;g++){const p=d[g],f=o[p.materialIndex],b=Math.max(p.start,m.start),y=Math.min(c.count,Math.min(p.start+p.count,m.start+m.count));for(let E=b,L=y;E<L;E+=3){const T=E,R=E+1,A=E+2;s=gs(this,f,t,i,l,h,u,T,R,A),s&&(s.faceIndex=Math.floor(E/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{const g=Math.max(0,m.start),_=Math.min(c.count,m.start+m.count);for(let p=g,f=_;p<f;p+=3){const b=p,y=p+1,E=p+2;s=gs(this,o,t,i,l,h,u,b,y,E),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}}}function xd(n,t,e,i,s,r,o,a){let c;if(t.side===Ae?c=i.intersectTriangle(o,r,s,!0,a):c=i.intersectTriangle(s,r,o,t.side===Cn,a),c===null)return null;ms.copy(a),ms.applyMatrix4(n.matrixWorld);const l=e.ray.origin.distanceTo(ms);return l<e.near||l>e.far?null:{distance:l,point:ms.clone(),object:n}}function gs(n,t,e,i,s,r,o,a,c,l){n.getVertexPosition(a,us),n.getVertexPosition(c,ds),n.getVertexPosition(l,fs);const h=xd(n,t,e,i,us,ds,fs,Ua);if(h){const u=new P;qe.getBarycoord(Ua,us,ds,fs,u),s&&(h.uv=qe.getInterpolatedAttribute(s,a,c,l,u,new Ht)),r&&(h.uv1=qe.getInterpolatedAttribute(r,a,c,l,u,new Ht)),o&&(h.normal=qe.getInterpolatedAttribute(o,a,c,l,u,new P),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));const d={a,b:c,c:l,normal:new P,materialIndex:0};qe.getNormal(us,ds,fs,d.normal),h.face=d,h.barycoord=u}return h}class Ji extends Ke{constructor(t=1,e=1,i=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const c=[],l=[],h=[],u=[];let d=0,m=0;g("z","y","x",-1,-1,i,e,t,o,r,0),g("z","y","x",1,-1,i,e,-t,o,r,1),g("x","z","y",1,1,t,i,e,s,o,2),g("x","z","y",1,-1,t,i,-e,s,o,3),g("x","y","z",1,-1,t,e,i,s,r,4),g("x","y","z",-1,-1,t,e,-i,s,r,5),this.setIndex(c),this.setAttribute("position",new je(l,3)),this.setAttribute("normal",new je(h,3)),this.setAttribute("uv",new je(u,2));function g(_,p,f,b,y,E,L,T,R,A,S){const M=E/R,C=L/A,V=E/2,O=L/2,Y=T/2,z=R+1,W=A+1;let K=0,H=0;const st=new P;for(let ut=0;ut<W;ut++){const j=ut*C-O;for(let dt=0;dt<z;dt++){const Mt=dt*M-V;st[_]=Mt*b,st[p]=j*y,st[f]=Y,l.push(st.x,st.y,st.z),st[_]=0,st[p]=0,st[f]=T>0?1:-1,h.push(st.x,st.y,st.z),u.push(dt/R),u.push(1-ut/A),K+=1}}for(let ut=0;ut<A;ut++)for(let j=0;j<R;j++){const dt=d+j+z*ut,Mt=d+j+z*(ut+1),X=d+(j+1)+z*(ut+1),et=d+(j+1)+z*ut;c.push(dt,Mt,et),c.push(Mt,X,et),H+=6}a.addGroup(m,H,S),m+=H,d+=K}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ji(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function Si(n){const t={};for(const e in n){t[e]={};for(const i in n[e]){const s=n[e][i];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=s.clone():Array.isArray(s)?t[e][i]=s.slice():t[e][i]=s}}return t}function Ee(n){const t={};for(let e=0;e<n.length;e++){const i=Si(n[e]);for(const s in i)t[s]=i[s]}return t}function Md(n){const t=[];for(let e=0;e<n.length;e++)t.push(n[e].clone());return t}function Il(n){const t=n.getRenderTarget();return t===null?n.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Yt.workingColorSpace}const yd={clone:Si,merge:Ee};var Sd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Ed=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Rn extends qn{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Sd,this.fragmentShader=Ed,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Si(t.uniforms),this.uniformsGroups=Md(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const i={};for(const s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}}class Ul extends fe{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Zt,this.projectionMatrix=new Zt,this.projectionMatrixInverse=new Zt,this.coordinateSystem=hn}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const yn=new P,Fa=new Ht,Na=new Ht;class Xe extends Ul{constructor(t=50,e=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=qi*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(zi*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return qi*2*Math.atan(Math.tan(zi*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){yn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(yn.x,yn.y).multiplyScalar(-t/yn.z),yn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(yn.x,yn.y).multiplyScalar(-t/yn.z)}getViewSize(t,e){return this.getViewBounds(t,Fa,Na),e.subVectors(Na,Fa)}setViewOffset(t,e,i,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(zi*.5*this.fov)/this.zoom,i=2*e,s=this.aspect*i,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const c=o.fullWidth,l=o.fullHeight;r+=o.offsetX*s/c,e-=o.offsetY*i/l,s*=o.width/c,i*=o.height/l}const a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-i,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const oi=-90,ai=1;class bd extends fe{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new Xe(oi,ai,t,e);s.layers=this.layers,this.add(s);const r=new Xe(oi,ai,t,e);r.layers=this.layers,this.add(r);const o=new Xe(oi,ai,t,e);o.layers=this.layers,this.add(o);const a=new Xe(oi,ai,t,e);a.layers=this.layers,this.add(a);const c=new Xe(oi,ai,t,e);c.layers=this.layers,this.add(c);const l=new Xe(oi,ai,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[i,s,r,o,a,c]=e;for(const l of e)this.remove(l);if(t===hn)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===Gs)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,c,l,h]=this.children,u=t.getRenderTarget(),d=t.getActiveCubeFace(),m=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const _=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,t.setRenderTarget(i,0,s),t.render(e,r),t.setRenderTarget(i,1,s),t.render(e,o),t.setRenderTarget(i,2,s),t.render(e,a),t.setRenderTarget(i,3,s),t.render(e,c),t.setRenderTarget(i,4,s),t.render(e,l),i.texture.generateMipmaps=_,t.setRenderTarget(i,5,s),t.render(e,h),t.setRenderTarget(u,d,m),t.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class Fl extends Me{constructor(t,e,i,s,r,o,a,c,l,h){t=t!==void 0?t:[],e=e!==void 0?e:_i,super(t,e,i,s,r,o,a,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class wd extends Yn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const i={width:t,height:t,depth:1},s=[i,i,i,i,i,i];this.texture=new Fl(s,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:$e}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Ji(5,5,5),r=new Rn({name:"CubemapFromEquirect",uniforms:Si(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Ae,blending:Tn});r.uniforms.tEquirect.value=e;const o=new De(s,r),a=e.minFilter;return e.minFilter===Wn&&(e.minFilter=$e),new bd(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e,i,s){const r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,i,s);t.setRenderTarget(r)}}class Td extends fe{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new tn,this.environmentIntensity=1,this.environmentRotation=new tn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class Ad extends Me{constructor(t=null,e=1,i=1,s,r,o,a,c,l=Le,h=Le,u,d){super(null,o,a,c,l,h,s,r,u,d),this.isDataTexture=!0,this.image={data:t,width:e,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Er=new P,Cd=new P,Rd=new Lt;class En{constructor(t=new P(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,s){return this.normal.set(t,e,i),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){const s=Er.subVectors(i,e).cross(Cd.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const i=t.delta(Er),s=this.normal.dot(i);if(s===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const r=-(t.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:e.copy(t.start).addScaledVector(i,r)}intersectsLine(t){const e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const i=e||Rd.getNormalMatrix(t),s=this.coplanarPoint(Er).applyMatrix4(t),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Fn=new Qs,_s=new P;class Zo{constructor(t=new En,e=new En,i=new En,s=new En,r=new En,o=new En){this.planes=[t,e,i,s,r,o]}set(t,e,i,s,r,o){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(i),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){const e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=hn){const i=this.planes,s=t.elements,r=s[0],o=s[1],a=s[2],c=s[3],l=s[4],h=s[5],u=s[6],d=s[7],m=s[8],g=s[9],_=s[10],p=s[11],f=s[12],b=s[13],y=s[14],E=s[15];if(i[0].setComponents(c-r,d-l,p-m,E-f).normalize(),i[1].setComponents(c+r,d+l,p+m,E+f).normalize(),i[2].setComponents(c+o,d+h,p+g,E+b).normalize(),i[3].setComponents(c-o,d-h,p-g,E-b).normalize(),i[4].setComponents(c-a,d-u,p-_,E-y).normalize(),e===hn)i[5].setComponents(c+a,d+u,p+_,E+y).normalize();else if(e===Gs)i[5].setComponents(a,u,_,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Fn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Fn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Fn)}intersectsSprite(t){return Fn.center.set(0,0,0),Fn.radius=.7071067811865476,Fn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Fn)}intersectsSphere(t){const e=this.planes,i=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let i=0;i<6;i++){const s=e[i];if(_s.x=s.normal.x>0?t.max.x:t.min.x,_s.y=s.normal.y>0?t.max.y:t.min.y,_s.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(_s)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Nl extends qn{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Nt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}const Xs=new P,Ys=new P,Ba=new Zt,Ui=new Ko,vs=new Qs,br=new P,Oa=new P;class Pd extends fe{constructor(t=new Ke,e=new Nl){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,i=[0];for(let s=1,r=e.count;s<r;s++)Xs.fromBufferAttribute(e,s-1),Ys.fromBufferAttribute(e,s),i[s]=i[s-1],i[s]+=Xs.distanceTo(Ys);t.setAttribute("lineDistance",new je(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,e){const i=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),vs.copy(i.boundingSphere),vs.applyMatrix4(s),vs.radius+=r,t.ray.intersectsSphere(vs)===!1)return;Ba.copy(s).invert(),Ui.copy(t.ray).applyMatrix4(Ba);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=this.isLineSegments?2:1,h=i.index,d=i.attributes.position;if(h!==null){const m=Math.max(0,o.start),g=Math.min(h.count,o.start+o.count);for(let _=m,p=g-1;_<p;_+=l){const f=h.getX(_),b=h.getX(_+1),y=xs(this,t,Ui,c,f,b);y&&e.push(y)}if(this.isLineLoop){const _=h.getX(g-1),p=h.getX(m),f=xs(this,t,Ui,c,_,p);f&&e.push(f)}}else{const m=Math.max(0,o.start),g=Math.min(d.count,o.start+o.count);for(let _=m,p=g-1;_<p;_+=l){const f=xs(this,t,Ui,c,_,_+1);f&&e.push(f)}if(this.isLineLoop){const _=xs(this,t,Ui,c,g-1,m);_&&e.push(_)}}}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function xs(n,t,e,i,s,r){const o=n.geometry.attributes.position;if(Xs.fromBufferAttribute(o,s),Ys.fromBufferAttribute(o,r),e.distanceSqToSegment(Xs,Ys,br,Oa)>i)return;br.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(br);if(!(c<t.near||c>t.far))return{distance:c,point:Oa.clone().applyMatrix4(n.matrixWorld),index:s,face:null,faceIndex:null,barycoord:null,object:n}}class Oe extends fe{constructor(){super(),this.isGroup=!0,this.type="Group"}}class Bl extends Me{constructor(t,e,i,s,r,o,a,c,l,h=pi){if(h!==pi&&h!==Mi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&h===pi&&(i=Xn),i===void 0&&h===Mi&&(i=xi),super(null,s,r,o,a,c,h,i,l),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=a!==void 0?a:Le,this.minFilter=c!==void 0?c:Le,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}class $s extends Ke{constructor(t=1,e=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:s};const r=t/2,o=e/2,a=Math.floor(i),c=Math.floor(s),l=a+1,h=c+1,u=t/a,d=e/c,m=[],g=[],_=[],p=[];for(let f=0;f<h;f++){const b=f*d-o;for(let y=0;y<l;y++){const E=y*u-r;g.push(E,-b,0),_.push(0,0,1),p.push(y/a),p.push(1-f/c)}}for(let f=0;f<c;f++)for(let b=0;b<a;b++){const y=b+l*f,E=b+l*(f+1),L=b+1+l*(f+1),T=b+1+l*f;m.push(y,E,T),m.push(E,L,T)}this.setIndex(m),this.setAttribute("position",new je(g,3)),this.setAttribute("normal",new je(_,3)),this.setAttribute("uv",new je(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new $s(t.width,t.height,t.widthSegments,t.heightSegments)}}class qs extends Ke{constructor(t=1,e=32,i=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:i,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),i=Math.max(2,Math.floor(i));const c=Math.min(o+a,Math.PI);let l=0;const h=[],u=new P,d=new P,m=[],g=[],_=[],p=[];for(let f=0;f<=i;f++){const b=[],y=f/i;let E=0;f===0&&o===0?E=.5/e:f===i&&c===Math.PI&&(E=-.5/e);for(let L=0;L<=e;L++){const T=L/e;u.x=-t*Math.cos(s+T*r)*Math.sin(o+y*a),u.y=t*Math.cos(o+y*a),u.z=t*Math.sin(s+T*r)*Math.sin(o+y*a),g.push(u.x,u.y,u.z),d.copy(u).normalize(),_.push(d.x,d.y,d.z),p.push(T+E,1-y),b.push(l++)}h.push(b)}for(let f=0;f<i;f++)for(let b=0;b<e;b++){const y=h[f][b+1],E=h[f][b],L=h[f+1][b],T=h[f+1][b+1];(f!==0||o>0)&&m.push(y,E,T),(f!==i-1||c<Math.PI)&&m.push(E,L,T)}this.setIndex(m),this.setAttribute("position",new je(g,3)),this.setAttribute("normal",new je(_,3)),this.setAttribute("uv",new je(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new qs(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class Uo extends qn{constructor(t){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new Nt(16777215),this.specular=new Nt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Nt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=wl,this.normalScale=new Ht(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new tn,this.combine=Ho,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.specular.copy(t.specular),this.shininess=t.shininess,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Dd extends qn{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Au,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class Ld extends qn{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class Qo extends fe{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Nt(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}class Id extends Qo{constructor(t,e,i){super(t,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(fe.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Nt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}}const wr=new Zt,ka=new P,za=new P;class Ud{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ht(512,512),this.map=null,this.mapPass=null,this.matrix=new Zt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Zo,this._frameExtents=new Ht(1,1),this._viewportCount=1,this._viewports=[new re(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,i=this.matrix;ka.setFromMatrixPosition(t.matrixWorld),e.position.copy(ka),za.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(za),e.updateMatrixWorld(),wr.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(wr),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(wr)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class Zi extends Ul{constructor(t=-1,e=1,i=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=i-t,o=i+t,a=s+e,c=s-e;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,o=r+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class Fd extends Ud{constructor(){super(new Zi(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Ha extends Qo{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(fe.DEFAULT_UP),this.updateMatrix(),this.target=new fe,this.shadow=new Fd}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}class Nd extends Qo{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}}class Bd extends Xe{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}const Va=new Zt;class Ol{constructor(t,e,i=0,s=1/0){this.ray=new Ko(t,e),this.near=i,this.far=s,this.camera=null,this.layers=new Jo,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,(e.near+e.far)/(e.near-e.far)).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):console.error("THREE.Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return Va.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Va),this}intersectObject(t,e=!0,i=[]){return Fo(t,this,i,e),i.sort(Ga),i}intersectObjects(t,e=!0,i=[]){for(let s=0,r=t.length;s<r;s++)Fo(t[s],this,i,e);return i.sort(Ga),i}}function Ga(n,t){return n.distance-t.distance}function Fo(n,t,e,i){let s=!0;if(n.layers.test(t.layers)&&n.raycast(t,e)===!1&&(s=!1),s===!0&&i===!0){const r=n.children;for(let o=0,a=r.length;o<a;o++)Fo(r[o],t,e,!0)}}function Wa(n,t,e,i){const s=Od(i);switch(e){case vl:return n*t;case Ml:return n*t;case yl:return n*t*2;case Sl:return n*t/s.components*s.byteLength;case Xo:return n*t/s.components*s.byteLength;case El:return n*t*2/s.components*s.byteLength;case Yo:return n*t*2/s.components*s.byteLength;case xl:return n*t*3/s.components*s.byteLength;case Be:return n*t*4/s.components*s.byteLength;case qo:return n*t*4/s.components*s.byteLength;case Ds:case Ls:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case Is:case Us:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case co:case ho:return Math.max(n,16)*Math.max(t,8)/4;case ao:case lo:return Math.max(n,8)*Math.max(t,8)/2;case uo:case fo:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case po:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case mo:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case go:return Math.floor((n+4)/5)*Math.floor((t+3)/4)*16;case _o:return Math.floor((n+4)/5)*Math.floor((t+4)/5)*16;case vo:return Math.floor((n+5)/6)*Math.floor((t+4)/5)*16;case xo:return Math.floor((n+5)/6)*Math.floor((t+5)/6)*16;case Mo:return Math.floor((n+7)/8)*Math.floor((t+4)/5)*16;case yo:return Math.floor((n+7)/8)*Math.floor((t+5)/6)*16;case So:return Math.floor((n+7)/8)*Math.floor((t+7)/8)*16;case Eo:return Math.floor((n+9)/10)*Math.floor((t+4)/5)*16;case bo:return Math.floor((n+9)/10)*Math.floor((t+5)/6)*16;case wo:return Math.floor((n+9)/10)*Math.floor((t+7)/8)*16;case To:return Math.floor((n+9)/10)*Math.floor((t+9)/10)*16;case Ao:return Math.floor((n+11)/12)*Math.floor((t+9)/10)*16;case Co:return Math.floor((n+11)/12)*Math.floor((t+11)/12)*16;case Fs:case Ro:case Po:return Math.ceil(n/4)*Math.ceil(t/4)*16;case bl:case Do:return Math.ceil(n/4)*Math.ceil(t/4)*8;case Lo:case Io:return Math.ceil(n/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Od(n){switch(n){case fn:case ml:return{byteLength:1,components:1};case Yi:case gl:case Ki:return{byteLength:2,components:1};case Go:case Wo:return{byteLength:2,components:4};case Xn:case Vo:case ln:return{byteLength:4,components:1};case _l:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:zo}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=zo);/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function kl(){let n=null,t=!1,e=null,i=null;function s(r,o){e(r,o),i=n.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&(i=n.requestAnimationFrame(s),t=!0)},stop:function(){n.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){n=r}}}function kd(n){const t=new WeakMap;function e(a,c){const l=a.array,h=a.usage,u=l.byteLength,d=n.createBuffer();n.bindBuffer(c,d),n.bufferData(c,l,h),a.onUploadCallback();let m;if(l instanceof Float32Array)m=n.FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?m=n.HALF_FLOAT:m=n.UNSIGNED_SHORT;else if(l instanceof Int16Array)m=n.SHORT;else if(l instanceof Uint32Array)m=n.UNSIGNED_INT;else if(l instanceof Int32Array)m=n.INT;else if(l instanceof Int8Array)m=n.BYTE;else if(l instanceof Uint8Array)m=n.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)m=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:d,type:m,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:u}}function i(a,c,l){const h=c.array,u=c.updateRanges;if(n.bindBuffer(l,a),u.length===0)n.bufferSubData(l,0,h);else{u.sort((m,g)=>m.start-g.start);let d=0;for(let m=1;m<u.length;m++){const g=u[d],_=u[m];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++d,u[d]=_)}u.length=d+1;for(let m=0,g=u.length;m<g;m++){const _=u[m];n.bufferSubData(l,_.start*h.BYTES_PER_ELEMENT,h,_.start,_.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const c=t.get(a);c&&(n.deleteBuffer(c.buffer),t.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const l=t.get(a);if(l===void 0)t.set(a,e(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(l.buffer,a,c),l.version=a.version}}return{get:s,remove:r,update:o}}var zd=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Hd=`#ifdef USE_ALPHAHASH
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
#endif`,Vd=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Gd=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Wd=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Xd=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Yd=`#ifdef USE_AOMAP
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
#endif`,qd=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,jd=`#ifdef USE_BATCHING
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
#endif`,Kd=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Jd=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Zd=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Qd=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,$d=`#ifdef USE_IRIDESCENCE
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
#endif`,tf=`#ifdef USE_BUMPMAP
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
#endif`,ef=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,nf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,sf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,rf=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,of=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,af=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,cf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,lf=`#if defined( USE_COLOR_ALPHA )
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
#endif`,hf=`#define PI 3.141592653589793
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
} // validated`,uf=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,df=`vec3 transformedNormal = objectNormal;
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
#endif`,ff=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,pf=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,mf=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,gf=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,_f="gl_FragColor = linearToOutputTexel( gl_FragColor );",vf=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,xf=`#ifdef USE_ENVMAP
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
#endif`,Mf=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,yf=`#ifdef USE_ENVMAP
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
#endif`,Sf=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Ef=`#ifdef USE_ENVMAP
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
#endif`,bf=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,wf=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Tf=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Af=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Cf=`#ifdef USE_GRADIENTMAP
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
}`,Rf=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Pf=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Df=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Lf=`uniform bool receiveShadow;
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
#endif`,If=`#ifdef USE_ENVMAP
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
#endif`,Uf=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Ff=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Nf=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Bf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Of=`PhysicalMaterial material;
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
#endif`,kf=`struct PhysicalMaterial {
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
}`,zf=`
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
#endif`,Hf=`#if defined( RE_IndirectDiffuse )
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
#endif`,Vf=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Gf=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Wf=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Xf=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Yf=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,qf=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,jf=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Kf=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Jf=`#if defined( USE_POINTS_UV )
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
#endif`,Zf=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Qf=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,$f=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,tp=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,ep=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,np=`#ifdef USE_MORPHTARGETS
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
#endif`,ip=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,sp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,rp=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,op=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ap=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,cp=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,lp=`#ifdef USE_NORMALMAP
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
#endif`,hp=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,up=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,dp=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,fp=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,pp=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,mp=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,gp=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,_p=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,vp=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,xp=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Mp=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,yp=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Sp=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Ep=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,bp=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,wp=`float getShadowMask() {
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
}`,Tp=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Ap=`#ifdef USE_SKINNING
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
#endif`,Cp=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Rp=`#ifdef USE_SKINNING
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
#endif`,Pp=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Dp=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Lp=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Ip=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Up=`#ifdef USE_TRANSMISSION
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
#endif`,Fp=`#ifdef USE_TRANSMISSION
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
#endif`,Np=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Bp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Op=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,kp=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const zp=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Hp=`uniform sampler2D t2D;
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
}`,Vp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Gp=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Wp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Xp=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Yp=`#include <common>
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
}`,qp=`#if DEPTH_PACKING == 3200
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
}`,jp=`#define DISTANCE
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
}`,Kp=`#define DISTANCE
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
}`,Jp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Zp=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Qp=`uniform float scale;
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
}`,$p=`uniform vec3 diffuse;
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
}`,tm=`#include <common>
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
}`,em=`uniform vec3 diffuse;
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
}`,nm=`#define LAMBERT
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
}`,im=`#define LAMBERT
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
}`,sm=`#define MATCAP
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
}`,rm=`#define MATCAP
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
}`,om=`#define NORMAL
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
}`,am=`#define NORMAL
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
}`,cm=`#define PHONG
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
}`,lm=`#define PHONG
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
}`,hm=`#define STANDARD
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
}`,um=`#define STANDARD
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
}`,dm=`#define TOON
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
}`,fm=`#define TOON
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
}`,pm=`uniform float size;
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
}`,mm=`uniform vec3 diffuse;
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
}`,gm=`#include <common>
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
}`,_m=`uniform vec3 color;
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
}`,vm=`uniform float rotation;
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
}`,xm=`uniform vec3 diffuse;
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
}`,Ut={alphahash_fragment:zd,alphahash_pars_fragment:Hd,alphamap_fragment:Vd,alphamap_pars_fragment:Gd,alphatest_fragment:Wd,alphatest_pars_fragment:Xd,aomap_fragment:Yd,aomap_pars_fragment:qd,batching_pars_vertex:jd,batching_vertex:Kd,begin_vertex:Jd,beginnormal_vertex:Zd,bsdfs:Qd,iridescence_fragment:$d,bumpmap_pars_fragment:tf,clipping_planes_fragment:ef,clipping_planes_pars_fragment:nf,clipping_planes_pars_vertex:sf,clipping_planes_vertex:rf,color_fragment:of,color_pars_fragment:af,color_pars_vertex:cf,color_vertex:lf,common:hf,cube_uv_reflection_fragment:uf,defaultnormal_vertex:df,displacementmap_pars_vertex:ff,displacementmap_vertex:pf,emissivemap_fragment:mf,emissivemap_pars_fragment:gf,colorspace_fragment:_f,colorspace_pars_fragment:vf,envmap_fragment:xf,envmap_common_pars_fragment:Mf,envmap_pars_fragment:yf,envmap_pars_vertex:Sf,envmap_physical_pars_fragment:If,envmap_vertex:Ef,fog_vertex:bf,fog_pars_vertex:wf,fog_fragment:Tf,fog_pars_fragment:Af,gradientmap_pars_fragment:Cf,lightmap_pars_fragment:Rf,lights_lambert_fragment:Pf,lights_lambert_pars_fragment:Df,lights_pars_begin:Lf,lights_toon_fragment:Uf,lights_toon_pars_fragment:Ff,lights_phong_fragment:Nf,lights_phong_pars_fragment:Bf,lights_physical_fragment:Of,lights_physical_pars_fragment:kf,lights_fragment_begin:zf,lights_fragment_maps:Hf,lights_fragment_end:Vf,logdepthbuf_fragment:Gf,logdepthbuf_pars_fragment:Wf,logdepthbuf_pars_vertex:Xf,logdepthbuf_vertex:Yf,map_fragment:qf,map_pars_fragment:jf,map_particle_fragment:Kf,map_particle_pars_fragment:Jf,metalnessmap_fragment:Zf,metalnessmap_pars_fragment:Qf,morphinstance_vertex:$f,morphcolor_vertex:tp,morphnormal_vertex:ep,morphtarget_pars_vertex:np,morphtarget_vertex:ip,normal_fragment_begin:sp,normal_fragment_maps:rp,normal_pars_fragment:op,normal_pars_vertex:ap,normal_vertex:cp,normalmap_pars_fragment:lp,clearcoat_normal_fragment_begin:hp,clearcoat_normal_fragment_maps:up,clearcoat_pars_fragment:dp,iridescence_pars_fragment:fp,opaque_fragment:pp,packing:mp,premultiplied_alpha_fragment:gp,project_vertex:_p,dithering_fragment:vp,dithering_pars_fragment:xp,roughnessmap_fragment:Mp,roughnessmap_pars_fragment:yp,shadowmap_pars_fragment:Sp,shadowmap_pars_vertex:Ep,shadowmap_vertex:bp,shadowmask_pars_fragment:wp,skinbase_vertex:Tp,skinning_pars_vertex:Ap,skinning_vertex:Cp,skinnormal_vertex:Rp,specularmap_fragment:Pp,specularmap_pars_fragment:Dp,tonemapping_fragment:Lp,tonemapping_pars_fragment:Ip,transmission_fragment:Up,transmission_pars_fragment:Fp,uv_pars_fragment:Np,uv_pars_vertex:Bp,uv_vertex:Op,worldpos_vertex:kp,background_vert:zp,background_frag:Hp,backgroundCube_vert:Vp,backgroundCube_frag:Gp,cube_vert:Wp,cube_frag:Xp,depth_vert:Yp,depth_frag:qp,distanceRGBA_vert:jp,distanceRGBA_frag:Kp,equirect_vert:Jp,equirect_frag:Zp,linedashed_vert:Qp,linedashed_frag:$p,meshbasic_vert:tm,meshbasic_frag:em,meshlambert_vert:nm,meshlambert_frag:im,meshmatcap_vert:sm,meshmatcap_frag:rm,meshnormal_vert:om,meshnormal_frag:am,meshphong_vert:cm,meshphong_frag:lm,meshphysical_vert:hm,meshphysical_frag:um,meshtoon_vert:dm,meshtoon_frag:fm,points_vert:pm,points_frag:mm,shadow_vert:gm,shadow_frag:_m,sprite_vert:vm,sprite_frag:xm},it={common:{diffuse:{value:new Nt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Lt},alphaMap:{value:null},alphaMapTransform:{value:new Lt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Lt}},envmap:{envMap:{value:null},envMapRotation:{value:new Lt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Lt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Lt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Lt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Lt},normalScale:{value:new Ht(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Lt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Lt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Lt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Lt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Nt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Nt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Lt},alphaTest:{value:0},uvTransform:{value:new Lt}},sprite:{diffuse:{value:new Nt(16777215)},opacity:{value:1},center:{value:new Ht(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Lt},alphaMap:{value:null},alphaMapTransform:{value:new Lt},alphaTest:{value:0}}},Qe={basic:{uniforms:Ee([it.common,it.specularmap,it.envmap,it.aomap,it.lightmap,it.fog]),vertexShader:Ut.meshbasic_vert,fragmentShader:Ut.meshbasic_frag},lambert:{uniforms:Ee([it.common,it.specularmap,it.envmap,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.fog,it.lights,{emissive:{value:new Nt(0)}}]),vertexShader:Ut.meshlambert_vert,fragmentShader:Ut.meshlambert_frag},phong:{uniforms:Ee([it.common,it.specularmap,it.envmap,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.fog,it.lights,{emissive:{value:new Nt(0)},specular:{value:new Nt(1118481)},shininess:{value:30}}]),vertexShader:Ut.meshphong_vert,fragmentShader:Ut.meshphong_frag},standard:{uniforms:Ee([it.common,it.envmap,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.roughnessmap,it.metalnessmap,it.fog,it.lights,{emissive:{value:new Nt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ut.meshphysical_vert,fragmentShader:Ut.meshphysical_frag},toon:{uniforms:Ee([it.common,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.gradientmap,it.fog,it.lights,{emissive:{value:new Nt(0)}}]),vertexShader:Ut.meshtoon_vert,fragmentShader:Ut.meshtoon_frag},matcap:{uniforms:Ee([it.common,it.bumpmap,it.normalmap,it.displacementmap,it.fog,{matcap:{value:null}}]),vertexShader:Ut.meshmatcap_vert,fragmentShader:Ut.meshmatcap_frag},points:{uniforms:Ee([it.points,it.fog]),vertexShader:Ut.points_vert,fragmentShader:Ut.points_frag},dashed:{uniforms:Ee([it.common,it.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ut.linedashed_vert,fragmentShader:Ut.linedashed_frag},depth:{uniforms:Ee([it.common,it.displacementmap]),vertexShader:Ut.depth_vert,fragmentShader:Ut.depth_frag},normal:{uniforms:Ee([it.common,it.bumpmap,it.normalmap,it.displacementmap,{opacity:{value:1}}]),vertexShader:Ut.meshnormal_vert,fragmentShader:Ut.meshnormal_frag},sprite:{uniforms:Ee([it.sprite,it.fog]),vertexShader:Ut.sprite_vert,fragmentShader:Ut.sprite_frag},background:{uniforms:{uvTransform:{value:new Lt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ut.background_vert,fragmentShader:Ut.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Lt}},vertexShader:Ut.backgroundCube_vert,fragmentShader:Ut.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ut.cube_vert,fragmentShader:Ut.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ut.equirect_vert,fragmentShader:Ut.equirect_frag},distanceRGBA:{uniforms:Ee([it.common,it.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ut.distanceRGBA_vert,fragmentShader:Ut.distanceRGBA_frag},shadow:{uniforms:Ee([it.lights,it.fog,{color:{value:new Nt(0)},opacity:{value:1}}]),vertexShader:Ut.shadow_vert,fragmentShader:Ut.shadow_frag}};Qe.physical={uniforms:Ee([Qe.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Lt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Lt},clearcoatNormalScale:{value:new Ht(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Lt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Lt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Lt},sheen:{value:0},sheenColor:{value:new Nt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Lt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Lt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Lt},transmissionSamplerSize:{value:new Ht},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Lt},attenuationDistance:{value:0},attenuationColor:{value:new Nt(0)},specularColor:{value:new Nt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Lt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Lt},anisotropyVector:{value:new Ht},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Lt}}]),vertexShader:Ut.meshphysical_vert,fragmentShader:Ut.meshphysical_frag};const Ms={r:0,b:0,g:0},Nn=new tn,Mm=new Zt;function ym(n,t,e,i,s,r,o){const a=new Nt(0);let c=r===!0?0:1,l,h,u=null,d=0,m=null;function g(y){let E=y.isScene===!0?y.background:null;return E&&E.isTexture&&(E=(y.backgroundBlurriness>0?e:t).get(E)),E}function _(y){let E=!1;const L=g(y);L===null?f(a,c):L&&L.isColor&&(f(L,1),E=!0);const T=n.xr.getEnvironmentBlendMode();T==="additive"?i.buffers.color.setClear(0,0,0,1,o):T==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||E)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function p(y,E){const L=g(E);L&&(L.isCubeTexture||L.mapping===Zs)?(h===void 0&&(h=new De(new Ji(1,1,1),new Rn({name:"BackgroundCubeMaterial",uniforms:Si(Qe.backgroundCube.uniforms),vertexShader:Qe.backgroundCube.vertexShader,fragmentShader:Qe.backgroundCube.fragmentShader,side:Ae,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(T,R,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),Nn.copy(E.backgroundRotation),Nn.x*=-1,Nn.y*=-1,Nn.z*=-1,L.isCubeTexture&&L.isRenderTargetTexture===!1&&(Nn.y*=-1,Nn.z*=-1),h.material.uniforms.envMap.value=L,h.material.uniforms.flipEnvMap.value=L.isCubeTexture&&L.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Mm.makeRotationFromEuler(Nn)),h.material.toneMapped=Yt.getTransfer(L.colorSpace)!==Jt,(u!==L||d!==L.version||m!==n.toneMapping)&&(h.material.needsUpdate=!0,u=L,d=L.version,m=n.toneMapping),h.layers.enableAll(),y.unshift(h,h.geometry,h.material,0,0,null)):L&&L.isTexture&&(l===void 0&&(l=new De(new $s(2,2),new Rn({name:"BackgroundMaterial",uniforms:Si(Qe.background.uniforms),vertexShader:Qe.background.vertexShader,fragmentShader:Qe.background.fragmentShader,side:Cn,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(l)),l.material.uniforms.t2D.value=L,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.toneMapped=Yt.getTransfer(L.colorSpace)!==Jt,L.matrixAutoUpdate===!0&&L.updateMatrix(),l.material.uniforms.uvTransform.value.copy(L.matrix),(u!==L||d!==L.version||m!==n.toneMapping)&&(l.material.needsUpdate=!0,u=L,d=L.version,m=n.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function f(y,E){y.getRGB(Ms,Il(n)),i.buffers.color.setClear(Ms.r,Ms.g,Ms.b,E,o)}function b(){h!==void 0&&(h.geometry.dispose(),h.material.dispose()),l!==void 0&&(l.geometry.dispose(),l.material.dispose())}return{getClearColor:function(){return a},setClearColor:function(y,E=1){a.set(y),c=E,f(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(y){c=y,f(a,c)},render:_,addToRenderList:p,dispose:b}}function Sm(n,t){const e=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=d(null);let r=s,o=!1;function a(M,C,V,O,Y){let z=!1;const W=u(O,V,C);r!==W&&(r=W,l(r.object)),z=m(M,O,V,Y),z&&g(M,O,V,Y),Y!==null&&t.update(Y,n.ELEMENT_ARRAY_BUFFER),(z||o)&&(o=!1,E(M,C,V,O),Y!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(Y).buffer))}function c(){return n.createVertexArray()}function l(M){return n.bindVertexArray(M)}function h(M){return n.deleteVertexArray(M)}function u(M,C,V){const O=V.wireframe===!0;let Y=i[M.id];Y===void 0&&(Y={},i[M.id]=Y);let z=Y[C.id];z===void 0&&(z={},Y[C.id]=z);let W=z[O];return W===void 0&&(W=d(c()),z[O]=W),W}function d(M){const C=[],V=[],O=[];for(let Y=0;Y<e;Y++)C[Y]=0,V[Y]=0,O[Y]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:C,enabledAttributes:V,attributeDivisors:O,object:M,attributes:{},index:null}}function m(M,C,V,O){const Y=r.attributes,z=C.attributes;let W=0;const K=V.getAttributes();for(const H in K)if(K[H].location>=0){const ut=Y[H];let j=z[H];if(j===void 0&&(H==="instanceMatrix"&&M.instanceMatrix&&(j=M.instanceMatrix),H==="instanceColor"&&M.instanceColor&&(j=M.instanceColor)),ut===void 0||ut.attribute!==j||j&&ut.data!==j.data)return!0;W++}return r.attributesNum!==W||r.index!==O}function g(M,C,V,O){const Y={},z=C.attributes;let W=0;const K=V.getAttributes();for(const H in K)if(K[H].location>=0){let ut=z[H];ut===void 0&&(H==="instanceMatrix"&&M.instanceMatrix&&(ut=M.instanceMatrix),H==="instanceColor"&&M.instanceColor&&(ut=M.instanceColor));const j={};j.attribute=ut,ut&&ut.data&&(j.data=ut.data),Y[H]=j,W++}r.attributes=Y,r.attributesNum=W,r.index=O}function _(){const M=r.newAttributes;for(let C=0,V=M.length;C<V;C++)M[C]=0}function p(M){f(M,0)}function f(M,C){const V=r.newAttributes,O=r.enabledAttributes,Y=r.attributeDivisors;V[M]=1,O[M]===0&&(n.enableVertexAttribArray(M),O[M]=1),Y[M]!==C&&(n.vertexAttribDivisor(M,C),Y[M]=C)}function b(){const M=r.newAttributes,C=r.enabledAttributes;for(let V=0,O=C.length;V<O;V++)C[V]!==M[V]&&(n.disableVertexAttribArray(V),C[V]=0)}function y(M,C,V,O,Y,z,W){W===!0?n.vertexAttribIPointer(M,C,V,Y,z):n.vertexAttribPointer(M,C,V,O,Y,z)}function E(M,C,V,O){_();const Y=O.attributes,z=V.getAttributes(),W=C.defaultAttributeValues;for(const K in z){const H=z[K];if(H.location>=0){let st=Y[K];if(st===void 0&&(K==="instanceMatrix"&&M.instanceMatrix&&(st=M.instanceMatrix),K==="instanceColor"&&M.instanceColor&&(st=M.instanceColor)),st!==void 0){const ut=st.normalized,j=st.itemSize,dt=t.get(st);if(dt===void 0)continue;const Mt=dt.buffer,X=dt.type,et=dt.bytesPerElement,pt=X===n.INT||X===n.UNSIGNED_INT||st.gpuType===Vo;if(st.isInterleavedBufferAttribute){const at=st.data,Tt=at.stride,Rt=st.offset;if(at.isInstancedInterleavedBuffer){for(let Ft=0;Ft<H.locationSize;Ft++)f(H.location+Ft,at.meshPerAttribute);M.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=at.meshPerAttribute*at.count)}else for(let Ft=0;Ft<H.locationSize;Ft++)p(H.location+Ft);n.bindBuffer(n.ARRAY_BUFFER,Mt);for(let Ft=0;Ft<H.locationSize;Ft++)y(H.location+Ft,j/H.locationSize,X,ut,Tt*et,(Rt+j/H.locationSize*Ft)*et,pt)}else{if(st.isInstancedBufferAttribute){for(let at=0;at<H.locationSize;at++)f(H.location+at,st.meshPerAttribute);M.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=st.meshPerAttribute*st.count)}else for(let at=0;at<H.locationSize;at++)p(H.location+at);n.bindBuffer(n.ARRAY_BUFFER,Mt);for(let at=0;at<H.locationSize;at++)y(H.location+at,j/H.locationSize,X,ut,j*et,j/H.locationSize*at*et,pt)}}else if(W!==void 0){const ut=W[K];if(ut!==void 0)switch(ut.length){case 2:n.vertexAttrib2fv(H.location,ut);break;case 3:n.vertexAttrib3fv(H.location,ut);break;case 4:n.vertexAttrib4fv(H.location,ut);break;default:n.vertexAttrib1fv(H.location,ut)}}}}b()}function L(){A();for(const M in i){const C=i[M];for(const V in C){const O=C[V];for(const Y in O)h(O[Y].object),delete O[Y];delete C[V]}delete i[M]}}function T(M){if(i[M.id]===void 0)return;const C=i[M.id];for(const V in C){const O=C[V];for(const Y in O)h(O[Y].object),delete O[Y];delete C[V]}delete i[M.id]}function R(M){for(const C in i){const V=i[C];if(V[M.id]===void 0)continue;const O=V[M.id];for(const Y in O)h(O[Y].object),delete O[Y];delete V[M.id]}}function A(){S(),o=!0,r!==s&&(r=s,l(r.object))}function S(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:A,resetDefaultState:S,dispose:L,releaseStatesOfGeometry:T,releaseStatesOfProgram:R,initAttributes:_,enableAttribute:p,disableUnusedAttributes:b}}function Em(n,t,e){let i;function s(l){i=l}function r(l,h){n.drawArrays(i,l,h),e.update(h,i,1)}function o(l,h,u){u!==0&&(n.drawArraysInstanced(i,l,h,u),e.update(h,i,u))}function a(l,h,u){if(u===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,h,0,u);let m=0;for(let g=0;g<u;g++)m+=h[g];e.update(m,i,1)}function c(l,h,u,d){if(u===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let g=0;g<l.length;g++)o(l[g],h[g],d[g]);else{m.multiDrawArraysInstancedWEBGL(i,l,0,h,0,d,0,u);let g=0;for(let _=0;_<u;_++)g+=h[_]*d[_];e.update(g,i,1)}}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function bm(n,t,e,i){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const R=t.get("EXT_texture_filter_anisotropic");s=n.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(R){return!(R!==Be&&i.convert(R)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(R){const A=R===Ki&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(R!==fn&&i.convert(R)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&R!==ln&&!A)}function c(R){if(R==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=e.precision!==void 0?e.precision:"highp";const h=c(l);h!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const u=e.logarithmicDepthBuffer===!0,d=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),m=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=n.getParameter(n.MAX_TEXTURE_SIZE),p=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),f=n.getParameter(n.MAX_VERTEX_ATTRIBS),b=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),y=n.getParameter(n.MAX_VARYING_VECTORS),E=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),L=g>0,T=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:u,reverseDepthBuffer:d,maxTextures:m,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:p,maxAttributes:f,maxVertexUniforms:b,maxVaryings:y,maxFragmentUniforms:E,vertexTextures:L,maxSamples:T}}function wm(n){const t=this;let e=null,i=0,s=!1,r=!1;const o=new En,a=new Lt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const m=u.length!==0||d||i!==0||s;return s=d,i=u.length,m},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){e=h(u,d,0)},this.setState=function(u,d,m){const g=u.clippingPlanes,_=u.clipIntersection,p=u.clipShadows,f=n.get(u);if(!s||g===null||g.length===0||r&&!p)r?h(null):l();else{const b=r?0:i,y=b*4;let E=f.clippingState||null;c.value=E,E=h(g,d,y,m);for(let L=0;L!==y;++L)E[L]=e[L];f.clippingState=E,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=b}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function h(u,d,m,g){const _=u!==null?u.length:0;let p=null;if(_!==0){if(p=c.value,g!==!0||p===null){const f=m+_*4,b=d.matrixWorldInverse;a.getNormalMatrix(b),(p===null||p.length<f)&&(p=new Float32Array(f));for(let y=0,E=m;y!==_;++y,E+=4)o.copy(u[y]).applyMatrix4(b,a),o.normal.toArray(p,E),p[E+3]=o.constant}c.value=p,c.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,p}}function Tm(n){let t=new WeakMap;function e(o,a){return a===io?o.mapping=_i:a===so&&(o.mapping=vi),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===io||a===so)if(t.has(o)){const c=t.get(o).texture;return e(c,o.mapping)}else{const c=o.image;if(c&&c.height>0){const l=new wd(c.height);return l.fromEquirectangularTexture(n,o),t.set(o,l),o.addEventListener("dispose",s),e(l.texture,o.mapping)}else return null}}return o}function s(o){const a=o.target;a.removeEventListener("dispose",s);const c=t.get(a);c!==void 0&&(t.delete(a),c.dispose())}function r(){t=new WeakMap}return{get:i,dispose:r}}const di=4,Xa=[.125,.215,.35,.446,.526,.582],zn=20,Tr=new Zi,Ya=new Nt;let Ar=null,Cr=0,Rr=0,Pr=!1;const On=(1+Math.sqrt(5))/2,ci=1/On,qa=[new P(-On,ci,0),new P(On,ci,0),new P(-ci,0,On),new P(ci,0,On),new P(0,On,-ci),new P(0,On,ci),new P(-1,1,-1),new P(1,1,-1),new P(-1,1,1),new P(1,1,1)];class ja{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,i=.1,s=100){Ar=this._renderer.getRenderTarget(),Cr=this._renderer.getActiveCubeFace(),Rr=this._renderer.getActiveMipmapLevel(),Pr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(t,i,s,r),e>0&&this._blur(r,0,0,e),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Za(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ja(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(Ar,Cr,Rr),this._renderer.xr.enabled=Pr,t.scissorTest=!1,ys(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===_i||t.mapping===vi?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Ar=this._renderer.getRenderTarget(),Cr=this._renderer.getActiveCubeFace(),Rr=this._renderer.getActiveMipmapLevel(),Pr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=e||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,i={magFilter:$e,minFilter:$e,generateMipmaps:!1,type:Ki,format:Be,colorSpace:yi,depthBuffer:!1},s=Ka(t,e,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ka(t,e,i);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Am(r)),this._blurMaterial=Cm(r,t,e)}return s}_compileMaterial(t){const e=new De(this._lodPlanes[0],t);this._renderer.compile(e,Tr)}_sceneToCubeUV(t,e,i,s){const a=new Xe(90,1,e,i),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,d=h.toneMapping;h.getClearColor(Ya),h.toneMapping=An,h.autoClear=!1;const m=new Gi({name:"PMREM.Background",side:Ae,depthWrite:!1,depthTest:!1}),g=new De(new Ji,m);let _=!1;const p=t.background;p?p.isColor&&(m.color.copy(p),t.background=null,_=!0):(m.color.copy(Ya),_=!0);for(let f=0;f<6;f++){const b=f%3;b===0?(a.up.set(0,c[f],0),a.lookAt(l[f],0,0)):b===1?(a.up.set(0,0,c[f]),a.lookAt(0,l[f],0)):(a.up.set(0,c[f],0),a.lookAt(0,0,l[f]));const y=this._cubeSize;ys(s,b*y,f>2?y:0,y,y),h.setRenderTarget(s),_&&h.render(g,a),h.render(t,a)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=d,h.autoClear=u,t.background=p}_textureToCubeUV(t,e){const i=this._renderer,s=t.mapping===_i||t.mapping===vi;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Za()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ja());const r=s?this._cubemapMaterial:this._equirectMaterial,o=new De(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=t;const c=this._cubeSize;ys(e,0,0,3*c,2*c),i.setRenderTarget(e),i.render(o,Tr)}_applyPMREM(t){const e=this._renderer,i=e.autoClear;e.autoClear=!1;const s=this._lodPlanes.length;for(let r=1;r<s;r++){const o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=qa[(s-r-1)%qa.length];this._blur(t,r-1,r,o,a)}e.autoClear=i}_blur(t,e,i,s,r){const o=this._pingPongRenderTarget;this._halfBlur(t,o,e,i,s,"latitudinal",r),this._halfBlur(o,t,i,i,s,"longitudinal",r)}_halfBlur(t,e,i,s,r,o,a){const c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,u=new De(this._lodPlanes[s],l),d=l.uniforms,m=this._sizeLods[i]-1,g=isFinite(r)?Math.PI/(2*m):2*Math.PI/(2*zn-1),_=r/g,p=isFinite(r)?1+Math.floor(h*_):zn;p>zn&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${zn}`);const f=[];let b=0;for(let R=0;R<zn;++R){const A=R/_,S=Math.exp(-A*A/2);f.push(S),R===0?b+=S:R<p&&(b+=2*S)}for(let R=0;R<f.length;R++)f[R]=f[R]/b;d.envMap.value=t.texture,d.samples.value=p,d.weights.value=f,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:y}=this;d.dTheta.value=g,d.mipInt.value=y-i;const E=this._sizeLods[s],L=3*E*(s>y-di?s-y+di:0),T=4*(this._cubeSize-E);ys(e,L,T,3*E,2*E),c.setRenderTarget(e),c.render(u,Tr)}}function Am(n){const t=[],e=[],i=[];let s=n;const r=n-di+1+Xa.length;for(let o=0;o<r;o++){const a=Math.pow(2,s);e.push(a);let c=1/a;o>n-di?c=Xa[o-n+di-1]:o===0&&(c=0),i.push(c);const l=1/(a-2),h=-l,u=1+l,d=[h,h,u,h,u,u,h,h,u,u,h,u],m=6,g=6,_=3,p=2,f=1,b=new Float32Array(_*g*m),y=new Float32Array(p*g*m),E=new Float32Array(f*g*m);for(let T=0;T<m;T++){const R=T%3*2/3-1,A=T>2?0:-1,S=[R,A,0,R+2/3,A,0,R+2/3,A+1,0,R,A,0,R+2/3,A+1,0,R,A+1,0];b.set(S,_*g*T),y.set(d,p*g*T);const M=[T,T,T,T,T,T];E.set(M,f*g*T)}const L=new Ke;L.setAttribute("position",new $t(b,_)),L.setAttribute("uv",new $t(y,p)),L.setAttribute("faceIndex",new $t(E,f)),t.push(L),s>di&&s--}return{lodPlanes:t,sizeLods:e,sigmas:i}}function Ka(n,t,e){const i=new Yn(n,t,e);return i.texture.mapping=Zs,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function ys(n,t,e,i,s){n.viewport.set(t,e,i,s),n.scissor.set(t,e,i,s)}function Cm(n,t,e){const i=new Float32Array(zn),s=new P(0,1,0);return new Rn({name:"SphericalGaussianBlur",defines:{n:zn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:$o(),fragmentShader:`

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
		`,blending:Tn,depthTest:!1,depthWrite:!1})}function Ja(){return new Rn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:$o(),fragmentShader:`

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
		`,blending:Tn,depthTest:!1,depthWrite:!1})}function Za(){return new Rn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:$o(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Tn,depthTest:!1,depthWrite:!1})}function $o(){return`

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
	`}function Rm(n){let t=new WeakMap,e=null;function i(a){if(a&&a.isTexture){const c=a.mapping,l=c===io||c===so,h=c===_i||c===vi;if(l||h){let u=t.get(a);const d=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return e===null&&(e=new ja(n)),u=l?e.fromEquirectangular(a,u):e.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,t.set(a,u),u.texture;if(u!==void 0)return u.texture;{const m=a.image;return l&&m&&m.height>0||h&&m&&s(m)?(e===null&&(e=new ja(n)),u=l?e.fromEquirectangular(a):e.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,t.set(a,u),a.addEventListener("dispose",r),u.texture):null}}}return a}function s(a){let c=0;const l=6;for(let h=0;h<l;h++)a[h]!==void 0&&c++;return c===l}function r(a){const c=a.target;c.removeEventListener("dispose",r);const l=t.get(c);l!==void 0&&(t.delete(c),l.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:i,dispose:o}}function Pm(n){const t={};function e(i){if(t[i]!==void 0)return t[i];let s;switch(i){case"WEBGL_depth_texture":s=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=n.getExtension(i)}return t[i]=s,s}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){const s=e(i);return s===null&&ui("THREE.WebGLRenderer: "+i+" extension not supported."),s}}}function Dm(n,t,e,i){const s={},r=new WeakMap;function o(u){const d=u.target;d.index!==null&&t.remove(d.index);for(const g in d.attributes)t.remove(d.attributes[g]);d.removeEventListener("dispose",o),delete s[d.id];const m=r.get(d);m&&(t.remove(m),r.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function a(u,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,e.memory.geometries++),d}function c(u){const d=u.attributes;for(const m in d)t.update(d[m],n.ARRAY_BUFFER)}function l(u){const d=[],m=u.index,g=u.attributes.position;let _=0;if(m!==null){const b=m.array;_=m.version;for(let y=0,E=b.length;y<E;y+=3){const L=b[y+0],T=b[y+1],R=b[y+2];d.push(L,T,T,R,R,L)}}else if(g!==void 0){const b=g.array;_=g.version;for(let y=0,E=b.length/3-1;y<E;y+=3){const L=y+0,T=y+1,R=y+2;d.push(L,T,T,R,R,L)}}else return;const p=new(Al(d)?Ll:Dl)(d,1);p.version=_;const f=r.get(u);f&&t.remove(f),r.set(u,p)}function h(u){const d=r.get(u);if(d){const m=u.index;m!==null&&d.version<m.version&&l(u)}else l(u);return r.get(u)}return{get:a,update:c,getWireframeAttribute:h}}function Lm(n,t,e){let i;function s(d){i=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function c(d,m){n.drawElements(i,m,r,d*o),e.update(m,i,1)}function l(d,m,g){g!==0&&(n.drawElementsInstanced(i,m,r,d*o,g),e.update(m,i,g))}function h(d,m,g){if(g===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,m,0,r,d,0,g);let p=0;for(let f=0;f<g;f++)p+=m[f];e.update(p,i,1)}function u(d,m,g,_){if(g===0)return;const p=t.get("WEBGL_multi_draw");if(p===null)for(let f=0;f<d.length;f++)l(d[f]/o,m[f],_[f]);else{p.multiDrawElementsInstancedWEBGL(i,m,0,r,d,0,_,0,g);let f=0;for(let b=0;b<g;b++)f+=m[b]*_[b];e.update(f,i,1)}}this.setMode=s,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Im(n){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,o,a){switch(e.calls++,o){case n.TRIANGLES:e.triangles+=a*(r/3);break;case n.LINES:e.lines+=a*(r/2);break;case n.LINE_STRIP:e.lines+=a*(r-1);break;case n.LINE_LOOP:e.lines+=a*r;break;case n.POINTS:e.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:i}}function Um(n,t,e){const i=new WeakMap,s=new re;function r(o,a,c){const l=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let d=i.get(a);if(d===void 0||d.count!==u){let M=function(){A.dispose(),i.delete(a),a.removeEventListener("dispose",M)};var m=M;d!==void 0&&d.texture.dispose();const g=a.morphAttributes.position!==void 0,_=a.morphAttributes.normal!==void 0,p=a.morphAttributes.color!==void 0,f=a.morphAttributes.position||[],b=a.morphAttributes.normal||[],y=a.morphAttributes.color||[];let E=0;g===!0&&(E=1),_===!0&&(E=2),p===!0&&(E=3);let L=a.attributes.position.count*E,T=1;L>t.maxTextureSize&&(T=Math.ceil(L/t.maxTextureSize),L=t.maxTextureSize);const R=new Float32Array(L*T*4*u),A=new Rl(R,L,T,u);A.type=ln,A.needsUpdate=!0;const S=E*4;for(let C=0;C<u;C++){const V=f[C],O=b[C],Y=y[C],z=L*T*4*C;for(let W=0;W<V.count;W++){const K=W*S;g===!0&&(s.fromBufferAttribute(V,W),R[z+K+0]=s.x,R[z+K+1]=s.y,R[z+K+2]=s.z,R[z+K+3]=0),_===!0&&(s.fromBufferAttribute(O,W),R[z+K+4]=s.x,R[z+K+5]=s.y,R[z+K+6]=s.z,R[z+K+7]=0),p===!0&&(s.fromBufferAttribute(Y,W),R[z+K+8]=s.x,R[z+K+9]=s.y,R[z+K+10]=s.z,R[z+K+11]=Y.itemSize===4?s.w:1)}}d={count:u,texture:A,size:new Ht(L,T)},i.set(a,d),a.addEventListener("dispose",M)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(n,"morphTexture",o.morphTexture,e);else{let g=0;for(let p=0;p<l.length;p++)g+=l[p];const _=a.morphTargetsRelative?1:1-g;c.getUniforms().setValue(n,"morphTargetBaseInfluence",_),c.getUniforms().setValue(n,"morphTargetInfluences",l)}c.getUniforms().setValue(n,"morphTargetsTexture",d.texture,e),c.getUniforms().setValue(n,"morphTargetsTextureSize",d.size)}return{update:r}}function Fm(n,t,e,i){let s=new WeakMap;function r(c){const l=i.render.frame,h=c.geometry,u=t.get(c,h);if(s.get(u)!==l&&(t.update(u),s.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),s.get(c)!==l&&(e.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,n.ARRAY_BUFFER),s.set(c,l))),c.isSkinnedMesh){const d=c.skeleton;s.get(d)!==l&&(d.update(),s.set(d,l))}return u}function o(){s=new WeakMap}function a(c){const l=c.target;l.removeEventListener("dispose",a),e.remove(l.instanceMatrix),l.instanceColor!==null&&e.remove(l.instanceColor)}return{update:r,dispose:o}}const zl=new Me,Qa=new Bl(1,1),Hl=new Rl,Vl=new ld,Gl=new Fl,$a=[],tc=[],ec=new Float32Array(16),nc=new Float32Array(9),ic=new Float32Array(4);function Ai(n,t,e){const i=n[0];if(i<=0||i>0)return n;const s=t*e;let r=$a[s];if(r===void 0&&(r=new Float32Array(s),$a[s]=r),t!==0){i.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,n[o].toArray(r,a)}return r}function he(n,t){if(n.length!==t.length)return!1;for(let e=0,i=n.length;e<i;e++)if(n[e]!==t[e])return!1;return!0}function ue(n,t){for(let e=0,i=t.length;e<i;e++)n[e]=t[e]}function tr(n,t){let e=tc[t];e===void 0&&(e=new Int32Array(t),tc[t]=e);for(let i=0;i!==t;++i)e[i]=n.allocateTextureUnit();return e}function Nm(n,t){const e=this.cache;e[0]!==t&&(n.uniform1f(this.addr,t),e[0]=t)}function Bm(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(he(e,t))return;n.uniform2fv(this.addr,t),ue(e,t)}}function Om(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(n.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(he(e,t))return;n.uniform3fv(this.addr,t),ue(e,t)}}function km(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(he(e,t))return;n.uniform4fv(this.addr,t),ue(e,t)}}function zm(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(he(e,t))return;n.uniformMatrix2fv(this.addr,!1,t),ue(e,t)}else{if(he(e,i))return;ic.set(i),n.uniformMatrix2fv(this.addr,!1,ic),ue(e,i)}}function Hm(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(he(e,t))return;n.uniformMatrix3fv(this.addr,!1,t),ue(e,t)}else{if(he(e,i))return;nc.set(i),n.uniformMatrix3fv(this.addr,!1,nc),ue(e,i)}}function Vm(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(he(e,t))return;n.uniformMatrix4fv(this.addr,!1,t),ue(e,t)}else{if(he(e,i))return;ec.set(i),n.uniformMatrix4fv(this.addr,!1,ec),ue(e,i)}}function Gm(n,t){const e=this.cache;e[0]!==t&&(n.uniform1i(this.addr,t),e[0]=t)}function Wm(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(he(e,t))return;n.uniform2iv(this.addr,t),ue(e,t)}}function Xm(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(he(e,t))return;n.uniform3iv(this.addr,t),ue(e,t)}}function Ym(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(he(e,t))return;n.uniform4iv(this.addr,t),ue(e,t)}}function qm(n,t){const e=this.cache;e[0]!==t&&(n.uniform1ui(this.addr,t),e[0]=t)}function jm(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(he(e,t))return;n.uniform2uiv(this.addr,t),ue(e,t)}}function Km(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(he(e,t))return;n.uniform3uiv(this.addr,t),ue(e,t)}}function Jm(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(he(e,t))return;n.uniform4uiv(this.addr,t),ue(e,t)}}function Zm(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_2D_SHADOW?(Qa.compareFunction=Tl,r=Qa):r=zl,e.setTexture2D(t||r,s)}function Qm(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture3D(t||Vl,s)}function $m(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTextureCube(t||Gl,s)}function tg(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture2DArray(t||Hl,s)}function eg(n){switch(n){case 5126:return Nm;case 35664:return Bm;case 35665:return Om;case 35666:return km;case 35674:return zm;case 35675:return Hm;case 35676:return Vm;case 5124:case 35670:return Gm;case 35667:case 35671:return Wm;case 35668:case 35672:return Xm;case 35669:case 35673:return Ym;case 5125:return qm;case 36294:return jm;case 36295:return Km;case 36296:return Jm;case 35678:case 36198:case 36298:case 36306:case 35682:return Zm;case 35679:case 36299:case 36307:return Qm;case 35680:case 36300:case 36308:case 36293:return $m;case 36289:case 36303:case 36311:case 36292:return tg}}function ng(n,t){n.uniform1fv(this.addr,t)}function ig(n,t){const e=Ai(t,this.size,2);n.uniform2fv(this.addr,e)}function sg(n,t){const e=Ai(t,this.size,3);n.uniform3fv(this.addr,e)}function rg(n,t){const e=Ai(t,this.size,4);n.uniform4fv(this.addr,e)}function og(n,t){const e=Ai(t,this.size,4);n.uniformMatrix2fv(this.addr,!1,e)}function ag(n,t){const e=Ai(t,this.size,9);n.uniformMatrix3fv(this.addr,!1,e)}function cg(n,t){const e=Ai(t,this.size,16);n.uniformMatrix4fv(this.addr,!1,e)}function lg(n,t){n.uniform1iv(this.addr,t)}function hg(n,t){n.uniform2iv(this.addr,t)}function ug(n,t){n.uniform3iv(this.addr,t)}function dg(n,t){n.uniform4iv(this.addr,t)}function fg(n,t){n.uniform1uiv(this.addr,t)}function pg(n,t){n.uniform2uiv(this.addr,t)}function mg(n,t){n.uniform3uiv(this.addr,t)}function gg(n,t){n.uniform4uiv(this.addr,t)}function _g(n,t,e){const i=this.cache,s=t.length,r=tr(e,s);he(i,r)||(n.uniform1iv(this.addr,r),ue(i,r));for(let o=0;o!==s;++o)e.setTexture2D(t[o]||zl,r[o])}function vg(n,t,e){const i=this.cache,s=t.length,r=tr(e,s);he(i,r)||(n.uniform1iv(this.addr,r),ue(i,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||Vl,r[o])}function xg(n,t,e){const i=this.cache,s=t.length,r=tr(e,s);he(i,r)||(n.uniform1iv(this.addr,r),ue(i,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||Gl,r[o])}function Mg(n,t,e){const i=this.cache,s=t.length,r=tr(e,s);he(i,r)||(n.uniform1iv(this.addr,r),ue(i,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||Hl,r[o])}function yg(n){switch(n){case 5126:return ng;case 35664:return ig;case 35665:return sg;case 35666:return rg;case 35674:return og;case 35675:return ag;case 35676:return cg;case 5124:case 35670:return lg;case 35667:case 35671:return hg;case 35668:case 35672:return ug;case 35669:case 35673:return dg;case 5125:return fg;case 36294:return pg;case 36295:return mg;case 36296:return gg;case 35678:case 36198:case 36298:case 36306:case 35682:return _g;case 35679:case 36299:case 36307:return vg;case 35680:case 36300:case 36308:case 36293:return xg;case 36289:case 36303:case 36311:case 36292:return Mg}}class Sg{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=eg(e.type)}}class Eg{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=yg(e.type)}}class bg{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(t,e[a.id],i)}}}const Dr=/(\w+)(\])?(\[|\.)?/g;function sc(n,t){n.seq.push(t),n.map[t.id]=t}function wg(n,t,e){const i=n.name,s=i.length;for(Dr.lastIndex=0;;){const r=Dr.exec(i),o=Dr.lastIndex;let a=r[1];const c=r[2]==="]",l=r[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===s){sc(e,l===void 0?new Sg(a,n,t):new Eg(a,n,t));break}else{let u=e.map[a];u===void 0&&(u=new bg(a),sc(e,u)),e=u}}}class Ns{constructor(t,e){this.seq=[],this.map={};const i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let s=0;s<i;++s){const r=t.getActiveUniform(e,s),o=t.getUniformLocation(e,r.name);wg(r,o,this)}}setValue(t,e,i,s){const r=this.map[e];r!==void 0&&r.setValue(t,i,s)}setOptional(t,e,i){const s=e[i];s!==void 0&&this.setValue(t,i,s)}static upload(t,e,i,s){for(let r=0,o=e.length;r!==o;++r){const a=e[r],c=i[a.id];c.needsUpdate!==!1&&a.setValue(t,c.value,s)}}static seqWithValue(t,e){const i=[];for(let s=0,r=t.length;s!==r;++s){const o=t[s];o.id in e&&i.push(o)}return i}}function rc(n,t,e){const i=n.createShader(t);return n.shaderSource(i,e),n.compileShader(i),i}const Tg=37297;let Ag=0;function Cg(n,t){const e=n.split(`
`),i=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){const a=o+1;i.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return i.join(`
`)}const oc=new Lt;function Rg(n){Yt._getMatrix(oc,Yt.workingColorSpace,n);const t=`mat3( ${oc.elements.map(e=>e.toFixed(4))} )`;switch(Yt.getTransfer(n)){case Vs:return[t,"LinearTransferOETF"];case Jt:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",n),[t,"LinearTransferOETF"]}}function ac(n,t,e){const i=n.getShaderParameter(t,n.COMPILE_STATUS),s=n.getShaderInfoLog(t).trim();if(i&&s==="")return"";const r=/ERROR: 0:(\d+)/.exec(s);if(r){const o=parseInt(r[1]);return e.toUpperCase()+`

`+s+`

`+Cg(n.getShaderSource(t),o)}else return s}function Pg(n,t){const e=Rg(t);return[`vec4 ${n}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function Dg(n,t){let e;switch(t){case no:e="Linear";break;case Mu:e="Reinhard";break;case yu:e="Cineon";break;case Su:e="ACESFilmic";break;case bu:e="AgX";break;case wu:e="Neutral";break;case Eu:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+n+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const Ss=new P;function Lg(){Yt.getLuminanceCoefficients(Ss);const n=Ss.x.toFixed(4),t=Ss.y.toFixed(4),e=Ss.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ig(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Bi).join(`
`)}function Ug(n){const t=[];for(const e in n){const i=n[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function Fg(n,t){const e={},i=n.getProgramParameter(t,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){const r=n.getActiveAttrib(t,s),o=r.name;let a=1;r.type===n.FLOAT_MAT2&&(a=2),r.type===n.FLOAT_MAT3&&(a=3),r.type===n.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:n.getAttribLocation(t,o),locationSize:a}}return e}function Bi(n){return n!==""}function cc(n,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function lc(n,t){return n.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Ng=/^[ \t]*#include +<([\w\d./]+)>/gm;function No(n){return n.replace(Ng,Og)}const Bg=new Map;function Og(n,t){let e=Ut[t];if(e===void 0){const i=Bg.get(t);if(i!==void 0)e=Ut[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return No(e)}const kg=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function hc(n){return n.replace(kg,zg)}function zg(n,t,e,i){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function uc(n){let t=`precision ${n.precision} float;
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
#define LOW_PRECISION`),t}function Hg(n){let t="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===fl?t="SHADOWMAP_TYPE_PCF":n.shadowMapType===$h?t="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===cn&&(t="SHADOWMAP_TYPE_VSM"),t}function Vg(n){let t="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case _i:case vi:t="ENVMAP_TYPE_CUBE";break;case Zs:t="ENVMAP_TYPE_CUBE_UV";break}return t}function Gg(n){let t="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case vi:t="ENVMAP_MODE_REFRACTION";break}return t}function Wg(n){let t="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case Ho:t="ENVMAP_BLENDING_MULTIPLY";break;case vu:t="ENVMAP_BLENDING_MIX";break;case xu:t="ENVMAP_BLENDING_ADD";break}return t}function Xg(n){const t=n.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:i,maxMip:e}}function Yg(n,t,e,i){const s=n.getContext(),r=e.defines;let o=e.vertexShader,a=e.fragmentShader;const c=Hg(e),l=Vg(e),h=Gg(e),u=Wg(e),d=Xg(e),m=Ig(e),g=Ug(r),_=s.createProgram();let p,f,b=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Bi).join(`
`),p.length>0&&(p+=`
`),f=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Bi).join(`
`),f.length>0&&(f+=`
`)):(p=[uc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Bi).join(`
`),f=[uc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==An?"#define TONE_MAPPING":"",e.toneMapping!==An?Ut.tonemapping_pars_fragment:"",e.toneMapping!==An?Dg("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Ut.colorspace_pars_fragment,Pg("linearToOutputTexel",e.outputColorSpace),Lg(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Bi).join(`
`)),o=No(o),o=cc(o,e),o=lc(o,e),a=No(a),a=cc(a,e),a=lc(a,e),o=hc(o),a=hc(a),e.isRawShaderMaterial!==!0&&(b=`#version 300 es
`,p=[m,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,f=["#define varying in",e.glslVersion===va?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===va?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);const y=b+p+o,E=b+f+a,L=rc(s,s.VERTEX_SHADER,y),T=rc(s,s.FRAGMENT_SHADER,E);s.attachShader(_,L),s.attachShader(_,T),e.index0AttributeName!==void 0?s.bindAttribLocation(_,0,e.index0AttributeName):e.morphTargets===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function R(C){if(n.debug.checkShaderErrors){const V=s.getProgramInfoLog(_).trim(),O=s.getShaderInfoLog(L).trim(),Y=s.getShaderInfoLog(T).trim();let z=!0,W=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(z=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,_,L,T);else{const K=ac(s,L,"vertex"),H=ac(s,T,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+V+`
`+K+`
`+H)}else V!==""?console.warn("THREE.WebGLProgram: Program Info Log:",V):(O===""||Y==="")&&(W=!1);W&&(C.diagnostics={runnable:z,programLog:V,vertexShader:{log:O,prefix:p},fragmentShader:{log:Y,prefix:f}})}s.deleteShader(L),s.deleteShader(T),A=new Ns(s,_),S=Fg(s,_)}let A;this.getUniforms=function(){return A===void 0&&R(this),A};let S;this.getAttributes=function(){return S===void 0&&R(this),S};let M=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return M===!1&&(M=s.getProgramParameter(_,Tg)),M},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Ag++,this.cacheKey=t,this.usedTimes=1,this.program=_,this.vertexShader=L,this.fragmentShader=T,this}let qg=0;class jg{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,i=t.fragmentShader,s=this._getShaderStage(e),r=this._getShaderStage(i),o=this._getShaderCacheForMaterial(t);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){const e=this.shaderCache;let i=e.get(t);return i===void 0&&(i=new Kg(t),e.set(t,i)),i}}class Kg{constructor(t){this.id=qg++,this.code=t,this.usedTimes=0}}function Jg(n,t,e,i,s,r,o){const a=new Jo,c=new jg,l=new Set,h=[],u=s.logarithmicDepthBuffer,d=s.vertexTextures;let m=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(S){return l.add(S),S===0?"uv":`uv${S}`}function p(S,M,C,V,O){const Y=V.fog,z=O.geometry,W=S.isMeshStandardMaterial?V.environment:null,K=(S.isMeshStandardMaterial?e:t).get(S.envMap||W),H=K&&K.mapping===Zs?K.image.height:null,st=g[S.type];S.precision!==null&&(m=s.getMaxPrecision(S.precision),m!==S.precision&&console.warn("THREE.WebGLProgram.getParameters:",S.precision,"not supported, using",m,"instead."));const ut=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,j=ut!==void 0?ut.length:0;let dt=0;z.morphAttributes.position!==void 0&&(dt=1),z.morphAttributes.normal!==void 0&&(dt=2),z.morphAttributes.color!==void 0&&(dt=3);let Mt,X,et,pt;if(st){const Kt=Qe[st];Mt=Kt.vertexShader,X=Kt.fragmentShader}else Mt=S.vertexShader,X=S.fragmentShader,c.update(S),et=c.getVertexShaderID(S),pt=c.getFragmentShaderID(S);const at=n.getRenderTarget(),Tt=n.state.buffers.depth.getReversed(),Rt=O.isInstancedMesh===!0,Ft=O.isBatchedMesh===!0,ne=!!S.map,Vt=!!S.matcap,oe=!!K,D=!!S.aoMap,Ie=!!S.lightMap,Ot=!!S.bumpMap,kt=!!S.normalMap,St=!!S.displacementMap,te=!!S.emissiveMap,yt=!!S.metalnessMap,w=!!S.roughnessMap,v=S.anisotropy>0,N=S.clearcoat>0,J=S.dispersion>0,Q=S.iridescence>0,q=S.sheen>0,xt=S.transmission>0,ct=v&&!!S.anisotropyMap,mt=N&&!!S.clearcoatMap,Gt=N&&!!S.clearcoatNormalMap,nt=N&&!!S.clearcoatRoughnessMap,gt=Q&&!!S.iridescenceMap,wt=Q&&!!S.iridescenceThicknessMap,At=q&&!!S.sheenColorMap,_t=q&&!!S.sheenRoughnessMap,zt=!!S.specularMap,It=!!S.specularColorMap,Qt=!!S.specularIntensityMap,I=xt&&!!S.transmissionMap,rt=xt&&!!S.thicknessMap,G=!!S.gradientMap,Z=!!S.alphaMap,ht=S.alphaTest>0,lt=!!S.alphaHash,Dt=!!S.extensions;let ie=An;S.toneMapped&&(at===null||at.isXRRenderTarget===!0)&&(ie=n.toneMapping);const _e={shaderID:st,shaderType:S.type,shaderName:S.name,vertexShader:Mt,fragmentShader:X,defines:S.defines,customVertexShaderID:et,customFragmentShaderID:pt,isRawShaderMaterial:S.isRawShaderMaterial===!0,glslVersion:S.glslVersion,precision:m,batching:Ft,batchingColor:Ft&&O._colorsTexture!==null,instancing:Rt,instancingColor:Rt&&O.instanceColor!==null,instancingMorph:Rt&&O.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:at===null?n.outputColorSpace:at.isXRRenderTarget===!0?at.texture.colorSpace:yi,alphaToCoverage:!!S.alphaToCoverage,map:ne,matcap:Vt,envMap:oe,envMapMode:oe&&K.mapping,envMapCubeUVHeight:H,aoMap:D,lightMap:Ie,bumpMap:Ot,normalMap:kt,displacementMap:d&&St,emissiveMap:te,normalMapObjectSpace:kt&&S.normalMapType===Ru,normalMapTangentSpace:kt&&S.normalMapType===wl,metalnessMap:yt,roughnessMap:w,anisotropy:v,anisotropyMap:ct,clearcoat:N,clearcoatMap:mt,clearcoatNormalMap:Gt,clearcoatRoughnessMap:nt,dispersion:J,iridescence:Q,iridescenceMap:gt,iridescenceThicknessMap:wt,sheen:q,sheenColorMap:At,sheenRoughnessMap:_t,specularMap:zt,specularColorMap:It,specularIntensityMap:Qt,transmission:xt,transmissionMap:I,thicknessMap:rt,gradientMap:G,opaque:S.transparent===!1&&S.blending===fi&&S.alphaToCoverage===!1,alphaMap:Z,alphaTest:ht,alphaHash:lt,combine:S.combine,mapUv:ne&&_(S.map.channel),aoMapUv:D&&_(S.aoMap.channel),lightMapUv:Ie&&_(S.lightMap.channel),bumpMapUv:Ot&&_(S.bumpMap.channel),normalMapUv:kt&&_(S.normalMap.channel),displacementMapUv:St&&_(S.displacementMap.channel),emissiveMapUv:te&&_(S.emissiveMap.channel),metalnessMapUv:yt&&_(S.metalnessMap.channel),roughnessMapUv:w&&_(S.roughnessMap.channel),anisotropyMapUv:ct&&_(S.anisotropyMap.channel),clearcoatMapUv:mt&&_(S.clearcoatMap.channel),clearcoatNormalMapUv:Gt&&_(S.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:nt&&_(S.clearcoatRoughnessMap.channel),iridescenceMapUv:gt&&_(S.iridescenceMap.channel),iridescenceThicknessMapUv:wt&&_(S.iridescenceThicknessMap.channel),sheenColorMapUv:At&&_(S.sheenColorMap.channel),sheenRoughnessMapUv:_t&&_(S.sheenRoughnessMap.channel),specularMapUv:zt&&_(S.specularMap.channel),specularColorMapUv:It&&_(S.specularColorMap.channel),specularIntensityMapUv:Qt&&_(S.specularIntensityMap.channel),transmissionMapUv:I&&_(S.transmissionMap.channel),thicknessMapUv:rt&&_(S.thicknessMap.channel),alphaMapUv:Z&&_(S.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&(kt||v),vertexColors:S.vertexColors,vertexAlphas:S.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,pointsUvs:O.isPoints===!0&&!!z.attributes.uv&&(ne||Z),fog:!!Y,useFog:S.fog===!0,fogExp2:!!Y&&Y.isFogExp2,flatShading:S.flatShading===!0,sizeAttenuation:S.sizeAttenuation===!0,logarithmicDepthBuffer:u,reverseDepthBuffer:Tt,skinning:O.isSkinnedMesh===!0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:j,morphTextureStride:dt,numDirLights:M.directional.length,numPointLights:M.point.length,numSpotLights:M.spot.length,numSpotLightMaps:M.spotLightMap.length,numRectAreaLights:M.rectArea.length,numHemiLights:M.hemi.length,numDirLightShadows:M.directionalShadowMap.length,numPointLightShadows:M.pointShadowMap.length,numSpotLightShadows:M.spotShadowMap.length,numSpotLightShadowsWithMaps:M.numSpotLightShadowsWithMaps,numLightProbes:M.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:S.dithering,shadowMapEnabled:n.shadowMap.enabled&&C.length>0,shadowMapType:n.shadowMap.type,toneMapping:ie,decodeVideoTexture:ne&&S.map.isVideoTexture===!0&&Yt.getTransfer(S.map.colorSpace)===Jt,decodeVideoTextureEmissive:te&&S.emissiveMap.isVideoTexture===!0&&Yt.getTransfer(S.emissiveMap.colorSpace)===Jt,premultipliedAlpha:S.premultipliedAlpha,doubleSided:S.side===Ye,flipSided:S.side===Ae,useDepthPacking:S.depthPacking>=0,depthPacking:S.depthPacking||0,index0AttributeName:S.index0AttributeName,extensionClipCullDistance:Dt&&S.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Dt&&S.extensions.multiDraw===!0||Ft)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:S.customProgramCacheKey()};return _e.vertexUv1s=l.has(1),_e.vertexUv2s=l.has(2),_e.vertexUv3s=l.has(3),l.clear(),_e}function f(S){const M=[];if(S.shaderID?M.push(S.shaderID):(M.push(S.customVertexShaderID),M.push(S.customFragmentShaderID)),S.defines!==void 0)for(const C in S.defines)M.push(C),M.push(S.defines[C]);return S.isRawShaderMaterial===!1&&(b(M,S),y(M,S),M.push(n.outputColorSpace)),M.push(S.customProgramCacheKey),M.join()}function b(S,M){S.push(M.precision),S.push(M.outputColorSpace),S.push(M.envMapMode),S.push(M.envMapCubeUVHeight),S.push(M.mapUv),S.push(M.alphaMapUv),S.push(M.lightMapUv),S.push(M.aoMapUv),S.push(M.bumpMapUv),S.push(M.normalMapUv),S.push(M.displacementMapUv),S.push(M.emissiveMapUv),S.push(M.metalnessMapUv),S.push(M.roughnessMapUv),S.push(M.anisotropyMapUv),S.push(M.clearcoatMapUv),S.push(M.clearcoatNormalMapUv),S.push(M.clearcoatRoughnessMapUv),S.push(M.iridescenceMapUv),S.push(M.iridescenceThicknessMapUv),S.push(M.sheenColorMapUv),S.push(M.sheenRoughnessMapUv),S.push(M.specularMapUv),S.push(M.specularColorMapUv),S.push(M.specularIntensityMapUv),S.push(M.transmissionMapUv),S.push(M.thicknessMapUv),S.push(M.combine),S.push(M.fogExp2),S.push(M.sizeAttenuation),S.push(M.morphTargetsCount),S.push(M.morphAttributeCount),S.push(M.numDirLights),S.push(M.numPointLights),S.push(M.numSpotLights),S.push(M.numSpotLightMaps),S.push(M.numHemiLights),S.push(M.numRectAreaLights),S.push(M.numDirLightShadows),S.push(M.numPointLightShadows),S.push(M.numSpotLightShadows),S.push(M.numSpotLightShadowsWithMaps),S.push(M.numLightProbes),S.push(M.shadowMapType),S.push(M.toneMapping),S.push(M.numClippingPlanes),S.push(M.numClipIntersection),S.push(M.depthPacking)}function y(S,M){a.disableAll(),M.supportsVertexTextures&&a.enable(0),M.instancing&&a.enable(1),M.instancingColor&&a.enable(2),M.instancingMorph&&a.enable(3),M.matcap&&a.enable(4),M.envMap&&a.enable(5),M.normalMapObjectSpace&&a.enable(6),M.normalMapTangentSpace&&a.enable(7),M.clearcoat&&a.enable(8),M.iridescence&&a.enable(9),M.alphaTest&&a.enable(10),M.vertexColors&&a.enable(11),M.vertexAlphas&&a.enable(12),M.vertexUv1s&&a.enable(13),M.vertexUv2s&&a.enable(14),M.vertexUv3s&&a.enable(15),M.vertexTangents&&a.enable(16),M.anisotropy&&a.enable(17),M.alphaHash&&a.enable(18),M.batching&&a.enable(19),M.dispersion&&a.enable(20),M.batchingColor&&a.enable(21),S.push(a.mask),a.disableAll(),M.fog&&a.enable(0),M.useFog&&a.enable(1),M.flatShading&&a.enable(2),M.logarithmicDepthBuffer&&a.enable(3),M.reverseDepthBuffer&&a.enable(4),M.skinning&&a.enable(5),M.morphTargets&&a.enable(6),M.morphNormals&&a.enable(7),M.morphColors&&a.enable(8),M.premultipliedAlpha&&a.enable(9),M.shadowMapEnabled&&a.enable(10),M.doubleSided&&a.enable(11),M.flipSided&&a.enable(12),M.useDepthPacking&&a.enable(13),M.dithering&&a.enable(14),M.transmission&&a.enable(15),M.sheen&&a.enable(16),M.opaque&&a.enable(17),M.pointsUvs&&a.enable(18),M.decodeVideoTexture&&a.enable(19),M.decodeVideoTextureEmissive&&a.enable(20),M.alphaToCoverage&&a.enable(21),S.push(a.mask)}function E(S){const M=g[S.type];let C;if(M){const V=Qe[M];C=yd.clone(V.uniforms)}else C=S.uniforms;return C}function L(S,M){let C;for(let V=0,O=h.length;V<O;V++){const Y=h[V];if(Y.cacheKey===M){C=Y,++C.usedTimes;break}}return C===void 0&&(C=new Yg(n,M,S,r),h.push(C)),C}function T(S){if(--S.usedTimes===0){const M=h.indexOf(S);h[M]=h[h.length-1],h.pop(),S.destroy()}}function R(S){c.remove(S)}function A(){c.dispose()}return{getParameters:p,getProgramCacheKey:f,getUniforms:E,acquireProgram:L,releaseProgram:T,releaseShaderCache:R,programs:h,dispose:A}}function Zg(){let n=new WeakMap;function t(o){return n.has(o)}function e(o){let a=n.get(o);return a===void 0&&(a={},n.set(o,a)),a}function i(o){n.delete(o)}function s(o,a,c){n.get(o)[a]=c}function r(){n=new WeakMap}return{has:t,get:e,remove:i,update:s,dispose:r}}function Qg(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.material.id!==t.material.id?n.material.id-t.material.id:n.z!==t.z?n.z-t.z:n.id-t.id}function dc(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.z!==t.z?t.z-n.z:n.id-t.id}function fc(){const n=[];let t=0;const e=[],i=[],s=[];function r(){t=0,e.length=0,i.length=0,s.length=0}function o(u,d,m,g,_,p){let f=n[t];return f===void 0?(f={id:u.id,object:u,geometry:d,material:m,groupOrder:g,renderOrder:u.renderOrder,z:_,group:p},n[t]=f):(f.id=u.id,f.object=u,f.geometry=d,f.material=m,f.groupOrder=g,f.renderOrder=u.renderOrder,f.z=_,f.group=p),t++,f}function a(u,d,m,g,_,p){const f=o(u,d,m,g,_,p);m.transmission>0?i.push(f):m.transparent===!0?s.push(f):e.push(f)}function c(u,d,m,g,_,p){const f=o(u,d,m,g,_,p);m.transmission>0?i.unshift(f):m.transparent===!0?s.unshift(f):e.unshift(f)}function l(u,d){e.length>1&&e.sort(u||Qg),i.length>1&&i.sort(d||dc),s.length>1&&s.sort(d||dc)}function h(){for(let u=t,d=n.length;u<d;u++){const m=n[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:e,transmissive:i,transparent:s,init:r,push:a,unshift:c,finish:h,sort:l}}function $g(){let n=new WeakMap;function t(i,s){const r=n.get(i);let o;return r===void 0?(o=new fc,n.set(i,[o])):s>=r.length?(o=new fc,r.push(o)):o=r[s],o}function e(){n=new WeakMap}return{get:t,dispose:e}}function t_(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new P,color:new Nt};break;case"SpotLight":e={position:new P,direction:new P,color:new Nt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new P,color:new Nt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new P,skyColor:new Nt,groundColor:new Nt};break;case"RectAreaLight":e={color:new Nt,position:new P,halfWidth:new P,halfHeight:new P};break}return n[t.id]=e,e}}}function e_(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ht};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ht};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ht,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[t.id]=e,e}}}let n_=0;function i_(n,t){return(t.castShadow?2:0)-(n.castShadow?2:0)+(t.map?1:0)-(n.map?1:0)}function s_(n){const t=new t_,e=e_(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)i.probe.push(new P);const s=new P,r=new Zt,o=new Zt;function a(l){let h=0,u=0,d=0;for(let S=0;S<9;S++)i.probe[S].set(0,0,0);let m=0,g=0,_=0,p=0,f=0,b=0,y=0,E=0,L=0,T=0,R=0;l.sort(i_);for(let S=0,M=l.length;S<M;S++){const C=l[S],V=C.color,O=C.intensity,Y=C.distance,z=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)h+=V.r*O,u+=V.g*O,d+=V.b*O;else if(C.isLightProbe){for(let W=0;W<9;W++)i.probe[W].addScaledVector(C.sh.coefficients[W],O);R++}else if(C.isDirectionalLight){const W=t.get(C);if(W.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const K=C.shadow,H=e.get(C);H.shadowIntensity=K.intensity,H.shadowBias=K.bias,H.shadowNormalBias=K.normalBias,H.shadowRadius=K.radius,H.shadowMapSize=K.mapSize,i.directionalShadow[m]=H,i.directionalShadowMap[m]=z,i.directionalShadowMatrix[m]=C.shadow.matrix,b++}i.directional[m]=W,m++}else if(C.isSpotLight){const W=t.get(C);W.position.setFromMatrixPosition(C.matrixWorld),W.color.copy(V).multiplyScalar(O),W.distance=Y,W.coneCos=Math.cos(C.angle),W.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),W.decay=C.decay,i.spot[_]=W;const K=C.shadow;if(C.map&&(i.spotLightMap[L]=C.map,L++,K.updateMatrices(C),C.castShadow&&T++),i.spotLightMatrix[_]=K.matrix,C.castShadow){const H=e.get(C);H.shadowIntensity=K.intensity,H.shadowBias=K.bias,H.shadowNormalBias=K.normalBias,H.shadowRadius=K.radius,H.shadowMapSize=K.mapSize,i.spotShadow[_]=H,i.spotShadowMap[_]=z,E++}_++}else if(C.isRectAreaLight){const W=t.get(C);W.color.copy(V).multiplyScalar(O),W.halfWidth.set(C.width*.5,0,0),W.halfHeight.set(0,C.height*.5,0),i.rectArea[p]=W,p++}else if(C.isPointLight){const W=t.get(C);if(W.color.copy(C.color).multiplyScalar(C.intensity),W.distance=C.distance,W.decay=C.decay,C.castShadow){const K=C.shadow,H=e.get(C);H.shadowIntensity=K.intensity,H.shadowBias=K.bias,H.shadowNormalBias=K.normalBias,H.shadowRadius=K.radius,H.shadowMapSize=K.mapSize,H.shadowCameraNear=K.camera.near,H.shadowCameraFar=K.camera.far,i.pointShadow[g]=H,i.pointShadowMap[g]=z,i.pointShadowMatrix[g]=C.shadow.matrix,y++}i.point[g]=W,g++}else if(C.isHemisphereLight){const W=t.get(C);W.skyColor.copy(C.color).multiplyScalar(O),W.groundColor.copy(C.groundColor).multiplyScalar(O),i.hemi[f]=W,f++}}p>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=it.LTC_FLOAT_1,i.rectAreaLTC2=it.LTC_FLOAT_2):(i.rectAreaLTC1=it.LTC_HALF_1,i.rectAreaLTC2=it.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=u,i.ambient[2]=d;const A=i.hash;(A.directionalLength!==m||A.pointLength!==g||A.spotLength!==_||A.rectAreaLength!==p||A.hemiLength!==f||A.numDirectionalShadows!==b||A.numPointShadows!==y||A.numSpotShadows!==E||A.numSpotMaps!==L||A.numLightProbes!==R)&&(i.directional.length=m,i.spot.length=_,i.rectArea.length=p,i.point.length=g,i.hemi.length=f,i.directionalShadow.length=b,i.directionalShadowMap.length=b,i.pointShadow.length=y,i.pointShadowMap.length=y,i.spotShadow.length=E,i.spotShadowMap.length=E,i.directionalShadowMatrix.length=b,i.pointShadowMatrix.length=y,i.spotLightMatrix.length=E+L-T,i.spotLightMap.length=L,i.numSpotLightShadowsWithMaps=T,i.numLightProbes=R,A.directionalLength=m,A.pointLength=g,A.spotLength=_,A.rectAreaLength=p,A.hemiLength=f,A.numDirectionalShadows=b,A.numPointShadows=y,A.numSpotShadows=E,A.numSpotMaps=L,A.numLightProbes=R,i.version=n_++)}function c(l,h){let u=0,d=0,m=0,g=0,_=0;const p=h.matrixWorldInverse;for(let f=0,b=l.length;f<b;f++){const y=l[f];if(y.isDirectionalLight){const E=i.directional[u];E.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(p),u++}else if(y.isSpotLight){const E=i.spot[m];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(p),E.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(p),m++}else if(y.isRectAreaLight){const E=i.rectArea[g];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(p),o.identity(),r.copy(y.matrixWorld),r.premultiply(p),o.extractRotation(r),E.halfWidth.set(y.width*.5,0,0),E.halfHeight.set(0,y.height*.5,0),E.halfWidth.applyMatrix4(o),E.halfHeight.applyMatrix4(o),g++}else if(y.isPointLight){const E=i.point[d];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(p),d++}else if(y.isHemisphereLight){const E=i.hemi[_];E.direction.setFromMatrixPosition(y.matrixWorld),E.direction.transformDirection(p),_++}}}return{setup:a,setupView:c,state:i}}function pc(n){const t=new s_(n),e=[],i=[];function s(h){l.camera=h,e.length=0,i.length=0}function r(h){e.push(h)}function o(h){i.push(h)}function a(){t.setup(e)}function c(h){t.setupView(e,h)}const l={lightsArray:e,shadowsArray:i,camera:null,lights:t,transmissionRenderTarget:{}};return{init:s,state:l,setupLights:a,setupLightsView:c,pushLight:r,pushShadow:o}}function r_(n){let t=new WeakMap;function e(s,r=0){const o=t.get(s);let a;return o===void 0?(a=new pc(n),t.set(s,[a])):r>=o.length?(a=new pc(n),o.push(a)):a=o[r],a}function i(){t=new WeakMap}return{get:e,dispose:i}}const o_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,a_=`uniform sampler2D shadow_pass;
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
}`;function c_(n,t,e){let i=new Zo;const s=new Ht,r=new Ht,o=new re,a=new Dd({depthPacking:Cu}),c=new Ld,l={},h=e.maxTextureSize,u={[Cn]:Ae,[Ae]:Cn,[Ye]:Ye},d=new Rn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ht},radius:{value:4}},vertexShader:o_,fragmentShader:a_}),m=d.clone();m.defines.HORIZONTAL_PASS=1;const g=new Ke;g.setAttribute("position",new $t(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new De(g,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=fl;let f=this.type;this.render=function(T,R,A){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||T.length===0)return;const S=n.getRenderTarget(),M=n.getActiveCubeFace(),C=n.getActiveMipmapLevel(),V=n.state;V.setBlending(Tn),V.buffers.color.setClear(1,1,1,1),V.buffers.depth.setTest(!0),V.setScissorTest(!1);const O=f!==cn&&this.type===cn,Y=f===cn&&this.type!==cn;for(let z=0,W=T.length;z<W;z++){const K=T[z],H=K.shadow;if(H===void 0){console.warn("THREE.WebGLShadowMap:",K,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;s.copy(H.mapSize);const st=H.getFrameExtents();if(s.multiply(st),r.copy(H.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/st.x),s.x=r.x*st.x,H.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/st.y),s.y=r.y*st.y,H.mapSize.y=r.y)),H.map===null||O===!0||Y===!0){const j=this.type!==cn?{minFilter:Le,magFilter:Le}:{};H.map!==null&&H.map.dispose(),H.map=new Yn(s.x,s.y,j),H.map.texture.name=K.name+".shadowMap",H.camera.updateProjectionMatrix()}n.setRenderTarget(H.map),n.clear();const ut=H.getViewportCount();for(let j=0;j<ut;j++){const dt=H.getViewport(j);o.set(r.x*dt.x,r.y*dt.y,r.x*dt.z,r.y*dt.w),V.viewport(o),H.updateMatrices(K,j),i=H.getFrustum(),E(R,A,H.camera,K,this.type)}H.isPointLightShadow!==!0&&this.type===cn&&b(H,A),H.needsUpdate=!1}f=this.type,p.needsUpdate=!1,n.setRenderTarget(S,M,C)};function b(T,R){const A=t.update(_);d.defines.VSM_SAMPLES!==T.blurSamples&&(d.defines.VSM_SAMPLES=T.blurSamples,m.defines.VSM_SAMPLES=T.blurSamples,d.needsUpdate=!0,m.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new Yn(s.x,s.y)),d.uniforms.shadow_pass.value=T.map.texture,d.uniforms.resolution.value=T.mapSize,d.uniforms.radius.value=T.radius,n.setRenderTarget(T.mapPass),n.clear(),n.renderBufferDirect(R,null,A,d,_,null),m.uniforms.shadow_pass.value=T.mapPass.texture,m.uniforms.resolution.value=T.mapSize,m.uniforms.radius.value=T.radius,n.setRenderTarget(T.map),n.clear(),n.renderBufferDirect(R,null,A,m,_,null)}function y(T,R,A,S){let M=null;const C=A.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(C!==void 0)M=C;else if(M=A.isPointLight===!0?c:a,n.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0){const V=M.uuid,O=R.uuid;let Y=l[V];Y===void 0&&(Y={},l[V]=Y);let z=Y[O];z===void 0&&(z=M.clone(),Y[O]=z,R.addEventListener("dispose",L)),M=z}if(M.visible=R.visible,M.wireframe=R.wireframe,S===cn?M.side=R.shadowSide!==null?R.shadowSide:R.side:M.side=R.shadowSide!==null?R.shadowSide:u[R.side],M.alphaMap=R.alphaMap,M.alphaTest=R.alphaTest,M.map=R.map,M.clipShadows=R.clipShadows,M.clippingPlanes=R.clippingPlanes,M.clipIntersection=R.clipIntersection,M.displacementMap=R.displacementMap,M.displacementScale=R.displacementScale,M.displacementBias=R.displacementBias,M.wireframeLinewidth=R.wireframeLinewidth,M.linewidth=R.linewidth,A.isPointLight===!0&&M.isMeshDistanceMaterial===!0){const V=n.properties.get(M);V.light=A}return M}function E(T,R,A,S,M){if(T.visible===!1)return;if(T.layers.test(R.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&M===cn)&&(!T.frustumCulled||i.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(A.matrixWorldInverse,T.matrixWorld);const O=t.update(T),Y=T.material;if(Array.isArray(Y)){const z=O.groups;for(let W=0,K=z.length;W<K;W++){const H=z[W],st=Y[H.materialIndex];if(st&&st.visible){const ut=y(T,st,S,M);T.onBeforeShadow(n,T,R,A,O,ut,H),n.renderBufferDirect(A,null,O,ut,T,H),T.onAfterShadow(n,T,R,A,O,ut,H)}}}else if(Y.visible){const z=y(T,Y,S,M);T.onBeforeShadow(n,T,R,A,O,z,null),n.renderBufferDirect(A,null,O,z,T,null),T.onAfterShadow(n,T,R,A,O,z,null)}}const V=T.children;for(let O=0,Y=V.length;O<Y;O++)E(V[O],R,A,S,M)}function L(T){T.target.removeEventListener("dispose",L);for(const A in l){const S=l[A],M=T.target.uuid;M in S&&(S[M].dispose(),delete S[M])}}}const l_={[Kr]:Jr,[Zr]:to,[Qr]:eo,[gi]:$r,[Jr]:Kr,[to]:Zr,[eo]:Qr,[$r]:gi};function h_(n,t){function e(){let I=!1;const rt=new re;let G=null;const Z=new re(0,0,0,0);return{setMask:function(ht){G!==ht&&!I&&(n.colorMask(ht,ht,ht,ht),G=ht)},setLocked:function(ht){I=ht},setClear:function(ht,lt,Dt,ie,_e){_e===!0&&(ht*=ie,lt*=ie,Dt*=ie),rt.set(ht,lt,Dt,ie),Z.equals(rt)===!1&&(n.clearColor(ht,lt,Dt,ie),Z.copy(rt))},reset:function(){I=!1,G=null,Z.set(-1,0,0,0)}}}function i(){let I=!1,rt=!1,G=null,Z=null,ht=null;return{setReversed:function(lt){if(rt!==lt){const Dt=t.get("EXT_clip_control");rt?Dt.clipControlEXT(Dt.LOWER_LEFT_EXT,Dt.ZERO_TO_ONE_EXT):Dt.clipControlEXT(Dt.LOWER_LEFT_EXT,Dt.NEGATIVE_ONE_TO_ONE_EXT);const ie=ht;ht=null,this.setClear(ie)}rt=lt},getReversed:function(){return rt},setTest:function(lt){lt?at(n.DEPTH_TEST):Tt(n.DEPTH_TEST)},setMask:function(lt){G!==lt&&!I&&(n.depthMask(lt),G=lt)},setFunc:function(lt){if(rt&&(lt=l_[lt]),Z!==lt){switch(lt){case Kr:n.depthFunc(n.NEVER);break;case Jr:n.depthFunc(n.ALWAYS);break;case Zr:n.depthFunc(n.LESS);break;case gi:n.depthFunc(n.LEQUAL);break;case Qr:n.depthFunc(n.EQUAL);break;case $r:n.depthFunc(n.GEQUAL);break;case to:n.depthFunc(n.GREATER);break;case eo:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}Z=lt}},setLocked:function(lt){I=lt},setClear:function(lt){ht!==lt&&(rt&&(lt=1-lt),n.clearDepth(lt),ht=lt)},reset:function(){I=!1,G=null,Z=null,ht=null,rt=!1}}}function s(){let I=!1,rt=null,G=null,Z=null,ht=null,lt=null,Dt=null,ie=null,_e=null;return{setTest:function(Kt){I||(Kt?at(n.STENCIL_TEST):Tt(n.STENCIL_TEST))},setMask:function(Kt){rt!==Kt&&!I&&(n.stencilMask(Kt),rt=Kt)},setFunc:function(Kt,ze,en){(G!==Kt||Z!==ze||ht!==en)&&(n.stencilFunc(Kt,ze,en),G=Kt,Z=ze,ht=en)},setOp:function(Kt,ze,en){(lt!==Kt||Dt!==ze||ie!==en)&&(n.stencilOp(Kt,ze,en),lt=Kt,Dt=ze,ie=en)},setLocked:function(Kt){I=Kt},setClear:function(Kt){_e!==Kt&&(n.clearStencil(Kt),_e=Kt)},reset:function(){I=!1,rt=null,G=null,Z=null,ht=null,lt=null,Dt=null,ie=null,_e=null}}}const r=new e,o=new i,a=new s,c=new WeakMap,l=new WeakMap;let h={},u={},d=new WeakMap,m=[],g=null,_=!1,p=null,f=null,b=null,y=null,E=null,L=null,T=null,R=new Nt(0,0,0),A=0,S=!1,M=null,C=null,V=null,O=null,Y=null;const z=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let W=!1,K=0;const H=n.getParameter(n.VERSION);H.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(H)[1]),W=K>=1):H.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(H)[1]),W=K>=2);let st=null,ut={};const j=n.getParameter(n.SCISSOR_BOX),dt=n.getParameter(n.VIEWPORT),Mt=new re().fromArray(j),X=new re().fromArray(dt);function et(I,rt,G,Z){const ht=new Uint8Array(4),lt=n.createTexture();n.bindTexture(I,lt),n.texParameteri(I,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(I,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Dt=0;Dt<G;Dt++)I===n.TEXTURE_3D||I===n.TEXTURE_2D_ARRAY?n.texImage3D(rt,0,n.RGBA,1,1,Z,0,n.RGBA,n.UNSIGNED_BYTE,ht):n.texImage2D(rt+Dt,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,ht);return lt}const pt={};pt[n.TEXTURE_2D]=et(n.TEXTURE_2D,n.TEXTURE_2D,1),pt[n.TEXTURE_CUBE_MAP]=et(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),pt[n.TEXTURE_2D_ARRAY]=et(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),pt[n.TEXTURE_3D]=et(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),at(n.DEPTH_TEST),o.setFunc(gi),Ot(!1),kt(da),at(n.CULL_FACE),D(Tn);function at(I){h[I]!==!0&&(n.enable(I),h[I]=!0)}function Tt(I){h[I]!==!1&&(n.disable(I),h[I]=!1)}function Rt(I,rt){return u[I]!==rt?(n.bindFramebuffer(I,rt),u[I]=rt,I===n.DRAW_FRAMEBUFFER&&(u[n.FRAMEBUFFER]=rt),I===n.FRAMEBUFFER&&(u[n.DRAW_FRAMEBUFFER]=rt),!0):!1}function Ft(I,rt){let G=m,Z=!1;if(I){G=d.get(rt),G===void 0&&(G=[],d.set(rt,G));const ht=I.textures;if(G.length!==ht.length||G[0]!==n.COLOR_ATTACHMENT0){for(let lt=0,Dt=ht.length;lt<Dt;lt++)G[lt]=n.COLOR_ATTACHMENT0+lt;G.length=ht.length,Z=!0}}else G[0]!==n.BACK&&(G[0]=n.BACK,Z=!0);Z&&n.drawBuffers(G)}function ne(I){return g!==I?(n.useProgram(I),g=I,!0):!1}const Vt={[kn]:n.FUNC_ADD,[eu]:n.FUNC_SUBTRACT,[nu]:n.FUNC_REVERSE_SUBTRACT};Vt[iu]=n.MIN,Vt[su]=n.MAX;const oe={[ru]:n.ZERO,[ou]:n.ONE,[au]:n.SRC_COLOR,[qr]:n.SRC_ALPHA,[fu]:n.SRC_ALPHA_SATURATE,[uu]:n.DST_COLOR,[lu]:n.DST_ALPHA,[cu]:n.ONE_MINUS_SRC_COLOR,[jr]:n.ONE_MINUS_SRC_ALPHA,[du]:n.ONE_MINUS_DST_COLOR,[hu]:n.ONE_MINUS_DST_ALPHA,[pu]:n.CONSTANT_COLOR,[mu]:n.ONE_MINUS_CONSTANT_COLOR,[gu]:n.CONSTANT_ALPHA,[_u]:n.ONE_MINUS_CONSTANT_ALPHA};function D(I,rt,G,Z,ht,lt,Dt,ie,_e,Kt){if(I===Tn){_===!0&&(Tt(n.BLEND),_=!1);return}if(_===!1&&(at(n.BLEND),_=!0),I!==tu){if(I!==p||Kt!==S){if((f!==kn||E!==kn)&&(n.blendEquation(n.FUNC_ADD),f=kn,E=kn),Kt)switch(I){case fi:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case fa:n.blendFunc(n.ONE,n.ONE);break;case pa:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case ma:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}else switch(I){case fi:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case fa:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case pa:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case ma:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}b=null,y=null,L=null,T=null,R.set(0,0,0),A=0,p=I,S=Kt}return}ht=ht||rt,lt=lt||G,Dt=Dt||Z,(rt!==f||ht!==E)&&(n.blendEquationSeparate(Vt[rt],Vt[ht]),f=rt,E=ht),(G!==b||Z!==y||lt!==L||Dt!==T)&&(n.blendFuncSeparate(oe[G],oe[Z],oe[lt],oe[Dt]),b=G,y=Z,L=lt,T=Dt),(ie.equals(R)===!1||_e!==A)&&(n.blendColor(ie.r,ie.g,ie.b,_e),R.copy(ie),A=_e),p=I,S=!1}function Ie(I,rt){I.side===Ye?Tt(n.CULL_FACE):at(n.CULL_FACE);let G=I.side===Ae;rt&&(G=!G),Ot(G),I.blending===fi&&I.transparent===!1?D(Tn):D(I.blending,I.blendEquation,I.blendSrc,I.blendDst,I.blendEquationAlpha,I.blendSrcAlpha,I.blendDstAlpha,I.blendColor,I.blendAlpha,I.premultipliedAlpha),o.setFunc(I.depthFunc),o.setTest(I.depthTest),o.setMask(I.depthWrite),r.setMask(I.colorWrite);const Z=I.stencilWrite;a.setTest(Z),Z&&(a.setMask(I.stencilWriteMask),a.setFunc(I.stencilFunc,I.stencilRef,I.stencilFuncMask),a.setOp(I.stencilFail,I.stencilZFail,I.stencilZPass)),te(I.polygonOffset,I.polygonOffsetFactor,I.polygonOffsetUnits),I.alphaToCoverage===!0?at(n.SAMPLE_ALPHA_TO_COVERAGE):Tt(n.SAMPLE_ALPHA_TO_COVERAGE)}function Ot(I){M!==I&&(I?n.frontFace(n.CW):n.frontFace(n.CCW),M=I)}function kt(I){I!==Zh?(at(n.CULL_FACE),I!==C&&(I===da?n.cullFace(n.BACK):I===Qh?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):Tt(n.CULL_FACE),C=I}function St(I){I!==V&&(W&&n.lineWidth(I),V=I)}function te(I,rt,G){I?(at(n.POLYGON_OFFSET_FILL),(O!==rt||Y!==G)&&(n.polygonOffset(rt,G),O=rt,Y=G)):Tt(n.POLYGON_OFFSET_FILL)}function yt(I){I?at(n.SCISSOR_TEST):Tt(n.SCISSOR_TEST)}function w(I){I===void 0&&(I=n.TEXTURE0+z-1),st!==I&&(n.activeTexture(I),st=I)}function v(I,rt,G){G===void 0&&(st===null?G=n.TEXTURE0+z-1:G=st);let Z=ut[G];Z===void 0&&(Z={type:void 0,texture:void 0},ut[G]=Z),(Z.type!==I||Z.texture!==rt)&&(st!==G&&(n.activeTexture(G),st=G),n.bindTexture(I,rt||pt[I]),Z.type=I,Z.texture=rt)}function N(){const I=ut[st];I!==void 0&&I.type!==void 0&&(n.bindTexture(I.type,null),I.type=void 0,I.texture=void 0)}function J(){try{n.compressedTexImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Q(){try{n.compressedTexImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function q(){try{n.texSubImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function xt(){try{n.texSubImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ct(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function mt(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Gt(){try{n.texStorage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function nt(){try{n.texStorage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function gt(){try{n.texImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function wt(){try{n.texImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function At(I){Mt.equals(I)===!1&&(n.scissor(I.x,I.y,I.z,I.w),Mt.copy(I))}function _t(I){X.equals(I)===!1&&(n.viewport(I.x,I.y,I.z,I.w),X.copy(I))}function zt(I,rt){let G=l.get(rt);G===void 0&&(G=new WeakMap,l.set(rt,G));let Z=G.get(I);Z===void 0&&(Z=n.getUniformBlockIndex(rt,I.name),G.set(I,Z))}function It(I,rt){const Z=l.get(rt).get(I);c.get(rt)!==Z&&(n.uniformBlockBinding(rt,Z,I.__bindingPointIndex),c.set(rt,Z))}function Qt(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),o.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),h={},st=null,ut={},u={},d=new WeakMap,m=[],g=null,_=!1,p=null,f=null,b=null,y=null,E=null,L=null,T=null,R=new Nt(0,0,0),A=0,S=!1,M=null,C=null,V=null,O=null,Y=null,Mt.set(0,0,n.canvas.width,n.canvas.height),X.set(0,0,n.canvas.width,n.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:at,disable:Tt,bindFramebuffer:Rt,drawBuffers:Ft,useProgram:ne,setBlending:D,setMaterial:Ie,setFlipSided:Ot,setCullFace:kt,setLineWidth:St,setPolygonOffset:te,setScissorTest:yt,activeTexture:w,bindTexture:v,unbindTexture:N,compressedTexImage2D:J,compressedTexImage3D:Q,texImage2D:gt,texImage3D:wt,updateUBOMapping:zt,uniformBlockBinding:It,texStorage2D:Gt,texStorage3D:nt,texSubImage2D:q,texSubImage3D:xt,compressedTexSubImage2D:ct,compressedTexSubImage3D:mt,scissor:At,viewport:_t,reset:Qt}}function u_(n,t,e,i,s,r,o){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Ht,h=new WeakMap;let u;const d=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(w,v){return m?new OffscreenCanvas(w,v):Ws("canvas")}function _(w,v,N){let J=1;const Q=yt(w);if((Q.width>N||Q.height>N)&&(J=N/Math.max(Q.width,Q.height)),J<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){const q=Math.floor(J*Q.width),xt=Math.floor(J*Q.height);u===void 0&&(u=g(q,xt));const ct=v?g(q,xt):u;return ct.width=q,ct.height=xt,ct.getContext("2d").drawImage(w,0,0,q,xt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+Q.width+"x"+Q.height+") to ("+q+"x"+xt+")."),ct}else return"data"in w&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+Q.width+"x"+Q.height+")."),w;return w}function p(w){return w.generateMipmaps}function f(w){n.generateMipmap(w)}function b(w){return w.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:w.isWebGL3DRenderTarget?n.TEXTURE_3D:w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function y(w,v,N,J,Q=!1){if(w!==null){if(n[w]!==void 0)return n[w];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let q=v;if(v===n.RED&&(N===n.FLOAT&&(q=n.R32F),N===n.HALF_FLOAT&&(q=n.R16F),N===n.UNSIGNED_BYTE&&(q=n.R8)),v===n.RED_INTEGER&&(N===n.UNSIGNED_BYTE&&(q=n.R8UI),N===n.UNSIGNED_SHORT&&(q=n.R16UI),N===n.UNSIGNED_INT&&(q=n.R32UI),N===n.BYTE&&(q=n.R8I),N===n.SHORT&&(q=n.R16I),N===n.INT&&(q=n.R32I)),v===n.RG&&(N===n.FLOAT&&(q=n.RG32F),N===n.HALF_FLOAT&&(q=n.RG16F),N===n.UNSIGNED_BYTE&&(q=n.RG8)),v===n.RG_INTEGER&&(N===n.UNSIGNED_BYTE&&(q=n.RG8UI),N===n.UNSIGNED_SHORT&&(q=n.RG16UI),N===n.UNSIGNED_INT&&(q=n.RG32UI),N===n.BYTE&&(q=n.RG8I),N===n.SHORT&&(q=n.RG16I),N===n.INT&&(q=n.RG32I)),v===n.RGB_INTEGER&&(N===n.UNSIGNED_BYTE&&(q=n.RGB8UI),N===n.UNSIGNED_SHORT&&(q=n.RGB16UI),N===n.UNSIGNED_INT&&(q=n.RGB32UI),N===n.BYTE&&(q=n.RGB8I),N===n.SHORT&&(q=n.RGB16I),N===n.INT&&(q=n.RGB32I)),v===n.RGBA_INTEGER&&(N===n.UNSIGNED_BYTE&&(q=n.RGBA8UI),N===n.UNSIGNED_SHORT&&(q=n.RGBA16UI),N===n.UNSIGNED_INT&&(q=n.RGBA32UI),N===n.BYTE&&(q=n.RGBA8I),N===n.SHORT&&(q=n.RGBA16I),N===n.INT&&(q=n.RGBA32I)),v===n.RGB&&N===n.UNSIGNED_INT_5_9_9_9_REV&&(q=n.RGB9_E5),v===n.RGBA){const xt=Q?Vs:Yt.getTransfer(J);N===n.FLOAT&&(q=n.RGBA32F),N===n.HALF_FLOAT&&(q=n.RGBA16F),N===n.UNSIGNED_BYTE&&(q=xt===Jt?n.SRGB8_ALPHA8:n.RGBA8),N===n.UNSIGNED_SHORT_4_4_4_4&&(q=n.RGBA4),N===n.UNSIGNED_SHORT_5_5_5_1&&(q=n.RGB5_A1)}return(q===n.R16F||q===n.R32F||q===n.RG16F||q===n.RG32F||q===n.RGBA16F||q===n.RGBA32F)&&t.get("EXT_color_buffer_float"),q}function E(w,v){let N;return w?v===null||v===Xn||v===xi?N=n.DEPTH24_STENCIL8:v===ln?N=n.DEPTH32F_STENCIL8:v===Yi&&(N=n.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===Xn||v===xi?N=n.DEPTH_COMPONENT24:v===ln?N=n.DEPTH_COMPONENT32F:v===Yi&&(N=n.DEPTH_COMPONENT16),N}function L(w,v){return p(w)===!0||w.isFramebufferTexture&&w.minFilter!==Le&&w.minFilter!==$e?Math.log2(Math.max(v.width,v.height))+1:w.mipmaps!==void 0&&w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?v.mipmaps.length:1}function T(w){const v=w.target;v.removeEventListener("dispose",T),A(v),v.isVideoTexture&&h.delete(v)}function R(w){const v=w.target;v.removeEventListener("dispose",R),M(v)}function A(w){const v=i.get(w);if(v.__webglInit===void 0)return;const N=w.source,J=d.get(N);if(J){const Q=J[v.__cacheKey];Q.usedTimes--,Q.usedTimes===0&&S(w),Object.keys(J).length===0&&d.delete(N)}i.remove(w)}function S(w){const v=i.get(w);n.deleteTexture(v.__webglTexture);const N=w.source,J=d.get(N);delete J[v.__cacheKey],o.memory.textures--}function M(w){const v=i.get(w);if(w.depthTexture&&(w.depthTexture.dispose(),i.remove(w.depthTexture)),w.isWebGLCubeRenderTarget)for(let J=0;J<6;J++){if(Array.isArray(v.__webglFramebuffer[J]))for(let Q=0;Q<v.__webglFramebuffer[J].length;Q++)n.deleteFramebuffer(v.__webglFramebuffer[J][Q]);else n.deleteFramebuffer(v.__webglFramebuffer[J]);v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer[J])}else{if(Array.isArray(v.__webglFramebuffer))for(let J=0;J<v.__webglFramebuffer.length;J++)n.deleteFramebuffer(v.__webglFramebuffer[J]);else n.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&n.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let J=0;J<v.__webglColorRenderbuffer.length;J++)v.__webglColorRenderbuffer[J]&&n.deleteRenderbuffer(v.__webglColorRenderbuffer[J]);v.__webglDepthRenderbuffer&&n.deleteRenderbuffer(v.__webglDepthRenderbuffer)}const N=w.textures;for(let J=0,Q=N.length;J<Q;J++){const q=i.get(N[J]);q.__webglTexture&&(n.deleteTexture(q.__webglTexture),o.memory.textures--),i.remove(N[J])}i.remove(w)}let C=0;function V(){C=0}function O(){const w=C;return w>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+w+" texture units while this GPU supports only "+s.maxTextures),C+=1,w}function Y(w){const v=[];return v.push(w.wrapS),v.push(w.wrapT),v.push(w.wrapR||0),v.push(w.magFilter),v.push(w.minFilter),v.push(w.anisotropy),v.push(w.internalFormat),v.push(w.format),v.push(w.type),v.push(w.generateMipmaps),v.push(w.premultiplyAlpha),v.push(w.flipY),v.push(w.unpackAlignment),v.push(w.colorSpace),v.join()}function z(w,v){const N=i.get(w);if(w.isVideoTexture&&St(w),w.isRenderTargetTexture===!1&&w.version>0&&N.__version!==w.version){const J=w.image;if(J===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{X(N,w,v);return}}e.bindTexture(n.TEXTURE_2D,N.__webglTexture,n.TEXTURE0+v)}function W(w,v){const N=i.get(w);if(w.version>0&&N.__version!==w.version){X(N,w,v);return}e.bindTexture(n.TEXTURE_2D_ARRAY,N.__webglTexture,n.TEXTURE0+v)}function K(w,v){const N=i.get(w);if(w.version>0&&N.__version!==w.version){X(N,w,v);return}e.bindTexture(n.TEXTURE_3D,N.__webglTexture,n.TEXTURE0+v)}function H(w,v){const N=i.get(w);if(w.version>0&&N.__version!==w.version){et(N,w,v);return}e.bindTexture(n.TEXTURE_CUBE_MAP,N.__webglTexture,n.TEXTURE0+v)}const st={[ro]:n.REPEAT,[Gn]:n.CLAMP_TO_EDGE,[oo]:n.MIRRORED_REPEAT},ut={[Le]:n.NEAREST,[Tu]:n.NEAREST_MIPMAP_NEAREST,[ts]:n.NEAREST_MIPMAP_LINEAR,[$e]:n.LINEAR,[ir]:n.LINEAR_MIPMAP_NEAREST,[Wn]:n.LINEAR_MIPMAP_LINEAR},j={[Pu]:n.NEVER,[Nu]:n.ALWAYS,[Du]:n.LESS,[Tl]:n.LEQUAL,[Lu]:n.EQUAL,[Fu]:n.GEQUAL,[Iu]:n.GREATER,[Uu]:n.NOTEQUAL};function dt(w,v){if(v.type===ln&&t.has("OES_texture_float_linear")===!1&&(v.magFilter===$e||v.magFilter===ir||v.magFilter===ts||v.magFilter===Wn||v.minFilter===$e||v.minFilter===ir||v.minFilter===ts||v.minFilter===Wn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(w,n.TEXTURE_WRAP_S,st[v.wrapS]),n.texParameteri(w,n.TEXTURE_WRAP_T,st[v.wrapT]),(w===n.TEXTURE_3D||w===n.TEXTURE_2D_ARRAY)&&n.texParameteri(w,n.TEXTURE_WRAP_R,st[v.wrapR]),n.texParameteri(w,n.TEXTURE_MAG_FILTER,ut[v.magFilter]),n.texParameteri(w,n.TEXTURE_MIN_FILTER,ut[v.minFilter]),v.compareFunction&&(n.texParameteri(w,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(w,n.TEXTURE_COMPARE_FUNC,j[v.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===Le||v.minFilter!==ts&&v.minFilter!==Wn||v.type===ln&&t.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||i.get(v).__currentAnisotropy){const N=t.get("EXT_texture_filter_anisotropic");n.texParameterf(w,N.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,s.getMaxAnisotropy())),i.get(v).__currentAnisotropy=v.anisotropy}}}function Mt(w,v){let N=!1;w.__webglInit===void 0&&(w.__webglInit=!0,v.addEventListener("dispose",T));const J=v.source;let Q=d.get(J);Q===void 0&&(Q={},d.set(J,Q));const q=Y(v);if(q!==w.__cacheKey){Q[q]===void 0&&(Q[q]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,N=!0),Q[q].usedTimes++;const xt=Q[w.__cacheKey];xt!==void 0&&(Q[w.__cacheKey].usedTimes--,xt.usedTimes===0&&S(v)),w.__cacheKey=q,w.__webglTexture=Q[q].texture}return N}function X(w,v,N){let J=n.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(J=n.TEXTURE_2D_ARRAY),v.isData3DTexture&&(J=n.TEXTURE_3D);const Q=Mt(w,v),q=v.source;e.bindTexture(J,w.__webglTexture,n.TEXTURE0+N);const xt=i.get(q);if(q.version!==xt.__version||Q===!0){e.activeTexture(n.TEXTURE0+N);const ct=Yt.getPrimaries(Yt.workingColorSpace),mt=v.colorSpace===bn?null:Yt.getPrimaries(v.colorSpace),Gt=v.colorSpace===bn||ct===mt?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Gt);let nt=_(v.image,!1,s.maxTextureSize);nt=te(v,nt);const gt=r.convert(v.format,v.colorSpace),wt=r.convert(v.type);let At=y(v.internalFormat,gt,wt,v.colorSpace,v.isVideoTexture);dt(J,v);let _t;const zt=v.mipmaps,It=v.isVideoTexture!==!0,Qt=xt.__version===void 0||Q===!0,I=q.dataReady,rt=L(v,nt);if(v.isDepthTexture)At=E(v.format===Mi,v.type),Qt&&(It?e.texStorage2D(n.TEXTURE_2D,1,At,nt.width,nt.height):e.texImage2D(n.TEXTURE_2D,0,At,nt.width,nt.height,0,gt,wt,null));else if(v.isDataTexture)if(zt.length>0){It&&Qt&&e.texStorage2D(n.TEXTURE_2D,rt,At,zt[0].width,zt[0].height);for(let G=0,Z=zt.length;G<Z;G++)_t=zt[G],It?I&&e.texSubImage2D(n.TEXTURE_2D,G,0,0,_t.width,_t.height,gt,wt,_t.data):e.texImage2D(n.TEXTURE_2D,G,At,_t.width,_t.height,0,gt,wt,_t.data);v.generateMipmaps=!1}else It?(Qt&&e.texStorage2D(n.TEXTURE_2D,rt,At,nt.width,nt.height),I&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,nt.width,nt.height,gt,wt,nt.data)):e.texImage2D(n.TEXTURE_2D,0,At,nt.width,nt.height,0,gt,wt,nt.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){It&&Qt&&e.texStorage3D(n.TEXTURE_2D_ARRAY,rt,At,zt[0].width,zt[0].height,nt.depth);for(let G=0,Z=zt.length;G<Z;G++)if(_t=zt[G],v.format!==Be)if(gt!==null)if(It){if(I)if(v.layerUpdates.size>0){const ht=Wa(_t.width,_t.height,v.format,v.type);for(const lt of v.layerUpdates){const Dt=_t.data.subarray(lt*ht/_t.data.BYTES_PER_ELEMENT,(lt+1)*ht/_t.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,G,0,0,lt,_t.width,_t.height,1,gt,Dt)}v.clearLayerUpdates()}else e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,G,0,0,0,_t.width,_t.height,nt.depth,gt,_t.data)}else e.compressedTexImage3D(n.TEXTURE_2D_ARRAY,G,At,_t.width,_t.height,nt.depth,0,_t.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else It?I&&e.texSubImage3D(n.TEXTURE_2D_ARRAY,G,0,0,0,_t.width,_t.height,nt.depth,gt,wt,_t.data):e.texImage3D(n.TEXTURE_2D_ARRAY,G,At,_t.width,_t.height,nt.depth,0,gt,wt,_t.data)}else{It&&Qt&&e.texStorage2D(n.TEXTURE_2D,rt,At,zt[0].width,zt[0].height);for(let G=0,Z=zt.length;G<Z;G++)_t=zt[G],v.format!==Be?gt!==null?It?I&&e.compressedTexSubImage2D(n.TEXTURE_2D,G,0,0,_t.width,_t.height,gt,_t.data):e.compressedTexImage2D(n.TEXTURE_2D,G,At,_t.width,_t.height,0,_t.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):It?I&&e.texSubImage2D(n.TEXTURE_2D,G,0,0,_t.width,_t.height,gt,wt,_t.data):e.texImage2D(n.TEXTURE_2D,G,At,_t.width,_t.height,0,gt,wt,_t.data)}else if(v.isDataArrayTexture)if(It){if(Qt&&e.texStorage3D(n.TEXTURE_2D_ARRAY,rt,At,nt.width,nt.height,nt.depth),I)if(v.layerUpdates.size>0){const G=Wa(nt.width,nt.height,v.format,v.type);for(const Z of v.layerUpdates){const ht=nt.data.subarray(Z*G/nt.data.BYTES_PER_ELEMENT,(Z+1)*G/nt.data.BYTES_PER_ELEMENT);e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,Z,nt.width,nt.height,1,gt,wt,ht)}v.clearLayerUpdates()}else e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,nt.width,nt.height,nt.depth,gt,wt,nt.data)}else e.texImage3D(n.TEXTURE_2D_ARRAY,0,At,nt.width,nt.height,nt.depth,0,gt,wt,nt.data);else if(v.isData3DTexture)It?(Qt&&e.texStorage3D(n.TEXTURE_3D,rt,At,nt.width,nt.height,nt.depth),I&&e.texSubImage3D(n.TEXTURE_3D,0,0,0,0,nt.width,nt.height,nt.depth,gt,wt,nt.data)):e.texImage3D(n.TEXTURE_3D,0,At,nt.width,nt.height,nt.depth,0,gt,wt,nt.data);else if(v.isFramebufferTexture){if(Qt)if(It)e.texStorage2D(n.TEXTURE_2D,rt,At,nt.width,nt.height);else{let G=nt.width,Z=nt.height;for(let ht=0;ht<rt;ht++)e.texImage2D(n.TEXTURE_2D,ht,At,G,Z,0,gt,wt,null),G>>=1,Z>>=1}}else if(zt.length>0){if(It&&Qt){const G=yt(zt[0]);e.texStorage2D(n.TEXTURE_2D,rt,At,G.width,G.height)}for(let G=0,Z=zt.length;G<Z;G++)_t=zt[G],It?I&&e.texSubImage2D(n.TEXTURE_2D,G,0,0,gt,wt,_t):e.texImage2D(n.TEXTURE_2D,G,At,gt,wt,_t);v.generateMipmaps=!1}else if(It){if(Qt){const G=yt(nt);e.texStorage2D(n.TEXTURE_2D,rt,At,G.width,G.height)}I&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,gt,wt,nt)}else e.texImage2D(n.TEXTURE_2D,0,At,gt,wt,nt);p(v)&&f(J),xt.__version=q.version,v.onUpdate&&v.onUpdate(v)}w.__version=v.version}function et(w,v,N){if(v.image.length!==6)return;const J=Mt(w,v),Q=v.source;e.bindTexture(n.TEXTURE_CUBE_MAP,w.__webglTexture,n.TEXTURE0+N);const q=i.get(Q);if(Q.version!==q.__version||J===!0){e.activeTexture(n.TEXTURE0+N);const xt=Yt.getPrimaries(Yt.workingColorSpace),ct=v.colorSpace===bn?null:Yt.getPrimaries(v.colorSpace),mt=v.colorSpace===bn||xt===ct?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,mt);const Gt=v.isCompressedTexture||v.image[0].isCompressedTexture,nt=v.image[0]&&v.image[0].isDataTexture,gt=[];for(let Z=0;Z<6;Z++)!Gt&&!nt?gt[Z]=_(v.image[Z],!0,s.maxCubemapSize):gt[Z]=nt?v.image[Z].image:v.image[Z],gt[Z]=te(v,gt[Z]);const wt=gt[0],At=r.convert(v.format,v.colorSpace),_t=r.convert(v.type),zt=y(v.internalFormat,At,_t,v.colorSpace),It=v.isVideoTexture!==!0,Qt=q.__version===void 0||J===!0,I=Q.dataReady;let rt=L(v,wt);dt(n.TEXTURE_CUBE_MAP,v);let G;if(Gt){It&&Qt&&e.texStorage2D(n.TEXTURE_CUBE_MAP,rt,zt,wt.width,wt.height);for(let Z=0;Z<6;Z++){G=gt[Z].mipmaps;for(let ht=0;ht<G.length;ht++){const lt=G[ht];v.format!==Be?At!==null?It?I&&e.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht,0,0,lt.width,lt.height,At,lt.data):e.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht,zt,lt.width,lt.height,0,lt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):It?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht,0,0,lt.width,lt.height,At,_t,lt.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht,zt,lt.width,lt.height,0,At,_t,lt.data)}}}else{if(G=v.mipmaps,It&&Qt){G.length>0&&rt++;const Z=yt(gt[0]);e.texStorage2D(n.TEXTURE_CUBE_MAP,rt,zt,Z.width,Z.height)}for(let Z=0;Z<6;Z++)if(nt){It?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,gt[Z].width,gt[Z].height,At,_t,gt[Z].data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,zt,gt[Z].width,gt[Z].height,0,At,_t,gt[Z].data);for(let ht=0;ht<G.length;ht++){const Dt=G[ht].image[Z].image;It?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht+1,0,0,Dt.width,Dt.height,At,_t,Dt.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht+1,zt,Dt.width,Dt.height,0,At,_t,Dt.data)}}else{It?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,At,_t,gt[Z]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,zt,At,_t,gt[Z]);for(let ht=0;ht<G.length;ht++){const lt=G[ht];It?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht+1,0,0,At,_t,lt.image[Z]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ht+1,zt,At,_t,lt.image[Z])}}}p(v)&&f(n.TEXTURE_CUBE_MAP),q.__version=Q.version,v.onUpdate&&v.onUpdate(v)}w.__version=v.version}function pt(w,v,N,J,Q,q){const xt=r.convert(N.format,N.colorSpace),ct=r.convert(N.type),mt=y(N.internalFormat,xt,ct,N.colorSpace),Gt=i.get(v),nt=i.get(N);if(nt.__renderTarget=v,!Gt.__hasExternalTextures){const gt=Math.max(1,v.width>>q),wt=Math.max(1,v.height>>q);Q===n.TEXTURE_3D||Q===n.TEXTURE_2D_ARRAY?e.texImage3D(Q,q,mt,gt,wt,v.depth,0,xt,ct,null):e.texImage2D(Q,q,mt,gt,wt,0,xt,ct,null)}e.bindFramebuffer(n.FRAMEBUFFER,w),kt(v)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,J,Q,nt.__webglTexture,0,Ot(v)):(Q===n.TEXTURE_2D||Q>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&Q<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,J,Q,nt.__webglTexture,q),e.bindFramebuffer(n.FRAMEBUFFER,null)}function at(w,v,N){if(n.bindRenderbuffer(n.RENDERBUFFER,w),v.depthBuffer){const J=v.depthTexture,Q=J&&J.isDepthTexture?J.type:null,q=E(v.stencilBuffer,Q),xt=v.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ct=Ot(v);kt(v)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ct,q,v.width,v.height):N?n.renderbufferStorageMultisample(n.RENDERBUFFER,ct,q,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,q,v.width,v.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,xt,n.RENDERBUFFER,w)}else{const J=v.textures;for(let Q=0;Q<J.length;Q++){const q=J[Q],xt=r.convert(q.format,q.colorSpace),ct=r.convert(q.type),mt=y(q.internalFormat,xt,ct,q.colorSpace),Gt=Ot(v);N&&kt(v)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,Gt,mt,v.width,v.height):kt(v)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Gt,mt,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,mt,v.width,v.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Tt(w,v){if(v&&v.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(n.FRAMEBUFFER,w),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const J=i.get(v.depthTexture);J.__renderTarget=v,(!J.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),z(v.depthTexture,0);const Q=J.__webglTexture,q=Ot(v);if(v.depthTexture.format===pi)kt(v)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,Q,0,q):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,Q,0);else if(v.depthTexture.format===Mi)kt(v)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,Q,0,q):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,Q,0);else throw new Error("Unknown depthTexture format")}function Rt(w){const v=i.get(w),N=w.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==w.depthTexture){const J=w.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),J){const Q=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,J.removeEventListener("dispose",Q)};J.addEventListener("dispose",Q),v.__depthDisposeCallback=Q}v.__boundDepthTexture=J}if(w.depthTexture&&!v.__autoAllocateDepthBuffer){if(N)throw new Error("target.depthTexture not supported in Cube render targets");Tt(v.__webglFramebuffer,w)}else if(N){v.__webglDepthbuffer=[];for(let J=0;J<6;J++)if(e.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer[J]),v.__webglDepthbuffer[J]===void 0)v.__webglDepthbuffer[J]=n.createRenderbuffer(),at(v.__webglDepthbuffer[J],w,!1);else{const Q=w.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,q=v.__webglDepthbuffer[J];n.bindRenderbuffer(n.RENDERBUFFER,q),n.framebufferRenderbuffer(n.FRAMEBUFFER,Q,n.RENDERBUFFER,q)}}else if(e.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=n.createRenderbuffer(),at(v.__webglDepthbuffer,w,!1);else{const J=w.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Q=v.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,Q),n.framebufferRenderbuffer(n.FRAMEBUFFER,J,n.RENDERBUFFER,Q)}e.bindFramebuffer(n.FRAMEBUFFER,null)}function Ft(w,v,N){const J=i.get(w);v!==void 0&&pt(J.__webglFramebuffer,w,w.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),N!==void 0&&Rt(w)}function ne(w){const v=w.texture,N=i.get(w),J=i.get(v);w.addEventListener("dispose",R);const Q=w.textures,q=w.isWebGLCubeRenderTarget===!0,xt=Q.length>1;if(xt||(J.__webglTexture===void 0&&(J.__webglTexture=n.createTexture()),J.__version=v.version,o.memory.textures++),q){N.__webglFramebuffer=[];for(let ct=0;ct<6;ct++)if(v.mipmaps&&v.mipmaps.length>0){N.__webglFramebuffer[ct]=[];for(let mt=0;mt<v.mipmaps.length;mt++)N.__webglFramebuffer[ct][mt]=n.createFramebuffer()}else N.__webglFramebuffer[ct]=n.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){N.__webglFramebuffer=[];for(let ct=0;ct<v.mipmaps.length;ct++)N.__webglFramebuffer[ct]=n.createFramebuffer()}else N.__webglFramebuffer=n.createFramebuffer();if(xt)for(let ct=0,mt=Q.length;ct<mt;ct++){const Gt=i.get(Q[ct]);Gt.__webglTexture===void 0&&(Gt.__webglTexture=n.createTexture(),o.memory.textures++)}if(w.samples>0&&kt(w)===!1){N.__webglMultisampledFramebuffer=n.createFramebuffer(),N.__webglColorRenderbuffer=[],e.bindFramebuffer(n.FRAMEBUFFER,N.__webglMultisampledFramebuffer);for(let ct=0;ct<Q.length;ct++){const mt=Q[ct];N.__webglColorRenderbuffer[ct]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,N.__webglColorRenderbuffer[ct]);const Gt=r.convert(mt.format,mt.colorSpace),nt=r.convert(mt.type),gt=y(mt.internalFormat,Gt,nt,mt.colorSpace,w.isXRRenderTarget===!0),wt=Ot(w);n.renderbufferStorageMultisample(n.RENDERBUFFER,wt,gt,w.width,w.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ct,n.RENDERBUFFER,N.__webglColorRenderbuffer[ct])}n.bindRenderbuffer(n.RENDERBUFFER,null),w.depthBuffer&&(N.__webglDepthRenderbuffer=n.createRenderbuffer(),at(N.__webglDepthRenderbuffer,w,!0)),e.bindFramebuffer(n.FRAMEBUFFER,null)}}if(q){e.bindTexture(n.TEXTURE_CUBE_MAP,J.__webglTexture),dt(n.TEXTURE_CUBE_MAP,v);for(let ct=0;ct<6;ct++)if(v.mipmaps&&v.mipmaps.length>0)for(let mt=0;mt<v.mipmaps.length;mt++)pt(N.__webglFramebuffer[ct][mt],w,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ct,mt);else pt(N.__webglFramebuffer[ct],w,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0);p(v)&&f(n.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(xt){for(let ct=0,mt=Q.length;ct<mt;ct++){const Gt=Q[ct],nt=i.get(Gt);e.bindTexture(n.TEXTURE_2D,nt.__webglTexture),dt(n.TEXTURE_2D,Gt),pt(N.__webglFramebuffer,w,Gt,n.COLOR_ATTACHMENT0+ct,n.TEXTURE_2D,0),p(Gt)&&f(n.TEXTURE_2D)}e.unbindTexture()}else{let ct=n.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(ct=w.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(ct,J.__webglTexture),dt(ct,v),v.mipmaps&&v.mipmaps.length>0)for(let mt=0;mt<v.mipmaps.length;mt++)pt(N.__webglFramebuffer[mt],w,v,n.COLOR_ATTACHMENT0,ct,mt);else pt(N.__webglFramebuffer,w,v,n.COLOR_ATTACHMENT0,ct,0);p(v)&&f(ct),e.unbindTexture()}w.depthBuffer&&Rt(w)}function Vt(w){const v=w.textures;for(let N=0,J=v.length;N<J;N++){const Q=v[N];if(p(Q)){const q=b(w),xt=i.get(Q).__webglTexture;e.bindTexture(q,xt),f(q),e.unbindTexture()}}}const oe=[],D=[];function Ie(w){if(w.samples>0){if(kt(w)===!1){const v=w.textures,N=w.width,J=w.height;let Q=n.COLOR_BUFFER_BIT;const q=w.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,xt=i.get(w),ct=v.length>1;if(ct)for(let mt=0;mt<v.length;mt++)e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+mt,n.RENDERBUFFER,null),e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+mt,n.TEXTURE_2D,null,0);e.bindFramebuffer(n.READ_FRAMEBUFFER,xt.__webglMultisampledFramebuffer),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,xt.__webglFramebuffer);for(let mt=0;mt<v.length;mt++){if(w.resolveDepthBuffer&&(w.depthBuffer&&(Q|=n.DEPTH_BUFFER_BIT),w.stencilBuffer&&w.resolveStencilBuffer&&(Q|=n.STENCIL_BUFFER_BIT)),ct){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,xt.__webglColorRenderbuffer[mt]);const Gt=i.get(v[mt]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Gt,0)}n.blitFramebuffer(0,0,N,J,0,0,N,J,Q,n.NEAREST),c===!0&&(oe.length=0,D.length=0,oe.push(n.COLOR_ATTACHMENT0+mt),w.depthBuffer&&w.resolveDepthBuffer===!1&&(oe.push(q),D.push(q),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,D)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,oe))}if(e.bindFramebuffer(n.READ_FRAMEBUFFER,null),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),ct)for(let mt=0;mt<v.length;mt++){e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+mt,n.RENDERBUFFER,xt.__webglColorRenderbuffer[mt]);const Gt=i.get(v[mt]).__webglTexture;e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+mt,n.TEXTURE_2D,Gt,0)}e.bindFramebuffer(n.DRAW_FRAMEBUFFER,xt.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.resolveDepthBuffer===!1&&c){const v=w.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[v])}}}function Ot(w){return Math.min(s.maxSamples,w.samples)}function kt(w){const v=i.get(w);return w.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function St(w){const v=o.render.frame;h.get(w)!==v&&(h.set(w,v),w.update())}function te(w,v){const N=w.colorSpace,J=w.format,Q=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||N!==yi&&N!==bn&&(Yt.getTransfer(N)===Jt?(J!==Be||Q!==fn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",N)),v}function yt(w){return typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement?(l.width=w.naturalWidth||w.width,l.height=w.naturalHeight||w.height):typeof VideoFrame<"u"&&w instanceof VideoFrame?(l.width=w.displayWidth,l.height=w.displayHeight):(l.width=w.width,l.height=w.height),l}this.allocateTextureUnit=O,this.resetTextureUnits=V,this.setTexture2D=z,this.setTexture2DArray=W,this.setTexture3D=K,this.setTextureCube=H,this.rebindTextures=Ft,this.setupRenderTarget=ne,this.updateRenderTargetMipmap=Vt,this.updateMultisampleRenderTarget=Ie,this.setupDepthRenderbuffer=Rt,this.setupFrameBufferTexture=pt,this.useMultisampledRTT=kt}function d_(n,t){function e(i,s=bn){let r;const o=Yt.getTransfer(s);if(i===fn)return n.UNSIGNED_BYTE;if(i===Go)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Wo)return n.UNSIGNED_SHORT_5_5_5_1;if(i===_l)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===ml)return n.BYTE;if(i===gl)return n.SHORT;if(i===Yi)return n.UNSIGNED_SHORT;if(i===Vo)return n.INT;if(i===Xn)return n.UNSIGNED_INT;if(i===ln)return n.FLOAT;if(i===Ki)return n.HALF_FLOAT;if(i===vl)return n.ALPHA;if(i===xl)return n.RGB;if(i===Be)return n.RGBA;if(i===Ml)return n.LUMINANCE;if(i===yl)return n.LUMINANCE_ALPHA;if(i===pi)return n.DEPTH_COMPONENT;if(i===Mi)return n.DEPTH_STENCIL;if(i===Sl)return n.RED;if(i===Xo)return n.RED_INTEGER;if(i===El)return n.RG;if(i===Yo)return n.RG_INTEGER;if(i===qo)return n.RGBA_INTEGER;if(i===Ds||i===Ls||i===Is||i===Us)if(o===Jt)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===Ds)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Ls)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Is)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Us)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===Ds)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Ls)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Is)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Us)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===ao||i===co||i===lo||i===ho)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===ao)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===co)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===lo)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===ho)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===uo||i===fo||i===po)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(i===uo||i===fo)return o===Jt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===po)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===mo||i===go||i===_o||i===vo||i===xo||i===Mo||i===yo||i===So||i===Eo||i===bo||i===wo||i===To||i===Ao||i===Co)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(i===mo)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===go)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===_o)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===vo)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===xo)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Mo)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===yo)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===So)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Eo)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===bo)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===wo)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===To)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Ao)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Co)return o===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Fs||i===Ro||i===Po)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(i===Fs)return o===Jt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Ro)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Po)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===bl||i===Do||i===Lo||i===Io)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(i===Fs)return r.COMPRESSED_RED_RGTC1_EXT;if(i===Do)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Lo)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Io)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===xi?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:e}}const f_={type:"move"};class Lr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Oe,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Oe,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Oe,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let s=null,r=null,o=null;const a=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){o=!0;for(const _ of t.hand.values()){const p=e.getJointPose(_,i),f=this._getHandJoint(l,_);p!==null&&(f.matrix.fromArray(p.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=p.radius),f.visible=p!==null}const h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],d=h.position.distanceTo(u.position),m=.02,g=.005;l.inputState.pinching&&d>m+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&d<=m-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,i),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(s=e.getPose(t.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(f_)))}return a!==null&&(a.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const i=new Oe;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}}const p_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,m_=`
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

}`;class g_{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,i){if(this.texture===null){const s=new Me,r=t.properties.get(s);r.__webglTexture=e.texture,(e.depthNear!==i.depthNear||e.depthFar!==i.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=s}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,i=new Rn({vertexShader:p_,fragmentShader:m_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new De(new $s(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class __ extends wi{constructor(t,e){super();const i=this;let s=null,r=1,o=null,a="local-floor",c=1,l=null,h=null,u=null,d=null,m=null,g=null;const _=new g_,p=e.getContextAttributes();let f=null,b=null;const y=[],E=[],L=new Ht;let T=null;const R=new Xe;R.viewport=new re;const A=new Xe;A.viewport=new re;const S=[R,A],M=new Bd;let C=null,V=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(X){let et=y[X];return et===void 0&&(et=new Lr,y[X]=et),et.getTargetRaySpace()},this.getControllerGrip=function(X){let et=y[X];return et===void 0&&(et=new Lr,y[X]=et),et.getGripSpace()},this.getHand=function(X){let et=y[X];return et===void 0&&(et=new Lr,y[X]=et),et.getHandSpace()};function O(X){const et=E.indexOf(X.inputSource);if(et===-1)return;const pt=y[et];pt!==void 0&&(pt.update(X.inputSource,X.frame,l||o),pt.dispatchEvent({type:X.type,data:X.inputSource}))}function Y(){s.removeEventListener("select",O),s.removeEventListener("selectstart",O),s.removeEventListener("selectend",O),s.removeEventListener("squeeze",O),s.removeEventListener("squeezestart",O),s.removeEventListener("squeezeend",O),s.removeEventListener("end",Y),s.removeEventListener("inputsourceschange",z);for(let X=0;X<y.length;X++){const et=E[X];et!==null&&(E[X]=null,y[X].disconnect(et))}C=null,V=null,_.reset(),t.setRenderTarget(f),m=null,d=null,u=null,s=null,b=null,Mt.stop(),i.isPresenting=!1,t.setPixelRatio(T),t.setSize(L.width,L.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(X){r=X,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(X){a=X,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(X){l=X},this.getBaseLayer=function(){return d!==null?d:m},this.getBinding=function(){return u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(X){if(s=X,s!==null){if(f=t.getRenderTarget(),s.addEventListener("select",O),s.addEventListener("selectstart",O),s.addEventListener("selectend",O),s.addEventListener("squeeze",O),s.addEventListener("squeezestart",O),s.addEventListener("squeezeend",O),s.addEventListener("end",Y),s.addEventListener("inputsourceschange",z),p.xrCompatible!==!0&&await e.makeXRCompatible(),T=t.getPixelRatio(),t.getSize(L),s.enabledFeatures!==void 0&&s.enabledFeatures.includes("layers")){let pt=null,at=null,Tt=null;p.depth&&(Tt=p.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,pt=p.stencil?Mi:pi,at=p.stencil?xi:Xn);const Rt={colorFormat:e.RGBA8,depthFormat:Tt,scaleFactor:r};u=new XRWebGLBinding(s,e),d=u.createProjectionLayer(Rt),s.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),b=new Yn(d.textureWidth,d.textureHeight,{format:Be,type:fn,depthTexture:new Bl(d.textureWidth,d.textureHeight,at,void 0,void 0,void 0,void 0,void 0,void 0,pt),stencilBuffer:p.stencil,colorSpace:t.outputColorSpace,samples:p.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1})}else{const pt={antialias:p.antialias,alpha:!0,depth:p.depth,stencil:p.stencil,framebufferScaleFactor:r};m=new XRWebGLLayer(s,e,pt),s.updateRenderState({baseLayer:m}),t.setPixelRatio(1),t.setSize(m.framebufferWidth,m.framebufferHeight,!1),b=new Yn(m.framebufferWidth,m.framebufferHeight,{format:Be,type:fn,colorSpace:t.outputColorSpace,stencilBuffer:p.stencil})}b.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await s.requestReferenceSpace(a),Mt.setContext(s),Mt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function z(X){for(let et=0;et<X.removed.length;et++){const pt=X.removed[et],at=E.indexOf(pt);at>=0&&(E[at]=null,y[at].disconnect(pt))}for(let et=0;et<X.added.length;et++){const pt=X.added[et];let at=E.indexOf(pt);if(at===-1){for(let Rt=0;Rt<y.length;Rt++)if(Rt>=E.length){E.push(pt),at=Rt;break}else if(E[Rt]===null){E[Rt]=pt,at=Rt;break}if(at===-1)break}const Tt=y[at];Tt&&Tt.connect(pt)}}const W=new P,K=new P;function H(X,et,pt){W.setFromMatrixPosition(et.matrixWorld),K.setFromMatrixPosition(pt.matrixWorld);const at=W.distanceTo(K),Tt=et.projectionMatrix.elements,Rt=pt.projectionMatrix.elements,Ft=Tt[14]/(Tt[10]-1),ne=Tt[14]/(Tt[10]+1),Vt=(Tt[9]+1)/Tt[5],oe=(Tt[9]-1)/Tt[5],D=(Tt[8]-1)/Tt[0],Ie=(Rt[8]+1)/Rt[0],Ot=Ft*D,kt=Ft*Ie,St=at/(-D+Ie),te=St*-D;if(et.matrixWorld.decompose(X.position,X.quaternion,X.scale),X.translateX(te),X.translateZ(St),X.matrixWorld.compose(X.position,X.quaternion,X.scale),X.matrixWorldInverse.copy(X.matrixWorld).invert(),Tt[10]===-1)X.projectionMatrix.copy(et.projectionMatrix),X.projectionMatrixInverse.copy(et.projectionMatrixInverse);else{const yt=Ft+St,w=ne+St,v=Ot-te,N=kt+(at-te),J=Vt*ne/w*yt,Q=oe*ne/w*yt;X.projectionMatrix.makePerspective(v,N,J,Q,yt,w),X.projectionMatrixInverse.copy(X.projectionMatrix).invert()}}function st(X,et){et===null?X.matrixWorld.copy(X.matrix):X.matrixWorld.multiplyMatrices(et.matrixWorld,X.matrix),X.matrixWorldInverse.copy(X.matrixWorld).invert()}this.updateCamera=function(X){if(s===null)return;let et=X.near,pt=X.far;_.texture!==null&&(_.depthNear>0&&(et=_.depthNear),_.depthFar>0&&(pt=_.depthFar)),M.near=A.near=R.near=et,M.far=A.far=R.far=pt,(C!==M.near||V!==M.far)&&(s.updateRenderState({depthNear:M.near,depthFar:M.far}),C=M.near,V=M.far),R.layers.mask=X.layers.mask|2,A.layers.mask=X.layers.mask|4,M.layers.mask=R.layers.mask|A.layers.mask;const at=X.parent,Tt=M.cameras;st(M,at);for(let Rt=0;Rt<Tt.length;Rt++)st(Tt[Rt],at);Tt.length===2?H(M,R,A):M.projectionMatrix.copy(R.projectionMatrix),ut(X,M,at)};function ut(X,et,pt){pt===null?X.matrix.copy(et.matrixWorld):(X.matrix.copy(pt.matrixWorld),X.matrix.invert(),X.matrix.multiply(et.matrixWorld)),X.matrix.decompose(X.position,X.quaternion,X.scale),X.updateMatrixWorld(!0),X.projectionMatrix.copy(et.projectionMatrix),X.projectionMatrixInverse.copy(et.projectionMatrixInverse),X.isPerspectiveCamera&&(X.fov=qi*2*Math.atan(1/X.projectionMatrix.elements[5]),X.zoom=1)}this.getCamera=function(){return M},this.getFoveation=function(){if(!(d===null&&m===null))return c},this.setFoveation=function(X){c=X,d!==null&&(d.fixedFoveation=X),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=X)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(M)};let j=null;function dt(X,et){if(h=et.getViewerPose(l||o),g=et,h!==null){const pt=h.views;m!==null&&(t.setRenderTargetFramebuffer(b,m.framebuffer),t.setRenderTarget(b));let at=!1;pt.length!==M.cameras.length&&(M.cameras.length=0,at=!0);for(let Rt=0;Rt<pt.length;Rt++){const Ft=pt[Rt];let ne=null;if(m!==null)ne=m.getViewport(Ft);else{const oe=u.getViewSubImage(d,Ft);ne=oe.viewport,Rt===0&&(t.setRenderTargetTextures(b,oe.colorTexture,d.ignoreDepthValues?void 0:oe.depthStencilTexture),t.setRenderTarget(b))}let Vt=S[Rt];Vt===void 0&&(Vt=new Xe,Vt.layers.enable(Rt),Vt.viewport=new re,S[Rt]=Vt),Vt.matrix.fromArray(Ft.transform.matrix),Vt.matrix.decompose(Vt.position,Vt.quaternion,Vt.scale),Vt.projectionMatrix.fromArray(Ft.projectionMatrix),Vt.projectionMatrixInverse.copy(Vt.projectionMatrix).invert(),Vt.viewport.set(ne.x,ne.y,ne.width,ne.height),Rt===0&&(M.matrix.copy(Vt.matrix),M.matrix.decompose(M.position,M.quaternion,M.scale)),at===!0&&M.cameras.push(Vt)}const Tt=s.enabledFeatures;if(Tt&&Tt.includes("depth-sensing")){const Rt=u.getDepthInformation(pt[0]);Rt&&Rt.isValid&&Rt.texture&&_.init(t,Rt,s.renderState)}}for(let pt=0;pt<y.length;pt++){const at=E[pt],Tt=y[pt];at!==null&&Tt!==void 0&&Tt.update(at,et,l||o)}j&&j(X,et),et.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:et}),g=null}const Mt=new kl;Mt.setAnimationLoop(dt),this.setAnimationLoop=function(X){j=X},this.dispose=function(){}}}const Bn=new tn,v_=new Zt;function x_(n,t){function e(p,f){p.matrixAutoUpdate===!0&&p.updateMatrix(),f.value.copy(p.matrix)}function i(p,f){f.color.getRGB(p.fogColor.value,Il(n)),f.isFog?(p.fogNear.value=f.near,p.fogFar.value=f.far):f.isFogExp2&&(p.fogDensity.value=f.density)}function s(p,f,b,y,E){f.isMeshBasicMaterial||f.isMeshLambertMaterial?r(p,f):f.isMeshToonMaterial?(r(p,f),u(p,f)):f.isMeshPhongMaterial?(r(p,f),h(p,f)):f.isMeshStandardMaterial?(r(p,f),d(p,f),f.isMeshPhysicalMaterial&&m(p,f,E)):f.isMeshMatcapMaterial?(r(p,f),g(p,f)):f.isMeshDepthMaterial?r(p,f):f.isMeshDistanceMaterial?(r(p,f),_(p,f)):f.isMeshNormalMaterial?r(p,f):f.isLineBasicMaterial?(o(p,f),f.isLineDashedMaterial&&a(p,f)):f.isPointsMaterial?c(p,f,b,y):f.isSpriteMaterial?l(p,f):f.isShadowMaterial?(p.color.value.copy(f.color),p.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(p,f){p.opacity.value=f.opacity,f.color&&p.diffuse.value.copy(f.color),f.emissive&&p.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(p.map.value=f.map,e(f.map,p.mapTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,e(f.alphaMap,p.alphaMapTransform)),f.bumpMap&&(p.bumpMap.value=f.bumpMap,e(f.bumpMap,p.bumpMapTransform),p.bumpScale.value=f.bumpScale,f.side===Ae&&(p.bumpScale.value*=-1)),f.normalMap&&(p.normalMap.value=f.normalMap,e(f.normalMap,p.normalMapTransform),p.normalScale.value.copy(f.normalScale),f.side===Ae&&p.normalScale.value.negate()),f.displacementMap&&(p.displacementMap.value=f.displacementMap,e(f.displacementMap,p.displacementMapTransform),p.displacementScale.value=f.displacementScale,p.displacementBias.value=f.displacementBias),f.emissiveMap&&(p.emissiveMap.value=f.emissiveMap,e(f.emissiveMap,p.emissiveMapTransform)),f.specularMap&&(p.specularMap.value=f.specularMap,e(f.specularMap,p.specularMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest);const b=t.get(f),y=b.envMap,E=b.envMapRotation;y&&(p.envMap.value=y,Bn.copy(E),Bn.x*=-1,Bn.y*=-1,Bn.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(Bn.y*=-1,Bn.z*=-1),p.envMapRotation.value.setFromMatrix4(v_.makeRotationFromEuler(Bn)),p.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=f.reflectivity,p.ior.value=f.ior,p.refractionRatio.value=f.refractionRatio),f.lightMap&&(p.lightMap.value=f.lightMap,p.lightMapIntensity.value=f.lightMapIntensity,e(f.lightMap,p.lightMapTransform)),f.aoMap&&(p.aoMap.value=f.aoMap,p.aoMapIntensity.value=f.aoMapIntensity,e(f.aoMap,p.aoMapTransform))}function o(p,f){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,f.map&&(p.map.value=f.map,e(f.map,p.mapTransform))}function a(p,f){p.dashSize.value=f.dashSize,p.totalSize.value=f.dashSize+f.gapSize,p.scale.value=f.scale}function c(p,f,b,y){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,p.size.value=f.size*b,p.scale.value=y*.5,f.map&&(p.map.value=f.map,e(f.map,p.uvTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,e(f.alphaMap,p.alphaMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest)}function l(p,f){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,p.rotation.value=f.rotation,f.map&&(p.map.value=f.map,e(f.map,p.mapTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,e(f.alphaMap,p.alphaMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest)}function h(p,f){p.specular.value.copy(f.specular),p.shininess.value=Math.max(f.shininess,1e-4)}function u(p,f){f.gradientMap&&(p.gradientMap.value=f.gradientMap)}function d(p,f){p.metalness.value=f.metalness,f.metalnessMap&&(p.metalnessMap.value=f.metalnessMap,e(f.metalnessMap,p.metalnessMapTransform)),p.roughness.value=f.roughness,f.roughnessMap&&(p.roughnessMap.value=f.roughnessMap,e(f.roughnessMap,p.roughnessMapTransform)),f.envMap&&(p.envMapIntensity.value=f.envMapIntensity)}function m(p,f,b){p.ior.value=f.ior,f.sheen>0&&(p.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),p.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(p.sheenColorMap.value=f.sheenColorMap,e(f.sheenColorMap,p.sheenColorMapTransform)),f.sheenRoughnessMap&&(p.sheenRoughnessMap.value=f.sheenRoughnessMap,e(f.sheenRoughnessMap,p.sheenRoughnessMapTransform))),f.clearcoat>0&&(p.clearcoat.value=f.clearcoat,p.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(p.clearcoatMap.value=f.clearcoatMap,e(f.clearcoatMap,p.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,e(f.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(p.clearcoatNormalMap.value=f.clearcoatNormalMap,e(f.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===Ae&&p.clearcoatNormalScale.value.negate())),f.dispersion>0&&(p.dispersion.value=f.dispersion),f.iridescence>0&&(p.iridescence.value=f.iridescence,p.iridescenceIOR.value=f.iridescenceIOR,p.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(p.iridescenceMap.value=f.iridescenceMap,e(f.iridescenceMap,p.iridescenceMapTransform)),f.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=f.iridescenceThicknessMap,e(f.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),f.transmission>0&&(p.transmission.value=f.transmission,p.transmissionSamplerMap.value=b.texture,p.transmissionSamplerSize.value.set(b.width,b.height),f.transmissionMap&&(p.transmissionMap.value=f.transmissionMap,e(f.transmissionMap,p.transmissionMapTransform)),p.thickness.value=f.thickness,f.thicknessMap&&(p.thicknessMap.value=f.thicknessMap,e(f.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=f.attenuationDistance,p.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(p.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(p.anisotropyMap.value=f.anisotropyMap,e(f.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=f.specularIntensity,p.specularColor.value.copy(f.specularColor),f.specularColorMap&&(p.specularColorMap.value=f.specularColorMap,e(f.specularColorMap,p.specularColorMapTransform)),f.specularIntensityMap&&(p.specularIntensityMap.value=f.specularIntensityMap,e(f.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,f){f.matcap&&(p.matcap.value=f.matcap)}function _(p,f){const b=t.get(f).light;p.referencePosition.value.setFromMatrixPosition(b.matrixWorld),p.nearDistance.value=b.shadow.camera.near,p.farDistance.value=b.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function M_(n,t,e,i){let s={},r={},o=[];const a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function c(b,y){const E=y.program;i.uniformBlockBinding(b,E)}function l(b,y){let E=s[b.id];E===void 0&&(g(b),E=h(b),s[b.id]=E,b.addEventListener("dispose",p));const L=y.program;i.updateUBOMapping(b,L);const T=t.render.frame;r[b.id]!==T&&(d(b),r[b.id]=T)}function h(b){const y=u();b.__bindingPointIndex=y;const E=n.createBuffer(),L=b.__size,T=b.usage;return n.bindBuffer(n.UNIFORM_BUFFER,E),n.bufferData(n.UNIFORM_BUFFER,L,T),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,y,E),E}function u(){for(let b=0;b<a;b++)if(o.indexOf(b)===-1)return o.push(b),b;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(b){const y=s[b.id],E=b.uniforms,L=b.__cache;n.bindBuffer(n.UNIFORM_BUFFER,y);for(let T=0,R=E.length;T<R;T++){const A=Array.isArray(E[T])?E[T]:[E[T]];for(let S=0,M=A.length;S<M;S++){const C=A[S];if(m(C,T,S,L)===!0){const V=C.__offset,O=Array.isArray(C.value)?C.value:[C.value];let Y=0;for(let z=0;z<O.length;z++){const W=O[z],K=_(W);typeof W=="number"||typeof W=="boolean"?(C.__data[0]=W,n.bufferSubData(n.UNIFORM_BUFFER,V+Y,C.__data)):W.isMatrix3?(C.__data[0]=W.elements[0],C.__data[1]=W.elements[1],C.__data[2]=W.elements[2],C.__data[3]=0,C.__data[4]=W.elements[3],C.__data[5]=W.elements[4],C.__data[6]=W.elements[5],C.__data[7]=0,C.__data[8]=W.elements[6],C.__data[9]=W.elements[7],C.__data[10]=W.elements[8],C.__data[11]=0):(W.toArray(C.__data,Y),Y+=K.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,V,C.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function m(b,y,E,L){const T=b.value,R=y+"_"+E;if(L[R]===void 0)return typeof T=="number"||typeof T=="boolean"?L[R]=T:L[R]=T.clone(),!0;{const A=L[R];if(typeof T=="number"||typeof T=="boolean"){if(A!==T)return L[R]=T,!0}else if(A.equals(T)===!1)return A.copy(T),!0}return!1}function g(b){const y=b.uniforms;let E=0;const L=16;for(let R=0,A=y.length;R<A;R++){const S=Array.isArray(y[R])?y[R]:[y[R]];for(let M=0,C=S.length;M<C;M++){const V=S[M],O=Array.isArray(V.value)?V.value:[V.value];for(let Y=0,z=O.length;Y<z;Y++){const W=O[Y],K=_(W),H=E%L,st=H%K.boundary,ut=H+st;E+=st,ut!==0&&L-ut<K.storage&&(E+=L-ut),V.__data=new Float32Array(K.storage/Float32Array.BYTES_PER_ELEMENT),V.__offset=E,E+=K.storage}}}const T=E%L;return T>0&&(E+=L-T),b.__size=E,b.__cache={},this}function _(b){const y={boundary:0,storage:0};return typeof b=="number"||typeof b=="boolean"?(y.boundary=4,y.storage=4):b.isVector2?(y.boundary=8,y.storage=8):b.isVector3||b.isColor?(y.boundary=16,y.storage=12):b.isVector4?(y.boundary=16,y.storage=16):b.isMatrix3?(y.boundary=48,y.storage=48):b.isMatrix4?(y.boundary=64,y.storage=64):b.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",b),y}function p(b){const y=b.target;y.removeEventListener("dispose",p);const E=o.indexOf(y.__bindingPointIndex);o.splice(E,1),n.deleteBuffer(s[y.id]),delete s[y.id],delete r[y.id]}function f(){for(const b in s)n.deleteBuffer(s[b]);o=[],s={},r={}}return{bind:c,update:l,dispose:f}}class y_{constructor(t={}){const{canvas:e=td(),context:i=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reverseDepthBuffer:d=!1}=t;this.isWebGLRenderer=!0;let m;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=i.getContextAttributes().alpha}else m=o;const g=new Uint32Array(4),_=new Int32Array(4);let p=null,f=null;const b=[],y=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=be,this.toneMapping=An,this.toneMappingExposure=1;const E=this;let L=!1,T=0,R=0,A=null,S=-1,M=null;const C=new re,V=new re;let O=null;const Y=new Nt(0);let z=0,W=e.width,K=e.height,H=1,st=null,ut=null;const j=new re(0,0,W,K),dt=new re(0,0,W,K);let Mt=!1;const X=new Zo;let et=!1,pt=!1;this.transmissionResolutionScale=1;const at=new Zt,Tt=new Zt,Rt=new P,Ft=new re,ne={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Vt=!1;function oe(){return A===null?H:1}let D=i;function Ie(x,U){return e.getContext(x,U)}try{const x={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${zo}`),e.addEventListener("webglcontextlost",Z,!1),e.addEventListener("webglcontextrestored",ht,!1),e.addEventListener("webglcontextcreationerror",lt,!1),D===null){const U="webgl2";if(D=Ie(U,x),D===null)throw Ie(U)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(x){throw console.error("THREE.WebGLRenderer: "+x.message),x}let Ot,kt,St,te,yt,w,v,N,J,Q,q,xt,ct,mt,Gt,nt,gt,wt,At,_t,zt,It,Qt,I;function rt(){Ot=new Pm(D),Ot.init(),It=new d_(D,Ot),kt=new bm(D,Ot,t,It),St=new h_(D,Ot),kt.reverseDepthBuffer&&d&&St.buffers.depth.setReversed(!0),te=new Im(D),yt=new Zg,w=new u_(D,Ot,St,yt,kt,It,te),v=new Tm(E),N=new Rm(E),J=new kd(D),Qt=new Sm(D,J),Q=new Dm(D,J,te,Qt),q=new Fm(D,Q,J,te),At=new Um(D,kt,w),nt=new wm(yt),xt=new Jg(E,v,N,Ot,kt,Qt,nt),ct=new x_(E,yt),mt=new $g,Gt=new r_(Ot),wt=new ym(E,v,N,St,q,m,c),gt=new c_(E,q,kt),I=new M_(D,te,kt,St),_t=new Em(D,Ot,te),zt=new Lm(D,Ot,te),te.programs=xt.programs,E.capabilities=kt,E.extensions=Ot,E.properties=yt,E.renderLists=mt,E.shadowMap=gt,E.state=St,E.info=te}rt();const G=new __(E,D);this.xr=G,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const x=Ot.get("WEBGL_lose_context");x&&x.loseContext()},this.forceContextRestore=function(){const x=Ot.get("WEBGL_lose_context");x&&x.restoreContext()},this.getPixelRatio=function(){return H},this.setPixelRatio=function(x){x!==void 0&&(H=x,this.setSize(W,K,!1))},this.getSize=function(x){return x.set(W,K)},this.setSize=function(x,U,B=!0){if(G.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}W=x,K=U,e.width=Math.floor(x*H),e.height=Math.floor(U*H),B===!0&&(e.style.width=x+"px",e.style.height=U+"px"),this.setViewport(0,0,x,U)},this.getDrawingBufferSize=function(x){return x.set(W*H,K*H).floor()},this.setDrawingBufferSize=function(x,U,B){W=x,K=U,H=B,e.width=Math.floor(x*B),e.height=Math.floor(U*B),this.setViewport(0,0,x,U)},this.getCurrentViewport=function(x){return x.copy(C)},this.getViewport=function(x){return x.copy(j)},this.setViewport=function(x,U,B,k){x.isVector4?j.set(x.x,x.y,x.z,x.w):j.set(x,U,B,k),St.viewport(C.copy(j).multiplyScalar(H).round())},this.getScissor=function(x){return x.copy(dt)},this.setScissor=function(x,U,B,k){x.isVector4?dt.set(x.x,x.y,x.z,x.w):dt.set(x,U,B,k),St.scissor(V.copy(dt).multiplyScalar(H).round())},this.getScissorTest=function(){return Mt},this.setScissorTest=function(x){St.setScissorTest(Mt=x)},this.setOpaqueSort=function(x){st=x},this.setTransparentSort=function(x){ut=x},this.getClearColor=function(x){return x.copy(wt.getClearColor())},this.setClearColor=function(){wt.setClearColor.apply(wt,arguments)},this.getClearAlpha=function(){return wt.getClearAlpha()},this.setClearAlpha=function(){wt.setClearAlpha.apply(wt,arguments)},this.clear=function(x=!0,U=!0,B=!0){let k=0;if(x){let F=!1;if(A!==null){const tt=A.texture.format;F=tt===qo||tt===Yo||tt===Xo}if(F){const tt=A.texture.type,ot=tt===fn||tt===Xn||tt===Yi||tt===xi||tt===Go||tt===Wo,ft=wt.getClearColor(),vt=wt.getClearAlpha(),Ct=ft.r,Pt=ft.g,Et=ft.b;ot?(g[0]=Ct,g[1]=Pt,g[2]=Et,g[3]=vt,D.clearBufferuiv(D.COLOR,0,g)):(_[0]=Ct,_[1]=Pt,_[2]=Et,_[3]=vt,D.clearBufferiv(D.COLOR,0,_))}else k|=D.COLOR_BUFFER_BIT}U&&(k|=D.DEPTH_BUFFER_BIT),B&&(k|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(k)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",Z,!1),e.removeEventListener("webglcontextrestored",ht,!1),e.removeEventListener("webglcontextcreationerror",lt,!1),wt.dispose(),mt.dispose(),Gt.dispose(),yt.dispose(),v.dispose(),N.dispose(),q.dispose(),Qt.dispose(),I.dispose(),xt.dispose(),G.dispose(),G.removeEventListener("sessionstart",ra),G.removeEventListener("sessionend",oa),Pn.stop()};function Z(x){x.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),L=!0}function ht(){console.log("THREE.WebGLRenderer: Context Restored."),L=!1;const x=te.autoReset,U=gt.enabled,B=gt.autoUpdate,k=gt.needsUpdate,F=gt.type;rt(),te.autoReset=x,gt.enabled=U,gt.autoUpdate=B,gt.needsUpdate=k,gt.type=F}function lt(x){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",x.statusMessage)}function Dt(x){const U=x.target;U.removeEventListener("dispose",Dt),ie(U)}function ie(x){_e(x),yt.remove(x)}function _e(x){const U=yt.get(x).programs;U!==void 0&&(U.forEach(function(B){xt.releaseProgram(B)}),x.isShaderMaterial&&xt.releaseShaderCache(x))}this.renderBufferDirect=function(x,U,B,k,F,tt){U===null&&(U=ne);const ot=F.isMesh&&F.matrixWorld.determinant()<0,ft=Xh(x,U,B,k,F);St.setMaterial(k,ot);let vt=B.index,Ct=1;if(k.wireframe===!0){if(vt=Q.getWireframeAttribute(B),vt===void 0)return;Ct=2}const Pt=B.drawRange,Et=B.attributes.position;let Wt=Pt.start*Ct,qt=(Pt.start+Pt.count)*Ct;tt!==null&&(Wt=Math.max(Wt,tt.start*Ct),qt=Math.min(qt,(tt.start+tt.count)*Ct)),vt!==null?(Wt=Math.max(Wt,0),qt=Math.min(qt,vt.count)):Et!=null&&(Wt=Math.max(Wt,0),qt=Math.min(qt,Et.count));const ae=qt-Wt;if(ae<0||ae===1/0)return;Qt.setup(F,k,ft,B,vt);let se,Xt=_t;if(vt!==null&&(se=J.get(vt),Xt=zt,Xt.setIndex(se)),F.isMesh)k.wireframe===!0?(St.setLineWidth(k.wireframeLinewidth*oe()),Xt.setMode(D.LINES)):Xt.setMode(D.TRIANGLES);else if(F.isLine){let bt=k.linewidth;bt===void 0&&(bt=1),St.setLineWidth(bt*oe()),F.isLineSegments?Xt.setMode(D.LINES):F.isLineLoop?Xt.setMode(D.LINE_LOOP):Xt.setMode(D.LINE_STRIP)}else F.isPoints?Xt.setMode(D.POINTS):F.isSprite&&Xt.setMode(D.TRIANGLES);if(F.isBatchedMesh)if(F._multiDrawInstances!==null)Xt.renderMultiDrawInstances(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount,F._multiDrawInstances);else if(Ot.get("WEBGL_multi_draw"))Xt.renderMultiDraw(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount);else{const bt=F._multiDrawStarts,me=F._multiDrawCounts,jt=F._multiDrawCount,He=vt?J.get(vt).bytesPerElement:1,jn=yt.get(k).currentProgram.getUniforms();for(let Ce=0;Ce<jt;Ce++)jn.setValue(D,"_gl_DrawID",Ce),Xt.render(bt[Ce]/He,me[Ce])}else if(F.isInstancedMesh)Xt.renderInstances(Wt,ae,F.count);else if(B.isInstancedBufferGeometry){const bt=B._maxInstanceCount!==void 0?B._maxInstanceCount:1/0,me=Math.min(B.instanceCount,bt);Xt.renderInstances(Wt,ae,me)}else Xt.render(Wt,ae)};function Kt(x,U,B){x.transparent===!0&&x.side===Ye&&x.forceSinglePass===!1?(x.side=Ae,x.needsUpdate=!0,$i(x,U,B),x.side=Cn,x.needsUpdate=!0,$i(x,U,B),x.side=Ye):$i(x,U,B)}this.compile=function(x,U,B=null){B===null&&(B=x),f=Gt.get(B),f.init(U),y.push(f),B.traverseVisible(function(F){F.isLight&&F.layers.test(U.layers)&&(f.pushLight(F),F.castShadow&&f.pushShadow(F))}),x!==B&&x.traverseVisible(function(F){F.isLight&&F.layers.test(U.layers)&&(f.pushLight(F),F.castShadow&&f.pushShadow(F))}),f.setupLights();const k=new Set;return x.traverse(function(F){if(!(F.isMesh||F.isPoints||F.isLine||F.isSprite))return;const tt=F.material;if(tt)if(Array.isArray(tt))for(let ot=0;ot<tt.length;ot++){const ft=tt[ot];Kt(ft,B,F),k.add(ft)}else Kt(tt,B,F),k.add(tt)}),y.pop(),f=null,k},this.compileAsync=function(x,U,B=null){const k=this.compile(x,U,B);return new Promise(F=>{function tt(){if(k.forEach(function(ot){yt.get(ot).currentProgram.isReady()&&k.delete(ot)}),k.size===0){F(x);return}setTimeout(tt,10)}Ot.get("KHR_parallel_shader_compile")!==null?tt():setTimeout(tt,10)})};let ze=null;function en(x){ze&&ze(x)}function ra(){Pn.stop()}function oa(){Pn.start()}const Pn=new kl;Pn.setAnimationLoop(en),typeof self<"u"&&Pn.setContext(self),this.setAnimationLoop=function(x){ze=x,G.setAnimationLoop(x),x===null?Pn.stop():Pn.start()},G.addEventListener("sessionstart",ra),G.addEventListener("sessionend",oa),this.render=function(x,U){if(U!==void 0&&U.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(L===!0)return;if(x.matrixWorldAutoUpdate===!0&&x.updateMatrixWorld(),U.parent===null&&U.matrixWorldAutoUpdate===!0&&U.updateMatrixWorld(),G.enabled===!0&&G.isPresenting===!0&&(G.cameraAutoUpdate===!0&&G.updateCamera(U),U=G.getCamera()),x.isScene===!0&&x.onBeforeRender(E,x,U,A),f=Gt.get(x,y.length),f.init(U),y.push(f),Tt.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),X.setFromProjectionMatrix(Tt),pt=this.localClippingEnabled,et=nt.init(this.clippingPlanes,pt),p=mt.get(x,b.length),p.init(),b.push(p),G.enabled===!0&&G.isPresenting===!0){const tt=E.xr.getDepthSensingMesh();tt!==null&&er(tt,U,-1/0,E.sortObjects)}er(x,U,0,E.sortObjects),p.finish(),E.sortObjects===!0&&p.sort(st,ut),Vt=G.enabled===!1||G.isPresenting===!1||G.hasDepthSensing()===!1,Vt&&wt.addToRenderList(p,x),this.info.render.frame++,et===!0&&nt.beginShadows();const B=f.state.shadowsArray;gt.render(B,x,U),et===!0&&nt.endShadows(),this.info.autoReset===!0&&this.info.reset();const k=p.opaque,F=p.transmissive;if(f.setupLights(),U.isArrayCamera){const tt=U.cameras;if(F.length>0)for(let ot=0,ft=tt.length;ot<ft;ot++){const vt=tt[ot];ca(k,F,x,vt)}Vt&&wt.render(x);for(let ot=0,ft=tt.length;ot<ft;ot++){const vt=tt[ot];aa(p,x,vt,vt.viewport)}}else F.length>0&&ca(k,F,x,U),Vt&&wt.render(x),aa(p,x,U);A!==null&&R===0&&(w.updateMultisampleRenderTarget(A),w.updateRenderTargetMipmap(A)),x.isScene===!0&&x.onAfterRender(E,x,U),Qt.resetDefaultState(),S=-1,M=null,y.pop(),y.length>0?(f=y[y.length-1],et===!0&&nt.setGlobalState(E.clippingPlanes,f.state.camera)):f=null,b.pop(),b.length>0?p=b[b.length-1]:p=null};function er(x,U,B,k){if(x.visible===!1)return;if(x.layers.test(U.layers)){if(x.isGroup)B=x.renderOrder;else if(x.isLOD)x.autoUpdate===!0&&x.update(U);else if(x.isLight)f.pushLight(x),x.castShadow&&f.pushShadow(x);else if(x.isSprite){if(!x.frustumCulled||X.intersectsSprite(x)){k&&Ft.setFromMatrixPosition(x.matrixWorld).applyMatrix4(Tt);const ot=q.update(x),ft=x.material;ft.visible&&p.push(x,ot,ft,B,Ft.z,null)}}else if((x.isMesh||x.isLine||x.isPoints)&&(!x.frustumCulled||X.intersectsObject(x))){const ot=q.update(x),ft=x.material;if(k&&(x.boundingSphere!==void 0?(x.boundingSphere===null&&x.computeBoundingSphere(),Ft.copy(x.boundingSphere.center)):(ot.boundingSphere===null&&ot.computeBoundingSphere(),Ft.copy(ot.boundingSphere.center)),Ft.applyMatrix4(x.matrixWorld).applyMatrix4(Tt)),Array.isArray(ft)){const vt=ot.groups;for(let Ct=0,Pt=vt.length;Ct<Pt;Ct++){const Et=vt[Ct],Wt=ft[Et.materialIndex];Wt&&Wt.visible&&p.push(x,ot,Wt,B,Ft.z,Et)}}else ft.visible&&p.push(x,ot,ft,B,Ft.z,null)}}const tt=x.children;for(let ot=0,ft=tt.length;ot<ft;ot++)er(tt[ot],U,B,k)}function aa(x,U,B,k){const F=x.opaque,tt=x.transmissive,ot=x.transparent;f.setupLightsView(B),et===!0&&nt.setGlobalState(E.clippingPlanes,B),k&&St.viewport(C.copy(k)),F.length>0&&Qi(F,U,B),tt.length>0&&Qi(tt,U,B),ot.length>0&&Qi(ot,U,B),St.buffers.depth.setTest(!0),St.buffers.depth.setMask(!0),St.buffers.color.setMask(!0),St.setPolygonOffset(!1)}function ca(x,U,B,k){if((B.isScene===!0?B.overrideMaterial:null)!==null)return;f.state.transmissionRenderTarget[k.id]===void 0&&(f.state.transmissionRenderTarget[k.id]=new Yn(1,1,{generateMipmaps:!0,type:Ot.has("EXT_color_buffer_half_float")||Ot.has("EXT_color_buffer_float")?Ki:fn,minFilter:Wn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Yt.workingColorSpace}));const tt=f.state.transmissionRenderTarget[k.id],ot=k.viewport||C;tt.setSize(ot.z*E.transmissionResolutionScale,ot.w*E.transmissionResolutionScale);const ft=E.getRenderTarget();E.setRenderTarget(tt),E.getClearColor(Y),z=E.getClearAlpha(),z<1&&E.setClearColor(16777215,.5),E.clear(),Vt&&wt.render(B);const vt=E.toneMapping;E.toneMapping=An;const Ct=k.viewport;if(k.viewport!==void 0&&(k.viewport=void 0),f.setupLightsView(k),et===!0&&nt.setGlobalState(E.clippingPlanes,k),Qi(x,B,k),w.updateMultisampleRenderTarget(tt),w.updateRenderTargetMipmap(tt),Ot.has("WEBGL_multisampled_render_to_texture")===!1){let Pt=!1;for(let Et=0,Wt=U.length;Et<Wt;Et++){const qt=U[Et],ae=qt.object,se=qt.geometry,Xt=qt.material,bt=qt.group;if(Xt.side===Ye&&ae.layers.test(k.layers)){const me=Xt.side;Xt.side=Ae,Xt.needsUpdate=!0,la(ae,B,k,se,Xt,bt),Xt.side=me,Xt.needsUpdate=!0,Pt=!0}}Pt===!0&&(w.updateMultisampleRenderTarget(tt),w.updateRenderTargetMipmap(tt))}E.setRenderTarget(ft),E.setClearColor(Y,z),Ct!==void 0&&(k.viewport=Ct),E.toneMapping=vt}function Qi(x,U,B){const k=U.isScene===!0?U.overrideMaterial:null;for(let F=0,tt=x.length;F<tt;F++){const ot=x[F],ft=ot.object,vt=ot.geometry,Ct=k===null?ot.material:k,Pt=ot.group;ft.layers.test(B.layers)&&la(ft,U,B,vt,Ct,Pt)}}function la(x,U,B,k,F,tt){x.onBeforeRender(E,U,B,k,F,tt),x.modelViewMatrix.multiplyMatrices(B.matrixWorldInverse,x.matrixWorld),x.normalMatrix.getNormalMatrix(x.modelViewMatrix),F.onBeforeRender(E,U,B,k,x,tt),F.transparent===!0&&F.side===Ye&&F.forceSinglePass===!1?(F.side=Ae,F.needsUpdate=!0,E.renderBufferDirect(B,U,k,F,x,tt),F.side=Cn,F.needsUpdate=!0,E.renderBufferDirect(B,U,k,F,x,tt),F.side=Ye):E.renderBufferDirect(B,U,k,F,x,tt),x.onAfterRender(E,U,B,k,F,tt)}function $i(x,U,B){U.isScene!==!0&&(U=ne);const k=yt.get(x),F=f.state.lights,tt=f.state.shadowsArray,ot=F.state.version,ft=xt.getParameters(x,F.state,tt,U,B),vt=xt.getProgramCacheKey(ft);let Ct=k.programs;k.environment=x.isMeshStandardMaterial?U.environment:null,k.fog=U.fog,k.envMap=(x.isMeshStandardMaterial?N:v).get(x.envMap||k.environment),k.envMapRotation=k.environment!==null&&x.envMap===null?U.environmentRotation:x.envMapRotation,Ct===void 0&&(x.addEventListener("dispose",Dt),Ct=new Map,k.programs=Ct);let Pt=Ct.get(vt);if(Pt!==void 0){if(k.currentProgram===Pt&&k.lightsStateVersion===ot)return ua(x,ft),Pt}else ft.uniforms=xt.getUniforms(x),x.onBeforeCompile(ft,E),Pt=xt.acquireProgram(ft,vt),Ct.set(vt,Pt),k.uniforms=ft.uniforms;const Et=k.uniforms;return(!x.isShaderMaterial&&!x.isRawShaderMaterial||x.clipping===!0)&&(Et.clippingPlanes=nt.uniform),ua(x,ft),k.needsLights=qh(x),k.lightsStateVersion=ot,k.needsLights&&(Et.ambientLightColor.value=F.state.ambient,Et.lightProbe.value=F.state.probe,Et.directionalLights.value=F.state.directional,Et.directionalLightShadows.value=F.state.directionalShadow,Et.spotLights.value=F.state.spot,Et.spotLightShadows.value=F.state.spotShadow,Et.rectAreaLights.value=F.state.rectArea,Et.ltc_1.value=F.state.rectAreaLTC1,Et.ltc_2.value=F.state.rectAreaLTC2,Et.pointLights.value=F.state.point,Et.pointLightShadows.value=F.state.pointShadow,Et.hemisphereLights.value=F.state.hemi,Et.directionalShadowMap.value=F.state.directionalShadowMap,Et.directionalShadowMatrix.value=F.state.directionalShadowMatrix,Et.spotShadowMap.value=F.state.spotShadowMap,Et.spotLightMatrix.value=F.state.spotLightMatrix,Et.spotLightMap.value=F.state.spotLightMap,Et.pointShadowMap.value=F.state.pointShadowMap,Et.pointShadowMatrix.value=F.state.pointShadowMatrix),k.currentProgram=Pt,k.uniformsList=null,Pt}function ha(x){if(x.uniformsList===null){const U=x.currentProgram.getUniforms();x.uniformsList=Ns.seqWithValue(U.seq,x.uniforms)}return x.uniformsList}function ua(x,U){const B=yt.get(x);B.outputColorSpace=U.outputColorSpace,B.batching=U.batching,B.batchingColor=U.batchingColor,B.instancing=U.instancing,B.instancingColor=U.instancingColor,B.instancingMorph=U.instancingMorph,B.skinning=U.skinning,B.morphTargets=U.morphTargets,B.morphNormals=U.morphNormals,B.morphColors=U.morphColors,B.morphTargetsCount=U.morphTargetsCount,B.numClippingPlanes=U.numClippingPlanes,B.numIntersection=U.numClipIntersection,B.vertexAlphas=U.vertexAlphas,B.vertexTangents=U.vertexTangents,B.toneMapping=U.toneMapping}function Xh(x,U,B,k,F){U.isScene!==!0&&(U=ne),w.resetTextureUnits();const tt=U.fog,ot=k.isMeshStandardMaterial?U.environment:null,ft=A===null?E.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:yi,vt=(k.isMeshStandardMaterial?N:v).get(k.envMap||ot),Ct=k.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,Pt=!!B.attributes.tangent&&(!!k.normalMap||k.anisotropy>0),Et=!!B.morphAttributes.position,Wt=!!B.morphAttributes.normal,qt=!!B.morphAttributes.color;let ae=An;k.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(ae=E.toneMapping);const se=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,Xt=se!==void 0?se.length:0,bt=yt.get(k),me=f.state.lights;if(et===!0&&(pt===!0||x!==M)){const ye=x===M&&k.id===S;nt.setState(k,x,ye)}let jt=!1;k.version===bt.__version?(bt.needsLights&&bt.lightsStateVersion!==me.state.version||bt.outputColorSpace!==ft||F.isBatchedMesh&&bt.batching===!1||!F.isBatchedMesh&&bt.batching===!0||F.isBatchedMesh&&bt.batchingColor===!0&&F.colorTexture===null||F.isBatchedMesh&&bt.batchingColor===!1&&F.colorTexture!==null||F.isInstancedMesh&&bt.instancing===!1||!F.isInstancedMesh&&bt.instancing===!0||F.isSkinnedMesh&&bt.skinning===!1||!F.isSkinnedMesh&&bt.skinning===!0||F.isInstancedMesh&&bt.instancingColor===!0&&F.instanceColor===null||F.isInstancedMesh&&bt.instancingColor===!1&&F.instanceColor!==null||F.isInstancedMesh&&bt.instancingMorph===!0&&F.morphTexture===null||F.isInstancedMesh&&bt.instancingMorph===!1&&F.morphTexture!==null||bt.envMap!==vt||k.fog===!0&&bt.fog!==tt||bt.numClippingPlanes!==void 0&&(bt.numClippingPlanes!==nt.numPlanes||bt.numIntersection!==nt.numIntersection)||bt.vertexAlphas!==Ct||bt.vertexTangents!==Pt||bt.morphTargets!==Et||bt.morphNormals!==Wt||bt.morphColors!==qt||bt.toneMapping!==ae||bt.morphTargetsCount!==Xt)&&(jt=!0):(jt=!0,bt.__version=k.version);let He=bt.currentProgram;jt===!0&&(He=$i(k,U,F));let jn=!1,Ce=!1,Ri=!1;const ee=He.getUniforms(),Ue=bt.uniforms;if(St.useProgram(He.program)&&(jn=!0,Ce=!0,Ri=!0),k.id!==S&&(S=k.id,Ce=!0),jn||M!==x){St.buffers.depth.getReversed()?(at.copy(x.projectionMatrix),nd(at),id(at),ee.setValue(D,"projectionMatrix",at)):ee.setValue(D,"projectionMatrix",x.projectionMatrix),ee.setValue(D,"viewMatrix",x.matrixWorldInverse);const Te=ee.map.cameraPosition;Te!==void 0&&Te.setValue(D,Rt.setFromMatrixPosition(x.matrixWorld)),kt.logarithmicDepthBuffer&&ee.setValue(D,"logDepthBufFC",2/(Math.log(x.far+1)/Math.LN2)),(k.isMeshPhongMaterial||k.isMeshToonMaterial||k.isMeshLambertMaterial||k.isMeshBasicMaterial||k.isMeshStandardMaterial||k.isShaderMaterial)&&ee.setValue(D,"isOrthographic",x.isOrthographicCamera===!0),M!==x&&(M=x,Ce=!0,Ri=!0)}if(F.isSkinnedMesh){ee.setOptional(D,F,"bindMatrix"),ee.setOptional(D,F,"bindMatrixInverse");const ye=F.skeleton;ye&&(ye.boneTexture===null&&ye.computeBoneTexture(),ee.setValue(D,"boneTexture",ye.boneTexture,w))}F.isBatchedMesh&&(ee.setOptional(D,F,"batchingTexture"),ee.setValue(D,"batchingTexture",F._matricesTexture,w),ee.setOptional(D,F,"batchingIdTexture"),ee.setValue(D,"batchingIdTexture",F._indirectTexture,w),ee.setOptional(D,F,"batchingColorTexture"),F._colorsTexture!==null&&ee.setValue(D,"batchingColorTexture",F._colorsTexture,w));const Fe=B.morphAttributes;if((Fe.position!==void 0||Fe.normal!==void 0||Fe.color!==void 0)&&At.update(F,B,He),(Ce||bt.receiveShadow!==F.receiveShadow)&&(bt.receiveShadow=F.receiveShadow,ee.setValue(D,"receiveShadow",F.receiveShadow)),k.isMeshGouraudMaterial&&k.envMap!==null&&(Ue.envMap.value=vt,Ue.flipEnvMap.value=vt.isCubeTexture&&vt.isRenderTargetTexture===!1?-1:1),k.isMeshStandardMaterial&&k.envMap===null&&U.environment!==null&&(Ue.envMapIntensity.value=U.environmentIntensity),Ce&&(ee.setValue(D,"toneMappingExposure",E.toneMappingExposure),bt.needsLights&&Yh(Ue,Ri),tt&&k.fog===!0&&ct.refreshFogUniforms(Ue,tt),ct.refreshMaterialUniforms(Ue,k,H,K,f.state.transmissionRenderTarget[x.id]),Ns.upload(D,ha(bt),Ue,w)),k.isShaderMaterial&&k.uniformsNeedUpdate===!0&&(Ns.upload(D,ha(bt),Ue,w),k.uniformsNeedUpdate=!1),k.isSpriteMaterial&&ee.setValue(D,"center",F.center),ee.setValue(D,"modelViewMatrix",F.modelViewMatrix),ee.setValue(D,"normalMatrix",F.normalMatrix),ee.setValue(D,"modelMatrix",F.matrixWorld),k.isShaderMaterial||k.isRawShaderMaterial){const ye=k.uniformsGroups;for(let Te=0,nr=ye.length;Te<nr;Te++){const Dn=ye[Te];I.update(Dn,He),I.bind(Dn,He)}}return He}function Yh(x,U){x.ambientLightColor.needsUpdate=U,x.lightProbe.needsUpdate=U,x.directionalLights.needsUpdate=U,x.directionalLightShadows.needsUpdate=U,x.pointLights.needsUpdate=U,x.pointLightShadows.needsUpdate=U,x.spotLights.needsUpdate=U,x.spotLightShadows.needsUpdate=U,x.rectAreaLights.needsUpdate=U,x.hemisphereLights.needsUpdate=U}function qh(x){return x.isMeshLambertMaterial||x.isMeshToonMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isShadowMaterial||x.isShaderMaterial&&x.lights===!0}this.getActiveCubeFace=function(){return T},this.getActiveMipmapLevel=function(){return R},this.getRenderTarget=function(){return A},this.setRenderTargetTextures=function(x,U,B){yt.get(x.texture).__webglTexture=U,yt.get(x.depthTexture).__webglTexture=B;const k=yt.get(x);k.__hasExternalTextures=!0,k.__autoAllocateDepthBuffer=B===void 0,k.__autoAllocateDepthBuffer||Ot.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),k.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(x,U){const B=yt.get(x);B.__webglFramebuffer=U,B.__useDefaultFramebuffer=U===void 0};const jh=D.createFramebuffer();this.setRenderTarget=function(x,U=0,B=0){A=x,T=U,R=B;let k=!0,F=null,tt=!1,ot=!1;if(x){const vt=yt.get(x);if(vt.__useDefaultFramebuffer!==void 0)St.bindFramebuffer(D.FRAMEBUFFER,null),k=!1;else if(vt.__webglFramebuffer===void 0)w.setupRenderTarget(x);else if(vt.__hasExternalTextures)w.rebindTextures(x,yt.get(x.texture).__webglTexture,yt.get(x.depthTexture).__webglTexture);else if(x.depthBuffer){const Et=x.depthTexture;if(vt.__boundDepthTexture!==Et){if(Et!==null&&yt.has(Et)&&(x.width!==Et.image.width||x.height!==Et.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");w.setupDepthRenderbuffer(x)}}const Ct=x.texture;(Ct.isData3DTexture||Ct.isDataArrayTexture||Ct.isCompressedArrayTexture)&&(ot=!0);const Pt=yt.get(x).__webglFramebuffer;x.isWebGLCubeRenderTarget?(Array.isArray(Pt[U])?F=Pt[U][B]:F=Pt[U],tt=!0):x.samples>0&&w.useMultisampledRTT(x)===!1?F=yt.get(x).__webglMultisampledFramebuffer:Array.isArray(Pt)?F=Pt[B]:F=Pt,C.copy(x.viewport),V.copy(x.scissor),O=x.scissorTest}else C.copy(j).multiplyScalar(H).floor(),V.copy(dt).multiplyScalar(H).floor(),O=Mt;if(B!==0&&(F=jh),St.bindFramebuffer(D.FRAMEBUFFER,F)&&k&&St.drawBuffers(x,F),St.viewport(C),St.scissor(V),St.setScissorTest(O),tt){const vt=yt.get(x.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+U,vt.__webglTexture,B)}else if(ot){const vt=yt.get(x.texture),Ct=U;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,vt.__webglTexture,B,Ct)}else if(x!==null&&B!==0){const vt=yt.get(x.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,vt.__webglTexture,B)}S=-1},this.readRenderTargetPixels=function(x,U,B,k,F,tt,ot){if(!(x&&x.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ft=yt.get(x).__webglFramebuffer;if(x.isWebGLCubeRenderTarget&&ot!==void 0&&(ft=ft[ot]),ft){St.bindFramebuffer(D.FRAMEBUFFER,ft);try{const vt=x.texture,Ct=vt.format,Pt=vt.type;if(!kt.textureFormatReadable(Ct)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!kt.textureTypeReadable(Pt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=x.width-k&&B>=0&&B<=x.height-F&&D.readPixels(U,B,k,F,It.convert(Ct),It.convert(Pt),tt)}finally{const vt=A!==null?yt.get(A).__webglFramebuffer:null;St.bindFramebuffer(D.FRAMEBUFFER,vt)}}},this.readRenderTargetPixelsAsync=async function(x,U,B,k,F,tt,ot){if(!(x&&x.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ft=yt.get(x).__webglFramebuffer;if(x.isWebGLCubeRenderTarget&&ot!==void 0&&(ft=ft[ot]),ft){const vt=x.texture,Ct=vt.format,Pt=vt.type;if(!kt.textureFormatReadable(Ct))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!kt.textureTypeReadable(Pt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(U>=0&&U<=x.width-k&&B>=0&&B<=x.height-F){St.bindFramebuffer(D.FRAMEBUFFER,ft);const Et=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,Et),D.bufferData(D.PIXEL_PACK_BUFFER,tt.byteLength,D.STREAM_READ),D.readPixels(U,B,k,F,It.convert(Ct),It.convert(Pt),0);const Wt=A!==null?yt.get(A).__webglFramebuffer:null;St.bindFramebuffer(D.FRAMEBUFFER,Wt);const qt=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await ed(D,qt,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,Et),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,tt),D.deleteBuffer(Et),D.deleteSync(qt),tt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(x,U=null,B=0){x.isTexture!==!0&&(ui("WebGLRenderer: copyFramebufferToTexture function signature has changed."),U=arguments[0]||null,x=arguments[1]);const k=Math.pow(2,-B),F=Math.floor(x.image.width*k),tt=Math.floor(x.image.height*k),ot=U!==null?U.x:0,ft=U!==null?U.y:0;w.setTexture2D(x,0),D.copyTexSubImage2D(D.TEXTURE_2D,B,0,0,ot,ft,F,tt),St.unbindTexture()};const Kh=D.createFramebuffer(),Jh=D.createFramebuffer();this.copyTextureToTexture=function(x,U,B=null,k=null,F=0,tt=null){x.isTexture!==!0&&(ui("WebGLRenderer: copyTextureToTexture function signature has changed."),k=arguments[0]||null,x=arguments[1],U=arguments[2],tt=arguments[3]||0,B=null),tt===null&&(F!==0?(ui("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),tt=F,F=0):tt=0);let ot,ft,vt,Ct,Pt,Et,Wt,qt,ae;const se=x.isCompressedTexture?x.mipmaps[tt]:x.image;if(B!==null)ot=B.max.x-B.min.x,ft=B.max.y-B.min.y,vt=B.isBox3?B.max.z-B.min.z:1,Ct=B.min.x,Pt=B.min.y,Et=B.isBox3?B.min.z:0;else{const Fe=Math.pow(2,-F);ot=Math.floor(se.width*Fe),ft=Math.floor(se.height*Fe),x.isDataArrayTexture?vt=se.depth:x.isData3DTexture?vt=Math.floor(se.depth*Fe):vt=1,Ct=0,Pt=0,Et=0}k!==null?(Wt=k.x,qt=k.y,ae=k.z):(Wt=0,qt=0,ae=0);const Xt=It.convert(U.format),bt=It.convert(U.type);let me;U.isData3DTexture?(w.setTexture3D(U,0),me=D.TEXTURE_3D):U.isDataArrayTexture||U.isCompressedArrayTexture?(w.setTexture2DArray(U,0),me=D.TEXTURE_2D_ARRAY):(w.setTexture2D(U,0),me=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,U.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,U.unpackAlignment);const jt=D.getParameter(D.UNPACK_ROW_LENGTH),He=D.getParameter(D.UNPACK_IMAGE_HEIGHT),jn=D.getParameter(D.UNPACK_SKIP_PIXELS),Ce=D.getParameter(D.UNPACK_SKIP_ROWS),Ri=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,se.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,se.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Ct),D.pixelStorei(D.UNPACK_SKIP_ROWS,Pt),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Et);const ee=x.isDataArrayTexture||x.isData3DTexture,Ue=U.isDataArrayTexture||U.isData3DTexture;if(x.isDepthTexture){const Fe=yt.get(x),ye=yt.get(U),Te=yt.get(Fe.__renderTarget),nr=yt.get(ye.__renderTarget);St.bindFramebuffer(D.READ_FRAMEBUFFER,Te.__webglFramebuffer),St.bindFramebuffer(D.DRAW_FRAMEBUFFER,nr.__webglFramebuffer);for(let Dn=0;Dn<vt;Dn++)ee&&(D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,yt.get(x).__webglTexture,F,Et+Dn),D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,yt.get(U).__webglTexture,tt,ae+Dn)),D.blitFramebuffer(Ct,Pt,ot,ft,Wt,qt,ot,ft,D.DEPTH_BUFFER_BIT,D.NEAREST);St.bindFramebuffer(D.READ_FRAMEBUFFER,null),St.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else if(F!==0||x.isRenderTargetTexture||yt.has(x)){const Fe=yt.get(x),ye=yt.get(U);St.bindFramebuffer(D.READ_FRAMEBUFFER,Kh),St.bindFramebuffer(D.DRAW_FRAMEBUFFER,Jh);for(let Te=0;Te<vt;Te++)ee?D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Fe.__webglTexture,F,Et+Te):D.framebufferTexture2D(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Fe.__webglTexture,F),Ue?D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,ye.__webglTexture,tt,ae+Te):D.framebufferTexture2D(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,ye.__webglTexture,tt),F!==0?D.blitFramebuffer(Ct,Pt,ot,ft,Wt,qt,ot,ft,D.COLOR_BUFFER_BIT,D.NEAREST):Ue?D.copyTexSubImage3D(me,tt,Wt,qt,ae+Te,Ct,Pt,ot,ft):D.copyTexSubImage2D(me,tt,Wt,qt,Ct,Pt,ot,ft);St.bindFramebuffer(D.READ_FRAMEBUFFER,null),St.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else Ue?x.isDataTexture||x.isData3DTexture?D.texSubImage3D(me,tt,Wt,qt,ae,ot,ft,vt,Xt,bt,se.data):U.isCompressedArrayTexture?D.compressedTexSubImage3D(me,tt,Wt,qt,ae,ot,ft,vt,Xt,se.data):D.texSubImage3D(me,tt,Wt,qt,ae,ot,ft,vt,Xt,bt,se):x.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,tt,Wt,qt,ot,ft,Xt,bt,se.data):x.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,tt,Wt,qt,se.width,se.height,Xt,se.data):D.texSubImage2D(D.TEXTURE_2D,tt,Wt,qt,ot,ft,Xt,bt,se);D.pixelStorei(D.UNPACK_ROW_LENGTH,jt),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,He),D.pixelStorei(D.UNPACK_SKIP_PIXELS,jn),D.pixelStorei(D.UNPACK_SKIP_ROWS,Ce),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Ri),tt===0&&U.generateMipmaps&&D.generateMipmap(me),St.unbindTexture()},this.copyTextureToTexture3D=function(x,U,B=null,k=null,F=0){return x.isTexture!==!0&&(ui("WebGLRenderer: copyTextureToTexture3D function signature has changed."),B=arguments[0]||null,k=arguments[1]||null,x=arguments[2],U=arguments[3],F=arguments[4]||0),ui('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(x,U,B,k,F)},this.initRenderTarget=function(x){yt.get(x).__webglFramebuffer===void 0&&w.setupRenderTarget(x)},this.initTexture=function(x){x.isCubeTexture?w.setTextureCube(x,0):x.isData3DTexture?w.setTexture3D(x,0):x.isDataArrayTexture||x.isCompressedArrayTexture?w.setTexture2DArray(x,0):w.setTexture2D(x,0),St.unbindTexture()},this.resetState=function(){T=0,R=0,A=null,St.reset(),Qt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return hn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=Yt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Yt._getUnpackColorSpace()}}function mc(){return document.documentElement.dataset.d3dUiScrub==="1"}const gc=new Ht,_c=new P,vc=new En,xc=new Ol;function S_(n,t,e){return n.updateMatrixWorld(!0),n.getWorldDirection(_c),vc.setFromNormalAndCoplanarPoint(_c,t),gc.set(0,0),xc.setFromCamera(gc,n),xc.ray.intersectPlane(vc,e)??e.copy(t)}const Wl="frustumHalfHeight";function E_(n,t=.1,e=1e5){const s=new Zi(-50*n,50*n,50,-50,t,e);return s.userData[Wl]=50,s.zoom=1,s.position.copy(mn),s}function Xl(n){const t=n.userData[Wl];return typeof t=="number"&&t>0?t:Math.abs(n.top-n.bottom)*.5}function b_(n,t){if(t<=0)return 1;const e=Math.max(n.zoom,1e-6),i=Xl(n),s=(n.right-n.left)/Math.max(n.top-n.bottom,1e-6);return 2*i*s/(e*t)}new P;new Oe;new Zi(-1,1,1,-1,.01,1e6);function Yl(n,t){if(t<=0)return 1;const e=Math.max(n.zoom,1e-6);return 2*Xl(n)/(e*t)}function w_(n,t){return Yl(n,t)}const mn=new P(0,0,0),T_=1.5,A_=new P(0,1,0),ql=new P(0,0,1),C_=.1,R_=20,P_=250,jl={top:new P(0,0,1),bottom:new P(0,0,-1),front:new P(0,1,0),back:new P(0,-1,0),left:new P(1,0,0),right:new P(-1,0,0),"front-right":new P(-1,1,.2),"front-left":new P(1,1,.2),"back-right":new P(-1,-1,.2),"back-left":new P(1,-1,.2)},Kl=new P(0,1,0),D_=new P(0,0,1),js=new P,Mc=new Zt,Es=new ke,bs=new P,Ze=new P,Ei=new P,Fi=new P,Hn=new P;function Jl(n,t){const{min:e,max:i}=n,s=[e.x,i.x],r=[e.y,i.y],o=[e.z,i.z];let a=0;for(const c of s)for(const l of r)for(const h of o)t[a]?.set(c,l,h),a+=1}function Zl(n,t,e,i=1.15){if(n.isEmpty())return 200;const s=n.getCenter(new P),r=Array.from({length:8},()=>new P);Jl(n,r);const o=new Zi(-1,1,1,-1,e,1e5);o.quaternion.copy(t);let a=Math.max(n.getSize(new P).length()*.5,50);for(let c=0;c<32;c+=1){o.position.copy(s),o.updateMatrixWorld(!0),o.getWorldDirection(Ei),o.position.addScaledVector(Ei,-a),o.updateMatrixWorld(!0);let l=!0;for(const h of r)if(Hn.copy(h).applyMatrix4(o.matrixWorldInverse),Hn.z>=-e){l=!1;break}if(l)return a*i;a*=1.35}return a*i}function Ql(n){return n==="top"||n==="bottom"?Kl:D_}function ta(n,t){return $l(new ke,n,t)}function $l(n,t,e){return js.copy(t).normalize(),Mc.lookAt(js,mn,e),n.setFromRotationMatrix(Mc)}const L_=.82;function I_(n){if(n.length!==16)return new ke;if(Fi.set(n[8],n[9],n[10]),Fi.lengthSq()<1e-8)return new ke;Fi.normalize(),js.copy(Fi).negate();const t=Math.abs(Fi.z)>L_?Kl:ql;return $l(new ke,js,t)}function U_(n,t){return t.dentalWebGlMatrix&&t.dentalWebGlMatrix.length===16?(na(n),n.rotation.copy(I_(t.dentalWebGlMatrix)),!0):t.preset?(rh(n,t.preset,{resetPan:t.resetPan}),!0):!1}function F_(n,t,e,i,s){const r=s.isEmpty()?new P(0,0,0):s.getCenter(new P),o=e.length===16;return o&&U_(t,{dentalWebGlMatrix:e,resetPan:!0}),s.isEmpty()?pe(n,t,i,r):sh(t,n,s,i,{preserveRotation:o}),r.clone()}function th(n){return{rotation:n.rotation.clone(),panX:n.panX,panY:n.panY,zoom:n.zoom,frustumHalfHeight:n.frustumHalfHeight,viewDistance:n.viewDistance,near:n.near,far:n.far}}function Bo(n,t=new Oe){return t.name="viewport-rig",n.parent&&n.parent.remove(n),t.add(n),t}function N_(n){if(n.parent instanceof Oe)return n.parent;const t=n.userData.viewportRig;if(t instanceof Oe)return n.parent!==t&&Bo(n,t),t;const e=new Oe;return e.name="viewport-rig",Bo(n,e),n.userData.viewportRig=e,e}function B_(n,t){if(t.isEmpty())return;const e=t.getSize(new P),i=Math.max(e.length(),50);n.near=C_,n.far=i*R_;let s=i*4;const r=["front","top","left","right","front-right","back-left"];for(const o of r){Ei.copy(jl[o]).normalize();const a=ta(Ei,Ql(o));s=Math.max(s,Zl(t,a,n.near,1.2))}n.viewDistance=s}function pe(n,t,e,i=mn,s){const r=N_(n);r.position.copy(i),r.quaternion.copy(t.rotation),n.position.set(0,0,t.viewDistance),n.quaternion.set(0,0,0,1),n.rotation.set(0,0,0),n.zoom=Math.max(t.zoom,1e-6),n.near=t.near,n.far=t.far,n.userData.frustumHalfHeight=t.frustumHalfHeight;const o=t.frustumHalfHeight,a=o*e;n.left=-a+t.panX,n.right=a+t.panX,n.top=o+t.panY,n.bottom=-o+t.panY,n.clearViewOffset(),n.updateProjectionMatrix(),r.updateMatrixWorld(!0),n.updateMatrixWorld(!0)}function ea(n,t){return n.frustumHalfHeight*t}function Sn(n,t,e,i,s,r,o=mn){if(r<=0)return;const a=s/Math.max(r,1);pe(t,n,a,o);const c=b_(t,s),l=Yl(t,r);n.panX-=e*c,n.panY+=i*l}const yc=.22,eh=.005;function O_(n,t,e,i=eh){if(!(t===0&&e===0)){if(t!==0){const s=Math.min(Math.abs(t)*i,yc);bs.set(0,1,0).applyQuaternion(n),Es.setFromAxisAngle(bs,-Math.sign(t)*s),n.premultiply(Es)}if(e!==0){const s=Math.min(Math.abs(e)*i,yc);bs.set(1,0,0).applyQuaternion(n),Es.setFromAxisAngle(bs,-Math.sign(e)*s),n.premultiply(Es)}n.normalize()}}function ws(n,t,e,i,s,r,o=mn){e===0&&i===0||(pe(t,n,r,o),O_(n.rotation,e,i,s))}function k_(n,t,e,i,s,r){pe(t,n,s,e),t.updateMatrixWorld(!0);const o=r.clone().project(t);pe(t,n,s,i),t.updateMatrixWorld(!0);const a=r.clone().project(t),c=Math.max(n.zoom,1e-6),l=n.frustumHalfHeight,h=ea(n,s);n.panX+=(a.x-o.x)*h/c,n.panY+=(a.y-o.y)*l/c}const Sc=Array.from({length:8},()=>new P);function z_(n,t,e,i,s=mn){if(e.isEmpty()||i<=0)return;pe(t,n,i,s),Jl(e,Sc);let r=1/0,o=-1/0,a=1/0,c=-1/0;for(const b of Sc)Ze.copy(b).project(t),!(!Number.isFinite(Ze.x)||!Number.isFinite(Ze.y))&&(r=Math.min(r,Ze.x),o=Math.max(o,Ze.x),a=Math.min(a,Ze.y),c=Math.max(c,Ze.y));const l=o-r,h=c-a;if(!Number.isFinite(l)||!Number.isFinite(h)||l<1e-8||h<1e-8)return;const u=Math.min(l*.5,2),d=Math.min(h*.5,2);let m=0,g=0;if(o<-1+u?m=-1+u-o:r>1-u&&(m=1-u-r),c<-1+d?g=-1+d-c:a>1-d&&(g=1-d-a),Math.abs(m)<1e-8&&Math.abs(g)<1e-8)return;const _=Math.max(n.zoom,1e-6),p=n.frustumHalfHeight,f=ea(n,i);n.panX-=m*f/_,n.panY-=g*p/_}function nh(n,t,e,i){let s=.01,r=500;if(e&&!e.isEmpty()&&i>0){const o=e.getSize(new P),a=Math.max(o.x,o.y,o.z,1),c=Math.max(2*t.frustumHalfHeight,1),l=a/c;s=Math.max(l*.003,.01),r=Math.min(l*350,2e3)}return Vi.clamp(n,s,r)}function Ec(n,t,e=.001,i,s,r=!0){const o=Math.exp(-t*e),a=n.zoom*o;n.zoom=r?nh(a,n,i,s??800):Math.max(a,1e-8)}const Ks=new P,bc=new P,Ir=new P,wc=new P,Tc=new P;function Ur(n,t,e,i,s,r,o){const a=i.getBoundingClientRect();if(a.width<=0||a.height<=0)return!1;const c=a.width/Math.max(a.height,1);return pe(n,t,c,e),n.updateMatrixWorld(!0),Ks.set((s-a.left)/a.width*2-1,-((r-a.top)/a.height)*2+1,0),o.copy(Ks).unproject(n),!0}function Fr(n,t,e,i,s,r,o){const a=i.getBoundingClientRect();if(a.width<=0||a.height<=0)return;const c=a.width/Math.max(a.height,1);pe(t,n,c,e),t.updateMatrixWorld(!0),Ks.set((s-a.left)/a.width*2-1,-((r-a.top)/a.height)*2+1,0),bc.copy(Ks).unproject(t),Ir.subVectors(o,bc),wc.set(1,0,0).transformDirection(t.matrixWorld),Tc.set(0,1,0).transformDirection(t.matrixWorld),n.panX+=Ir.dot(wc),n.panY+=Ir.dot(Tc)}function H_(n,t,e,i,s=mn){const r=th(n);return ih(r,t,e,i,s),{panX:r.panX,panY:r.panY}}function V_(n,t,e,i){const s=Vi.clamp(i,0,1);n.panX=Vi.lerp(n.panX,t,s),n.panY=Vi.lerp(n.panY,e,s)}function G_(n){const t=Vi.clamp(n,0,1);return 1-Math.pow(1-t,3)}const W_=P_;function ih(n,t,e,i,s=mn){pe(t,n,i,s),Ze.copy(e).project(t);const r=Math.max(n.zoom,1e-6),o=n.frustumHalfHeight,a=ea(n,i);n.panX+=Ze.x*a/r,n.panY+=Ze.y*o/r}function na(n){n.panX=0,n.panY=0}function X_(n,t){if(n.isEmpty())return{halfH:50,halfW:50};t.updateMatrixWorld(!0);const e=t.matrixWorldInverse;let i=1/0,s=-1/0,r=1/0,o=-1/0;const{min:a,max:c}=n;for(const l of[a.x,c.x])for(const h of[a.y,c.y])for(const u of[a.z,c.z])Hn.set(l,h,u).applyMatrix4(e),i=Math.min(i,Hn.x),s=Math.max(s,Hn.x),r=Math.min(r,Hn.y),o=Math.max(o,Hn.y);return{halfH:Math.max((o-r)*.5,.5),halfW:Math.max((s-i)*.5,.5)}}function sh(n,t,e,i,s){if(e.isEmpty())return 0;na(n),n.zoom=1,s?.preserveRotation||n.rotation.copy(ta(A_,ql));const r=e.getCenter(new P);B_(n,e);const o=e.getSize(new P);n.frustumHalfHeight=Math.max(o.length(),1)*.5,pe(t,n,i,r);const a=X_(e,t);return n.frustumHalfHeight=Math.max(a.halfH,a.halfW/i)*T_,pe(t,n,i,r),ih(n,t,r,i,r),pe(t,n,i,r),n.frustumHalfHeight*2}function rh(n,t,e={}){e.resetPan&&na(n),Ei.copy(jl[t]).normalize(),n.rotation.copy(ta(Ei,Ql(t)))}function oh(n){const t=n.frustumHalfHeight,e=new ke(...n.quaternion);return{rotation:e,panX:n.panX??n.panLocalX??0,panY:n.panY??n.panLocalY??0,zoom:n.zoom,frustumHalfHeight:t,viewDistance:n.viewDistance??Zl(new pn(new P(-t,-t,-t),new P(t,t,t)),e,n.near),near:n.near,far:n.far}}const le={Left:1,Right:2,Middle:4},Ac={0:le.Left,1:le.Middle,2:le.Right},ah=["input","button","select","textarea","label","a",".mesh-panel",".articulator-panel",".exocad-views-panel",".layers-dock",".view-orientation-widget",".mesh-overlay",".mobile-sheet",".mobile-dock",".cut-view-panel",".heatmap-legend",".heatmap-range-control","#password-gate"].join(",");function Y_(n){return n instanceof Element?n:n instanceof Node?n.parentElement:null}function q_(n){return Y_(n)?.closest(ah)!=null}const Nr=0,Ts=10,Br=5,Or=eh,Cc=.0025,j_=36,K_=32,Rc=40,Pc=72,J_=5,Z_=5,Q_=48,$_=12,As=180,tv=220,ev=16,nv=800,iv=4,sv=.15;function ch(n,t,e){const i=Math.abs(n),s=Math.abs(t);return e!==0?s>=i:s>0&&i<=Math.max(iv,s*sv)}function rv(n,t,e){return e!==0||ch(n,t,e)?!1:Math.abs(n)+Math.abs(t)>0}function Cs(n,t,e){let i=n;return t===1?i*=ev:t===2?i*=nv:t===0&&!e?.pinch&&e?.pixelBoost!==!1&&Math.abs(i)>0&&Math.abs(i)<Q_&&(i*=Z_),e?.pinch&&(i*=J_),i}class ge{camera;domElement;state;pivot=new P;gestureMode="none";pressedButtons=0;leftEverInGesture=!1;panRotationLock=null;rotationAtRmbDown=null;isDragging=!1;suppressContextMenu=!1;dragStartX=0;dragStartY=0;lastX=0;lastY=0;activePointerId=null;pivotPickHandler=null;middleClickHandler=null;onPivotChanged=null;onPivotPicked=null;onChange=null;rightButtonOrbitEnabled=!0;leftButtonOrbitEnabled=!1;middleButtonPanEnabled=!0;interactionEnabled=!0;middleClickHandledByPointerUp=!1;lastMiddleClickSignature="";lastMiddleClickTime=0;pivotChangeAnchor=new P;zoomCursorWorldBefore=new P;contentBoxProvider=null;panBoundsEnabled=!1;zoomClampEnabled=!0;gestureHooks={};pivotPanAnim=null;touchNavigationEnabled=!1;desktopOneFingerOrbitEnabled=!0;touchMode="none";touchPointers=new Map;touchPinchStartDistance=0;touchPinchStartZoom=1;touchPinchCenterX=0;touchPinchCenterY=0;touchPanLastCenter=null;desktopTouchPointers=new Map;desktopThreeFingerMode="none";desktopTwoFingerMode="none";desktopOneFingerMode="none";desktopTouchDragged=!1;desktopTouchStartCenter={x:0,y:0};desktopTouchLastCenter={x:0,y:0};desktopTouchModifiers={shift:!1,ctrl:!1};desktopPinchStartDistance=0;desktopPinchStartZoom=1;desktopPinchZoomArmed=!1;desktopTwoFingerPinchRaf=0;wheelPanAccumX=0;wheelPanAccumY=0;wheelPanRaf=0;wheelPanLastX=0;wheelPanLastY=0;wheelPanLastXAt=0;wheelPanLastYAt=0;wheelPanLastAt=0;wheelGesture="none";wheelGestureAt=0;wheelZoomAccum=0;wheelZoomClientX=0;wheelZoomClientY=0;wheelZoomRaf=0;wheelZoomLastTs=0;wheelZoomGesturing=!1;handledWheelEvents=new WeakSet;wheelBoundsEl=null;trackpadWheelPanEnabled=!0;static pointerCapture={capture:!0};static wheelCapture={passive:!1,capture:!0};constructor(t,e,i){this.camera=t,this.state=e,this.domElement=i,i.style.touchAction="none",i.style.msTouchAction="none",i.addEventListener("pointerdown",this.onPointerDown,ge.pointerCapture),i.addEventListener("pointermove",this.onPointerMove,ge.pointerCapture),i.addEventListener("pointerup",this.onPointerUp,ge.pointerCapture),i.addEventListener("pointercancel",this.onPointerUp,ge.pointerCapture),i.addEventListener("pointerleave",this.onPointerLeave),window.addEventListener("wheel",this.onWindowWheel,ge.wheelCapture),i.addEventListener("wheel",this.onWheel,ge.wheelCapture),window.addEventListener("keydown",this.onZoomKeyDown,!0),i.addEventListener("contextmenu",this.onContextMenu),i.addEventListener("auxclick",this.onAuxClick),window.addEventListener("blur",this.onBlur),window.addEventListener("pointerup",this.onWindowPointerUp)}bothButtons(t){return(t&le.Left)!==0&&(t&le.Right)!==0}getAspect(){const t=this.wheelBoundsEl??this.domElement,e=t.clientWidth||this.domElement.clientWidth,i=t.clientHeight||this.domElement.clientHeight;return e/Math.max(i,1)}syncCamera(t=!0){pe(this.camera,this.state,this.getAspect(),this.pivot),t&&this.onChange?.()}getContentBox(){return this.contentBoxProvider?.()}setContentBoxProvider(t){this.contentBoxProvider=t}setPanBoundsEnabled(t){this.panBoundsEnabled=t}setZoomClampEnabled(t){this.zoomClampEnabled=t}clampPanIfNeeded(){if(!this.panBoundsEnabled)return;const t=this.getContentBox();!t||t.isEmpty()||z_(this.state,this.camera,t,this.getAspect(),this.pivot)}applyClampedZoom(t){if(this.zoomClampEnabled){this.state.zoom=nh(t,this.state,this.getContentBox(),this.domElement.clientHeight);return}this.state.zoom=Math.max(t,1e-8)}setWheelBoundsElement(t){this.wheelBoundsEl&&this.wheelBoundsEl!==this.domElement&&this.wheelBoundsEl.removeEventListener("wheel",this.onWheel,ge.wheelCapture),this.wheelBoundsEl=t,t&&t!==this.domElement&&(t.style.touchAction="none",t.addEventListener("wheel",this.onWheel,ge.wheelCapture))}setGestureHooks(t){this.gestureHooks=t}notifyGestureBegin(){this.gestureHooks.onBegin?.()}notifyGestureMove(){this.gestureHooks.onMove?.()}notifyGestureEnd(){this.gestureHooks.onEnd?.()}resolveGestureMode(t){return this.gestureMode==="pan"||this.leftEverInGesture?this.bothButtons(t)||this.middleButtonPanActive(t)||this.gestureMode==="pan"?"pan":"none":this.bothButtons(t)||this.middleButtonPanActive(t)?"pan":(t&le.Right)!==0&&this.rightButtonOrbitEnabled?(t&le.Left)!==0?"pan":"orbit":this.leftButtonOrbitEnabled&&(t&le.Left)!==0?"orbit":"none"}canPanWithButtons(t){return this.bothButtons(t)||this.middleButtonPanActive(t)}middleButtonPanActive(t){return this.middleButtonPanEnabled&&(t&le.Middle)!==0}dragThresholdForCurrentGesture(){return(this.pressedButtons&le.Middle)!==0&&!this.bothButtons(this.pressedButtons)?Br:Nr}canOrbitNow(){return this.leftEverInGesture||this.gestureMode==="pan"?!1:!this.bothButtons(this.pressedButtons)}clearRotationAtRmbDown(){this.rotationAtRmbDown=null}releaseActivePointerCapture(){if(this.activePointerId!==null){try{this.domElement.hasPointerCapture(this.activePointerId)&&this.domElement.releasePointerCapture(this.activePointerId)}catch{}this.activePointerId=null}}syncPressedButtonsFromEvent(t){if(t===0){this.pressedButtons=0;return}this.pressedButtons=t,this.rightButtonOrbitEnabled||(this.pressedButtons&=-3)}clearGestureIfButtonsReleased(t){return t.buttons!==0?!1:((this.pressedButtons!==0||this.isDragging||this.gestureMode!=="none")&&(this.resetPointerState(),this.releaseActivePointerCapture()),!0)}onPointerDown=t=>{if(!this.interactionEnabled||mc()||q_(t.target))return;if(this.touchNavigationEnabled&&t.pointerType==="touch"){this.handleTouchPointerDown(t);return}if(!this.touchNavigationEnabled&&t.pointerType==="touch"){this.handleDesktopTouchDown(t);return}if(t.button===2&&!this.rightButtonOrbitEnabled)return;this.pivotPanAnim&&this.cancelPivotPanAnim();const e=Ac[t.button]??0;if(this.pressedButtons=t.buttons|e,this.rightButtonOrbitEnabled||(this.pressedButtons&=-3),t.button===0&&this.bothButtons(this.pressedButtons)&&(this.leftEverInGesture=!0,this.rotationAtRmbDown&&(this.state.rotation.copy(this.rotationAtRmbDown),this.syncCamera())),t.button===2&&(this.rotationAtRmbDown=this.state.rotation.clone(),(this.pressedButtons&le.Left)!==0&&(this.leftEverInGesture=!0)),this.canPanWithButtons(this.pressedButtons)){const i=this.gestureMode!=="pan";this.gestureMode="pan",this.rotationAtRmbDown&&this.bothButtons(this.pressedButtons)&&(this.state.rotation.copy(this.rotationAtRmbDown),this.syncCamera()),this.panRotationLock||(this.panRotationLock=this.state.rotation.clone()),i&&(this.lastX=t.clientX,this.lastY=t.clientY,this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.isDragging=!1)}else this.gestureMode==="none"&&((this.pressedButtons&le.Right)!==0&&(this.pressedButtons&le.Left)===0&&!this.leftEverInGesture||this.leftButtonOrbitEnabled&&(this.pressedButtons&le.Left)!==0&&(this.pressedButtons&le.Right)===0)&&(this.gestureMode="orbit");if(this.resolveGestureMode(this.pressedButtons)!=="none"){this.lastX=t.clientX,this.lastY=t.clientY,this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.isDragging=!1,this.suppressContextMenu=!1,this.middleClickHandledByPointerUp=!1,this.activePointerId=t.pointerId;try{this.domElement.setPointerCapture(t.pointerId)}catch{}}};onPointerMove=t=>{if(!this.interactionEnabled)return;if(mc()){(this.isDragging||this.touchMode!=="none"||this.gestureMode!=="none")&&this.cancelActiveGestures();return}if(this.touchNavigationEnabled&&this.touchMode!=="none"){this.handleTouchPointerMove(t);return}if(!this.touchNavigationEnabled&&t.pointerType==="touch"){this.handleDesktopTouchMove(t);return}if(this.clearGestureIfButtonsReleased(t))return;this.syncPressedButtonsFromEvent(t.buttons);const e=this.resolveGestureMode(this.pressedButtons);if(e==="none")return;if(e==="pan"&&this.gestureMode!=="pan"){this.gestureMode="pan",this.panRotationLock=this.state.rotation.clone(),this.lastX=t.clientX,this.lastY=t.clientY,this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.isDragging=!1;return}const i=t.clientX,s=t.clientY;if(!this.isDragging){const a=i-this.dragStartX,c=s-this.dragStartY,l=this.dragThresholdForCurrentGesture();if(Math.abs(a)<=l&&Math.abs(c)<=l)return;this.notifyGestureBegin(),this.isDragging=!0,this.suppressContextMenu=!0}const r=i-this.lastX,o=s-this.lastY;if(!(r===0&&o===0)){if(e==="pan"){if(!this.canPanWithButtons(this.pressedButtons))return;const a=this.domElement.clientWidth,c=this.domElement.clientHeight;Sn(this.state,this.camera,r,o,a,c,this.pivot),this.clampPanIfNeeded(),this.panRotationLock&&this.state.rotation.copy(this.panRotationLock),this.syncCamera(),this.notifyGestureMove(),this.lastX=i,this.lastY=s;return}if(e==="orbit"){const a=this.leftButtonOrbitEnabled&&(this.pressedButtons&le.Left)!==0&&(this.pressedButtons&le.Right)===0,c=(this.pressedButtons&le.Right)!==0;if(!a&&!c){this.lastX=i,this.lastY=s;return}if(this.bothButtons(this.pressedButtons)||!this.canOrbitNow()){this.lastX=i,this.lastY=s;return}ws(this.state,this.camera,r,o,Or,this.getAspect(),this.pivot),this.syncCamera(),this.notifyGestureMove(),this.lastX=i,this.lastY=s}}};onPointerUp=t=>{if(this.touchNavigationEnabled&&t.pointerType==="touch"){this.handleTouchPointerUp(t);return}if(!this.touchNavigationEnabled&&t.pointerType==="touch"){this.handleDesktopTouchUp(t);return}const e=this.pressedButtons,i=t.button===1&&(e&le.Middle)!==0&&!this.isDragging,s=Ac[t.button]??0;this.pressedButtons=t.buttons!==0?t.buttons:this.pressedButtons&~s,this.rightButtonOrbitEnabled||(this.pressedButtons&=-3),i&&(this.middleClickHandledByPointerUp=!0,this.onMiddleClick(t.clientX,t.clientY,{shift:t.shiftKey,ctrl:t.ctrlKey})),this.pressedButtons===0&&(this.isDragging&&this.notifyGestureEnd(),this.gestureMode="none",this.leftEverInGesture=!1,this.panRotationLock=null,this.clearRotationAtRmbDown(),this.isDragging=!1,this.releaseActivePointerCapture())};onWindowPointerUp=t=>{const e=t.target;(!(e instanceof Node)||!this.domElement.contains(e))&&this.onPointerUp(t)};onWindowWheel=t=>{!(t.ctrlKey||t.metaKey||t.altKey)&&!this.isWheelOverViewport(t)||this.onWheel(t)};isWheelOverViewport(t){const e=typeof t.composedPath=="function"?t.composedPath():[];for(const r of e)if(r instanceof Element&&r.closest(ah))return!1;const i=this.wheelBoundsEl??this.domElement;if(e.includes(this.domElement)||e.includes(i))return!0;const s=i.getBoundingClientRect();return t.clientX>=s.left&&t.clientX<=s.right&&t.clientY>=s.top&&t.clientY<=s.bottom}onZoomKeyDown=t=>{(t.ctrlKey||t.metaKey)&&(t.key==="+"||t.key==="-"||t.key==="="||t.key==="_"||t.code==="NumpadAdd"||t.code==="NumpadSubtract")&&t.preventDefault()};onWheel=t=>{if(this.handledWheelEvents.has(t))return;if(this.handledWheelEvents.add(t),t.shiftKey&&!(t.ctrlKey||t.metaKey||t.altKey)){this.stopWheelZoomSmoothing(),t.preventDefault();return}t.preventDefault();const e=performance.now();e-this.wheelGestureAt>tv&&(this.wheelGesture="none"),this.wheelGestureAt=e;const i=t.ctrlKey||t.metaKey||t.altKey,s=this.trackpadWheelPanEnabled&&!i&&rv(t.deltaX,t.deltaY,t.deltaMode),r=ch(t.deltaX,t.deltaY,t.deltaMode),o=this.wheelGesture==="pan"&&!i&&e-this.wheelPanLastXAt<As;if(s||o?this.wheelGesture="pan":(i||r)&&(this.wheelGesture="zoom"),i||r&&!o||!s&&!o){const u=Cs(t.deltaY,t.deltaMode,{pinch:i,pixelBoost:i}),d=Cs(t.deltaX,t.deltaMode,{pinch:i,pixelBoost:i}),m=Math.abs(u)>=Math.abs(d)?u:d;if(m===0)return;let g=t.clientX,_=t.clientY;if(i&&!this.isWheelOverViewport(t)){const p=this.domElement.getBoundingClientRect();g=p.left+p.width*.5,_=p.top+p.height*.5}this.queueWheelZoom(m,g,_,i);return}this.stopWheelZoomSmoothing();const a=Cs(t.deltaX,t.deltaMode,{pinch:!1}),c=Cs(t.deltaY,t.deltaMode,{pinch:!1});e-this.wheelPanLastAt>As&&(this.wheelPanLastX=0,this.wheelPanLastY=0),this.wheelPanLastAt=e;const l=Math.abs(a)>=.01?-a:0,h=Math.abs(c)>=.01?-c:0;Math.abs(l)>=.01&&(this.wheelPanLastX=l,this.wheelPanLastXAt=e),Math.abs(h)>=.01&&(this.wheelPanLastY=h,this.wheelPanLastYAt=e),!(Math.abs(l)<.01&&Math.abs(h)<.01)&&this.queueWheelPan(l,h)};queueWheelPan(t,e){this.wheelPanAccumX+=t,this.wheelPanAccumY+=e,!this.wheelPanRaf&&(this.wheelPanRaf=requestAnimationFrame(()=>{this.wheelPanRaf=0;let i=this.wheelPanAccumX,s=this.wheelPanAccumY;this.wheelPanAccumX=0,this.wheelPanAccumY=0;const r=performance.now();if(Math.abs(i)>=.5&&Math.abs(s)<.5&&r-this.wheelPanLastYAt<As&&(s+=this.wheelPanLastY),Math.abs(s)>=.5&&Math.abs(i)<.5&&r-this.wheelPanLastXAt<As&&(i+=this.wheelPanLastX),Math.abs(i)<1e-6&&Math.abs(s)<1e-6)return;const o=this.domElement.clientWidth,a=this.domElement.clientHeight;this.notifyGestureBegin(),Sn(this.state,this.camera,i,s,o,a,this.pivot),this.clampPanIfNeeded(),this.syncCamera(),this.notifyGestureMove(),this.notifyGestureEnd()}))}softenWheelZoomDelta(t,e){if(e)return t;const i=Math.abs(t);if(i<1e-6)return 0;if(i<48)return Math.sign(t)*Math.min(i*.55,Rc);const s=i>=80?100:48,r=i/s*K_;return Math.sign(t)*Math.min(r,Rc)}stopWheelZoomSmoothing(){this.wheelZoomRaf&&(cancelAnimationFrame(this.wheelZoomRaf),this.wheelZoomRaf=0),this.wheelZoomAccum=0,this.wheelZoomGesturing&&(this.wheelZoomGesturing=!1,this.notifyGestureEnd())}queueWheelZoom(t,e,i,s=!1){const r=this.softenWheelZoomDelta(t,s);if(r===0)return;if(!s){this.stopWheelZoomSmoothing(),this.dolly(r,e,i);return}if(this.wheelZoomAccum+=r,Math.abs(this.wheelZoomAccum)>Pc&&(this.wheelZoomAccum=Math.sign(this.wheelZoomAccum)*Pc),this.wheelZoomClientX=e,this.wheelZoomClientY=i,this.wheelZoomRaf)return;this.wheelZoomGesturing||(this.wheelZoomGesturing=!0,this.notifyGestureBegin()),this.wheelZoomLastTs=performance.now();const o=()=>{const a=performance.now(),c=Math.min(32,Math.max(8,a-this.wheelZoomLastTs));this.wheelZoomLastTs=a;const l=Math.max(.45,1-Math.exp(-c/j_)),h=this.wheelZoomAccum*l;if(this.wheelZoomAccum-=h,Math.abs(h)>=.04&&this.dolly(h,this.wheelZoomClientX,this.wheelZoomClientY,!0),Math.abs(this.wheelZoomAccum)<.2){this.wheelZoomAccum=0,this.wheelZoomRaf=0,this.wheelZoomGesturing=!1,this.notifyGestureEnd();return}this.wheelZoomRaf=requestAnimationFrame(o)};this.wheelZoomRaf=requestAnimationFrame(o)}onContextMenu=t=>{t.preventDefault()};onBlur=()=>{this.resetPointerState(),this.resetTouchState(),this.resetDesktopTouchState(),this.wheelGesture="none",this.isDragging=!1};onPointerLeave=t=>{if(this.isDragging||this.gestureMode!=="none")try{if(this.domElement.hasPointerCapture(t.pointerId))return}catch{}t.buttons===0&&this.resetPointerState()};onAuxClick=t=>{if(!(t.button!==1||this.isDragging)){if(this.middleClickHandledByPointerUp){this.middleClickHandledByPointerUp=!1;return}t.preventDefault(),this.onMiddleClick(t.clientX,t.clientY,{shift:t.shiftKey,ctrl:t.ctrlKey})}};resetPointerState(){(this.isDragging||this.gestureMode!=="none")&&this.notifyGestureEnd(),this.pressedButtons=0,this.gestureMode="none",this.leftEverInGesture=!1,this.panRotationLock=null,this.clearRotationAtRmbDown(),this.isDragging=!1,this.releaseActivePointerCapture()}setPivotPickHandler(t){this.pivotPickHandler=t}setMiddleClickHandler(t){this.middleClickHandler=t}setOnPivotChanged(t){this.onPivotChanged=t}setOnPivotPicked(t){this.onPivotPicked=t}setOnChange(t){this.onChange=t}setRightButtonOrbitEnabled(t){this.rightButtonOrbitEnabled=t,t||this.resetPointerState()}setLeftButtonOrbitEnabled(t){this.leftButtonOrbitEnabled=t}setMiddleButtonPanEnabled(t){this.middleButtonPanEnabled=t}setTrackpadWheelPanEnabled(t){this.trackpadWheelPanEnabled=t}setInteractionEnabled(t){this.interactionEnabled=t,t||(this.resetPointerState(),this.resetTouchState(),this.resetDesktopTouchState())}cancelActiveGestures(){(this.isDragging||this.gestureMode!=="none"||this.touchMode!=="none")&&this.isDragging&&this.notifyGestureEnd(),this.pressedButtons=0,this.gestureMode="none",this.leftEverInGesture=!1,this.panRotationLock=null,this.clearRotationAtRmbDown(),this.isDragging=!1,this.releaseActivePointerCapture(),this.resetTouchState(),this.resetDesktopTouchState()}setTouchNavigationEnabled(t){this.touchNavigationEnabled=t,t||(this.resetTouchState(),this.resetDesktopTouchState())}setDesktopOneFingerOrbitEnabled(t){this.desktopOneFingerOrbitEnabled=t,!t&&this.desktopOneFingerMode==="orbit"&&(this.desktopOneFingerMode="none",this.desktopTouchPointers.clear())}isTouchNavigationEnabled(){return this.touchNavigationEnabled}resetTouchState(){this.touchMode="none",this.touchPointers.clear(),this.touchPinchStartDistance=0,this.touchPinchStartZoom=1,this.touchPanLastCenter=null}resetDesktopTouchState(){this.desktopTwoFingerPinchRaf&&(cancelAnimationFrame(this.desktopTwoFingerPinchRaf),this.desktopTwoFingerPinchRaf=0),this.desktopTouchPointers.clear(),this.desktopThreeFingerMode="none",this.desktopTwoFingerMode="none",this.desktopOneFingerMode="none",this.desktopTouchDragged=!1,this.desktopPinchStartDistance=0,this.desktopPinchStartZoom=1,this.desktopPinchZoomArmed=!1}scheduleDesktopTwoFingerPinchEval(){this.desktopTwoFingerPinchRaf||(this.desktopTwoFingerPinchRaf=requestAnimationFrame(()=>{this.desktopTwoFingerPinchRaf=0,this.applyDesktopTwoFingerPinchZoom()}))}applyDesktopTwoFingerPinchZoom(){if(this.desktopTwoFingerMode!=="pinch"||this.desktopTouchPointers.size!==2)return;const t=this.desktopTouchPointerDistance();if(t<.001||this.desktopPinchStartDistance<.001)return;if(!this.desktopPinchZoomArmed){if(Math.abs(t-this.desktopPinchStartDistance)<$_)return;this.desktopPinchZoomArmed=!0}const e=t/this.desktopPinchStartDistance;this.applyClampedZoom(this.desktopPinchStartZoom*e),this.syncCamera(),this.notifyGestureMove()}readDesktopTouchCenter(){const t=[...this.desktopTouchPointers.values()];if(t.length===0)return{x:0,y:0};let e=0,i=0;for(const s of t)e+=s.x,i+=s.y;return{x:e/t.length,y:i/t.length}}desktopTouchPointerDistance(){const t=[...this.desktopTouchPointers.values()];return t.length<2?0:Math.hypot(t[1].x-t[0].x,t[1].y-t[0].y)}beginDesktopThreeFinger(t){const e=this.readDesktopTouchCenter();this.desktopTwoFingerMode="none",this.desktopThreeFingerMode="pending",this.desktopTouchDragged=!1,this.desktopTouchStartCenter=e,this.desktopTouchLastCenter=e,this.desktopTouchModifiers={shift:t.shiftKey,ctrl:t.ctrlKey},this.panRotationLock||(this.panRotationLock=this.state.rotation.clone())}beginDesktopTwoFinger(){const t=this.desktopTouchPointerDistance();if(t<.001)return;this.desktopThreeFingerMode="none",this.desktopTwoFingerMode="pinch",this.desktopPinchStartDistance=t,this.desktopPinchStartZoom=this.state.zoom,this.desktopPinchZoomArmed=!1;const e=this.readDesktopTouchCenter();this.desktopTouchStartCenter=e,this.desktopTouchLastCenter=e,this.panRotationLock||(this.panRotationLock=this.state.rotation.clone()),this.notifyGestureBegin(),this.isDragging=!0}handleDesktopTouchDown(t){if(this.desktopTouchPointers.set(t.pointerId,{x:t.clientX,y:t.clientY}),this.desktopTouchPointers.size===1){if(!this.desktopOneFingerOrbitEnabled){this.desktopTouchPointers.delete(t.pointerId),this.desktopOneFingerMode="none";return}t.preventDefault();try{this.domElement.setPointerCapture(t.pointerId)}catch{}this.pivotPanAnim&&this.cancelPivotPanAnim(),this.desktopOneFingerMode="orbit",this.lastX=t.clientX,this.lastY=t.clientY,this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.isDragging=!1;return}if(this.desktopOneFingerMode="none",this.desktopTouchPointers.size===2){t.preventDefault();try{this.domElement.setPointerCapture(t.pointerId)}catch{}this.pivotPanAnim&&this.cancelPivotPanAnim(),this.beginDesktopTwoFinger();return}if(!(this.desktopTouchPointers.size<3)){t.preventDefault();try{this.domElement.setPointerCapture(t.pointerId)}catch{}this.pivotPanAnim&&this.cancelPivotPanAnim(),this.desktopThreeFingerMode==="none"&&this.beginDesktopThreeFinger(t)}}handleDesktopTouchMove(t){if(!this.desktopTouchPointers.has(t.pointerId))return;if(this.desktopTouchPointers.set(t.pointerId,{x:t.clientX,y:t.clientY}),this.desktopTouchPointers.size===1&&this.desktopOneFingerMode==="orbit"){t.preventDefault();const a=t.clientX,c=t.clientY;if(!this.isDragging){const u=a-this.dragStartX,d=c-this.dragStartY;if(Math.abs(u)<=Nr&&Math.abs(d)<=Nr)return;this.notifyGestureBegin(),this.isDragging=!0}const l=a-this.lastX,h=c-this.lastY;if(l===0&&h===0)return;ws(this.state,this.camera,l,h,Or,this.getAspect(),this.pivot),this.syncCamera(),this.notifyGestureMove(),this.lastX=a,this.lastY=c;return}if(this.desktopTouchPointers.size===2&&this.desktopTwoFingerMode==="pinch"){t.preventDefault();const a=this.readDesktopTouchCenter(),c=a.x-this.desktopTouchLastCenter.x,l=a.y-this.desktopTouchLastCenter.y;if(c!==0||l!==0){const h=this.domElement.clientWidth,u=this.domElement.clientHeight;Sn(this.state,this.camera,c,l,h,u,this.pivot),this.clampPanIfNeeded(),this.panRotationLock&&this.state.rotation.copy(this.panRotationLock),this.syncCamera(),this.notifyGestureMove()}this.desktopTouchLastCenter=a,this.scheduleDesktopTwoFingerPinchEval();return}if(this.desktopTouchPointers.size<3||this.desktopThreeFingerMode==="none")return;t.preventDefault();const e=this.readDesktopTouchCenter();if(this.desktopThreeFingerMode==="pending"){const a=e.x-this.desktopTouchStartCenter.x,c=e.y-this.desktopTouchStartCenter.y;if(Math.abs(a)<=Br&&Math.abs(c)<=Br){this.desktopTouchLastCenter=e;return}this.desktopThreeFingerMode="pan",this.desktopTouchDragged=!0,this.notifyGestureBegin(),this.isDragging=!0,this.desktopTouchLastCenter=e;return}const i=e.x-this.desktopTouchLastCenter.x,s=e.y-this.desktopTouchLastCenter.y;if(i===0&&s===0)return;const r=this.domElement.clientWidth,o=this.domElement.clientHeight;Sn(this.state,this.camera,i,s,r,o,this.pivot),this.clampPanIfNeeded(),this.panRotationLock&&this.state.rotation.copy(this.panRotationLock),this.syncCamera(),this.notifyGestureMove(),this.desktopTouchLastCenter=e}handleDesktopTouchUp(t){const e=this.desktopThreeFingerMode!=="none",i=this.desktopTwoFingerMode!=="none",s=this.desktopOneFingerMode==="orbit",r=this.desktopTouchDragged||i,o=this.readDesktopTouchCenter(),a=this.desktopTouchModifiers;this.desktopTouchPointers.delete(t.pointerId);try{this.domElement.hasPointerCapture(t.pointerId)&&this.domElement.releasePointerCapture(t.pointerId)}catch{}if(!(this.desktopTouchPointers.size>=3)){if(s&&this.desktopTouchPointers.size===0&&!i&&!e){this.isDragging&&this.notifyGestureEnd(),this.isDragging=!1,this.resetDesktopTouchState();return}if(this.desktopTouchPointers.size===2&&!e){this.beginDesktopTwoFinger();return}if(e&&this.desktopTouchPointers.size===0){r&&this.desktopThreeFingerMode==="pan"?this.notifyGestureEnd():r||this.onMiddleClick(o.x,o.y,a),this.isDragging=!1,this.panRotationLock=null,this.resetDesktopTouchState();return}if(i&&this.desktopTouchPointers.size<2){this.notifyGestureEnd(),this.isDragging=!1,this.desktopTwoFingerMode="none",this.desktopTouchPointers.size===0&&(this.panRotationLock=null,this.resetDesktopTouchState());return}this.desktopTouchPointers.size<3&&(e&&r&&(this.notifyGestureEnd(),this.isDragging=!1),this.desktopThreeFingerMode="none",this.desktopTouchDragged=!1,this.desktopTouchPointers.size===0&&(this.panRotationLock=null,this.resetDesktopTouchState()))}}touchPointerDistance(){const t=[...this.touchPointers.values()];return t.length<2?0:Math.hypot(t[1].x-t[0].x,t[1].y-t[0].y)}readTouchPointerCenter(){const t=[...this.touchPointers.values()];return t.length===0?{x:0,y:0}:t.length===1?{x:t[0].x,y:t[0].y}:{x:(t[0].x+t[1].x)*.5,y:(t[0].y+t[1].y)*.5}}isTouchNearViewportEdge(t,e){const i=this.domElement.getBoundingClientRect(),s=64;return t-i.left<=s||i.right-t<=s||e-i.top<=s||i.bottom-e<=s}beginTouchPinch(){const t=this.touchPointerDistance();if(t<.001)return;this.touchMode="pinch",this.touchPinchStartDistance=t,this.touchPinchStartZoom=this.state.zoom;const e=this.readTouchPointerCenter();this.touchPinchCenterX=e.x,this.touchPinchCenterY=e.y,this.touchPanLastCenter={x:e.x,y:e.y}}handleTouchPointerDown(t){t.preventDefault(),this.pivotPanAnim&&this.cancelPivotPanAnim(),this.touchPointers.set(t.pointerId,{x:t.clientX,y:t.clientY});try{this.domElement.setPointerCapture(t.pointerId)}catch{}if(this.touchPointers.size===1){this.touchMode=this.isTouchNearViewportEdge(t.clientX,t.clientY)?"pan":"orbit",this.lastX=t.clientX,this.lastY=t.clientY,this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.touchPanLastCenter={x:t.clientX,y:t.clientY},this.isDragging=!1;return}this.touchPointers.size>=2&&(this.isDragging||(this.notifyGestureBegin(),this.isDragging=!0),this.beginTouchPinch())}handleTouchPointerMove(t){if(this.touchPointers.has(t.pointerId)){if(t.preventDefault(),this.touchPointers.set(t.pointerId,{x:t.clientX,y:t.clientY}),this.touchMode==="pinch"&&this.touchPointers.size>=2){const e=this.domElement.clientWidth,i=this.domElement.clientHeight;if(e<=0||i<=0)return;const s=this.readTouchPointerCenter();if(this.touchPanLastCenter){const o=s.x-this.touchPanLastCenter.x,a=s.y-this.touchPanLastCenter.y;(Math.abs(o)>.5||Math.abs(a)>.5)&&(Sn(this.state,this.camera,o,a,e,i,this.pivot),this.clampPanIfNeeded())}this.touchPanLastCenter={x:s.x,y:s.y},this.touchPinchCenterX=s.x,this.touchPinchCenterY=s.y;const r=this.touchPointerDistance();if(r>=.001&&this.touchPinchStartDistance>=.001){this.syncCamera();const o=Ur(this.camera,this.state,this.pivot,this.domElement,this.touchPinchCenterX,this.touchPinchCenterY,this.zoomCursorWorldBefore),a=r/this.touchPinchStartDistance,c=this.state.zoom;this.applyClampedZoom(this.touchPinchStartZoom*a),o&&Math.abs(this.state.zoom-c)>1e-6&&Fr(this.state,this.camera,this.pivot,this.domElement,this.touchPinchCenterX,this.touchPinchCenterY,this.zoomCursorWorldBefore),this.clampPanIfNeeded()}this.syncCamera(),this.notifyGestureMove();return}if(this.touchMode==="pan"&&this.touchPointers.size===1){const e=t.clientX,i=t.clientY;if(!this.isDragging){const o=e-this.dragStartX,a=i-this.dragStartY;if(Math.abs(o)<=Ts&&Math.abs(a)<=Ts)return;this.notifyGestureBegin(),this.isDragging=!0}const s=this.domElement.clientWidth,r=this.domElement.clientHeight;if(s>0&&r>0&&this.touchPanLastCenter){const o=e-this.touchPanLastCenter.x,a=i-this.touchPanLastCenter.y;(Math.abs(o)>.5||Math.abs(a)>.5)&&(Sn(this.state,this.camera,o,a,s,r,this.pivot),this.clampPanIfNeeded(),this.syncCamera(),this.notifyGestureMove())}this.touchPanLastCenter={x:e,y:i},this.lastX=e,this.lastY=i;return}if(this.touchMode==="orbit"&&this.touchPointers.size===1){const e=t.clientX,i=t.clientY;if(!this.isDragging){const o=e-this.dragStartX,a=i-this.dragStartY;if(Math.abs(o)<=Ts&&Math.abs(a)<=Ts)return;this.notifyGestureBegin(),this.isDragging=!0}const s=e-this.lastX,r=i-this.lastY;if(s===0&&r===0)return;ws(this.state,this.camera,s,r,Or,this.getAspect(),this.pivot),this.syncCamera(),this.notifyGestureMove(),this.lastX=e,this.lastY=i}}}handleTouchPointerUp(t){t.preventDefault(),this.touchPointers.delete(t.pointerId);try{this.domElement.hasPointerCapture(t.pointerId)&&this.domElement.releasePointerCapture(t.pointerId)}catch{}if(this.touchPointers.size===0){this.isDragging&&this.notifyGestureEnd(),this.resetTouchState(),this.isDragging=!1;return}if(this.touchPointers.size===1&&this.touchMode==="pinch"){const e=[...this.touchPointers.values()][0];this.touchMode="orbit",this.lastX=e.x,this.lastY=e.y,this.dragStartX=e.x,this.dragStartY=e.y,this.isDragging=!1}}isDragGesture(){return this.isDragging}takeContextMenuSuppressed(){const t=this.suppressContextMenu;return this.suppressContextMenu=!1,t}getInteractionMode(){return this.resolveGestureMode(this.pressedButtons)}getPressedButtons(){return this.pressedButtons}setPivot(t){this.pivot.copy(t),this.onPivotChanged?.(this.getPivot())}setPivotKeepingView(t){if(this.pivot.distanceToSquared(t)<1e-12)return;const e=this.domElement.clientWidth,i=this.domElement.clientHeight;if(e<=0||i<=0){this.setPivot(t),this.syncCamera();return}this.cancelPivotPanAnim();const s=this.pivot.clone(),r=this.getAspect();pe(this.camera,this.state,r,s),S_(this.camera,s,this.pivotChangeAnchor),k_(this.state,this.camera,s,t,r,this.pivotChangeAnchor),this.pivot.copy(t),this.syncCamera(),this.onPivotChanged?.(this.getPivot())}getPivot(){return this.pivot.clone()}pivotAtClientPoint(t,e){if(!this.pivotPickHandler)return!1;const i=this.pivotPickHandler(t,e);return i?(this.setPivot(i),this.centerPivotInView(),this.onPivotPicked?.(i.clone()),!0):!1}centerPivotInView(){this.cancelPivotPanAnim();const t=this.getAspect(),e=H_(this.state,this.camera,this.pivot,t,this.pivot);this.pivotPanAnim={startPanX:this.state.panX,startPanY:this.state.panY,targetPanX:e.panX,targetPanY:e.panY,startedAt:performance.now()},this.syncCamera()}tickPivotPanAnim(t=performance.now()){if(!this.pivotPanAnim)return!1;const{targetPanX:e,targetPanY:i,startedAt:s}=this.pivotPanAnim,r=G_((t-s)/W_);return V_(this.state,e,i,r),this.syncCamera(),r>=1?(this.state.panX=e,this.state.panY=i,this.pivotPanAnim=null,this.syncCamera(),!1):!0}isPivotPanAnimating(){return this.pivotPanAnim!==null}cancelPivotPanAnim(){this.pivotPanAnim=null}panByPixels(t,e){const i=this.domElement.clientWidth,s=this.domElement.clientHeight;i<=0||s<=0||(this.cancelPivotPanAnim(),Sn(this.state,this.camera,t,e,i,s,this.pivot),this.clampPanIfNeeded(),this.syncCamera())}applySpaceMouseMotion(t,e,i,s,r,o){const a=this.domElement.clientWidth,c=this.domElement.clientHeight;if(a<=0||c<=0)return;if(this.cancelPivotPanAnim(),(t!==0||e!==0)&&(Sn(this.state,this.camera,t,e,a,c,this.pivot),this.clampPanIfNeeded()),i!==0){this.syncCamera();const h=a*.5,u=c*.5,d=Ur(this.camera,this.state,this.pivot,this.domElement,h,u,this.zoomCursorWorldBefore);Ec(this.state,-i*120,Cc,this.getContentBox(),c,this.zoomClampEnabled),d&&Fr(this.state,this.camera,this.pivot,this.domElement,h,u,this.zoomCursorWorldBefore),this.clampPanIfNeeded()}const l=this.getAspect();if((s!==0||r!==0)&&ws(this.state,this.camera,s,r,1,l,this.pivot),o!==0){const h=new ke().setFromAxisAngle(new P(0,0,1),-o);this.state.rotation.premultiply(h)}this.syncCamera()}update(){this.syncCamera(!1)}dispose(){this.desktopTwoFingerPinchRaf&&(cancelAnimationFrame(this.desktopTwoFingerPinchRaf),this.desktopTwoFingerPinchRaf=0),this.wheelPanRaf&&(cancelAnimationFrame(this.wheelPanRaf),this.wheelPanRaf=0),this.stopWheelZoomSmoothing(),this.domElement.removeEventListener("pointerdown",this.onPointerDown,ge.pointerCapture),this.domElement.removeEventListener("pointermove",this.onPointerMove,ge.pointerCapture),this.domElement.removeEventListener("pointerup",this.onPointerUp,ge.pointerCapture),this.domElement.removeEventListener("pointercancel",this.onPointerUp,ge.pointerCapture),this.domElement.removeEventListener("pointerleave",this.onPointerLeave),window.removeEventListener("wheel",this.onWindowWheel,ge.wheelCapture),this.domElement.removeEventListener("wheel",this.onWheel,ge.wheelCapture),this.wheelBoundsEl&&this.wheelBoundsEl!==this.domElement&&this.wheelBoundsEl.removeEventListener("wheel",this.onWheel,ge.wheelCapture),this.wheelBoundsEl=null,window.removeEventListener("keydown",this.onZoomKeyDown,!0),this.domElement.removeEventListener("contextmenu",this.onContextMenu),this.domElement.removeEventListener("auxclick",this.onAuxClick),window.removeEventListener("blur",this.onBlur),window.removeEventListener("pointerup",this.onWindowPointerUp)}dolly(t,e,i,s=!1){s||this.notifyGestureBegin(),this.syncCamera();const r=Ur(this.camera,this.state,this.pivot,this.domElement,e,i,this.zoomCursorWorldBefore);if(Ec(this.state,t,Cc,this.getContentBox(),this.wheelBoundsEl?.clientHeight||this.domElement.clientHeight,this.zoomClampEnabled),r){Fr(this.state,this.camera,this.pivot,this.domElement,e,i,this.zoomCursorWorldBefore),this.clampPanIfNeeded(),this.syncCamera(),this.notifyGestureMove(),s||this.notifyGestureEnd();return}this.onChange?.(),this.notifyGestureMove(),s||this.notifyGestureEnd()}onMiddleClick(t,e,i){const s=`${Math.round(t)}:${Math.round(e)}:${i.shift?1:0}:${i.ctrl?1:0}`,r=performance.now();(i.shift||i.ctrl)&&r-this.wheelGestureAt<180||s===this.lastMiddleClickSignature&&r-this.lastMiddleClickTime<80||(this.lastMiddleClickSignature=s,this.lastMiddleClickTime=r,!((i.shift||i.ctrl)&&this.middleClickHandler?.(t,e,i))&&this.onPivotClickAt(t,e))}onPivotClickAt(t,e){if(!this.pivotPickHandler)return;const i=this.pivotPickHandler(t,e);i&&(this.setPivot(i),this.centerPivotInView(),this.onPivotPicked?.(i.clone()))}}function ov(n,t,e,i,s=mn,r){rh(t,e,r),pe(n,t,i,s)}function av(n){return n.length>=3&&n[0]===255&&n[1]===216&&n[2]===255}function cv(n){return n.length>=8&&n[0]===137&&n[1]===80&&n[2]===78&&n[3]===71}function lv(n){if(n%4!==0)return null;const t=n/4,e=Math.round(Math.sqrt(t));return e>0&&e*e*4===n?e:null}function kr(n,t){const e=new Uint8Array(n.byteLength);e.set(n);const i=new Blob([e],{type:t}),s=URL.createObjectURL(i);return new Promise((r,o)=>{const a=new Image;a.onload=()=>{URL.revokeObjectURL(s);const c=new Me(a);c.colorSpace=be,c.flipY=!1,c.needsUpdate=!0,r(c)},a.onerror=()=>{URL.revokeObjectURL(s),o(new Error(`exocad photo decode failed (${t})`))},a.src=s})}function hv(n,t){const e=new Ad(n,t,t,Be);return e.colorSpace=be,e.flipY=!0,e.needsUpdate=!0,e}function uv(n){if(av(n))return kr(n,"image/jpeg");if(cv(n))return kr(n,"image/png");const t=lv(n.length);return t!==null?Promise.resolve(hv(n,t)):kr(n,"image/jpeg")}function dv(n,t){const e=n.getAttribute("position");if(!e||e.count===0)return new Float32Array(0);const i=e.count,s=new P(1/0,1/0,1/0),r=new P(-1/0,-1/0,-1/0);for(let y=0;y<i;y+=1)s.x=Math.min(s.x,e.getX(y)),s.y=Math.min(s.y,e.getY(y)),s.z=Math.min(s.z,e.getZ(y)),r.x=Math.max(r.x,e.getX(y)),r.y=Math.max(r.y,e.getY(y)),r.z=Math.max(r.z,e.getZ(y));const o=r.x-s.x,a=r.y-s.y,c=r.z-s.z;let l=2;o<=a&&o<=c?l=0:a<=o&&a<=c&&(l=1);const h=l===0?1:0,u=l===2?1:2,d=s.getComponent(h),m=s.getComponent(u),g=Math.max(r.getComponent(h)-d,1e-6),_=Math.max(r.getComponent(u)-m,1e-6),p=g/_,f=Math.max(t,1e-6),b=new Float32Array(i*2);for(let y=0;y<i;y+=1){let E=(e.getComponent(h,y)-d)/g,L=(e.getComponent(u,y)-m)/_;if(f>p){const T=p/f;E=(E-.5)*T+.5}else if(f<p){const T=f/p;L=(L-.5)*T+.5}b[y*2]=E,b[y*2+1]=L}return b}function fv(n){const t=atob(n),e=new Uint8Array(t.length);for(let i=0;i<t.length;i+=1)e[i]=t.charCodeAt(i);return new Float32Array(e.buffer.slice(0))}function pv(n,t,e,i,s,r){const o=e.getCenter(new P),a=sh(t,n,e,s,r);return i(o),pe(n,t,s,o),a}function mv(n,t,e,i,s){const r=oh(e.view);t.state.rotation.copy(r.rotation),t.state.panX=r.panX,t.state.panY=r.panY,t.state.zoom=r.zoom,t.state.frustumHalfHeight=r.frustumHalfHeight,t.state.near=r.near,t.state.far=r.far,t.state.viewDistance=r.viewDistance;const o=new P(...e.pivot);t.setPivot(o),pe(n,t.state,i,o)}function Dc(n){return n==="Default view"?"Вид по умолчанию":n}const zr={front:"front",back:"back",top:"top",bottom:"bottom",left:"left",right:"right"};function gv(n){const t=n.trim();return t==="Default view"?!0:/умолчан/i.test(t)}function lh(n){if(n.view_preset&&n.view_preset in zr)return zr[n.view_preset]??null;const t=n.label.trim();if(t.startsWith("View ")){const e=t.slice(5).toLowerCase();return zr[e]??null}return gv(t)?"front":null}function _v(n){return lh(n)===null}new pn(new P(-50,-50,-50),new P(50,50,50));const hh=new P(62,48,22),vv=new P(42,58,18),xv=new P(-52,22,38);function Mv(n){return n==="exocad"||n==="d3dHtml"?vv:hh}function Lc(n,t,e){n.color.setHex(16777215),t.color.setHex(16777215),e.color.setHex(16777215),e.groundColor.setHex(16777215)}const yv={ambient:.5,hemisphere:.06,key:.68,fill:.26},Ic={ambient:.5,hemisphere:.06,key:.68,fill:.26},Uc={mesh:yv,exocad:Ic,d3dHtml:Ic};function Fc(n){return 1}const Sv=2.8,uh=.48;function Ci(n,t,e){const i=Ev(n);i.cavityStrength.value=t?e?.strength??Sv:0,i.cavityFloor.value=e?.floor??uh}function Ev(n){const t=n.userData.dentalCavityUniforms;if(t)return t;const e={cavityStrength:{value:0},cavityFloor:{value:uh}};n.userData.dentalCavityUniforms=e,n.userData.dentalCavityAo=!0;const i=n.onBeforeCompile;n.onBeforeCompile=(r,o)=>{typeof i=="function"&&i.call(n,r,o),r.uniforms.cavityStrength=e.cavityStrength,r.uniforms.cavityFloor=e.cavityFloor,r.fragmentShader=r.fragmentShader.replace("#include <common>",`#include <common>
uniform float cavityStrength;
uniform float cavityFloor;`).replace("#include <opaque_fragment>",`if (cavityStrength > 0.001) {
	vec3 pdx = dFdx(vViewPosition);
	vec3 pdy = dFdy(vViewPosition);
	vec3 ndx = dFdx(normal);
	vec3 ndy = dFdy(normal);
	float conc = max(0.0, -dot(ndx, normalize(pdx + vec3(1e-6))) - dot(ndy, normalize(pdy + vec3(1e-6))));
	outgoingLight *= mix(1.0, cavityFloor, saturate(conc * cavityStrength));
}
#include <opaque_fragment>`)};const s=n.customProgramCacheKey.bind(n);return n.customProgramCacheKey=()=>`${s()}|dental-cavity-ao|flat=${n.flatShading?1:0}`,n.needsUpdate=!0,e}const bv=657930,wv=22,Tv=0,Av=1,Hr=0;function dh(n,t){fh(n,t),Ci(n,!0)}function fh(n,t){n.vertexColors=!1,n.toneMapped=!1,typeof t=="number"?n.color.setHex(t):n.color.copy(t),n.emissive.setRGB(0,0,0),n.specular.setHex(bv),n.shininess=wv,Ci(n,!1),n.needsUpdate=!0}function ph(n){n.vertexColors=!0,n.toneMapped=!1,n.color.setHex(16777215),n.emissive.setRGB(Hr,Hr,Hr),n.specular.setHex(Tv),n.shininess=Av,Ci(n,!0),n.needsUpdate=!0}function Cv(n){const t=n.opacity??1,e=t>.999,i=n.vertexColors===!0,s=new Uo({color:16777215,flatShading:n.flatShading??!0,side:Ye,vertexColors:i,transparent:!e,opacity:t,depthWrite:e,toneMapped:!1});return i?ph(s):fh(s,n.solidColor??15124648),s}const ji=1e6;function mh(n){return n==="intersectionsOnly"?1:n==="proximity"?2:0}function gh(n,t){const e=n,i={uContactsScaleMin:{value:t.scaleMinMm},uContactsScaleMax:{value:t.scaleMaxMm},uContactsMode:{value:mh(t.mode)},uContactsActive:{value:1},uRangeActive:{value:0},uRangeMap:{value:null},uRangeView:{value:new Zt},uRangeProj:{value:new Zt},uRangeTexel:{value:new Ht(1/320,1/320)}};e.userData.contactsDistanceShader=!0,e.userData.contactsDistanceUniforms=i,e.onBeforeCompile=s=>{Object.assign(s.uniforms,i),s.vertexShader=s.vertexShader.replace("#include <common>",`#include <common>
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
vContactsWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`),s.fragmentShader=s.fragmentShader.replace("#include <common>",`#include <common>
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
`)},e.needsUpdate=!0}function Vr(n,t,e,i,s){const o=n.userData.contactsDistanceUniforms;if(!o)return;o.uRangeActive.value=0,o.uRangeMap.value=e,o.uRangeView.value.copy(i),o.uRangeProj.value.copy(s),o.uRangeTexel||(o.uRangeTexel={value:new Ht(1/320,1/320)}),o.uRangeTexel.value.set(1/320,1/320)}function Rv(n,t){const i=n.userData.contactsDistanceUniforms;if(!i){gh(n,t);return}i.uContactsScaleMin.value=t.scaleMinMm,i.uContactsScaleMax.value=t.scaleMaxMm,i.uContactsMode.value=mh(t.mode),i.uContactsActive.value=1}function Nc(n){const t=n;t.userData.contactsDistanceShader&&(delete t.userData.contactsDistanceShader,delete t.userData.contactsDistanceUniforms,t.onBeforeCompile=()=>{},t.needsUpdate=!0)}const Pv=1396912964,Dv=1,Bs=32767,Lv=.001,Iv=1;function Uv(n){return n===Bs?ji:n*Lv}function Os(n){n.fill(ji)}function Fv(n,t){return n>=ji*.5?t:t>=ji*.5||n<t?n:t}function Bc(n,t){let e=0,i=0;for(;t.i<n.length;){const s=n[t.i];if(t.i+=1,e|=(s&127)<<i,(s&128)===0)return e>>>0;i+=7}return e>>>0}class Nv{vertexCount;frameCount;frames;state;cursor=-1;constructor(t){if(t.length<16)throw new Error("contacts sparse: too short");const e=new DataView(t.buffer,t.byteOffset,t.byteLength);if(e.getUint32(0,!0)!==Pv)throw new Error("contacts sparse: bad magic");if(e.getUint16(4,!0)!==Dv)throw new Error("contacts sparse: bad version");this.vertexCount=e.getUint32(6,!0),this.frameCount=e.getUint32(12,!0),this.state=new Int16Array(this.vertexCount),this.state.fill(Bs),this.frames=[];const i={i:16};for(let s=0;s<this.frameCount;s+=1){const r=t[i.i]??0;i.i+=1;const o=Bc(t,i),a=new Array(o);let c=0;for(let h=0;h<o;h+=1)c+=Bc(t,i),a[h]=c;const l=new Int16Array(o);for(let h=0;h<o;h+=1){const u=t[i.i]??0,d=t[i.i+1]??0;i.i+=2;let m=d<<8|u;m>=32768&&(m-=65536),l[h]=m}this.frames.push({keyframe:(r&Iv)!==0,indices:a,values:l})}}applyFrame(t,e){const i=Math.max(0,Math.min(this.frameCount-1,t));if(this.frameCount===0||e.length<this.vertexCount){Os(e);return}for(i<this.cursor&&(this.state.fill(Bs),this.cursor=-1);this.cursor<i;){this.cursor+=1;const s=this.frames[this.cursor];s.keyframe&&this.state.fill(Bs);for(let r=0;r<s.indices.length;r+=1)this.state[s.indices[r]]=s.values[r]}for(let s=0;s<this.vertexCount;s+=1)e[s]=Uv(this.state[s])}}function Bv(n,t){const e=Math.min(n.length,t.length);for(let i=0;i<e;i+=1)n[i]=Fv(n[i],t[i])}function Ov(n){return n.length>=2&&n[0]===31&&n[1]===139}function Oc(n){const t=atob(n),e=new Uint8Array(t.length);for(let i=0;i<t.length;i+=1)e[i]=t.charCodeAt(i);return e}async function kc(n){if(!Ov(n))return n;if(typeof DecompressionStream>"u")throw new Error("contacts sparse: no DecompressionStream");const t=new Blob([n]).stream().pipeThrough(new DecompressionStream("gzip"));return new Uint8Array(await new Response(t).arrayBuffer())}function zc(n){return new Nv(n)}const _h=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];function kv(n){if(!n||n.length!==16)return[..._h];const t=Math.abs(n[12]??0)+Math.abs(n[13]??0)+Math.abs(n[14]??0);return Math.abs(n[3]??0)+Math.abs(n[7]??0)+Math.abs(n[11]??0)<=t+1e-8?[...n]:[n[0],n[4],n[8],n[12],n[1],n[5],n[9],n[13],n[2],n[6],n[10],n[14],n[3],n[7],n[11],n[15]]}function zv(n,t){const e=new Array(16);for(let i=0;i<4;i+=1)for(let s=0;s<4;s+=1){let r=0;for(let o=0;o<4;o+=1)r+=(n[o*4+s]??0)*(t[i*4+o]??0);e[i*4+s]=r}return e}function Hv(n){if(n.length!==16)return[..._h];const t=n[0]??1,e=n[1]??0,i=n[2]??0,s=n[4]??0,r=n[5]??1,o=n[6]??0,a=n[8]??0,c=n[9]??0,l=n[10]??1,h=n[12]??0,u=n[13]??0,d=n[14]??0;return[t,s,a,0,e,r,c,0,i,o,l,0,-(t*h+e*u+i*d),-(s*h+r*u+o*d),-(a*h+c*u+l*d),1]}function Vv(n){const t=n.toLowerCase();if(t.includes("18-...-28")||t.includes("18-…-28")||t.includes("зубы 18")||t.includes("зубы 11"))return"upper";if(t.includes("38-...-48")||t.includes("38-…-48")||t.includes("зубы 38")||t.includes("зубы 31"))return"lower";if(t.includes("вчч")||t.includes("верхн")||t.includes("maxilla")||t.includes("maxillary"))return"upper";if(t.includes("нчч")||t.includes("нижн")||t.includes("mandib"))return"lower";const e=n.match(/^(\d{1,2})\s*[:.]/)??n.match(/зубы?\s+(\d{1,2})/i)??n.match(/\btooth\s+(\d{1,2})\b/i);if(e){const i=Number(e[1]),s=Math.floor(i/10);if(s===1||s===2)return"upper";if(s===3||s===4)return"lower"}return/\bupper\b/.test(t)?"upper":/\blower\b/.test(t)?"lower":null}function Gv(n){const t=(n.name||"").toLowerCase(),e=n.buffers?.triangle_count??0;return t.includes("исходник")||t.includes("исходный")||t.includes("3d-объект визуализации")||t.includes("3d visualization object")||t.includes("visualization object")||t.includes("вирт. оттиск")||t.includes("virtual imprint")||n.visible===!1?!0:e>=2e6}function ia(n){return n.jaw==="upper"||n.jaw==="lower"?n.jaw:Vv(n.name)}const Oi='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',ki='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',wn='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>',Wi='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';function Hc(n){const t=n.indexOf(" - ");return t<=0||t+3>=n.length?null:{prefix:n.slice(0,t).trim(),suffix:n.slice(t+3).trim()}}function Vc(n,t){const e=new Map,i=[];for(const o of n){const a=t(o);if(!a){i.push(o);continue}const c=e.get(a);c?c.push(o):e.set(a,[o])}if(![...e.values()].some(o=>o.length>=2))return null;const r=[];for(const[o,a]of e)a.length>=2?r.push({kind:"group",id:`g:${o}`,label:o,meshes:a}):a[0]&&r.push({kind:"mesh",mesh:a[0]});for(const o of i)r.push({kind:"mesh",mesh:o});return r}function vh(n){const t=[],e=[],i=[];for(const r of n){const o=ia(r);o==="upper"?t.push(r):o==="lower"?e.push(r):i.push(r)}if(t.length===0&&e.length===0)return null;const s=[];t.length>0&&s.push({kind:"group",id:"g:upper",label:"Верхняя челюсть",meshes:t}),e.length>0&&s.push({kind:"group",id:"g:lower",label:"Нижняя челюсть",meshes:e});for(const r of i)s.push({kind:"mesh",mesh:r});return s}function Js(n,t){n?.closest(".mesh-panel__op-track")?.style.setProperty("--op",String(t))}function Wv(n,t){document.querySelectorAll(`[data-op="${CSS.escape(n)}"]`).forEach(e=>{e.value=String(t),Js(e,t)}),document.querySelectorAll(`[data-mesh-id="${CSS.escape(n)}"]`).forEach(e=>{const i=e.closest(".mesh-panel__group");if(!i)return;const s=i.querySelectorAll("[data-op]");let r=0,o=0;s.forEach(l=>{r+=Number(l.value),o+=1});const a=o>0?r/o:t,c=i.querySelector("[data-group-op]");c&&(c.value=String(a),Js(c,a))})}function Xv(n){return n.map(t=>{if(t.kind!=="group"||t.children?.length)return t;const e=vh(t.meshes);return!e||!e.some(i=>i.kind==="group")?t:{...t,children:e}})}function Yv(n,t){const e=new Map(t.map(s=>[s.id,s])),i=s=>{if(s.kind==="mesh"){const a=e.get(s.mesh_id);return a?{kind:"mesh",mesh:a}:null}const r=s.mesh_ids.map(a=>e.get(a)).filter(a=>a!=null),o=(s.children??[]).map(i).filter(a=>a!=null);return{kind:"group",id:s.id,label:s.label,meshes:r,children:o.length>0?o:void 0}};return n.nodes.map(i).filter(s=>s!=null)}function qv(n,t){if(t&&t.nodes.length>0)return Yv(t,n);const e=Vc(n,i=>Hc(i.name)?.suffix??null)??Vc(n,i=>Hc(i.name)?.prefix??null);return e?Xv(e):vh(n)??n.map(i=>({kind:"mesh",mesh:i}))}function xh(n,t,e,i){n.replaceChildren();const s=n.closest(".mesh-panel, .mobile-sheet"),r=qv(e.meshes,e.object_tree),o=r.some(g=>g.kind==="group");s?.classList.toggle("mesh-panel--grouped",o),n.classList.toggle("mesh-panel__list--grouped",o);const a=new Set,c=()=>{const g=document.getElementById(i.visibilityAll);if(!g)return;const _=t.allMeshesHidden();g.classList.toggle("mesh-panel__visibility-all--hidden",_),g.innerHTML=_?ki:Oi},l=()=>r.filter(g=>g.kind==="group").every(g=>a.has(g.id)),h=()=>{const g=document.getElementById(i.collapseAll);g&&(g.innerHTML=l()?Wi:wn)},u=(g,_,p)=>{const f=document.createElement("li");f.className=p?"mesh-panel__item mesh-panel__item--nested":"mesh-panel__item",_.visible||f.classList.add("mesh-panel__item--hidden"),f.dataset.meshId=_.id;const b=document.createElement("div");b.className="mesh-panel__row";const y=document.createElement("button");y.type="button",y.className="mesh-panel__visibility",y.innerHTML=_.visible?Oi:ki,y.addEventListener("pointerdown",A=>A.stopPropagation()),y.addEventListener("click",A=>{A.stopPropagation(),t.toggleMeshVisible(_.id),c()});const E=document.createElement("div");E.className="mesh-panel__op-track",E.style.setProperty("--op",String(_.opacity));const L=document.createElement("div");L.className="mesh-panel__row-fill";const T=document.createElement("input");T.type="range",T.className="mesh-panel__opacity-slider",T.min="0.05",T.max="1",T.step="0.01",T.value=String(_.opacity),T.dataset.op=_.id,T.setAttribute("aria-label","Прозрачность"),T.addEventListener("pointerdown",A=>A.stopPropagation());const R=document.createElement("span");R.className="mesh-panel__name",R.textContent=_.name,R.title=_.name,E.append(L,T,R),b.append(y,E),f.appendChild(b),g.appendChild(f)},d=(g,_,p)=>{const f=document.createElement("li");f.className=p?"mesh-panel__group":"mesh-panel__group mesh-panel__group--nested",f.dataset.groupId=g.id;const b=document.createElement("div");b.className="mesh-panel__group-header";const y=document.createElement("div");y.className="mesh-panel__row mesh-panel__row--group";const E=document.createElement("button");E.type="button",E.className="mesh-panel__visibility";const L=g.meshes.every(z=>z.visible);E.innerHTML=L?Oi:ki,E.classList.toggle("mesh-panel__visibility--hidden",!L),E.addEventListener("pointerdown",z=>z.stopPropagation()),E.addEventListener("click",z=>{z.stopPropagation();const W=!g.meshes.every(K=>{const H=n.querySelector(`[data-mesh-id="${CSS.escape(K.id)}"]`);return H?!H.classList.contains("mesh-panel__item--hidden"):K.visible});for(const K of g.meshes)t.setMeshVisible(K.id,W);E.innerHTML=W?Oi:ki,E.classList.toggle("mesh-panel__visibility--hidden",!W),c()});const T=document.createElement("button");T.type="button",T.className="mesh-panel__collapse mesh-panel__collapse--group",T.innerHTML=wn;const R=z=>{f.classList.toggle("mesh-panel__group--collapsed",z),T.innerHTML=z?Wi:wn,z?a.add(g.id):a.delete(g.id)};T.addEventListener("pointerdown",z=>z.stopPropagation()),T.addEventListener("click",z=>{z.stopPropagation(),R(!a.has(g.id)),h()});const A=g.meshes.reduce((z,W)=>z+W.opacity,0)/Math.max(1,g.meshes.length),S=document.createElement("div");S.className="mesh-panel__op-track",S.style.setProperty("--op",String(A));const M=document.createElement("div");M.className="mesh-panel__row-fill";const C=document.createElement("input");C.type="range",C.className="mesh-panel__opacity-slider",C.min="0.05",C.max="1",C.step="0.01",C.value=String(A),C.dataset.groupOp=g.id,C.setAttribute("aria-label","Прозрачность группы"),C.addEventListener("pointerdown",z=>z.stopPropagation()),C.addEventListener("input",()=>{const z=Number(C.value);S.style.setProperty("--op",String(z));for(const W of g.meshes){t.setMeshOpacity(W.id,z);const K=n.querySelector(`[data-op="${CSS.escape(W.id)}"]`);K&&(K.value=String(z),Js(K,z))}});const V=document.createElement("span");V.className="mesh-panel__name mesh-panel__name--group",V.textContent=g.label,V.title=g.label,S.append(M,C,V),y.append(E,T,S),b.append(y);const O=document.createElement("ul");O.className="mesh-panel__group-children";const Y=new Set;if(g.children?.length)for(const z of g.children)z.kind==="group"?(z.meshes.forEach(W=>Y.add(W.id)),d(z,O,!1)):(Y.add(z.mesh.id),u(O,z.mesh,!0));for(const z of g.meshes)Y.has(z.id)||u(O,z,!0);f.append(b,O),_.appendChild(f),R(p)};for(const g of r)g.kind==="group"?d(g,n,!0):u(n,g.mesh,!1);n.querySelectorAll("[data-op]").forEach(g=>{g.addEventListener("input",()=>{const _=Number(g.value);t.setMeshOpacity(g.dataset.op,_),Js(g,_)})});const m=document.getElementById(i.collapseAll);m&&(m.hidden=!o),document.getElementById(i.visibilityAll)?.addEventListener("click",g=>{g.stopPropagation(),t.toggleAllVisible(),c()}),document.getElementById(i.collapseAll)?.addEventListener("click",g=>{g.stopPropagation();const _=!l();for(const p of r){if(p.kind!=="group")continue;const f=n.querySelector(`[data-group-id="${CSS.escape(p.id)}"]`);if(!f)continue;f.classList.toggle("mesh-panel__group--collapsed",_);const b=f.querySelector(".mesh-panel__collapse--group");b&&(b.innerHTML=_?Wi:wn),_?a.add(p.id):a.delete(p.id)}h()}),c(),h()}const Oo=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],Gc=[{slot:"protrusion",label:"Протрузия"},{slot:"retrusion",label:"Ретрузия"},{slot:"latero_left",label:"Латеротризия влево"},{slot:"latero_right",label:"Латеротризия вправо"}];function Mh(n){return!!n?.tracks?.some(t=>t.steps.length>0)}function jv(n){const t=n?.contacts?.meshes;return t?.length?t.some(e=>{const i=e.tracks??{};return Object.values(i).some(s=>!!s)}):!1}function Kv(n){return!!n?.contacts?.meshes?.some(t=>!!t.imprintAll)}function ks(n){if(!n)return null;const t=n,e=t.contacts??null;let i=null;if(e){const o=e.meshes,a=Array.isArray(o)?o.map(c=>{const l=c,h=l.tracks??l.Tracks??{};return{id:String(l.id??""),role:String(l.role??l.Role??"design"),vertexCount:Number(l.vertexCount??l.vertex_count??0),tracks:h,imprintAll:l.imprintAll??l.imprint_all??null}}):[];i={bandMm:Number(e.bandMm??e.band_mm??2),scaleMinMm:Number(e.scaleMinMm??e.scale_min_mm??-.5),scaleMaxMm:Number(e.scaleMaxMm??e.scale_max_mm??.2),mode:String(e.mode??"free"),quantMm:e.quantMm!=null||e.quant_mm!=null?Number(e.quantMm??e.quant_mm):void 0,keyframeEvery:e.keyframeEvery!=null||e.keyframe_every!=null?Number(e.keyframeEvery??e.keyframe_every):void 0,meshes:a}}const s=Array.isArray(n.tracks)?n.tracks:[],r={articulatorName:n.articulatorName??t.articulator_name??null,tracks:s,contacts:i};return!Mh(r)&&!jv(r)&&!Kv(r)?null:r}function Jv(n,t){if(!t)return n;const e={articulatorName:n.articulatorName??t.articulatorName??null,tracks:Mh(n)?n.tracks:t.tracks,contacts:n.contacts??t.contacts??null};if(e.contacts&&t.contacts&&n.contacts){const i=new Map(e.contacts.meshes.map(s=>[s.id,s]));for(const s of t.contacts.meshes){const r=i.get(s.id);if(!r){i.set(s.id,s);continue}i.set(s.id,{...r,vertexCount:r.vertexCount||s.vertexCount,tracks:{...s.tracks,...r.tracks},imprintAll:r.imprintAll??s.imprintAll??null})}e.contacts={...e.contacts,meshes:[...i.values()]}}return e}function bi(n){const t=ks(n.articulator),e=ks(window.__D3D_ARTICULATOR__);return t&&e?ks(Jv(t,e)):t??e}function Zv(n){const t=[],e=[];for(const i of n){const s=ia(i);s==="upper"?t.push(i.id):s==="lower"&&e.push(i.id)}return{upper:t,lower:e}}function Qv(n){return n.toLowerCase().replace(/[\s_\-]+/g,"")}function $v(n){const t=Qv(n);if(t.includes("retrus")||t.includes("ретруз"))return"retrusion";if(t.includes("protrus")||t.includes("протруз"))return"protrusion";const e=t.includes("latero")||t.includes("латеро");return e&&(t.includes("left")||t.includes("лев"))?"latero_left":e&&(t.includes("right")||t.includes("прав"))?"latero_right":"other"}function yh(n){return!n||n.length!==16?!0:n.every((t,e)=>Math.abs(t-(Oo[e]??0))<=1e-5)}function t0(n,t,e,i,s){const r=s==="upper",o=r?i.upper:i.lower,a=r?i.lower:i.upper,c=t?.steps[e],l=(t?.moving??"lower").toLowerCase().startsWith("up");let h=c&&c.length===16&&!yh(c)?kv(c):Oo;r!==l&&h!==Oo&&(h=Hv(h));for(const u of o){const d=n.getRestMatrix(u);d&&n.setMeshMatrix(u,zv(h,d))}for(const u of a){const d=n.getRestMatrix(u);d&&n.setMeshMatrix(u,d)}}function Je(n){for(const t of n){const e=document.querySelector(t);if(e)return e}return null}function Sh(n,t){if(n)for(const e of t){const i=n.querySelector(e);if(i)return i}return Je(t)}function Wc(n,t){const e=Sh(n,[`#${t}`,"[data-articulator-frame]",'input[type="range"]']);if(e)return e;if(!n)return null;const i=document.createElement("input");return i.type="range",i.id=t,i.className="articulator-panel__slider",i.min="0",i.max="0",i.value="0",n.appendChild(i),i}function Xc(n,t){const e=Sh(n,[`#${t}`,"[data-articulator-movements]",".articulator-panel__radios",".articulator-panel__movements"]);if(e)return e.classList.add("articulator-panel__radios"),e;if(!n)return null;const i=document.createElement("div");return i.id=t,i.className="articulator-panel__radios",n.appendChild(i),i}function e0(n,t){const e=bi(t),i=Je(["#articulator-panel","[data-articulator-panel]",".articulator-panel"]),s=Je(["#mobile-sheet-articulator",'[data-mobile-sheet="articulator"]']),r=document.querySelector('#mobile-dock [data-mobile-sheet="articulator"]');if(!e||e.tracks.length===0){i?.classList.add("articulator-panel--hidden"),r&&(r.hidden=!0);return}i?.classList.remove("articulator-panel--hidden"),i?.addEventListener("pointerdown",j=>j.stopPropagation()),i?.addEventListener("pointerup",j=>j.stopPropagation()),r&&(r.hidden=!1);const o=Zv(t.meshes),a=Je(["#articulator-name","[data-articulator-name]"]);a&&(a.textContent="Движения в артикуляторе");const c=Je(["#articulator-header",".articulator-panel__header"]),l=Je(["#articulator-collapse",".articulator-panel__collapse"]);l&&!l.innerHTML.trim()&&(l.innerHTML=wn);const h=j=>{i?.classList.toggle("articulator-panel--collapsed",j),l&&(l.title=j?"Развернуть":"Свернуть",l.innerHTML=j?Wi:wn)},u=j=>{j.stopPropagation(),h(!i?.classList.contains("articulator-panel--collapsed"))};l?.addEventListener("click",u),c?.addEventListener("click",j=>{j.target instanceof Element&&j.target.closest("button")||u(j)}),h(!1),document.querySelectorAll(".articulator-panel__jaw .articulator-panel__label").forEach(j=>{j.textContent="Движущаяся челюсть"});const d=e.tracks.some(j=>/bite|прикус|occlus/i.test(j.type))||t.meshes.some(j=>{const dt=j.source_pose??j.source_pose_matrix;return dt!=null&&dt.length===16&&!yh(dt)}),m=new Map,g=[];e.tracks.forEach((j,dt)=>{const Mt=$v(j.type);if(Mt!=="other"&&!m.has(Mt)){m.set(Mt,dt);return}g.push({index:dt,label:j.type||`Движение ${dt+1}`})});const _=Gc.map(j=>m.get(j.slot)).find(j=>j!==void 0)??g[0]?.index??0,p=i?.querySelector(".articulator-panel__body")??i,f=Xc(p,"articulator-movements"),b=Xc(s,"articulator-movements-mobile"),y=Wc(p,"articulator-frame"),E=Wc(s,"articulator-frame-mobile"),L=[Je(["#articulator-jaw","[data-articulator-jaw]"]),Je(["#articulator-jaw-mobile","[data-articulator-jaw-mobile]"])],T=[Je(["#articulator-bite","[data-articulator-bite]"]),Je(["#articulator-bite-mobile","[data-articulator-bite-mobile]"])];let R=_,A=0,S=(e.tracks[R]?.moving??"lower").toLowerCase().startsWith("up")?"upper":"lower";const M=()=>e.tracks[R],C=j=>{if(!j)return;j.replaceChildren();const dt=(Mt,X)=>{const et=document.createElement("button");et.type="button",et.className="articulator-panel__radio",et.dataset.index=String(Mt),et.addEventListener("pointerdown",pt=>{pt.stopPropagation()}),et.addEventListener("click",pt=>{pt.stopPropagation(),pt.preventDefault(),W(Mt)}),et.textContent=X,j.appendChild(et)};for(const Mt of Gc){const X=m.get(Mt.slot);X!==void 0&&dt(X,Mt.label)}for(const Mt of g)dt(Mt.index,Mt.label)};C(f),C(b);const V=()=>{for(const j of[f,b])j?.querySelectorAll(".articulator-panel__radio").forEach(dt=>{dt.classList.toggle("articulator-panel__radio--active",dt.dataset.index===String(R))})},O=()=>{for(const j of L)j?.querySelectorAll("[data-jaw]").forEach(dt=>{dt.classList.toggle("is-active",dt.dataset.jaw===S)})},Y=()=>{const dt=Math.max(1,M()?.steps.length??1)-1;A=Math.min(A,dt);for(const Mt of[y,E])Mt&&(Mt.max=String(dt),Mt.value=String(A))},z=()=>{t0(n,M(),A,o,S);const j=M();j&&n.applyArticulatorContactFrame?.(j.type,A)},W=j=>{R=Math.max(0,Math.min(j,e.tracks.length-1)),A=0,V(),Y(),H(),z()},K=j=>{S!==j&&(S=j,O(),z())},H=()=>{const j=A>0,dt=j?"Закрыть прикус":"Открыть прикус";for(const Mt of T)Mt&&(Mt.hidden=!d,Mt.textContent=dt,Mt.classList.toggle("is-open",j))},st=j=>{const dt=Math.max(0,(M()?.steps.length??1)-1);A=j?dt:0,Y(),H(),z()},ut=j=>{A=Math.max(0,j),Y(),H(),z()};for(const j of L)j?.querySelectorAll("[data-jaw]").forEach(dt=>{dt.addEventListener("pointerdown",Mt=>Mt.stopPropagation()),dt.addEventListener("click",Mt=>{Mt.stopPropagation(),Mt.preventDefault(),K(dt.dataset.jaw==="upper"?"upper":"lower")})});y?.addEventListener("input",()=>ut(Number(y.value))),E?.addEventListener("input",()=>ut(Number(E.value)));for(const j of T)j?.addEventListener("click",()=>st(A===0));V(),O(),Y(),H(),z()}const n0=-.5,i0=.2,li=new Zt;class s0{constructor(t){this.meshes=t}enabled=!1;dynamicEnabled=!1;showOnJaws=!0;sidecar=null;mapsReady=!1;imprints=new Map;scratch=new Map;meshRoles=new Map;lastTrack="";lastFrame=0;mappedDecoders=new Map;get scaleMinMm(){return this.sidecar?.contacts?.scaleMinMm??n0}get scaleMaxMm(){return this.sidecar?.contacts?.scaleMaxMm??i0}get paintMode(){const t=String(this.sidecar?.contacts?.mode??"free").toLowerCase();return t==="proximity"||t==="distance"||t==="дистанция"?"proximity":t==="intersectionsonly"||t==="intersections"||t==="пересечения"?"intersectionsOnly":"free"}hasMaps(){return this.mapsReady}hasImprint(){return this.imprints.size>0}hasJawScanMaps(){for(const[t]of this.mappedDecoders)if(this.isScanRole(t))return!0;return!1}isScanRole(t){const e=(this.meshRoles.get(t)??"design").toLowerCase();return e==="scan"||e==="jaw"||e==="antagonist"}async loadSidecar(t){const e=ks(t);this.sidecar=e,this.mapsReady=!1,this.mappedDecoders.clear(),this.imprints.clear(),this.scratch.clear(),this.meshRoles.clear();const i=e?.contacts;if(!i?.meshes?.length)return;const s=new Map(this.meshes().map(r=>[r.id,r]));for(const r of i.meshes){this.meshRoles.set(r.id,String(r.role??"design"));const o=new Map;for(const[a,c]of Object.entries(r.tracks??{}))if(c)try{const l=await kc(Oc(c));o.set(a,zc(l))}catch{}if(o.size>0&&this.mappedDecoders.set(r.id,o),r.imprintAll)try{const a=await kc(Oc(r.imprintAll)),c=zc(a),l=r.vertexCount||s.get(r.id)?.mesh.geometry.getAttribute("position")?.count||c.vertexCount,h=new Float32Array(l);c.applyFrame(0,h),this.imprints.set(r.id,h)}catch{}}this.mapsReady=this.mappedDecoders.size>0}setEnabled(t){if(this.enabled=t,!t){this.clearPaint();return}this.applyCurrent()}setDynamicEnabled(t){this.dynamicEnabled=t,this.enabled&&this.applyCurrent()}setShowOnJaws(t){this.showOnJaws=t,this.enabled&&(t||this.clearScanPaint(),this.applyCurrent())}applyFrame(t,e){this.lastTrack=t,this.lastFrame=e,this.enabled&&this.applyCurrent()}refreshAfterMaterialChange(){this.enabled&&this.applyCurrent()}applyCurrent(){if(!this.hasMaps())return;const t=this.lastTrack;for(const e of this.meshes()){if(e.photo||this.isScanRole(e.id)&&!this.showOnJaws)continue;const i=e.mesh.geometry.getAttribute("position");if(!i)continue;const s=this.mappedDecoders.get(e.id),r=this.imprints.get(e.id);if(!s&&!r)continue;const o=this.scratchFor(e.id,i.count);Os(o);const a=s?.get(t)??s?.values().next().value;a&&a.applyFrame(this.lastFrame,o),this.dynamicEnabled&&r&&Bv(o,r),this.paintMesh(e,o)}}scratchFor(t,e){let i=this.scratch.get(t);return(!i||i.length!==e)&&(i=new Float32Array(e),this.scratch.set(t,i)),i}ensurePatched(t){const e=t.mesh.geometry;if(!e.getAttribute("contactsDistance")){const r=e.getAttribute("position")?.count??1,o=new Float32Array(r);o.fill(ji),e.setAttribute("contactsDistance",new $t(o,1))}const i=t.mesh.material;if(Array.isArray(i))return;const s={scaleMinMm:this.scaleMinMm,scaleMaxMm:this.scaleMaxMm,mode:this.paintMode};i.userData.contactsDistanceShader?Rv(i,s):gh(i,s)}paintMesh(t,e){const i=t.mesh.geometry,s=i.getAttribute("contactsDistance");if(s&&s.array instanceof Float32Array&&s.array.length===e.length)s.array!==e&&s.array.set(e),s.needsUpdate=!0;else{const o=new $t(e,1);o.setUsage(Bu),i.setAttribute("contactsDistance",o)}this.ensurePatched(t);const r=t.mesh.material;Array.isArray(r)||Vr(r,!1,null,li,li)}clearScanPaint(){for(const t of this.meshes()){if(!this.isScanRole(t.id))continue;const e=t.mesh.material;Array.isArray(e)||(Vr(e,!1,null,li,li),Nc(e));const i=t.mesh.geometry.getAttribute("contactsDistance");i&&i.array instanceof Float32Array&&(Os(i.array),i.needsUpdate=!0)}}clearPaint(){for(const t of this.meshes()){const e=t.mesh.material;Array.isArray(e)||(Vr(e,!1,null,li,li),Nc(e));const i=t.mesh.geometry.getAttribute("contactsDistance");i&&i.array instanceof Float32Array&&(Os(i.array),i.needsUpdate=!0)}}}const Yc=2.5,qc=1.3,jc=.7;function we(n){const t=atob(n),e=t.length,i=new Uint8Array(e),s=32768;for(let r=0;r<e;r+=s){const o=Math.min(r+s,e);for(let a=r;a<o;a+=1)i[a]=t.charCodeAt(a)}return i}function Vn(n){let e="";for(let i=0;i<n.length;i+=32768){const s=n.subarray(i,Math.min(i+32768,n.length));e+=String.fromCharCode(...s)}return btoa(e)}const Eh={};(function(n){n.OutWindow=function(){this._windowSize=0},n.OutWindow.prototype.create=function(t){(!this._buffer||this._windowSize!==t)&&(this._buffer=new Uint8Array(t)),this._windowSize=t,this._pos=0,this._streamPos=0},n.OutWindow.prototype.flush=function(){var t=this._pos-this._streamPos;if(t!==0){if(this._stream.writeBytes)this._stream.writeBytes(this._buffer,t);else for(var e=0;e<t;e++)this._stream.writeByte(this._buffer[e]);this._pos>=this._windowSize&&(this._pos=0),this._streamPos=this._pos}},n.OutWindow.prototype.releaseStream=function(){this.flush(),this._stream=null},n.OutWindow.prototype.setStream=function(t){this.releaseStream(),this._stream=t},n.OutWindow.prototype.init=function(t){t||(this._streamPos=0,this._pos=0)},n.OutWindow.prototype.copyBlock=function(t,e){var i=this._pos-t-1;for(i<0&&(i+=this._windowSize);e--;)i>=this._windowSize&&(i=0),this._buffer[this._pos++]=this._buffer[i++],this._pos>=this._windowSize&&this.flush()},n.OutWindow.prototype.putByte=function(t){this._buffer[this._pos++]=t,this._pos>=this._windowSize&&this.flush()},n.OutWindow.prototype.getByte=function(t){var e=this._pos-t-1;return e<0&&(e+=this._windowSize),this._buffer[e]},n.RangeDecoder=function(){},n.RangeDecoder.prototype.setStream=function(t){this._stream=t},n.RangeDecoder.prototype.releaseStream=function(){this._stream=null},n.RangeDecoder.prototype.init=function(){var t=5;for(this._code=0,this._range=-1;t--;)this._code=this._code<<8|this._stream.readByte()},n.RangeDecoder.prototype.decodeDirectBits=function(t){for(var e=0,i=t,s;i--;)this._range>>>=1,s=this._code-this._range>>>31,this._code-=this._range&s-1,e=e<<1|1-s,(this._range&4278190080)===0&&(this._code=this._code<<8|this._stream.readByte(),this._range<<=8);return e},n.RangeDecoder.prototype.decodeBit=function(t,e){var i=t[e],s=(this._range>>>11)*i;return(this._code^2147483648)<(s^2147483648)?(this._range=s,t[e]+=2048-i>>>5,(this._range&4278190080)===0&&(this._code=this._code<<8|this._stream.readByte(),this._range<<=8),0):(this._range-=s,this._code-=s,t[e]-=i>>>5,(this._range&4278190080)===0&&(this._code=this._code<<8|this._stream.readByte(),this._range<<=8),1)},n.initBitModels=function(t,e){for(;e--;)t[e]=1024},n.BitTreeDecoder=function(t){this._models=[],this._numBitLevels=t},n.BitTreeDecoder.prototype.init=function(){n.initBitModels(this._models,1<<this._numBitLevels)},n.BitTreeDecoder.prototype.decode=function(t){for(var e=1,i=this._numBitLevels;i--;)e=e<<1|t.decodeBit(this._models,e);return e-(1<<this._numBitLevels)},n.BitTreeDecoder.prototype.reverseDecode=function(t){for(var e=1,i=0,s=0,r;s<this._numBitLevels;++s)r=t.decodeBit(this._models,e),e=e<<1|r,i|=r<<s;return i},n.reverseDecode2=function(t,e,i,s){for(var r=1,o=0,a=0,c;a<s;++a)c=i.decodeBit(t,e+r),r=r<<1|c,o|=c<<a;return o},n.LenDecoder=function(){this._choice=[],this._lowCoder=[],this._midCoder=[],this._highCoder=new n.BitTreeDecoder(8),this._numPosStates=0},n.LenDecoder.prototype.create=function(t){for(;this._numPosStates<t;++this._numPosStates)this._lowCoder[this._numPosStates]=new n.BitTreeDecoder(3),this._midCoder[this._numPosStates]=new n.BitTreeDecoder(3)},n.LenDecoder.prototype.init=function(){var t=this._numPosStates;for(n.initBitModels(this._choice,2);t--;)this._lowCoder[t].init(),this._midCoder[t].init();this._highCoder.init()},n.LenDecoder.prototype.decode=function(t,e){return t.decodeBit(this._choice,0)===0?this._lowCoder[e].decode(t):t.decodeBit(this._choice,1)===0?8+this._midCoder[e].decode(t):16+this._highCoder.decode(t)},n.Decoder2=function(){this._decoders=[]},n.Decoder2.prototype.init=function(){n.initBitModels(this._decoders,768)},n.Decoder2.prototype.decodeNormal=function(t){var e=1;do e=e<<1|t.decodeBit(this._decoders,e);while(e<256);return e&255},n.Decoder2.prototype.decodeWithMatchByte=function(t,e){var i=1,s,r;do if(s=e>>7&1,e<<=1,r=t.decodeBit(this._decoders,(1+s<<8)+i),i=i<<1|r,s!==r){for(;i<256;)i=i<<1|t.decodeBit(this._decoders,i);break}while(i<256);return i&255},n.LiteralDecoder=function(){},n.LiteralDecoder.prototype.create=function(t,e){var i;if(!(this._coders&&this._numPrevBits===e&&this._numPosBits===t))for(this._numPosBits=t,this._posMask=(1<<t)-1,this._numPrevBits=e,this._coders=[],i=1<<this._numPrevBits+this._numPosBits;i--;)this._coders[i]=new n.Decoder2},n.LiteralDecoder.prototype.init=function(){for(var t=1<<this._numPrevBits+this._numPosBits;t--;)this._coders[t].init()},n.LiteralDecoder.prototype.getDecoder=function(t,e){return this._coders[((t&this._posMask)<<this._numPrevBits)+((e&255)>>>8-this._numPrevBits)]},n.Decoder=function(){this._outWindow=new n.OutWindow,this._rangeDecoder=new n.RangeDecoder,this._isMatchDecoders=[],this._isRepDecoders=[],this._isRepG0Decoders=[],this._isRepG1Decoders=[],this._isRepG2Decoders=[],this._isRep0LongDecoders=[],this._posSlotDecoder=[],this._posDecoders=[],this._posAlignDecoder=new n.BitTreeDecoder(4),this._lenDecoder=new n.LenDecoder,this._repLenDecoder=new n.LenDecoder,this._literalDecoder=new n.LiteralDecoder,this._dictionarySize=-1,this._dictionarySizeCheck=-1,this._posSlotDecoder[0]=new n.BitTreeDecoder(6),this._posSlotDecoder[1]=new n.BitTreeDecoder(6),this._posSlotDecoder[2]=new n.BitTreeDecoder(6),this._posSlotDecoder[3]=new n.BitTreeDecoder(6)},n.Decoder.prototype.setDictionarySize=function(t){return t<0?!1:(this._dictionarySize!==t&&(this._dictionarySize=t,this._dictionarySizeCheck=Math.max(this._dictionarySize,1),this._outWindow.create(Math.max(this._dictionarySizeCheck,4096))),!0)},n.Decoder.prototype.setLcLpPb=function(t,e,i){var s=1<<i;return t>8||e>4||i>4?!1:(this._literalDecoder.create(e,t),this._lenDecoder.create(s),this._repLenDecoder.create(s),this._posStateMask=s-1,!0)},n.Decoder.prototype.setProperties=function(t){if(!this.setLcLpPb(t.lc,t.lp,t.pb))throw Error("Incorrect stream properties");if(!this.setDictionarySize(t.dictionarySize))throw Error("Invalid dictionary size")},n.Decoder.prototype.decodeHeader=function(t){var e,i,s,r,o,a;return t.size<13?!1:(e=t.readByte(),i=e%9,e=~~(e/9),s=e%5,r=~~(e/5),a=t.readByte(),a|=t.readByte()<<8,a|=t.readByte()<<16,a+=t.readByte()*16777216,o=t.readByte(),o|=t.readByte()<<8,o|=t.readByte()<<16,o+=t.readByte()*16777216,t.readByte(),t.readByte(),t.readByte(),t.readByte(),{lc:i,lp:s,pb:r,dictionarySize:a,uncompressedSize:o})},n.Decoder.prototype.init=function(){var t=4;for(this._outWindow.init(!1),n.initBitModels(this._isMatchDecoders,192),n.initBitModels(this._isRep0LongDecoders,192),n.initBitModels(this._isRepDecoders,12),n.initBitModels(this._isRepG0Decoders,12),n.initBitModels(this._isRepG1Decoders,12),n.initBitModels(this._isRepG2Decoders,12),n.initBitModels(this._posDecoders,114),this._literalDecoder.init();t--;)this._posSlotDecoder[t].init();this._lenDecoder.init(),this._repLenDecoder.init(),this._posAlignDecoder.init(),this._rangeDecoder.init()},n.Decoder.prototype.decodeBody=function(t,e,i){var s=0,r=0,o=0,a=0,c=0,l=0,h=0,u,d,m,g,_,p;for(this._rangeDecoder.setStream(t),this._outWindow.setStream(e),this.init();i<0||l<i;)if(u=l&this._posStateMask,this._rangeDecoder.decodeBit(this._isMatchDecoders,(s<<4)+u)===0)d=this._literalDecoder.getDecoder(l++,h),s>=7?h=d.decodeWithMatchByte(this._rangeDecoder,this._outWindow.getByte(r)):h=d.decodeNormal(this._rangeDecoder),this._outWindow.putByte(h),s=s<4?0:s-(s<10?3:6);else{if(this._rangeDecoder.decodeBit(this._isRepDecoders,s)===1)m=0,this._rangeDecoder.decodeBit(this._isRepG0Decoders,s)===0?this._rangeDecoder.decodeBit(this._isRep0LongDecoders,(s<<4)+u)===0&&(s=s<7?9:11,m=1):(this._rangeDecoder.decodeBit(this._isRepG1Decoders,s)===0?g=o:(this._rangeDecoder.decodeBit(this._isRepG2Decoders,s)===0?g=a:(g=c,c=a),a=o),o=r,r=g),m===0&&(m=2+this._repLenDecoder.decode(this._rangeDecoder,u),s=s<7?8:11);else if(c=a,a=o,o=r,m=2+this._lenDecoder.decode(this._rangeDecoder,u),s=s<7?7:10,_=this._posSlotDecoder[m<=5?m-2:3].decode(this._rangeDecoder),_>=4){if(p=(_>>1)-1,r=(2|_&1)<<p,_<14)r+=n.reverseDecode2(this._posDecoders,r-_-1,this._rangeDecoder,p);else if(r+=this._rangeDecoder.decodeDirectBits(p-4)<<4,r+=this._posAlignDecoder.reverseDecode(this._rangeDecoder),r<0){if(r===-1)break;return!1}}else r=_;if(r>=l||r>=this._dictionarySizeCheck)return!1;this._outWindow.copyBlock(r,m),l+=m,h=this._outWindow.getByte(0)}return this._outWindow.flush(),this._outWindow.releaseStream(),this._rangeDecoder.releaseStream(),!0},n.Decoder.prototype.setDecoderProperties=function(t){var e,i,s,r,o;return t.size<5||(e=t.readByte(),i=e%9,e=~~(e/9),s=e%5,r=~~(e/5),!this.setLcLpPb(i,s,r))?!1:(o=t.readByte(),o|=t.readByte()<<8,o|=t.readByte()<<16,o+=t.readByte()*16777216,this.setDictionarySize(o))},n.decompress=function(t,e,i,s){var r=new n.Decoder;if(!r.setDecoderProperties(t))throw Error("Incorrect lzma stream properties");if(!r.decodeBody(e,i,s))throw Error("Error in lzma data stream");return i},n.decompressFile=function(t,e){t instanceof ArrayBuffer&&(t=new n.iStream(t)),!e&&n.oStream&&(e=new n.oStream);var i=new n.Decoder,s=i.decodeHeader(t),r=s.uncompressedSize;if(i.setProperties(s),!i.decodeBody(t,e,r))throw Error("Error in lzma data stream");return e},n.decode=n.decompressFile})(Eh);const $={};$.CompressionMethod={RAW:5718354,MG1:3229517,MG2:3295053};$.Flags={NORMALS:1};$.File=function(n){this.load(n)};$.File.prototype.load=function(n){this.header=new $.FileHeader(n),this.body=new $.FileBody(this.header),this.getReader().read(n,this.body)};$.File.prototype.getReader=function(){var n;switch(this.header.compressionMethod){case $.CompressionMethod.RAW:n=new $.ReaderRAW;break;case $.CompressionMethod.MG1:n=new $.ReaderMG1;break;case $.CompressionMethod.MG2:n=new $.ReaderMG2;break}return n};$.FileHeader=function(n){n.readInt32(),this.fileFormat=n.readInt32(),this.compressionMethod=n.readInt32(),this.vertexCount=n.readInt32(),this.triangleCount=n.readInt32(),this.uvMapCount=n.readInt32(),this.attrMapCount=n.readInt32(),this.flags=n.readInt32(),this.comment=n.readString()};$.FileHeader.prototype.hasNormals=function(){return this.flags&$.Flags.NORMALS};$.FileBody=function(n){var t=n.triangleCount*3,e=n.vertexCount*3,i=n.hasNormals()?n.vertexCount*3:0,s=n.vertexCount*2,r=n.vertexCount*4,o=0,a=new ArrayBuffer((t+e+i+s*n.uvMapCount+r*n.attrMapCount)*4);if(this.indices=new Uint32Array(a,0,t),this.vertices=new Float32Array(a,t*4,e),n.hasNormals()&&(this.normals=new Float32Array(a,(t+e)*4,i)),n.uvMapCount)for(this.uvMaps=[],o=0;o<n.uvMapCount;++o)this.uvMaps[o]={uv:new Float32Array(a,(t+e+i+o*s)*4,s)};if(n.attrMapCount)for(this.attrMaps=[],o=0;o<n.attrMapCount;++o)this.attrMaps[o]={attr:new Float32Array(a,(t+e+i+s*n.uvMapCount+o*r)*4,r)}};$.FileMG2Header=function(n){n.readInt32(),this.vertexPrecision=n.readFloat32(),this.normalPrecision=n.readFloat32(),this.lowerBoundx=n.readFloat32(),this.lowerBoundy=n.readFloat32(),this.lowerBoundz=n.readFloat32(),this.higherBoundx=n.readFloat32(),this.higherBoundy=n.readFloat32(),this.higherBoundz=n.readFloat32(),this.divx=n.readInt32(),this.divy=n.readInt32(),this.divz=n.readInt32(),this.sizex=(this.higherBoundx-this.lowerBoundx)/this.divx,this.sizey=(this.higherBoundy-this.lowerBoundy)/this.divy,this.sizez=(this.higherBoundz-this.lowerBoundz)/this.divz};$.ReaderRAW=function(){};$.ReaderRAW.prototype.read=function(n,t){this.readIndices(n,t.indices),this.readVertices(n,t.vertices),t.normals&&this.readNormals(n,t.normals),t.uvMaps&&this.readUVMaps(n,t.uvMaps),t.attrMaps&&this.readAttrMaps(n,t.attrMaps)};$.ReaderRAW.prototype.readIndices=function(n,t){n.readInt32(),n.readArrayInt32(t)};$.ReaderRAW.prototype.readVertices=function(n,t){n.readInt32(),n.readArrayFloat32(t)};$.ReaderRAW.prototype.readNormals=function(n,t){n.readInt32(),n.readArrayFloat32(t)};$.ReaderRAW.prototype.readUVMaps=function(n,t){for(var e=0;e<t.length;++e)n.readInt32(),t[e].name=n.readString(),t[e].filename=n.readString(),n.readArrayFloat32(t[e].uv)};$.ReaderRAW.prototype.readAttrMaps=function(n,t){for(var e=0;e<t.length;++e)n.readInt32(),t[e].name=n.readString(),n.readArrayFloat32(t[e].attr)};$.ReaderMG1=function(){};$.ReaderMG1.prototype.read=function(n,t){this.readIndices(n,t.indices),this.readVertices(n,t.vertices),t.normals&&this.readNormals(n,t.normals),t.uvMaps&&this.readUVMaps(n,t.uvMaps),t.attrMaps&&this.readAttrMaps(n,t.attrMaps)};$.ReaderMG1.prototype.readIndices=function(n,t){n.readInt32();var e=n.readInt32(),i=new $.InterleavedStream(t,3);$.decompress(n,e,i),$.restoreIndices(t,t.length)};$.ReaderMG1.prototype.readVertices=function(n,t){n.readInt32();var e=n.readInt32(),i=new $.InterleavedStream(t,1);$.decompress(n,e,i)};$.ReaderMG1.prototype.readNormals=function(n,t){n.readInt32();var e=n.readInt32(),i=new $.InterleavedStream(t,3);$.decompress(n,e,i)};$.ReaderMG1.prototype.readUVMaps=function(n,t){for(var e=0;e<t.length;++e){n.readInt32(),t[e].name=n.readString(),t[e].filename=n.readString();var i=n.readInt32(),s=new $.InterleavedStream(t[e].uv,2);$.decompress(n,i,s)}};$.ReaderMG1.prototype.readAttrMaps=function(n,t){for(var e=0;e<t.length;++e){n.readInt32(),t[e].name=n.readString();var i=n.readInt32(),s=new $.InterleavedStream(t[e].attr,4);$.decompress(n,i,s)}};$.ReaderMG2=function(){};$.ReaderMG2.prototype.read=function(n,t){this.MG2Header=new $.FileMG2Header(n),this.readVertices(n,t.vertices),this.readIndices(n,t.indices),t.normals&&this.readNormals(n,t),t.uvMaps&&this.readUVMaps(n,t.uvMaps),t.attrMaps&&this.readAttrMaps(n,t.attrMaps)};$.ReaderMG2.prototype.readVertices=function(n,t){n.readInt32();var e=n.readInt32(),i=new $.InterleavedStream(t,3);$.decompress(n,e,i);var s=this.readGridIndices(n,t);$.restoreVertices(t,this.MG2Header,s,this.MG2Header.vertexPrecision)};$.ReaderMG2.prototype.readGridIndices=function(n,t){n.readInt32();var e=n.readInt32(),i=new Uint32Array(t.length/3),s=new $.InterleavedStream(i,1);return $.decompress(n,e,s),$.restoreGridIndices(i,i.length),i};$.ReaderMG2.prototype.readIndices=function(n,t){n.readInt32();var e=n.readInt32(),i=new $.InterleavedStream(t,3);$.decompress(n,e,i),$.restoreIndices(t,t.length)};$.ReaderMG2.prototype.readNormals=function(n,t){n.readInt32();var e=n.readInt32(),i=new $.InterleavedStream(t.normals,3);$.decompress(n,e,i);var s=$.calcSmoothNormals(t.indices,t.vertices);$.restoreNormals(t.normals,s,this.MG2Header.normalPrecision)};$.ReaderMG2.prototype.readUVMaps=function(n,t){for(var e=0;e<t.length;++e){n.readInt32(),t[e].name=n.readString(),t[e].filename=n.readString();var i=n.readFloat32(),s=n.readInt32(),r=new $.InterleavedStream(t[e].uv,2);$.decompress(n,s,r),$.restoreMap(t[e].uv,2,i)}};$.ReaderMG2.prototype.readAttrMaps=function(n,t){for(var e=0;e<t.length;++e){n.readInt32(),t[e].name=n.readString();var i=n.readFloat32(),s=n.readInt32(),r=new $.InterleavedStream(t[e].attr,4);$.decompress(n,s,r),$.restoreMap(t[e].attr,4,i)}};$.decompress=function(n,t,e){var i=n.offset;Eh.decompress(n,n,e,e.data.length),n.offset=i+5+t};$.restoreIndices=function(n,t){var e=3;for(t>0&&(n[2]+=n[0],n[1]+=n[0]);e<t;e+=3)n[e]+=n[e-3],n[e]===n[e-3]?n[e+1]+=n[e-2]:n[e+1]+=n[e],n[e+2]+=n[e]};$.restoreGridIndices=function(n,t){for(var e=1;e<t;++e)n[e]+=n[e-1]};$.restoreVertices=function(n,t,e,i){for(var s,r,o,a,c,l=new Uint32Array(n.buffer,n.byteOffset,n.length),h=t.divx,u=h*t.divy,d=2147483647,m=0,g=0,_=0,p=e.length;g<p;_+=3)o=s=e[g++],c=~~(o/u),o-=~~(c*u),a=~~(o/h),o-=~~(a*h),r=l[_],s===d&&(r+=m),n[_]=t.lowerBoundx+o*t.sizex+i*r,n[_+1]=t.lowerBoundy+a*t.sizey+i*l[_+1],n[_+2]=t.lowerBoundz+c*t.sizez+i*l[_+2],d=s,m=r};$.restoreNormals=function(n,t,e){for(var i,s,r,o,a,c,l,h,u,d,m=new Uint32Array(n.buffer,n.byteOffset,n.length),g=0,_=n.length,p=3.141592653589793*.5;g<_;g+=3)i=m[g]*e,s=m[g+1],s===0?(n[g]=t[g]*i,n[g+1]=t[g+1]*i,n[g+2]=t[g+2]*i):(s<=4?r=(m[g+2]-2)*p:r=(m[g+2]*4/s-2)*p,s*=e*p,o=i*Math.sin(s),a=o*Math.cos(r),c=o*Math.sin(r),l=i*Math.cos(s),u=t[g+1],h=t[g]-t[g+2],d=Math.sqrt(2*u*u+h*h),d>1e-20&&(h/=d,u/=d),n[g]=t[g]*l+(t[g+1]*u-t[g+2]*h)*c-u*a,n[g+1]=t[g+1]*l-(t[g+2]+t[g])*u*c+h*a,n[g+2]=t[g+2]*l+(t[g]*h+t[g+1]*u)*c+u*a)};$.restoreMap=function(n,t,e){for(var i,s,r=new Uint32Array(n.buffer,n.byteOffset,n.length),o=0,a,c=n.length;o<t;++o)for(i=0,a=o;a<c;a+=t)s=r[a],i+=s&1?-(s+1>>1):s>>1,n[a]=i*e};$.calcSmoothNormals=function(n,t){var e=new Float32Array(t.length),i,s,r,o,a,c,l,h,u,d,m,g,_,p,f;for(p=0,f=n.length;p<f;)i=n[p++]*3,s=n[p++]*3,r=n[p++]*3,l=t[s]-t[i],d=t[r]-t[i],h=t[s+1]-t[i+1],m=t[r+1]-t[i+1],u=t[s+2]-t[i+2],g=t[r+2]-t[i+2],o=h*g-u*m,a=u*d-l*g,c=l*m-h*d,_=Math.sqrt(o*o+a*a+c*c),_>1e-10&&(o/=_,a/=_,c/=_),e[i]+=o,e[i+1]+=a,e[i+2]+=c,e[s]+=o,e[s+1]+=a,e[s+2]+=c,e[r]+=o,e[r+1]+=a,e[r+2]+=c;for(p=0,f=e.length;p<f;p+=3)_=Math.sqrt(e[p]*e[p]+e[p+1]*e[p+1]+e[p+2]*e[p+2]),_>1e-10&&(e[p]/=_,e[p+1]/=_,e[p+2]/=_);return e};$.isLittleEndian=(function(){var n=new ArrayBuffer(2),t=new Uint8Array(n),e=new Uint16Array(n);return t[0]=1,e[0]===1})();$.InterleavedStream=function(n,t){this.data=new Uint8Array(n.buffer,n.byteOffset,n.byteLength),this.offset=$.isLittleEndian?3:0,this.count=t*4,this.len=this.data.length};$.InterleavedStream.prototype.writeByte=function(n){this.data[this.offset]=n,this.offset+=this.count,this.offset>=this.len&&(this.offset-=this.len-4,this.offset>=this.count&&(this.offset-=this.count+($.isLittleEndian?1:-1)))};$.Stream=function(n){this.data=n,this.offset=0};$.Stream.prototype.TWO_POW_MINUS23=Math.pow(2,-23);$.Stream.prototype.TWO_POW_MINUS126=Math.pow(2,-126);$.Stream.prototype.readByte=function(){return this.data.charCodeAt(this.offset++)&255};$.Stream.prototype.readInt32=function(){var n=this.readByte();return n|=this.readByte()<<8,n|=this.readByte()<<16,n|this.readByte()<<24};$.Stream.prototype.readFloat32=function(){var n=this.readByte();n+=this.readByte()<<8;var t=this.readByte(),e=this.readByte();n+=(t&127)<<16;var i=(e&127)<<1|(t&128)>>>7,s=e&128?-1:1;return i===255?n!==0?NaN:s*(1/0):i>0?s*(1+n*this.TWO_POW_MINUS23)*Math.pow(2,i-127):n!==0?s*n*this.TWO_POW_MINUS126:s*0};$.Stream.prototype.readString=function(){var n=this.readInt32();return this.offset+=n,this.data.substr(this.offset-n,n)};$.Stream.prototype.readArrayInt32=function(n){for(var t=0,e=n.length;t<e;)n[t++]=this.readInt32();return n};$.Stream.prototype.readArrayFloat32=function(n){for(var t=0,e=n.length;t<e;)n[t++]=this.readFloat32();return n};function r0(n){let e="";for(let i=0;i<n.length;i+=32768){const s=Math.min(i+32768,n.length);e+=String.fromCharCode(...n.subarray(i,s))}return e}function bh(n){if(n.length<12)throw new Error("CTM data too short");const t=new $.Stream(r0(n)),e=new $.File(t),i=e.body.vertices,s=e.body.indices;if(!i?.length||!s?.length)throw new Error("CTM mesh is empty");const o=e.body.uvMaps?.[0]?.uv??null,a=e.body.attrMaps;let c=null;const l=a?.[0]?.attr;if(l&&l.length>=4){const h=Math.floor(l.length/4),u=new Uint8Array(h*3);for(let d=0;d<h;d+=1)u[d*3]=Math.max(0,Math.min(255,Math.round((l[d*4]??0)*255))),u[d*3+1]=Math.max(0,Math.min(255,Math.round((l[d*4+1]??0)*255))),u[d*3+2]=Math.max(0,Math.min(255,Math.round((l[d*4+2]??0)*255)));c=u}return{positions:i,indices:s,normals:e.body.normals??null,uvs:o,colors:c}}const o0=1364013892,a0=1,c0=2,l0=4;function Kc(n){if(n.byteLength<40)throw new Error("D3MQ: слишком короткий буфер");const t=new DataView(n.buffer,n.byteOffset,n.byteLength);if(t.getUint32(0,!0)!==o0)throw new Error("D3MQ: неверная сигнатура");const e=t.getUint8(4);if(e!==1&&e!==2)throw new Error(`D3MQ: версия ${String(e)}`);const i=t.getUint8(5),s=(i&a0)!==0,r=e>=2&&(i&c0)!==0,o=e>=2&&(i&l0)!==0,a=t.getUint32(8,!0),c=t.getUint32(12,!0),l=t.getFloat32(16,!0),h=t.getFloat32(20,!0),u=t.getFloat32(24,!0),d=t.getFloat32(28,!0),m=t.getFloat32(32,!0),g=t.getFloat32(36,!0),_=(d-l)/65535,p=(m-h)/65535,f=(g-u)/65535;let b=40;const y=new Float32Array(a*3);if(o){let T=0,R=0,A=0;const S={offset:b};for(let M=0;M<a;M+=1){T+=Rs(n,S),R+=Rs(n,S),A+=Rs(n,S);const C=M*3;y[C]=l+T*_,y[C+1]=h+R*p,y[C+2]=u+A*f}b=S.offset}else for(let T=0;T<a;T+=1){const R=T*3;y[R]=l+t.getUint16(b,!0)*_,y[R+1]=h+t.getUint16(b+2,!0)*p,y[R+2]=u+t.getUint16(b+4,!0)*f,b+=6}const E=c*3,L=new Uint32Array(E);if(r){let T=0;const R={offset:b};for(let A=0;A<E;A+=1)T+=Rs(n,R),L[A]=T>>>0}else if(s)for(let T=0;T<E;T+=1)L[T]=t.getUint32(b,!0),b+=4;else for(let T=0;T<E;T+=1)L[T]=t.getUint16(b,!0),b+=2;return{positions:y,indices:L}}function Rs(n,t){let e=0,i=0;for(;t.offset<n.length;){const s=n[t.offset];if(t.offset+=1,e|=(s&127)<<i,(s&128)===0)break;i+=7}return e>>>1^-(e&1)}const h0=1111765828;function wh(n){return n.length<12?!1:n[0]===68&&n[1]===51&&n[2]===68&&n[3]===66}function Th(n){const t=new DataView(n.buffer,n.byteOffset,n.byteLength);if(t.getUint32(0,!0)!==h0)throw new Error("D3DB: неверная сигнатура");const e=t.getUint32(4,!0);if(e!==1&&e!==2)throw new Error(`D3DB: версия ${String(e)}`);const i=t.getUint32(8,!0),s=12,r=s+i;if(r>n.byteLength)throw new Error("D3DB: json обрезан");const o=n.subarray(s,r);let a=r+3&-4;const c=[];if(a+4>n.byteLength)return{json:o,packs:c};const l=t.getInt32(a,!0);a+=4;for(let h=0;h<l&&!(a+4>n.byteLength);h+=1){const u=t.getInt32(a,!0);a+=4;const d=n.subarray(a,a+u);a+=u;let m=null;if(a+4<=n.byteLength){const p=t.getInt32(a,!0);a+=4,p>0&&(m=n.subarray(a,a+p),a+=p)}let g=null,_=null;if(e>=2){if(a+4<=n.byteLength){const p=t.getInt32(a,!0);a+=4,p>0&&(g=n.subarray(a,a+p),a+=p)}if(a+4<=n.byteLength){const p=t.getInt32(a,!0);a+=4,p>0&&(_=n.subarray(a,a+p),a+=p)}}c.push({pack:d,colors:m,image:g,uvs:_})}return{json:o,packs:c}}const Ah="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAD1SSURBVHhe7X0HVJNZt/Y79sGCIk066T2BhCQUuzPq2B177+OMYx2749h7770riti7oqiA2BERld4CCb03ETj/ek5e/P/rWve/8907M3e+73OvlUUgyZtkn332fvaz9z4wzBf5Il/ki3yRL/JFvsjnIpFI7JVKidbDw6O/p1z1k07ttVqn81qt0XjOUas9Jms0mi5KpbLl56/7Iv9NcXV1bSmVSn2VcuVcL43mtk6jifTV6xO81OrTWrXmiK9ed8nHW3dQq9Uc8fHxDtV5ad976/XvtBrNEYlEIvn8el/kd4hWy2shlUo7ajw912o0nnf1Wu0rrZf2fjsfv9U+Op/v9Z6ecoZhmjEM05hhmPoMwzRgGKYFbjwez6ZdO5+2fj7ee/Ve6khPT9Vm9jlf5L8SDofjIhaL+3qpPc/pddpX3jptkF6vWaFTq/0YhrFjld6aYRhhu3adeg0ZMmTQggVLBv30089jhg8fNdTHx0fDMIyIXQzG11er9/HWPdBr9XPc3d3lIpHoW6VcPsdDKfvZQ6kcoVQqO3pKpVwbGxtc999XxB5iV4lEOFClUOzTeHi89FJ7HlIqlb4Mw7RiGKYJwzCCQYMGfb9z5+6V12/cuvb6dXS0yZSZZ0jLqDRmZJJMUw4pyC+sTEtNNz1//vL2ug0bfsJGYhjGwtPTk9ulc6fI9u3a3fLx9jnlrdef8dbrL+m02qu+Pj4P/Xy87/vo9c/0Xl6BerXHTK1K9e/jttRqdUOhUOijUMj2ab08r+h0XuvUSnUHVukOGo2u94kTp9ZFRr55nJ2VW0ZYqakkJC8zn8RFx5MX4REk8sUb8vZ1LMnOyDM/Xl1LwsOfXHdzc+pqZWXl2KZNGwuFQmHraumK4Ax31Qg/5XJ5qy5dfF3at/fr0t7PZ62P1ut8Oz+fTOw8jUYzVqVS2Xz+mf9lRMnnOypkksUeHspbHh6KQA8PeTtW8XYjR44cduHC5QsZRlNBndJN6Tkk6GZw2Y4tO9Nm/jzr2eABQ/d079JjW+cO35xt59Nhi593u3NjRo6P3rPjYI4xJZu+5lXEq4gGDRp4sy6JZ2FhoZTJZN46nU5n6+SEOMJhGMYJO6Xuc/n4+Ag7tPOb1ta3bZi3TvfCQ6lc+i+3EHKRyFMhk63w9PR45uWpHMMwDCzTslOnbwbevHH7jDHDVAEFlpdUkqePnlVu2bA1YWC/wRsd27SZxDDMIIZhujaysOhubW39HS7HMIybtXVLLKCiYb16E8eOHP848kW0eRFevQm/ezf42Pv3MY/DHoa9jY56a0hLNZjevY1JeP78xbOQkJDLp08HbJw6dfo4K6sWcFtN2Y/ZoHN73w6+3toHPjpdkqdKBbeG3fPPK4QwX4nF4rYKmeSAUqm8LBQKETSbNG3atMOxYyd2Z2SYiqG0yrIP5PbV23lTJk3xd3V0hUtSMQyjd3Z29hMKhV1FIlEPXEcgEHi5ubm14/P5XRDAhUKhg6urq55hmD7dv+195PnT13UbiEpFUSUxpmTRW9y7RJKVnmN+oJqQnOw8Eh8fH3PvXvCBGTNmfMsGfUgDnUYzyUevjdB5aYI9PT07fva1/klk4MD6crm4s0IhvaBUypeyyVLLvn2/HxESEv6+TklPQx+Xzp42+2R9hsEX9bGzs9MKhUI5l8v1hvKFQi4W4Bs7OztbWKutrS3Hzc1Nx+fzlTwe7xuBQODH4XA09RvVH9Cre/+9p08Elp4/c+HDuuXr3k/7acbl0SPGhowbNeH6+FE/XFy5ZF30lvU7Ui6dvUreRr4nBTnFpDCvhKQbTB+eP3l+9ddflwxjXRQzYMCAr/18fde3betb6KXxXOfq6gp3+U8j9WQyWV+5XH5cIhEtYLeyZP7chYvTUg0lUHxeZg7ZvXnnU6E7rxfDMJ42NjY8kUikFgqFvbhcrk+LFi24DMPYMwzTkL3mVwzDWDMM48IwjBXcEMMw8NWt7ezspBKJROvoaD+qVatWgxs3bjimHsMMxi5iGKaD3lc/rH//Pl0ZhuE3bFhvtFgoXN27e++AmVNm39uyYWdZxLM3pLaKEJMxi4SFhl8cPnw4dgTNrn19tUpvrfaJj077UKfT8f/j1/wbSvv27Rt4KBT9pWLpPpFI9DOLQDzXr99wyJBupFYf/iCscuLo8UvxdNs2tt9IJJJusGhYMsMwzvjyYoXC48Cho2NDQh7tCQ0NvxYTExv+OjLKFPM+Lv3du5iEyMioh0FB93Zs376rB/saYPvmbdq0cXFxcfERCASdPD09ezRv1dzn4rlLb86fu3B/ya9Lent6evZr08bFk2EYR+w4hmGG9+71/d7tW/bkpiaZP19aSlrJqVOntyGQs9+pmY+Pfheybi8PDwT5v69oVBoflUKxUywWL2Qt3+vAgcMX6lzOxdPnn0r4oqFApXw+X8e6kU6wTlj4zJlzta9evdqalJScW1lRSUgtobfajzWksrySVFV+IFUVVXWXIxXlFSQ2Ns54/uLFPT169FNi9zVq1EiABcVOgis7H3j51onjp8L8TwYkX7108x4Su8WLl/U7fPjo9O7du+O9NZbNm48b9P2wmyePna7ISDESUkPI69evH33//fd9GIb5Gt/NV6ud4aPTvfFUKv+ecQHEmUwmWyCTyfbzeDxAQdmePfvP19QSUvOxhpw4eOQJwzDtLCwtPcVcsZTH4+ldXV3FsODvvuutexHx+lBWZnYlqaklBbl5xJiWTtJTUkl6qoFkpKaTtKQUkpaSQowZRpKeZiBZJhPJMmWS6qqPdDEMBkPVjRs3/DUaDeBmYwcHB6FEIhm9dvX6kB3b98TcvH47cdeOXTemT/+l/+lTZ6oO7T9SffTIqRBHR0cdu4tUzSyaLR4zYuLrRyHP6DUz0jPyN2/eDDQGd8i09/Mb6KvXJWg9PeGm/j6i1+u/lkiEY5RK5W6xmANr5qxevf5ABayYELJ3287LDMNwW7du7QUUIxQKO9jb23vBp1+4cHlBusFY9vFDFSnIySPpqWkkNTmFpCQkktTEZJKWkkqS4hJIYmw8SU9LIxlpBvqclHg8nkQyDOkkOzOLVJZTNEsS4hMLdu/YC6UxTu5OXm4ct53Ll66MvXn1dkWvHj0Wr12z/vL+vQeL/E+efXdo/9GPWzdv33Lo0PEpp06d/lnn56dgGKZvxw6dQ48ePFUNxFRYUEQOHTgElynANX19df299TqTVqvF7vlbyFcCgcBXLpdvA2SEPx4zZtzmjIxMqpCTR44Gwd86Obm1F4vFFMFYWVlpLS0t1XfvBAeVl1eQitJykpaUSjJS00iW0UTSkpJJQlwcSYpNIGmJWIB4kmEwEENqGol//56kJCSRtOQUYjSkk8wMEzEaDHRh8Dfqpj5+JAGBgVvw4cQKsUdbve/4ju07LsNGnTp1+uFtW3flnzh6smrPrv05Rw6dSL157XbO0iUrU2ZMm7EaAb5x48bd7O3tt6xeuT4lN7OIVH34SA4fPrq9Li5467yWab3Uid7e3uCi/neFJdV+lUgkM5FgeXnpJz95/IyinTvXbr5o1qiRqE2bNp58Pl/l7u7u1bBhQ3mrVq28g4NDkvCcnMwcYkzPIKb0DGrRUGJqUjJJjIsnhuRUkpqQTFISk6jVp6em092QAfeEnZCSSndKcnwCMeB1iUnURRUWmJPqe/cenAU7am1tLbC1tVVwOBy+lVWLb0cOG3V22uQpj4YNGbLq/NmLKRfOX47Zs2d/4u7d+05s3boPZKBNw4YNPVq0bLng5ymz3hnTTKSqsops3bp9E8Mw7vjeOi/1Th9vfahEIvnfI/eAj/l8fg+JRLJFKBS6tWrVSnbrZlAcvvybFxHpvhpd90aNGvG5XC5PKpXCb4rFYnnbly9ev6qtIdR1ZKSlUeWZMjJIZoaRKh4Kh5UnJyaStORkuijJ8YnEaMggpgwjdTsJMbEk/n0M/YnHccNj6SlpxJCUQnKzzBRFWNij81iEZs2aWeNz8PlKICCQcGqmAaPXa/UzFs7/9d6JoyciD+4/lHbG/1zS8uVr5syfPx9gwcaiceMxY4aPS0+MTSW5Oflk9uy5ixiGQV7CaNVeQXqtHojpf0d4PJ5EJBCs5HK5QAbWs2fN21ZR/oFkZRjJT+Mn/gi62JXH8+ByueqmTRsqdDrf7iEPH2VWf6gh2Zk5xJRupJYPS4ZS4VIMKak0BsANweXA0s0uKIMkxScQk9FE0tPSqeXjhucnJySStMRkEhv9jsYMuCPcCvPNO+HGjdvXkIW3bt3aAciIw+H4cjgcGbLrxo0bf6NSqX7cvXNvWdDt4OLT/gHxe3bvMwWcDnwzefI0GTZ5vXr1fpg5bW5sflYhiY9NKB8wYPBI5CjIXbRe2ihvb++en+vmTxc7O7umYoF4sEgkmtW6NdO8XbuOvaOi3pZ8rPxAjuzZfwLQksvlSvGFW7duLbK2buMZHvo0pbaqmloqFiAnK5dkG010J8DFmNhFwA0KRBA2pBoo+klKSKI7I+7de7o46fD7hnTqfpITk0hyQhK1fiwSdWkZRrqA+bm5dBGuXr16AIkbsmdAXxgFsm0ej9eLz+dPW7l0ZeTaNRvC16zZcOu0f8Djyxevpyz9bfki7GDYWrNmzSauWbExtfYjdlV4nI2NDfIIRqVS/Kjz8nr0l5dGXVxc3CUSyRKhUNgbgXfnjj238UVfhD/OsmpupXN2d28LDsfJzETa3w168KCipJzkmLJJpjGTKhxWDbcDZVHrZ9EPhZ+wYkM6SU1KIQmx8SQ1OZUqNOF9DLV43K97bmJcHDGw6AiLkxiDmJBKFyIlKfnTTti+fftcmuiJxV34fH5/WLBAIOjMFQp7N2rUCFl5R3t7+x+PHD4ec/rU2Zc3rt4kc+cumLtyzZpRgNVubpyV/icCKbQ7ceLkLTYzr6fTej3SajXjPtfRnyZOTk5fi8Xi70Qi0WIXF5c2arV21LNnEVXVVVVky7oN8xCMuVxuVz6fD9bS9tSpgMAP5VUk25RJck1ZJDczlxjTjTTYQtFQEoWXrLsB5DSkmP06hZopBhIfE0cSYmOpy4JyUxISqPKxaHShEpMockJugAWibg35gtFEf5aXl5P09PTqPn36gPBzFwqF3yMZZAk+rUgk8haLxR5WVlZ6qVQ6PvDMucorl67VHD183LRvz8EzI0aMGA9qo0fX3idSkzJIUWFx7aRJEwB3G6tUsu90Ws1NNgf580UkcmkjEAjG4wZl79i+5+aHyiryNDQ8sxHDiMHPINGChcyePX+20ZCJKhbJyjCRzPQMkm1EZSuTKsaUYVYQFEeDaVIKVWBibBxJS04lSYlmlIPFgnuh6IhFP0bsEnYnUHRkyKDXQL6QaTSaFyclle4yLC4kIiIiyc7OTubo6NhRIBD0Bf+EXezi4uLp7u6uQNGoSZMmfh3bd9y4f8/B1F8XLl38y6w5x84FXjJyudxuLVu02Lh86Wp6sQf3H7yoI/D0Wq8bWq1m9ue6+jPkK1dXe7FAIJiCTFYolPqEhT4pr6mqIYf2HABCgJ/t5uTk1K5BgyZ+QXceGspLKqjFw+fD/UCBUAhcBDLd7MxskgSrB5JJz6ALAIVDmRSCpqTRgA0XA6XTGJCSSu9jx+AGhGQwpNMFwvOxK/D8nMwsurjmuJNFF+Ho0WM7GYaBEXWXSCS9sRPqblwu11MgEAyyaGHRbfiQ4eNOnTz95sK5y0X79uw/wzCMFDUJT5Vmx/PHESQ/N796vBlsNPH09Bzk5aU5plarQRr+eSIUCptDwTweD9bf6tdfl+yH9b99HV3Jc3X1aNKqiQvwfvPmjYSzps8bk2HIJLlQfIaRKiLLlPUpyBphqbBO+G7WcuvyAcBLLBQCsyEZUNWcqFFrR1acYs6YEYBxP9Nooq6MLgDcGnICQzq9Hn7CFRlTDaSirIzEx8WXyGSy9s7Ozlw+n9/Pzc1N6e7uLhCJRHoej+eBOgOCtKOjY6cFcxfsOx94Oeb82Qtxt27cvnb+7OWpDMOMXDB38Qss5q3rt5/BKbRRq1GTvqTX6/t9rrM/VOzs7NzEYvFklnBzCDh9LhQf5M61m7eB85EVA97BNZ09e/nhxw8fqXIAH+toBEMqYCcWIJ3uArMLMn2iIXCDsrELkB/gcQRdPD+VzYJNBgTYJLpraBIGpAREFI9EzQxDcQ3qhtjdBniMG+TixYsrgG7c3d3bwurRSYGk0t3d3Q7xAEbm5uYmBAWxY+uuyEsXriTduRlUsmDBovGWlpadNJ5e/q9evCFFRUUfR48eC2NsoFKp5mu12hVLliyp97ne/ij5CvhZJBINcXd376Xx9vZ6EBxSWFZSRjat3TStYcOGKgS0xo0Z3tCho4fEvI0judlZJCc7h/rzOl9PMX86i4AMJpJtyqIWCn4Hi1AHS+vyABqI2UWgiRj+lmxGRzQ+AIbGJ5LE+HiaB8BdxcfE0oXH++CGa9KcI81AaqprSHR0dCTDMJ34fH5bZOkwGqlUCq5KixuYWpFI5GllZdVi5LCRw65cum4If/S07ODBw1saNWoksbCwGLdj2950LObp0wHguqw9FIpuak/PEyAmP1fcHyJgOfFBhULh5GbNmkmmT/9lTlZmDkmMSygV8Xh6e3t7Mfwodsaxo/7nKsoqSV5OHqUO4EKgBARg+G4oHPHAlG7eGXhORlrGp/iAHQOXAmoBSqeWbUinf6NkHc2WzckaLB/WDuUDLcW9i/m0gOYkzkxd4H3ycvNIQV4+yc7Krh06dOjYpk2byrhcbgeJROKHwg4bCzhAechhsDhwtQf3HQl5/OgZOXjgyDMLCwv8zW3IwOFniwpKyZuot+ktW7ZUcLlOPKVScUmlUnX5XHd/iDg5OVnBOiQS0UognHVrtlyDBTwNewI/2Abb2MbJhmdn59jpUeizovLiMuo2YOlmazSSjFQDdS1QGCwSCZYBdERKKpTCYv8k6irM/A+QkpE+BkvH8/CcuhvcEfx+LBI0dmEy0hGAzfAW70tdIFxQZqY5FhlN1A0dPHh4I8MwHjAqLADrPjvD+sEb1VXoYPH9+va7v2fn/pqb1++krl27cQmYCMc2jhNv3wyuKi4uIRN++GEiPISHh/KoUqmc8bnu/ihphORKLBaDWZQePeKfCK7//NlzR2ERgHCIA9Onz56VnJBWk2PMokE0Jwucj4EYUhADzJaIv4MHqnM3cFM0IQPOh5KxIKZMkp5sRjRQ3ifkxCIcE6BmSirNjgFbcb/udzxe5+7wfsi4oXwsYk5WNqmtqSWRryJPwXB4PF5PsVjcji2L+qA6h846gUCgcHFx4bi6unbs0KFDnw3rN5+9dOFqasCZcyFff/01YHa/fXsORdDF3H9wN4o3MplsrFwuXySRSFAN/GMF/tDFxUXi6ur6na2tQ5erV28X1NbWkiN7Dy2GD0RBvXHjxu5HD5+8i8QL1gjLrUM2UMonv8wiFCg9NzfP/HeaUCWT3OwcugOwS6AsvC4lPoE+BwuGXAEuypiRQYNyeoqBJIIngoLZ5I3SGnVxw2gkeTm59HH8xDVR9Tp/7iJwPJoAfLAACMZAQuxCdORwOJ2xI1hQ4bBp06bfAgPOvz/tHxDWoEED34YNGfmsaXOufaysJmFhYW9Q2PH09FSr1eqT6Fv9XH9/hNQH5+/m5jxKo/Pt/iT8JUEhZdWKFUABLUFPIMkJuv0guTC/iOTnFVC3AGum1DHlbBIpjqd4PjnFbKVpBmqdgJhQfn4u4obZ2oGCwAVhN0CpeA0N3qAZ4L4opQH8H0djAeIAKmo0JtTVDNjqGa6LGxbxQ2UFefHipQkQ0tHREfCzPTgiWD2UL5fL2yEfwALw+fzvbGxslIMGDNr89MmLwqA798KGDx81AmioU4dvN8e8i6tNiE/IR+uNkMPRKOXyqyKRCETeHy8ymWyym5vLtM6dvx0e+epNDRKdyePGgQ+ys7W1lctkHt4h98OLSgpLqGVC0XXJU50Px2J8cjepQC3mekBuZhYxUHxvLsxQ6EoRkxHlQTN/xC4WMmq8BtYM60eQhrLxPkkJiebXZZgREBaubvfglmU0kuKiYtATNUFBQUBD9q6urkBCvgi6YHc9PDy8EZRxXygUDnNzc+ut0+hGnDkdEI9dcOjAkQ0NGjTwE4kkMyNevK4wGbOqBw4cOPTrr792VCkUJ0FrfK67P0K+lkqli9A01alTlxnRb95XQgGzZ8zwbdq0qRQwdODA4UNfv4ymnA8wuJEGUsDJumTKQBUHRdLMlrVg+PfiwmJy8ujxtJD7YR+waFAaFA+6ApaN37FD8J64n8Vm0ligOiobOwJBnT5uMiu9brHrdgHIOVAjSBAhx44dQyXMRSKRjEG5FP6fXQgsQje4JLFc3N3FxaXH6hVr3wYFBVevXLlmjLW1taeFhUX3W9eDCqqra8iCBQtQlGoulUq3y2Sibz5X3n9LWrVqRYk1Dw/FOI3Gc5tYLNxkb28vGTRo+AxDakaNMS2jdvzIMWgbBBHFnTlz/rT4mCRiTDPjfHNh3Zx4JcclsBUtc1Ck2SmrOFh7eWk5mT9nTuS1K9dLivLzP2XPda4IisTzKKphGVQ8B4/D8hE3sLh4HIuEG1yXOQPPpL+Xl5STiOevyfo1W0uDbt2vRSwoKSkhv/wyr4ODgwNqF12BfkBbIxuG+2Fdk5+1tbV6/ryFB0/7B7y8eO7yS0tLS079+vV7nDtzgeYD69atQyC2UilVmxQKKWoG/z3hcDiWsASxWLhQrfY46e2tO6VUyg95eHj0srW1hKKtO3f+9sf4mMTq/MxcMmn8+BFohoUV/fLL/DUpCQZKH9RZdl3AhaIpWmEzVPhoaqE0YKaTyooK8tvixY8fBoeWFeUX0KoWAiiUTeEkUBF2DYuEzJZt5v1xDYp06hI8lvvBDW4S10Lh/t6de8XeOu91lpaWK2ZOn/Ni2ZKVKVcv36jYtWvPbOQ2IBERD8Ri8SBQFICkQqFwAEckkllaWnZcuXzl/vPnLr7bvWtvIJhTMKsnj50JwQLs27f/MHaAXCxdJpVKBw8cOPAfGxYBdHJycnJUymQ/e3lpHms0nge1WnVftVoN3ht9PrZSqVS5Y8e+VQnxSdno2SkpKiHrlq/u3bhxY3SruY4f/+PcmOj42rzsPBpUaZIFZdWhEtZNYGeA06GF+AwjteCignyyaOH8ExcCr2QU5hWS7Cyz+4DbgdIRxM0B1UQLMnU7o6iwiBTkFdICPoJ/QV4ByTKarT43J4e+Hm4nNzOndua0mWgY85QpZT0aNGjQHt0mrVu3niyTyVaAA2JzAV+4ISAimUwmwtgUj8f73tXVdciA/gNW9ezZD6wn4kX/Rgwj2bBucyQWwN8/AAtgIxQKZ4tEIlTJ/jFKQqFQyDQajxEajeaAQqFAcboemmDRyTBn1sIJW7fsvnT2zJWC99GJJDEujVy9fLNi7+69F/v27csFR4Sd0aFDp+nPn0XUgF4A+QXFptUFXyg+OdWMglh8jvt1MDUvO6d22LAhe3ft3J9cmF/IupNM6qroroGlm9A1YWZCiwqKSEpiGgm6FVyxb+9hw8zps8mSX5el7N6+LzPy5RtadSssKKR+v7KsHFDxLWrBAoGgD4fD6QdIDQoaSAecDyp4aJuRyWQKLAaHw+mOvIfliBSIBy1btmyPTNjV1dUDBB4SuW2bdoSVl5WTvXv3HYQhKpXKXdDZ5/r9LwVElFKpdMRqA4YB03I4HNuePXvPWbFs7dtL52+SAP8LpRvXbr8yYtioTba2tn3Rj89Wx/zgEzt16jbg4YMntPJFAylKg2ylCz/rAjJ+pxAVik1JpW6iuKi4dtKECbP27j3yABQ2Wk5ysrPpIuHxvNx8WqwxpRpIVkYmuXLxeub4MZOC+HzhVEtLy4HW1q1QIFHUq1dvXL8+A4OfP4moqSgvJ4X5+aSirJxs2LABNDS6qzVQKizdycmp2/Dhwzvcvh00x9XV1Y3P54sBQ8EDCc2iAUPK4XD88BiLlOg1WJqCd/yofwjaazZs2PQbFkChUKzS6/Wb1B7qpTweD32u/7hoNJruKpUKRZfBo0aOe3zy+LnclEQDiX4TlbJly0bATipI2YGdBQKByNnZXuPs7Nb74vlrefnZBSQlMfkTzqdMZ2IS5WZoxYoWY4wkncXquTm56IL4oNFoeq9ZszG4ML+YTZpyqO9HgQXPyzZmkRxTLjntf9bQpEkzuBC1g4MN+kG72djY2OPzODg4+NRrUO/HyxeuF5cVl5KPVVXk1atXDxCjQJdAcfD1uN+sWTPR5EmT59wPDknDLnB1dfVG8AX8xHNggFKpFBxXOywEdgESMwRlFxcXNGeJ7t55EPOxqpoMHz4K8wzCpk2b2rVv317v5+NzTOvlle2h9FiGCdD/qOH/RFBudHBwwHAcpJGnp+d0kUi0burPMy9fvniDJMWDJk4jL549OztiwADaqOTq6oq2xO9EIh4UItixbW8YfDGy2qQ4c3mQJlSJKSQxxsxY1vE44IWM6WZ2tLiwiEyb9vMyrZfP+ajXbymRB6WDykCJMj8b2Ww22bxhx4kWrVp1hfVKJBLARSkUJ5fLwePoUSaFb5829Zd4LCTYzzdv3oTis7EWDb6/D6wc7mTJr8u2v4qITGvVqqnMxcUFHRMa5AUoOMH14D52BVsjUMCqAVGbNGni6u7O7wJUBUmIT4hYs27ddHwWZM7QTXu/9l30Xjp/vVYb4+GhRE0and7/f0EwRh8++0W+UqlU3/AEvMUqper4nFm/JoU8fEbKiivJ26jogiuXzo/FaywsLOzZLSmdN3fR9YJc8wJkZpj5nKSYOIrn0VxFs1d2V2AXmNsQk8jHjx/JGf+TaGnve+JoQGleTj7JMpk5/NLCYvLsyfPMUaPGLWcYBn5Zg9lgmUAgcnNzc8UOBFGI++zMsHLixCm7M41ZpKigkHyo/ACcPgKKAWWCPiaVSvVd/fr1e+7atvdI+KOniA9OXK6zlHUzOvh4d3d3rbOzsxTgBPUBmUwG14Nubhe0t6jV2plbNu5MfRr+ki4C6h8J8UmpgYGB23U6HTwFneJs1853kF7nFaFRKVb+Lp4IQ3Xg/gFH8btAoHAXi4VzODy3HX16Dzi7f+/xGsxy1XysJY/DHx8HdMXzrK0tPdu27bgyLORZTWlxGckC2cbGgjo3BIVDqTksvVDXFwQYevnyZRR2vBbMX3YoP7eQPl6Qm0+iI99WDh4wGCVPiUgkGg2XgMobqGS4QFgkFAarhQVaWlqq1q5evzU/N58SeZDQ0FD0BwHNWXG53L5cLndQ48b1O+/YvOPG68goI1wU3BcsHu6GbVvpiYCLRcP1WToe4iASifqhToxRKo2n153lS1fFPnr4mI5bQS9paYZcf/+AHVqtFnD1a29vb1e1p8crhULx+7NkiUSCYNUdAZrH4zVWqVQDXV2dF6jVXod/W7wy6+lj8/aLi42NP3DggNrS0hLjpup9e4/EQ4Ho68nNzv7UdkJruAmJn+iHT7SEwUDKikvIk8dPLoDWGDRg2NrYd/GkIDuXvI16k9e+fceVSP0RCOHuwFrC6qEQuBRYJRImuCQws+fOnttfXFhUDQQEmFpcVEQ/5/17D8OGDRvWCi6lefPmwoYNGw6ZP2f+o49VH8nu3btBI7vhmnK5fBh6WdnMeDSujffm8/mOuKHLzuz+pM5wa9bWrZCMjnJu47xzyqTp2VEv35JMQyapLK0i8+Ys3k9tWCDoLJWKl4nNNZPfLyjEIPjgA+F3rKBcLp/r4Oy8aOCA4RHXrwbRL/cmKjqKbWQSzJ497/DD4EckJRGEGxIks8Vnm0wk9l1s7ZvXMSQzI4vkZ+fR3QF0g8bagIAAWHnjaVNnrchIM5Ka6mry7OmzQJB9SJBYJAJIOBRugvb1cLlqZ2dnzIypkCyNGjWq46OQx8Wo1KH4UphXQBHV+jUbDZMmTo5bvnw57Z5WSaWAih2OHDxyC58/NjY208PDAxQ0cgHUvRErpGy50hcZMmApPgeYUycnJx7cLtwRO8HDmzFjxvzQBw+MyJFKi8vJucBzb7p27TpBIBBMQN4g5fPFUjO7+o8L6zt7YUHoNIyHx1Q3N5ff2rXruCcs9AVJSUqp7ta5sweqTH5+fksO7DtUFPH8dTUoAIposrNJaVExiYyIKB40YOj5lSs2xEdGvCOpSaAmskn8+1hD584dMatld/vWvSBkrmUlJeRd9Ls4T09PubOzswaKQZIjl8vbsgUTT3t7e1e2m0FhaWnZ5bvvel6+cyuYIJdAo25ZUTF5/vQZSLeB6CA5evTYndCQkKg3r6Oyo99EP8jJyqnKzzPPHZ89ew7HHTjjWihXYtQV7ohtWekIRARICneE90SXNwxu5LBhA58/eX6XXgRFqscvy6ZNnekP2MvjcWZIpVLozYbn6qr/HzX0SiQSK2SJwMwI0CIR71sOh7dyx7YDJVUVH8mlC+fmIyDb2dkhdnRfv277i7LSCpqZonUkLyeHVFdXk4S42GBPleePPJ5k3sQJP769dOE6WblsxWlzoiTpdO/uw/yy0jLqviD+J06g8wxFn95gKVG/hY9GZwOaq2ChbDZu07l9l3UpiamfiDcE4X179q1ljzawXrxwaSg4oNIi2sRN0Re6NaiLuv/wECwZNAQCPXYA6+aQC8jwE+4HLgmIqH/v/l2uX75yC601kCxTDtm9c+8jkUA0oWnTplN4AsFPiBfYpQIud1BdrPyfylcoT+IO0ISLi9PUqVPnPCsrqSLRkVHB+JL4kA0bMlK1Wrfq6uXb1fnZ+TQrRVaL3QDJzMzMDQgIQBfyIAcHh9murs7LuFzuQpVKPepe0MNKZLpQIlxTWFjYQZQB+Xz+RLgBlUo1DL4XC8HhcOB/W44fP54q5taNO/fwGlg1lB8V+bpEq9UOAHtJ8wQ7uzm7d+zPBDFXVFBA8nNyKaUCGnzcuHHjGjZsKEPghWtBAzLeg8X+nVEPQVxwdaUjteKwB2GUhigqKCGnTwe+GTRgyPqGDRuO5XK5U0DbIF6IBeI+bJfgP0ZN/B5p3VrYnMfjLf7mm25X7wc/qjKmmyp6de0qtbBoiTdviy0/dszku2kpRqoMKD8fRZecXFL98SOprakh5wMD17ATkchA0cb+7bEjJzMqyipogEY2m5iYmIvd0aZNG1SrNKAL2L5UlEGtQ0NDxwWcCbi6ZeOW50UFxdTnmxevklw4f/5KvXr1xqDCBUvERv5h0s+nkSO8fhVFnj+LIKmJGeRC4NUrKHkAScHagaxcXV1FcD34Llg8lhfq2diysbu32nsgGgnKyirI3LmLjiGecLnctUqlcoSDg6i1TCjUsA3MgPN/mnwlFPLG8Xi8344fC6hC3/+lwEDw4q3gN9HyZ2dnt2z/3uN5HytraXIF5edlm0myspJSUv2xmsTFxhknTZgwGVBQq9UOfPXydUkx3TFmShoSFBS0h31PpZWN1fdQ/KJFi4a/i34XUFNTQ9LS0kpM6Rm1CLpwKVjw9DTDx+HDh8+xtbVFL1MffB64mEULFi/ctWNvJI8rWt+9a88LgwcPP21nZ9eDx3Nrj4XicDhAPTrW3VIKguWNfNlr2MybMW81Pld8fMIHsVj6I4/HWyWVSufgA/Ld3GCAQGR/niAQYwHc3WkfzfxZsxaE5+YUkndR0WHomEYSw5JSvJ49+wWcOHY2PzsrlxSwXH9pIci0dJIYn2p2SSZT5Z3bd0Lev40pLSkqplx+XfGlqLCQVFZWkufPnz9YunTp9D59+ny3a8euzSDcSHUt9fWIGeCMUKSBu/tQUUkiX716YW1tPZjL5Q4GAYeZ5AYNmHbr16wPTjekp0gkAuB4uAeZO98dgV2DG3YALB4ddOxguAR/xyI485zB76j9j52+iM99905wopWVlU4qlS4XCATuYAb+quFuugA8ntzJzc1lU9euPbY/uP+IFObkkw0rlnQAJyIQcPzAsuIDu7hwZwfdeVgDC4WCn4U/LRs5bOyd9eu2Z6K/htRiLpVQRYJ2NvP9oCKyKX0BlwIpLSklRqOpuqy0lO6kgrw8UlZcTINqESpd2Tm0DlD1oYoEBgaeRPBly4wjJkyYgP5OweQfpgTduX0vFI3E6AFCiyLL/SPTxdEIyH2A3fFaxA56dALiAeBus2bNfMNDH9PzD7Zt2w334yISCWYJBBxfzE58rqg/U1B0qC8U8oYJxdLlWzftMiIgPQ0PR9bJoMkJXwapI/z1ogXLX+JxZL3r168HMnHg8QR79+4+XJFlzCXZpmyKSoCW6ron4IIQO+p6fBCcUb7EwmB+GK+7d+cB2bv7QO3DuyHVKOZg8bAAZ86c2dykSRMfCwuLbucDL5xZu3YdGFHhmhVrdm3bsgO0hxtaT2DlUDxbDaNkG1AQEj6pVNoBO4B1Sd6WVpZdRg4ZPg6fISU5tar7t91HtWxJY95ELNrvohr+QKHkEoIin89f8/33gy+Ehz2rLS0uIWtXrsQRAU1YTkXesmVLuUgkmXf+3OUPsJzg27enAEm0adMGvnnT6FFjz8+b8+vT6NcxJC87n8aHT/VctiIGpdMeT6OJoPPu7p2HOcOGjvZv0aLVPDcXt6lPwp/kAwFhobCjnjx5gkEKkGNd161a9+TKpSuPv+nceXFaaqrp7LlzY7A44JBYKkPBDm2gaxqURx0rCuhJKQpwTYhvWzZuoQMpIQ9DY+gcnEAwiM/nj2ZrBH+5AF59JRTyx8jl8t27dh4s/VhVS6KjooxWVlbon2/KbmG5hUVDpV6r37hy5brw5UuWj8H0IqzM2tEaGbS9pZXluM6duj44fOD4h/ycAlJSWEQL83VuBXwS6sUlhaXk+DH/9yKRZBaS2pj3MTvKy8qy8Ly6/h+4uZzc3Npbt24d2LNr19wH94JNcFto5IVcu3YdqKcVyDYEV7ZLGpkuKmHfADqyjGhb8E7IfOFWHRwcujwOe1JO3c/WXXstLRtzeDzeZAGyZXN+9NdKXcAB5sXUTI8efQ9fvniTHjPw5HH4XXbcv4VUKsTxAepGjRrBHXk3b9WcUsjY7mIxaBY+iDRV69ath3O5/D2bN24vzM7MI+VIyFDbNWWRyrJKEnz3YfFvv664Y21tDUrBa96chXvLSj8QcP/glGg92JRF68llZZ8O3yLlJWU0joCeAO+UmJCY0bJly7Y4pQUuiFU+FzQ1biz3QzNfMKEshHVcOHf+MnBLMe/jK3t27/k9BtAFAsFcBO4/Bev/TqEFaKVSOcjJyXHTqBHjQl8+Nx+k9Djs0U2FQEDna+3t7W3wJR0dHZ2QrMHPwrqgeMBEZ2cbIIwmFhYN1W5ubptnTJtdGPrwSW1CfAr8LdmyafsVoUC8g2GY79q0aYPMFrd+J46dNpUUFFPqAQrGzADtxGNZWGTi5jkC87QMrTNk59bOmTNvQoMGDeCC0AEBQs8d/r6uYoZFwd/oLrW2hntxCw4Kpj3up08HhMP7Ii/AbvlvlSH/QMHKNwCNrVKpVgoEgvVTp85+9ij0OcH0THRkZP6RfQeB3SFf4wuy5wJ1YJlNwES/H374gX/x4hU8D7vG3tHRfoRMJjs4bNjwyN69+z1q2rTprDZtbLqCBm7RooVm5syZ3QIC/EcMGzzyLLh/IKK6/h9ajWOn79GPhBEp0Nv4e2F+Qc2l81fJoQPHMCeAQg1OWsToKog4BdwNaxyU6gYkRcfDrOmzZn2o+EBMxkwyZMiIudbWlmjunckmbX9OW/rvFZTv2rRpY63X661UKtUOa2ur8XNmL3r2LjqRVJZXE7CTTx4/Clg4ZyGOpgGERZnOFlsX1gOqQKvWz42NSSBRUa9vDe7TB4dotBKJROhGRjHFBaSWQqH4nuV+OvbtO2Anzvp5EHw/wZCSVktrxzk5NB+g/UHZ2SQnM5vCVSxAwvuY2oK8IpKakkGWLV3x2N3dfQDbFSeqqwOzLrEPm/VKwLTiQEAsVHhYOB1EP3vmQhwqt3RWjkMhqxbG97lO/mqpB8WA9cOQglwu345R1qFDRwecDbj88f3beFJTVUvrAS9fvLzkf8J/XNeuXYHLQXmjzNfH0tJq/MUL1ykzFvUqMrtl06Y4QKPDmjVrZr549mwB6r4YDkGgtLOz08lk8tNRke9pvEEyVtf7iT4gGrhZCIsuuOwMLEZO9e7d+9P37jn4cejQwdu7deuGkqMH4CWuiZ0A1AOXAsXDNaHpABT5quWrNtRW19KJ+dEjx85HEwKXy53Exgdanv07CBp40drniBMIJRLJFDc3t7noFJg2bfaTa1eDSF5OEVUYOuEyM0wV5wMDZ8LC2OEO5by5v74syC2kXNGriIh7QbdujXv/9j2dz126dOl4nOOgVCqlcF0ajWbwkt9WPXl4L6wiIS6FwLqxCClJGNhIJ69eRFZfuXSLxLyLq163ekNVUmJqtW8771/WrV0ff+7sudxD+4/gekrMDuMgWSicngAgEmFXtmOPUHPWKXS6pPgkyiKeC7wcg+AvEAhGsp1zvn8H6/9/pR4CK1tTZjw8PL5Xq9WHORzOfD+/dltWrdr44uTxwKrnT6NITTXBOFERzoNDl7KFhYV62LCRu+Njk0lJsZkuriyroMkZzhLyP3kSwyGoQqFptmOLFi287OzsBj0KeRwzZfLPD5ctXf0WHXszp88MPXTgaNKdW3dS2vm2vxX1KjpLp9VdePUyqir0wYO3a1esTSwuLCV7dx/ErBuK8RwW7dA2dUBS82I40jHUaxeuXMdniXkfT7p27T4dpCCfz1+IbmgJn1bh/n6CBWAPZQI6ctNqNXMkEslvzs7Oi1xc3FYOGTz6QVxMCiXo5v7yS3+M+eDAD7Va993jRy8qS4qLKaVsJu9y6SGtd27fBrUANwTLVNvatu7cq0ffzc+fRZK5c38Zr/PyXZWTnU8mThw7bfWqtRdys3Oq+/cbcCgy4g0JCwl79zD4UWF+bgHxP3GmfNuWXadat24Nqhg4H8FWLRajYCVA5wOCKxCW5c5NO+egqA9j2bB+60VAUaFQuBDHHLClyb808/2HBLwIfCibQeK4FFcPD4/OfD6nv0ymWHHj2t0qtI0cP3oUmN4Cwx/29o79r18LKqL4n7YlptfevXW/Fr03ka8iMFTBtbS0dGMHK/ryeIIlvr5td6m16qF6ne+l69fuVE+fPnVPnz4D/BMTUkiPHj1urF65rvJcwEXTujUby+bNm/fWjcPBeBIKORQGswwoWla4cEGsT3cZ0H/A+NTk1GpY//Vrt402Ng4+mIF2d3dHqyKlMT7/zn9H+Yp1R58OQ1UoFL+h3+j8+auUYbtz4wbgoDWoXgsLi1FHj57KKy0qM0PI9PSPSxcvS84wmNBFlyOXy3ujfx87wdnZuS1aDD085J3t7Vu6AtVYWFiMt7GxGalUKsd27Nh5D5frNsne3nGUo6Mj3A0qa531er0WcQSH/LHWDvCAGjC4fyWSRalIOirufSzlwh+HPyXt2nVYgXkxcD4I0MD//7QHvEokkuHu7u4r1q7elI+A/PzJkxuApXAtLVo0+3HXzv0x5aUVFMeXFJfU+p88+fTF05elUMaKZUvWrlq19vqd6zehUFTmODu37QkJf/T0HNolQ+7fHzJ72jSFWq0aOGXSJA2H4+K7asnyvl5entOuXLzSa/bM2T9s37br3IABA+ROTk7t0VYJFFTn9wF9+e7ubSOePU+gfv9tfO3E8T9uYRowIOZ+xPNAO0jYquA/pcB6HB0dl07/+ZfQkqJy8u7Nm3jsAGTKTZo08B08cMRjxIeyolIKI4sKCmsyjaYaEHTxsbEZo0eMjkqISSSx72Pe9uvde8juXftTjx07ju6Jnx+HvSCBAYHHfhg/ec+76Pcf+/bqvyssJJzMmjnz9rmAC+Urli6L3Lf3wMGWti3lyMjZdkUM6WFXcTv4+XV+F/WG4v2crHwydcq0I2g4k8lk82VK2QjwPQjUn3+nfyoxdx1w14wdO/FMUoIBSs2zt7KStGrVSgpyrHXr1iuWL1tnev0qhhQXFFM+CDi/rjoWHxtbnpiQQM+wPLzvQHbk89dlCfHxCXNnz753Lyi44tbNm1eGDhq6Ly4mrmbm1BlnIl68Kj914kTwu+j3NSgIPTW3ushANSMrt7GhFIj+lxkzBiXFJ9I8JDszn8ybuyisWbMm2CFTZDLZcAcu11lsLrX+c4tcLudwue4LBgwYsink/pNqzBNsXLXqm8aNG/PMR1rai5s2bTK4V6/+97ds2mUMffCUDlhgAA+JFs4MRXzAoqQkJVempaTUYGAQ51bgzNGM9PSi+JjYgry83NqUpKR8FHFQOwAJB7Lut99+G41MGpSzhSUdvG554uixdbgOlJ+SlE7mz/0VNQ1kxSg3InY04vF4A9A/+/n3+WcT1BC+UsgkK8Vi4aLT/oGU3Lpz8xY6H9BpIQQ7iuBoYdEQbXwdevcc4H/vdujHksJiiozMZ8Oh99RoZkuzzaVLEHFoBEY7OtxVMSplJaXm2bLMLLpg796+ywfV4ODg4I0DOdrq9donj8LvoEEA7SoPH4TXjhk9EcMWQFkLcTQDMnuhUDjwX0H5n0QmkYx1dXXZunjR0ggjaILsnMofJ0xQo78HNDUmVJDmi7lc0BXSXr0G7XwU+pIgS0ZcoBMw7BwYBjnMNQPzcDZ2B+YQ6BwZhvvY52HnvH/7/nGTJk2GIQBrtb76iGcRtLSI5oCrl29ktfXphOaAdiqVYh3aUNg5uY7/62TbHy1WPPoPfOZ6aXTrrl81N5W9fvXqOfIBwDw0NLF1WbQiouNZN2zoOP/oqFiz1aNgzx57Rsda6VBf1qdJSnRg4+9ob69r0qpCoT7y9XtQCej/GTV83EI0EeOA1h3b94Ta29sPdHZ2/kGpxJEDai2UjoTrryqy/+Uil8vRM7lmzuyF72LfJ9NFCH1wDx1yCNRo8EJZEPwMGnBVjRs3nDBv7uI49BnhpF0o2qxwnENkPhUFB/VR2pmOtZqZUNqPhEbd/AKSmJhUwf5vAM3iBUsOw/JfPo8sYOoxI/h8/lKZTLYZiRg7MdOW7f741xRMjigU8h18Pn/OimXr0w0p5oM07t2+vZV9Sku4InQjgB4WiXjfWFlZTV+1fFNCeloWQdsjhjZAZ6AWQCcr2YlJHJNAZ9VYN4T5BNrqkp1NZsyYMRw01aG9h0/T+HM7ONHS0nKAQqE4UpcJs023/9JCy3c4p0GplM3z8tL9euTQqarSonJSW11Nbl2/DvyNSps1mFJMn4vFKr6dXSuZjY3NnFEjJ0QdP3a6eM7sRVXXrtwhJlM2qUDZMcdcP647Z6JuWBuTlB/KK9FKn6PRaHrVr898t2vrLnqC7/GjJ0Nx8rpIJJrBVuf+/v8v4A+Q+nW+VaPRTMcxOJ07frP2xLEzFXnZ5qMmn4aH30AswHPYNkH069OjkNF57O7u8r2ji+NEhVwVvH7d9o9Bt0NIVmYeAY2BqRr0fpaVlpDS4lLy+lU0iXgRRZYvW36wadOmONNnwK2btxPxPqtXrUOBHvz+FC6XO/J3z3T9swt49Dpop1Z7zBIIeD/5+XXcs2/P0fLcrHy6CG/fvEnevX1Ldzzn66+/doJfFovFnSUSCQ+HaOBEXAcHh57WrawHeXl535g48eeY1Ss3Z1+/FkSePH5B3r9LIOfPXUlq3/7b2e3bdlxWvz7Tq42z8zcOdg6D30W9K8dwxsqVa8FF4cSvBaAZ/qX9/ucCxrR169bNcV+j0SwRi4VrJBLZijWrN6W9fRNPFwFdCI8ePtzeokULyr9YWlq6gzRDTQADIyic4+h8G5tWflBwy5YtR7o6uy9UKj1PderU7bK7u/ssUBwg8MD7o694y+qNi6o/1pDIV1EfvLy8uzo42PXk8Xg/SQUCPO/fS7AL6lr6FArFSPzDt+bNm4+aMO6nK/fuPiTlpZUE5cCk+PisW9duLBGxxR4oEt0KoJHZwTo56tKgGPh8Nx1qDOicwD90wILZ2tpiXqvRD2PGf2dISaUNYvv3HQb0dedyuQvQzSwXiUDI/fsJZg5Q2Md9uVyu9vb2Xu3u6rrI17ft4oXzf4tMTDA38UKSExONocEPDuzYtLWfo7n5q+5/T8J3Y5egjotjk8Hro1+H/psUFyt7ydmT/qtSk5Ipj/T08YsPvXv36+fu7txWJBL9xB5b+e/h//8TaVBXBFcoFE11Gt1YsVg8zcXFaXa/foOO7Np1KDk66tN/wqITlMkJSbmvX0aEBd+5u/vKhXNztq/fOGbzmvV91qxY0WX16tXeK5ct67Vk0eKVwXfuHop585YGXcjzpxF5ffv2n2NpaYFGrAXYIQj0n3+gfzvBNCYqaOxCMO3ateMjNvB4nA3Ozs4L+vTpv3nNqk3PLl24XhX9Jo5UlP3ff+wDqSqrJOXFpXQ4z2gwkvwcczCnUgurjyC7dh6I69Gt95AmTRq0l8vla9lD+xT4X5Sff55/W3FxcUHf5qd/QatSqbprNJoFIpFoha2t9UweT7Dxmy7fHfrphxm3Nm7c/vbQweOGwDNXau7fC6t9FPqMPH8aScLDnpMH98PJ7Vv3a0+fDsz6Zda8EJ3Od3oTiyYjOTzOfIVCMZ/H4zkhhiCQf/4ZvggbG1i/TNsfNRqNTKvV9lUqlXN5PM5cd677Wmtr6xl2dnZL+Xz+TplE9pta7bVer2+7QOflvUyl0iwUCsXLrKysZlpaWk6SSESLccqtRCLphKE5djCbdj98kf+PYCEcHByc2R1BFwNJGkZJVSpVew+Nx0ihUDhcKhbPVnt4rJZLpXPFUvFCqVQ6QywWz0UZFJSGTCbD/45sgnZDdrz1zz1w+19NECOwI1jYipaQr3GkJvvwVwyP1xizuPDnOGycTfSQWDVByROxBZ0QdRn2F/mfyVdQtLu7Lfr2W7MHrVJ3BUob05dYANDKbAuh85dA+9cIqm51vfr/9RExX+SLfJEv8u8n/wcD8zru+9Kv3QAAAABJRU5ErkJggg==",u0={top:"bottom",bottom:"top",front:"front",back:"back",left:"right",right:"left","front-right":"back-left","front-left":"back-right","back-right":"front-left","back-left":"front-right"},Ch=[{preset:"top",angleDeg:0,label:"Сверху"},{preset:"back",angleDeg:45,label:"Сзади"},{preset:"left",angleDeg:90,label:"Слева"},{preset:"front",angleDeg:135,label:"Спереди"},{preset:"bottom",angleDeg:180,label:"Снизу"},{preset:"front",angleDeg:225,label:"Спереди"},{preset:"right",angleDeg:270,label:"Справа"},{preset:"back",angleDeg:315,label:"Сзади"}],d0='<svg viewBox="0 0 16 20" width="18" height="22" aria-hidden="true"><path fill="currentColor" d="M8 18 L2 4 h12z"/></svg>';function f0(){const n=document.createElementNS("http://www.w3.org/2000/svg","svg");n.setAttribute("class","view-orientation-widget__logo"),n.setAttribute("viewBox","0 0 100 100"),n.setAttribute("aria-hidden","true");for(const t of Ch){const e=document.createElementNS("http://www.w3.org/2000/svg","g");e.setAttribute("transform",`rotate(${t.angleDeg} 50 50)`),e.dataset.preset=t.preset,e.dataset.label=t.label;const i=document.createElementNS("http://www.w3.org/2000/svg","path");i.setAttribute("class","view-orientation-widget__hit"),i.setAttribute("d","M50 1.6 L65 25.5 H35 Z");const s=document.createElementNS("http://www.w3.org/2000/svg","path");s.setAttribute("class","view-orientation-widget__mark"),s.setAttribute("d","M50 7.2 L56.6 19 H43.4 Z"),e.append(i,s),n.appendChild(e)}return n}function p0(){const n=document.createElement("div");n.className="view-orientation-widget__ring";for(const t of Ch){const e=document.createElement("button");e.type="button",e.className="view-orientation-widget__arrow",e.style.setProperty("--vo-angle",`${t.angleDeg}deg`),e.dataset.preset=t.preset,e.dataset.label=t.label,e.innerHTML=d0,n.appendChild(e)}return n}function Jc(n,t,e){const i=n.dataset.preset,s=n.dataset.label??"";i&&(n.addEventListener("click",r=>{r.stopPropagation(),t(u0[i])}),n.addEventListener("pointerdown",r=>r.stopPropagation()),n.addEventListener("mouseenter",()=>{e.textContent=s,e.hidden=!1,n.classList.add("is-hover")}),n.addEventListener("mouseleave",()=>{e.hidden=!0,n.classList.remove("is-hover")}))}function m0(n,t){n.classList.add("view-orientation-widget"),n.hidden=!1,n.replaceChildren();const e=f0(),i=document.createElement("img");i.className="view-orientation-widget__brand",i.src=Ah,i.alt="",i.draggable=!1;const s=p0(),r=document.createElement("div");r.className="view-orientation-widget__tooltip",r.hidden=!0,e.querySelectorAll("g").forEach(o=>Jc(o,t,r)),s.querySelectorAll("button").forEach(o=>Jc(o,t,r)),n.append(e,i,s,r)}const Rh="(max-width: 768px), (pointer: coarse) and (max-width: 1024px)",g0=[{preset:"front",label:"Спереди"},{preset:"back",label:"Сзади"},{preset:"left",label:"Слева"},{preset:"right",label:"Справа"},{preset:"top",label:"Сверху"},{preset:"bottom",label:"Снизу"}];function Zc(){return window.matchMedia(Rh).matches}function _0(n){return{comments:n.comments.length>0,ruler:n.measurements.some(t=>t.kind==="ruler"),thickness:n.measurements.some(t=>t.kind==="thickness"),marker:n.meshes.some(t=>!!t.buffers.marker_colors_b64)}}function Ps(n,t,e,i){const s=document.getElementById(t);s&&(s.checked=n.layers[e],s.addEventListener("change",()=>{n.layers[e]=s.checked,n.applyLayers(),i?.()}))}function Ni(n){for(const[t,e]of[["layer-comments-mobile","comments"],["layer-ruler-mobile","ruler"],["layer-thickness-mobile","thickness"],["layer-marker-mobile","marker"]]){const i=document.getElementById(t);i&&(i.checked=n.layers[e])}for(const t of["comments","ruler","thickness","marker"]){const e=document.querySelector(`#layers-dock [data-layer="${t}"]`);e&&!e.hidden&&e.classList.toggle("layers-dock__btn--active",n.layers[t])}}function Ph(n){return n.meshes.some(t=>t.buffers.has_vertex_colors&&!!t.buffers.colors_b64)}function Gr(n,t){const e=[document.getElementById("flat-shading"),document.getElementById("flat-shading-mobile")],i=n.isFlatShadingEnabled();for(const m of e)m&&(m.classList.toggle("layers-dock__btn--active",i),m.setAttribute("aria-pressed",i?"true":"false"));const s=n.hasIndependentVertexColors?.()??Ph(t),r=[document.getElementById("vertex-colors"),document.getElementById("vertex-colors-mobile")];for(const m of r)m&&(m.hidden=!s,m.classList.toggle("layers-dock__btn--active",n.isVertexColorsEnabled()));const o=n.canShowContacts?.()??!1,a=n.isContactsEnabled?.()??!1;for(const m of["html-contacts","html-contacts-mobile"]){const g=document.getElementById(m);g&&(g.hidden=!o,g.classList.toggle("layers-dock__btn--active",a),g.classList.toggle("mobile-contacts-bar__btn--active",a))}const c=n.hasContactImprint?.()??!1,l=n.isContactsDynamicEnabled?.()??!1;for(const m of["html-contacts-dynamic","html-contacts-dynamic-mobile"]){const g=document.getElementById(m);g&&(g.hidden=!c,g.classList.toggle("layers-dock__btn--active",l),g.classList.toggle("mobile-contacts-bar__btn--active",l))}const h=n.canShowContactsOnJaws?.()??!1,u=n.isContactsOnJawsEnabled?.()??!1;for(const m of["html-contacts-jaws","html-contacts-jaws-mobile"]){const g=document.getElementById(m);g&&(g.hidden=!h,g.classList.toggle("layers-dock__btn--active",u),g.classList.toggle("mobile-contacts-bar__btn--active",u))}const d=document.getElementById("mobile-contacts-bar");d&&(d.hidden=!(o||c||h))}function v0(n,t){const e=document.getElementById("mobile-mesh-list");e&&xh(e,n,t,{visibilityAll:"mobile-mesh-visibility-all",collapseAll:"mobile-mesh-collapse-all"})}function x0(n,t){const e=document.getElementById("mobile-dock"),i=document.getElementById("mobile-sheet-backdrop");if(!e||!i)return;v0(n,t);const s=document.getElementById("mobile-mesh-title");s&&(s.textContent="Объекты");const r=document.querySelector(".mesh-overlay__toggle-label");r&&(r.textContent="Объекты"),document.querySelectorAll(".viewer-brand-logo").forEach(A=>{A.src=Ah});const o=document.querySelector('#mobile-dock [data-mobile-sheet="meshes"]');o&&(o.hidden=!0);const a=_0(t),c=a.comments||a.ruler||a.thickness||a.marker;for(const A of["comments","ruler","thickness","marker"]){const S=document.querySelector(`#mobile-sheet-layers [data-layer-row="${A}"]`);S&&(S.hidden=!a[A])}const l=document.querySelector('#mobile-dock [data-mobile-sheet="layers"]');l&&(l.hidden=!c),a.comments&&Ps(n,"layer-comments-mobile","comments",()=>Ni(n)),a.ruler&&Ps(n,"layer-ruler-mobile","ruler",()=>Ni(n)),a.thickness&&Ps(n,"layer-thickness-mobile","thickness",()=>Ni(n)),a.marker&&Ps(n,"layer-marker-mobile","marker",()=>Ni(n)),Ni(n);const h=document.getElementById("flat-shading-mobile");h&&h.addEventListener("click",()=>{n.setFlatShading(!n.isFlatShadingEnabled()),Gr(n,t)});const u=document.getElementById("vertex-colors-mobile");u&&Ph(t)&&u.addEventListener("click",()=>{n.setVertexColorsEnabled(!n.isVertexColorsEnabled()),Gr(n,t)}),Gr(n,t);let d=null;const m=document.getElementById("mesh-overlay"),g=document.getElementById("mesh-overlay-toggle"),_=document.getElementById("mobile-sheet-meshes"),p=A=>{const S=document.getElementById("mobile-contacts-bar");if(!S)return;if(A!=="articulator"){S.style.bottom="",S.classList.remove("mobile-contacts-bar--lifted");return}const M=()=>{const C=document.getElementById("mobile-sheet-articulator"),O=document.getElementById("mobile-dock")?.getBoundingClientRect().height??68,Y=C?.getBoundingClientRect().height??0;S.style.bottom=`${Math.round(O+Y+8)}px`,S.classList.add("mobile-contacts-bar--lifted")};requestAnimationFrame(()=>requestAnimationFrame(M))},f=A=>{m?.classList.toggle("mesh-overlay--collapsed",!A),g?.setAttribute("aria-expanded",String(A)),_?.classList.toggle("mobile-sheet--open",A),e.querySelector('[data-mobile-sheet="meshes"]')?.classList.toggle("mobile-dock__btn--active",A)},b=()=>{d=null,i.hidden=!0,document.querySelectorAll(".mobile-sheet").forEach(A=>{A.classList.remove("mobile-sheet--open")}),e.querySelectorAll(".mobile-dock__btn").forEach(A=>{A.classList.remove("mobile-dock__btn--active")}),f(!1),p(null)},y=A=>{A(),requestAnimationFrame(()=>n.resize?.())},E=document.getElementById("mobile-views-grid");if(E){E.replaceChildren();const A=t.views??[];for(const M of A){const C=document.createElement("button");C.type="button",C.className="mobile-views-grid__btn mobile-views-grid__btn--accent",C.textContent=M.label==="Default view"?"Вид по умолчанию":M.label,C.addEventListener("click",V=>{V.preventDefault(),V.stopPropagation(),y(()=>n.applyExocadView?.(M))}),E.appendChild(C)}for(const{preset:M,label:C}of g0){const V=document.createElement("button");V.type="button",V.className="mobile-views-grid__btn",V.textContent=C,V.addEventListener("click",O=>{O.preventDefault(),O.stopPropagation(),y(()=>n.snapView(M))}),E.appendChild(V)}const S=document.createElement("button");S.type="button",S.className="mobile-views-grid__btn mobile-views-grid__btn--accent",S.textContent="Вписать в экран",S.addEventListener("click",M=>{M.preventDefault(),M.stopPropagation(),y(()=>n.fitToContent({preserveRotation:!0}))}),E.appendChild(S)}const L=A=>{if(A==="meshes"){const S=d!=="meshes";b(),S&&(d="meshes",f(!0));return}if(d===A){b();return}b(),d=A,i.hidden=!1,document.getElementById(`mobile-sheet-${A}`)?.classList.add("mobile-sheet--open"),e.querySelector(`[data-mobile-sheet="${A}"]`)?.classList.add("mobile-dock__btn--active"),p(A)};e.querySelectorAll("[data-mobile-sheet]").forEach(A=>{A.addEventListener("click",S=>{S.stopPropagation(),L(A.dataset.mobileSheet)})}),g?.addEventListener("click",A=>{A.stopPropagation(),L("meshes")}),i.addEventListener("click",b),document.getElementById("viewport")?.addEventListener("pointerdown",A=>{if(d!=="meshes"||n.pickMeshId?.(A.clientX,A.clientY))return;document.querySelector("#mobile-mesh-list .mesh-panel__group:not(.mesh-panel__group--collapsed)")&&document.getElementById("mobile-mesh-collapse-all")?.click()});const R=()=>{document.documentElement.classList.toggle("layout-mobile",Zc()),Zc()||b()};R(),window.matchMedia(Rh).addEventListener("change",R)}const Qc="d3d-mesh-context-menu-style",M0=`
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
`;function y0(){return window.matchMedia("(pointer: coarse), (max-width: 768px)").matches}class S0{constructor(t){this.callbacks=t,E0(),this.el=document.createElement("div"),this.el.className="d3d-mesh-menu d3d-mesh-menu--hidden",this.el.setAttribute("role","menu"),document.body.appendChild(this.el),document.addEventListener("pointerdown",this.onDocPointer,!0),window.addEventListener("blur",this.hide),window.addEventListener("resize",this.hide)}el;target=null;show(t,e,i){this.target=i,this.renderMeshMenu(),this.place(t,e)}showHiddenList(t,e,i){this.target=null,this.el.replaceChildren();const s=document.createElement("div");if(s.className="d3d-mesh-menu__title",s.textContent="Скрытые объекты",this.el.appendChild(s),i.length===0){const r=document.createElement("div");r.className="d3d-mesh-menu__empty",r.textContent="Нет скрытых объектов",this.el.appendChild(r)}else for(const r of i)this.addItem(r.name,"",()=>{this.callbacks.onRevealHidden?.(r.id),this.hide()});this.place(t,e)}hide=()=>{this.target=null,this.el.classList.add("d3d-mesh-menu--hidden")};dispose(){document.removeEventListener("pointerdown",this.onDocPointer,!0),window.removeEventListener("blur",this.hide),window.removeEventListener("resize",this.hide),this.el.remove()}place(t,e){this.el.classList.remove("d3d-mesh-menu--hidden");const i=this.el.getBoundingClientRect(),s=Math.min(t,window.innerWidth-i.width-8),r=Math.min(e,window.innerHeight-i.height-8);this.el.style.left=`${Math.max(8,s)}px`,this.el.style.top=`${Math.max(8,r)}px`}onDocPointer=t=>{this.el.classList.contains("d3d-mesh-menu--hidden")||t.button!==2&&(this.el.contains(t.target)||this.hide())};renderMeshMenu(){const t=this.target;if(!t)return;this.el.replaceChildren();const e=document.createElement("div");e.className="d3d-mesh-menu__title",e.textContent=t.name,this.el.appendChild(e);const i=y0();this.addItem(t.visible?"Скрыть объект":"Показать объект",i?"":"Ctrl+СКМ",()=>{this.callbacks.onToggleVisible(t.id),this.hide()}),this.addItem(t.halfTransparent?"Прозрачность 0%":"Прозрачность 50%",i?"":"Shift+СКМ",()=>{this.callbacks.onToggleOpacity(t.id),this.hide()})}addItem(t,e,i){const s=document.createElement("button");s.type="button",s.className="d3d-mesh-menu__item",s.setAttribute("role","menuitem");const r=document.createElement("span");if(r.textContent=t,s.append(r),e){const o=document.createElement("span");o.className="d3d-mesh-menu__hint",o.textContent=e,s.append(o)}s.addEventListener("click",o=>{o.preventDefault(),o.stopPropagation(),i()}),this.el.appendChild(s)}}function E0(){if(document.getElementById(Qc))return;const n=document.createElement("style");n.id=Qc,n.textContent=M0,document.head.appendChild(n)}const $c=1,b0=6;function w0(n,t=1e-4){if(n.length<6)return!0;const e=n[0],i=n[1],s=n[2];for(let r=3;r<n.length;r+=3)if(Math.abs(n[r]-e)>t||Math.abs(n[r+1]-i)>t||Math.abs(n[r+2]-s)>t)return!1;return!0}function T0(n){return n==="exocad"||n==="d3dHtml"||n==="mesh"?n:"mesh"}function Dh(n,t){const e=new Uint8Array(we(n)),i=new Float32Array(e.length);e.length/3;{for(let s=0;s<e.length;s+=1)i[s]=(e[s]??0)/255;return i}}function Lh(n){return Dh(n)}function A0(n){const t=Math.floor(n.length/3);if(t<32)return!1;const e=40/255;let i=0,s=0;for(let o=0;o<t;o+=1){const a=n[o*3],c=n[o*3+1],l=n[o*3+2],h=Math.max(a,c,l),u=Math.min(a,c,l);h-u<=e||(i+=1,(l>a+.08||c>a+.08)&&(s+=1))}const r=i/t;return r>.08&&r<.85&&s/i>.55}function C0(n){const t=Math.floor(n.length/3),e=40/255,i=new Map;let s=-1,r=0;for(let o=0;o<t;o+=1){const a=n[o*3],c=n[o*3+1],l=n[o*3+2];if(Math.max(a,c,l)-Math.min(a,c,l)>e)continue;const h=Math.round(a*15)<<8|Math.round(c*15)<<4|Math.round(l*15),u=(i.get(h)??0)+1;i.set(h,u),u>r&&(r=u,s=h)}return s<0||r<8?null:new Nt((s>>8&15)/15,(s>>4&15)/15,(s&15)/15)}function Ih(n){if(n.length<3)return!0;const t=n[0],e=n[1],i=n[2];for(let s=0;s<n.length;s+=3)if(n[s]!==t||n[s+1]!==e||n[s+2]!==i)return!1;return!0}function zs(n,t){return n.length===t*3}function ko(n,t){return!!n&&zs(n,t)&&!Ih(n)}function R0(n,t,e=2/255){if(n.length!==t.length||n.length<3)return!1;let i=0;const s=n.length/3;for(let r=0;r<n.length;r+=3)Math.abs(n[r]-t[r])<=e&&Math.abs(n[r+1]-t[r+1])<=e&&Math.abs(n[r+2]-t[r+2])<=e&&(i+=1);return i/s>.995}function P0(n){const t=n.buffers.image_bytes;if(t&&t.length>0)return t;const e=n.buffers.image_b64?.trim();return e?we(e):null}function D0(n,t){const e=n.buffers.uvs_bytes;if(e&&e.length>=t*8){const s=new Uint8Array(e.byteLength);return s.set(e),new Float32Array(s.buffer)}const i=n.buffers.uvs_b64?.trim();if(i)try{const s=fv(i);if(s.length>=t*2)return s}catch{return null}return null}function Wr(n,t){const e=new Float32Array(t*3);for(let i=0;i<t;i+=1)e[i*3]=n.r,e[i*3+1]=n.g,e[i*3+2]=n.b;return e}function tl(n,t,e,i=2/255){const s=new Float32Array(n.length),r=Math.floor(n.length/3);for(let o=0;o<r;o+=1){const a=o*3,c=n[a],l=n[a+1],h=n[a+2],u=t?t[a]:e.r,d=t?t[a+1]:e.g,m=t?t[a+2]:e.b;Math.abs(c-u)>i||Math.abs(l-d)>i||Math.abs(h-m)>i?(s[a]=c,s[a+1]=l,s[a+2]=h):(s[a]=e.r,s[a+1]=e.g,s[a+2]=e.b)}return s}const sa={strength:2.8,floor:.48};function L0(n,t,e){n.deleteAttribute("color"),dh(t,e),Ci(t,!0,sa)}function I0(n,t,e){n.setAttribute("color",new $t(e.slice(),3)),ph(t),Ci(t,!0,sa)}function el(n){const t=Cv(n);return n.vertexColors||dh(t,n.solidColor),Ci(t,!0,sa),t}async function Uh(n){if(typeof DecompressionStream<"u"){const t=new Blob([n]).stream().pipeThrough(new DecompressionStream("gzip")),e=await new Response(t).arrayBuffer();return new Uint8Array(e)}throw new Error("Браузер не поддерживает gzip")}async function U0(n){return crypto.subtle.digest("SHA-256",n)}function F0(n){return n.replace(/[\s\-_]/g,"").toUpperCase()}function N0(n,t){const e=we(n),i=new Uint8Array(e.length);for(let s=0;s<e.length;s+=1)i[s]=e[s]^t[s%t.length]^90+s*13&255;return new TextDecoder().decode(i).replace(/\0+$/g,"").trim()}function Fh(){const t=document.querySelector('meta[name="d3d-wrap"]')?.getAttribute("content")?.trim()??"";if(t)return t;const i=document.getElementById("d3d-scene-encrypted")?.getAttribute("data-wrap")?.trim()??"";return i||(document.querySelector("[data-wrap]")?.getAttribute("data-wrap")?.trim()??"")}async function Nh(n,t){const i=new TextEncoder().encode(n),s=new Uint8Array(t.length+i.length);return s.set(t,0),s.set(i,t.length),new Uint8Array(await U0(s))}async function B0(n,t,e){const i=await Nh(n,t);return crypto.subtle.importKey("raw",i,{name:e},!1,["decrypt"])}function O0(n,t){if(n.length!==t.length)return!1;let e=0;for(let i=0;i<n.length;i+=1)e|=n[i]^t[i];return e===0}async function k0(n,t,e,i,s){const r=await Nh(s,n),o=await crypto.subtle.importKey("raw",r,{name:"HMAC",hash:"SHA-256"},!1,["sign"]),a=new Uint8Array(t.length+i.length);a.set(t,0),a.set(i,t.length);const c=new Uint8Array(await crypto.subtle.sign("HMAC",o,a));if(!O0(c,e))throw new Error("NEED_PASSWORD");const l=await crypto.subtle.importKey("raw",r,{name:"AES-CBC"},!1,["decrypt"]),h=await crypto.subtle.decrypt({name:"AES-CBC",iv:t},l,i);return new Uint8Array(h)}async function z0(n,t,e,i,s,r){const o=we(n),a=we(t),c=we(e);if(s==="aes-256-cbc"){const u=we(r??""),d=[i,F0(i)].filter((g,_,p)=>g.length>0&&p.indexOf(g)===_);let m;for(const g of d)try{return await k0(o,a,u,c,g)}catch(_){m=_}throw m instanceof Error?m:new Error("NEED_PASSWORD")}const l=await B0(i,o,"AES-GCM"),h=await crypto.subtle.decrypt({name:"AES-GCM",iv:a},l,c);return new Uint8Array(h)}async function H0(n){const t=document.getElementById("d3d-scene-encrypted");let e;if(t){const a=t.getAttribute("data-salt")??"",c=t.getAttribute("data-nonce")??"",l=t.textContent?.trim()??"",h=t.getAttribute("data-alg"),u=t.getAttribute("data-mac"),d=Fh();let m=n;if(!m&&d&&(m=N0(d,we(a))),!m)throw new Error("NEED_PASSWORD");e=await z0(a,c,l,m,h,u)}else{const c=document.getElementById("d3d-scene-payload")?.textContent?.trim()??"";e=we(c)}const i=await Uh(e).catch(()=>e);if(wh(i)){const a=Th(i),c=JSON.parse(new TextDecoder().decode(a.json));for(const h of c.meshes){const u=h.buffers.pack_index;if(u==null||!a.packs[u])continue;const d=a.packs[u];h.buffers.pack_bytes=d.pack,d.colors&&d.colors.length>0&&(h.buffers.colors_b64=Vn(d.colors),h.buffers.has_vertex_colors=!0),d.image&&d.image.length>0&&(h.buffers.image_bytes=d.image,h.buffers.has_image=!0),d.uvs&&d.uvs.length>0&&(h.buffers.uvs_bytes=d.uvs,h.buffers.has_uvs=!0)}const l=bi(c);return l&&(c.articulator=l),c}const s=new TextDecoder().decode(i),r=JSON.parse(s),o=bi(r);return o&&(r.articulator=o),r}async function V0(n){const t=new Ke,e=n.buffers.pack_bytes,i=n.buffers.pack_b64?.trim();if(e&&e.length>0){const h=Kc(e);return t.setAttribute("position",new $t(h.positions,3)),t.setIndex(new $t(h.indices,1)),t.computeVertexNormals(),t}if(i){const h=we(i),u=await Uh(h).catch(()=>h),d=Kc(u);return t.setAttribute("position",new $t(d.positions,3)),t.setIndex(new $t(d.indices,1)),t.computeVertexNormals(),t}const s=n.buffers.ctm_b64?.trim(),r=!!n.buffers.positions_b64?.length;if(s&&!r){const h=bh(we(s));return t.setAttribute("position",new $t(h.positions,3)),t.setIndex(new $t(h.indices,1)),h.normals?t.setAttribute("normal",new $t(h.normals,3)):t.computeVertexNormals(),t}const o=we(n.buffers.positions_b64),a=new Float32Array(o.buffer,o.byteOffset,o.byteLength/4),c=we(n.buffers.indices_b64),l=new Uint32Array(c.buffer,c.byteOffset,c.byteLength/4);if(t.setAttribute("position",new $t(a,3)),t.setIndex(new $t(l,1)),n.buffers.normals_b64){const h=we(n.buffers.normals_b64),u=new Float32Array(h.buffer,h.byteOffset,h.byteLength/4);t.setAttribute("normal",new $t(u,3))}else t.computeVertexNormals();return t}function nl(n){return new Nt(n)}class G0{scene=new Td;viewportRig=new Oe;camera;renderer;controls;viewportWrap;canvas;pickRay=new Ol;pickNdc=new Ht;meshEntries=new Map;hiddenMeshStack=[];lastRevealHiddenAt=0;meshMenu=null;contacts=new s0(()=>[...this.meshEntries.entries()].filter(([,t])=>!t.photo).map(([t,e])=>({id:t,name:e.name,jaw:e.jaw,mesh:e.mesh,restMatrix:e.restMatrix,photo:e.photo})));contentBox=new pn;ambientLight;hemisphereLight;keyLight;fillLight;keyLightOffset=hh.clone();layers={comments:!0,ruler:!0,thickness:!0,marker:!1};commentGroup=new Oe;measureGroup=new Oe;bubbleRoot;labelRoot;flatShading=!1;vertexColorsEnabled=!0;meshColor="#e6c8a8";sceneData;constructor(t,e,i,s,r){this.viewportWrap=e,this.canvas=t,this.bubbleRoot=i,this.labelRoot=s,this.renderer=new y_({canvas:t,antialias:!0,alpha:!0,logarithmicDepthBuffer:!0}),t.tabIndex=-1,t.style.background="transparent",this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.outputColorSpace=be,this.renderer.toneMapping=no,this.renderer.toneMappingExposure=Fc(),this.scene.background=null,this.applyTheme("dark"),this.camera=E_(1),Bo(this.camera,this.viewportRig),this.scene.add(this.viewportRig),this.controls=new ge(this.camera,r,t),this.controls.setWheelBoundsElement(e),this.controls.setLeftButtonOrbitEnabled(!0),this.controls.setMiddleButtonPanEnabled(!1),this.controls.setTrackpadWheelPanEnabled(!0),this.controls.setContentBoxProvider(()=>this.contentBox),this.controls.setOnChange(()=>{this.syncCamera()}),this.controls.setPivotPickHandler((l,h)=>this.pickPivotAt(l,h)),this.controls.setMiddleClickHandler((l,h,u)=>this.handleMiddleClick(l,h,u)),this.meshMenu=new S0({onToggleVisible:l=>this.hideOrShowMesh(l),onToggleOpacity:l=>this.toggleMeshHalfOpacity(l),onRevealHidden:l=>this.setMeshVisible(l,!0)}),this.bindMeshContextMenu();const o=window.matchMedia("(max-width: 768px), (pointer: coarse) and (max-width: 1024px)"),a=()=>{this.controls.setTouchNavigationEnabled(o.matches)};a(),o.addEventListener("change",a),this.scene.add(this.commentGroup),this.scene.add(this.measureGroup);const c=Uc.mesh;this.ambientLight=new Nd(16777215,c.ambient),this.scene.add(this.ambientLight),this.hemisphereLight=new Id(16777215,16777215,c.hemisphere),this.scene.add(this.hemisphereLight),this.keyLight=new Ha(16777215,c.key),this.fillLight=new Ha(16777215,c.fill),Lc(this.keyLight,this.fillLight,this.hemisphereLight),this.scene.add(this.keyLight.target),this.scene.add(this.fillLight.target),this.camera.add(this.keyLight),this.camera.add(this.fillLight),this.bindTouchMeshGestures()}bindTouchMeshGestures(){let r=0,o=0,a=0,c=null,l=!1,h=null,u=null;const d=()=>{c!==null&&(window.clearTimeout(c),c=null)},m=_=>!!_?.closest(".mesh-panel, .articulator-panel, .mobile-sheet, .mobile-dock, .mobile-contacts-bar, .mesh-overlay, .d3d-mesh-menu, .layers-dock");this.canvas.addEventListener("pointerdown",_=>{if(!m(_.target)){if(_.pointerType==="touch"){if(_.isPrimary===!1){d(),l=!1,h=null,u=null;return}}else if(_.button!==0)return;u=_.pointerId,r=_.clientX,o=_.clientY,a=performance.now(),l=!1,d(),(_.pointerType==="touch"||window.matchMedia("(pointer: coarse)").matches)&&(c=window.setTimeout(()=>{if(c=null,u===null)return;l=!0,h=null;const p=this.controls.pivotAtClientPoint(r,o);this.controls.cancelActiveGestures(),p||this.controls.cancelActiveGestures(),this.meshMenu?.hide()},480))}}),this.canvas.addEventListener("pointermove",_=>{if(u===null||_.pointerId!==u)return;const p=_.clientX-r,f=_.clientY-o;p*p+f*f>196&&d()});const g=_=>{if(u===null||_.pointerId!==u)return;if(d(),u=null,l){l=!1;return}if(_.pointerType!=="touch"&&_.button!==0)return;const p=_.clientX-r,f=_.clientY-o;if(p*p+f*f>196){h=null;return}if(performance.now()-a>560){h=null;return}const b=performance.now();if(h!==null&&b-h.t<380&&(_.clientX-h.x)**2+(_.clientY-h.y)**2<1600){h=null,this.openTapContextMenu(_.clientX,_.clientY);return}h={t:b,x:_.clientX,y:_.clientY}};this.canvas.addEventListener("pointerup",g),this.canvas.addEventListener("pointercancel",g)}openTapContextMenu(t,e){const i=this.pickMeshHit(t,e);if(i){const r=this.meshEntries.get(i.id);if(!r)return;this.meshMenu?.show(t,e,{id:i.id,name:r.name,visible:r.mesh.visible,halfTransparent:this.isHalfTransparent(i.id)});return}const s=this.listHiddenMeshes();this.meshMenu?.showHiddenList(t,e,s)}listHiddenMeshes(){const t=[];for(const[e,i]of this.meshEntries)i.mesh.visible||t.push({id:e,name:i.name});return t}pickMeshId(t,e){return this.pickMeshHit(t,e)?.id??null}pickMeshHit(t,e){const i=this.canvas.getBoundingClientRect();if(i.width<=0||i.height<=0)return null;this.pickNdc.set((t-i.left)/i.width*2-1,-((e-i.top)/i.height)*2+1),this.pickRay.setFromCamera(this.pickNdc,this.camera);const s=[...this.meshEntries.values()].filter(a=>a.mesh.visible).map(a=>a.mesh),o=this.pickRay.intersectObjects(s,!1)[0];if(!o)return null;for(const[a,c]of this.meshEntries)if(c.mesh===o.object)return{id:a,point:o.point};return null}handleMiddleClick(t,e,i){if(i.shift&&i.ctrl){const r=performance.now();return r-this.lastRevealHiddenAt<400||(this.lastRevealHiddenAt=r,this.revealNextHiddenMesh()),!0}const s=this.pickMeshHit(t,e);return s?i.ctrl?(this.setMeshVisible(s.id,!1),!0):i.shift?(this.toggleMeshHalfOpacity(s.id),!0):!1:i.shift||i.ctrl}hideOrShowMesh(t){const e=this.meshEntries.get(t);e&&this.setMeshVisible(t,!e.mesh.visible)}revealNextHiddenMesh(){for(;this.hiddenMeshStack.length>0;){const t=this.hiddenMeshStack.pop();if(!t)continue;const e=this.meshEntries.get(t);if(e&&!e.mesh.visible)return this.setMeshVisible(t,!0),e.name}return null}bindMeshContextMenu(){this.viewportWrap.addEventListener("contextmenu",t=>{if(t.preventDefault(),t.target?.closest(".mesh-panel, .articulator-panel, .mobile-sheet, .mesh-overlay, .d3d-mesh-menu"))return;if(this.controls.takeContextMenuSuppressed()){this.meshMenu?.hide();return}const i=this.pickMeshHit(t.clientX,t.clientY);if(!i){this.meshMenu?.hide();return}const s=this.meshEntries.get(i.id);s&&this.meshMenu?.show(t.clientX,t.clientY,{id:i.id,name:s.name,visible:s.mesh.visible,halfTransparent:this.isHalfTransparent(i.id)})},!0)}isHalfTransparent(t){return Math.abs(this.getMeshOpacity(t)-.5)<.02}getMeshOpacity(t){const e=this.meshEntries.get(t);return e?e.mesh.material.opacity??1:1}pickPivotAt(t,e){return this.pickMeshHit(t,e)?.point??null}toggleMeshHalfOpacity(t){const e=this.meshEntries.get(t);if(!e)return;const i=e.mesh.material.opacity??1;this.setMeshOpacity(t,Math.abs(i-.5)<.02?1:.5)}async addPhotoMesh(t,e,i){const s=e.getAttribute("position")?.count??0,r=D0(t,s);r&&e.setAttribute("uv",new $t(r,2));let o;try{o=await uv(i)}catch(u){console.warn(`[d3d-viewer] photo texture failed for "${t.name}"`,u);return}if(!e.getAttribute("uv")){const u=o.image,d=u&&u.width&&u.height&&u.width>0&&u.height>0?u.width/u.height:4/3;e.setAttribute("uv",new $t(dv(e,d),2))}const a=(t.opacity??1)>.999,c=new Gi({map:o,color:16777215,side:Ye,transparent:!a,opacity:t.opacity??1,depthWrite:a,toneMapped:!1}),l=new De(e,c);l.userData.meshId=t.id,l.visible=t.visible,l.castShadow=!1,l.receiveShadow=!1,t.transform.length===16&&(l.matrix.fromArray(t.transform),l.matrixAutoUpdate=!1,l.updateMatrixWorld(!0)),this.scene.add(l);const h=new Nt(16777215);this.meshEntries.set(t.id,{mesh:l,name:t.name,markerColors:null,markerPaintOnSolid:null,baseVertexColors:null,baseDisplayColors:Wr(h,s),usesFileVertexColors:!1,baseColor:h,flatShading:!0,restMatrix:Array.from(l.matrix.elements),jaw:null,photo:!0})}async load(t){this.sceneData=t,this.meshColor=t.viewer_defaults.mesh_color,this.flatShading=t.viewer_defaults.flat_shading,this.applyPresentation(T0(t.viewer_defaults.lighting_profile),t.viewer_defaults.theme==="light"?"light":"dark"),this.contentBox.makeEmpty();for(const e of t.meshes){const i=await V0(e);i.computeBoundingBox();const s=P0(e);if(s){await this.addPhotoMesh(e,i,s);continue}const r=nl(e.mesh_color??this.meshColor),o=i.getAttribute("position").count;let a=null;e.buffers.colors_b64&&(a=Dh(e.buffers.colors_b64));const c=a!==null&&zs(a,o);e.buffers.colors_b64&&!c&&console.warn(`[d3d-viewer] vertex colors count mismatch for "${e.name}": ${String((a?.length??0)/3)} vs ${String(o)} vertices`);let l=!!e.buffers.colors_b64&&c;if(l&&a&&A0(a)){const y=C0(a);y&&r.copy(y),a=null,l=!1}const h=l&&a!==null&&w0(a);h&&a&&r.setRGB(a[0],a[1],a[2]);const u=l&&!h,d=u,m=a&&!h?a:Wr(r,o),g=el({solidColor:r,opacity:e.opacity,flatShading:e.flat_shading,vertexColors:d});d&&a&&i.setAttribute("color",new $t(a.slice(),3));const _=new De(i,g);_.userData.meshId=e.id,_.visible=e.visible,e.transform.length===16&&(_.matrix.fromArray(e.transform),_.matrixAutoUpdate=!1,_.updateMatrixWorld(!0));let p=null;if(e.buffers.marker_colors_b64){const y=Lh(e.buffers.marker_colors_b64);ko(y,o)?p=y:zs(y,o)&&Ih(y)?console.warn(`[d3d-viewer] ignoring uniform stub marker for "${e.name}" (no real paint)`):console.warn(`[d3d-viewer] marker colors count mismatch for "${e.name}": ${String(y.length/3)} vs ${String(o)} vertices`)}let f=u?a:null;p&&f&&R0(p,f)&&(console.warn(`[d3d-viewer] «${e.name}»: colors≈marker (краска в слое Цвет) — слой Цвет отключён`),f=null),this.scene.add(_);const b=p?tl(p,f,r):null;this.meshEntries.set(e.id,{mesh:_,name:e.name,markerColors:p,markerPaintOnSolid:b,baseVertexColors:f,baseDisplayColors:m,usesFileVertexColors:f!==null,baseColor:r.clone(),flatShading:e.flat_shading,restMatrix:Array.from(_.matrix.elements),jaw:e.jaw==="upper"||e.jaw==="lower"?e.jaw:ia({id:e.id,name:e.name,jaw:e.jaw}),photo:!1})}this.rebuildContentBox(),this.applyCamera(t.camera),this.buildComments(t),this.buildMeasurements(t),this.applyLayers(),this.setFlatShading(this.flatShading),this.syncCamera(),await this.contacts.loadSidecar(bi(t)??t.articulator)}applyTheme(t){document.documentElement.dataset.theme=t,this.renderer.setClearColor(2763312,1)}applyPresentation(t,e){this.applyTheme(e);const i=Uc[t];this.ambientLight.intensity=i.ambient*qc,this.hemisphereLight.intensity=i.hemisphere*qc*jc,this.keyLight.intensity=i.key*Yc,this.fillLight.intensity=i.fill*Yc*jc,Lc(this.keyLight,this.fillLight,this.hemisphereLight),this.keyLightOffset.copy(Mv(t)),this.renderer.toneMapping=no,this.renderer.toneMappingExposure=Fc()}toggleAllVisible(){const e=![...this.meshEntries.values()].every(i=>i.mesh.visible);for(const i of this.meshEntries.keys())this.setMeshVisible(i,e);return e}getMeshInfos(){return[...this.meshEntries.entries()].map(([t,e])=>({id:t,name:e.name}))}hasContactMaps(){return this.contacts.hasMaps()}hasContactImprint(){return this.contacts.hasImprint()}canShowContacts(){return this.contacts.hasMaps()}canShowContactsOnJaws(){return this.contacts.hasJawScanMaps()}isContactsEnabled(){return this.contacts.enabled}isContactsDynamicEnabled(){return this.contacts.dynamicEnabled}isContactsOnJawsEnabled(){return this.contacts.showOnJaws}setContactsEnabled(t){try{this.contacts.setEnabled(t),t||this.contacts.setShowOnJaws(!1)}catch(e){console.warn("[d3d-viewer] contacts toggle failed",e)}}setContactsDynamicEnabled(t){try{this.contacts.setDynamicEnabled(t)}catch(e){console.warn("[d3d-viewer] contacts dynamic toggle failed",e)}}setContactsOnJawsEnabled(t){try{t&&!this.contacts.enabled&&this.contacts.setEnabled(!0),this.contacts.setShowOnJaws(t)}catch(e){console.warn("[d3d-viewer] contacts on jaws toggle failed",e)}}applyArticulatorContactFrame(t,e){this.contacts.applyFrame(t,e)}getRestMatrix(t){const e=this.meshEntries.get(t);return e?[...e.restMatrix]:null}setMeshMatrix(t,e){const i=this.meshEntries.get(t);!i||e.length!==16||(i.mesh.matrix.fromArray(e),i.mesh.matrixAutoUpdate=!1,i.mesh.updateMatrixWorld(!0))}allMeshesHidden(){return[...this.meshEntries.values()].every(t=>!t.mesh.visible)}applyCamera(t){const e=t&&typeof t=="object"?t.view:void 0,i=t&&typeof t=="object"?t.pivot:void 0,s=!!e&&Array.isArray(i)&&i.length>=3;s&&mv(this.camera,this.controls,t,this.aspect(),this.contentBox),this.fitToContent({preserveRotation:s})}rebuildContentBox(){this.contentBox.makeEmpty();const t=new pn;for(const e of this.meshEntries.values())e.mesh.updateMatrixWorld(!0),t.setFromObject(e.mesh),t.isEmpty()||this.contentBox.union(t)}fitToContent(t){this.rebuildContentBox(),!this.contentBox.isEmpty()&&(pv(this.camera,this.controls.state,this.contentBox,e=>{this.controls.setPivotKeepingView(e)},this.aspect(),{preserveRotation:t?.preserveRotation!==!1}),this.syncCamera())}syncCamera(){pe(this.camera,this.controls.state,this.aspect(),this.controls.getPivot())}buildComments(t){for(const e of t.comments){const i=new qs(1,12,12),s=new Gi({color:16746666,depthTest:!1}),r=new De(i,s);r.position.set(e.x,e.y,e.z),r.userData={commentId:e.id,text:e.text},this.commentGroup.add(r);const o=document.createElement("div");o.className="comment-bubble",o.textContent=e.text||"(пусто)",o.dataset.commentId=e.id,this.bubbleRoot.appendChild(o)}}buildMeasurements(t){for(const e of t.measurements){const i=new P(e.ax,e.ay,e.az),s=new P(e.bx,e.by,e.bz),r=e.kind==="thickness"?4508927:16763972,o=new Ke().setFromPoints([i,s]),a=new Pd(o,new Nl({color:r}));a.userData={kind:e.kind,id:e.id,isMeasureLine:!0};const c=this.makeMeasureHandle(i,r,e.kind,e.id),l=this.makeMeasureHandle(s,r,e.kind,e.id);this.measureGroup.add(a,c,l);const h=document.createElement("div");h.className=`measure-label ${e.kind}`,h.textContent=`${e.distance_mm.toFixed(2)} mm`,h.dataset.measureId=e.id,this.labelRoot.appendChild(h)}}makeMeasureHandle(t,e,i,s){const r=new qs($c,12,12),o=new Gi({color:e,depthTest:!1,transparent:!0,opacity:.95}),a=new De(r,o);return a.position.copy(t),a.renderOrder=900,a.userData={kind:i,id:s,isMeasureHandle:!0},a}applyLayers(){this.commentGroup.visible=this.layers.comments;for(const t of this.bubbleRoot.children)t.style.display=this.layers.comments?"":"none";for(const t of this.measureGroup.children){const e=t.userData.kind,i=e==="ruler"&&this.layers.ruler||e==="thickness"&&this.layers.thickness;t.visible=i}for(const t of this.labelRoot.children){const e=t,i=e.classList.contains("thickness");e.style.display=i&&this.layers.thickness||!i&&this.layers.ruler?"":"none"}for(const[,t]of this.meshEntries){if(t.photo)continue;const e=t.mesh.geometry,i=t.mesh.material.opacity??1,s=e.getAttribute("position")?.count??0,r=this.layers.marker&&ko(t.markerColors,s),o=this.vertexColorsEnabled&&t.usesFileVertexColors&&t.baseVertexColors&&zs(t.baseVertexColors,s);let a=null;r&&o&&t.markerColors?a=t.markerColors:r&&t.markerPaintOnSolid?a=t.markerPaintOnSolid:o&&t.baseVertexColors&&(a=t.baseVertexColors),a?(this.ensureLitPhongMaterial(t,i),I0(e,t.mesh.material,a)):(this.ensureLitPhongMaterial(t,i),L0(e,t.mesh.material,t.baseColor))}this.contacts.enabled&&this.contacts.refreshAfterMaterialChange()}ensureLitPhongMaterial(t,e){const i=t.mesh.material;if(i instanceof Uo){i.opacity=e,i.transparent=e<.999,i.depthWrite=e>.999,i.flatShading=t.flatShading;return}i instanceof qn&&i.dispose(),t.mesh.material=el({solidColor:t.baseColor,opacity:e,flatShading:t.flatShading,vertexColors:!1})}toggleMeshVisible(t){const e=this.meshEntries.get(t);e&&this.setMeshVisible(t,!e.mesh.visible)}setMeshVisible(t,e){const i=this.meshEntries.get(t);if(!i||i.mesh.visible===e)return;if(i.mesh.visible=e,!e)this.hiddenMeshStack.push(t);else for(let r=this.hiddenMeshStack.length-1;r>=0;r-=1)this.hiddenMeshStack[r]===t&&this.hiddenMeshStack.splice(r,1);const s=document.querySelector(`.mesh-panel__item[data-mesh-id="${t}"]`);if(s){s.classList.toggle("mesh-panel__item--hidden",!e);const r=s.querySelector(".mesh-panel__visibility");r&&(r.classList.toggle("mesh-panel__visibility--hidden",!e),r.innerHTML=e?Oi:ki)}}setMeshOpacity(t,e){const s=this.meshEntries.get(t).mesh.material;s.opacity=e,s.transparent=e<.999,s.depthWrite=e>.999,s.needsUpdate=!0;const r=document.querySelector(`[data-op-value="${t}"]`);r&&(r.textContent=`${Math.round(e*100)}%`),Wv(t,e)}setMeshColor(t){this.meshColor=t;const e=nl(t);for(const[,i]of this.meshEntries)if(!i.usesFileVertexColors){i.baseColor.copy(e);const s=i.mesh.geometry.getAttribute("position").count;i.baseDisplayColors=Wr(e,s),i.markerColors&&(i.markerPaintOnSolid=tl(i.markerColors,i.baseVertexColors,e))}this.applyLayers()}setVertexColorsEnabled(t){this.vertexColorsEnabled=t,this.applyLayers()}isVertexColorsEnabled(){return this.vertexColorsEnabled}hasIndependentVertexColors(){for(const[,t]of this.meshEntries)if(t.usesFileVertexColors&&t.baseVertexColors)return!0;return!1}setFlatShading(t){this.flatShading=t;for(const[,e]of this.meshEntries){e.flatShading=t;const i=e.mesh.geometry;i.getAttribute("normal")||i.computeVertexNormals();const s=e.mesh.material;s instanceof Uo&&(s.flatShading=!t,s.needsUpdate=!0)}}isFlatShadingEnabled(){return this.flatShading}snapView(t){ov(this.camera,this.controls.state,t,this.aspect(),this.controls.getPivot(),{resetPan:!0}),this.syncCamera()}applyExocadView(t){if(this.rebuildContentBox(),this.contentBox.isEmpty())return;if(t.camera_matrix&&t.camera_matrix.length===16){const i=F_(this.camera,this.controls.state,Array.from(t.camera_matrix),this.aspect(),this.contentBox);this.controls.setPivotKeepingView(i),this.syncCamera();return}const e=lh(t);if(e){this.snapView(e);return}this.fitToContent()}getViewportRotation(){return this.controls.state.rotation.clone()}updateLighting(){this.keyLight.position.copy(this.keyLightOffset),this.fillLight.position.copy(xv);const t=this.controls.getPivot();this.keyLight.target.position.copy(t),this.fillLight.target.position.copy(t),this.keyLight.target.updateMatrixWorld(),this.fillLight.target.updateMatrixWorld()}aspect(){const t=this.viewportWrap.clientWidth||this.canvas.clientWidth,e=this.viewportWrap.clientHeight||this.canvas.clientHeight;return e>0?t/e:1}resize(){const t=this.viewportWrap.clientWidth||this.canvas.clientWidth,e=this.viewportWrap.clientHeight||this.canvas.clientHeight;this.renderer.setSize(t,e,!1),this.syncCamera()}projectLabels(){const t=this.renderer.domElement,e=t.clientWidth,i=t.clientHeight,s=o=>{const a=o.clone().project(this.camera);return a.z>1||a.z<-1?{x:0,y:0,ok:!1}:{x:(a.x*.5+.5)*e,y:(-a.y*.5+.5)*i,ok:!0}};for(const o of this.commentGroup.children){const a=o.userData.commentId,c=this.bubbleRoot.querySelector(`[data-comment-id="${a}"]`);if(!c)continue;const l=s(o.position);c.style.display=l.ok&&this.layers.comments?"block":"none",c.style.left=`${String(l.x)}px`,c.style.top=`${String(l.y)}px`}let r=0;for(const o of this.measureGroup.children){if(!o.userData.isMeasureLine)continue;const a=this.labelRoot.children[r];if(r+=1,!a)continue;const l=o.geometry.getAttribute("position"),h=new P((l.getX(0)+l.getX(1))/2,(l.getY(0)+l.getY(1))/2,(l.getZ(0)+l.getZ(1))/2),u=s(h),d=o.userData.kind,m=d==="ruler"&&this.layers.ruler||d==="thickness"&&this.layers.thickness;a.style.display=u.ok&&m?"block":"none",a.style.left=`${String(u.x)}px`,a.style.top=`${String(u.y)}px`}}updateMeasurementHandles(){const t=this.canvas.clientHeight;if(t<=0)return;const i=w_(this.camera,t)*b0/$c;for(const s of this.measureGroup.children)s.userData.isMeasureHandle&&s.scale.set(i,i,i)}render(){this.controls.tickPivotPanAnim(),this.updateLighting(),this.updateMeasurementHandles(),this.renderer.render(this.scene,this.camera),this.projectLabels()}alive=!0;dispose(){this.alive=!1,this.renderer.dispose()}isAlive(){return this.alive}}function W0(n){return{comments:n.comments.length>0,ruler:n.measurements.some(t=>t.kind==="ruler"),thickness:n.measurements.some(t=>t.kind==="thickness"),marker:n.meshes.some(t=>{if(!t.buffers.marker_colors_b64)return!1;try{const e=Lh(t.buffers.marker_colors_b64),i=t.buffers.vertex_count||Math.floor(e.length/3);return ko(e,i)}catch{return!1}})}}function X0(n,t){const e=document.getElementById("layers-dock"),i=W0(t),s=n.hasIndependentVertexColors(),r=i.comments||i.ruler||i.thickness||i.marker;e&&(e.hidden=!1);const o=()=>{for(const b of["comments","ruler","thickness","marker"]){const y=document.querySelector(`#layers-dock [data-layer="${b}"]`);if(!y)continue;const E=i[b];y.hidden=!E,E&&y.classList.toggle("layers-dock__btn--active",n.layers[b])}const l=document.querySelector("#layers-dock [data-layers-sep]");l&&(l.hidden=!r);const h=document.getElementById("flat-shading");if(h){const b=n.isFlatShadingEnabled();h.classList.toggle("layers-dock__btn--active",b),h.setAttribute("aria-pressed",b?"true":"false")}const u=document.getElementById("flat-shading-mobile");if(u){const b=n.isFlatShadingEnabled();u.classList.toggle("layers-dock__btn--active",b),u.setAttribute("aria-pressed",b?"true":"false")}const d=document.getElementById("vertex-colors");d&&(d.hidden=!s,d.classList.toggle("layers-dock__btn--active",n.isVertexColorsEnabled()));const m=document.getElementById("vertex-colors-mobile");m&&(m.hidden=!s,m.classList.toggle("layers-dock__btn--active",n.isVertexColorsEnabled()));const g=n.canShowContacts(),_=n.hasContactImprint(),p=n.canShowContactsOnJaws();for(const b of["html-contacts","html-contacts-mobile"]){const y=document.getElementById(b);y&&(y.hidden=!g,y.classList.toggle("layers-dock__btn--active",n.isContactsEnabled()),y.classList.toggle("mobile-contacts-bar__btn--active",n.isContactsEnabled()),y.setAttribute("aria-pressed",n.isContactsEnabled()?"true":"false"))}for(const b of["html-contacts-dynamic","html-contacts-dynamic-mobile"]){const y=document.getElementById(b);y&&(y.hidden=!_,y.classList.toggle("layers-dock__btn--active",n.isContactsDynamicEnabled()),y.classList.toggle("mobile-contacts-bar__btn--active",n.isContactsDynamicEnabled()),y.setAttribute("aria-pressed",n.isContactsDynamicEnabled()?"true":"false"))}for(const b of["html-contacts-jaws","html-contacts-jaws-mobile"]){const y=document.getElementById(b);y&&(y.hidden=!p,y.classList.toggle("layers-dock__btn--active",n.isContactsOnJawsEnabled()),y.classList.toggle("mobile-contacts-bar__btn--active",n.isContactsOnJawsEnabled()),y.setAttribute("aria-pressed",n.isContactsOnJawsEnabled()?"true":"false"))}const f=document.getElementById("mobile-contacts-bar");f&&(f.hidden=!(g||_||p))};for(const l of["comments","ruler","thickness","marker"]){const h=document.querySelector(`#layers-dock [data-layer="${l}"]`);!h||!i[l]||h.addEventListener("click",()=>{n.layers[l]=!n.layers[l],n.applyLayers(),o()})}n.layers.comments=i.comments,n.layers.ruler=i.ruler,n.layers.thickness=i.thickness,n.layers.marker=i.marker,n.applyLayers(),o(),window.addEventListener("keydown",l=>{if(l.key!=="f"&&l.key!=="F")return;const h=l.target;h&&(h.tagName==="INPUT"||h.tagName==="TEXTAREA"||h.isContentEditable)||(l.preventDefault(),n.fitToContent())});const a=document.getElementById("flat-shading");a&&a.addEventListener("click",()=>{n.setFlatShading(!n.isFlatShadingEnabled()),o()});const c=document.getElementById("vertex-colors");c&&s&&c.addEventListener("click",()=>{n.setVertexColorsEnabled(!n.isVertexColorsEnabled()),o()});for(const l of["html-contacts","html-contacts-mobile"])document.getElementById(l)?.addEventListener("click",()=>{n.setContactsEnabled(!n.isContactsEnabled()),o()});for(const l of["html-contacts-dynamic","html-contacts-dynamic-mobile"])document.getElementById(l)?.addEventListener("click",()=>{n.setContactsDynamicEnabled(!n.isContactsDynamicEnabled()),n.isContactsDynamicEnabled()&&!n.isContactsEnabled()&&n.setContactsEnabled(!0),o()});for(const l of["html-contacts-jaws","html-contacts-jaws-mobile"])document.getElementById(l)?.addEventListener("click",()=>{n.setContactsOnJawsEnabled(!n.isContactsOnJawsEnabled()),o()});o()}function Y0(n,t){const e=document.getElementById("mesh-list");e&&(xh(e,n,t,{visibilityAll:"mesh-panel-visibility-all",collapseAll:"mesh-panel-collapse-all"}),document.getElementById("viewport")?.addEventListener("pointerdown",i=>{if(n.pickMeshId(i.clientX,i.clientY))return;document.querySelector("#mesh-list .mesh-panel__group:not(.mesh-panel__group--collapsed)")&&document.getElementById("mesh-panel-collapse-all")?.click()}))}function q0(n,t){const e=document.getElementById("exocad-views-panel"),i=document.getElementById("exocad-views-list"),s=document.getElementById("exocad-views-collapse");if(!e||!i)return;const r=(t.views??[]).filter(_v);if(r.length===0){e.classList.add("exocad-views-panel--hidden");return}e.classList.remove("exocad-views-panel--hidden"),i.replaceChildren();let o=!1;s&&(s.innerHTML=wn,s.addEventListener("click",a=>{a.stopPropagation(),o=!o,e.classList.toggle("exocad-views-panel--collapsed",o),s.innerHTML=o?Wi:wn}));for(const a of r){const c=document.createElement("li");if(c.className="exocad-views-panel__item",c.title=Dc(a.label),a.thumbnail_png_b64){const h=document.createElement("img");h.className="exocad-views-panel__thumb",h.alt=a.label,h.src=`data:image/png;base64,${a.thumbnail_png_b64}`,c.appendChild(h)}else{const h=document.createElement("span");h.className="exocad-views-panel__thumb exocad-views-panel__thumb--empty",h.textContent="◫",c.appendChild(h)}const l=document.createElement("span");l.className="exocad-views-panel__label",l.textContent=Dc(a.label),c.appendChild(l),c.addEventListener("click",()=>{n.applyExocadView(a)}),i.appendChild(c)}}function il(n,t){const e=document.getElementById("password-gate"),i=document.getElementById("app"),s=document.getElementById("password-error"),r=document.getElementById("password-input"),o=document.getElementById("password-submit"),a=document.getElementById("password-hint");e.classList.remove("hidden"),i.hidden=!0,s&&(s.style.display="block",s.textContent=n),r&&(r.style.display=t?"":"none"),o&&(o.style.display=t?"":"none"),a&&(a.style.display=t?"":"none")}async function Bh(n){n.meshes=n.meshes.filter(l=>!Gv(l));const t=document.getElementById("app"),e=document.getElementById("password-gate"),i=document.getElementById("viewport-wrap"),s=document.getElementById("viewport"),r=th(oh({quaternion:[0,0,0,1],zoom:1,frustumHalfHeight:100,viewDistance:500,near:.1,far:1e5,panX:0,panY:0}));t.hidden=!1,e?.classList.add("hidden"),t.offsetHeight;const o=new G0(s,i,document.getElementById("comment-bubbles"),document.getElementById("measure-labels"),r);await o.load(n),o.resize(),X0(o,n),Y0(o,n),q0(o,n);const a=document.getElementById("view-orientation-mount");a&&m0(a,l=>{o.snapView(l)});try{e0(o,n)}catch(l){console.error(l)}x0(o,n),o.resize(),o.fitToContent();const c=()=>{o.isAlive()&&(o.resize(),o.render(),requestAnimationFrame(c))};return c(),o}async function Oh(){const n=document.getElementById("password-gate"),t=document.getElementById("d3d-scene-encrypted"),e=Fh();n.classList.add("hidden");const i=t!=null&&!e,s=async r=>{const o=await H0(r);await Bh(o)};if(i)n.classList.remove("hidden"),document.getElementById("password-submit").addEventListener("click",()=>{const r=document.getElementById("password-input").value;s(r).catch(o=>{const a=o instanceof DOMException||o instanceof Error&&/decrypt|OperationError|NEED_PASSWORD/i.test(o.message);il(a?"Неверный пароль":o instanceof Error?o.message:"Не удалось открыть сцену",!0)})});else try{await s()}catch(r){console.error(r),il(r instanceof Error?r.message:"Не удалось открыть сцену",!1)}}function j0(){document.addEventListener("contextmenu",n=>n.preventDefault()),document.addEventListener("dragstart",n=>n.preventDefault()),document.addEventListener("keydown",n=>{const t=n.key.toLowerCase();(n.ctrlKey||n.metaKey)&&(t==="s"||t==="p")&&n.preventDefault()})}window.D3dSceneViewer={boot:Oh};j0();(document.getElementById("d3d-scene-payload")||document.getElementById("d3d-scene-encrypted"))&&Oh();const K0=6;function kh(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}function J0(n){return kh().every((e,i)=>Math.abs(e-(n[i]??0))<=1e-5)}function Z0(n,t){if(!(J0(t)||n.length<3))for(let e=0;e+2<n.length;e+=3){const i=n[e],s=n[e+1],r=n[e+2];n[e]=t[0]*i+t[4]*s+t[8]*r+t[12],n[e+1]=t[1]*i+t[5]*s+t[9]*r+t[13],n[e+2]=t[2]*i+t[6]*s+t[10]*r+t[14]}}function Q0(n){const t=n[0],e=n[4],i=n[8],s=n[1],r=n[5],o=n[9],a=n[2],c=n[6],l=n[10];return t*(r*l-o*c)-e*(s*l-o*a)+i*(s*c-r*a)}function $0(n){for(let t=0;t+2<n.length;t+=3){const e=n[t];n[t]=n[t+2],n[t+2]=e}}function tx(n){const e=n.tree_paths[n.tree_paths.length-1]?.[0]?.trim();return e||null}const ex="ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ‘’“”•–—™љ›њќћџ ЎўЈ¤Ґ¦§Ё©Є«¬­®Ї°±Ііґµ¶·ё№є»јЅѕїАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя";function sl(n){const t=n.trim();if(!t||t.length>200)return!1;for(const e of t)if(e.charCodeAt(0)<32&&e!=="	")return!1;return!nx(t)}function nx(n){return n==="PNG"||n==="russian"||n==="Default view"||n==="	pHYs"||n.startsWith("View ")||n.includes("DentalCAD-Version")||n.endsWith("/64")||n.length===36&&n.split("-").length===5}function ix(n){if(n.length===0)return"";try{const e=new TextDecoder("utf-8",{fatal:!0}).decode(n);if(sl(e))return e}catch{}let t="";for(let e=0;e<n.length;e+=1){const i=n[e];t+=i<128?String.fromCharCode(i):ex[i-128]??"?"}return sl(t)?t:new TextDecoder("utf-8").decode(n)}class zh{data;off=0;constructor(t){this.data=t}readBytes(t){const e=this.off+t;if(e>this.data.length)throw new Error(`unexpected EOF (+${t} @ ${this.off})`);const i=this.data.subarray(this.off,e);return this.off=e,i}readI32(){const t=this.readBytes(4);return new DataView(t.buffer,t.byteOffset,4).getInt32(0,!0)}readF32(){const t=this.readBytes(4);return new DataView(t.buffer,t.byteOffset,4).getFloat32(0,!0)}readBool(){return this.readI32()!==0}readString(){const t=this.readI32();if(t<0)throw new Error("negative string length");const e=Math.ceil(t/4)*4,i=this.readBytes(e);return ix(i.subarray(0,Math.min(t,i.length)))}readColorRgb(){const t=this.readBytes(4);return[t[0]??0,t[1]??0,t[2]??0]}readVector3(){this.readBytes(12)}readMatrixF32(){const t=new Array(16);for(let e=0;e<16;e+=1)t[e]=this.readF32();return t}readCtmBlob(){const t=this.readI32();if(t<0)throw new Error("negative CTM size");const e=Math.ceil(t/4)*4,i=this.readBytes(e);return i.subarray(0,Math.min(t,i.length)).slice()}readImageEmbedded(){const t=this.readI32();if(t<=0)return{format:null,bytes:null};const e=this.readString(),i=Math.ceil(t/4)*4,s=this.readBytes(i);return{format:e||null,bytes:s.subarray(0,Math.min(t,s.length)).slice()}}readTreePaths(){const t=this.readI32(),e=[];for(let i=0;i<t;i+=1)e.push([this.readString(),this.readColorRgb()]);return e}skipLight(){this.readF32(),this.readF32(),this.readF32(),this.readVector3(),this.readBool(),this.readVector3(),this.readI32(),this.readColorRgb(),this.readColorRgb(),this.readColorRgb(),this.readColorRgb(),this.readF32(),this.readF32(),this.readF32()}readViews(){const t=this.readI32(),e=[];for(let i=0;i<t;i+=1)e.push({label:this.readString(),matrix:this.readMatrixF32()});return e}skipAnnotation(t){t>3&&this.readCtmBlob(),this.readString(),this.readVector3(),this.readVector3(),this.readColorRgb(),this.readTreePaths(),t>2&&this.readBool()}parseCreateSceneViewLists(t){t>1&&this.readString(),this.readString(),this.skipLight(),this.readImageEmbedded();const e=this.readViews(),i=this.readViews(),s=this.readI32();for(let r=0;r<s;r+=1)this.skipAnnotation(t);return{custom:e,standard:i}}parseMeshFromBinary(t){const e=this.readBool(),i=this.readBool(),s=this.readBool();this.readColorRgb();const r=this.readColorRgb();this.readColorRgb(),this.readColorRgb(),this.readF32(),this.readF32(),this.readF32(),this.readColorRgb(),this.readF32();const o=this.readMatrixF32(),a=this.readCtmBlob(),c=this.readImageEmbedded();this.readF32();const l=this.readTreePaths();return t>2&&this.readBool(),t>4&&(this.readBool(),this.readBool()),{flat_shading_only:e,has_vertex_color:i,has_texture:s,diffuse_rgb:r,tree_paths:l,texture_bytes:c.bytes,texture_format:c.format,ctm_blob:a,matrix:o}}}function Hh(n){const t=n.readI32();if(t>K0)throw new Error(`unsupported webview file version ${t}`);if(t>1&&n.readString(),t>5&&(n.readBool(),n.readString(),n.readString()),n.readString())throw new Error("encrypted_exocad");return t}function sx(n){const t=new zh(n),e=Hh(t);t.parseCreateSceneViewLists(e);const i=t.readI32(),s=[];for(let r=0;r<i;r+=1)s.push(t.parseMeshFromBinary(e));return s}function rx(n){const t=new zh(n),e=Hh(t),{custom:i}=t.parseCreateSceneViewLists(e);return i}const Hs=[230,200,168],ox=[["UnsegmentedJaw","#FFCD8C"],["AbutmentInterface","#cfb8db"],["Coping","#d0d7a3"],["AnatomicCrown","#FFFFFF"],["AnatomicInlay","#FFFFFF"],["HealthyTooth","#FFCD8C"],["ReducedPontic","#d0d7a3"],["AnatomicPontic","#FFFFFF"],["AnatomicWaxup","#3def91"],["ReducedWaxup","#f38c13"],["OverPressed","#CCFF33"],["PrimaryTelescope","#888888"],["AbutmentScrew","#91c3d0"],["Implant","#91d0bc"],["ScanAbutmentScan","#3c9867"],["ScanAbutmentGeometry","#f38c13"],["GingivaModelling","#f0bfdd"],["MergedTooth","#69987c"],["MergedBridgeSLM","#979869"],["MergedWaxupSLM","#979869"],["MergedBarSLM","#979869"],["BarPillar","#dedede"],["BarAttachment","#96827e"],["BarBolt","#FF0000"],["BarRider","#a800ff"],["BarRetention","#A6A57e"],["BiteSplint","#bfdfff"],["ExtraJawScan","#8382FF"],["ExtraMultiDieScan","#83A2FF"],["ExtraWaxupScan","#00FF00"],["ProvisionalPontic","#AABEFF"],["OrthoModel","#00bf9d"],["FaceScan","#FFFFFF"],["TexturedDigitalImpression","#FFFFFF"],["TexturedStoneScan","#FFFFFF"],["PreReducedTooth","#d0d7a3"],["Antagonist","#c5c4dc"],["UnsegmentedTooth","#FFCD8C"],["AbutmentPremillCollider","#cfb8db"],["ProstheticTooth","#FFFFFF"],["ProstheticBase","#ff9fb6"],["AdaptedProstheticBase","#ff9fb6"],["AestheticPlate","#C74C39"],["ProductionBlank","#7F7F7F"],["ProductionBlankDecoration","#7F7F7F"],["ExtraSituScan","#00eef0"],["MergedPontic","#69987c"],["MergedSurgicalGuide","#69987c"],["SleeveSupport","#d3d3d3"],["SurgicalDrill","#A9A9A9"],["ProstheticMonoblock","#F0F0F0"],["PreManufacturedTooth","#DBDBDB"],["ModelPlatelessBase","#00BF9D"],["MergedOffsetSubstructure","#69987C"],["ModelPlatelessDie","#5F9DFF"],["ModelPlatelessGingiva","#FF9FDF"],["ModelPlatelessGingivaEroded","#FF5FBF"],["ModelPlateTypeHealthy","#00BF9D"],["ModelPlateTypeHealthyEroded","#9DBF00"],["ModelPlateTypeMixed","#00BF9D"],["ModelPlateTypeStump","#5F9DFF"],["ModelPlateTypeStumpConcavity","#4F6FEF"],["ModelPlateTypeGingiva","#FF9FDF"],["ModelBasePlate","#FFFFFF"],["ModelBasePlatePins","#FFFFFF"],["Gingiva","#ff9fb6"],["WaxupScan","#3c9867"],["Abutment","#FF0000"],["SituScan","#00fff0"],["Attachment","#71c3e0"],["MergedBridge","#69987c"],["MergedWaxup","#69987c"],["MergedBar","#69987c"],["Bar","#dedede"],["Sleeve","#A9A9A9"]];function ax(n){const t=n.replace("#","").trim();if(t.length!==6)return null;const e=Number.parseInt(t.slice(0,2),16),i=Number.parseInt(t.slice(2,4),16),s=Number.parseInt(t.slice(4,6),16);return[e,i,s].some(r=>Number.isNaN(r))?null:[e,i,s]}function rl(n,t){return t.toLowerCase().includes(n.toLowerCase())}function cx(n){const t=n.toLowerCase();if(t.includes("upperjaw")||t.includes("lowerjaw")||rl("UnsegmentedJaw",n))return Hs;for(const[e,i]of ox)if(e.toLowerCase()!=="unsegmentedjaw"&&rl(e,n))return ax(i)??Hs;return Hs}function lx(n){return n[0]===0&&n[1]===0&&n[2]===0||n[0]===255&&n[1]===255&&n[2]===255}function ol(n,t){return n.tree_paths.length===0&&lx(n.diffuse_rgb)?t?cx(t):Hs:n.diffuse_rgb}function hx(n){return`#${n.map(t=>t.toString(16).padStart(2,"0")).join("")}`}function ux(n){if(n.length<6)return!1;const t=n[0],e=n[1],i=n[2];for(let s=3;s+2<n.length;s+=3)if(n[s]!==t||n[s+1]!==e||n[s+2]!==i)return!0;return!1}function dx(n,t){const e=new Uint8Array(n*3);for(let i=0;i<n;i+=1)e[i*3]=t[0],e[i*3+1]=t[1],e[i*3+2]=t[2];return e}function fx(n){const t=[...n].map(i=>/[\p{L}\p{N}]/u.test(i)?i.toLowerCase():"-").join("").split("-").filter(Boolean).join("-");if(t)return t;let e=2166136261;for(let i=0;i<n.length;i+=1)e^=n.charCodeAt(i),e=Math.imul(e,16777619);return`group-${(e>>>0).toString(16)}`}function px(n){const t=n.match(/^\d+/)?.[0];if(!t)return null;const e=n.slice(t.length);if(!e.startsWith(":")&&!e.startsWith(".")&&!e.startsWith(" "))return null;const i=Number(t);return i>=11&&i<=18||i>=21&&i<=28||i>=31&&i<=38||i>=41&&i<=48?i:null}function Vh(n){const t=n.toLowerCase();return t.includes("antagonist")||t.includes("антагон")||t.includes("opposing")||t.includes("opposite")||t.includes("не выбранн")||t.includes("невыбранн")||t.includes("not selected")||t.includes("unselected")||t.includes("parts not selected")}function Gh(n){const t=px(n);if(t!=null)return t>=11&&t<=18||t>=21&&t<=28?"upper":"lower";const e=n.toLowerCase();return e.includes("18-")&&e.includes("28")?"upper":e.includes("38-")&&e.includes("48")?"lower":e.includes("верхн")||e.includes("maxill")||e.includes("upper")?"upper":e.includes("нижн")||e.includes("mandib")||e.includes("lower")?"lower":null}function mx(n){return n.tree_paths[n.tree_paths.length-1]?.[0]??""}function gx(n,t){let e=0,i=0;for(const s of n)if(!(s.kind!=="group"||Vh(s.label)))for(const r of s.mesh_ids){const o=Gh(t.get(r)??"");o==="upper"?e+=1:o==="lower"&&(i+=1)}return i>e?"lower":e>i?"upper":null}function _x(n,t){const e=new Map(t.map(([s,r])=>[s,mx(r)])),i=gx(n,e);for(const s of n){if(s.kind!=="group"||(s.children?.length??0)>0)continue;const r=[],o=[];if(Vh(s.label))((i==="upper"?"lower":"upper")==="upper"?r:o).push(...s.mesh_ids);else for(const a of s.mesh_ids){const c=Gh(e.get(a)??"");c==="upper"?r.push(a):c==="lower"&&o.push(a)}r.length===0&&o.length===0||(s.children=[],r.length>0&&s.children.push({kind:"group",id:`${s.id}-upper`,label:"Верхняя челюсть",color_rgb:s.color_rgb,mesh_ids:r,children:[]}),o.length>0&&s.children.push({kind:"group",id:`${s.id}-lower`,label:"Нижняя челюсть",color_rgb:s.color_rgb,mesh_ids:o,children:[]}))}}function vx(n){const t=[],e=new Map;for(const[i,s]of n){const r=s.tree_paths;if(r.length<=1){const l=r[r.length-1];t.push({kind:"mesh",mesh_id:i,label:l?.[0]||i,color_rgb:l?.[1]??[200,200,200]});continue}const o=r[0][0],a=r[0][1],c=e.get(o);if(c!=null){const l=t[c];l?.kind==="group"&&l.mesh_ids.push(i)}else e.set(o,t.length),t.push({kind:"group",id:fx(o),label:o,color_rgb:a,mesh_ids:[i],children:[]})}return _x(t,n),{nodes:t}}const al='DentalWebGL.m_Data = {"data": "';class dn extends Error{code;constructor(t,e){super(e),this.name="ExocadHtmlParseError",this.code=t}}function xx(n){return n.includes("d3d-scene-payload")||n.includes("application/d3d+gzip")||n.includes("d3d-scene-encrypted")?"d3d":n.includes("DentalWebGL.m_Data")||n.includes("DentalWebGL")?"exocad":"unknown"}function Mx(n){const t=n.lastIndexOf(al);if(t<0)throw new dn("not_exocad","Файл не похож на Exocad HTML (нет DentalWebGL.m_Data)");const e=t+al.length,i=n.slice(e);let s=0;for(;s<i.length;){const l=i[s];if(l>="A"&&l<="Z"||l>="a"&&l<="z"||l>="0"&&l<="9"||l==="+"||l==="/"||l==="="){s+=1;continue}break}let r=i.slice(0,s);const o=(4-r.length%4)%4;r+="=".repeat(o);const a=atob(r),c=new Uint8Array(a.length);for(let l=0;l<a.length;l+=1)c[l]=a.charCodeAt(l);return c}function cl(n){return new Uint8Array(n.buffer,n.byteOffset,n.byteLength).slice()}function yx(n){return new Uint8Array(n.buffer,n.byteOffset,n.byteLength).slice()}function Sx(n,t){let e=n,i=2;for(;t.has(e);)e=`${n} (${i})`,i+=1;return t.add(e),e}function Ex(n,t,e,i){if(n.ctm_blob.length===0)return null;let s;try{s=bh(n.ctm_blob)}catch{return null}const r=s.positions.slice(),o=s.indices.slice();Z0(r,n.matrix),Q0(n.matrix)<0&&$0(o);const a=tx(n)??`${e} ${t+1}`,c=Sx(a,i),l=r.length/3,h=o.length/3;let u=null;n.has_texture?u=null:s.colors&&ux(s.colors)?u=s.colors:u=dx(l,ol(n,c));const d=n.has_texture?n.texture_bytes:null,m=n.has_texture&&s.uvs?s.uvs:null,g=n.has_texture?null:hx(ol(n,c));return{id:`m${t}`,name:c,visible:!0,opacity:1,flat_shading:n.flat_shading_only,mesh_color:g,transform:kh(),buffers:{positions_b64:Vn(cl(r)),indices_b64:Vn(yx(o)),colors_b64:u?Vn(u):null,has_vertex_colors:!!u,has_image:!!d&&d.length>0,has_uvs:!!m&&m.length>0,image_b64:d&&d.length>0?Vn(d):null,uvs_b64:m?Vn(cl(m)):null,vertex_count:l,triangle_count:h}}}function bx(n,t){const e=Mx(n);let i,s;try{i=sx(e),s=rx(e)}catch(h){const u=h instanceof Error?h.message:String(h);throw u==="encrypted_exocad"?new dn("encrypted_exocad","Зашифрованный Exocad HTML не поддерживается"):new dn("parse_failed",u)}const r=(t??"exocad").trim()||"exocad",o=new Set,a=[],c=[];if(i.forEach((h,u)=>{const d=Ex(h,u,r,o);d&&(a.push(d),c.push([d.id,h]))}),a.length===0)throw new dn("parse_failed","В Exocad HTML нет мешей OpenCTM");const l=s.map((h,u)=>({id:`view-${u}`,label:h.label,camera_matrix:h.matrix,view_preset:null}));return{version:1,title:r,exported_at:new Date().toISOString(),camera:{},views:l,meshes:a,comments:[],measurements:[],viewer_defaults:{mesh_color:"#c8c8c8",flat_shading:!1,lighting_profile:"d3dHtml",theme:"dark"},object_tree:vx(c)}}async function wx(n){if(typeof DecompressionStream>"u")throw new dn("gunzip","Браузер не поддерживает gzip");const t=new Blob([n]).stream().pipeThrough(new DecompressionStream("gzip"));return new Uint8Array(await new Response(t).arrayBuffer())}function ll(n,t){const e=new RegExp(`<script([^>]*\\bid=["']${t}["'][^>]*)>([\\s\\S]*?)<\/script>`,"i"),i=n.match(e);return i?{tag:i[1]??"",body:(i[2]??"").trim()}:null}function Tx(n){if(wh(n)){const i=Th(n),s=JSON.parse(new TextDecoder().decode(i.json));for(const o of s.meshes){const a=o.buffers.pack_index;if(a==null||!i.packs[a])continue;const c=i.packs[a];o.buffers.pack_bytes=c.pack,c.colors&&c.colors.length>0&&(o.buffers.colors_b64=Vn(c.colors),o.buffers.has_vertex_colors=!0),c.image&&c.image.length>0&&(o.buffers.image_bytes=c.image,o.buffers.has_image=!0),c.uvs&&c.uvs.length>0&&(o.buffers.uvs_bytes=c.uvs,o.buffers.has_uvs=!0)}const r=bi(s);return r&&(s.articulator=r),s}const t=JSON.parse(new TextDecoder().decode(n)),e=bi(t);return e&&(t.articulator=e),t}async function Ax(n){if(ll(n,"d3d-scene-encrypted"))throw new dn("encrypted_d3d","Зашифрованный D3D HTML: откройте файл с паролем в desktop-экспорте или снимите пароль");const e=ll(n,"d3d-scene-payload");if(!e?.body)throw new dn("not_d3d","В файле нет d3d-scene-payload");const i=we(e.body),s=await wx(i).catch(()=>i);return Tx(s)}async function Cx(n,t){const e=xx(n);if(e==="d3d")return Ax(n);if(e==="exocad")return bx(n,t);throw new dn("not_exocad_or_d3d","Файл не похож на Exocad HTML и не на D3D HTML")}const Xr=document.getElementById("embed-status"),hl=document.getElementById("empty-hint"),ul=document.getElementById("embed-file");let dl=null;function Xi(n,t=!1){Xr&&(Xr.textContent=n,Xr.classList.toggle("is-err",t))}async function Wh(n,t){Xi("Обработка…",!1),hl?.setAttribute("hidden","");try{const e=await Cx(n,t);dl?.dispose(),dl=await Bh(e),Xi(e.title||"Готово")}catch(e){const i=e instanceof dn||e instanceof Error?e.message:"Не удалось открыть файл";Xi(i,!0),hl?.removeAttribute("hidden")}}ul?.addEventListener("change",()=>{const n=ul.files?.[0];n&&n.text().then(t=>Wh(t,n.name.replace(/\.html?$/i,"")))});const Yr=new URLSearchParams(location.search).get("src");Yr&&(Xi("Загрузка…"),fetch(Yr).then(async n=>{if(!n.ok)throw new Error(`Не удалось скачать файл (${n.status})`);const t=await n.text(),e=decodeURIComponent(Yr.split("/").pop()??"scene").replace(/\.html?$/i,"");return Wh(t,e)}).catch(n=>{Xi(n instanceof Error?n.message:"Ошибка загрузки",!0)}));
