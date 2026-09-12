
import React, { useRef, useState } from 'react';
import {
  Download,
  Loader2,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
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
  subject_position?: number | null;
  subjectPosition?: number | null;

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

  classPosition?: number | null;
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

  /*
   * COMMENT CHANGE CALLBACKS
   *
   * These are called whenever an administrator edits
   * one of the three report comments.
   *
   * AdminResultReportsheet.tsx handles the actual
   * debounced Supabase autosave.
   */
  onTeacherCommentChange?: (
    value: string,
  ) => void;

  onPrincipalCommentChange?: (
    value: string,
  ) => void;

  onDirectorCommentChange?: (
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

const score = (
  value: number | null | undefined,
) => {
  if (value == null) {
    return '—';
  }

  return Number(value).toFixed(0);
};

const pct = (
  value: number | null | undefined,
) => {
  if (value == null) {
    return '—';
  }

  return `${Number(value).toFixed(1)}%`;
};

const third = (term: string) =>
  /third|3rd/i.test(term);

const ratingLabel = (value: string) =>
  ({
    '1': 'Needs Improvement',
    '2': 'Fair',
    '3': 'Good',
    '4': 'Very Good',
    '5': 'Outstanding',
  })[String(value)] || '';

const ordinal = (
  value: number | null | undefined,
) => {
  if (
    value == null ||
    !Number.isFinite(Number(value))
  ) {
    return '—';
  }

  const n = Number(value);
  const mod100 = n % 100;

  if (
    mod100 >= 11 &&
    mod100 <= 13
  ) {
    return `${n}th`;
  }

  switch (n % 10) {
    case 1:
      return `${n}st`;

    case 2:
      return `${n}nd`;

    case 3:
      return `${n}rd`;

    default:
      return `${n}th`;
  }
};

const safeFileName = (
  value: string,
) =>
  value
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, '-')
    .trim();

const formatGender = (
  gender?: string | null,
) => {
  if (!gender) {
    return '—';
  }

  const normalized =
    gender.trim().toLowerCase();

  if (!normalized) {
    return '—';
  }

  return (
    normalized.charAt(0).toUpperCase() +
    normalized.slice(1)
  );
};

const normalisePosition = (
  value:
    | number
    | string
    | null
    | undefined,
): number | null => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(numericValue) ||
    numericValue <= 0
  ) {
    return null;
  }

  return Math.floor(numericValue);
};

const getSubjectPosition = (
  assessment: Assessment,
): number | null => {
  return normalisePosition(
    assessment.subject_position ??
      assessment.subjectPosition ??
      assessment.position ??
      null,
  );
};

