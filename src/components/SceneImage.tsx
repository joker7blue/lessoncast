"use client";

// A scene served small by next/image, falling back to the original file if the optimizer can't
// fetch it in time, so a scene never shows as a broken image.

import Image from "next/image";
import { useState } from "react";

export function SceneImage({ src, alt, sizes }: { src: string; alt: string; sizes: string }) {
  const [direct, setDirect] = useState(false);
  return (
    <Image
      src={src}
      alt={alt}
      width={854}
      height={480}
      sizes={sizes}
      unoptimized={direct}
      onError={() => setDirect(true)}
      className="aspect-video w-full rounded-lg object-cover"
    />
  );
}
