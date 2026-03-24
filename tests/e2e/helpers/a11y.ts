import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function formatViolations(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `${node.target.join(" ")}: ${node.failureSummary ?? "No summary"}`)
        .join("\n");

      return `${violation.id} (${violation.impact ?? "unknown"})\n${nodes}`;
    })
    .join("\n\n");
}

export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();

  expect(
    results.violations,
    results.violations.length === 0 ? undefined : formatViolations(results.violations),
  ).toEqual([]);
}
