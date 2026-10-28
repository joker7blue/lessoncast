import { loadFont } from "@remotion/google-fonts/Nunito";

// latin-ext carries "œ" (cœur, sœur).
export const { fontFamily } = loadFont("normal", { weights: ["700", "800"], subsets: ["latin", "latin-ext"] });
