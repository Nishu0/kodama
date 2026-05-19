// Project-scoped OAuth token CRUD for the Kodama dashboard. The dashboard
// (apps/kodama-web) calls these via ConvexHttpClient when CONVEX_URL is set;
// otherwise it falls back to an in-memory Map. See math_toolcall.md is not
// the right reference — see `idea.md` for design notes.

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const connectorValidator = v.union(
  v.literal("imessage"),
  v.literal("gmail"),
  v.literal("calendar"),
  v.literal("telegram"),
  v.literal("x")
);

export const getByProjectConnector = query({
  args: { projectId: v.string(), connector: connectorValidator },
  handler: async (ctx, { projectId, connector }) => {
    return await ctx.db
      .query("oauthTokens")
      .withIndex("by_project_connector", (q) =>
        q.eq("projectId", projectId).eq("connector", connector)
      )
      .first();
  }
});

export const listByProject = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("oauthTokens")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
  }
});

export const upsert = mutation({
  args: {
    projectId: v.string(),
    connector: connectorValidator,
    accessTokenCt: v.string(),
    refreshTokenCt: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scopes: v.array(v.string()),
    status: v.union(
      v.literal("connected"),
      v.literal("expired"),
      v.literal("disconnected")
    ),
    profile: v.optional(
      v.object({ id: v.string(), label: v.optional(v.string()) })
    ),
    extra: v.optional(v.any()),
    connectedAt: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("oauthTokens")
      .withIndex("by_project_connector", (q) =>
        q.eq("projectId", args.projectId).eq("connector", args.connector)
      )
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("oauthTokens", { ...args, updatedAt: now });
  }
});

export const remove = mutation({
  args: { projectId: v.string(), connector: connectorValidator },
  handler: async (ctx, { projectId, connector }) => {
    const existing = await ctx.db
      .query("oauthTokens")
      .withIndex("by_project_connector", (q) =>
        q.eq("projectId", projectId).eq("connector", connector)
      )
      .first();
    if (!existing) return false;
    await ctx.db.delete(existing._id);
    return true;
  }
});
