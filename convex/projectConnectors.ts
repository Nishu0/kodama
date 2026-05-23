// Per-project connector enablement. One row per project listing which global
// connections the project is allowed to use. Read at runtime-config time;
// written by the project Integrations tab toggles.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("projectConnectors")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .first();
  }
});

export const upsert = mutation({
  args: {
    projectId: v.string(),
    connectors: v.array(v.string()),
    updatedBy: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projectConnectors")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("projectConnectors", { ...args, updatedAt: now });
  }
});

export const clear = mutation({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    const existing = await ctx.db
      .query("projectConnectors")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .first();
    if (!existing) return false;
    await ctx.db.delete(existing._id);
    return true;
  }
});
