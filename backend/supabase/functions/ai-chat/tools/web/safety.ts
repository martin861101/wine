import { HttpError } from "../../../_shared/http.ts";

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home", ".lan"];

function parseIpv4(value: string): number[] | undefined {
  const parts = value.split(".");
  if (parts.length !== 4) return undefined;
  const numbers = parts.map((part) => Number(part));
  return numbers.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? numbers
    : undefined;
}

export function isPrivateIpv4(value: string): boolean {
  const parts = parseIpv4(value);
  if (!parts) return false;
  const [a = 0, b = 0, c = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function expandIpv6(value: string): number[] | undefined {
  let clean =
    value
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .split("%")[0] ?? "";
  if (!clean.includes(":")) return undefined;
  const ipv4Match = clean.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Match?.[1]) {
    const ipv4 = parseIpv4(ipv4Match[1]);
    if (!ipv4) return undefined;
    clean =
      clean.slice(0, -ipv4Match[1].length) +
      `${(((ipv4[0] ?? 0) << 8) | (ipv4[1] ?? 0)).toString(16)}:` +
      `${(((ipv4[2] ?? 0) << 8) | (ipv4[3] ?? 0)).toString(16)}`;
  }
  const halves = clean.split("::");
  if (halves.length > 2) return undefined;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return undefined;
  const words = [...left, ...Array(missing).fill("0"), ...right].map((word) =>
    /^[0-9a-f]{1,4}$/.test(word) ? Number.parseInt(word, 16) : Number.NaN,
  );
  return words.length === 8 && words.every(Number.isFinite) ? words : undefined;
}

export function isPrivateIpv6(value: string): boolean {
  const words = expandIpv6(value);
  if (!words) return false;
  const [first = 0, second = 0, third = 0, fourth = 0, fifth = 0, sixth = 0] = words;
  const unspecifiedOrLoopback = words.slice(0, 7).every((word) => word === 0);
  const mappedIpv4 =
    first === 0 && second === 0 && third === 0 && fourth === 0 && fifth === 0 && sixth === 0xffff;
  if (mappedIpv4) {
    const mapped = `${(words[6] ?? 0) >> 8}.${(words[6] ?? 0) & 255}.${(words[7] ?? 0) >> 8}.${(words[7] ?? 0) & 255}`;
    return isPrivateIpv4(mapped);
  }
  return (
    unspecifiedOrLoopback ||
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xffc0) === 0xfec0 ||
    (first & 0xff00) === 0xff00 ||
    (first === 0x2001 && second === 0x0db8)
  );
}

export function isPrivateAddress(value: string): boolean {
  return isPrivateIpv4(value) || isPrivateIpv6(value);
}

export async function assertSafeWebUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError("That webpage address is invalid.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HttpError("That webpage protocol is not allowed.");
  }
  if (url.username || url.password) throw new HttpError("Webpage credentials are not allowed.");
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new HttpError("That webpage port is not allowed.");
  }

  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    !hostname.includes(".") ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix)) ||
    isPrivateAddress(hostname)
  ) {
    throw new HttpError("That webpage destination is not allowed.");
  }

  if (!parseIpv4(hostname) && !expandIpv6(hostname)) {
    const resolved = await Promise.all([
      Deno.resolveDns(hostname, "A").catch(() => [] as string[]),
      Deno.resolveDns(hostname, "AAAA").catch(() => [] as string[]),
    ]);
    const addresses = resolved.flat();
    if (!addresses.length) throw new HttpError("Page could not be read.", 502);
    if (addresses.some(isPrivateAddress)) {
      throw new HttpError("That webpage destination is not allowed.");
    }
  }
  return url;
}
