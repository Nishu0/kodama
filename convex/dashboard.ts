// CRUD for the kodama-web dashboard data plane: projects, secrets, members,
// lines, webhooks, platforms. All keyed by the public projectId string
// (e.g. "prj_iris") rather than a Convex doc id so the dashboard can read
// without round-tripping for an id resolution.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const environmentValidator = v.union(
  v.literal("production"),
  v.literal("staging"),
  v.literal("development")
);

const roleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
  v.literal("viewer")
);

const platformIdValidator = v.union(
  v.literal("imessage"),
  v.literal("telegram"),
  v.literal("instagram"),
  v.literal("discord"),
  v.literal("messenger"),
  v.literal("github")
);

// ─────────────────── projects ───────────────────

export const listProjects = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("dashboardProjects").collect();
    return rows.filter((row) => !row.deletedAt);
  }
});

export const getProject = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("dashboardProjects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
  }
});

export const upsertProject = mutation({
  args: {
    projectId: v.string(),
    name: v.string(),
    environment: environmentValidator,
    memberCount: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dashboardProjects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        environment: args.environment,
        memberCount: args.memberCount ?? existing.memberCount,
        updatedAt: now,
        deletedAt: undefined
      });
      return existing._id;
    }
    return await ctx.db.insert("dashboardProjects", {
      projectId: args.projectId,
      name: args.name,
      environment: args.environment,
      memberCount: args.memberCount ?? 1,
      createdAt: now,
      updatedAt: now
    });
  }
});

// ─────────────────── secrets ───────────────────

export const getProjectSecret = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("dashboardProjectSecrets")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
  }
});

export const upsertProjectSecret = mutation({
  args: {
    projectId: v.string(),
    projectIdPublic: v.string(),
    secretKeyCt: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dashboardProjectSecrets")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        projectIdPublic: args.projectIdPublic,
        secretKeyCt: args.secretKeyCt,
        rotatedAt: now
      });
      return existing._id;
    }
    return await ctx.db.insert("dashboardProjectSecrets", {
      ...args,
      createdAt: now
    });
  }
});

// ─────────────────── members ───────────────────

export const listMembers = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("dashboardProjectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
  }
});

export const addMember = mutation({
  args: {
    projectId: v.string(),
    name: v.string(),
    email: v.string(),
    role: roleValidator
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dashboardProjectMembers", {
      ...args,
      addedAt: Date.now()
    });
  }
});

// ─────────────────── lines ───────────────────

export const listLines = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("dashboardProjectLines")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
  }
});

export const addLine = mutation({
  args: {
    projectId: v.string(),
    label: v.string(),
    handle: v.string(),
    platform: v.string(),
    status: v.union(v.literal("active"), v.literal("pending"))
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dashboardProjectLines", {
      ...args,
      addedAt: Date.now()
    });
  }
});

// ─────────────────── webhooks ───────────────────

export const getWebhook = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("dashboardProjectWebhooks")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .first();
  }
});

export const upsertWebhook = mutation({
  args: {
    projectId: v.string(),
    url: v.optional(v.string()),
    signingSecretCt: v.optional(v.string()),
    events: v.array(v.string()),
    lastDeliveryAt: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dashboardProjectWebhooks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("dashboardProjectWebhooks", {
      ...args,
      updatedAt: now
    });
  }
});

// ─────────────────── platforms ───────────────────

export const listPlatforms = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("dashboardProjectPlatforms")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
  }
});

export const upsertPlatform = mutation({
  args: {
    projectId: v.string(),
    platformId: platformIdValidator,
    status: v.union(
      v.literal("enabled"),
      v.literal("disabled"),
      v.literal("coming-soon")
    )
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dashboardProjectPlatforms")
      .withIndex("by_project_platform", (q) =>
        q.eq("projectId", args.projectId).eq("platformId", args.platformId)
      )
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("dashboardProjectPlatforms", {
      ...args,
      updatedAt: now
    });
  }
});
