export interface ResultData {
  studentId: string;
  studentName: string;
  subject: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  remark: string;
}

export interface CumulativeResult {
  studentId: string;
  studentName: string;
  totalScore: number;
  totalMaxScore: number;
  overallPercentage: number;
  averageScore: number;
  grade: string;
  subjectResults: ResultData[];
  position?: number;
  remark: string;
}

export class CumulativeCalculator {
  static calculateGrade(percentage: number): string {
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  }

  static calculateRemark(grade: string): string {
    const remarks: Record<string, string> = {
      'A': 'Excellent',
      'B': 'Very Good',
      'C': 'Good',
      'D': 'Satisfactory',
      'E': 'Pass',
      'F': 'Fail'
    };
    return remarks[grade] || 'N/A';
  }

  static calculateCumulative(results: ResultData[]): CumulativeResult[] {
    const studentMap = new Map<string, CumulativeResult>();

    results.forEach(result => {
      if (!studentMap.has(result.studentId)) {
        studentMap.set(result.studentId, {
          studentId: result.studentId,
          studentName: result.studentName,
          totalScore: 0,
          totalMaxScore: 0,
          overallPercentage: 0,
          averageScore: 0,
          grade: 'F',
          subjectResults: [],
          remark: 'N/A'
        });
      }

      const student = studentMap.get(result.studentId)!;
      student.subjectResults.push(result);
      student.totalScore += result.score;
      student.totalMaxScore += result.maxScore;
    });

    // Calculate percentages and grades
    const cumulativeResults = Array.from(studentMap.values()).map(student => {
      student.overallPercentage = (student.totalScore / student.totalMaxScore) * 100;
      student.averageScore = student.totalScore / student.subjectResults.length;
      student.grade = CumulativeCalculator.calculateGrade(student.overallPercentage);
      student.remark = CumulativeCalculator.calculateRemark(student.grade);
      return student;
    });

    // Sort by overall percentage descending and assign positions
    cumulativeResults.sort((a, b) => b.overallPercentage - a.overallPercentage);
    cumulativeResults.forEach((student, index) => {
      student.position = index + 1;
    });

    return cumulativeResults;
  }

  static getCumulativeSummary(results: CumulativeResult[]): {
    totalStudents: number;
    averagePercentage: number;
    highestScore: number;
    lowestScore: number;
    gradeDistribution: Record<string, number>;
  } {
    if (results.length === 0) {
      return {
        totalStudents: 0,
        averagePercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        gradeDistribution: {}
      };
    }

    const totalPercentage = results.reduce((sum, r) => sum + r.overallPercentage, 0);
    const gradeDistribution: Record<string, number> = {};
    
    results.forEach(r => {
      gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1;
    });

    return {
      totalStudents: results.length,
      averagePercentage: totalPercentage / results.length,
      highestScore: Math.max(...results.map(r => r.overallPercentage)),
      lowestScore: Math.min(...results.map(r => r.overallPercentage)),
      gradeDistribution
    };
  }
}
