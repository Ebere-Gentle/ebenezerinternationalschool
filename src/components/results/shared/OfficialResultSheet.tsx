import React from 'react';
import { CalendarDays, GraduationCap, MapPin, Phone, School, UserRound } from 'lucide-react';

type Assessment = {
  subject: string;
  test1?: number | null;
  test2?: number | null;
  ca?: number | null;
  exam?: number | null;
  total?: number | null;
  percentage?: number | null;
  grade?: string | null;
  remark?: string | null;
  term1Percentage?: number | null;
  term2Percentage?: number | null;
  term3Percentage?: number | null;
  cumulativePercentage?: number | null;
};
type Student = { first_name?: string | null; last_name?: string | null; middle_name?: string | null; admission_number?: string | null; gender?: string | null; date_of_birth?: string | null; passport_url?: string | null };
type School = { school_name?: string | null; branch_id?: string | null; address?: string | null; phone_number?: string | null; email?: string | null; logo_url?: string | null; stamp_url?: string | null };
type Attendance = { present?: number; absent?: number; total?: number; percentage?: number; excused?: number };
type Props = {
  school: School;
  student: Student;
  className?: string | null;
  session: string;
  term: string;
  assessments: Assessment[];
  test1Max: number;
  test2Max: number;
  caMax?: number;
  examMax: number;
  totalMax?: number;
  position?: number | null;
  classSize?: number | null;
  average?: number | null;
  overallGrade?: string | null;
  overallRemark?: string | null;
  attendance?: Attendance;
  psychomotor?: Record<string, string>;
  affective?: Record<string, string>;
  teacherComment?: string | null;
  principalComment?: string | null;
  directorComment?: string | null;
  nextTermBegins?: string | null;
};

const score = (value: number | null | undefined) => value == null ? '—' : Number(value).toFixed(0);
const percent = (value: number | null | undefined) => value == null ? '—' : `${Number(value).toFixed(1)}%`;
const isThirdTerm = (term: string) => /third|3rd/i.test(term);

