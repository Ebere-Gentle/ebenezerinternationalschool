import React, { useMemo, useRef, useState } from 'react';
import { Download, Loader2, Mail, MapPin, Phone } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import schoolLogo from '../../../assets/school-logo.png';

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
  position?: number | null;
  term1Percentage?: number | null;
  term2Percentage?: number | null;
  term3Percentage?: number | null;
  cumulativePercentage?: number | null;
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
  stamp_url?: string | null;
  motto?: string | null;
};

type Attendance = {
  present?: number;
  absent?: number;
  total?: number;
  percentage?: number;
  excused?: number;
};

type FeeStatus = {
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'NO FEE DATA';
  due: number;
  paid: number;
  balance: number;
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
  feeStatus?: FeeStatus;
  onRatingChange?: (
    domain: 'psychomotor' | 'affective',
    skill: string,
    value: string,
  ) => void;
};

const PSYCH = [
  'Handwriting',
  'Drawing / Creativity',
  'Sports',
  'Practical Skills',
  'Manual Dexterity',
  'Music / Performance',
  'Artistic Expression',
  'Coordination',
  'Use of Tools',
  'Neatness of Work',
  'Fine Motor Control',
  'Gross Motor Control',
];

const AFFECTIVE = [
  'Punctuality',
  'Regularity',
  'Neatness',
  'Courtesy',
  'Cooperation',
  'Responsibility',
  'Self-Control',
  'Respect for Authority',
  'Attitude to Learning',
  'Leadership',
  'Honesty',
  'Confidence',
];

const score = (value: number | null | undefined) =>
  value == null ? '—' : Number(value).toFixed(0);

const pct = (value: number | null | undefined) =>
  value == null ? '—' : `${Number(value).toFixed(1)}%`;

const third = (term: string) => /third|3rd/i.test(term);

const ratingLabel = (value: string) =>
  ({
    1: 'Needs Improvement',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Outstanding',
  })[String(value)] || '';

