import { supabase } from '../../config/supabase/client';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type JambSubject = {
  id: string;
  name: string;
  code: string | null;
  is_compulsory: boolean;
  is_active: boolean;
  sort_order: number;
};

export type JambQuestion = {
  id: string;
  subject_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  difficulty: string;
  topic: string | null;
  year: number | null;
  source: string | null;
};

export type JambRegistrationSubject = {
  subject_id: string;
  is_compulsory: boolean;
  subject: JambSubject;
};

export type JambRegistration = {
  id: string;
  student_id: string;
  created_at: string;
  jamb_registration_subjects: JambRegistrationSubject[];
};

export type JambAttempt = {
  id: string;
  registration_id: string;
  subject_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  correct_count: number | null;
  question_count: number | null;
  duration_seconds: number | null;
  question_ids?: string[] | null;
  subject?: { id: string; name: string; code: string | null };
};

const COOLDOWN_HOURS = 48;

/* ------------------------------------------------------------------ */
/* Core methods                                                        */
/* ------------------------------------------------------------------ */

async function getStudent() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error('Not authenticated.');

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

async function getSubjects(): Promise<JambSubject[]> {
  const { data, error } = await supabase
    .from('jamb_subjects')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return (data || []) as JambSubject[];
}

async function getRegistration(studentId: string): Promise<JambRegistration | null> {
  const { data, error } = await supabase
    .from('jamb_registrations')
    .select(
      'id,student_id,created_at,jamb_registration_subjects(subject_id,is_compulsory,subject:jamb_subjects(id,name,code,is_compulsory,is_active,sort_order))',
    )
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as JambRegistration | null;
}

async function register(studentId: string, subjectIds: string[]) {
  const { data: reg, error: regError } = await supabase
    .from('jamb_registrations')
    .insert({ student_id: studentId })
    .select()
    .single();

  if (regError) throw regError;

  const rows = subjectIds.map((id) => ({
    registration_id: reg.id,
    subject_id: id,
  }));

  const { error: subjError } = await supabase
    .from('jamb_registration_subjects')
    .insert(rows);

  if (subjError) throw subjError;

  const full = await getRegistration(studentId);
  return full!;
}

async function getAttempts(registrationId: string): Promise<JambAttempt[]> {
  const { data, error } = await supabase
    .from('jamb_attempts')
    .select(
      'id,registration_id,subject_id,started_at,submitted_at,score,correct_count,question_count,duration_seconds,question_ids,subject:jamb_subjects(id,name,code)',
    )
    .eq('registration_id', registrationId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data || []) as JambAttempt[];
}

/* ------------------------------------------------------------------ */
/* Cooldown + question pool                                            */
/* ------------------------------------------------------------------ */

async function getCooldownInfo(registrationId: string, subjectId: string) {
  const { data, error } = await supabase
    .from('jamb_attempts')
    .select('id,submitted_at,started_at,question_ids')
    .eq('registration_id', registrationId)
    .eq('subject_id', subjectId)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  const last: any = data?.[0];
  if (!last?.submitted_at) {
    return {
      canStart: true,
      nextAvailableAt: null as Date | null,
      lastAttemptAt: null as Date | null,
      previousQuestionIds: [] as string[],
    };
  }

  const lastAt = new Date(last.submitted_at);
  const next = new Date(lastAt.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
  const now = new Date();

  return {
    canStart: now >= next,
    nextAvailableAt: next,
    lastAttemptAt: lastAt,
    previousQuestionIds: (last.question_ids || []) as string[],
  };
}

async function getUsedQuestionIds(
  registrationId: string,
  subjectId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('jamb_attempts')
    .select('question_ids')
    .eq('registration_id', registrationId)
    .eq('subject_id', subjectId);

  if (error) throw error;

  const set = new Set<string>();
  (data || []).forEach((row: any) => {
    (row.question_ids || []).forEach((id: string) => set.add(id));
  });
  return Array.from(set);
}

async function getUnseenQuestions(
  subjectId: string,
  excludeIds: string[],
  limit: number,
): Promise<JambQuestion[]> {
  let query = supabase
    .from('jamb_questions')
    .select(
      'id,subject_id,question_text,option_a,option_b,option_c,option_d,difficulty,topic,year,source',
    )
    .eq('subject_id', subjectId)
    .eq('is_active', true);

  if (excludeIds.length) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await query.limit(limit);
  if (error) throw error;

  const arr = [...(data || [])];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr as JambQuestion[];
}

async function getTotalActiveQuestions(subjectId: string): Promise<number> {
  const { count, error } = await supabase
    .from('jamb_questions')
    .select('*', { count: 'exact', head: true })
    .eq('subject_id', subjectId)
    .eq('is_active', true);

  if (error) throw error;
  return count || 0;
}

async function resetQuestionPool(registrationId: string, subjectId: string) {
  const { error } = await supabase
    .from('jamb_attempts')
    .update({ question_ids: [] })
    .eq('registration_id', registrationId)
    .eq('subject_id', subjectId);

  if (error) throw error;
}

async function startAttempt(
  registrationId: string,
  subjectId: string,
  questionIds: string[] = [],
) {
  const { data, error } = await supabase
    .from('jamb_attempts')
    .insert({
      registration_id: registrationId,
      subject_id: subjectId,
      started_at: new Date().toISOString(),
      question_ids: questionIds,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function setAttemptQuestionCount(attemptId: string, count: number) {
  const { error } = await supabase
    .from('jamb_attempts')
    .update({ question_count: count })
    .eq('id', attemptId);
  if (error) throw error;
}

async function submitAttempt(
  attemptId: string,
  answers: Record<string, string>,
  durationSeconds: number,
) {
  const { data, error } = await supabase.rpc('submit_jamb_attempt', {
    p_attempt_id: attemptId,
    p_answers: answers,
    p_duration: durationSeconds,
  });

  if (error) throw error;
  return data;
}

async function getQuestions(subjectId: string, limit: number) {
  return getUnseenQuestions(subjectId, [], limit);
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export const jambCbtService = {
  getStudent,
  getSubjects,
  getRegistration,
  register,
  getAttempts,
  getCooldownInfo,
  getUsedQuestionIds,
  getUnseenQuestions,
  getTotalActiveQuestions,
  resetQuestionPool,
  startAttempt,
  setAttemptQuestionCount,
  submitAttempt,
  getQuestions,
};

export default jambCbtService;
