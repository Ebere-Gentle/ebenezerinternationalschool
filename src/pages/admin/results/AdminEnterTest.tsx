import AdminResultEntry from './AdminResultEntry';
import AdminResultAssessmentTabs from './AdminResultAssessmentTabs';

const AdminEnterTest = () => (
  <AdminResultAssessmentTabs>
    <AdminResultEntry assessmentType="first_test" />
  </AdminResultAssessmentTabs>
);

export default AdminEnterTest;
