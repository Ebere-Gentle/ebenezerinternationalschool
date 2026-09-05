
import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  User,
  Calendar,
  Award,
  Loader2,
  AlertCircle,
  School,
  MapPin,
  Clock,
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  class_id?: string | null;
  branch_id?: string | null;
};

type SchoolClass = {
  id: string;
  name: string;
  code: string;
  level: string;
  department?: string | null;
  academic_session?: string | null;
  status?: string | null;
};

type Subject = {
  id: string;
  subject_id: string;
  name: string;
  code: string;
  description?: string | null;
};

type ClassSubject = {
  class_id: string;
  subject_id: string;
  is_compulsory: boolean;
  status: string;
};

type TeacherSubject = {
  teacher_id: string;
  subject_id: string;
  class_id: string | null;
};

type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  position?: string | null;
  department?: string | null;
  photo_url?: string | null;
};

type EnrolledSubject = {
  id: string;
  name: string;
  code: string;
  teacher: string;
  teacherId: string | null;
  teacherPhoto: string | null;
  position: string | null;
  department: string | null;
  compulsory: boolean;
};

const StudentClasses: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [schoolClass, setSchoolClass] =
    useState<SchoolClass | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<
    ClassSubject[]
  >([]);
  const [teacherSubjects, setTeacherSubjects] = useState<
    TeacherSubject[]
  >([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getCurrentStudentId = async (): Promise<string> => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      throw new Error('You are not logged in.');
    }

    /*
      Most school systems have student user linkage through either
      users.user_id/auth_id OR students.id == auth user metadata.
      We first check the users table because your application
      already uses public.users for role management.
    */

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, student_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    if (userRow?.student_id) {
      return userRow.student_id;
    }

    /*
      Fallback: try a direct auth_id/user_id relation if one exists
      in the students table through the REST layer.
    */

    const { data: studentByAuth, error: authStudentError } =
      await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (!authStudentError && studentByAuth?.id) {
      return studentByAuth.id;
    }

    /*
      Final fallback using email.
    */

    if (user.email) {
      const { data: studentByEmail, error: emailError } =
        await supabase
          .from('students')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

      if (!emailError && studentByEmail?.id) {
        return studentByEmail.id;
      }
    }

    throw new Error(
      'Your student account is not linked to a student record.',
    );
  };

  useEffect(() => {
    let mounted = true;

    const loadStudentClasses = async () => {
      try {
        setLoading(true);
        setError('');

        const studentId =
          await getCurrentStudentId();

        /*
          1. Get the student's actual student record.
        */

        const { data: studentData, error: studentError } =
          await supabase
            .from('students')
            .select(
              'id, first_name, last_name, middle_name, class_id, branch_id',
            )
            .eq('id', studentId)
            .single();

        if (studentError) {
          throw studentError;
        }

        if (!studentData) {
          throw new Error(
            'Student record could not be found.',
          );
        }

        if (!mounted) return;

        setStudent(studentData as Student);

        if (!studentData.class_id) {
          throw new Error(
            'You have not been assigned to a class yet.',
          );
        }

        /*
          2. Get the student's actual class.
        */

        const { data: classData, error: classError } =
          await supabase
            .from('classes')
            .select(
              'id, name, code, level, department, academic_session, status',
            )
            .eq('id', studentData.class_id)
            .single();

        if (classError) {
          throw classError;
        }

        if (!classData) {
          throw new Error(
            'Your assigned class could not be found.',
          );
        }

        if (!mounted) return;

        setSchoolClass(classData as SchoolClass);

        /*
          3. Get curriculum subjects assigned to this class.
        */

        const { data: curriculumData, error: curriculumError } =
          await supabase
            .from('class_subjects')
            .select(
              'class_id, subject_id, is_compulsory, status',
            )
            .eq('class_id', studentData.class_id)
            .eq('status', 'active');

        if (curriculumError) {
          throw curriculumError;
        }

        const curriculum =
          (curriculumData || []) as ClassSubject[];

        setClassSubjects(curriculum);

        if (curriculum.length === 0) {
          if (!mounted) return;

          setSubjects([]);
          setTeacherSubjects([]);
          setTeachers([]);
          return;
        }

        const subjectIds = [
          ...new Set(
            curriculum
              .map((item) => item.subject_id)
              .filter(Boolean),
          ),
        ];

        /*
          4. Load the actual subjects.
        */

        const { data: subjectData, error: subjectsError } =
          await supabase
            .from('subjects')
            .select(
              'id, subject_id, name, code, description',
            )
            .in('id', subjectIds)
            .order('name', {
              ascending: true,
            });

        if (subjectsError) {
          throw subjectsError;
        }

        const loadedSubjects =
          (subjectData || []) as Subject[];

        setSubjects(loadedSubjects);

        /*
          5. Load teachers assigned to the student's class
             for those subjects.
        */

        const { data: teacherAssignmentData, error: teacherAssignmentError } =
          await supabase
            .from('teacher_subjects')
            .select(
              'teacher_id, subject_id, class_id',
            )
            .eq('class_id', studentData.class_id)
            .in('subject_id', subjectIds);

        if (teacherAssignmentError) {
          throw teacherAssignmentError;
        }

        const assignments =
          (teacherAssignmentData || []) as TeacherSubject[];

        setTeacherSubjects(assignments);

        /*
          6. Get the teachers.
        */

        const teacherIds = [
          ...new Set(
            assignments
              .map((item) => item.teacher_id)
              .filter(Boolean),
          ),
        ];

        if (teacherIds.length > 0) {
          const { data: teacherData, error: teachersError } =
            await supabase
              .from('teachers')
              .select(
                'id, first_name, last_name, middle_name, position, department, photo_url',
              )
              .in('id', teacherIds);

          if (teachersError) {
            throw teachersError;
          }

          setTeachers(
            (teacherData || []) as Teacher[],
          );
        } else {
          setTeachers([]);
        }
      } catch (loadError) {
        if (!mounted) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load your subjects and teachers.',
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadStudentClasses();

    return () => {
      mounted = false;
    };
  }, []);

  /*
    Build the final subject list by combining:

    class_subjects
      -> subjects
      -> teacher_subjects
      -> teachers
  */

  const enrolledSubjects = useMemo<EnrolledSubject[]>(() => {
    return classSubjects
      .map((classSubject) => {
        const subject = subjects.find(
          (item) =>
            item.id === classSubject.subject_id,
        );

        if (!subject) {
          return null;
        }

        /*
          Match teacher specifically by:
          class_id + subject_id

          This prevents a teacher assigned to the same subject
          in another class from appearing here.
        */

        const teacherAssignment =
          teacherSubjects.find(
            (assignment) =>
              assignment.class_id ===
                classSubject.class_id &&
              assignment.subject_id ===
                classSubject.subject_id,
          );

        const teacher = teacherAssignment
          ? teachers.find(
              (item) =>
                item.id ===
                teacherAssignment.teacher_id,
            )
          : null;

        return {
          id: subject.id,
          name: subject.name,
          code: subject.code,
          teacher: teacher
            ? [
                teacher.first_name,
                teacher.middle_name,
                teacher.last_name,
              ]
                .filter(Boolean)
                .join(' ')
            : 'Teacher not assigned',
          teacherId: teacher?.id || null,
          teacherPhoto: teacher?.photo_url || null,
          position: teacher?.position || null,
          department: teacher?.department || null,
          compulsory:
            classSubject.is_compulsory,
        };
      })
      .filter(
        (
          item,
        ): item is EnrolledSubject =>
          item !== null,
      );
  }, [
    classSubjects,
    subjects,
    teacherSubjects,
    teachers,
  ]);

  const compulsoryCount = useMemo(
    () =>
      enrolledSubjects.filter(
        (subject) => subject.compulsory,
      ).length,
    [enrolledSubjects],
  );

  const optionalCount = useMemo(
    () =>
      enrolledSubjects.filter(
        (subject) => !subject.compulsory,
      ).length,
    [enrolledSubjects],
  );

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin" />

          <p className="text-sm">
            Loading your class subjects and teachers...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />

            <div>
              <h2 className="font-bold text-red-900">
                Unable to load your classes
              </h2>

              <p className="text-sm text-red-700 mt-2">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN
  ========================================================= */

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* HERO */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-100 text-sm mb-2">
              <School className="w-4 h-4" />

              <span>
                My Academic Class
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold">
              My Enrolled Subjects & Classes
            </h1>

            <p className="text-blue-100 text-sm mt-2">
              {schoolClass?.name || 'Class not assigned'}
              {schoolClass?.department
                ? ` • ${schoolClass.department}`
                : ''}
            </p>

            {student && (
              <p className="text-blue-100/90 text-xs mt-1">
                {student.first_name}{' '}
                {student.middle_name
                  ? `${student.middle_name} `
                  : ''}
                {student.last_name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[240px]">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-blue-100 text-xs">
                Subjects
              </div>

              <div className="text-2xl font-bold mt-1">
                {enrolledSubjects.length}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-blue-100 text-xs">
                Teachers
              </div>

              <div className="text-2xl font-bold mt-1">
                {
                  new Set(
                    enrolledSubjects
                      .map(
                        (subject) =>
                          subject.teacherId,
                      )
                      .filter(Boolean),
                  ).size
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CLASS INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-2xl">
              <School className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs text-gray-500">
                My Class
              </p>

              <p className="font-bold text-gray-900 dark:text-white">
                {schoolClass?.name || '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 rounded-2xl">
              <Calendar className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Academic Session
              </p>

              <p className="font-bold text-gray-900 dark:text-white">
                {schoolClass?.academic_session ||
                  'Current Session'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-2xl">
              <Award className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Curriculum
              </p>

              <p className="font-bold text-gray-900 dark:text-white">
                {compulsoryCount} Compulsory
                {optionalCount > 0
                  ? ` • ${optionalCount} Optional`
                  : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SUBJECT CARDS */}
      {enrolledSubjects.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-10 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-gray-400" />

          <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
            No subjects assigned yet
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            Your school has not assigned subjects to your class
            yet.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                My Subjects
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                These subjects come directly from your class
                curriculum.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <BookOpen className="w-4 h-4" />

              {enrolledSubjects.length} subjects
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledSubjects.map((subject) => (
              <div
                key={subject.id}
                className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition"
              >
                {/* SUBJECT TITLE */}
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-2xl shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base text-gray-900 dark:text-white">
                          {subject.name}
                        </h3>

                        <p className="text-xs text-gray-500 mt-0.5">
                          {subject.code}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold ${
                          subject.compulsory
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {subject.compulsory
                          ? 'Compulsory'
                          : 'Optional'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TEACHER */}
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    {subject.teacherPhoto ? (
                      <img
                        src={subject.teacherPhoto}
                        alt={subject.teacher}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                        Teacher
                      </p>

                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {subject.teacher}
                      </p>

                      {subject.position && (
                        <p className="text-xs text-gray-500 truncate">
                          {subject.position}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* DETAILS */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <School className="w-3.5 h-3.5" />

                      <span className="text-[10px]">
                        Class
                      </span>
                    </div>

                    <p className="font-semibold text-xs text-gray-800 dark:text-gray-200">
                      {schoolClass?.name || '—'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <BookOpen className="w-3.5 h-3.5" />

                      <span className="text-[10px]">
                        Code
                      </span>
                    </div>

                    <p className="font-semibold text-xs text-gray-800 dark:text-gray-200">
                      {subject.code}
                    </p>
                  </div>
                </div>

                {/* DEPARTMENT */}
                {subject.department && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />

                    <span>
                      {subject.department}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* FOOTER INFORMATION */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5" />

          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">
              Subject information is live
            </p>

            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Your subjects are loaded from your assigned class
              curriculum. Teachers are matched specifically to
              the same class and subject, so teachers from other
              classes will not appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentClasses;
