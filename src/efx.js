import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { rawColor, createCelMaterial } from './render.js';
import { orientToSurface, surfaceUp, PLANET_RADIUS } from './math.js';
import { M } from './parts.js';

// Everything here lives in the glow overlay pass (steam and the arrow)
// or animates in the main scene (beacons), on top of the composite.

let steamTexture = null;
function getSteamTexture() {
  if (steamTexture) return steamTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  steamTexture = new THREE.CanvasTexture(canvas);
  return steamTexture;
}

// A little column of steam wisps rising and fading on a loop above a base
// point. The base can be static (the grill) or follow the moped hot-box.
export function createSteamColumn(overlayScene, basePos, count = 3) {
  const sprites = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: getSteamTexture(),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0,
    });
    const sprite = new THREE.Sprite(mat);
    overlayScene.add(sprite);
    sprites.push({ sprite, phase: i / count, sway: Math.random() * 6.28 });
  }
  const base = basePos.clone();
  const up = new THREE.Vector3();
  return {
    setBase(p) {
      base.copy(p);
    },
    update(time, strength = 1) {
      up.copy(base).normalize();
      for (const w of sprites) {
        const t = (time * 0.45 + w.phase) % 1;
        const rise = 0.25 + t * 1.7;
        const swayX = Math.sin(time * 1.7 + w.sway) * 0.12 * t;
        w.sprite.position
          .copy(base)
          .addScaledVector(up, rise)
          .add(new THREE.Vector3(swayX, 0, swayX * 0.6));
        const s = 0.45 + t * 0.9;
        w.sprite.scale.set(s, s, 1);
        w.sprite.material.opacity = (1 - t) * 0.5 * strength;
      }
    },
  };
}

// The guidance arrow: a real arrow silhouette, head triangle plus shaft,
// bright saffron fill over a dark outline shape, lying flat in the
// tangent plane, pointing along the surface toward the target, gently
// bobbing, tipped so the camera reads it.
function arrowShape(scale) {
  const s = new THREE.Shape();
  const w = 0.16 * scale;
  const hw = 0.4 * scale;
  const tail = -0.62 * scale;
  const neck = 0.12 * scale;
  const tip = 0.72 * scale;
  s.moveTo(-w, tail);
  s.lineTo(w, tail);
  s.lineTo(w, neck);
  s.lineTo(hw, neck);
  s.lineTo(0, tip);
  s.lineTo(-hw, neck);
  s.lineTo(-w, neck);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

export function createGuidanceArrow(overlayScene) {
  const group = new THREE.Group();
  const outlineGeo = arrowShape(1.28);
  outlineGeo.rotateX(Math.PI / 2);
  const fillGeo = arrowShape(1.0);
  fillGeo.rotateX(Math.PI / 2);
  const outline = new THREE.Mesh(
    outlineGeo,
    new THREE.MeshBasicMaterial({
      color: rawColor(PALETTE.ink),
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
    })
  );
  const fill = new THREE.Mesh(
    fillGeo,
    new THREE.MeshBasicMaterial({
      color: rawColor(PALETTE.saffron),
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
    })
  );
  outline.renderOrder = 10;
  fill.renderOrder = 11;
  fill.position.y = 0.02;
  group.add(outline);
  group.add(fill);
  overlayScene.add(group);

  return {
    group,
    update(playerPos, dirAlongSurface, time, visible) {
      group.visible = visible;
      if (!visible) return;
      const up = surfaceUp(playerPos);
      const bob = Math.sin(time * 3.1) * 0.14;
      const pos = playerPos.clone().addScaledVector(up, 2.9 + bob);
      orientToSurface(group, pos, dirAlongSurface);
      group.rotateX(-0.42);
    },
  };
}

// Beacons: a bobbing colored dot high above each destination plus a
// pulsing ground ring in the customer's signature color. Home gets a
// taller, larger one. These are cel meshes in the main scene, so they
// get the ink treatment.
export function createBeacons(scene, destinations, homeAnchor, shared) {
  const beacons = new Map();

  function makeBeacon(anchor, colorName, big) {
    const up = anchor.clone().normalize();
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(big ? 0.85 : 0.55, 10, 8),
      createCelMaterial(colorName, shared)
    );
    const ringGeo = new THREE.RingGeometry(big ? 2.2 : 1.6, big ? 2.9 : 2.15, 40);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, createCelMaterial(colorName, shared));
    orientToSurface(ring, up.clone().multiplyScalar(PLANET_RADIUS + 0.09), new THREE.Vector3(0, 0, 1));
    scene.add(dot);
    scene.add(ring);
    return { dot, ring, anchor, up, big, phase: Math.random() * 6.28 };
  }

  for (const [id, d] of destinations) {
    beacons.set(id, makeBeacon(d.anchor, d.color, false));
  }
  beacons.set('home', makeBeacon(homeAnchor, 'saffron', true));

  return {
    setVisible(id, visible) {
      const b = beacons.get(id);
      if (!b) return;
      b.dot.visible = visible;
      b.ring.visible = visible;
    },
    update(time) {
      for (const b of beacons.values()) {
        if (!b.dot.visible) continue;
        const h = (b.big ? 10.5 : 7.5) + Math.sin(time * 2 + b.phase) * 0.5;
        b.dot.position.copy(b.anchor).addScaledVector(b.up, h);
        const pulse = 1 + Math.sin(time * 2.4 + b.phase) * 0.14;
        b.ring.scale.setScalar(pulse);
      }
    },
  };
}
