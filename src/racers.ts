// The two racers. Each one takes a ticket's text and returns a category.
// They share one shape (Racer) so race.ts can treat them the same way.

import Anthropic from "@anthropic-ai/sdk";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import { CATEGORIES, CATEGORY_NAMES, TICKETS, type Category } from "./tickets.js";

export interface Guess {
  answer: string;
  inputTokens: number;
  outputTokens: number;
}

export interface Racer {
  name: string;
  model: string;
  /** Dollars per 1 million tokens. */
  price: { input: number; output: number };
  classify(text: string): Promise<Guess>;
}

const INSTRUCTIONS = "Which support team should handle this customer ticket?";

// ---------------------------------------------------------------------------
// Racer 1: Jev
// Jev doesn't write text. You ask a typed question (here a `choice`) and it
// returns one of your labels, plus a probability for each label.
// ---------------------------------------------------------------------------
export function jevRacer(): Racer {
  const client = new TypeSafeClient(); // reads TYPESAFE_API_KEY
  return {
    name: "Jev",
    model: client.defaultModel,
    // TypeSafe's published launch price: $0.042 per 1M input tokens, output free.
    price: { input: 0.042, output: 0 },
    async classify(text) {
      const result = await client.systemOne({
        state: text,
        questions: { team: choice(INSTRUCTIONS, CATEGORIES) },
      });
      return {
        answer: result.answers.team.choice,
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Racer 2: Claude (a frontier LLM)
// To make it a fair race, Claude gets the same question and the same category
// descriptions, and a JSON schema that forces it to answer with one label.
// ---------------------------------------------------------------------------
export function claudeRacer(model = process.env.CLAUDE_MODEL ?? "claude-opus-5-5"): Racer {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const system = [
    INSTRUCTIONS,
    "Teams:",
    ...CATEGORY_NAMES.map((name) => `- ${name}: ${CATEGORIES[name]}`),
  ].join("\n");

  return {
    name: "Claude",
    model,
    // Claude Opus 5.5 list price. Update this if you set CLAUDE_MODEL to another model.
    price: { input: 4, output: 20 },
    async classify(text) {
      const response = await client.beta.messages.create({
        model,
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: text }],
        output_config: {
          effort: "low", // simple task, so ask for the fastest setting
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: { team: { type: "string", enum: CATEGORY_NAMES } },
              required: ["team"],
              additionalProperties: false,
            },
          },
        },
        // If a safety check declines the request, retry it on a fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });

      if (response.stop_reason === "refusal") {
        throw new Error("Claude declined to answer this ticket");
      }
      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error(`Claude returned no text (stop_reason: ${response.stop_reason})`);
      }
      const { team } = JSON.parse(textBlock.text) as { team: Category };
      return {
        answer: team,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Demo racers: no API keys needed. They fake answers and delays so you can see
// what the output looks like. Their numbers are made up. Never publish them.
// ---------------------------------------------------------------------------
export function demoRacer(
  name: string,
  price: Racer["price"],
  delayMs: [number, number],
  accuracy: number,
): Racer {
  let seed = name.length * 7919;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  return {
    name,
    model: "demo (simulated)",
    price,
    async classify(text) {
      const [min, max] = delayMs;
      await new Promise((resolve) => setTimeout(resolve, min + random() * (max - min)));
      const truth = guessTruth(text);
      const answer = random() < accuracy ? truth : CATEGORY_NAMES[Math.floor(random() * 4)]!;
      return { answer, inputTokens: 60, outputTokens: price.output === 0 ? 0 : 120 };
    },
  };
}

// Demo racers look up the right answer so their accuracy is controlled.
function guessTruth(text: string): Category {
  return TICKETS.find((t) => t.text === text)?.answer ?? "technical";
}
