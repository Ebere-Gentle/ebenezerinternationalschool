export type AssessmentGroup =
  | 'nursery'
  | 'kg_silver'
  | 'kg_gold'
  | 'transition_grader'
  | 'primary'
  | 'jss'
  | 'ss'
  | 'custom';

export type ClassContext = {
  id: string;
  name: string;
  level?: string | null;
  department?: string | null;
};

const normalise = (value: string | null | undefined) =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export function resolveAssessmentGroup(input: ClassContext): AssessmentGroup {
  const name = normalise(input.name);
  const level = normalise(input.level);
  const department = normalise(input.department);

  if (name.includes('kg silver')) return 'kg_silver';
  if (name.includes('kg gold')) return 'kg_gold';
  if (name.includes('transition') || name.includes('grader')) return 'transition_grader';
  if (name === 'graduate' || name.includes('graduate')) return 'ss';

  // Match explicit JSS/SS names before looking at the legacy level value.
  // Some older class records incorrectly store JSS as level="primary".
  if (/^jss\s*[1-3]/i.test(name) || name.startsWith('jss')) return 'jss';
  if (/^ss\s*[1-3]/i.test(name) || name.startsWith('ss ')) return 'ss';
  if (level === 'junior') return 'jss';
  if (level === 'senior') return 'ss';

  if (/^grade\s*[1-9]/i.test(name) || level === 'primary') return 'primary';
  if (name.includes('nursery') || level === 'nursery' || department === 'nursery') return 'nursery';
  return 'custom';
}

export const ASSESSMENT_GROUPS: Array<{
  key: Exclude<AssessmentGroup, 'custom'>;
  label: string;
  description: string;
}> = [
  { key: 'nursery', label: 'Nursery', description: 'Nursery 1 and Nursery 2' },
  { key: 'kg_silver', label: 'KG Silver', description: 'KG Silver assessment structure' },
  { key: 'kg_gold', label: 'KG Gold', description: 'KG Gold assessment structure' },
  { key: 'transition_grader', label: 'Transition / Grader', description: 'Transition and early-grade assessment structure' },
  { key: 'primary', label: 'Primary', description: 'Grade 1 to Grade 5' },
  { key: 'jss', label: 'JSS', description: 'JSS 1 to JSS 3' },
  { key: 'ss', label: 'SS', description: 'SS 1 to SS 3 and senior classes' },
];
