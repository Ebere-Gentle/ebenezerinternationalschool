import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  User, 
  BookOpen, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';

interface ResultFormProps {
  type: 'test' | 'exam' | 'cbt';
  onSuccess?: () => void;
  onCancel?: () => void;
  classId?: string;
  subjectId?: string;
  term?: string;
  session?: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface ResultEntry {
  studentId: string;
  score: number;
  maxScore: number;
  remark?: string;
}

export const ResultForm: React.FC<ResultFormProps> = ({
  type,
  onSuccess,
  onCancel,
  classId: propClassId,
  subjectId: propSubjectId,
  term: propTerm,
  session: propSession
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState(propClassId || '');
  const [selectedSubject, setSelectedSubject] = useState(propSubjectId || '');
  const [selectedTerm, setSelectedTerm] = useState(propTerm || '');
  const [selectedSession, setSelectedSession] = useState(propSession || '');
  const [maxScore, setMaxScore] = useState(100);
  const [results, setResults] = useState<Record<string, ResultEntry>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const terms = ['First Term', 'Second Term', 'Third Term'];
  const sessions = ['2023/2024', '2024/2025', '2025/2026'];

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      fetchSubjects();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm && selectedSession) {
      fetchExistingResults();
    }
  }, [selectedClass, selectedSubject, selectedTerm, selectedSession]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, admission_number')
        .eq('class_id', selectedClass)
        .order('first_name');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setError('No students found in this class');
        setStudents([]);
        setResults({});
        return;
      }
      
      setStudents(data || []);
      
      // Initialize results for each student
      const initialResults: Record<string, ResultEntry> = {};
      (data || []).forEach(student => {
        initialResults[student.id] = {
          studentId: student.id,
          score: 0,
          maxScore: maxScore
        };
      });
      setResults(initialResults);
      setError(null);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students');
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .order('name');
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    }
  };

  const fetchExistingResults = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm || !selectedSession) return;
    
    setLoading(true);
    try {
      const tableName = type === 'test' ? 'test_results' : 
                       type === 'exam' ? 'exam_results' : 'cbt_results';
      
      const { data, error } = await supabase
        .from(tableName)
        .select('student_id, score, max_score, remark')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .eq('term', selectedTerm)
        .eq('session', selectedSession);
      
      if (error) {
        // If table doesn't exist, just continue
        if (error.code === '42P01') {
          console.warn(`Table ${tableName} does not exist yet`);
          return;
        }
        throw error;
      }
      
      if (data && data.length > 0) {
        const existingResults: Record<string, ResultEntry> = {};
        data.forEach(record => {
          existingResults[record.student_id] = {
            studentId: record.student_id,
            score: record.score,
            maxScore: record.max_score || maxScore,
            remark: record.remark
          };
        });
        setResults(prev => ({ ...prev, ...existingResults }));
        toast.success('Existing results loaded');
      }
    } catch (error) {
      console.error('Error fetching existing results:', error);
      // Don't show error to user if table doesn't exist
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (studentId: string, score: number) => {
    setResults(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: Math.min(Math.max(0, score), maxScore)
      }
    }));
  };

  const handleMaxScoreChange = (value: number) => {
    setMaxScore(value);
    // Update all results with new max score
    setResults(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key].maxScore = value;
        updated[key].score = Math.min(updated[key].score, value);
      });
      return updated;
    });
  };

  const calculateGrade = (score: number, max: number): string => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  };

  const getStudentName = (studentId: string): string => {
    const student = students.find(s => s.id === studentId);
    return student ? `${student.first_name} ${student.last_name}` : 'Unknown';
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm || !selectedSession) {
      toast.error('Please select all required fields');
      return;
    }

    const hasScores = Object.values(results).some(r => r.score > 0);
    if (!hasScores) {
      toast.error('Please enter at least one score');
      return;
    }

    setSaving(true);
    try {
      const tableName = type === 'test' ? 'test_results' : 
                       type === 'exam' ? 'exam_results' : 'cbt_results';
      
      const entries = Object.values(results)
        .filter(r => r.score > 0)
        .map(r => ({
          student_id: r.studentId,
          class_id: selectedClass,
          subject_id: selectedSubject,
          term: selectedTerm,
          session: selectedSession,
          score: r.score,
          max_score: r.maxScore,
          percentage: (r.score / r.maxScore) * 100,
          grade: calculateGrade(r.score, r.maxScore),
          remark: calculateGrade((r.score / r.maxScore) * 100, 100),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      // Delete existing results before inserting new ones
      try {
        await supabase
          .from(tableName)
          .delete()
          .eq('class_id', selectedClass)
          .eq('subject_id', selectedSubject)
          .eq('term', selectedTerm)
          .eq('session', selectedSession);
      } catch (deleteError) {
        // If table doesn't exist, we'll create it with the insert
        console.warn('Delete failed, table might not exist:', deleteError);
      }

      const { error } = await supabase
        .from(tableName)
        .insert(entries);

      if (error) {
        // If table doesn't exist, show helpful message
        if (error.code === '42P01') {
          toast.error(`Table "${tableName}" does not exist. Please run database migration.`);
          return;
        }
        throw error;
      }

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} results saved successfully!`);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error saving results:', error);
      toast.error(error.message || 'Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
          Enter {type} Results
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Class</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Subject</option>
          {subjects.map(subj => (
            <option key={subj.id} value={subj.id}>{subj.name}</option>
          ))}
        </select>

        <select
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Term</option>
          {terms.map(term => (
            <option key={term} value={term}>{term}</option>
          ))}
        </select>

        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Session</option>
          {sessions.map(session => (
            <option key={session} value={session}>{session}</option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Max Score */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Max Score:
        </label>
        <input
          type="number"
          value={maxScore}
          onChange={(e) => handleMaxScoreChange(Number(e.target.value))}
          className="w-24 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          min={1}
          max={100}
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          (Score range: 0 - {maxScore})
        </span>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">#</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Student</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Admission No.</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Score</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Grade</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Remark</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {selectedClass ? 'No students found in this class' : 'Please select a class'}
                </td>
              </tr>
            ) : (
              students.map((student, index) => {
                const result = results[student.id];
                const percentage = result ? (result.score / result.maxScore) * 100 : 0;
                const grade = result ? calculateGrade(result.score, result.maxScore) : 'N/A';
                
                return (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                  >
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {student.admission_number}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={result?.score || 0}
                        onChange={(e) => handleScoreChange(student.id, Number(e.target.value))}
                        className="w-20 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        min={0}
                        max={maxScore}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        grade === 'A' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        grade === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        grade === 'C' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        grade === 'D' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        grade === 'E' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {percentage > 0 ? `${percentage.toFixed(1)}%` : '-'}
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || loading || students.length === 0}
          className="px-6 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Results
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