export default function OfficialResultSheet({
  school,
  student,
  className,
  session,
  term,
  assessments,
  test1Max,
  test2Max,
  caMax = 20,
  examMax,
  totalMax = 100,
  position,
  classSize,
  average,
  overallGrade,
  overallRemark,
  attendance,
  psychomotor = {},
  affective = {},
  teacherComment,
  principalComment,
  directorComment,
  nextTermBegins,
}: Props) {
  const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');
  const cumulative = isThirdTerm(term);
  const psychomotorItems = Object.entries(psychomotor).length ? Object.entries(psychomotor) : [['Handwriting', ''], ['Sports', ''], ['Practical Skills', ''], ['Creativity', '']];
  const affectiveItems = Object.entries(affective).length ? Object.entries(affective) : [['Punctuality', ''], ['Neatness', ''], ['Cooperation', ''], ['Responsibility', ''], ['Attitude to Learning', '']];

  return <div className="overflow-hidden border border-slate-200 bg-white shadow-xl print:rounded-none print:border-0 print:shadow-none">
    <div className="border-b-4 border-emerald-600 bg-white px-6 py-6 sm:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {school.logo_url ? <img src={school.logo_url} alt="School logo" className="h-20 w-20 object-contain" /> : <div className="flex h-20 w-20 items-center justify-center bg-emerald-600 text-white"><School className="h-10 w-10" /></div>}
          <div>
            <h1 className="text-xl uppercase tracking-wide text-slate-900 sm:text-2xl">{school.school_name || 'School'}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{school.address || 'School address'}</span>{school.phone_number && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{school.phone_number}</span>}</div>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-emerald-700">Student Academic Report Sheet</p>
          </div>
        </div>
        <div className="border border-slate-300 px-4 py-3 text-sm"><p>Session: {session}</p><p>Term: {term}</p></div>
      </div>
    </div>

    <div className="grid gap-4 border-b bg-slate-50 p-5 sm:grid-cols-[1fr_auto]">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Student" value={fullName || '—'} icon={<UserRound className="h-4 w-4" />} />
        <Info label="Admission No." value={student.admission_number || '—'} icon={<GraduationCap className="h-4 w-4" />} />
        <Info label="Class" value={className || '—'} icon={<School className="h-4 w-4" />} />
        <Info label="Gender" value={student.gender || '—'} icon={<UserRound className="h-4 w-4" />} />
      </div>
      {student.passport_url ? <img src={student.passport_url} alt={fullName} className="h-24 w-20 border object-cover" /> : <div className="flex h-24 w-20 items-center justify-center border bg-white text-slate-300"><UserRound className="h-8 w-8" /></div>}
    </div>

    <div className="p-5 sm:p-7">
      <div className="mb-4 flex items-end justify-between">
        <div><h2 className="text-lg text-slate-900">Scholastic Record</h2><p className="text-xs text-slate-500">CA is an independent teacher-assessed component and is not calculated from Test 1 or Test 2.</p></div>
        <div className="hidden text-right text-xs text-slate-500 sm:block">Maximum: {test1Max} + {test2Max} + {caMax} + {examMax} = {totalMax}</div>
      </div>
      <div className="overflow-x-auto border border-slate-300">
        <table className="w-full min-w-[950px] text-sm">
          <thead><tr className="bg-slate-100 text-slate-900"><th className="border-r border-slate-300 px-3 py-3 text-left">S/N</th><th className="border-r border-slate-300 px-3 py-3 text-left">Subject</th><th className="border-r border-slate-300 px-3 py-3">Test 1 / {test1Max}</th><th className="border-r border-slate-300 px-3 py-3">Test 2 / {test2Max}</th><th className="border-r border-slate-300 px-3 py-3">CA / {caMax}</th><th className="border-r border-slate-300 px-3 py-3">Exam / {examMax}</th><th className="border-r border-slate-300 px-3 py-3">Total / {totalMax}</th><th className="border-r border-slate-300 px-3 py-3">%</th><th className="border-r border-slate-300 px-3 py-3">Position</th><th className="border-r border-slate-300 px-3 py-3">Grade</th><th className="px-3 py-3">Remark</th></tr></thead>
          <tbody>{assessments.map((item, index) => { const calculatedTotal = item.total ?? ((item.test1 || 0) + (item.test2 || 0) + (item.ca || 0) + (item.exam || 0)); const percentage = item.percentage ?? (totalMax ? calculatedTotal / totalMax * 100 : 0); return <tr key={`${item.subject}-${index}`} className="border-t border-slate-300"><td className="border-r border-slate-300 px-3 py-3">{index + 1}</td><td className="border-r border-slate-300 px-3 py-3">{item.subject}</td><td className="border-r border-slate-300 px-3 py-3 text-center">{score(item.test1)}</td><td className="border-r border-slate-300 px-3 py-3 text-center">{score(item.test2)}</td><td className="border-r border-slate-300 px-3 py-3 text-center">{score(item.ca)}</td><td className="border-r border-slate-300 px-3 py-3 text-center">{score(item.exam)}</td><td className="border-r border-slate-300 px-3 py-3 text-center">{score(calculatedTotal)}</td><td className="border-r border-slate-300 px-3 py-3 text-center">{percentage.toFixed(1)}</td><td className="border-r border-slate-300 px-3 py-3 text-center">{(item as any).position || '—'}</td><td className="border-r border-slate-300 px-3 py-3 text-center">{item.grade || '—'}</td><td className="px-3 py-3">{item.remark || '—'}</td></tr>; })}</tbody>
        </table>
      </div>

      {cumulative && <section className="mt-6 border border-slate-300">
        <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 text-sm">Term Performance and Cumulative Record</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="bg-slate-50"><th className="border-r border-slate-300 px-3 py-2 text-left">Subject</th><th className="border-r border-slate-300 px-3 py-2">1st Term</th><th className="border-r border-slate-300 px-3 py-2">2nd Term</th><th className="border-r border-slate-300 px-3 py-2">3rd Term</th><th className="px-3 py-2">Cumulative</th></tr></thead><tbody>{assessments.map((item, index) => <tr key={`cum-${item.subject}-${index}`} className="border-t border-slate-300"><td className="border-r border-slate-300 px-3 py-2">{item.subject}</td><td className="border-r border-slate-300 px-3 py-2 text-center">{percent(item.term1Percentage)}</td><td className="border-r border-slate-300 px-3 py-2 text-center">{percent(item.term2Percentage)}</td><td className="border-r border-slate-300 px-3 py-2 text-center">{percent(item.term3Percentage ?? item.percentage)}</td><td className="px-3 py-2 text-center">{percent(item.cumulativePercentage)}</td></tr>)}</tbody></table></div>
      </section>}

      <div className="mt-6 grid gap-4 md:grid-cols-4"><Metric label="Score Obtained / Maximum" value={`${assessments.reduce((n, x) => n + Number(x.total ?? ((x.test1 || 0) + (x.test2 || 0) + (x.ca || 0) + (x.exam || 0))), 0).toFixed(0)} / ${(assessments.length * totalMax).toFixed(0)}`} /><Metric label="Overall Average" value={average == null ? '—' : `${average.toFixed(1)}%`} /><Metric label="Overall Grade" value={overallGrade || '—'} /><Metric label="Class Position" value={position ? `${position}${classSize ? ` / ${classSize}` : ''}` : '—'} /></div>
      <div className="mt-3 border border-slate-300 bg-slate-50 p-3 text-sm">Overall remark: {overallRemark || '—'}</div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2"><AssessmentPanel title="Affective / Behavioural Development" items={affectiveItems} /><AssessmentPanel title="Psychomotor / Skills Development" items={psychomotorItems} /></div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="border border-slate-300 bg-slate-50 p-4"><h3>Attendance</h3><div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4"><Metric label="School Days" value={attendance?.total ?? '—'} /><Metric label="Present" value={attendance?.present ?? '—'} /><Metric label="Absent" value={attendance?.absent ?? '—'} /><Metric label="Attendance %" value={attendance?.percentage == null ? '—' : `${Number(attendance.percentage).toFixed(1)}%`} /></div></section><section className="border border-slate-300 bg-slate-50 p-4"><h3>Comments</h3><div className="mt-3 grid gap-3 md:grid-cols-3"><p className="border bg-white p-3 text-sm">Class Teacher<br />{teacherComment || '—'}</p><p className="border bg-white p-3 text-sm">Principal<br />{principalComment || '—'}</p><p className="border bg-white p-3 text-sm">Director<br />{directorComment || '—'}</p></div></section></div>

      <div className="mt-5 flex flex-wrap items-center gap-5 border border-slate-300 bg-white p-4 text-sm"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Next Term Begins: {nextTermBegins ? new Date(nextTermBegins).toLocaleDateString() : '—'}</span><span>Generated: {new Date().toLocaleDateString()}</span>{school.stamp_url && <div className="ml-auto flex items-center gap-2"><span>School Stamp</span><img src={school.stamp_url} alt="School stamp" className="h-16 w-24 object-contain" /></div>}</div>
      <div className="mt-6 grid gap-8 border-t pt-8 sm:grid-cols-2"><div className="border-t border-slate-400 pt-2 text-xs text-slate-500">Class Teacher's Signature</div><div className="border-t border-slate-400 pt-2 text-xs text-slate-500">Director / Principal's Signature</div></div>
    </div>
  </div>;
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="border border-slate-300 bg-white p-3"><div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">{icon}{label}</div><p className="mt-1 truncate text-slate-800">{value}</p></div>; }
function Metric({ label, value }: { label: string; value: React.ReactNode }) { return <div className="border border-slate-300 bg-white p-3 text-center"><p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-slate-900">{value}</p></div>; }
function AssessmentPanel({ title, items }: { title: string; items: [string, string][] }) { return <section className="border border-slate-300 bg-slate-50 p-4"><h3 className="text-slate-900">{title}</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{items.map(([label, value]) => <div key={label} className="flex items-center justify-between border bg-white px-3 py-2 text-sm"><span>{label}</span><span className="min-w-12 border-b border-dashed text-center">{value || '—'}</span></div>)}</div></section>; }
