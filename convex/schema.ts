import {defineSchema, defineTable} from 'convex/server';
import {v} from 'convex/values';

// Platform-level role
export const userRole = v.union(v.literal('appAdmin'), v.literal('user'));

// Organization-level role
export const orgMemberRole = v.union(v.literal('orgAdmin'), v.literal('user'));

// Device status
export const deviceStatus = v.union(v.literal('pending'), v.literal('active'));

export default defineSchema({
    users: defineTable({
        authId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        avatarStorageId: v.optional(v.id('_storage')),
        role: userRole,
        lastOrgSlug: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_authId', ['authId'])
        .index('by_email', ['email']),

    organizations: defineTable({
        name: v.string(),
        slug: v.string(),
        logoUrl: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_slug', ['slug']),

    organizationMembers: defineTable({
        userId: v.id('users'),
        organizationId: v.id('organizations'),
        role: orgMemberRole,
        createdAt: v.number(),
    })
        .index('by_user', ['userId'])
        .index('by_organization', ['organizationId'])
        .index('by_user_and_org', ['userId', 'organizationId']),

    devices: defineTable({
        id: v.string(), // UUIDv4 - this IS the identifier
        organizationId: v.id('organizations'),
        name: v.string(),
        description: v.optional(v.string()),
        tags: v.array(v.string()),
        status: deviceStatus,
        lastSeen: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_device_id', ['id'])
        .index('by_organization', ['organizationId']),
});