// Workspace team members + invites. The dashboard calls these via
// ConvexHttpClient (string-based) when CONVEX_URL is set; otherwise it uses an
// in-memory fallback (see apps/kodama-web/src/lib/team-store.ts).

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const roleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
  v.literal("viewer")
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teamMembers").collect();
  }
});

export const invite = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    role: roleValidator,
    inviteToken: v.optional(v.string()),
    invitedBy: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    const now = Date.now();
    if (existing) {
      // Re-inviting an existing record refreshes the role + token.
      await ctx.db.patch(existing._id, {
        role: args.role,
        name: args.name ?? existing.name,
        inviteToken: args.inviteToken,
        invitedBy: args.invitedBy,
        invitedAt: now
      });
      return existing._id;
    }
    return await ctx.db.insert("teamMembers", {
      email: args.email,
      name: args.name,
      role: args.role,
      status: "invited",
      inviteToken: args.inviteToken,
      invitedBy: args.invitedBy,
      invitedAt: now
    });
  }
});

export const updateRole = mutation({
  args: { email: v.string(), role: roleValidator },
  handler: async (ctx, { email, role }) => {
    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!existing) return false;
    await ctx.db.patch(existing._id, { role });
    return true;
  }
});

export const remove = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!existing) return false;
    await ctx.db.delete(existing._id);
    return true;
  }
});
