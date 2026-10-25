import { describe, expect, it } from "vitest";
import { OPENAI_USAGE_PAUSED, assertOpenAIUsageAllowed } from "../../supabase/functions/_shared/openaiUsage";

describe("owner-requested OpenAI pause", () => {
  it("keeps OpenAI paused without a timed expiry", () => {
    expect(OPENAI_USAGE_PAUSED).toBe(true);
  });

  it("blocks OpenAI work before any provider request", () => {
    let requests = 0;
    expect(() => {
      assertOpenAIUsageAllowed();
      requests += 1;
    }).toThrow();
    expect(requests).toBe(0);
    try {
      assertOpenAIUsageAllowed();
    } catch (error) {
      expect((error as Error & { status: number }).status).toBe(423);
    }
  });
});