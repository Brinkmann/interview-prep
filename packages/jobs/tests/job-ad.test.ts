import { describe, expect, it } from "vitest";
import { adHash, looksTruncated } from "../src/job-ad";

const FULL = `Supply Chain Manager, Auckland
We are looking for an experienced supply chain manager to lead planning, procurement and distribution across our North Island sites.
You will own the S&OP process, manage a team of eight planners and buyers, and work with suppliers to cut lead times.
What you bring: at least seven years in supply chain roles, two of them leading a team; strong data skills; a track record of reducing cost while protecting service levels.
We offer flexible working, a vehicle allowance and a supportive team. Applications close 30 November.`;

describe("AT-03: truncated job ads trigger the warning", () => {
  it("accepts a complete ad", () => expect(looksTruncated(FULL)).toBe(false));
  it("warns on an ad that ends with an ellipsis", () => expect(looksTruncated(`${FULL}\nKey responsibilities include...`)).toBe(true));
  it("warns on an ad that ends with a 'Read more' link", () => expect(looksTruncated(`${FULL}\nRead more`)).toBe(true));
  it("warns on an ad that stops mid-sentence", () => expect(looksTruncated(`${FULL}\nYou will report to the`)).toBe(true));
  it("warns on an ad that is too short to describe a role", () => expect(looksTruncated("Supply Chain Manager. Apply now.")).toBe(true));
  it("treats the same ad with different spacing as the same ad", () => expect(adHash(FULL)).toBe(adHash(`  ${FULL.replace(/ /g, "  ")}\n`)));
});
