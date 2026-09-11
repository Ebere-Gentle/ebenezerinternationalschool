import { supabase } from '../../config/supabase/client';

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
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  topic: string | null;
  year: number | null;
  difficulty: string;
  source: string | null;
};

export type JambRegistration = {
  id: string;
  student_id: string;
  session_name: string;
  status: string;
  registered_at: string;
  locked_at: string | null;
  jamb_registration_subjects?: Array<{ subject_id: string; is_compulsory: boolean; subject: JambSubject }>;
};

export type JambAttempt = {
  id: string;
  registration_id: string;
  subject_id: string;
  question_count: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  score: number;
  duration_seconds: number;
  started_at: string;
  submitted_at: string | null;
  status: string;
  subject?: JambSubject;
};

const currentSession = async () => {
  const { data, error } = await supabase
    .from('academic_sessions')
    .select('id, session_name, term_name')
    .eq('is_current', true)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const jambCbtService = {
  async getSubjects() {
    const { data, error } = await supabase
      .from('jamb_subjects')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return (data || []) as JambSubject[];
  },

  async getStudent() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('You are not signed in.');

    const { data, error } = await supabase
      .from('students')
      .select('id, student_id, first_name, last_name, class_id, branch_id, parent_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Student profile not found. Please contact administration.');
    return data;
  },

  async getRegistration(studentId: string, sessionName?: string) {
    let query = supabase
      .from('jamb_registrations')
      .select(`
        id, student_id, session_name, status, registered_at, locked_at,
        jamb_registration_subjects(
          subject_id,
          is_compulsory,
          subject:jamb_subjects(id,name,code,is_compulsory,is_active,sort_order)
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessionName) query = query.eq('session_name', sessionName);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data as JambRegistration | null;
  },

  async register(studentId: string, subjectIds: string[]) {
    if (subjectIds.length !== 4) throw new Error('Exactly four subjects are required.');

    const subjects = await this.getSubjects();
    const selected = subjects.filter(s => subjectIds.includes(s.id));
    const english = selected.find(s => s.name.toLowerCase() === 'english language');
    const maths = selected.find(s => s.name.toLowerCase() === 'mathematics');
    if (!english || !maths) throw new Error('English Language and Mathematics are compulsory.');

    const optionalCount = selected.filter(s => !s.is_compulsory).length;
    if (optionalCount !== 2) throw new Error('Select exactly two additional subjects.');

    const session = await currentSession();
    if (!session?.session_name) throw new Error('No current academic session is configured.');

    const { data: existing } = await supabase
      .from('jamb_registrations')
      .select('id,status')
      .eq('student_id', studentId)
      .eq('session_name', session.session_name)
      .maybeSingle();

    if (existing?.id && existing.status === 'active') {
      throw new Error('You already have a JAMB registration for this academic session.');
    }

    const { data: registration, error: registrationError } = await supabase
      .from('jamb_registrations')
      .insert({
        student_id: studentId,
        academic_session_id: session.id,
        session_name: session.session_name,
        status: 'active',
        locked_at: new Date().toISOString(),
      })
      .select('id,student_id,session_name,status,registered_at,locked_at')
      .single();

    if (registrationError) throw registrationError;

    const { error: subjectError } = await supabase
      .from('jamb_registration_subjects')
      .insert(selected.map(subject => ({
        registration_id: registration.id,
        subject_id: subject.id,
        is_compulsory: subject.is_compulsory,
      })));

    if (subjectError) {
      await supabase.from('jamb_registrations').delete().eq('id', registration.id);
      throw subjectError;
    }

    return this.getRegistration(studentId, session.session_name);
  },

  async startAttempt(registrationId: string, subjectId: string) {
    const { data: registration, error: registrationError } = await supabase
      .from('jamb_registrations')
      .select('id,status')
      .eq('id', registrationId)
      .maybeSingle();
    if (registrationError) throw registrationError;
    if (!registration || registration.status !== 'active') throw new Error('JAMB registration is not active.');

    const { data: attempt, error } = await supabase
      .from('jamb_attempts')
      .insert({ registration_id: registrationId, subject_id: subjectId })
      .select('*')
      .single();
    if (error) throw error;
    return attempt as JambAttempt;
  },

  async getQuestions(subjectId: string, limit = 40, year?: number | null) {
    const { data, error } = await supabase.rpc('get_jamb_questions', {
      p_subject_id: subjectId,
      p_year: year ?? null,
      p_limit: limit,
    });
    if (error) throw error;
    return (data || []) as JambQuestion[];
  },

  async submitAttempt(attemptId: string, answers: Record<string, string>, durationSeconds: number) {
    const payload = Object.entries(answers).map(([question_id, selected_option]) => ({
      question_id,
      selected_option,
    }));

    const { data, error } = await supabase.rpc('submit_jamb_attempt', {
      p_attempt_id: attemptId,
      p_answers: payload,
      p_duration_seconds: durationSeconds,
    });
    if (error) throw error;
    return data as {
      attempt_id: string;
      score: number;
      correct: number;
      wrong: number;
      unanswered: number;
      question_count: number;
    };
  },

  async getAttempts(registrationId: string) {
    const { data, error } = await supabase
      .from('jamb_attempts')
      .select('*, subject:jamb_subjects(id,name,code,is_compulsory,is_active,sort_order)')
      .eq('registration_id', registrationId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return (data || []) as JambAttempt[];
  },

  async getParentAttempts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('Not signed in.');

    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (parentError) throw parentError;
    if (!parent) return [];

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id,student_id,first_name,last_name,class_id')
      .eq('parent_id', parent.id)
      .eq('current_status', 'active');
    if (studentsError) throw studentsError;
    if (!students?.length) return [];

    const ids = students.map(s => s.id);
    const { data: registrations, error: registrationError } = await supabase
      .from('jamb_registrations')
      .select('id,student_id,session_name,status')
      .in('student_id', ids)
      .order('created_at', { ascending: false });
    if (registrationError) throw registrationError;
    if (!registrations?.length) return [];

    const registrationIds = registrations.map(r => r.id);
    const { data: attempts, error: attemptsError } = await supabase
      .from('jamb_attempts')
      .select('*, subject:jamb_subjects(id,name,code)')
      .in('registration_id', registrationIds)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });
    if (attemptsError) throw attemptsError;

    return (attempts || []).map(a => ({
      ...a,
      student: students.find(s => s.id === registrations.find(r => r.id === a.registration_id)?.student_id),
    }));
  },
};

export default jambCbtService;