const ordinal = (value?: number | null) => {
  if (!value) return '—';
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
};

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
  feeStatus,
  onRatingChange,
}: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const fullName = [
    student.first_name,
    student.middle_name,
    student.last_name,
  ]
    .filter(Boolean)
    .join(' ');

  const totalObtained = assessments.reduce(
    (sum, item) =>
      sum +
      Number(
        item.total ??
          ((item.test1 || 0) +
            (item.test2 || 0) +
            (item.ca || 0) +
            (item.exam || 0)),
      ),
    0,
  );

  const totalPossible = assessments.length * totalMax;

  const displayAverage = useMemo(
    () =>
      average == null ? null : Number(average),
    [average],
  );

  const downloadPdf = async () => {
    if (!reportRef.current || downloading) return;

    setDownloading(true);

    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );

      const canvas = await html2canvas(reportRef.current, {
        scale: Math.min(2.5, window.devicePixelRatio * 1.5),
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
        logging: false,
        ignoreElements: (element) =>
          element.hasAttribute('data-pdf-ignore'),
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const imageHeight =
        (canvas.height * usableWidth) / canvas.width;

      const imageData = canvas.toDataURL('image/jpeg', 0.96);

      if (imageHeight <= usableHeight) {
        pdf.addImage(
          imageData,
          'JPEG',
          margin,
          margin,
          usableWidth,
          imageHeight,
          undefined,
          'FAST',
        );
      } else {
        let remainingHeight = imageHeight;
        let sourceY = 0;
        let page = 0;

        while (remainingHeight > 0) {
          if (page > 0) pdf.addPage();

          const sliceHeight = Math.min(
            usableHeight,
            remainingHeight,
          );

          const sourceHeight = Math.round(
            (sliceHeight / imageHeight) * canvas.height,
          );

          const sourceCanvas = document.createElement('canvas');
          sourceCanvas.width = canvas.width;
          sourceCanvas.height = sourceHeight;

          const context = sourceCanvas.getContext('2d');
          if (!context) {
            throw new Error('Unable to prepare PDF page.');
          }

          context.fillStyle = '#ffffff';
          context.fillRect(
            0,
            0,
            sourceCanvas.width,
            sourceCanvas.height,
          );

          context.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            sourceHeight,
            0,
            0,
            sourceCanvas.width,
            sourceCanvas.height,
          );

          const sliceData = sourceCanvas.toDataURL(
            'image/jpeg',
            0.96,
          );

          pdf.addImage(
            sliceData,
            'JPEG',
            margin,
            margin,
            usableWidth,
            sliceHeight,
            undefined,
            'FAST',
          );

          sourceY += sourceHeight;
          remainingHeight -= sliceHeight;
          page += 1;
        }
      }

      const safeName =
        fullName
          .replace(/[^a-z0-9]+/gi, '_')
          .replace(/^_+|_+$/g, '') ||
        'Student';

      const safeSession =
        session.replace(/[^a-z0-9]+/gi, '_');
      const safeTerm =
        term.replace(/[^a-z0-9]+/gi, '_');

      pdf.save(
        `${safeName}_${safeSession}_${safeTerm}_Report.pdf`,
      );
    } catch (error) {
      console.error('Reportsheet PDF download failed:', error);
      window.alert(
        'The report could not be downloaded as PDF. Please try again.',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <div
        className="no-print mb-4 flex justify-end"
        data-pdf-ignore
      >
        <button
          type="button"
          onClick={downloadPdf}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloading
            ? 'Preparing PDF…'
            : 'Download PDF'}
        </button>
      </div>

      <div
        ref={reportRef}
        className="result-sheet w-full overflow-hidden bg-white font-sans text-[9px] leading-tight text-slate-900"
        style={{
          boxShadow: '0 18px 60px rgba(0,0,0,.10)',
        }}
      >
        <header className="border-b-2 border-slate-900 px-7 pb-4 pt-6">
          <div className="grid grid-cols-[82px_1fr_82px] items-center gap-5">
            <div className="flex justify-center">
              <img
                src={school.logo_url || schoolLogo}
                alt="School logo"
                crossOrigin="anonymous"
                className="h-[72px] w-[72px] object-contain"
              />
            </div>

            <div className="text-center">
              <div className="text-[8px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                Official Academic Record
              </div>

              <h1 className="mt-1 text-[21px] font-black uppercase tracking-tight text-slate-950">
                {school.school_name ||
                  'Ebenezer International School'}
              </h1>

              {school.motto && (
                <p className="mt-1 text-[9px] italic text-slate-600">
                  “{school.motto}”
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[7.5px] text-slate-600">
                {school.address && (
                  <span>
                    <MapPin className="mr-0.5 inline h-2.5 w-2.5" />
                    {school.address}
                  </span>
                )}
                {school.phone_number && (
                  <span>
                    <Phone className="mr-0.5 inline h-2.5 w-2.5" />
                    {school.phone_number}
                  </span>
                )}
                {school.email && (
                  <span>
                    <Mail className="mr-0.5 inline h-2.5 w-2.5" />
                    {school.email}
                  </span>
                )}
              </div>

              <div className="mt-3 text-[12px] font-bold uppercase tracking-[0.22em]">
                Student Report Sheet
              </div>

              <div className="mt-1 text-[9px] font-medium text-slate-500">
                {session} • {term}
              </div>
            </div>

            <div className="flex justify-center">
              <img
                src={school.logo_url || schoolLogo}
                alt="School logo"
                crossOrigin="anonymous"
                className="h-[72px] w-[72px] object-contain"
              />
            </div>
          </div>
        </header>

        <section className="px-7 py-4">
          <div className="grid grid-cols-12 items-end gap-x-6 gap-y-3 border-b border-slate-300 pb-4">
            <Detail
              label="Student Name"
              value={fullName || '—'}
              span="col-span-5"
              large
            />
            <Detail
              label="Admission Number"
              value={student.admission_number || '—'}
              span="col-span-3"
              large
            />
            <Detail
              label="Class"
              value={className || '—'}
              span="col-span-2"
              large
            />
            <Detail
              label="Gender"
              value={student.gender || '—'}
              span="col-span-2"
            />
            <Detail
              label="Position"
              value={
                position
                  ? `${ordinal(position)}${
                      classSize
                        ? ` of ${classSize}`
                        : ''
                    }`
                  : '—'
              }
              span="col-span-3"
              large
            />
            <Detail
              label="Attendance"
              value={
                attendance?.percentage == null
                  ? '—'
                  : `${Number(
                      attendance.percentage,
                    ).toFixed(1)}%`
              }
              span="col-span-3"
            />
            <Detail
              label="Session"
              value={session || '—'}
              span="col-span-3"
            />
            <Detail
              label="Term"
              value={term || '—'}
              span="col-span-3"
            />
          </div>
        </section>

        <main className="px-7 pb-7">
          <section>
            <div className="mb-2 flex items-end justify-between border-b border-slate-900 pb-1.5">
              <div>
                <h2 className="text-[13px] font-bold uppercase tracking-wide">
                  Scholastic Performance
                </h2>
                <p className="mt-0.5 text-[7px] text-slate-500">
                  Periodic tests, continuous assessment and examination
                  performance.
                </p>
              </div>
              <div className="text-[7.5px] font-semibold text-slate-600">
                Maximum: {test1Max} + {test2Max} + {caMax} + {examMax} ={' '}
                {totalMax}
              </div>
            </div>

            <table className="w-full border-collapse text-[7.8px]">
              <thead>
                <tr className="border-y border-slate-900">
                  <th className="px-1.5 py-2 text-center">S/N</th>
                  <th className="px-1.5 py-2 text-left">Subject</th>
                  <th className="px-1 py-2 text-center">
                    First Test
                    <br />({test1Max})
                  </th>
                  <th className="px-1 py-2 text-center">
                    Second Test
                    <br />({test2Max})
                  </th>
                  <th className="px-1 py-2 text-center">
                    CA
                    <br />({caMax})
                  </th>
                  <th className="px-1 py-2 text-center">
                    Exam
                    <br />({examMax})
                  </th>
                  <th className="px-1 py-2 text-center">
                    Total
                    <br />({totalMax})
                  </th>
                  <th className="px-1 py-2 text-center">%</th>
                  <th className="px-1 py-2 text-center">Pos.</th>
                  <th className="px-1 py-2 text-center">Grade</th>
                  <th className="px-1.5 py-2 text-left">Remark</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((item, index) => {
                  const total =
                    item.total ??
                    Number(item.test1 || 0) +
                      Number(item.test2 || 0) +
                      Number(item.ca || 0) +
                      Number(item.exam || 0);

                  const percentage =
                    item.percentage ??
                    (totalMax
                      ? (total / totalMax) * 100
                      : 0);

                  return (
                    <tr
                      key={`${item.subject}-${index}`}
                      className="border-b border-slate-200"
                    >
                      <td className="px-1.5 py-1.5 text-center">
                        {index + 1}
                      </td>
                      <td className="px-1.5 py-1.5 font-semibold">
                        {item.subject}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {score(item.test1)}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {score(item.test2)}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {score(item.ca)}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {score(item.exam)}
                      </td>
                      <td className="px-1 py-1.5 text-center font-semibold">
                        {score(total)}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {percentage.toFixed(1)}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {item.position
                          ? ordinal(item.position)
                          : '—'}
                      </td>
                      <td className="px-1 py-1.5 text-center font-semibold">
                        {item.grade || '—'}
                      </td>
                      <td className="px-1.5 py-1.5">
                        {item.remark || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="mt-4 grid grid-cols-5 border-y border-slate-900">
            <SummaryMetric
              label="Total Obtained"
              value={`${totalObtained} / ${totalPossible}`}
            />
            <SummaryMetric
              label="Overall Average"
              value={
                displayAverage == null
                  ? '—'
                  : `${displayAverage.toFixed(1)}%`
              }
            />
            <SummaryMetric
              label="Overall Grade"
              value={overallGrade || '—'}
            />
            <SummaryMetric
              label="Position"
              value={
                position
                  ? `${ordinal(position)}${
                      classSize
                        ? ` of ${classSize}`
                        : ''
                    }`
                  : '—'
              }
            />
            <SummaryMetric
              label="Overall Remark"
              value={overallRemark || '—'}
            />
          </section>

          {feeStatus && (
            <section className="mt-4 border-y border-slate-300 py-2.5">
              <div className="mb-1.5 text-[8px] font-bold uppercase tracking-wide">
                Fee Status
              </div>
              <div className="grid grid-cols-4 gap-5">
                <PlainMetric
                  label="Status"
                  value={feeStatus.status}
                />
                <PlainMetric
                  label="Amount Due"
                  value={`₦${feeStatus.due.toLocaleString()}`}
                />
                <PlainMetric
                  label="Amount Paid"
                  value={`₦${feeStatus.paid.toLocaleString()}`}
                />
                <PlainMetric
                  label="Outstanding"
                  value={`₦${feeStatus.balance.toLocaleString()}`}
                />
              </div>
            </section>
          )}

          {third(term) && (
            <section className="mt-4">
              <SectionHeading>
                Three-Term Performance & Cumulative Record
              </SectionHeading>
              <table className="w-full border-collapse text-[7.8px]">
                <thead>
                  <tr className="border-y border-slate-900">
                    <th className="px-1.5 py-1.5 text-left">Subject</th>
                    <th className="px-1 py-1.5 text-center">1st Term</th>
                    <th className="px-1 py-1.5 text-center">2nd Term</th>
                    <th className="px-1 py-1.5 text-center">3rd Term</th>
                    <th className="px-1 py-1.5 text-center">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((item, index) => (
                    <tr
                      key={`cumulative-${index}`}
                      className="border-b border-slate-200"
                    >
                      <td className="px-1.5 py-1.5 font-semibold">
                        {item.subject}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {pct(item.term1Percentage)}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {pct(item.term2Percentage)}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {pct(
                          item.term3Percentage ??
                            item.percentage,
                        )}
                      </td>
                      <td className="px-1 py-1.5 text-center font-semibold">
                        {pct(item.cumulativePercentage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="mt-4 grid grid-cols-2 gap-7">
            <Domain
              title="Psychomotor / Skills Development"
              items={PSYCH}
              values={psychomotor}
              domain="psychomotor"
              onRatingChange={onRatingChange}
            />
            <Domain
              title="Affective / Behavioural Development"
              items={AFFECTIVE}
              values={affective}
              domain="affective"
              onRatingChange={onRatingChange}
            />
          </section>

          <section className="mt-4 grid grid-cols-2 gap-7 border-y border-slate-300 py-2.5 text-[7.5px]">
            <div>
              <div className="mb-1 font-bold uppercase tracking-wide">
                Rating Guide
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                <span>5 = Outstanding</span>
                <span>4 = Very Good</span>
                <span>3 = Good</span>
                <span>2 = Fair</span>
                <span>1 = Needs Improvement</span>
              </div>
            </div>
            <div>
              <div className="mb-1 font-bold uppercase tracking-wide">
                Grade Guide
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
                <span>A 75–100</span>
                <span>B 65–74</span>
                <span>C 55–64</span>
                <span>D 45–54</span>
                <span>E 40–44</span>
                <span>F 0–39</span>
              </div>
            </div>
          </section>

          <section className="mt-4">
            <SectionHeading>Attendance & Next Term</SectionHeading>
            <div className="grid grid-cols-4 gap-6 border-b border-slate-300 pb-2.5">
              <PlainMetric
                label="School Days Opened"
                value={attendance?.total ?? '—'}
              />
              <PlainMetric
                label="Present"
                value={attendance?.present ?? '—'}
              />
              <PlainMetric
                label="Absent"
                value={attendance?.absent ?? '—'}
              />
              <PlainMetric
                label="Next Term Begins"
                value={
                  nextTermBegins
                    ? new Date(
                        nextTermBegins,
                      ).toLocaleDateString()
                    : '—'
                }
              />
            </div>
          </section>

          <section className="mt-4 grid grid-cols-3 gap-6">
            <Comment
              title="Class Teacher"
              value={teacherComment}
            />
            <Comment
              title="Principal"
              value={principalComment}
            />
            <Comment
              title="Director"
              value={directorComment}
            />
          </section>

          <section className="mt-7 grid grid-cols-2 gap-14 border-t border-slate-900 pt-7 text-[7.5px] text-slate-600">
            <div>
              <div className="mb-5 border-b border-slate-500" />
              Class Teacher's Signature
            </div>
            <div>
              <div className="mb-5 border-b border-slate-500" />
              Director / Principal's Signature
            </div>
          </section>

          <footer className="mt-5 flex items-center justify-between border-t border-slate-200 pt-2 text-[7px] text-slate-500">
            <span>
              Official school record • Generated{' '}
              {new Date().toLocaleDateString()}
            </span>
            {school.stamp_url && (
              <img
                src={school.stamp_url}
                alt="Official school stamp"
                crossOrigin="anonymous"
                className="h-14 w-20 object-contain grayscale"
              />
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  span,
  large = false,
}: {
  label: string;
  value: string;
  span: string;
  large?: boolean;
}) {
  return (
    <div className={span}>
      <div className="text-[6.5px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div
        className={`mt-0.5 truncate font-semibold text-slate-950 ${
          large ? 'text-[11px]' : 'text-[9px]'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-r border-slate-300 px-2 py-2 text-center last:border-r-0">
      <div className="text-[6.5px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 truncate text-[9px] font-bold text-slate-950">
        {value}
      </div>
    </div>
  );
}

function PlainMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[6.5px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-[9px] font-semibold text-slate-950">
        {value}
      </div>
    </div>
  );
}

function SectionHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-2 border-b border-slate-900 pb-1 text-[9px] font-bold uppercase tracking-wide">
      {children}
    </h3>
  );
}

function Comment({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  return (
    <div className="min-h-[52px] border-t border-slate-300 pt-2">
      <div className="text-[7px] font-bold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <p className="mt-1 text-[8px] leading-relaxed text-slate-800">
        {value || '—'}
      </p>
    </div>
  );
}

function Domain({
  title,
  items,
  values,
  domain,
  onRatingChange,
}: {
  title: string;
  items: string[];
  values: Record<string, string>;
  domain: 'psychomotor' | 'affective';
  onRatingChange?: Props['onRatingChange'];
}) {
  return (
    <section>
      <h3 className="mb-1.5 border-b border-slate-900 pb-1 text-[8.5px] font-bold uppercase tracking-wide">
        {title}
      </h3>
      <table className="w-full border-collapse text-[7px]">
        <thead>
          <tr className="border-y border-slate-700">
            <th className="px-1 py-1 text-left">Skill</th>
            {[1, 2, 3, 4, 5].map((n) => (
              <th
                key={n}
                className="w-6 px-0.5 py-1 text-center"
              >
                {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((label) => {
            const value = String(values[label] || '');

            return (
              <tr
                key={label}
                className="border-b border-slate-200"
              >
                <td className="px-1 py-1">{label}</td>
                {[1, 2, 3, 4, 5].map((n) => (
                  <td
                    key={n}
                    className="p-0 text-center"
                  >
                    <button
                      type="button"
                      disabled={!onRatingChange}
                      onClick={() =>
                        onRatingChange?.(
                          domain,
                          label,
                          String(n),
                        )
                      }
                      title={`${n} = ${ratingLabel(
                        String(n),
                      )}`}
                      className="flex min-h-[18px] w-full items-center justify-center text-[10px] leading-none disabled:cursor-default"
                    >
                      {value === String(n)
                        ? '●'
                        : '○'}
                    </button>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
