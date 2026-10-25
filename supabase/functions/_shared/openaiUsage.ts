// Owner-requested pause. No expiry: change only after an explicit resume request.
export const OPENAI_USAGE_PAUSED = true;
export const OPENAI_PAUSE_MESSAGE = "OpenAI API usage is paused by the owner until further notice.";

export function assertOpenAIUsageAllowed(): void {
  if (OPENAI_USAGE_PAUSED) {
    throw Object.assign(new Error(OPENAI_PAUSE_MESSAGE), { status: 423 });
  }
}