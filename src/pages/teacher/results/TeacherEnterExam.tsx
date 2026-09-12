import TeacherResultEntry from './TeacherResultEntry';
import TeacherResultAssessmentTabs from './TeacherResultAssessmentTabs';

const TeacherEnterExam = () => (
  <TeacherResultAssessmentTabs>
    <TeacherResultEntry assessmentType="exam" />
  </TeacherResultAssessmentTabs>
);

export default TeacherEnterExam;
