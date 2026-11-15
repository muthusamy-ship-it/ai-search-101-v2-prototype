/*
  MaximusLabs FX library · maximus-fx.js
  Ten animated backgrounds in the MaximusLabs design system (ink and night grounds, deep, royal, sky and pale blues),
  collected on 7 November 2026 so any page can reuse them. No dependencies: WebGL 1 or 2 and the 2D canvas.

    1  signal    Signal field     twinkling dot grid that parts around the cursor (after Aceternity's dot distortion)
    2  horizon   Horizon          perspective landscape of dots rolling along the bottom (after Horizon Drift)
    3  woven     Woven grid       dot lattice bending like cloth, with dark voids (after a warped-lattice reference)
    4  ribbon    Light ribbon     band of fine light lines twisting diagonally (after a particle-wave reference)
    5  stage     Stage light      volumetric beams sweeping through haze (after Seba Soler's stage work)
    6  silk      Silk wave        3D ribbon of fine lines that twists as it falls (after stripe.com's first fold)
    7  glass     Glass prism      twisted glass prism refracting drifting glows (after sentinelone.com's hero)
    8  network   Citation network sources pulse into one bright hub, your brand (original)
    9  pixel     Pixel bloom      dithered square-pixel glow, the grain of the Geist Pixel headline (original)
    10 orbits    Eight orbits     eight rings, one per AI engine, around one core (original)

  Usage:
    const fx = MaxFX.mount(hostElement, 'silk', {
      intensity: 0.6,          // canvas opacity, 0 to 1 (backgrounds behind busy content want 0.4 to 0.7)
      focus: [0.7, 0.5],       // where the effect centres, as fractions of the host (x from left, y from top)
      focusEl: phoneElement,   // or follow an element's centre every frame (wins over focus)
      mask: 'side',            // 'side' fades toward the left copy, 'low' keeps the bottom, 'top' fades the top,
                               // 'corner' keeps the bottom right, 'none'
      pointerEl: card,         // element whose pointer moves drive the cursor reactions (default: host)
      boostEl: ctaButton,      // hovering it "boosts" the effect, as on composio.dev
      speed: 1,                // time multiplier
      tone: 'light',           // 'blue' (default) for dark grounds; 'light' turns the effect into white light
      gain: 1.5,               // with tone 'light': extra brightness for effects made of thin lines
      size: 1,                 // scale for effects drawn around the focus (Eight orbits)
      strength: 1,             // opacity multiplier inside the effect, for faint line effects on bright grounds
    });

  On a bright or coloured ground (the homepage hero's blue glass), blue light on blue glass disappears. Use
  tone: 'light' and give the host element mix-blend-mode: screen, so the effect adds white light to the glass and
  its dark parts drop out.
    fx.destroy();

  Every effect settles in over about two seconds, pauses while off screen, and renders one still frame (no motion)
  for visitors who ask for reduced motion. The host must be positioned; the canvas fills it behind its content.
*/
(() => {
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  const MASKS = {
    side: 'linear-gradient(90deg, #0000 0%, #0006 28%, #000 58%)',
    low: 'linear-gradient(180deg, #0000 0%, #0000 50%, #000 66%)',
    top: 'linear-gradient(180deg, #0000 0%, #0005 30%, #000 55%)',
    corner: 'radial-gradient(70% 90% at 82% 100%, #000 35%, #0000 100%)',
    none: '',
  };

  // Every effect closes over one mount's shared state S: time, intro, eased cursor, eased boost and focus.
  function effects(S) {
    // ---------- WebGL helper ----------
    const HEAD = `precision highp float;
      uniform vec2 r; uniform float t, intro, boost, hover, dpr; uniform vec2 m; uniform vec2 fc; uniform float ag;
      const vec3 ROYAL=vec3(0.0,0.439,0.878), SKY=vec3(0.267,0.604,0.984), PALE=vec3(0.557,0.757,1.0), DEEP=vec3(0.0,0.078,0.227);
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
      float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }`;
    // res lets heavy shaders render at a lower resolution; the canvas is stretched back to full size.
    function gl(canvas, body, res = 1) {
      const g = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
      if (!g) return null;
      const sh = (type, src) => { const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s); if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s)); return s; };
      const p = g.createProgram();
      g.attachShader(p, sh(g.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position=vec4(a,0.0,1.0); }'));
      g.attachShader(p, sh(g.FRAGMENT_SHADER, HEAD + body.replace(/gl_FragColor=([^;]+);/g, 'gl_FragColor=min(($1)*ag,vec4(1.0));'))); g.linkProgram(p); g.useProgram(p);
      g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer()); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
      const loc = g.getAttribLocation(p, 'a'); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
      const U = Object.fromEntries(['r', 't', 'intro', 'boost', 'hover', 'dpr', 'm', 'fc', 'ag'].map((n) => [n, g.getUniformLocation(p, n)]));
      const draw = () => {
        const w = Math.round(canvas.clientWidth * DPR * res), h = Math.round(canvas.clientHeight * DPR * res);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; g.viewport(0, 0, w, h); }
        g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT);
        g.uniform2f(U.r, w, h); g.uniform1f(U.t, S.t); g.uniform1f(U.intro, S.intro); g.uniform1f(U.boost, S.boost);
        g.uniform1f(U.hover, S.hover); g.uniform1f(U.dpr, DPR * res); g.uniform2f(U.m, S.mx * res, S.my * res); g.uniform2f(U.fc, S.fx, 1 - S.fy); g.uniform1f(U.ag, S.ag); g.drawArrays(g.TRIANGLES, 0, 3);
      };
      draw.dispose = () => { const x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); };
      return draw;
    }

    // 1 · Signal field: a fine grid of dots in our blues. Dots twinkle at random, a slow brightness wave
    // drifts across, and the cursor pushes dots aside and lights them. Hovering the button speeds the twinkle.
    const SIGNAL = `void main(){
      vec2 px=gl_FragCoord.xy; float g=18.0*dpr;
      vec2 toM=px-m; float d=length(toM); float R=150.0*dpr;
      float infl=exp(-(d*d)/(R*R))*hover;
      vec2 q=px-normalize(toM+0.0001)*infl*22.0*dpr;
      vec2 cell=floor(q/g); vec2 f=q-(cell+0.5)*g; float dist=length(f);
      float h=hash(cell);
      float pulse=pow(0.5+0.5*sin(t*(0.5+h*1.1)+h*60.0),14.0);
      float wave=fbm(cell*0.06+vec2(t*0.04,-t*0.02));
      float rad=(0.85+pulse*1.1+infl*1.0)*dpr;
      float dotA=smoothstep(rad+0.8*dpr,rad-0.2*dpr,dist);
      float a=dotA*(0.16+0.55*wave+0.9*pulse+0.9*infl)*(1.0+0.6*boost)*intro;
      vec3 col=mix(SKY,PALE,clamp(pulse+infl,0.0,1.0));
      vec2 uv=px/r; float glow=exp(-pow(length((uv-fc)*vec2(r.x/r.y,1.0)),2.0)*3.0)*0.10*intro;
      vec3 c=col*a+ROYAL*glow; float al=clamp(a+glow,0.0,1.0);
      gl_FragColor=vec4(c,al); }`;

    // 3 · Woven grid: a regular lattice bent by flowing noise. Some areas fade to void. The cursor sends a
    // ripple through the cloth; hovering the button deepens the bend.
    const WOVEN = `void main(){
      vec2 px=gl_FragCoord.xy; float g=16.0*dpr; vec2 p=px/g;
      float s=t*0.06;
      vec2 w=vec2(fbm(p*0.045+vec2(0.0,s)), fbm(p*0.045+vec2(5.2,-s)))-0.5;
      vec2 q=p+w*(7.0+5.0*boost);
      vec2 mg=m/g; float L=length(p-mg);
      q+=normalize(p-mg+0.0001)*sin(L*0.7-t*3.2)*exp(-L*0.09)*1.4*hover;
      vec2 f=fract(q)-0.5; float d=length(f)*g;
      float voids=smoothstep(0.30,0.52,fbm(p*0.028+vec2(s*0.6,0.0)));
      float shade=0.35+0.65*fbm(q*0.04);
      float rad=1.15*dpr; float dotA=smoothstep(rad+0.9*dpr,rad-0.2*dpr,d);
      float a=dotA*voids*shade*(0.85+0.3*boost)*intro;
      vec3 col=mix(SKY,mix(PALE,vec3(1.0),0.55),shade);
      gl_FragColor=vec4(col*a,a); }`;

    // 5 · Stage light: beams fan up from a source below the right of the card and sweep slowly through haze;
    // two fainter beams fall from the top right. Hovering the button brings the beams together and brightens them.
    const STAGE = `float beams(vec2 uv, vec2 src, float base, float spread, int n, float w, float sp, float seed){
      vec2 d=uv-src; float ang=atan(d.x,d.y); float len=length(d); float acc=0.0;
      for(int k=0;k<7;k++){ if(k>=n) break; float fk=float(k);
        float th=base+(fk/float(n-1)-0.5)*spread*(1.0-0.55*boost)+0.22*sin(t*sp+fk*1.9+seed);
        float b=exp(-pow((ang-th)/w,2.0)); acc+=b*(0.55+0.45*sin(t*0.7+fk*2.3+seed)); }
      return acc*exp(-len*1.15);
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/r; vec2 a=uv*vec2(r.x/r.y,1.0); float k=r.x/r.y;
      float haze=0.55+0.45*fbm(a*2.2+vec2(t*0.05,-t*0.08));
      float up=beams(a,vec2(k*fc.x,-0.18),0.0,1.25,6,0.045,0.35,0.0);
      float dn=beams(a,vec2(k*(fc.x+0.34),1.15),3.6,0.6,3,0.04,0.28,4.0)*0.55;
      float floorGlow=exp(-length((a-vec2(k*fc.x,-0.05))*vec2(1.0,2.6))*3.2)*0.55;
      float I=(up+dn)*haze*(1.0+0.9*boost)*intro+floorGlow*intro;
      vec3 col=mix(ROYAL,PALE,clamp(I*0.7,0.0,1.0))*I;
      float al=clamp(I,0.0,1.0);
      gl_FragColor=vec4(col,al); }`;

    // ---------- Canvas 2D options ----------
    // 2 · Horizon: a perspective landscape of dots. Rows roll like a slow swell; crests catch pale light.
    function horizon(canvas) {
      const x = canvas.getContext('2d'); const NX = 150, NZ = 46;
      return () => {
        const w = Math.round(canvas.clientWidth * DPR), h = Math.round(canvas.clientHeight * DPR);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        x.clearRect(0, 0, w, h);
        const T = S.t, amp = (0.42 + 0.35 * S.boost) * S.intro, F = w * 0.62, horizonY = h * 0.56, cam = 1.55;
        for (let j = NZ - 1; j >= 0; j--) {
          const z = 1.4 + j * 0.28;
          for (let i = 0; i < NX; i++) {
            const X = (i / (NX - 1) - 0.5) * 7.0;
            const Y = amp * (Math.sin(X * 1.25 + z * 0.55 - T * 0.7) * 0.6 + Math.sin(X * 0.55 - z * 0.85 + T * 0.45) * 0.5 + Math.sin(X * 2.3 + z * 1.4 - T * 1.1) * 0.12);
            const sx = w * 0.5 + (X / z) * F, sy = horizonY + ((cam - Y) / z) * h * 0.36;
            if (sx < -4 || sx > w + 4 || sy > h + 4) continue;
            const depth = 1 - j / NZ; const crest = Math.max(0, Math.min(1, (Y / (amp + 0.001)) * 0.5 + 0.5));
            const size = Math.max(0.6, 2.1 * depth) * DPR;
            const alpha = (0.18 + 0.82 * depth) * (0.45 + 0.55 * crest) * S.intro;
            const rC = Math.round(0 + 142 * crest * 0.85 + 68 * (1 - crest) * 0.4), gC = Math.round(112 + (193 - 112) * crest), bC = Math.round(224 + 31 * crest);
            x.fillStyle = `rgba(${rC},${gC},${bC},${alpha.toFixed(3)})`; x.fillRect(sx, sy, size, size);
          }
        }
      };
    }

    // 4 · Light ribbon: about 70 fine lines form one band that twists as it flows diagonally up to the right,
    // with a few drifting motes. Hovering the button speeds the twist and brightens the band.
    function ribbon(canvas) {
      const x = canvas.getContext('2d'); const N = 110; const motes = Array.from({ length: 70 }, () => ({ u: Math.random(), v: Math.random(), s: Math.random() }));
      return () => {
        const w = Math.round(canvas.clientWidth * DPR), h = Math.round(canvas.clientHeight * DPR);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        x.clearRect(0, 0, w, h); x.globalCompositeOperation = 'lighter';
        const T = S.t * (1 + 1.2 * S.boost), bright = (1 + 0.8 * S.boost) * S.intro;
        for (let i = 0; i < N; i++) {
          const s = i / (N - 1) - 0.5; x.beginPath();
          for (let px = -0.08 * w; px <= 1.08 * w; px += 7 * DPR) {
            const u = px / w;
            const cy = h * (0.80 - 0.50 * u) + h * 0.05 * Math.sin(u * 3.1 + T * 0.35);
            const A = h * 0.2 * (0.3 + 0.7 * Math.sin(Math.min(1, Math.max(0, u)) * Math.PI));
            const ph = u * 5.0 - T * 0.5;
            const y = cy + A * (s * 2.0 * Math.cos(ph) + 0.28 * Math.sin(ph * 0.5 + s * 4.0));
            px === -0.08 * w ? x.moveTo(px, y) : x.lineTo(px, y);
          }
          const edge = 1 - Math.abs(s) * 1.6;
          x.strokeStyle = `rgba(${i % 3 ? '68,154,251' : '142,193,255'},${(0.07 + 0.16 * Math.max(0, edge)) * bright})`;
          x.lineWidth = 0.9 * DPR; x.stroke();
        }
        for (const m of motes) {
          m.u += 0.00025 * (1 + m.s); m.v += 0.00012 * Math.sin(T + m.s * 9); if (m.u > 1.05) m.u = -0.05;
          const tw = 0.4 + 0.6 * Math.sin(T * (1 + m.s) + m.s * 30);
          x.fillStyle = `rgba(142,193,255,${(0.25 * tw * bright).toFixed(3)})`;
          const r = (0.8 + m.s * 1.6) * DPR; x.beginPath(); x.arc(m.u * w, m.v * h, r, 0, 6.283); x.fill();
        }
        x.globalCompositeOperation = 'source-over';
      };
    }

    // 6 · Silk wave, after Stripe: a real 3D ribbon mesh. A centre curve falls from the top right, bows in
    // toward the middle and leaves at the bottom right. The ribbon twists around that curve, and fine lines run
    // along its length, so the folds where the surface turns edge-on read as bright, dense silk. It draws itself
    // in from the top during the intro. The cursor tilts it; hovering the button speeds the twist and brightens it.
    function silk(canvas) {
      const g = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: true });
      if (!g) return null;
      const VS = `#version 300 es
        in vec2 a; uniform float t, intro, hover, asp, sx; uniform vec2 mn;
        out vec2 vUV; out float vFade; out float vShade;
        vec3 curve(float s, float T){
          float b=2.0*s-1.0;
          return vec3(1.05+sx+1.75*b*b+0.30*sin(s*3.1+T*0.11),
                      mix(2.45,-2.45,s)+0.16*sin(s*4.3-T*0.17),
                      0.55*sin(s*2.3-T*0.15)-0.25);
        }
        void main(){
          float s=a.x, w=a.y, T=t;
          vec3 C=curve(s,T); vec3 Tn=normalize(curve(s+0.004,T)-C);
          vec3 N1=normalize(cross(Tn,vec3(0.0,0.0,1.0))); vec3 N2=cross(N1,Tn);
          float th=0.6+5.2*s+1.2*sin(s*2.1+T*0.21)+0.6*sin(s*5.3-T*0.13)+hover*mn.x*0.7;
          vec3 dir=cos(th)*N1+sin(th)*N2;
          vec3 nrm=normalize(cross(Tn,dir));
          float W=0.45+1.55*pow(sin(3.14159*s),0.8);
          vec3 P=C+dir*(w*W)+nrm*0.10*sin(w*7.0+s*9.0-T*0.7);
          P.xy+=hover*mn*vec2(0.16,0.10);
          float d=4.2-P.z, f=2.3;
          gl_Position=vec4(P.x/d*f/asp, P.y/d*f, 0.0, 1.0);
          vUV=vec2(s,w+0.5);
          vShade=0.35+0.65*abs(nrm.z);
          float rev=1.0-smoothstep(intro*1.3-0.3, intro*1.3, s);
          vFade=smoothstep(0.0,0.08,s)*smoothstep(1.0,0.9,s)*rev;
        }`;
      const FS = `#version 300 es
        precision highp float;
        in vec2 vUV; in float vFade; in float vShade; uniform float boost, t, ag; out vec4 o;
        vec3 pal(float x){
          vec3 c0=vec3(0.0,0.078,0.227), c1=vec3(0.0,0.439,0.878), c2=vec3(0.267,0.604,0.984), c3=vec3(0.557,0.757,1.0), c4=vec3(0.93,0.97,1.0);
          x=clamp(x,0.0,1.0)*4.0;
          if(x<1.0) return mix(c0,c1,x); if(x<2.0) return mix(c1,c2,x-1.0); if(x<3.0) return mix(c2,c3,x-2.0); return mix(c3,c4,x-3.0);
        }
        void main(){
          float k=vUV.y*96.0; float fw=fwidth(k);
          float d=abs(fract(k+0.5)-0.5); float lw=0.08;
          float line=1.0-smoothstep(lw, lw+max(fw,0.001), d);
          float cov=mix(line, 2.0*lw+0.10, smoothstep(0.35,1.0,fw))+0.22*smoothstep(0.8,3.0,fw);
          float edge=smoothstep(0.0,0.05,vUV.y)*smoothstep(1.0,0.95,vUV.y);
          float sheen=exp(-pow((vUV.x-fract(t*0.045)*1.6+0.3)*5.0,2.0));
          float fold=1.0-vShade;                       // edge-on folds glow, as on Stripe
          vec3 c=pal(0.30+0.40*sin(3.14159*vUV.x)+0.22*(vUV.y-0.5)+0.30*fold+0.30*sheen);
          float body=0.06+0.45*fold*fold+0.22*sheen;        // a soft silk surface under the lines
          float al=(cov*0.9+body)*edge*vFade*(0.85+0.5*boost)*0.62;
          al=min(al*ag,1.0); o=vec4(c*al,al);
        }`;
      const sh = (type, src) => { const x = g.createShader(type); g.shaderSource(x, src); g.compileShader(x); if (!g.getShaderParameter(x, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(x)); return x; };
      const p = g.createProgram(); g.attachShader(p, sh(g.VERTEX_SHADER, VS)); g.attachShader(p, sh(g.FRAGMENT_SHADER, FS)); g.linkProgram(p); g.useProgram(p);
      const NS = 260, NW = 90, verts = new Float32Array(NS * NW * 2), idx = new Uint16Array((NS - 1) * (NW - 1) * 6);
      for (let i = 0; i < NS; i++) for (let j = 0; j < NW; j++) { const k = (i * NW + j) * 2; verts[k] = i / (NS - 1); verts[k + 1] = j / (NW - 1) - 0.5; }
      let n = 0; for (let i = 0; i < NS - 1; i++) for (let j = 0; j < NW - 1; j++) { const a0 = i * NW + j, b0 = a0 + NW; idx.set([a0, b0, a0 + 1, a0 + 1, b0, b0 + 1], n); n += 6; }
      g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer()); g.bufferData(g.ARRAY_BUFFER, verts, g.STATIC_DRAW);
      g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, g.createBuffer()); g.bufferData(g.ELEMENT_ARRAY_BUFFER, idx, g.STATIC_DRAW);
      const loc = g.getAttribLocation(p, 'a'); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
      const U = Object.fromEntries(['t', 'intro', 'hover', 'asp', 'mn', 'boost', 'sx', 'ag'].map((k) => [k, g.getUniformLocation(p, k)]));
      g.enable(g.BLEND); g.blendFunc(g.ONE, g.ONE);   // additive, so overlapping folds glow
      const draw = () => {
        const w = Math.round(canvas.clientWidth * DPR), h = Math.round(canvas.clientHeight * DPR);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; g.viewport(0, 0, w, h); }
        g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT);
        g.uniform1f(U.sx, (S.fx - 0.67) * 2 * (w / h) * 4.45 / 2.3); g.uniform1f(U.ag, S.ag); g.uniform1f(U.t, S.t); g.uniform1f(U.intro, S.intro); g.uniform1f(U.hover, S.hover); g.uniform1f(U.boost, S.boost); g.uniform1f(U.asp, w / h);
        g.uniform2f(U.mn, S.mx > -999 ? S.mx / w * 2 - 1 : 0, S.my > -999 ? S.my / h * 2 - 1 : 0);
        g.drawElements(g.TRIANGLES, idx.length, g.UNSIGNED_SHORT, 0);
      };
      draw.dispose = () => { const x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); };
      return draw;
    }

    // 7 · Glass prism, after SentinelOne: a ray-marched, twisted octahedron of glass on the right of the card.
    // Behind it sits a soft "bokeh" field of drifting blue glows. The glass refracts that field, splitting the
    // three colour channels slightly so the facet edges carry fine fringes, and catches a fresnel rim and a
    // highlight. It turns slowly. The cursor tilts it; hovering the button spins it faster and widens the fringes.
    const GLASS = `
      mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
      vec3 CEN;
      vec3 bg(vec2 uv){
        float k=r.x/r.y; vec2 p=uv*vec2(k,1.0); float sh=(fc.x-0.9)*k;
        vec3 c=vec3(0.010,0.018,0.040);
        c+=DEEP*1.6*exp(-pow(length(p-vec2(k*0.48+sh,0.30)),2.0)*3.0);
        c+=ROYAL*0.70*exp(-pow(length(p-vec2(k*0.80+sh+0.08*sin(t*0.13),0.62+0.06*cos(t*0.11))),2.0)*9.0);
        c+=SKY*0.55*exp(-pow(length(p-vec2(k*0.94+sh+0.05*cos(t*0.09),0.22+0.05*sin(t*0.15))),2.0)*9.0);
        c+=PALE*0.40*exp(-pow(length(p-vec2(k*0.64+sh+0.06*sin(t*0.07+2.0),0.90)),2.0)*14.0);
        for(int i=0;i<8;i++){ float fi=float(i);
          vec2 cp=vec2(k*(0.52+0.46*hash(vec2(fi,1.0)))+sh, fract(hash(vec2(fi,2.0))+t*0.006*(0.5+hash(vec2(fi,3.0)))));
          float rad=0.03+0.06*hash(vec2(fi,4.0));
          c+=mix(SKY,PALE,hash(vec2(fi,5.0)))*0.05*smoothstep(rad,rad*0.3,length(p-cp)); }
        return c*mix(0.12,1.0,smoothstep(0.30+fc.x-0.9,0.80+fc.x-0.9,uv.x));
      }
      float sdf(vec3 p){
        p-=CEN;
        p.xz*=rot(t*0.07+0.4+(m.x/r.x-0.5)*0.6*hover);
        p.yz*=rot(0.28+(m.y/r.y-0.5)*0.45*hover);
        p.xy*=rot(0.45+t*0.03);
        float c=cos(1.25*p.y), s=sin(1.25*p.y); p.xz=mat2(c,-s,s,c)*p.xz;
        vec3 q=abs(p*vec3(1.0,0.70,1.0));
        return (q.x+q.y+q.z-0.92)*0.57735*0.60-0.04;
      }
      vec3 nor(vec3 p){ vec2 e=vec2(0.003,0.0);
        return normalize(vec3(sdf(p+e.xyy)-sdf(p-e.xyy), sdf(p+e.yxy)-sdf(p-e.yxy), sdf(p+e.yyx)-sdf(p-e.yyx))); }
      void main(){
        vec2 uv=gl_FragCoord.xy/r; float k=r.x/r.y;
        vec2 p=(gl_FragCoord.xy-0.5*r)/r.y;
        CEN=vec3((fc.x-0.5)*k*2.27, (fc.y-0.5)*2.27, 0.0);
        vec3 ro=vec3(0.0,0.0,5.0), rd=normalize(vec3(p,-2.2));
        float T=2.2, hit=0.0, md=9.0; vec3 pos=ro;
        for(int i=0;i<84;i++){ pos=ro+rd*T; float d=sdf(pos); md=min(md,d); if(d<0.002){ hit=1.0; break; } T+=d*0.62; if(T>8.5) break; }
        vec3 col=bg(uv);
        if(hit<0.5) col+=PALE*0.75*pow(smoothstep(0.045,0.0,md),1.5)*intro;   // soft rim instead of a jagged edge
        if(hit>0.5){
          vec3 n=nor(pos);
          vec2 o=refract(rd,n,1.0/1.32).xy*0.38;
          float disp=0.045*(1.0+1.4*boost);
          vec3 g=vec3(bg(uv+o*(1.0-disp*4.0)).r, bg(uv+o).g, bg(uv+o*(1.0+disp*4.0)).b);
          float fr=pow(1.0-abs(dot(n,-rd)),3.0);
          float sp=pow(max(dot(reflect(rd,n),normalize(vec3(-0.45,0.7,0.55))),0.0),36.0);
          vec3 gc=g*1.2+PALE*fr*0.85+vec3(0.85,0.93,1.0)*sp*0.7+ROYAL*0.05;
          col=mix(col,gc,intro);
        }
        gl_FragColor=vec4(col,1.0);
      }`;

    // 8 · Citation network (our own): source nodes drift slowly on the right. Every second or so a pulse leaves
    // one source and curves into the bright hub, your brand, which answers with a ring. Lit sources glow for a
    // moment. The cursor links to nearby sources; hovering the button sends pulses faster.
    function network(canvas) {
      const x = canvas.getContext('2d'); const N = 52;
      const nodes = Array.from({ length: N }, () => ({ bx: 0.50 + 0.48 * Math.random(), by: 0.07 + 0.86 * Math.random(), z: Math.random(), ph: Math.random() * 6.283, sp: 0.3 + Math.random() * 0.6, lit: 0 }));
      const pulses = [], rings = []; let next = 0, lastT = 0;
      return () => {
        const w = Math.round(canvas.clientWidth * DPR), h = Math.round(canvas.clientHeight * DPR);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        x.clearRect(0, 0, w, h);
        const T = S.t, dt = Math.max(0, Math.min(0.1, T - lastT)); lastT = T; const I = S.intro;
        const hub = { x: w * S.fx + w * 0.006 * Math.sin(T * 0.3), y: h * S.fy + h * 0.01 * Math.cos(T * 0.25) };
        for (const n of nodes) { n.x = w * (n.bx + S.fx - 0.74 + 0.018 * Math.sin(T * 0.2 * n.sp + n.ph)); n.y = h * (n.by + S.fy - 0.5 + 0.025 * Math.cos(T * 0.17 * n.sp + n.ph * 1.3)); n.lit *= 0.965; }
        const cx = S.mx, cy = h - S.my, near = 190 * DPR;
        x.lineWidth = 1 * DPR;
        // Each source links to its two nearest neighbours.
        for (const a of nodes) {
          const d = nodes.map((b) => [(b.x - a.x) ** 2 + (b.y - a.y) ** 2, b]).sort((p, q) => p[0] - q[0]);
          for (let k = 1; k <= 2; k++) { const b = d[k][1];
            x.strokeStyle = `rgba(142,193,255,${((0.07 + 0.30 * Math.max(a.lit, b.lit)) * I).toFixed(3)})`;
            x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }
          const dc = Math.hypot(a.x - cx, a.y - cy);
          if (dc < near && S.hover > 0.01) { x.strokeStyle = `rgba(142,193,255,${(0.35 * (1 - dc / near) * S.hover * I).toFixed(3)})`; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(cx, cy); x.stroke(); a.lit = Math.max(a.lit, 0.5 * (1 - dc / near) * S.hover); }
        }
        // Pulses: a source sends a signal along a curve into the hub.
        if (T > next) { const n = nodes[(Math.random() * N) | 0]; pulses.push({ n, p: 0, sp: 0.45 + 0.3 * Math.random(), bend: (Math.random() - 0.5) * 0.6 }); next = T + 0.75 - 0.45 * S.boost + Math.random() * 0.5; n.lit = 1; }
        for (let i = pulses.length - 1; i >= 0; i--) {
          const P = pulses[i]; P.p += dt * P.sp;
          const ax = P.n.x, ay = P.n.y, mx = (ax + hub.x) / 2 - (hub.y - ay) * P.bend, my = (ay + hub.y) / 2 + (hub.x - ax) * P.bend;
          const at = (u) => [(1 - u) ** 2 * ax + 2 * (1 - u) * u * mx + u * u * hub.x, (1 - u) ** 2 * ay + 2 * (1 - u) * u * my + u * u * hub.y];
          const head = Math.min(1, P.p), tail = Math.max(0, head - 0.35);
          for (let s = 0; s < 18; s++) { const u0 = tail + (head - tail) * s / 18, u1 = tail + (head - tail) * (s + 1) / 18; const [x0, y0] = at(u0), [x1, y1] = at(u1);
            x.strokeStyle = `rgba(68,154,251,${((s / 18) * 0.85 * I).toFixed(3)})`; x.lineWidth = 1.4 * DPR; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); }
          const [hx, hy] = at(head); x.fillStyle = `rgba(220,236,255,${(0.95 * I).toFixed(3)})`; x.beginPath(); x.arc(hx, hy, 2 * DPR, 0, 6.283); x.fill();
          if (P.p >= 1) { rings.push({ r: 10 * DPR, a: 0.7 }); pulses.splice(i, 1); }
        }
        // Sources.
        for (const n of nodes) { const r = (1.1 + 1.6 * n.z + 1.5 * n.lit) * DPR; x.fillStyle = `rgba(142,193,255,${((0.28 + 0.45 * n.z + 0.5 * n.lit) * I).toFixed(3)})`; x.beginPath(); x.arc(n.x, n.y, r, 0, 6.283); x.fill(); }
        // The hub: soft royal glow, rings when an answer lands, pale core.
        const gR = h * 0.22, gr = x.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, gR);
        gr.addColorStop(0, `rgba(0,112,224,${(0.42 * I).toFixed(3)})`); gr.addColorStop(1, 'rgba(0,112,224,0)');
        x.fillStyle = gr; x.beginPath(); x.arc(hub.x, hub.y, gR, 0, 6.283); x.fill();
        for (let i = rings.length - 1; i >= 0; i--) { const R = rings[i]; R.r += dt * 70 * DPR; R.a -= dt * 0.55; if (R.a <= 0) { rings.splice(i, 1); continue; }
          x.strokeStyle = `rgba(142,193,255,${(R.a * I).toFixed(3)})`; x.lineWidth = 1 * DPR; x.beginPath(); x.arc(hub.x, hub.y, R.r, 0, 6.283); x.stroke(); }
        x.strokeStyle = `rgba(142,193,255,${(0.5 * I).toFixed(3)})`; x.beginPath(); x.arc(hub.x, hub.y, 12 * DPR, 0, 6.283); x.stroke();
        x.fillStyle = `rgba(235,244,255,${I.toFixed(3)})`; x.beginPath(); x.arc(hub.x, hub.y, 4.5 * DPR, 0, 6.283); x.fill();
      };
    }

    // 9 · Pixel bloom (our own): the card becomes a low-resolution display of square pixels with hairline gaps,
    // the same grain as the Geist Pixel headline. A slow flowing glow is ordered-dithered into five steps of our
    // palette, a soft diagonal scan passes every few seconds, and the cursor lights a bloom under it.
    const PIXEL = `
      float bayer2(vec2 a){ a=floor(a); return fract(dot(a,vec2(0.5,a.y*0.75))); }
      float bayer4(vec2 a){ return bayer2(0.5*a)*0.25+bayer2(a); }
      vec3 lvl(float i){ if(i<1.5) return DEEP*2.2; if(i<2.5) return ROYAL; if(i<3.5) return SKY; return PALE; }
      void main(){
        vec2 px=gl_FragCoord.xy; float cs=8.0*dpr;
        vec2 q=floor(px/cs), f=fract(px/cs);
        vec2 uv=(q+0.5)*cs/r; float k=r.x/r.y; vec2 a=uv*vec2(k,1.0);
        float flow=fbm(a*1.5+vec2(t*0.05,-t*0.03)+fbm(a*2.3-vec2(0.0,t*0.04))*0.9);
        float base=smoothstep(0.42+fc.x-0.8,1.0,uv.x);
        float bloom=exp(-pow(length(a-vec2(k*fc.x+0.06*sin(t*0.2),fc.y+0.05+0.08*cos(t*0.17))),2.0)*3.2);
        float scan=exp(-pow((uv.x*0.8+uv.y*0.6-fract(t*0.055)*2.4+0.5)*6.0,2.0))*0.45;
        vec2 cm=(m/r)*vec2(k,1.0); float cur=exp(-pow(length(a-cm),2.0)*30.0)*hover*0.9;
        float v=((smoothstep(0.38,0.85,flow)*0.55+scan)*base+bloom*0.50+cur)*intro*(1.0+0.25*boost);
        v=clamp(v*0.9,0.0,1.0)*4.0;
        float i=floor(v); if(fract(v)>bayer4(q)) i+=1.0;
        float inside=step(0.13,f.x)*step(0.13,f.y);
        float al=(i>0.5?1.0:0.0)*inside*pow(min(i,4.0)/4.0,1.4);
        gl_FragColor=vec4(lvl(i)*al,al);
      }`;

    // 10 · Eight orbits (our own): eight thin rings in 3D, one for each AI engine, tilted at different angles
    // around one bright core on the right. A point of light travels each ring with a short tail; the far side of
    // each ring dims. The rings open out during the intro. The cursor tilts the system; hovering the button
    // speeds the travellers.
    function orbits(canvas) {
      const x = canvas.getContext('2d');
      const rings = Array.from({ length: 8 }, (_, i) => ({ r: 0.16 + i * 0.035, inc: 0.45 + 0.85 * ((i * 0.618) % 1), lan: i * 0.785 + 0.3, sp: (0.32 + 0.1 * (i % 3)) * (i % 2 ? 1 : -1), ph: i * 1.3 }));
      return () => {
        const w = Math.round(canvas.clientWidth * DPR), h = Math.round(canvas.clientHeight * DPR);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        x.clearRect(0, 0, w, h); x.globalCompositeOperation = 'lighter';
        const T = S.t, I = S.intro, cx0 = w * S.fx, cy0 = h * S.fy, sc = h * (0.55 + 0.45 * I) * S.size;
        const ry = T * 0.06 + (S.mx > -999 ? (S.mx / w - 0.5) * 0.7 * S.hover : 0), rx = 0.22 + (S.my > -999 ? (S.my / h - 0.5) * 0.5 * S.hover : 0);
        const cyR = Math.cos(ry), syR = Math.sin(ry), cxR = Math.cos(rx), sxR = Math.sin(rx);
        const pt = (R, ang) => {
          let X = Math.cos(ang) * R.r, Y = Math.sin(ang) * R.r, Z = 0;
          let Y2 = Y * Math.cos(R.inc), Z2 = Y * Math.sin(R.inc); Y = Y2; Z = Z2;              // tilt the ring
          let X2 = X * Math.cos(R.lan) - Z * Math.sin(R.lan); Z2 = X * Math.sin(R.lan) + Z * Math.cos(R.lan); X = X2; Z = Z2;
          X2 = X * cyR - Z * syR; Z2 = X * syR + Z * cyR; X = X2; Z = Z2;                       // spin the system
          Y2 = Y * cxR - Z * sxR; Z2 = Y * sxR + Z * cxR; Y = Y2; Z = Z2;                       // tilt toward the viewer
          const s = 2.6 / (2.6 - Z); return [cx0 + X * s * sc, cy0 - Y * s * sc, Z];
        };
        const core = x.createRadialGradient(cx0, cy0, 0, cx0, cy0, h * 0.16);
        core.addColorStop(0, `rgba(0,112,224,${(0.5 * I).toFixed(3)})`); core.addColorStop(1, 'rgba(0,112,224,0)');
        x.fillStyle = core; x.beginPath(); x.arc(cx0, cy0, h * 0.16, 0, 6.283); x.fill();
        x.lineWidth = 1 * DPR;
        for (const R of rings) {
          let prev = pt(R, 0);
          for (let s = 1; s <= 120; s++) { const cur = pt(R, s / 120 * 6.283);
            const z = (prev[2] + cur[2]) / 2 / R.r; x.strokeStyle = `rgba(142,193,255,${((0.07 + 0.20 * (z * 0.5 + 0.5)) * (0.9 + 0.5 * S.boost) * I).toFixed(3)})`;
            x.beginPath(); x.moveTo(prev[0], prev[1]); x.lineTo(cur[0], cur[1]); x.stroke(); prev = cur; }
          const a0 = R.ph + T * R.sp;
          for (let k = 0; k < 26; k++) { const [px, py] = pt(R, a0 - Math.sign(R.sp) * k * 0.035); const f = 1 - k / 26;
            x.fillStyle = `rgba(${k ? '68,154,251' : '235,244,255'},${(0.9 * f * f * I).toFixed(3)})`; x.beginPath(); x.arc(px, py, (k ? 1.6 * f + 0.4 : 2.6) * DPR, 0, 6.283); x.fill(); }
        }
        x.fillStyle = `rgba(235,244,255,${I.toFixed(3)})`; x.beginPath(); x.arc(cx0, cy0, 4 * DPR, 0, 6.283); x.fill();
        x.globalCompositeOperation = 'source-over';
      };
    }

    return { gl, SIGNAL, WOVEN, STAGE, GLASS, PIXEL, horizon, ribbon, silk, network, orbits };
  }

  const FX = {
    1: { key: 'signal', name: 'Signal field', mask: 'side', focus: [0.78, 0.5], make: (E, c) => E.gl(c, E.SIGNAL) },
    2: { key: 'horizon', kind: '2d', name: 'Horizon', mask: 'low', focus: [0.5, 0.5], make: (E, c) => E.horizon(c) },
    3: { key: 'woven', name: 'Woven grid', mask: 'side', focus: [0.5, 0.5], make: (E, c) => E.gl(c, E.WOVEN) },
    4: { key: 'ribbon', kind: '2d', name: 'Light ribbon', mask: 'side', focus: [0.5, 0.5], make: (E, c) => E.ribbon(c) },
    5: { key: 'stage', name: 'Stage light', mask: 'side', focus: [0.74, 0.5], make: (E, c) => E.gl(c, E.STAGE) },
    6: { key: 'silk', name: 'Silk wave', mask: 'side', focus: [0.67, 0.5], make: (E, c) => E.silk(c) },
    7: { key: 'glass', name: 'Glass prism', mask: 'none', focus: [0.9, 0.5], make: (E, c) => E.gl(c, E.GLASS, 0.75) },
    8: { key: 'network', kind: '2d', name: 'Citation network', mask: 'side', focus: [0.74, 0.5], make: (E, c) => E.network(c) },
    9: { key: 'pixel', name: 'Pixel bloom', mask: 'side', focus: [0.8, 0.5], make: (E, c) => E.gl(c, E.PIXEL) },
    10: { key: 'orbits', kind: '2d', name: 'Eight orbits', mask: 'side', focus: [0.72, 0.5], make: (E, c) => E.orbits(c) },
  };
  const byKey = (id) => FX[id] ? +id : +Object.keys(FX).find((k) => FX[k].key === id);

  function mount(host, id, o = {}) {
    const n = byKey(id), def = FX[n]; if (!def) return null;
    const c = document.createElement('canvas'); c.className = 'mfx-canvas'; c.setAttribute('aria-hidden', 'true');
    Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none', opacity: String(o.intensity ?? 1) });
    const mk = o.mask ?? def.mask, m = (mk in MASKS ? MASKS[mk] : mk) || '';   // a preset name or any CSS mask image c.style.webkitMaskImage = m; c.style.maskImage = m;
    if (o.tone === 'light') c.style.filter = `saturate(0) brightness(${(1.8 * (o.gain ?? 1)).toFixed(2)})`;
    host.appendChild(c);

    const S = { t: 0, intro: 0, boost: 0, boostTarget: 0, mx: -9999, my: -9999, tx: -9999, ty: -9999, hover: 0, hoverTarget: 0, size: o.size ?? 1, ag: o.strength ?? 1, fx: (o.focus || def.focus)[0], fy: (o.focus || def.focus)[1] };
    const E = effects(S); let draw;
    try { draw = def.make(E, c); } catch (e) { console.warn('MaxFX', def.key, e); }
    if (!draw) { c.remove(); return null; }
    // strength > 1 on a 2D effect: add the frame onto itself, which raises opacity as well as brightness.
    const ctx = def.kind === '2d' ? c.getContext('2d') : null, base = draw;
    if (ctx) draw = () => { base(); let g = S.ag - 1; if (g <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; while (g > 0) { ctx.globalAlpha = Math.min(1, g); ctx.drawImage(c, 0, 0); g -= 1; } ctx.restore(); };

    const pe = o.pointerEl || host, off = [];
    const on = (el, ev, f) => { el.addEventListener(ev, f); off.push(() => el.removeEventListener(ev, f)); };
    on(pe, 'pointermove', (e) => { const r = host.getBoundingClientRect(); S.tx = (e.clientX - r.left) * DPR; S.ty = (r.bottom - e.clientY) * DPR; S.hoverTarget = 1; if (S.mx < -999) { S.mx = S.tx; S.my = S.ty; } });
    on(pe, 'pointerleave', () => (S.hoverTarget = 0));
    if (o.boostEl) { on(o.boostEl, 'mouseenter', () => (S.boostTarget = 1)); on(o.boostEl, 'mouseleave', () => (S.boostTarget = 0)); }

    const follow = () => {
      if (!o.focusEl) return; const h = host.getBoundingClientRect(), f = o.focusEl.getBoundingClientRect();
      if (h.width && h.height) { S.fx = (f.left + f.width / 2 - h.left) / h.width; S.fy = (f.top + f.height / 2 - h.top) / h.height; }
    };
    let visible = true; const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => (visible = es[0].isIntersecting)) : null;
    if (io) { io.observe(host); off.push(() => io.disconnect()); }

    const speed = o.speed ?? 1, started = performance.now(), still = o.still || 0;
    const reduce = o.reducedMotion !== false && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || reduce) {   // jump ahead: review stills, or one calm frame for reduced motion
      follow(); const T = still || 6;
      for (let k = 0; k < T * 60; k++) { S.t += 1 / 60; S.intro = 1; if (def.key === 'network') draw(); }
      S.t = T; S.intro = 1; draw();
    }
    let raf = 0, last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!visible) return;
      S.boost += (S.boostTarget - S.boost) * 0.06; S.hover += (S.hoverTarget - S.hover) * 0.06;
      S.mx += (S.tx - S.mx) * 0.12; S.my += (S.ty - S.my) * 0.12;
      if (!still) { const k = Math.min(1, (now - started) / 2200); S.intro = 1 - Math.pow(1 - k, 3); }
      S.t += dt * speed * (1 + 1.5 * S.boost);
      follow(); draw();
    };
    if (!reduce) raf = requestAnimationFrame(loop);
    return {
      canvas: c, state: S, def,
      setIntensity: (v) => (c.style.opacity = String(v)),
      destroy() { cancelAnimationFrame(raf); off.forEach((f) => f()); if (base.dispose) base.dispose(); c.remove(); },
    };
  }

  window.MaxFX = { FX, MASKS, mount };
})();
