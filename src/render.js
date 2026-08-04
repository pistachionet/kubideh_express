import * as THREE from 'three';
import { PALETTE } from './palette.js';

// The Messenger look. One uber cel material for everything in the world,
// a self-rendered directional shadow map, an MRT G-buffer carrying color
// plus depth, view normal, and an outline mask, then a fullscreen
// composite that inks screen-space outlines with a hand-drawn boil,
// adds grain, clamps, and converts linear to sRGB manually at the end.

function srgbToLinearChannel(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearColor(hex) {
  const c = new THREE.Color(hex);
  c.setRGB(
    srgbToLinearChannel(c.r),
    srgbToLinearChannel(c.g),
    srgbToLinearChannel(c.b)
  );
  return c;
}

// Raw sRGB color for the glow overlay pass, which skips the composite
// conversion and draws straight to the canvas.
export function rawColor(hex) {
  return new THREE.Color(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255
  );
}

export function createSharedUniforms() {
  return {
    uSunDir: { value: new THREE.Vector3(0.45, 0.82, 0.2).normalize() },
    uSunTint: { value: new THREE.Vector3(1.07, 1.0, 0.9) },
    uShadeA: { value: new THREE.Vector3(0.5, 0.57, 0.68) },
    uShadeB: { value: new THREE.Vector3(0.72, 0.79, 0.87) },
    uBand: { value: 0.1 },
    uToneScale: { value: 5.0 },
    uToneStrength: { value: 0.1 },
    uShadowMap: { value: null },
    uShadowMatrix: { value: new THREE.Matrix4() },
    uShadowBias: { value: 0.0028 },
    uShadowMapSize: { value: new THREE.Vector2(1024, 1024) },
    uFar: { value: 320.0 },
  };
}

const CEL_VERT = /* glsl */ `
out vec3 vWorldPos;
out vec3 vWorldNormal;
out vec3 vViewNormal;
out float vViewDepth;
out vec4 vShadowCoord;
uniform mat4 uShadowMatrix;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 vp = viewMatrix * wp;
  vViewDepth = -vp.z;
  vViewNormal = normalize(normalMatrix * normal);
  vShadowCoord = uShadowMatrix * wp;
  gl_Position = projectionMatrix * vp;
}
`;

const CEL_FRAG = /* glsl */ `
precision highp float;
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gInfo;
in vec3 vWorldPos;
in vec3 vWorldNormal;
in vec3 vViewNormal;
in float vViewDepth;
in vec4 vShadowCoord;
uniform vec3 uColor;
uniform vec3 uSunDir;
uniform vec3 uSunTint;
uniform vec3 uShadeA;
uniform vec3 uShadeB;
uniform float uBand;
uniform float uToneScale;
uniform float uToneStrength;
uniform sampler2D uShadowMap;
uniform float uShadowBias;
uniform vec2 uShadowMapSize;
uniform float uFar;

float aastep(float t, float x) {
  float w = max(fwidth(x), 0.0001) * 0.85;
  return smoothstep(t - w, t + w, x);
}

float shadowTap(vec2 uv, float depth) {
  float d = texture(uShadowMap, uv).r;
  return depth - uShadowBias > d ? 0.0 : 1.0;
}

void main() {
#ifdef SKY
  gColor = vec4(uColor, 1.0);
  gInfo = vec4(1.0, 0.5, 0.5, 0.0);
#else
  vec3 N = normalize(vWorldNormal);
  float ndl = dot(N, uSunDir);
  float lit = aastep(uBand, ndl);

  vec3 sc = vShadowCoord.xyz / vShadowCoord.w;
  sc = sc * 0.5 + 0.5;
  if (sc.x > 0.001 && sc.x < 0.999 && sc.y > 0.001 && sc.y < 0.999 && sc.z < 1.0) {
    vec2 texel = 1.0 / uShadowMapSize;
    float s = 0.0;
    s += shadowTap(sc.xy + texel * vec2(-0.75, -0.75), sc.z);
    s += shadowTap(sc.xy + texel * vec2(0.75, -0.75), sc.z);
    s += shadowTap(sc.xy + texel * vec2(-0.75, 0.75), sc.z);
    s += shadowTap(sc.xy + texel * vec2(0.75, 0.75), sc.z);
    lit *= s * 0.25;
  }

  vec3 upAxis = normalize(vWorldPos);
  float hemi = clamp(dot(N, upAxis) * 0.5 + 0.5, 0.0, 1.0);
  vec3 shaded = uColor * mix(uShadeA, uShadeB, hemi);

  vec2 g = mod(gl_FragCoord.xy, uToneScale) - uToneScale * 0.5;
  float toneDot = 1.0 - step(uToneScale * 0.26, length(g));
  shaded *= 1.0 - toneDot * uToneStrength;

  vec3 col = mix(shaded, uColor * uSunTint, lit);
  gColor = vec4(col, 1.0);
  gInfo = vec4(clamp(vViewDepth / uFar, 0.0, 1.0), vViewNormal.xy * 0.5 + 0.5, 1.0);
#endif
}
`;

export function createCelMaterial(colorName, shared, opts = {}) {
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uColor: { value: linearColor(PALETTE[colorName]) },
      ...shared,
    },
    vertexShader: CEL_VERT,
    fragmentShader: CEL_FRAG,
    defines: opts.sky ? { SKY: 1 } : {},
    side: opts.side ?? THREE.FrontSide,
  });
  material.isCelMaterial = true;
  material.userData.colorName = colorName;
  return material;
}

export function createSkyMaterial(shared) {
  const m = createCelMaterial('sky', shared, { sky: true, side: THREE.BackSide });
  m.isSkyMaterial = true;
  return m;
}

