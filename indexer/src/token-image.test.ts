import { describe, expect, it } from "vitest";

import { imageFromCode, imageRefFromMetadata, sniffImageType } from "./token-image";

const metadata = (value: unknown) => `data:application/json;base64,${Buffer.from(JSON.stringify(value)).toString("base64")}`;
const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 9, 9]);

describe("imageRefFromMetadata", () => {
  // The shape of a real launch's metadata (BSC, 2026-10-01).
  it("reads an on-chain image reference", () => {
    expect(imageRefFromMetadata(metadata({ v: "1", image: "onchain://56/0x1006c191E3dc4f097ef1e77b985e597e1971006D" }))).toEqual({
      kind: "onchain",
      address: "0x1006c191e3dc4f097ef1e77b985e597e1971006d",
    });
  });

  it("reads an inline image", () => {
    const ref = imageRefFromMetadata(metadata({ image: `data:image/webp;base64,${Buffer.from(webp).toString("base64")}` }));
    expect(ref).toEqual({ kind: "inline", bytes: webp });
  });

  it("is null for anything else", () => {
    expect(imageRefFromMetadata(null)).toBeNull();
    expect(imageRefFromMetadata("https://example.com/meta.json")).toBeNull();
    expect(imageRefFromMetadata("data:application/json;base64,not-json")).toBeNull();
    expect(imageRefFromMetadata(metadata({ description: "no image" }))).toBeNull();
    expect(imageRefFromMetadata(metadata({ image: "https://example.com/a.png" }))).toBeNull();
    expect(imageRefFromMetadata(metadata({ image: "onchain://1/0x1006c191e3dc4f097ef1e77b985e597e1971006d" }))).toBeNull();
    expect(imageRefFromMetadata(metadata({ image: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }))).toBeNull();
  });
});

describe("imageFromCode", () => {
  it("drops the leading zero byte", () => {
    expect(imageFromCode("0x00ffd8ff")).toEqual(Uint8Array.from([0xff, 0xd8, 0xff]));
  });

  it("refuses code that does not start with a zero byte, or is empty", () => {
    expect(imageFromCode("0x6080604052")).toBeNull();
    expect(imageFromCode("0x")).toBeNull();
  });
});

describe("sniffImageType", () => {
  it("recognises WebP, PNG and JPEG by their first bytes", () => {
    expect(sniffImageType(webp)).toBe("image/webp");
    expect(sniffImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("image/png");
    expect(sniffImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("refuses anything else, including SVG and oversized files", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageType(new Uint8Array(0))).toBeNull();
    const huge = new Uint8Array(200_001);
    huge.set([0xff, 0xd8, 0xff]);
    expect(sniffImageType(huge)).toBeNull();
  });
});
