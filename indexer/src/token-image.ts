/**
 * Token artwork. Brew writes each token's picture into the launch metadata, most
 * often as `onchain://56/<address>`: a contract whose code is one zero byte
 * followed by the image file. Some tokens carry the image inline as a data URI.
 * Pure helpers; the route in api/index.ts does the chain read (docs/0020).
 */

/** Larger than anything Brew's site writes (23,500 bytes), with room for inline images. */
export const MAX_IMAGE_BYTES = 200_000;

export type ImageRef =
  | { kind: "onchain"; address: `0x${string}` }
  | { kind: "inline"; bytes: Uint8Array }
  | null;

const ONCHAIN = /^onchain:\/\/56\/(0x[0-9a-fA-F]{40})$/;
const INLINE = /^data:image\/(?:webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/;

/** Where a token's image is, from the `metadataURI` its launch emitted. Null when there is none or it is not understood. */
export function imageRefFromMetadata(metadataUri: string | null): ImageRef {
  if (!metadataUri) return null;
  const json = /^data:application\/json;base64,(.+)$/.exec(metadataUri);
  if (!json?.[1]) return null;
  let image: unknown;
  try {
    image = (JSON.parse(Buffer.from(json[1], "base64").toString("utf8")) as { image?: unknown }).image;
  } catch {
    return null;
  }
  if (typeof image !== "string") return null;

  const onchain = ONCHAIN.exec(image);
  if (onchain?.[1]) return { kind: "onchain", address: onchain[1].toLowerCase() as `0x${string}` };
  const inline = INLINE.exec(image);
  if (inline?.[1]) return { kind: "inline", bytes: new Uint8Array(Buffer.from(inline[1], "base64")) };
  return null;
}

/** The image inside an image contract's code: everything after the leading zero byte. Null if the code is not shaped that way. */
export function imageFromCode(code: `0x${string}`): Uint8Array | null {
  const bytes = new Uint8Array(Buffer.from(code.slice(2), "hex"));
  if (bytes.length < 2 || bytes[0] !== 0) return null;
  return bytes.slice(1);
}

/**
 * The image's type from its first bytes, or null if it is not WebP, PNG or JPEG.
 * Anything else is refused: the bytes come from whoever launched the token.
 */
export function sniffImageType(bytes: Uint8Array): "image/webp" | "image/png" | "image/jpeg" | null {
  if (bytes.length > MAX_IMAGE_BYTES) return null;
  const at = (i: number) => bytes[i];
  if (bytes.length > 12 && at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) {
    return "image/webp";
  }
  if (bytes.length > 8 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return "image/png";
  if (bytes.length > 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  return null;
}
