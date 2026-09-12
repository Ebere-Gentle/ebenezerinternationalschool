import React from 'react';
import AdminEnterTest from './AdminEnterTest';

/**
 * Second-test entry is kept as a dedicated route so the Results workflow
 * matches the school's three assessment components: Test 1, Test 2 and Exam.
 * The shared admin entry page remains the implementation surface until the
 * admin broadsheet is fully migrated to the component-aware workflow.
 */
const AdminEnterSecondTest: React.FC = () => <AdminEnterTest assessmentType="second_test" />;

export default AdminEnterSecondTest;
