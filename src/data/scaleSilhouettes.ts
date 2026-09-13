/*
 * GENERATED FILE — do not edit by hand.
 * Run `node scripts/generate-silhouettes.mjs` to rebuild.
 *
 * Silhouettes for the Scale game, built from geometric primitives in
 * that script. Each one is drawn in its own units and normalised so its
 * height is exactly 100, which means `width` is the object's true
 * aspect ratio and a caller can scale it by height alone.
 *
 * No third-party artwork: nothing here needs attribution.
 */

export type Silhouette = {
  /** Natural width when the height is 100. */
  width: number;
  /** Always 100; kept so callers never assume it. */
  height: number;
  paths: string[];
  /** Shapes with holes need evenodd, or a wheel fills in solid. */
  evenodd: boolean;
  /** Translate applied before scaling, to sit the art in its box. */
  offset: [number, number];
  scale: number;
};

export const silhouettes: Record<
  string,
  Silhouette
> = {
  coffee_cup: {
    width: 91.11,
    height: 100,
    evenodd: true,
    offset: [33.33, -2.22],
    scale: 1.11,
    paths: [
      "M-26 8L26 8L20 92L-20 92z",
      "M-30 2h60v8h-60z",
      "M8 38a22 22 0 1 0 44 0a22 22 0 1 0 -44 0zM18 38a12 12 0 1 0 24 0a12 12 0 1 0 -24 0z",
    ],
  },
  smartphone: {
    width: 48,
    height: 100,
    evenodd: false,
    offset: [24, 0],
    scale: 1,
    paths: [
      "M-24 100V6a6 6 0 0 1 6 -6h36a6 6 0 0 1 6 6V100z",
    ],
  },
  wine_glass: {
    width: 54.17,
    height: 100,
    evenodd: false,
    offset: [27.08, -4.17],
    scale: 1.04,
    paths: [
      "M-26 4L26 4L16 46L-16 46z",
      "M-4 44h8v44h-8z",
      "M-26 92a26 8 0 1 0 52 0a26 8 0 1 0 -52 0z",
    ],
  },
  toaster: {
    width: 97.87,
    height: 100,
    evenodd: false,
    offset: [48.94, -6.38],
    scale: 1.06,
    paths: [
      "M-46 100V24a12 12 0 0 1 12 -12h68a12 12 0 0 1 12 12V100z",
      "M-26 6h16v8h-16z",
      "M10 6h16v8h-16z",
    ],
  },
  football: {
    width: 100,
    height: 100,
    evenodd: false,
    offset: [50, 0],
    scale: 1,
    paths: [
      "M-50 50a50 50 0 1 0 100 0a50 50 0 1 0 -100 0z",
    ],
  },
  bowling_pin: {
    width: 48,
    height: 100,
    evenodd: false,
    offset: [24, 0],
    scale: 1,
    paths: [
      "M-24 74a24 26 0 1 0 48 0a24 26 0 1 0 -48 0z",
      "M-13 22a13 22 0 1 0 26 0a13 22 0 1 0 -26 0z",
      "M-9 30h18v30h-18z",
    ],
  },
  wine_bottle: {
    width: 32,
    height: 100,
    evenodd: false,
    offset: [16, 0],
    scale: 1,
    paths: [
      "M-16 100V47a9 9 0 0 1 9 -9h14a9 9 0 0 1 9 9V100z",
      "M-6 6h12v34h-12z",
      "M-8 0h16v8h-16z",
    ],
  },
  microwave: {
    width: 176,
    height: 100,
    evenodd: false,
    offset: [88, 0],
    scale: 1,
    paths: [
      "M-88 0h176v100h-176z",
      "M56 14h24v60h-24z",
    ],
  },
  suitcase: {
    width: 118.37,
    height: 100,
    evenodd: false,
    offset: [59.18, -2.04],
    scale: 1.02,
    paths: [
      "M-58 100V22a8 8 0 0 1 8 -8h100a8 8 0 0 1 8 8V100z",
      "M-17.5 14L-10.5 14L-10.5 2L-17.5 2z",
      "M-17.5 2L-10.5 2L17.5 2L10.5 2z",
      "M10.5 2L17.5 2L17.5 14L10.5 14z",
    ],
  },
  fire_hydrant: {
    width: 55.67,
    height: 100,
    evenodd: false,
    offset: [27.84, -3.09],
    scale: 1.03,
    paths: [
      "M-17 100V26a10 10 0 0 1 10 -10h14a10 10 0 0 1 10 10V100z",
      "M-9 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0z",
      "M-27 34h54v13h-54z",
      "M-24 88h48v12h-48z",
    ],
  },
  traffic_cone: {
    width: 92,
    height: 100,
    evenodd: false,
    offset: [46, 0],
    scale: 1,
    paths: [
      "M-12 0L12 0L34 86L-34 86z",
      "M-46 86h92v14h-92z",
    ],
  },
  desk: {
    width: 180,
    height: 100,
    evenodd: false,
    offset: [90, 0],
    scale: 1,
    paths: [
      "M-90 0h180v14h-180z",
      "M-84 14h16v86h-16z",
      "M68 14h16v86h-16z",
    ],
  },
  park_bench: {
    width: 140,
    height: 100,
    evenodd: false,
    offset: [70, 0],
    scale: 1,
    paths: [
      "M-70 52h140v12h-140z",
      "M-70 0h140v10h-140z",
      "M-70 16h140v10h-140z",
      "M-70 32h140v10h-140z",
      "M-64 64h12v36h-12z",
      "M52 64h12v36h-12z",
    ],
  },
  washing_machine: {
    width: 92,
    height: 100,
    evenodd: true,
    offset: [46, 0],
    scale: 1,
    paths: [
      "M-46 0h92v100h-92z",
      "M-28 58a28 28 0 1 0 56 0a28 28 0 1 0 -56 0zM-18 58a18 18 0 1 0 36 0a18 18 0 1 0 -36 0z",
      "M-36 8h72v12h-72z",
    ],
  },
  guitar: {
    width: 52,
    height: 100,
    evenodd: false,
    offset: [26, 0],
    scale: 1,
    paths: [
      "M-26 78a26 22 0 1 0 52 0a26 22 0 1 0 -52 0z",
      "M-20 55a20 17 0 1 0 40 0a20 17 0 1 0 -40 0z",
      "M-5 10h10v46h-10z",
      "M-9 0h18v12h-18z",
    ],
  },
  chair: {
    width: 56,
    height: 100,
    evenodd: false,
    offset: [26, 0],
    scale: 1,
    paths: [
      "M-26 0h10v62h-10z",
      "M-26 56h56v10h-56z",
      "M-24 66h8v34h-8z",
      "M20 66h8v34h-8z",
      "M-22 4h46v8h-46z",
      "M-22 22h46v8h-46z",
    ],
  },
  bicycle: {
    width: 122.92,
    height: 100,
    evenodd: true,
    offset: [61.46, -4.17],
    scale: 1.04,
    paths: [
      "M-59 68a32 32 0 1 0 64 0a32 32 0 1 0 -64 0zM-50 68a23 23 0 1 0 46 0a23 23 0 1 0 -46 0z",
      "M-5 68a32 32 0 1 0 64 0a32 32 0 1 0 -64 0zM4 68a23 23 0 1 0 46 0a23 23 0 1 0 -46 0z",
      "M-29.5 68L-24.5 68L-1.5 30L-6.5 30z",
      "M-6.5 30L-1.5 30L16.5 66L11.5 66z",
      "M-29.5 68L-24.5 68L18.5 44L13.5 44z",
      "M13.5 44L18.5 44L29.5 68L24.5 68z",
      "M-16 26h22v5h-22z",
      "M13.5 44L18.5 44L22.5 8L17.5 8z",
      "M6 4h22v5h-22z",
    ],
  },
  wheelie_bin: {
    width: 77.55,
    height: 100,
    evenodd: true,
    offset: [38.78, -2.04],
    scale: 1.02,
    paths: [
      "M-34 12L34 12L30 88L-30 88z",
      "M-38 2h76v12h-76z",
      "M-32 90a10 10 0 1 0 20 0a10 10 0 1 0 -20 0zM-26 90a4 4 0 1 0 8 0a4 4 0 1 0 -8 0z",
      "M12 90a10 10 0 1 0 20 0a10 10 0 1 0 -20 0zM18 90a4 4 0 1 0 8 0a4 4 0 1 0 -8 0z",
    ],
  },
  office_chair: {
    width: 78.43,
    height: 100,
    evenodd: true,
    offset: [39.22, 0],
    scale: 0.98,
    paths: [
      "M-24 0h48v44h-48z",
      "M-30 44h60v10h-60z",
      "M-5 54h10v26h-10z",
      "M-5 80L5 80L-31 96L-37 96z",
      "M-5 80L5 80L37 96L31 96z",
      "M-40 96a6 6 0 1 0 12 0a6 6 0 1 0 -12 0zM-36 96a2 2 0 1 0 4 0a2 2 0 1 0 -4 0z",
      "M28 96a6 6 0 1 0 12 0a6 6 0 1 0 -12 0zM32 96a2 2 0 1 0 4 0a2 2 0 1 0 -4 0z",
    ],
  },
  double_bass: {
    width: 60,
    height: 100,
    evenodd: false,
    offset: [30, 0],
    scale: 1,
    paths: [
      "M-30 76a30 24 0 1 0 60 0a30 24 0 1 0 -60 0z",
      "M-23 52a23 19 0 1 0 46 0a23 19 0 1 0 -46 0z",
      "M-6 10h12v44h-12z",
      "M-11 14V6a6 6 0 0 1 6 -6h10a6 6 0 0 1 6 6V14z",
    ],
  },
  postbox: {
    width: 52,
    height: 100,
    evenodd: false,
    offset: [26, 0],
    scale: 1,
    paths: [
      "M-26 100V26a26 26 0 0 1 26 -26h0a26 26 0 0 1 26 26V100z",
      "M-16 26h32v6h-32z",
    ],
  },
  person: {
    width: 31,
    height: 100,
    evenodd: false,
    offset: [15.5, 0],
    scale: 1,
    paths: [
      "M-9 9a9 9 0 1 0 18 0a9 9 0 1 0 -18 0z",
      "M-10 18L10 18L8.5 55L-8.5 55z",
      "M-11 20L-5 20L-10.5 46L-15.5 46z",
      "M5 20L11 20L15.5 46L10.5 46z",
      "M-9.5 53L-0.5 53L-2.5 100L-9.5 100z",
      "M0.5 53L9.5 53L9.5 100L2.5 100z",
    ],
  },
  penguin: {
    width: 63,
    height: 100,
    evenodd: false,
    offset: [33, 0],
    scale: 1,
    paths: [
      "M-26 58a26 34 0 1 0 52 0a26 34 0 1 0 -52 0z",
      "M-15 18a17 18 0 1 0 34 0a17 18 0 1 0 -34 0z",
      "M14 16L30 21L14 25z",
      "M-27 48L-17 48L-27 76L-33 76z",
      "M-8 92L-24 100L-4 100z",
      "M8 92L24 100L4 100z",
    ],
  },
  door: {
    width: 42,
    height: 100,
    evenodd: false,
    offset: [21, 0],
    scale: 1,
    paths: [
      "M-21 0h42v100h-42z",
      "M11 55a3 3 0 1 0 6 0a3 3 0 1 0 -6 0z",
    ],
  },
  fridge: {
    width: 76,
    height: 100,
    evenodd: true,
    offset: [38, 0],
    scale: 1,
    paths: [
      "M-38 0h76v100h-76zM-34 33h68v6h-68zM20 12h8v17h-8zM20 45h8v17h-8z",
    ],
  },
  wardrobe: {
    width: 88,
    height: 100,
    evenodd: true,
    offset: [44, 0],
    scale: 1,
    paths: [
      "M-44 0h88v92h-88zM-3 6h6v78h-6zM-16.5 48a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0zM7.5 48a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0z",
      "M-40 92h12v8h-12z",
      "M28 92h12v8h-12z",
    ],
  },
  phone_box: {
    width: 72,
    height: 100,
    evenodd: false,
    offset: [36, 0],
    scale: 1,
    paths: [
      "M-32 8h64v92h-64z",
      "M-36 12V4a4 4 0 0 1 4 -4h64a4 4 0 0 1 4 4V12z",
      "M-24 18h48v46h-48z",
    ],
  },
  car: {
    width: 140.43,
    height: 100,
    evenodd: true,
    offset: [70.21, -6.38],
    scale: 1.06,
    paths: [
      "M-66 82V40a10 10 0 0 1 10 -10h112a10 10 0 0 1 10 10V82z",
      "M-34 34V18a12 12 0 0 1 12 -12h38a12 12 0 0 1 12 12V34z",
      "M-58 82a18 18 0 1 0 36 0a18 18 0 1 0 -36 0zM-48 82a8 8 0 1 0 16 0a8 8 0 1 0 -16 0z",
      "M22 82a18 18 0 1 0 36 0a18 18 0 1 0 -36 0zM32 82a8 8 0 1 0 16 0a8 8 0 1 0 -16 0z",
    ],
  },
  street_sign: {
    width: 60,
    height: 100,
    evenodd: false,
    offset: [30, 0],
    scale: 1,
    paths: [
      "M-4 22h8v76h-8z",
      "M-30 24V4a4 4 0 0 1 4 -4h52a4 4 0 0 1 4 4V24z",
      "M-12 97h24v3h-24z",
    ],
  },
  ladder: {
    width: 44,
    height: 100,
    evenodd: false,
    offset: [22, 0],
    scale: 1,
    paths: [
      "M-22 0h8v100h-8z",
      "M14 0h8v100h-8z",
      "M-22 12h44v6h-44z",
      "M-22 32h44v6h-44z",
      "M-22 52h44v6h-44z",
      "M-22 72h44v6h-44z",
    ],
  },
  traffic_light: {
    width: 26,
    height: 100,
    evenodd: false,
    offset: [13, 0],
    scale: 1,
    paths: [
      "M-11 34V8a8 8 0 0 1 8 -8h6a8 8 0 0 1 8 8V34z",
      "M-4 32h8v62h-8z",
      "M-13 94h26v6h-26z",
    ],
  },
  basketball_hoop: {
    width: 74,
    height: 100,
    evenodd: true,
    offset: [30, 0],
    scale: 1,
    paths: [
      "M-6 24h10v74h-10z",
      "M-30 0h56v30h-56zM-19 11h34v15h-34z",
      "M24 24h20v4h-20z",
      "M26 28L42 28L38 38L30 38z",
      "M-20 97h40v3h-40z",
    ],
  },
  lorry: {
    width: 223.16,
    height: 100,
    evenodd: true,
    offset: [115.79, -4.21],
    scale: 1.05,
    paths: [
      "M-110 4h150v78h-150z",
      "M40 82V38a8 8 0 0 1 8 -8h46a8 8 0 0 1 8 8V82z",
      "M-97 82a17 17 0 1 0 34 0a17 17 0 1 0 -34 0zM-88 82a8 8 0 1 0 16 0a8 8 0 1 0 -16 0z",
      "M-59 82a17 17 0 1 0 34 0a17 17 0 1 0 -34 0zM-50 82a8 8 0 1 0 16 0a8 8 0 1 0 -16 0z",
      "M45 82a17 17 0 1 0 34 0a17 17 0 1 0 -34 0zM54 82a8 8 0 1 0 16 0a8 8 0 1 0 -16 0z",
    ],
  },
  lamp_post: {
    width: 22,
    height: 100,
    evenodd: false,
    offset: [11, 0],
    scale: 1,
    paths: [
      "M-3 8h6v90h-6z",
      "M-11 8L11 8L7 0L-7 0z",
      "M-9 97h18v3h-18z",
    ],
  },
  bus_double_decker: {
    width: 247.52,
    height: 100,
    evenodd: true,
    offset: [123.76, 0],
    scale: 0.99,
    paths: [
      "M-125 84V16a16 16 0 0 1 16 -16h218a16 16 0 0 1 16 16V84z",
      "M-89 84a17 17 0 1 0 34 0a17 17 0 1 0 -34 0zM-80 84a8 8 0 1 0 16 0a8 8 0 1 0 -16 0z",
      "M53 84a17 17 0 1 0 34 0a17 17 0 1 0 -34 0zM62 84a8 8 0 1 0 16 0a8 8 0 1 0 -16 0z",
    ],
  },
  giraffe: {
    width: 75.76,
    height: 100,
    evenodd: false,
    offset: [40.4, -1.01],
    scale: 1.01,
    paths: [
      "M-17.5 52L-10.5 52L-15.5 100L-20.5 100z",
      "M-8.5 54L-1.5 54L-5.5 100L-10.5 100z",
      "M10.5 52L17.5 52L20.5 100L15.5 100z",
      "M19.5 54L26.5 54L29.5 100L24.5 100z",
      "M-23 48a27 13 0 1 0 54 0a27 13 0 1 0 -54 0z",
      "M3.5 46L20.5 46L11 36L-3 36z",
      "M-3 36L11 36L0 27L-12 27z",
      "M-12 27L0 27L-10 18L-20 18z",
      "M-20 18L-10 18L-17.5 12L-26.5 12z",
      "M-35 12a9 6 0 1 0 18 0a9 6 0 1 0 -18 0z",
      "M-32 10L-40 14L-31 17z",
      "M-26.25 8L-23.75 8L-26.75 1L-29.25 1z",
      "M-20.25 8L-17.75 8L-20.75 1L-23.25 1z",
      "M25.5 43L30.5 43L34.5 55L31.5 55z",
      "M31.5 55L34.5 55L35 68L33 68z",
    ],
  },
  tree_oak: {
    width: 92.31,
    height: 100,
    evenodd: false,
    offset: [46.15, 3.85],
    scale: 0.96,
    paths: [
      "M-8 52h16v48h-16z",
      "M-34 32a34 34 0 1 0 68 0a34 34 0 1 0 -68 0z",
      "M-48 44a22 22 0 1 0 44 0a22 22 0 1 0 -44 0z",
      "M4 44a22 22 0 1 0 44 0a22 22 0 1 0 -44 0z",
      "M-34 16a20 20 0 1 0 40 0a20 20 0 1 0 -40 0z",
      "M-4 16a20 20 0 1 0 40 0a20 20 0 1 0 -40 0z",
    ],
  },
};

export const silhouetteKeys: string[] =
  Object.keys(silhouettes);
