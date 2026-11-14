import { z } from 'zod';

export const uploadedDraftFileSchema = z.object({
  requirement_id: z.string(), file_name: z.string(), file_path: z.string(),
  file_size_bytes: z.number().nonnegative(), file_hash_sha256: z.string(), mime_type: z.string(),
});
export const requestDraftSchema = z.object({
  currentStep: z.number().int().min(1).max(4), selectedTypeId: z.string(), submissionId: z.string().uuid(),
  formData: z.object({ title: z.string(), related_project: z.string(), abstract: z.string(),
    research_group_id: z.string(), budget_requested: z.number(), is_tutor_endorsed: z.boolean() }),
  uploadedFiles: z.record(z.string(), uploadedDraftFileSchema),
});
export type RequestDraft = z.infer<typeof requestDraftSchema>;

export const technicalReviewDraftSchema = z.object({
  obsCategory: z.enum(['SUGERENCIA', 'ACLARACION', 'AJUSTE_OBLIGATORIO']), obsContent: z.string(),
  concept: z.enum(['FAVORABLE', 'FAVORABLE_CON_AJUSTES', 'NO_FAVORABLE', 'FAVORABLE_WITH_ADJUSTMENTS', 'UNFAVORABLE']),
  conceptJustification: z.string(),
});
export type TechnicalReviewDraft = z.infer<typeof technicalReviewDraftSchema>;
