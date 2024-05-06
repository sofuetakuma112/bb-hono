import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// Accounts
export const accountsTable = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

// Sessions
export const sessionsTable = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});
export const sessionsRelations = relations(sessionsTable, ({ one, many }) => ({
  user: one(usersTable, {
    // リレーション先
    fields: [sessionsTable.userId], // リレーション元
    references: [usersTable.id], // リレーション先
  }),
}));

// VerificationTokens
export const verificationTokensTable = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// Users
export const usersTable = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  imageS3Key: text("imageS3Key"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
});

export const usersRelationsToFollows = relations(usersTable, ({ many }) => ({
  posts: many(postsTable),
  notifications: many(notificationsTable),
  likes: many(likesTable),
  followees: many(followsTable),
  followers: many(followsTable),
}));

// Posts
export const postsTable = sqliteTable("posts", {
  id: text("id")
    .primaryKey()
    .default(
      sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`
    ),
  prompt: text("prompt").notNull(),
  imageS3Key: text("image_s3_key"),
  analysisScore: integer("analysis_score"),
  analysisResult: integer("analysis_result", { mode: "boolean" }),
  modelVersion: text("model_version"),
  hashTags: text("hash_tags", { mode: "json" }),
  imageName: text("image_name").notNull(),
  imageAge: text("image_age").notNull(),
  imageBirthplace: text("image_birthplace"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
});

export const postsRelations = relations(postsTable, ({ one, many }) => ({
  likes: many(likesTable),
  user: one(usersTable, {
    // リレーション先
    fields: [postsTable.userId], // リレーション元
    references: [usersTable.id], // リレーション先
  }),
}));

// Likes
export const likesTable = sqliteTable("likes", {
  id: text("id")
    .primaryKey()
    .default(
      sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`
    ),
  likeType: text("like_type").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  postId: text("post_id")
    .notNull()
    .references(() => postsTable.id, { onDelete: "cascade" }),
});

export const likesRelations = relations(likesTable, ({ one }) => ({
  post: one(postsTable, {
    fields: [likesTable.postId],
    references: [postsTable.id],
  }),
  user: one(usersTable, {
    fields: [likesTable.userId],
    references: [usersTable.id],
  }),
}));

// Follows
export const followsTable = sqliteTable("follows", {
  id: text("id")
    .primaryKey()
    .default(
      sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`
    ),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  followerId: text("follower_id")
    .notNull()
    .references(() => usersTable.id),
  followeeId: text("followee_id")
    .notNull()
    .references(() => usersTable.id),
});

export const followsRelations = relations(followsTable, ({ one }) => ({
  follower: one(usersTable, {
    fields: [followsTable.followerId],
    references: [usersTable.id],
    relationName: "followers",
  }),
  followee: one(usersTable, {
    fields: [followsTable.followeeId],
    references: [usersTable.id],
    relationName: "followees",
  }),
}));

// Notifications
export const notificationsTable = sqliteTable("notifications", {
  id: text("id")
    .primaryKey()
    .default(
      sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`
    ),
  notificationType: text("notification_type").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  notifierUserId: text("notifier_user_id")
    .notNull()
    .references(() => usersTable.id),
  postId: text("post_id").references(() => postsTable.id, {
    onDelete: "cascade",
  }),
});
