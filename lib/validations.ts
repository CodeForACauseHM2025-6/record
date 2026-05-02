import { z } from "zod";

export const createArticleSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(102400), // 100KB
  excerpt: z.string().max(500).optional(),
  featuredImage: z.string().url().optional(),
  section: z.enum(["NEWS", "OPINIONS", "LIONS_DEN", "A_AND_E", "FEATURES", "THE_ROUNDTABLE", "MD_ALUMNI"]),
  groupId: z.string().uuid(),
  credits: z
    .array(
      z.object({
        userId: z.string().uuid(),
        creditRole: z.string().min(1).max(50),
      })
    )
    .optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        caption: z.string().optional(),
        altText: z.string().min(1),
        order: z.number().int().min(0),
      })
    )
    .optional(),
});

export const updateArticleSchema = createArticleSchema.partial();

export const listArticlesSchema = z.object({
  section: z.enum(["NEWS", "OPINIONS", "LIONS_DEN", "A_AND_E", "FEATURES", "THE_ROUNDTABLE", "MD_ALUMNI"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const uploadRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  contentLength: z.number().int().min(1).max(10 * 1024 * 1024), // 10MB
});

// Constrains delete keys to the exact shape POST /api/upload generates: uploads/<uuid>.<ext>.
// Without this the route accepts any S3 key — a signed-in user could wipe the entire bucket.
const UPLOAD_KEY_PATTERN = /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/;

export const deleteImageSchema = z.object({
  key: z
    .string()
    .regex(UPLOAD_KEY_PATTERN, "Invalid upload key"),
});

export const updateRoleSchema = z.object({
  role: z.enum(["READER", "WRITER", "DESIGNER", "EDITOR", "WEB_TEAM", "WEB_MASTER"]),
});

export const updateAdminSchema = z.object({
  isAdmin: z.boolean(),
});
