/**
 * All wording and numbers of the pitch at /pitch.
 * Anything marked `placeholder: true` is dummy data to replace before presenting.
 */

/** Show a small "Placeholder" tag on slides that still contain dummy data. */
export const SHOW_PLACEHOLDER_TAGS = true;

export const hook = {
  /** Plays first, before the demo. If the file is missing, an animated hook plays instead. */
  video: "/pitch/hook.mp4",
  poster: "/pitch/hook-poster.jpg",
  /** Lines of the animated hook used while there is no video. */
  lines: [
    "Dubai, 2026.",
    "Drones will reach 30% of the city.",
    "Firefighters. Ambulances. Deliveries. Police.",
    "All in the same sky.",
    "But who draws their roads?",
  ],
};

export const intro = {
  name: "SURA Dubai",
  taglineAr: "من هداية النجوم… إلى هندسة الغيوم",
  tagline: "From the guidance of stars to engineering the clouds.",
  descriptor: "Geospatial sky operating system",
  contact: {
    placeholder: true,
    email: "hello@sura.ae",
    web: "sura.ae",
  },
};

export const problem = {
  title: "Drone paths and regulations are not defined yet.",
  body: "Dubai is ready to fly drones over the city, but no one has drawn the roads of its sky.",
  points: [
    { k: "No paths", v: "No shared map of where a drone may fly, at what height, or how to get from A to B." },
    {
      k: "Scattered rules",
      v: "Rules sit with Dubai Police, Dubai Municipality, the DCAA, the RTA and others, and each one keeps its own list.",
    },
    {
      k: "No priority",
      v: "A firefighting or ambulance drone has no guaranteed lane, and nothing tells other drones to clear it.",
    },
    { k: "Every operator alone", v: "Each company plans its own flights, so routes cross and conflicts happen in the air." },
  ],
};

export type EntityId = "twin" | "dcaa" | "police" | "municipality" | "rta" | "civil";

export const entities: { id: EntityId; name: string; short: string; color: string; gives: string }[] = [
  { id: "twin", name: "Dubai Digital Twin", short: "Digital Twin", color: "#1E8FB0", gives: "3D buildings, heights, terrain" },
  { id: "dcaa", name: "Dubai Civil Aviation Authority", short: "DCAA", color: "#7A55C7", gives: "Altitude limits, approach paths" },
  { id: "police", name: "Dubai Police", short: "Dubai Police", color: "#3657C8", gives: "Security no-fly zones" },
  {
    id: "municipality",
    name: "Dubai Municipality",
    short: "Municipality",
    color: "#2E9D6A",
    gives: "Parks, beaches, landing pads",
  },
  { id: "rta", name: "Roads & Transport Authority", short: "RTA", color: "#E0892B", gives: "Road buffers, no hovering over traffic" },
  { id: "civil", name: "Dubai Civil Defence", short: "Civil Defence", color: "#D9473A", gives: "Emergency priority rules" },
];

export type MissionId = "fire" | "medical" | "delivery" | "inspection";

export type Mission = {
  id: MissionId;
  name: string;
  color: string;
  /** Sky layer index (0 = A, lowest). */
  layer: number;
  /** Start and goal as fractions along the road, -1 (south-west) to 1 (north-east), plus a sideways cell offset. */
  from: [number, number];
  to: [number, number];
  startLabel: string;
  goalLabel: string;
  /** Zones this mission may cross. */
  exempt: EntityId[];
  /** Emergency missions make every other drone hold while they fly. */
  priority: boolean;
  rules: { by: EntityId; text: string }[];
};

