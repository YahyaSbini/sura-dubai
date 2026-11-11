/** All wording of the scroll journey. `meta` is the small data line under a chapter. */
export type Chapter = {
  /** Short name used in the progress navigation. */
  nav: string;
  eyebrow: string;
  title: string;
  body?: string;
  meta?: string;
};

export const hero = {
  taglineAr: "من هداية النجوم… إلى هندسة الغيوم",
  descriptor: "Geospatial sky operating system",
};

export const chapters: Chapter[] = [
  {
    nav: "The name",
    eyebrow: "The name",
    title: "Sura once meant travelling by night, guided by the stars.",
  },
  {
    nav: "The place",
    eyebrow: "The place",
    title: "Tonight the stars come down over Sheikh Zayed Road.",
    body: "Every tower stands at its real position and height.",
    meta: "5.7 km of road · 1,290 buildings · OpenStreetMap data",
  },
  {
    nav: "The gap",
    eyebrow: "The gap",
    title: "The road has lanes, signals and addresses. The sky above it has none.",
  },
  {
    nav: "Sky cells",
    eyebrow: "Sky cells",
    title: "SURA divides the sky into hexagonal cells. Each one has an address.",
    body: "A cell that a tower already occupies stays closed.",
    meta: "3 altitude layers · 1,377 cells · 150 m across",
  },
  {
    nav: "Air routes",
    eyebrow: "Air routes",
    title: "Then it engineers the route, cell by cell.",
    body: "Corridors pass only through open cells.",
    meta: "3 corridors · 15 drones · simulated flights",
  },
  {
    nav: "The system",
    eyebrow: "The system",
    title: "From knowing the place to engineering the path.",
    body: "A digital operating system for the sky.",
  },
];

export const closing = {
  verseAr: ["كان السُّرى قديماً", "أن نهتدي بالنجوم", "واليوم نُهندس للسماء طرقها"],
  verseEn: "Sura once meant finding our way by the stars. Today we engineer the roads of the sky.",
  descriptor: "SURA Dubai. Geospatial sky operating system.",
};
