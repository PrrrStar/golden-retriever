import { describe, expect, it } from "vitest";
import { matchesCidr } from "../src/cidr";

describe("matchesCidr", () => {
  it("matches IPv4 prefixes", () => {
    expect(matchesCidr("192.0.2.42", "192.0.2.0/24")).toBe(true);
    expect(matchesCidr("192.0.3.42", "192.0.2.0/24")).toBe(false);
  });

  it("matches compressed IPv6 prefixes", () => {
    expect(matchesCidr("2001:db8::1234", "2001:db8::/32")).toBe(true);
    expect(matchesCidr("2001:db9::1", "2001:db8::/32")).toBe(false);
  });

  it("rejects invalid addresses and mixed families", () => {
    expect(matchesCidr("999.0.0.1", "192.0.2.0/24")).toBe(false);
    expect(matchesCidr("192.0.2.1", "2001:db8::/32")).toBe(false);
  });
});
