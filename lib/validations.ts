import { z } from "zod";

export const createArticleSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(102400), // 100KB
  excerpt: z.string().max(500).optional(),
  featuredImage: z.string().url().optional(),
  section: z.enum(["NEWS", "OPINIONS", "LIONS_DEN", "A_AND_E", "FEATURES", "THE_ROUNDTABLE"]),
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
  section: z.enum(["NEWS", "OPINIONS", "LIONS_DEN", "A_AND_E", "FEATURES", "THE_ROUNDTABLE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const uploadRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  contentLength: z.number().int().min(1).max(10 * 1024 * 1024), // 10MB
});

export const deleteImageSchema = z.object({
  key: z.string().min(1),
});

export const updateRoleSchema = z.object({
  role: z.enum(["READER", "WRITER", "DESIGNER", "EDITOR"]),
});

export const updateAdminSchema = z.object({
  isAdmin: z.boolean(),
});
