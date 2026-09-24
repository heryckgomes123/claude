import { z } from "zod";

export const ROLES = ["creator", "influencer", "tiktoker", "streamer", "youtuber", "freelancer", "entrepreneur", "professional", "other"] as const;
export const FOCUS = ["life", "work", "content", "clients", "projects", "all"] as const;
export const CREATOR_ROLES = new Set(["creator", "influencer", "tiktoker", "streamer", "youtuber"]);

export const settingsSchema = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  role: z.enum(ROLES).optional(),
  focus: z.array(z.enum(FOCUS)).max(6).optional(),
  creatorMode: z.boolean().optional(),
  platforms: z.array(z.string().max(20)).max(10).optional(),
  niche: z.string().trim().max(80).optional(),
  postsPerWeek: z.number().int().min(0).max(50).optional(),
  peakTime: z.enum(["morning", "afternoon", "night", "late"]).optional(),
  dayStart: z.number().int().min(0).max(23).optional(),
  dayEnd: z.number().int().min(1).max(24).optional(),
  mainFocus: z.string().trim().max(200).optional(),
  timezone: z.string().max(60).optional(),
});

export const calibrationSchema = settingsSchema.extend({
  displayName: z.string().trim().min(1).max(40),
  role: z.enum(ROLES),
  focus: z.array(z.enum(FOCUS)).min(1).max(6),
  habits: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
});
