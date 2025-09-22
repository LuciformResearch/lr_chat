import { pgTable, text, timestamp, uuid, pgEnum, jsonb, foreignKey, boolean, integer, varchar, unique, customType } from 'drizzle-orm/pg-core';

// --- Enums ---
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);
export const traceTypeEnum = pgEnum('trace_type', ['orchestration', 'tool_call', 'llm_call']);

// --- Tables ---

// Table des organisations
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  adminAuthuserId: uuid('admin_authuser_id'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

// Table des utilisateurs authentifiés (AuthUsers)
export const authusers = pgTable('authusers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).default('member'),
  isActive: boolean('is_active').default(true),
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  lastLogin: timestamp('last_login', { withTimezone: false }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const user_identities = pgTable('user_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  authuserId: uuid('authuser_id').notNull().references(() => authusers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  persona: varchar('persona', { length: 50 }).default('algareth'),
  personaType: varchar('persona_type').default('identity'),
  displayName: varchar('display_name'),
  avatarUrl: varchar('avatar_url'),
  chatPersonaConfig: jsonb('chat_persona_config').default('{}'),
  isDefaultIdentity: boolean('is_default_identity').default(false),
  preferences: jsonb('preferences').default('{}'),
  theme: varchar('theme', { length: 20 }).default('auto'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
}, (table) => ({
  // Contrainte unique sur (authuser_id, persona) comme dans la base
  authuserPersonaUnique: unique().on(table.authuserId, table.persona),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  userIdentityId: uuid('user_identity_id').references(() => user_identities.id),
  title: text('title'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  // Colonne vectorielle pgvector (768 dimensions)
  embedding: customType<{ data: number[] | string; config: { dimensions?: number } }>({
    dataType(config) {
      const dims = config?.dimensions ?? 768;
      return `vector(${dims})`;
    },
    toDriver(value) {
      if (Array.isArray(value)) return `[${value.join(',')}]`;
      return value as string;
    },
  })('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const traces = pgTable('traces', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  parentTraceId: uuid('parent_trace_id').references((): any => traces.id, { onDelete: 'cascade' }), // Self-referencing
  actor: text('actor').notNull(),
  type: traceTypeEnum('type').notNull(),
  content: jsonb('content').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

export const generated_images = pgTable('generated_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  prompt: text('prompt').notNull(),
  enhancedPrompt: text('enhanced_prompt'),
  imageData: text('image_data'), // Données binaires (utiliser text pour compatibilité Drizzle)
  imageUrl: text('image_url'),
  mimeType: text('mime_type').default('image/png'),
  sizeBytes: integer('size_bytes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const api_keys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(),
  apiKey: text('api_key').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Contrainte unique sur (user_id, provider, is_active) comme dans la base
  userProviderActiveUnique: unique().on(table.userId, table.provider, table.isActive),
}));

// Table des mémoires archiviste
export const archivist_memories = pgTable('archivist_memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  summary: text('summary').notNull(),
  // Colonne vectorielle pgvector (768 dimensions)
  embedding: customType<{ data: number[] | string; config: { dimensions?: number } }>({
    dataType(config) {
      const dims = config?.dimensions ?? 768;
      return `vector(${dims})`;
    },
    toDriver(value) {
      if (Array.isArray(value)) return `[${value.join(',')}]`;
      return value as string;
    },
  })('embedding'),
  keyTopics: text('key_topics').array(), // Tableau de text comme dans la base
  emotionalTone: varchar('emotional_tone', { length: 100 }),
  importantFacts: text('important_facts').array(), // Tableau de text comme dans la base
  userMood: varchar('user_mood', { length: 200 }),
  algarethPerformance: varchar('algareth_performance', { length: 200 }),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});
