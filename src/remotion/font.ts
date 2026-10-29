import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as loadNotoSans } from "@remotion/google-fonts/NotoSans";

// latin-ext carries "œ" (cœur, sœur).
const nunito = loadNunito("normal", { weights: ["700", "800"], subsets: ["latin", "latin-ext"] });
// Nunito has no ɓ ɗ ƙ ƴ ɛ ɔ, the letters of Hausa, Fulfulde, Fon or Yoruba: Noto Sans draws those.
const notoSans = loadNotoSans("normal", { weights: ["700", "800"], subsets: ["latin-ext"] });

export const fontFamily = `${nunito.fontFamily}, ${notoSans.fontFamily}`;
