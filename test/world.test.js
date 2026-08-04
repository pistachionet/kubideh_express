// Builds the whole static world headless and checks that the merge, the
// collision mesh, and the cel material wiring all hold together.

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorld } from '../src/world.js';
import {
  createCelMaterial,
  createSkyMaterial,
  createSharedUniforms,
} from '../src/render.js';
import { ROSTER } from '../src/roster.js';

function buildOnce() {
  const shared = createSharedUniforms();
  const cache = new Map();
  const materialFor = (name) => {
    if (!cache.has(name)) cache.set(name, createCelMaterial(name, shared));
    return cache.get(name);
  };
  return buildWorld({ materialFor, buildBVH: true, seed: 20260727 });
}

const world = buildOnce();

test('the world merges hundreds of source pieces into few draw calls', () => {
  assert.ok(
    world.stats.sourceCount >= 300,
    `dense dressing, got ${world.stats.sourceCount} source pieces`
  );
  assert.ok(
    world.stats.mergedCount <= 40,
    `merged by color, got ${world.stats.mergedCount} meshes`
  );
});

test('the collision mesh is substantial and the BVH is real', () => {
  assert.ok(
    world.stats.collisionTriangles > 3000,
    `got ${world.stats.collisionTriangles} triangles`
  );
  assert.ok(world.bvh, 'BVH built');
  assert.ok(world.collisionGeometry.boundsTree === world.bvh);
});

test('no NaN anywhere in the merged geometry', () => {
  for (const mesh of world.meshes) {
    const pos = mesh.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i++) {
      if (Number.isNaN(pos[i])) {
        assert.fail(`NaN in ${mesh.material.userData.colorName}`);
      }
    }
  }
});

test('every world mesh uses the cel material', () => {
  assert.ok(world.meshes.length > 0);
  for (const mesh of world.meshes) {
    assert.ok(mesh.material.isCelMaterial, 'cel material on every mesh');
  }
});

test('the cel shader writes the G buffer and the sky flags itself', () => {
  const shared = createSharedUniforms();
  const mat = createCelMaterial('green', shared);
  assert.match(mat.fragmentShader, /gInfo/, 'MRT info target present');
  assert.match(mat.fragmentShader, /gColor/, 'MRT color target present');
  assert.equal(mat.glslVersion, '300 es');

  const sky = createSkyMaterial(shared);
  assert.ok(sky.isSkyMaterial);
  assert.equal(sky.defines.SKY, 1, 'sky compile path enabled');
});

test('every customer gets a destination anchor plus the home anchor', () => {
  assert.equal(world.destinations.size, ROSTER.length);
  for (const c of ROSTER) {
    const d = world.destinations.get(c.id);
    assert.ok(d, `anchor for ${c.id}`);
    assert.ok(
      Number.isFinite(d.anchor.x + d.anchor.y + d.anchor.z),
      'finite anchor position'
    );
  }
  assert.ok(world.homeAnchor);
  assert.ok(world.steamSpots.length >= 1, 'grill steam markers exist');
});

test('the collision push resolves a sphere out of the world', () => {
  // Shove a probe sphere straight into the Shamshiry building and check
  // that collideSphere pushes it back out.
  return import('../src/world.js').then(({ collideSphere }) => {
    const home = world.homeAnchor.clone();
    const up = home.clone().normalize();
    const center = home.clone().addScaledVector(up, 1.0);
    const res = collideSphere(world.bvh, center.clone(), 1.05);
    assert.ok(res.hit, 'probe inside the building collides');
    assert.ok(res.push.length() > 0.001, 'push has magnitude');
  });
});
