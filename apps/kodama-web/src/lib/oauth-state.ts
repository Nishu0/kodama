import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type StatePayload = {
  projectId: string;
  connector: string;
  returnTo: string;
  ts: number;
  nonce: string;
};

const TEN_MINUTES = 10 * 60 * 1000;

function secret(): string {
  const value = process.env.KODAMA_STATE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) {
    throw new Error(
      "missing KODAMA_STATE_SECRET (or NEXTAUTH_SECRET) — needed to sign OAuth state",
    );
  }
  return value;
}

function base64url(buffer: Buffer | Uint8Array): string {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

export function signState(
  payload: Omit<StatePayload, "ts" | "nonce"> & Partial<Pick<StatePayload, "ts" | "nonce">>,
): string {
  const full: StatePayload = {
    projectId: payload.projectId,
    connector: payload.connector,
    returnTo: payload.returnTo,
    ts: payload.ts ?? Date.now(),
    nonce: payload.nonce ?? randomBytes(12).toString("hex"),
  };
  const body = base64url(Buffer.from(JSON.stringify(full)));
  const sig = base64url(
    createHmac("sha256", secret()).update(body).digest(),
  );
  return `${body}.${sig}`;
}

export function verifyState(value: string): StatePayload {
  const [body, sig] = value.split(".");
  if (!body || !sig) throw new Error("malformed state");

  const expected = base64url(
    createHmac("sha256", secret()).update(body).digest(),
  );
  const provided = Buffer.from(sig);
  const correct = Buffer.from(expected);
  if (provided.length !== correct.length || !timingSafeEqual(provided, correct)) {
    throw new Error("state signature mismatch");
  }

  const parsed = JSON.parse(fromBase64url(body).toString("utf8")) as StatePayload;
  if (Math.abs(Date.now() - parsed.ts) > TEN_MINUTES) {
    throw new Error("state expired");
  }
  return parsed;
}
