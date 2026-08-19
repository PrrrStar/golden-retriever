export function matchesAnyCidr(ip: string, cidrs: string[]): boolean {
  return cidrs.some((cidr) => matchesCidr(ip, cidr));
}
export function matchesCidr(ip: string, cidr: string): boolean {
  const [network, prefixText] = cidr.split("/");
  if (!network || !prefixText) return false;
  const address = parseIp(ip);
  const base = parseIp(network);
  const prefix = Number(prefixText);
  if (!address || !base || address.bits !== base.bits || !Number.isInteger(prefix) || prefix < 0 || prefix > address.bits) {
    return false;
  }
  const shift = BigInt(address.bits - prefix);
  return (address.value >> shift) === (base.value >> shift);
}

function parseIp(input: string): { value: bigint; bits: 32 | 128 } | undefined {
  if (input.includes(":")) return parseIpv6(input);
  const octets = input.split(".");
  if (octets.length !== 4) return undefined;
  let value = 0n;
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return undefined;
    const number = Number(octet);
    if (number > 255) return undefined;
    value = (value << 8n) | BigInt(number);
  }
  return { value, bits: 32 };
}

function parseIpv6(input: string): { value: bigint; bits: 128 } | undefined {
  if ((input.match(/::/g) ?? []).length > 1) return undefined;
  const [leftText, rightText] = input.toLowerCase().split("::");
  const left = leftText ? leftText.split(":") : [];
  const right = rightText ? rightText.split(":") : [];
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return undefined;
  const missing = 8 - left.length - right.length;
  if ((input.includes("::") && missing < 1) || (!input.includes("::") && missing !== 0)) return undefined;
  const groups = [...left, ...Array.from({ length: missing }, () => "0"), ...right];
  if (groups.length !== 8) return undefined;
  let value = 0n;
  for (const group of groups) value = (value << 16n) | BigInt(`0x${group}`);
  return { value, bits: 128 };
}