const COMP_VERT = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const COMP_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D tColor;
uniform sampler2D tInfo;
uniform vec2 uResolution;
uniform float uTime;
uniform float uThickness;
uniform float uDepthSens;
uniform float uNormalSens;
uniform float uGrain;
uniform vec3 uInk;

float l2s(float c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 texel = 1.0 / uResolution;
  // A small sine wobble on the sample offsets so the ink line boils.
  vec2 wob = vec2(
    sin(vUv.y * 167.0 + uTime * 2.2),
    sin(vUv.x * 149.0 - uTime * 1.9)
  ) * texel * 0.55;
  vec2 o = texel * uThickness;

  vec4 c = texture(tInfo, vUv);
  vec4 n1 = texture(tInfo, vUv + vec2(o.x, 0.0) + wob);
  vec4 n2 = texture(tInfo, vUv - vec2(o.x, 0.0) + wob);
  vec4 n3 = texture(tInfo, vUv + vec2(0.0, o.y) - wob);
  vec4 n4 = texture(tInfo, vUv - vec2(0.0, o.y) - wob);

  float d = c.r;
  float dd = max(
    max(abs(n1.r - d), abs(n2.r - d)),
    max(abs(n3.r - d), abs(n4.r - d))
  );
  float edgeDepth = step(uDepthSens * max(d, 0.02), dd);

  vec2 nn = c.gb * 2.0 - 1.0;
  float nd = 0.0;
  nd = max(nd, length(n1.gb * 2.0 - 1.0 - nn));
  nd = max(nd, length(n2.gb * 2.0 - 1.0 - nn));
  nd = max(nd, length(n3.gb * 2.0 - 1.0 - nn));
  nd = max(nd, length(n4.gb * 2.0 - 1.0 - nn));
  float edgeNormal = step(uNormalSens, nd) * c.a;

  float edge = max(edgeDepth, edgeNormal);

  vec3 col = texture(tColor, vUv).rgb;
  col = mix(col, uInk, edge);

  float g = hash(gl_FragCoord.xy + vec2(fract(uTime * 0.61) * 91.0, fract(uTime * 0.43) * 77.0));
  col += (g - 0.5) * uGrain;
  col = clamp(col, 0.0, 1.0);
  outColor = vec4(l2s(col.r), l2s(col.g), l2s(col.b), 1.0);
}
`;

export function createPipeline(renderer, shared) {
  const gbuffer = new THREE.WebGLRenderTarget(4, 4, {
    count: 2,
    type: THREE.HalfFloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
  });

  const SHADOW_SIZE = 1024;
  const shadowTarget = new THREE.WebGLRenderTarget(SHADOW_SIZE, SHADOW_SIZE);
  shadowTarget.depthTexture = new THREE.DepthTexture(SHADOW_SIZE, SHADOW_SIZE);
  shared.uShadowMap.value = shadowTarget.depthTexture;
  shared.uShadowMapSize.value.set(SHADOW_SIZE, SHADOW_SIZE);

  const lightCamera = new THREE.OrthographicCamera(-46, 46, 46, -46, 4, 220);
  const depthOverride = new THREE.MeshBasicMaterial();

  const compUniforms = {
    tColor: { value: gbuffer.textures[0] },
    tInfo: { value: gbuffer.textures[1] },
    uResolution: { value: new THREE.Vector2(4, 4) },
    uTime: { value: 0 },
    uThickness: { value: 1.7 },
    uDepthSens: { value: 0.05 },
    uNormalSens: { value: 0.55 },
    uGrain: { value: 0.03 },
    uInk: { value: linearColor(PALETTE.ink) },
  };
  const compMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: compUniforms,
    vertexShader: COMP_VERT,
    fragmentShader: COMP_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const compScene = new THREE.Scene();
  compScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMaterial));
  const compCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function setSize(w, h, dpr) {
    const pw = Math.floor(w * dpr);
    const ph = Math.floor(h * dpr);
    gbuffer.setSize(pw, ph);
    compUniforms.uResolution.value.set(pw, ph);
  }

  // Positions the light rig above the player along the sun direction so
  // the shadow map always covers the neighborhood in view.
  function updateLight(playerPos, playerUp) {
    const sun = shared.uSunDir.value;
    lightCamera.position.copy(playerPos).addScaledVector(sun, 95);
    lightCamera.up.copy(playerUp);
    lightCamera.lookAt(playerPos);
    lightCamera.updateMatrixWorld(true);
    lightCamera.updateProjectionMatrix();
    shared.uShadowMatrix.value.multiplyMatrices(
      lightCamera.projectionMatrix,
      lightCamera.matrixWorldInverse
    );
  }

  function render(scene, camera, overlayScene, skyMesh, time) {
    compUniforms.uTime.value = time;

    // 1. Shadow depth from the light's orthographic camera.
    skyMesh.visible = false;
    scene.overrideMaterial = depthOverride;
    renderer.setRenderTarget(shadowTarget);
    renderer.clear();
    renderer.render(scene, lightCamera);
    scene.overrideMaterial = null;
    skyMesh.visible = true;

    // 2. Cel color plus info into the MRT G-buffer.
    renderer.setRenderTarget(gbuffer);
    renderer.render(scene, camera);

    // 3. Composite with ink outlines, grain, clamp, and sRGB out.
    renderer.setRenderTarget(null);
    renderer.render(compScene, compCamera);

    // 4. Glow overlay on top: steam and the guidance arrow, so soft
    // alpha never pollutes the G-buffer.
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(overlayScene, camera);
    renderer.autoClear = true;
  }

  return { setSize, updateLight, render, lightCamera, tune: compUniforms };
}
