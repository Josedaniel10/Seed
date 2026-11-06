import { z } from 'zod';

export const step1TypeSchema = z.object({
  application_type_id: z.string().min(1, 'Debe seleccionar un tipo de solicitud del catálogo.'),
});

export const step2GeneralDataSchema = z.object({
  title: z
    .string()
    .min(5, 'El título del proyecto debe tener al menos 5 caracteres.')
    .max(300, 'El título del proyecto no puede superar los 300 caracteres.'),
  related_project: z.string().optional().nullable(),
  abstract: z
    .string()
    .min(20, 'El resumen ejecutivo o justificación debe contener al menos 20 caracteres para sustentar la solicitud.')
    .max(3000, 'El resumen ejecutivo no puede superar los 3000 caracteres.'),
  research_group_id: z.string().optional().nullable(),
  budget_requested: z
    .number()
    .min(0, 'El presupuesto solicitado no puede ser negativo.')
    .default(0),
  is_tutor_endorsed: z.boolean().default(false),
});

export type Step1TypeInput = z.infer<typeof step1TypeSchema>;
export type Step2GeneralDataInput = z.infer<typeof step2GeneralDataSchema>;