const getClassPosition = ({
  classPosition,
  position,
}: {
  classPosition?: number | null;
  position?: number | null;
}): number | null => {
  return normalisePosition(
    classPosition ??
      position ??
      null,
  );
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
  classPosition,
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
  onTeacherCommentChange,
  onPrincipalCommentChange,
  onDirectorCommentChange,
}: Props) {
  const reportRef =
    useRef<HTMLDivElement>(null);

  const [downloading, setDownloading] =
    useState(false);

  const fullName = [
    student.first_name,
    student.middle_name,
    student.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const totalObtained =
    assessments.reduce(
      (total, item) => {
        const itemTotal =
          item.total ??
          Number(item.test1 || 0) +
            Number(item.test2 || 0) +
            Number(item.ca || 0) +
            Number(item.exam || 0);

        return (
          total + Number(itemTotal || 0)
        );
      },
      0,
    );

  const totalPossible =
    assessments.length * totalMax;

  const resolvedClassPosition =
    getClassPosition({
      classPosition,
      position,
    });

  const positionText =
    resolvedClassPosition != null
      ? ordinal(resolvedClassPosition)
      : '—';

  const averageValue =
    average == null
      ? null
      : Number(average);

  /*
   * Generates exactly ONE A4 page.
   */
  const downloadPdf = async () => {
    if (
      !reportRef.current ||
      downloading
    ) {
      return;
    }

    setDownloading(true);

    try {
      await new Promise<void>(
        (resolve) => {
          requestAnimationFrame(() =>
            resolve(),
          );
        },
      );

      await new Promise<void>(
        (resolve) => {
          setTimeout(resolve, 150);
        },
      );

      const element =
        reportRef.current;

      const canvas =
        await html2canvas(element, {
          scale: Math.min(
            2.5,
            Math.max(
              1.5,
              window.devicePixelRatio ||
                1,
            ),
          ),

          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 20000,

          width: element.scrollWidth,
          height: element.scrollHeight,

          windowWidth: Math.max(
            element.scrollWidth,
            1000,
          ),

          windowHeight:
            element.scrollHeight,

          onclone: (
            documentClone,
          ) => {
            documentClone
              .querySelectorAll(
                '[data-pdf-ignore="true"]',
              )
              .forEach((node) => {
                (
                  node as HTMLElement
                ).style.display =
                  'none';
              });

            const clonedReport =
              documentClone.querySelector(
                '.result-sheet',
              ) as HTMLElement | null;

            if (clonedReport) {
              clonedReport.style.width =
                '100%';

              clonedReport.style.maxWidth =
                'none';

              clonedReport.style.minWidth =
                '0';

              clonedReport.style.overflow =
                'visible';

              clonedReport.style.height =
                'auto';

              clonedReport.style.minHeight =
                '0';

              clonedReport.style.transform =
                'none';

              clonedReport.style.position =
                'relative';

              clonedReport.style.paddingBottom =
                '12px';

              clonedReport.style.boxSizing =
                'border-box';
            }

            documentClone
              .querySelectorAll(
                '[data-pdf-wrap="true"]',
              )
              .forEach((node) => {
                const element =
                  node as HTMLElement;

                element.style.overflow =
                  'visible';

                element.style.textOverflow =
                  'clip';

                element.style.whiteSpace =
                  'normal';

                element.style.wordBreak =
                  'break-word';

                element.style.overflowWrap =
                  'anywhere';
              });

            /*
             * Make editable comment fields look
             * like normal report text inside the PDF.
             */
            documentClone
              .querySelectorAll(
                '[data-comment-editor="true"]',
              )
              .forEach((node) => {
                const textarea =
                  node as HTMLTextAreaElement;

                textarea.style.border =
                  '0';

                textarea.style.outline =
                  'none';

                textarea.style.boxShadow =
                  'none';

                textarea.style.background =
                  'transparent';

                textarea.style.resize =
                  'none';

                textarea.style.padding =
                  '0';

                textarea.style.margin =
                  '0';

                textarea.style.width =
                  '100%';

                textarea.style.color =
                  '#1e293b';

                textarea.style.fontFamily =
                  'inherit';

                textarea.style.fontSize =
                  '6.5px';

                textarea.style.lineHeight =
                  '1.625';

                textarea.style.overflow =
                  'visible';

                textarea.style.height =
                  'auto';

                textarea.style.minHeight =
                  '24px';
              });
          },
        });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const pageHeight =
        pdf.internal.pageSize.getHeight();

      const margin = 4;

      const usableWidth =
        pageWidth - margin * 2;

      const usableHeight =
        pageHeight - margin * 2;

      const scaleX =
        usableWidth / canvas.width;

      const scaleY =
        usableHeight / canvas.height;

      const fitScale =
        Math.min(scaleX, scaleY);

      const renderedWidth =
        canvas.width * fitScale;

      const renderedHeight =
        canvas.height * fitScale;

      const x =
        (pageWidth -
          renderedWidth) /
        2;

      const y =
        (pageHeight -
          renderedHeight) /
        2;

      const pageImage =
        canvas.toDataURL(
          'image/jpeg',
          0.96,
        );

      pdf.addImage(
        pageImage,
        'JPEG',
        x,
        y,
        renderedWidth,
        renderedHeight,
        undefined,
        'FAST',
      );

      const filename =
        `${safeFileName(
          fullName || 'Student',
        )}-${safeFileName(
          className || 'Report',
        )}-${safeFileName(
          term || 'Term',
        )}-${safeFileName(
          session || 'Session',
        )}.pdf`;

      pdf.save(filename);
    } catch (error) {
      console.error(
        'PDF generation error:',
        error,
      );

      window.alert(
        'Unable to generate the PDF. Please try again.',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full">
      {/* =====================================================
          DOWNLOAD
          ===================================================== */}
      <div
        className="mb-3 flex justify-end"
        data-pdf-ignore="true"
      >
        <button
          type="button"
          onClick={() =>
            void downloadPdf()
          }
          disabled={downloading}
          title={
            downloading
              ? 'Preparing PDF'
              : 'Download PDF'
          }
          aria-label={
            downloading
              ? 'Preparing PDF'
              : 'Download PDF'
          }
          className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* =====================================================
          REPORT
          ===================================================== */}
      <div
        ref={reportRef}
        className="result-sheet mx-auto w-full max-w-[1000px] overflow-visible bg-white text-slate-900"
        style={{
          position: 'relative',
          isolation: 'isolate',
          boxSizing: 'border-box',
        }}
      >
        {/* ===================================================
            SCHOOL HEADER
            =================================================== */}
        <header className="border-b border-slate-900 px-5 py-3">
          <div className="grid grid-cols-[58px_minmax(0,1fr)_58px] items-center gap-4">
            <div className="flex justify-center">
              <img
                src={
                  school.logo_url ||
                  schoolLogo
                }
                alt="School logo"
                className="h-14 w-14 object-contain"
                crossOrigin="anonymous"
              />
            </div>

            <div className="min-w-0 text-center">
              <div className="text-[6px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                Official Academic Record
              </div>

              <h1
                data-pdf-wrap="true"
                className="mt-0.5 break-words text-[18px] font-extrabold uppercase leading-tight tracking-tight text-slate-950"
              >
                {school.school_name ||
                  'Ebenezer International School'}
              </h1>

              {school.motto && (
                <p
                  data-pdf-wrap="true"
                  className="mt-0.5 break-words text-[7px] italic text-slate-600"
                >
                  “{school.motto}”
                </p>
              )}

              <div className="mx-auto mt-1 flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[6px] text-slate-600">
                {school.address && (
                  <span
                    data-pdf-wrap="true"
                  >
                    <MapPin className="mr-0.5 inline h-2 w-2" />
                    {school.address}
                  </span>
                )}

                {school.phone_number && (
                  <span>
                    <Phone className="mr-0.5 inline h-2 w-2" />
                    {school.phone_number}
                  </span>
                )}

                {school.email && (
                  <span
                    data-pdf-wrap="true"
                  >
                    <Mail className="mr-0.5 inline h-2 w-2" />
                    {school.email}
                  </span>
                )}
              </div>

              <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-900">
                Student Report Sheet
              </div>

              <div className="mt-0.5 text-[6.5px] text-slate-500">
                {session} &nbsp;•&nbsp;{' '}
                {term}
              </div>
            </div>

            <div className="flex justify-center">
              <img
                src={
                  school.logo_url ||
                  schoolLogo
                }
                alt=""
                className="h-14 w-14 object-contain"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        </header>

        {/* ===================================================
            STUDENT INFORMATION
            =================================================== */}
        <section className="border-b border-slate-300 px-5 py-3">
          <div className="grid grid-cols-12 gap-x-5 gap-y-2">
            <StudentDetail
              label="Student Name"
              value={
                fullName || '—'
              }
              span="col-span-12 sm:col-span-5"
              large
            />

            <StudentDetail
              label="Admission Number"
              value={
                student.admission_number ||
                '—'
              }
              span="col-span-6 sm:col-span-3"
              large
            />

            <StudentDetail
              label="Class"
              value={
                className || '—'
              }
              span="col-span-3 sm:col-span-2"
              large
            />

            <StudentDetail
              label="Gender"
              value={formatGender(
                student.gender,
              )}
              span="col-span-3 sm:col-span-2"
              large
            />

            <StudentDetail
              label="Position"
              value={positionText}
              span="col-span-6 sm:col-span-3"
              large
            />

            <StudentDetail
              label="Attendance"
              value={
                attendance?.percentage ==
                null
                  ? '—'
                  : `${Number(
                      attendance.percentage,
                    ).toFixed(1)}%`
              }
              span="col-span-6 sm:col-span-2"
              large
            />

            <StudentDetail
              label="Session"
              value={
                session || '—'
              }
              span="col-span-6 sm:col-span-3"
            />

            <StudentDetail
              label="Term"
              value={term || '—'}
              span="col-span-6 sm:col-span-2"
            />

            <StudentDetail
              label="Branch"
              value={
                school.branch_id ||
                '—'
              }
              span="col-span-12 sm:col-span-2"
            />
          </div>
        </section>

        <main className="px-5 py-3">
          {/* =================================================
              SCHOLASTIC PERFORMANCE
              ================================================= */}
          <section>
            <div className="mb-2 flex items-end justify-between border-b border-slate-900 pb-1">
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wide">
                  Scholastic Performance
                </h2>

                <p className="mt-0.5 text-[6px] text-slate-500">
                  Academic assessment
                  record for the selected
                  term.
                </p>
              </div>

              <div className="text-[6px] text-slate-500">
                Maximum score:{' '}
                {totalMax}
              </div>
            </div>

            <div className="w-full overflow-visible">
              <table className="w-full table-fixed border-collapse text-[6.5px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900">
                    <th className="w-[4%] border border-slate-400 px-0.5 py-1">
                      S/N
                    </th>

                    <th className="w-[20%] border border-slate-400 px-1 py-1 text-left">
                      Subject
                    </th>

                    <th className="w-[9%] border border-slate-400 px-0.5 py-1">
                      First Test
                      <br />
                      <span className="font-normal">
                        ({test1Max})
                      </span>
                    </th>

                    <th className="w-[10%] border border-slate-400 px-0.5 py-1">
                      Second Test
                      <br />
                      <span className="font-normal">
                        ({test2Max})
                      </span>
                    </th>

                    <th className="w-[7%] border border-slate-400 px-0.5 py-1">
                      CA
                      <br />
                      <span className="font-normal">
                        ({caMax})
                      </span>
                    </th>

                    <th className="w-[8%] border border-slate-400 px-0.5 py-1">
                      Exam
                      <br />
                      <span className="font-normal">
                        ({examMax})
                      </span>
                    </th>

                    <th className="w-[8%] border border-slate-400 px-0.5 py-1">
                      Total
                      <br />
                      <span className="font-normal">
                        ({totalMax})
                      </span>
                    </th>

                    <th className="w-[7%] border border-slate-400 px-0.5 py-1">
                      %
                    </th>

                    <th className="w-[8%] border border-slate-400 px-0.5 py-1">
                      Pos.
                    </th>

                    <th className="w-[7%] border border-slate-400 px-0.5 py-1">
                      Grade
                    </th>

                    <th className="w-[12%] border border-slate-400 px-1 py-1 text-left">
                      Remark
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {assessments.map(
                    (item, index) => {
                      const total =
                        item.total ??
                        Number(
                          item.test1 || 0,
                        ) +
                          Number(
                            item.test2 ||
                              0,
                          ) +
                          Number(
                            item.ca || 0,
                          ) +
                          Number(
                            item.exam || 0,
                          );

                      const percentage =
                        item.percentage ??
                        (totalMax
                          ? (Number(total) /
                              totalMax) *
                            100
                          : 0);

                      const subjectPosition =
                        getSubjectPosition(
                          item,
                        );

                      return (
                        <tr
                          key={`${item.subject}-${index}`}
                        >
                          <td className="border border-slate-300 px-0.5 py-1 text-center">
                            {index + 1}
                          </td>

                          <td
                            data-pdf-wrap="true"
                            className="break-words border border-slate-300 px-1 py-1 font-medium"
                          >
                            {item.subject ||
                              '—'}
                          </td>

                          <td className="border border-slate-300 px-0.5 py-1 text-center">
                            {score(
                              item.test1,
                            )}
                          </td>

                          <td className="border border-slate-300 px-0.5 py-1 text-center">
                            {score(
                              item.test2,
                            )}
                          </td>

                          <td className="border border-slate-300 px-0.5 py-1 text-center">
                            {score(item.ca)}
                          </td>

                          <td className="border border-slate-300 px-0.5 py-1 text-center">
                            {score(
                              item.exam,
                            )}
                          </td>

                          <td className="border border-slate-300 px-0.5 py-1 text-center font-semibold">
                            {score(total)}
                          </td>

                          <td className="border border-slate-300 px-0.5 py-1 text-center">
                            {percentage.toFixed(
                              1,
                            )}
                          </td>

                          <td className="border border-slate-300 px-0.5 py-1 text-center font-semibold">
                            {subjectPosition !=
                            null
                              ? ordinal(
                                  subjectPosition,
                                )
                              : '—'}
                          </td>

                          <td className="border border-slate-300 px-0.5 py-1 text-center font-semibold">
                            {item.grade ||
                              '—'}
                          </td>

                          <td
                            data-pdf-wrap="true"
                            className="break-words border border-slate-300 px-1 py-1"
                          >
                            {item.remark ||
                              '—'}
                          </td>
                        </tr>
                      );
                    },
                  )}

                  {!assessments.length && (
                    <tr>
                      <td
                        colSpan={11}
                        className="border border-slate-300 px-2 py-3 text-center text-slate-500"
                      >
                        No assessment
                        records
                        available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* =================================================
              SUMMARY
              ================================================= */}
          <section className="mt-2.5 border-y border-slate-300">
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-300 sm:grid-cols-5 sm:divide-y-0">
              <Metric
                label="Total Obtained"
                value={`${totalObtained} / ${totalPossible}`}
              />

              <Metric
                label="Overall Average"
                value={
                  averageValue == null
                    ? '—'
                    : `${averageValue.toFixed(
                        1,
                      )}%`
                }
              />

              <Metric
                label="Grade"
                value={
                  overallGrade ||
                  '—'
                }
              />

              <Metric
                label="Position"
                value={positionText}
              />

              <Metric
                label="Overall Remark"
                value={
                  overallRemark ||
                  '—'
                }
              />
            </div>
          </section>

          {/* =================================================
              FEES
              ================================================= */}
          {feeStatus && (
            <section className="mt-2.5 border-y border-slate-300">
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-300 sm:grid-cols-4 sm:divide-y-0">
                <Metric
                  label="Fee Status"
                  value={
                    feeStatus.status
                  }
                />

                <Metric
                  label="Amount Due"
                  value={`₦${feeStatus.due.toLocaleString()}`}
                />

                <Metric
                  label="Amount Paid"
                  value={`₦${feeStatus.paid.toLocaleString()}`}
                />

                <Metric
                  label="Outstanding"
                  value={`₦${feeStatus.balance.toLocaleString()}`}
                />
              </div>
            </section>
          )}

          {/* =================================================
              CUMULATIVE
              ================================================= */}
          {third(term) && (
            <section className="mt-2.5">
              <SectionHeading>
                Three-Term Performance &
                Cumulative Record
              </SectionHeading>

              <table className="w-full border-collapse text-[6.5px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-400 px-1 py-1 text-left">
                      Subject
                    </th>

                    <th className="border border-slate-400 px-0.5 py-1">
                      1st Term
                    </th>

                    <th className="border border-slate-400 px-0.5 py-1">
                      2nd Term
                    </th>

                    <th className="border border-slate-400 px-0.5 py-1">
                      3rd Term
                    </th>

                    <th className="border border-slate-400 px-0.5 py-1">
                      Cumulative
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {assessments.map(
                    (item, index) => (
                      <tr
                        key={`cumulative-${index}`}
                      >
                        <td
                          data-pdf-wrap="true"
                          className="break-words border border-slate-300 px-1 py-1"
                        >
                          {item.subject ||
                            '—'}
                        </td>

                        <td className="border border-slate-300 px-0.5 py-1 text-center">
                          {pct(
                            item.term1Percentage,
                          )}
                        </td>

                        <td className="border border-slate-300 px-0.5 py-1 text-center">
                          {pct(
                            item.term2Percentage,
                          )}
                        </td>

                        <td className="border border-slate-300 px-0.5 py-1 text-center">
                          {pct(
                            item.term3Percentage ??
                              item.percentage,
                          )}
                        </td>

                        <td className="border border-slate-300 px-0.5 py-1 text-center font-semibold">
                          {pct(
                            item.cumulativePercentage,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </section>
          )}

          {/* =================================================
              DEVELOPMENT DOMAINS
              ================================================= */}
          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Domain
              title="Psychomotor / Skills Development"
              items={PSYCH}
              values={psychomotor}
              domain="psychomotor"
              onRatingChange={
                onRatingChange
              }
            />

            <Domain
              title="Affective / Behavioural Development"
              items={AFFECTIVE}
              values={affective}
              domain="affective"
              onRatingChange={
                onRatingChange
              }
            />
          </div>

          {/* =================================================
              GUIDES
              ================================================= */}
          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Guide
              title="Rating Guide"
              items={[
                '5 = Outstanding',
                '4 = Very Good',
                '3 = Good',
                '2 = Fair',
                '1 = Needs Improvement',
              ]}
            />

            <Guide
              title="Grade Guide"
              items={[
                'A = 75–100 Excellent',
                'B = 65–74 Very Good',
                'C = 55–64 Good',
                'D = 45–54 Fair',
                'E = 40–44 Pass',
                'F = 0–39 Needs Improvement',
              ]}
            />
          </div>

          {/* =================================================
              ATTENDANCE
              ================================================= */}
          <section className="mt-2.5">
            <SectionHeading>
              Attendance Record
            </SectionHeading>

            <div className="grid grid-cols-2 divide-x divide-y divide-slate-300 border-y border-slate-300 sm:grid-cols-4 sm:divide-y-0">
              <Metric
                label="School Days Opened"
                value={
                  attendance?.total ??
                  '—'
                }
              />

              <Metric
                label="Present"
                value={
                  attendance?.present ??
                  '—'
                }
              />

              <Metric
                label="Absent"
                value={
                  attendance?.absent ??
                  '—'
                }
              />

              <Metric
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

          {/* =================================================
              COMMENTS
              ================================================= */}
          <section className="mt-2.5">
            <SectionHeading>
              School Comments
            </SectionHeading>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <EditableComment
                title="Class Teacher"
                value={
                  teacherComment
                }
                onChange={
                  onTeacherCommentChange
                }
              />

              <EditableComment
                title="Principal"
                value={
                  principalComment
                }
                onChange={
                  onPrincipalCommentChange
                }
              />

              <EditableComment
                title="Director"
                value={
                  directorComment
                }
                onChange={
                  onDirectorCommentChange
                }
              />
            </div>
          </section>

          {/* =================================================
              SIGNATURES
              ================================================= */}
          <section className="mt-4 border-t border-slate-400 pt-3">
            <div className="grid grid-cols-3 items-end gap-6">
              <div>
                <div className="mb-5 border-b border-slate-500" />

                <p className="text-[6px] text-slate-600">
                  Class Teacher's
                  Signature
                </p>
              </div>

              <div>
                <div className="mb-5 border-b border-slate-500" />

                <p className="text-[6px] text-slate-600">
                  Principal's
                  Signature
                </p>
              </div>

              <div className="flex flex-col items-center">
                {school.stamp_url ? (
                  <img
                    src={
                      school.stamp_url
                    }
                    alt="Official school stamp"
                    className="mb-0.5 h-10 w-16 object-contain grayscale"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="mb-0.5 h-10" />
                )}

                <div className="w-full border-b border-slate-500" />

                <p className="mt-0.5 text-center text-[6px] text-slate-600">
                  Official School
                  Stamp
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              FOOTER
              ================================================= */}
          <footer className="mt-3 border-t border-slate-200 pt-1.5 text-center text-[5.5px] text-slate-500">
            Official school record •
            Generated{' '}
            {new Date().toLocaleDateString()}
            {' • '}
            {new Date().toLocaleTimeString(
              [],
              {
                hour: '2-digit',
                minute: '2-digit',
              },
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}

/* ===========================================================
   STUDENT DETAIL
   =========================================================== */

function StudentDetail({
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
    <div
      className={`${span} min-w-0`}
      data-pdf-wrap="true"
    >
      <div className="text-[5.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>

      <div
        className={`mt-0.5 whitespace-normal break-words leading-snug ${
          large
            ? 'text-[9.5px] font-semibold text-slate-950'
            : 'text-[7px] font-medium text-slate-800'
        }`}
        style={{
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ===========================================================
   METRIC
   =========================================================== */

function Metric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className="min-w-0 px-1.5 py-1.5 text-center"
      data-pdf-wrap="true"
    >
      <div className="text-[5.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>

      <div className="mt-0.5 whitespace-normal break-words text-[7px] font-semibold leading-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

/* ===========================================================
   SECTION HEADING
   =========================================================== */

function SectionHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1 border-b border-slate-900 pb-0.5">
      <h3 className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-slate-900">
        {children}
      </h3>
    </div>
  );
}

/* ===========================================================
   EDITABLE COMMENT
   =========================================================== */

function EditableComment({
  title,
  value,
  onChange,
}: {
  title: string;
  value?: string | null;
  onChange?: (
    value: string,
  ) => void;
}) {
  const editable =
    typeof onChange === 'function';

  return (
    <div
      className="min-h-[48px] border-b border-slate-300 pb-1"
      data-pdf-wrap="true"
    >
      <div className="text-[5.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {title}
      </div>

      {editable ? (
        <textarea
          data-comment-editor="true"
          value={value || ''}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder={`Enter ${title.toLowerCase()} comment...`}
          rows={2}
          aria-label={`${title} comment`}
          className="mt-0.5 min-h-[30px] w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[6.5px] leading-relaxed text-slate-800 outline-none ring-0 placeholder:text-slate-300 focus:border-0 focus:outline-none focus:ring-0"
          style={{
            overflowWrap: 'anywhere',
          }}
        />
      ) : (
        <p
          className="mt-0.5 whitespace-normal break-words text-[6.5px] leading-relaxed text-slate-800"
          style={{
            overflowWrap: 'anywhere',
          }}
        >
          {value || '—'}
        </p>
      )}
    </div>
  );
}

/* ===========================================================
   DEVELOPMENT DOMAIN
   =========================================================== */

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
  domain:
    | 'psychomotor'
    | 'affective';
  onRatingChange?: Props['onRatingChange'];
}) {
  return (
    <section>
      <div className="mb-0.5 border-b border-slate-900 pb-0.5">
        <span className="text-[6.5px] font-bold uppercase tracking-wide">
          {title}
        </span>
      </div>

      <table className="w-full border-collapse text-[5.5px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-400 px-0.5 py-0.5 text-left">
              Skill
            </th>

            {[1, 2, 3, 4, 5].map(
              (number) => (
                <th
                  key={number}
                  className="w-5 border border-slate-400 px-0.5 py-0.5"
                >
                  {number}
                </th>
              ),
            )}
          </tr>
        </thead>

        <tbody>
          {items.map((label) => {
            const value = String(
              values[label] || '',
            );

            return (
              <tr key={label}>
                <td className="border border-slate-300 px-0.5 py-0.5">
                  {label}
                </td>

                {[1, 2, 3, 4, 5].map(
                  (number) => (
                    <td
                      key={number}
                      className="border border-slate-300 p-0 text-center"
                    >
                      <button
                        type="button"
                        disabled={
                          !onRatingChange
                        }
                        onClick={() =>
                          onRatingChange?.(
                            domain,
                            label,
                            String(number),
                          )
                        }
                        title={`${number} = ${ratingLabel(
                          String(number),
                        )}`}
                        aria-label={`${label}: ${ratingLabel(
                          String(number),
                        )}`}
                        className="flex min-h-[14px] w-full items-center justify-center text-primary disabled:cursor-default hover:bg-primary/5 disabled:hover:bg-transparent"
                      >
                        <span className="text-[8px] leading-none">
                          {value ===
                          String(number)
                            ? '●'
                            : '○'}
                        </span>
                      </button>
                    </td>
                  ),
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/* ===========================================================
   GUIDE
   =========================================================== */

function Guide({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section>
      <div className="mb-0.5 border-b border-slate-900 pb-0.5">
        <div className="text-[6.5px] font-bold uppercase tracking-[0.1em]">
          {title}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[5.5px] text-slate-600">
        {items.map((item) => (
          <span key={item}>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}