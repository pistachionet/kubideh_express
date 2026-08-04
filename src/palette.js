// The flat poster palette. One color per material, no textures.

export const PALETTE = {
  sky: 0x8ac6c2,
  sea: 0x74b0ad,
  green: 0x7ba86a,
  greenDeep: 0x5e8c57,
  paddy: 0xaebe6e,
  slate: 0x7c879e,
  snow: 0xe9e4d4,
  dryGrass: 0xcbbb93,
  road: 0x9c988b,
  cream: 0xece6d8,
  pom: 0xb5413a,
  saffron: 0xd98a3d,
  turq: 0x56a0a6,
  terra: 0xb06a42,
  signBlue: 0x4e86a6,
  plum: 0x6a3b55,
  ink: 0x23201c,
  paper: 0xf2ebda,
  paperDeep: 0xe9e0cc,
  skin: 0xead2b8,
  shirt: 0xf7f2e8,
  placket: 0x5aaea6,
  trouser: 0x39414e,
  bag: 0xc98a4a,
  hair: 0x1d1a16,
};

export function hexString(name) {
  return '#' + PALETTE[name].toString(16).padStart(6, '0');
}
