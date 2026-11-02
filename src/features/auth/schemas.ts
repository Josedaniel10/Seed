import { z } from 'zod';

export const ACADEMIC_LINKS = [
  { value: 'docente_planta', label: 'Docente de Planta' },
  { value: 'docente_ocasional', label: 'Docente Ocasional / Catedrático' },
  { value: 'estudiante', label: 'Estudiante de Pregrado / Posgrado' },
  { value: 'monitor', label: 'Monitor de Semillero de Investigación' },
] as const;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(3, 'El nombre completo debe tener al menos 3 caracteres')
      .max(120, 'El nombre no puede exceder 120 caracteres'),
    email: z
      .string()
      .email('Ingrese un correo electrónico válido')
      .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Formato de correo inválido'),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .max(50, 'La contraseña no puede exceder 50 caracteres'),
    confirmPassword: z.string(),
    academicLink: z.enum(
      ['docente_planta', 'docente_ocasional', 'estudiante', 'monitor'],
      { message: 'Seleccione un tipo de vínculo institucional' }
    ),
    academicProgram: z
      .string()
      .min(3, 'El programa académico debe tener al menos 3 caracteres')
      .max(100, 'El programa no puede exceder 100 caracteres'),
    researchGroupId: z
      .string()
      .min(1, 'Seleccione un grupo de investigación al que pertenece o estará adscrito'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
