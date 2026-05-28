import { describe, it, expect } from "vitest";
import { isItalianMobile } from "../asterisk";

describe("isItalianMobile", () => {
  it("riconosce numeri cellulare italiani (9 cifre dopo 3)", () => {
    expect(isItalianMobile("3331234567")).toBe(true);
    expect(isItalianMobile("3471234567")).toBe(true);
    expect(isItalianMobile("3661234567")).toBe(true);
  });

  it("riconosce numeri cellulare con 8 cifre dopo 3", () => {
    expect(isItalianMobile("312345678")).toBe(true);
  });

  it("rifiuta numeri fissi italiani (non iniziano con 3)", () => {
    expect(isItalianMobile("0291234567")).toBe(false);
    expect(isItalianMobile("0612345678")).toBe(false);
  });

  it("rifiuta numeri con prefisso internazionale", () => {
    expect(isItalianMobile("393331234567")).toBe(false);
    expect(isItalianMobile("443331234567")).toBe(false);
  });

  it("rifiuta stringhe vuote o troppo corte", () => {
    expect(isItalianMobile("")).toBe(false);
    expect(isItalianMobile("333")).toBe(false);
    expect(isItalianMobile("3")).toBe(false);
  });

  it("rifiuta numeri troppo lunghi", () => {
    expect(isItalianMobile("33312345678901")).toBe(false);
  });
});
