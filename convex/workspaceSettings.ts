// Workspace settings singleton (one row, key = "default"). Read on the
// dashboard Settings page; written by its form. In-memory fallback lives in
// apps/kodama-web/src/lib/workspace-settings.ts.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const notificationsValidator = v.union(
  v.literal("all"),
  v.literal("important"),
  v.literal("off")
);

export const get = query({
  args: { key: v.optional(v.string()) },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("workspaceSettings")
      .withIndex("by_key", (q) => q.eq("key", key ?? "default"))
      .first();
  }
});

export const upsert = mutation({
  args: {
    key: v.optional(v.string()),
    name: v.string(),
    openRouterModel: v.string(),
    notifications: notificationsValidator,
    supportEmail: v.optional(v.string()),
    openRouterKeyCt: v.optional(v.string()),    // new key ciphertext, if changing
    clearKey: v.optional(v.boolean()),          // true to remove the stored key
    updatedBy: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const key = args.key ?? "default";
    const existing = await ctx.db
      .query("workspaceSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    const now = Date.now();
    // Preserve the existing key unless a new one is supplied or clearKey is set.
    const openRouterKeyCt = args.clearKey
      ? undefined
      : args.openRouterKeyCt ?? existing?.openRouterKeyCt;
    const row = {
      key,
      name: args.name,
      openRouterModel: args.openRouterModel,
      notifications: args.notifications,
      supportEmail: args.supportEmail,
      openRouterKeyCt,
      updatedAt: now,
      updatedBy: args.updatedBy
    };
    if (existing) {
      await ctx.db.patch(existing._id, row);
      return existing._id;
    }
    return await ctx.db.insert("workspaceSettings", row);
  }
});
