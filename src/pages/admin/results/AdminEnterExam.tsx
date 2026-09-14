import AdminResultEntry from './AdminResultEntry';
import AdminResultAssessmentTabs from './AdminResultAssessmentTabs';

const AdminEnterExam = () => (
  <AdminResultAssessmentTabs>
    <AdminResultEntry assessmentType="exam" />
  </AdminResultAssessmentTabs>
);

export default AdminEnterExam;
