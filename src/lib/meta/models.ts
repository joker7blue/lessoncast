// The model ids the pipeline calls, shared by the API clients and the pages that show them.

export const SPARK_MODEL = "muse-spark-1.3";
export const IMAGE_MODEL = "muse-image-1.0";
// Mirrors VOICES in modal/voice.py.
export const VOICE_MODELS = { fr: "facebook/mms-tts-fra", pcm: "facebook/mms-tts-pcm" } as const;
export const ALIGNER_MODEL = "MMS_FA (torchaudio)";