/** Mission rules are illustrative (dummy) until confirmed with each authority. */
export const missions: Mission[] = [
  {
    id: "fire",
    startLabel: "Civil Defence station",
    goalLabel: "Fire reported",
    name: "Firefighting",
    color: "#D9473A",
    layer: 0,
    from: [0.95, 0],
    to: [-0.2, 1],
    exempt: ["police", "municipality", "rta"],
    priority: true,
    rules: [
      { by: "civil", text: "Priority 1. Every other drone in the area holds position." },
      { by: "police", text: "May enter security zones with automatic notice to Dubai Police." },
      { by: "dcaa", text: "Lowest layer A, straight-line corridor allowed." },
      { by: "twin", text: "Keeps 30 m clear of every facade." },
    ],
  },
  {
    id: "medical",
    startLabel: "Hospital pad",
    goalLabel: "Emergency call",
    name: "Emergency medical",
    color: "#1E8FB0",
    layer: 1,
    from: [-0.95, 0],
    to: [0.45, -1],
    exempt: ["police", "rta"],
    priority: true,
    rules: [
      { by: "civil", text: "Priority 2. Drones on crossing routes give way." },
      { by: "police", text: "Security zones open with automatic notice." },
      { by: "municipality", text: "Lands only on registered hospital or park pads." },
      { by: "dcaa", text: "Layer B, speed up to 90 km/h." },
    ],
  },
  {
    id: "delivery",
    startLabel: "Delivery hub",
    goalLabel: "Customer pad",
    name: "Delivery",
    color: "#B88324",
    layer: 2,
    from: [0.95, 1],
    to: [-0.95, -1],
    exempt: [],
    priority: false,
    rules: [
      { by: "dcaa", text: "Layer C only, scheduled slots." },
      { by: "police", text: "Never enters security zones." },
      { by: "municipality", text: "No flights over parks and beaches in opening hours." },
      { by: "rta", text: "No hovering above the road." },
    ],
  },
  {
    id: "inspection",
    startLabel: "Inspection base",
    goalLabel: "Tower facade",
    name: "Inspection",
    color: "#13294B",
    layer: 1,
    from: [-0.25, -1],
    to: [-0.75, 1],
    exempt: ["rta"],
    priority: false,
    rules: [
      { by: "municipality", text: "Permit per building, daylight only." },
      { by: "twin", text: "Facade distance set from the 3D model." },
      { by: "police", text: "Never enters security zones." },
      { by: "dcaa", text: "Layer B, max 40 km/h." },
    ],
  },
];

export type Zone = {
  by: Exclude<EntityId, "twin" | "civil">;
  name: string;
  /** Position along the road (-1..1) and sideways offset in scene units (1 = 100 m). */
  along: number;
  side: number;
  radius: number;
  /** Sky layers the zone closes. */
  layers: number[];
};

/** Dummy restricted zones placed along Sheikh Zayed Road. */
export const zones: Zone[] = [
  { by: "police", name: "Security zone", along: 0.34, side: -1.6, radius: 2.2, layers: [0, 1, 2] },
  { by: "police", name: "VIP corridor", along: -0.62, side: 2.0, radius: 1.7, layers: [0, 1, 2] },
  { by: "dcaa", name: "Helicopter approach", along: 0.72, side: 1.4, radius: 2.6, layers: [1, 2] },
  { by: "municipality", name: "Park, no overflight", along: -0.1, side: 3.0, radius: 1.9, layers: [0, 1, 2] },
  { by: "municipality", name: "Beach, no overflight", along: -0.38, side: -3.2, radius: 1.6, layers: [0, 1] },
  { by: "rta", name: "Interchange buffer", along: 0.06, side: 0, radius: 1.4, layers: [0] },
];

export const solution = {
  title: "SURA turns the city's data into defined sky roads.",
  body: "We take the 3D city from the Digital Twin and the drone rules of every authority, then plan the path for each mission: firefighting, emergency, delivery and more.",
  steps: ["3D city from the Digital Twin", "Rules from every authority", "Sky divided into cells", "A legal path for every mission"],
};

export const product = {
  title: "One platform, four ways in.",
  placeholder: true,
  items: [
    {
      name: "SURA Sky OS",
      who: "Authorities",
      text: "Live map of every sky cell, rule and flight. Approve corridors, open emergency lanes in one click.",
      stat: "1,377 cells live",
    },
    {
      name: "SURA Link",
      who: "Drones",
      text: "A small on-board unit that reports position, receives the corridor and enforces the rules in flight.",
      stat: "< 1 s updates",
    },
    {
      name: "SURA App",
      who: "Public",
      text: "See what flies over your street, report a drone, follow your delivery or ambulance.",
      stat: "iOS + Android",
    },
    {
      name: "Developer API",
      who: "Operators",
      text: "Request a route, get a legal path back. Plug any fleet into the system.",
      stat: "REST + streaming",
    },
  ],
};

export type Source = { id: number; text: string };

export const sources: Source[] = [
  {
    id: 1,
    text: "Dubai Civil Aviation Authority via Khaleej Times (Oct 2025). Drone deliveries in Dubai: 30% city coverage by 2026, 70% in 5 years.",
  },
  { id: 2, text: "WAM – Emirates News Agency (May 2026). Dubai Municipality to launch drone delivery in parks, beaches." },
  { id: 3, text: "MarketsandMarkets. Unmanned Traffic Management (UTM) Market – Global Forecast to 2030." },
  { id: 4, text: "Research Corridor (Oct 2025). Unmanned Traffic Management Market Report, 2025–2030." },
];

