// Per-project privacy-policy overrides for the Kodama dashboard. One row
// per project. Read at runtime-config time, written by the policy editor.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const policyBody = {
  gmail: v.object({
    blockSenders: v.array(v.string()),
    allowSenders: v.array(v.string()),
    redactOtp: v.boolean(),
    redactAuthCodes: v.boolean(),
    redactFinance: v.boolean(),
    redactPrivateAttachments: v.boolean(),
    subjectDenyPatterns: v.array(v.string())
  }),
  telegram: v.object({
    blockChats: v.array(v.string()),
    allowChats: v.array(v.string()),
    redactPersonalDms: v.boolean()
  }),
  x: v.object({
    blockKeywords: v.array(v.string()),
    readDirectMessages: v.boolean()
  })
} as const;

export const get = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("runtimePolicies")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .first();
  }
});

export const upsert = mutation({
  args: {
    projectId: v.string(),
    ...policyBody,
    updatedBy: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("runtimePolicies")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("runtimePolicies", { ...args, updatedAt: now });
  }
});

export const clear = mutation({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    const existing = await ctx.db
      .query("runtimePolicies")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .first();
    if (!existing) return false;
    await ctx.db.delete(existing._id);
    return true;
  }
});
