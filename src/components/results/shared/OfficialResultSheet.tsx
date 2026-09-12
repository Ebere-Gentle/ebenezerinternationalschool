import React from 'react';
import { Award, CalendarDays, GraduationCap, MapPin, Phone, School, UserRound } from 'lucide-react';

type Assessment = {
  subject: string;
  test1?: number | null;
  test2?: number | null;
  exam?: number | null;
  grade?: string | null;
  remark?: string | null;
};

type Student = {
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  admission_number?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  passport_url?: string | null;
};

type School = {
  school_name?: string | null;
  branch_id?: string | null;
  address?: string | null;
  phone_number?: string | null;
  email?: string | null;
  logo_url?: string | null;
};

type Props = {
  school: School;
  student: Student;
  className?: string | null;
  session: string;
  term: string;
  assessments: Assessment[];
  test1Max: number;
  test2Max: number;
  examMax: number;
  totalMax?: number;
  position?: number | null;
  classSize?: number | null;
  average?: number | null;
  overallGrade?: string | null;
  overallRemark?: string | null;
  attendance?: { present?: number; absent?: number; total?: number };
  psychomotor?: Record<string, string>;
  affective?: Record<string, string>;
  teacherComment?: string | null;
  principalComment?: string | null;
  nextTermBegins?: string | null;
};

const score = (value: number | null | undefined) => value == null ? '—' : Number(value).toFixed(Number(value) % 1 ? 1 : 0);
const ca = (item: Assessment) => (item.test1 ?? 0) + (item.test2 ?? 0);
const total = (item: Assessment) => ca(item) + (item.exam ?? 0);
const pct = (item: Assessment, maximum: number) => maximum ? total(item) / maximum * 100 : 0;

