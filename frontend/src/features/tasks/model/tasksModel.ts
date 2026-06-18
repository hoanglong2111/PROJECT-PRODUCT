import type { LogisticsTaskTemplateRef } from '@shared/api/logistics';
import { DEPARTMENTS, MILESTONE_CODES } from '@shared/api/taskTemplates';

export const priorityColor = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
} as const;

export function milestoneLabel(code: string | null | undefined) {
  if (!code) return '-';
  return (MILESTONE_CODES as Record<string, string>)[code] ?? code;
}

export function departmentLabel(code: string | null | undefined) {
  if (!code) return '-';
  return (DEPARTMENTS as Record<string, string>)[code] ?? code;
}

export function templateSlaLabel(template: LogisticsTaskTemplateRef | null | undefined) {
  if (!template) return '-';
  if (template.sla_hours !== null && template.sla_hours !== undefined) return `${template.sla_hours}h`;
  return template.sla_text ?? '-';
}
