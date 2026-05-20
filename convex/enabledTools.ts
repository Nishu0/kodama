// Per-project MCP tool enablement overrides. One row per project.
// Read at runtime-config time; written by the Tools tab in the dashboard.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("enabledTools")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .first();
  }
});

export const upsert = mutation({
  args: {
    projectId: v.string(),
    tools: v.array(v.string()),
    updatedBy: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("enabledTools")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("enabledTools", { ...args, updatedAt: now });
  }
});

export const clear = mutation({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    const existing = await ctx.db
      .query("enabledTools")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .first();
    if (!existing) return false;
    await ctx.db.delete(existing._id);
    return true;
  }
});
