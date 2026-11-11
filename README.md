# SURA Dubai

Immersive, scroll-driven 3D website for SURA Dubai, the geospatial sky operating system.

The visitor scrolls through one continuous scene: the night sky, the guiding star, the stars falling
to form Sheikh Zayed Road, the hexagonal sky cells above it, and the air routes planned through them.

## Stack

- Next.js (App Router) + React + TypeScript
- Three.js with React Three Fiber for the 3D scene
- GSAP ScrollTrigger + Lenis for scroll
- Tailwind CSS

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

## Where things are

- `src/content/chapters.ts`: all wording of the site
- `src/components/Experience.tsx`: page layout, text chapters, navigation, closing section
- `src/components/scene/`: the 3D scene (`Rig.tsx` holds the camera path and the scroll timeline)
- `src/lib/city.ts`: building geometry, sky cells and route planning
- `public/data/szr.json`: Sheikh Zayed Road buildings (positions, outlines, heights)

## City data

Building outlines and heights come from OpenStreetMap (© OpenStreetMap contributors, ODbL).
Buildings without a recorded height use an estimate. To rebuild the data file from fresh Overpass
API exports (queries are in the script header):

```bash
pip install shapely
python3 scripts/build_city_data.py ways.json relations.json
```
