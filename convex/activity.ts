// Workspace activity feed. Append-only. The dashboard reads/writes via the
// in-memory fallback when CONVEX_URL is unset (see lib/activity-store.ts).

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("activityLog")
      .withIndex("by_at")
      .order("desc")
      .take(limit ?? 50);
  }
});

export const record = mutation({
  args: {
    type: v.string(),
    actor: v.string(),
    summary: v.string(),
    target: v.optional(v.string()),
    at: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activityLog", {
      type: args.type,
      actor: args.actor,
      summary: args.summary,
      target: args.target,
      at: args.at ?? Date.now()
    });
  }
});
