import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../routes/RouteConstants';
import StudentRegistrationForm from '../../../components/forms/StudentRegistrationForm/StudentRegistrationForm';

const RegisterStudent = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={ROUTES.STUDENTS}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Register Student</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Complete the form below to register a new student
          </p>
        </div>
      </div>

      <StudentRegistrationForm />
    </div>
  );
};

export default RegisterStudent;


