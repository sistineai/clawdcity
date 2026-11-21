# Sprite pack format

A pack is everything the game needs to draw and reason about one set of art. Commissioned or generated art arrives as a pack. Adding a pack must never require a code change.

This file defines the PNG pack format. The built-in vector pack exposes the same logic data and draws with painters instead of image files.

## Folder

```
public/packs/<packId>/
  pack.json          manifest (below)
  masks.bin          all sprite masks, concatenated (built by a tool, never by hand)
  sprites/<file>.png one file per sprite per colour
  preview.png        optional, for the audit sheet
```

## pack.json

```jsonc
{
  "id": "meadow-01",
  "version": 3,                     // integer; bump on any change to art or data
  "name": "Meadow, first edition",
  "credits": "Style guide and characters by <illustrator>. Sprites produced with AI assistance and edited by hand.",
  "pixelScale": 2,                  // source pixels per world pixel at size 1 (2 = retina-ready)
  "colors": ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink"],
  "sprites": [
    {
      "id": "key",
      "kind": "small",              // small | occluder | sky | resident
      "name": "Key",                // shown in the tray tooltip
      "w": 96, "h": 96,             // source image size in pixels
      "anchor": [48, 90],           // the point that touches the ground, in source pixels
      "baseSize": 64,               // on-screen size in world pixels at size multiplier 1
      "colored": true,              // true: one file per colour; false: a single file
      "files": { "red": "sprites/key.red.png", "blue": "sprites/key.blue.png" },
      "allowRotate": true,          // false for occluders and anything with an obvious "up"
      "allowFlip": true,
      "mask": { "offset": 0, "w": 48, "h": 48 }   // into masks.bin; written by the tool
    },
    {
      "id": "cottage",
      "kind": "occluder",
      "name": "Cottage",
      "w": 640, "h": 560,
      "anchor": [320, 540],
      "baseSize": 300,
      "colored": false,
      "file": "sprites/cottage.png",
      "allowRotate": false,
      "allowFlip": true,
      "mask": { "offset": 288, "w": 320, "h": 280 }
    },
    {
      "id": "mossy",
      "kind": "resident",
      "name": "Mossy",
      "description": "Sleeps under ferns. Collects buttons.",
      "rarity": "common",           // common | uncommon | rare
      "w": 128, "h": 128, "anchor": [64, 120], "baseSize": 70,
      "colored": false, "file": "sprites/mossy.png",
      "allowRotate": false, "allowFlip": true,
      "mask": { "offset": 11488, "w": 64, "h": 64 }
    }
  ],
  "worlds": [
    {
      "id": "meadow",
      "name": "Meadow",
      "background": { "painter": "meadow" },   // v1: a named code painter. Later: layered images.
      "horizon": 0.34,                          // fraction of world height
      "occluders": ["tree", "pine", "bush", "rock", "cottage", "tent", "haystack", "fence", "log"],
      "smalls": { "key": 1, "star": 1, "mushroom": 2 },   // relative weights; omitted sprites default to 1; 0 excludes
      "sky": ["cloud"],
      "residents": ["mossy", "odo", "bram", "tuck"]
    }
  ]
}
```

## Masks

- One mask per sprite (not per colour): 1 bit per pixel, row-major, at half the source resolution, a pixel is "solid" when alpha ≥ 128 in the source.
- `masks.bin` is produced by the pack build tool from the images (or, for the vector pack, from the painters rendered in Node). Runtime code never derives masks from a canvas. This is what keeps puzzles identical on every device.
- All colour variants of a sprite must share the same silhouette. The validator compares each variant's alpha to the mask and fails if more than 2% of pixels differ.

## Rules the validator enforces

1. Manifest matches the schema; ids are unique, lowercase, `[a-z0-9-]`.
2. Every referenced file exists; image size equals `w` × `h`.
3. PNG with an alpha channel. Solid pixels cover between 6% and 90% of the image rectangle (catches empty images and images with a filled background).
4. No solid pixels within 1 pixel of the image edge (catches cropped sprites).
5. `colored: true` sprites provide every colour listed in `colors`.
6. Anchor lies inside the image.
7. Mask entry exists, has the right size and is not empty.
8. Each world has at least 6 occluders, at least 24 small sprites with non-zero weight, at least 1 sky sprite, and exactly 4 residents: 2 common, 1 uncommon, 1 rare.
9. Small sprites that can be targets must be recognisable when drawn 40 world pixels tall: the mask at that size must keep at least 120 solid pixels.
10. Total pack size ≤ 12 MB; no single image over 600 KB.

The numeric thresholds are defaults held in one validator config object. If a built-in placeholder sprite fails a rule, fix the sprite. Loosen a threshold only when the rule itself is wrong, and log it in `DECISIONS.md`.

## Art direction rules for whoever makes the sprites

These are not machine-checked. They belong in the illustrator brief and the generation prompts.

- One light direction, one outline weight and one level of detail across the whole pack.
- Each small object reads as its name at thumbnail size and survives being recoloured into all eight colours.
- Occluders have a clear base where they meet the ground and enough solid mass to hide things behind.
- Residents are characters with a face and a silhouette that cannot be mistaken for an object.
- Nothing resembles an existing character, brand or logo.
- Keep the source file, the prompt (if generated), the edit history and the name of the person who approved each sprite. This record supports ownership of the finished art.

## Adding a pack

1. Put the images and a hand-written `pack.json` (without `mask` entries) in `public/packs/<id>/`.
2. `npm run pack:build -- public/packs/<id>` writes `masks.bin` and fills in `mask`.
3. `npm run pack:validate public/packs/<id>` until it is clean.
4. `npm run world:audit -- --pack <id> --days 60` and look at the contact sheets in `out/audit/`.
5. Try it in the game with `?pack=<id>`. Make it the default by changing `DEFAULT_PACK` in `src/config.ts`.

Changing the default pack changes every future puzzle. Do it at a day boundary and bump the pack `version`.
