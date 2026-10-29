// The languages a lesson can be narrated in. Each one has an open MMS-TTS voice from Meta that reads its
// standard Latin spelling (its vocabulary holds the language's own letters: ɓ ɗ ƙ, ŋ ƴ, ẹ ọ ṣ, ɖ ɛ ɔ), and
// a rule telling Muse Spark how to write it.

export const LANGUAGE_CODES = ["fr", "en", "pcm", "hau", "ful", "yor", "fon", "swh"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

type LanguageInfo = {
  /** English name, for the site. */
  label: string;
  /** The language's own name. */
  native: string;
  /** Where it is spoken, for the site. */
  where: string;
  /** The MMS-TTS voice that reads it (modal/voice.py has the same list). */
  voice: string;
  /** How Muse Spark writes the narration in it. */
  writing: string;
  /** Words its voice reads per second, pauses included: measured on real lessons, or estimated. */
  wordsPerSecond: number;
};

export const LANGUAGES: Record<LanguageCode, LanguageInfo> = {
  fr: {
    label: "French",
    native: "Français",
    where: "Official language",
    voice: "facebook/mms-tts-fra",
    wordsPerSecond: 2.5, // estimated from French lessons
    writing:
      "French at the level of the pages. For nursery and primary school, simple words for children. For secondary school, the subject's exact vocabulary, still in short sentences made to be heard.",
  },
  en: {
    label: "English",
    native: "English",
    where: "Official language",
    voice: "facebook/mms-tts-eng",
    wordsPerSecond: 2.6, // estimated
    writing:
      "English at the level of the pages, as in the textbooks of Cameroon's English-speaking schools: simple words for primary school, the subject's exact vocabulary in short spoken sentences for secondary school.",
  },
  pcm: {
    label: "Pidgin",
    native: "Kamtok",
    where: "Cameroon, Nigeria",
    voice: "facebook/mms-tts-pcm",
    wordsPerSecond: 2.7, // measured: 330 words in 122 s
    writing:
      "Cameroonian Pidgin English (Kamtok), the way a parent in Douala or Bamenda would explain it at home, spelled in plain Latin letters as it sounds.",
  },
  hau: {
    label: "Hausa",
    native: "Hausa",
    where: "Northern Cameroon, Nigeria, Niger",
    voice: "facebook/mms-tts-hau",
    wordsPerSecond: 1.6, // measured: 138 words in 85 s
    writing:
      "Hausa as spoken in northern Cameroon, Nigeria and Niger, in the standard Latin spelling (boko) with its hooked letters ɓ, ɗ and ƙ, the way a parent would explain it at home.",
  },
  ful: {
    label: "Fulfulde",
    native: "Fulfulde",
    where: "Northern Cameroon, the Sahel",
    voice: "facebook/mms-tts-ful",
    wordsPerSecond: 2.0, // measured: 73 words in 37 s
    writing:
      "Fulfulde as spoken in northern Cameroon (Adamawa Fulfulde, around Maroua, Garoua and Ngaoundéré), in the standard Latin spelling with ɓ, ɗ, ŋ and ƴ, the way a parent would explain it at home.",
  },
  yor: {
    label: "Yoruba",
    native: "Yorùbá",
    where: "Benin, Nigeria",
    voice: "facebook/mms-tts-yor",
    wordsPerSecond: 2.2, // estimated
    writing: "Yoruba as spoken in Benin and Nigeria, in the standard spelling with its tone marks and underdots (ẹ, ọ, ṣ), the way a parent would explain it at home.",
  },
  fon: {
    label: "Fon",
    native: "Fɔngbè",
    where: "Benin",
    voice: "facebook/mms-tts-fon",
    wordsPerSecond: 2.2, // estimated
    writing: "Fon (Fɔngbè) as spoken in Benin, in its standard Latin spelling with ɖ, ɛ and ɔ and its tone marks, the way a parent would explain it at home.",
  },
  swh: {
    label: "Swahili",
    native: "Kiswahili",
    where: "DR Congo, East Africa",
    voice: "facebook/mms-tts-swh",
    wordsPerSecond: 1.8, // estimated: long words
    writing: "Standard Swahili (Kiswahili sanifu), as taught in the schools of the DR Congo and East Africa, in simple spoken sentences.",
  },
};