export default function OfficialResultSheet({ school, student, className, session, term, assessments, test1Max, test2Max, examMax, totalMax = 100, position, classSize, average, overallGrade, overallRemark, attendance, psychomotor = {}, affective = {}, teacherComment, principalComment, nextTermBegins }: Props) {
  const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');
  const psychomotorItems = Object.entries(psychomotor).length ? Object.entries(psychomotor) : [['Handwriting', ''], ['Sports', ''], ['Practical Skills', ''], ['Creativity', '']];
  const affectiveItems = Object.entries(affective).length ? Object.entries(affective) : [['Punctuality', ''], ['Neatness', ''], ['Cooperation', ''], ['Responsibility', ''], ['Attitude to Learning', '']];

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl print:rounded-none print:border-0 print:shadow-none">
      <div className="border-b-4 border-emerald-600 bg-gradient-to-r from-emerald-50 via-white to-sky-50 px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {school.logo_url ? <img src={school.logo_url} alt="School logo" className="h-20 w-20 rounded-2xl object-contain" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-600 text-white"><School className="h-10 w-10" /></div>}
            <div>
              <h1 className="text-xl font-black uppercase tracking-wide text-slate-900 sm:text-2xl">{school.school_name || 'School'}</h1>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{school.address || 'School address'}</span>{school.phone_number && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{school.phone_number}</span>}</div>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Academic Performance Report</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm shadow-sm"><p><b>Branch:</b> {school.branch_id || '—'}</p><p><b>Session:</b> {session}</p><p><b>Term:</b> {term}</p></div>
        </div>
      </div>

      <div className="grid gap-4 border-b bg-slate-50 p-5 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Student" value={fullName || '—'} icon={<UserRound className="h-4 w-4" />} />
          <Info label="Admission No." value={student.admission_number || '—'} icon={<GraduationCap className="h-4 w-4" />} />
          <Info label="Class" value={className || '—'} icon={<School className="h-4 w-4" />} />
          <Info label="Gender" value={student.gender || '—'} icon={<UserRound className="h-4 w-4" />} />
        </div>
        {student.passport_url ? <img src={student.passport_url} alt={fullName} className="h-24 w-20 rounded-xl border object-cover" /> : <div className="flex h-24 w-20 items-center justify-center rounded-xl border bg-white text-slate-300"><UserRound className="h-8 w-8" /></div>}
      </div>

      <div className="p-5 sm:p-7">
        <div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-black text-slate-900">Scholastic Record</h2><p className="text-xs text-slate-500">CA = Test 1 + Test 2 · Total = CA + Examination</p></div><div className="hidden text-right text-xs text-slate-500 sm:block">Maximum: {test1Max} + {test2Max} + {examMax} = {totalMax}</div></div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-slate-900 text-white"><th rowSpan={2} className="px-3 py-3 text-left">#</th><th rowSpan={2} className="px-3 py-3 text-left">Subject</th><th colSpan={2} className="border-l border-white/20 px-3 py-2">Continuous Assessment</th><th rowSpan={2} className="border-l border-white/20 px-3 py-3">CA</th><th rowSpan={2} className="px-3 py-3">Exam</th><th rowSpan={2} className="px-3 py-3">Total / {totalMax}</th><th rowSpan={2} className="px-3 py-3">%</th><th rowSpan={2} className="px-3 py-3">Grade</th><th rowSpan={2} className="px-3 py-3">Remark</th></tr><tr className="bg-slate-800 text-xs"><th className="border-l border-white/20 px-3 py-2">Test 1 / {test1Max}</th><th className="px-3 py-2">Test 2 / {test2Max}</th></tr></thead><tbody>{assessments.map((item, index) => <tr key={`${item.subject}-${index}`} className="border-t border-slate-200"><td className="px-3 py-3">{index + 1}</td><td className="px-3 py-3 font-semibold">{item.subject}</td><td className="border-l px-3 py-3 text-center">{score(item.test1)}</td><td className="px-3 py-3 text-center">{score(item.test2)}</td><td className="bg-slate-50 px-3 py-3 text-center font-semibold">{score(ca(item))}</td><td className="px-3 py-3 text-center">{score(item.exam)}</td><td className="px-3 py-3 text-center font-black">{score(total(item))}</td><td className="px-3 py-3 text-center">{pct(item, totalMax).toFixed(1)}</td><td className="px-3 py-3 text-center font-bold">{item.grade || '—'}</td><td className="px-3 py-3">{item.remark || '—'}</td></tr>)}</tbody></table></div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="Overall Average" value={average == null ? '—' : `${average.toFixed(1)}%`} />
          <Metric label="Overall Grade" value={overallGrade || '—'} />
          <Metric label="Class Position" value={position ? `${position}${classSize ? ` / ${classSize}` : ''}` : '—'} />
          <Metric label="Overall Remark" value={overallRemark || '—'} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <AssessmentPanel title="Affective / Behavioural Development" items={affectiveItems} />
          <AssessmentPanel title="Psychomotor / Skills Development" items={psychomotorItems} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <section className="rounded-2xl border bg-slate-50 p-4"><h3 className="font-bold">Attendance</h3><div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm"><Metric label="School Days" value={attendance?.total ?? '—'} /><Metric label="Present" value={attendance?.present ?? '—'} /><Metric label="Absent" value={attendance?.absent ?? '—'} /></div></section>
          <section className="rounded-2xl border bg-slate-50 p-4 lg:col-span-2"><h3 className="font-bold">Comments</h3><div className="mt-3 grid gap-3 md:grid-cols-2"><p className="rounded-xl bg-white p-3 text-sm"><b>Class Teacher:</b><br />{teacherComment || '—'}</p><p className="rounded-xl bg-white p-3 text-sm"><b>Principal:</b><br />{principalComment || '—'}</p></div></section>
        </div>

        <div className="mt-5 flex flex-wrap gap-4 rounded-2xl border bg-white p-4 text-sm"><span><b>Next Term Begins:</b> {nextTermBegins ? new Date(nextTermBegins).toLocaleDateString() : '—'}</span><span><b>Generated:</b> {new Date().toLocaleDateString()}</span></div>
        <div className="mt-6 grid gap-8 border-t pt-8 sm:grid-cols-2"><div className="border-t border-slate-400 pt-2 text-xs text-slate-500">Class Teacher's Signature</div><div className="border-t border-slate-400 pt-2 text-xs text-slate-500">Principal / Head Teacher's Signature</div></div>
      </div>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="rounded-xl border bg-white p-3"><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{icon}{label}</div><p className="mt-1 truncate font-semibold text-slate-800">{value}</p></div>; }
function Metric({ label, value }: { label: string; value: React.ReactNode }) { return <div className="rounded-xl border bg-white p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-black text-slate-900">{value}</p></div>; }
function AssessmentPanel({ title, items }: { title: string; items: [string, string][] }) { return <section className="rounded-2xl border bg-slate-50 p-4"><h3 className="font-bold text-slate-900">{title}</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{items.map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"><span>{label}</span><span className="min-w-12 border-b border-dashed text-center font-bold">{value || '—'}</span></div>)}</div></section>; }