export const market = {
  title: "The sky above Dubai is opening now.",
  stats: [
    { value: 30, suffix: "%", label: "city coverage by drone delivery by 2026", src: [1] },
    { value: 70, suffix: "%", label: "coverage within 5 years", src: [1] },
    { prefix: "$", value: 1.1, decimals: 1, suffix: "B", label: "UTM market by 2030", src: [3, 4] },
  ],
  notes: [
    { text: "Dubai Municipality is already in: drone delivery in parks and beaches.", src: [2] },
    { text: "No unified sky operating system exists yet.", src: [] as number[] },
  ],
};

export const businessModel = {
  title: "Five ways SURA earns.",
  streams: [
    { name: "Platform subscriptions", text: "Infrastructure as a service for authorities and operators.", share: 40 },
    { name: "Certification fees", text: "Certify drones, pilots and routes on the system.", share: 15 },
    { name: "SURA Link sales", text: "On-board unit for every drone in Dubai's sky.", share: 25 },
    { name: "Hardware commissions", text: "From drone and sensor partners we bring customers to.", share: 8 },
    { name: "Developer APIs", text: "Pay per route request for operators and apps.", share: 12 },
  ],
  /** Revenue split is dummy. */
  placeholder: true,
};

export const traction = {
  title: "Early signals.",
  placeholder: true,
  stats: [
    { value: 3, label: "government meetings held" },
    { value: 5, label: "operator letters of intent" },
    { value: 1290, label: "real buildings in our model" },
    { value: 1377, label: "sky cells mapped on SZR" },
  ],
  milestones: [
    { when: "Q3 2026", text: "Prototype of Sheikh Zayed Road sky cells" },
    { when: "Q4 2026", text: "Pilot discussions with Dubai Municipality" },
    { when: "Q1 2027", text: "First operator onboarded (planned)" },
  ],
};

export const goToMarket = {
  title: "From one pilot to the Gulf's sky.",
  steps: [
    { name: "Municipality pilot", when: "2026", text: "Sheikh Zayed Road corridor with Dubai Municipality." },
    { name: "Onboard operators", when: "2027", text: "Delivery, inspection and emergency fleets on SURA Link." },
    { name: "Open ecosystem", when: "2027", text: "Developer API and the public SURA app." },
    { name: "UAE expansion", when: "2028", text: "Abu Dhabi, Sharjah and the other emirates." },
    { name: "GCC scale-up", when: "2029+", text: "Riyadh, Doha and other GCC cities." },
  ],
};

export const competition = {
  title: "Others watch the traffic. SURA builds the roads.",
  rows: [
    ["Traffic monitoring", "Full Sky OS"],
    ["Software only", "Software + Hardware"],
    ["Closed systems", "Open ecosystem"],
    ["Government-facing", "Public app too"],
    ["Global, generic", "Built for Dubai"],
  ],
};

export const financials = {
  title: "Path to revenue.",
  placeholder: true,
  unit: "Revenue, USD millions",
  years: [
    { year: "2026", revenue: 0.4, cost: 1.6 },
    { year: "2027", revenue: 2.1, cost: 3.2 },
    { year: "2028", revenue: 6.8, cost: 5.4 },
    { year: "2029", revenue: 14.5, cost: 8.9 },
    { year: "2030", revenue: 27.0, cost: 13.8 },
  ],
  kpis: [
    { label: "Break-even", value: "2028" },
    { label: "Gross margin 2030", value: "62%" },
    { label: "Drones on SURA Link 2030", value: "18,000" },
  ],
};

export const team = {
  title: "The team.",
  members: [
    { name: "Hessa Al Hajri", nameAr: "حصة الهاجري", initials: "HA" },
    { name: "Ola Mohammed", nameAr: "علا محمد", initials: "OM" },
    { name: "Yahya Sbini", nameAr: "يحيى سبيني", initials: "YS" },
    { name: "Sara Al Kaabi", nameAr: "سارا الكعبي", initials: "SK" },
    { name: "Maysa Al Boush", nameAr: "ميسا البوش", initials: "MA" },
  ],
};

