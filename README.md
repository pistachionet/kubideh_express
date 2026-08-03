# Kubideh Express

A cozy delivery ride around a very small world. Behrouz is home for the
summer, and the whole road is hungry. Pick up kubideh at Shamshiry, follow
the arrow, and keep the neighbors fed.

A loving homage to the real Shamshiry in Vienna, Virginia. This is a fan
project and implies no endorsement.

## Run it

```
npm install
npm run dev
```

Vite serves on all interfaces, so you can open it from a phone on the same
Tailscale network at the address it prints.

```
npm test        # headless rules, steering, and world integrity tests
npm run build   # production build into dist/
npm run preview # serve the production build
```

## How to play

- W or Up arrow to ride, S or Down to brake and reverse
- A and D or the arrow keys to steer, left means left
- B opens the ticket book, Escape closes things
- On a phone, the on screen pads do the same

Ride to the glowing shop to grab a batch of boxes, then follow the big
saffron arrow to whoever is closest. Talk, hand it over, collect the tip.
When the box is empty and the phone rings, head home for more. Each day
adds one more order, up to nine.

## Tech notes

- Vite, three.js, and three-mesh-bvh only. Plain JS modules, no framework.
- Every asset is procedural: geometry from primitives merged by color,
  audio synthesized in WebAudio, UI in plain DOM. The single outside
  dependency at runtime is Google Fonts.
- Rendering is one cel shader over a small MRT pipeline: a self rendered
  shadow map, a G buffer pass, a composite pass that draws the wobbling
  ink outlines, and a glow overlay for steam and the arrow.
- The delivery rules live in `src/game.js` as pure functions and are
  fuzzed across hundreds of randomized days in `test/game.test.js`.
- Live tuning handles are on `window.KUBIDEH_TUNE` in the dev console.
