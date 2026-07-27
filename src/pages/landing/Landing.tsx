import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  School, 
  Users, 
  GraduationCap, 
  BookOpen, 
  ArrowRight, 
  Award,
  Building2,
  BarChart3,
  Shield,
  Globe,
  ChevronRight
} from 'lucide-react';

const Landing: React.FC = () => {
  const features = [
    {
      icon: Users,
      title: 'Student Management',
      description: 'Complete student lifecycle management from enrollment to graduation.'
    },
    {
      icon: GraduationCap,
      title: 'Teacher Management',
      description: 'Efficiently manage teacher profiles, schedules, and performance.'
    },
    {
      icon: BookOpen,
      title: 'Academic Excellence',
      description: 'Track academic progress, grades, and generate comprehensive reports.'
    },
    {
      icon: Building2,
      title: 'Multi-Campus Support',
      description: 'Manage multiple branches and campuses from a single platform.'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Real-time analytics and insights for data-driven decision making.'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with regular backups and data protection.'
    },
  ];

  const stats = [
    { label: 'Students', value: '1,234+' },
    { label: 'Teachers', value: '56+' },
    { label: 'Branches', value: '4' },
    { label: 'Years of Excellence', value: '25+' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                <School className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Ebenezer International School
              </span>
            </div>
            <Link
              to="/login"
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-400 text-sm font-medium mb-6">
                <Award className="w-4 h-4" />
                Excellence in Education Since 1998
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EIS ERP
                </span>
                <br />
                School Management System
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                Streamline your school operations with our comprehensive management system. 
                From admissions to graduation, manage everything efficiently.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-blue-500/25"
                >
                  Get Started
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  to="#features"
                  className="flex items-center gap-2 px-8 py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Learn More
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="text-center"
                  >
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Users, label: 'Students', count: '1,234' },
                    { icon: GraduationCap, label: 'Teachers', count: '56' },
                    { icon: BookOpen, label: 'Classes', count: '24' },
                    { icon: Globe, label: 'Branches', count: '4' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
                    >
                      <item.icon className="w-8 h-8 mx-auto text-white/80 mb-2" />
                      <p className="text-2xl font-bold text-white">{item.count}</p>
                      <p className="text-sm text-white/70">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl">
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <p className="text-sm text-white/70">Current Session</p>
                      <p className="font-semibold">2025/2026</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/70">Status</p>
                      <p className="font-semibold text-green-300">Active</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Manage Your School
              </span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Comprehensive features designed to streamline every aspect of school management
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all hover:scale-[1.02]"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your School Management?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands of educational institutions using EIS ERP
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-gray-900 rounded-xl font-medium hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-white/25"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ebenezer International School
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span>&copy; {new Date().getFullYear()} All rights reserved</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