/** "From Dubai to the human": graphics only, the speaker tells the story. Numbers are illustrative. */
export const human = {
  eyebrow: "From Dubai to the human",
  titleAr: "من دبي إلى الإنسان",
  questionAr: "شو صار أسهل أو أسرع بحياة الإنسان؟",
  question: "What got easier or faster in people's lives?",
  beats: ["Door to hand", "Access for everyone", "Emergency", "Neighbourhoods", "Field trial"],
  note: "Illustrative numbers. Tested in the digital twin first, then in a field trial.",
  doorToHand: {
    rows: [
      {
        label: "Road delivery",
        segs: [
          { kind: "prep", name: "Dispatch", min: 8 },
          { kind: "road", name: "On the road", min: 32 },
          { kind: "hand", name: "", min: 2 },
        ],
      },
      {
        label: "Drone, far pickup point",
        segs: [
          { kind: "prep", name: "Prep", min: 5 },
          { kind: "air", name: "In the air", min: 9 },
          { kind: "walk", name: "Walk", min: 14 },
          { kind: "wait", name: "Wait", min: 7 },
        ],
      },
      {
        label: "Drone, close pickup point",
        segs: [
          { kind: "prep", name: "Prep", min: 5 },
          { kind: "air", name: "In the air", min: 9 },
          { kind: "walk", name: "", min: 3 },
          { kind: "wait", name: "", min: 1 },
        ],
      },
    ],
    legend: [
      { kind: "prep", name: "Order and prep" },
      { kind: "road", name: "On the road" },
      { kind: "air", name: "In the air" },
      { kind: "walk", name: "Walk to pickup" },
      { kind: "wait", name: "Wait" },
    ],
    calloutKicker: "From order to parcel in hand",
    callout: "Time saved in the air can be lost on foot.",
  },
  access: {
    point: "Pickup point",
    radius: "Short walk, step-free",
    people: [
      { id: "older", who: "Older residents", need: "Close, shaded, with seating", x: 52, y: 40 },
      { id: "pod", who: "People of determination", need: "Step-free, reachable height", x: 268, y: 44 },
      { id: "phone", who: "No smartphone", need: "SMS, call or printed slot", x: 70, y: 168 },
    ],
    changeTitle: "Plan changed",
    changeBody: "Drone delayed 20 min. You choose what suits you.",
    options: ["Wait 20 min", "Another pickup point", "Deliver tomorrow"],
  },
  emergency: {
    from: "Call",
    to: "Response team",
    normal: 11.5,
    priority: 6.5,
    holds: [38, 62],
    normalLabel: "Without priority, waits for other drones",
    priorityLabel: "Ambulance drone with priority",
    note: "Simulated in the digital twin: time until the medical bag reaches the response team.",
    savedKicker: "Saved per emergency",
    savedBody: "Every other drone in the area holds or gives way.",
  },
  neighbourhoods: {
    fast: {
      title: "Fastest route only",
      body: "Every flight passes over the same homes. A crowd forms at the pickup entrance.",
      stats: [
        { value: "120", label: "flights a day over one street" },
        { value: "9", label: "people waiting at once" },
      ],
    },
    balanced: {
      title: "Balanced in the digital twin",
      body: "Corridors, stations and time slots are spread out. No street carries it all.",
      stats: [
        { value: "40", label: "flights a day, at most" },
        { value: "3", label: "people waiting at once" },
      ],
    },
  },
  trial: {
    center: "Pilot neighbourhood",
    steps: [
      { name: "Measure", detail: "Pickup time, ease, noise" },
      { name: "Listen", detail: "Residents' feedback" },
      { name: "Adjust", detail: "Station, route, timing" },
      { name: "Test again", detail: "In the twin, then in the street" },
    ],
    expand: "Expand only when it works for people.",
    openTitle: "Open with residents",
    openBody: "We show what data we use and how anyone can send feedback. Supervisors see what changed and why.",
  },
};

export const ask = {
  title: "Join us in building Dubai's sky roads.",
  placeholder: true,
  amount: "$2.5M",
  round: "Seed round",
  use: [
    { name: "Product & engineering", share: 45, color: "#13294B" },
    { name: "Municipality pilot", share: 25, color: "#1E8FB0" },
    { name: "SURA Link hardware", share: 20, color: "#D4A54A" },
    { name: "Operations", share: 10, color: "#9FB3CC" },
  ],
  partners: "We are also looking for a pilot partner in government and two launch operators.",
  verseAr: ["كان السُّرى قديماً", "أن نهتدي بالنجوم", "واليوم نُهندس للسماء طرقها"],
  verseEn: "Sura once meant finding our way by the stars. Today we engineer the roads of the sky.",
};

export const slideNames = [
  "Hook",
  "Introduction",
  "Problem",
  "Solution",
  "Product",
  "Market opportunity",
  "Business model",
  "Traction",
  "Go-to-market",
  "Competition",
  "Financials",
  "Team",
  "From Dubai to the human",
  "The ask",
] as const;
