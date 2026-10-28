// Remotion CLI and Studio settings. The Modal render passes the same values to renderMedia().
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/remotion/index.ts");
Config.setVideoBitrate("300k");
Config.setX264Preset("slow");
Config.setAudioBitrate("48k");
