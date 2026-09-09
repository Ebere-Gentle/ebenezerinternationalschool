// src/components/student/TimetableWidget.tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, User, MapPin, ArrowUpRight, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';

type TimetableItem = { 
  id: string; 
  day: string; 
  period: number; 
  start_time: string; 
  end_time: string; 
  subject_id: string | null; 
  teacher_id: string | null; 
  room: string | null; 
  notes: string | null 
};
type Subject = { id: string; name: string; code: string | null };
type Teacher = { id: string; first_name: string; middle_name: string | null; last_name: string };
type ClassRow = { id: string; name: string; code?: string | null; level?: string | null };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const normalize = (v: unknown) => String(v ?? '').trim().toLowerCase();
const time = (v?: string | null) => { 
  if (!v) return ''; 
  const [h, m] = v.slice(0, 5).split(':'); 
  let hour = Number(h); 
  if (Number.isNaN(hour)) return v; 
  const ap = hour >= 12 ? 'PM' : 'AM'; 
  if (hour === 0) hour = 12; 
  if (hour > 12) hour -= 12; 
  return `${hour}:${m} ${ap}`; 
};

const getSubjectColor = (subject: string) => {
  const name = subject?.toLowerCase() || '';
  if (name.includes('math')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (name.includes('physics') || name.includes('chemistry') || name.includes('biology') || name.includes('science')) 
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (name.includes('english') || name.includes('literature') || name.includes('french')) 
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
  if (name.includes('economics') || name.includes('commerce') || name.includes('accounting') || name.includes('government')) 
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  if (name.includes('computer') || name.includes('ict') || name.includes('data processing')) 
    return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
  if (name.includes('physical') || name.includes('sports')) 
    return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
};

interface TimetableWidgetProps {
  timetable: TimetableItem[];
  subjects: Subject[];
  teachers: Teacher[];
  studentClass: ClassRow | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const TimetableWidget: React.FC<TimetableWidgetProps> = ({
  timetable,
  subjects,
  teachers,
  studentClass,
  onRefresh,
  refreshing,
}) => {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = dayjs().day();
    return d === 0 || d === 6 ? 'Monday' : dayjs().format('dddd');
  });

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

  const selectedTimetable = useMemo(() => 
    timetable.filter(t => normalize(t.day) === normalize(selectedDay)).sort((a,b) => a.period - b.period), 
    [timetable, selectedDay]
  );

  const timetableSubject = (id: string | null) => id ? subjectMap.get(id) : undefined;
  const teacherName = (id: string | null) => { 
    const t = id ? teacherMap.get(id) : undefined; 
    return t ? [t.first_name, t.middle_name, t.last_name].filter(Boolean).join(' ') : ''; 
  };

  // Get unique subjects count
  const uniqueSubjects = useMemo(() => {
    const ids = new Set(timetable.map(t => t.subject_id).filter(Boolean));
    return ids.size;
  }, [timetable]);

  return (
    <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-500"/> My Timetable
              </h2>
              <p className="text-[11px] text-gray-500">{selectedDay} • {studentClass?.name || 'Your class'} • {uniqueSubjects} subjects</p>
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <button 
                  onClick={onRefresh} 
                  disabled={refreshing} 
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button 
                onClick={() => navigate('/student/timetable')} 
                className="text-xs font-semibold text-indigo-600 flex items-center gap-1"
              >
                Full timetable <ArrowUpRight className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {DAYS.map(day => (
              <button 
                key={day} 
                onClick={() => setSelectedDay(day)} 
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  selectedDay === day
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {day.slice(0,3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {selectedTimetable.length === 0 ? (
          <div className="py-8 text-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <CalendarDays className="w-9 h-9 mx-auto text-gray-300"/>
            <p className="mt-2 text-sm font-semibold text-gray-500">No classes scheduled for {selectedDay}</p>
            <p className="text-xs text-gray-400">Your school has not published a timetable entry for this day.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedTimetable.map(row => {
              const sub = timetableSubject(row.subject_id);
              const subjectName = sub?.name || row.subject_id || 'Subject not assigned';
              const colorClass = getSubjectColor(subjectName);
              const teacher = teacherName(row.teacher_id);
              
              return (
                <div 
                  key={row.id} 
                  className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition-all hover:shadow-md ${colorClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-white/70 dark:bg-black/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {subjectName.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[120px]">{subjectName}</p>
                        <p className="text-[10px] opacity-70">Period {row.period}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/60 dark:bg-black/10">
                      {time(row.start_time)} - {time(row.end_time)}
                    </span>
                  </div>
                  
                  <div className="mt-3 space-y-1.5">
                    {teacher && (
                      <div className="flex items-center gap-1.5 text-[10px] opacity-75">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{teacher}</span>
                      </div>
                    )}
                    {row.room && (
                      <div className="flex items-center gap-1.5 text-[10px] opacity-75">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{row.room}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default TimetableWidget;