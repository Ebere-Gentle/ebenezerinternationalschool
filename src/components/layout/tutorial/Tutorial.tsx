import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Sparkles,
  X,
} from 'lucide-react';

import html2canvas from 'html2canvas';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { supabase } from '../../config/supabase/client';


/* ============================================================
   TYPES
============================================================ */

export interface TutorialHighlight {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
  title: string;
  description: string;
}

export interface TutorialFeature {
  title: string;
  description: string;
  icon?: React.ReactNode;
  highlightId?: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  path?: string;
  target?: string;
  screenshot?: string;
  highlights?: TutorialHighlight[];
  currentHighlightIndex?: number;
  features?: TutorialFeature[];
  tip?: string;
}

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  role: string;
}


/* ============================================================
   HELPERS
============================================================ */

const normalizeRole = (role: string): string => {
  const value = String(role || '')
    .trim()
    .toLowerCase();

  if (value === 'admin_asst') {
    return 'record_keeper';
  }

  if (value === 'administrator') {
    return 'admin';
  }

  if (value === 'superadmin') {
    return 'super_admin';
  }

  return value || 'student';
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const getRolePath = (role: string): string => {
  const roleMap: Record<string, string> = {
    director: 'director',
    finance: 'finance',
    teacher: 'teacher',
    parent: 'parent',
    student: 'student',
    record_keeper: 'record_keeper',
  };
  return roleMap[role] || 'student';
};


/* ============================================================
   TUTORIAL CONTENT WITH HIGHLIGHTS
============================================================ */

const tutorialContent: Record<string, TutorialStep[]> = {
  director: [
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      subtitle: 'Your school at a glance',
      description: 'The dashboard is your command centre. It gives you a quick overview of what is happening across the school.',
      path: '/dashboard',
      target: '[data-tutorial="dashboard"]',
      highlights: [
        {
          id: 'overview',
          x: 5,
          y: 5,
          width: 90,
          height: 25,
          order: 1,
          title: 'School Overview',
          description: 'This section shows key metrics about your school including total students, teachers, and classes.'
        },
        {
          id: 'recent-activity',
          x: 5,
          y: 35,
          width: 55,
          height: 55,
          order: 2,
          title: 'Recent Activity',
          description: 'View the latest activities happening in your school, including new enrollments, payments, and updates.'
        },
        {
          id: 'quick-actions',
          x: 65,
          y: 35,
          width: 30,
          height: 55,
          order: 3,
          title: 'Quick Actions',
          description: 'Access frequently used features quickly. Click here to register students, record payments, or generate reports.'
        },
        {
          id: 'notifications',
          x: 5,
          y: 65,
          width: 30,
          height: 30,
          order: 4,
          title: 'Notifications',
          description: 'Stay informed about important updates, pending approvals, and system notifications.'
        },
        {
          id: 'performance',
          x: 65,
          y: 65,
          width: 30,
          height: 30,
          order: 5,
          title: 'Performance Metrics',
          description: 'Track key performance indicators like attendance rates, payment collections, and academic performance.'
        }
      ],
      tip: 'Think of the dashboard as your starting point whenever you log into the system.'
    },
    {
      id: 'students',
      title: 'Student Management',
      subtitle: 'Everything about your students',
      description: 'The Students section is where your school maintains its student records.',
      path: '/students',
      target: '[data-tutorial="students"]',
      highlights: [
        {
          id: 'search',
          x: 5,
          y: 5,
          width: 40,
          height: 10,
          order: 1,
          title: 'Search Students',
          description: 'Quickly find students by name, ID, or class using the powerful search functionality.'
        },
        {
          id: 'list',
          x: 5,
          y: 18,
          width: 90,
          height: 50,
          order: 2,
          title: 'Student List',
          description: 'View all students in an organized table. Click on any student to access their complete profile.'
        },
        {
          id: 'filters',
          x: 50,
          y: 5,
          width: 45,
          height: 10,
          order: 3,
          title: 'Filters',
          description: 'Filter students by class, status, or other criteria to narrow down your view.'
        },
        {
          id: 'actions',
          x: 70,
          y: 70,
          width: 25,
          height: 8,
          order: 4,
          title: 'Bulk Actions',
          description: 'Perform actions on multiple students at once, such as updating status or sending notifications.'
        },
        {
          id: 'register',
          x: 5,
          y: 70,
          width: 60,
          height: 8,
          order: 5,
          title: 'Register New Student',
          description: 'Add a new student to the school system. Fill in their personal and academic information.'
        }
      ],
      tip: 'Always search for an existing student before creating a new record to help prevent duplicates.'
    },
  ],
  finance: [
    {
      id: 'dashboard',
      title: 'Finance Dashboard',
      subtitle: 'Your financial workspace',
      description: 'Your dashboard gives you quick access to the financial activities you are responsible for.',
      path: '/dashboard',
      target: '[data-tutorial="dashboard"]',
      highlights: [
        {
          id: 'overview',
          x: 5,
          y: 5,
          width: 90,
          height: 30,
          order: 1,
          title: 'Financial Overview',
          description: 'View key financial metrics including total revenue, outstanding payments, and recent transactions.'
        },
        {
          id: 'transactions',
          x: 5,
          y: 40,
          width: 90,
          height: 50,
          order: 2,
          title: 'Recent Transactions',
          description: 'Monitor all financial transactions including payments received, invoices generated, and expenses.'
        }
      ]
    },
    {
      id: 'fees',
      title: 'Fees Management',
      subtitle: 'Manage what students owe',
      description: 'Fees is where you manage the charges that students are expected to pay.',
      path: '/fees',
      target: '[data-tutorial="fees"]',
      highlights: [
        {
          id: 'fee-list',
          x: 5,
          y: 5,
          width: 90,
          height: 40,
          order: 1,
          title: 'Fee Structure',
          description: 'View and manage all fee types including tuition, registration, and miscellaneous fees.'
        },
        {
          id: 'assign-fees',
          x: 5,
          y: 50,
          width: 90,
          height: 20,
          order: 2,
          title: 'Assign Fees',
          description: 'Assign fees to specific classes, groups, or individual students.'
        }
      ]
    }
  ],
  teacher: [
    {
      id: 'dashboard',
      title: 'Teacher Dashboard',
      subtitle: 'Everything you need for teaching',
      description: 'Your dashboard gives you a central starting point for accessing your classes, students, and teaching activities.',
      path: '/teacher/dashboard',
      target: '[data-tutorial="dashboard"]',
      highlights: [
        {
          id: 'classes',
          x: 5,
          y: 5,
          width: 45,
          height: 45,
          order: 1,
          title: 'My Classes',
          description: 'View all classes assigned to you. Click on any class to access student lists and teaching materials.'
        },
        {
          id: 'schedule',
          x: 55,
          y: 5,
          width: 40,
          height: 45,
          order: 2,
          title: 'Today\'s Schedule',
          description: 'See your teaching schedule for today including class times and subjects.'
        },
        {
          id: 'tasks',
          x: 5,
          y: 55,
          width: 90,
          height: 35,
          order: 3,
          title: 'Tasks & Activities',
          description: 'Manage your teaching tasks including assignments, grading, and attendance tracking.'
        }
      ]
    }
  ],
  parent: [
    {
      id: 'dashboard',
      title: 'Parent Dashboard',
      subtitle: 'Stay connected to your child\'s school life',
      description: 'Your dashboard gives you a central place to access information about your children and school activities.',
      path: '/parent/dashboard',
      target: '[data-tutorial="dashboard"]',
      highlights: [
        {
          id: 'children',
          x: 5,
          y: 5,
          width: 55,
          height: 45,
          order: 1,
          title: 'My Children',
          description: 'View information about your children including academic progress, attendance, and school activities.'
        },
        {
          id: 'bills',
          x: 65,
          y: 5,
          width: 30,
          height: 45,
          order: 2,
          title: 'School Bills',
          description: 'View outstanding fees and make payments for your children\'s school bills.'
        },
        {
          id: 'notifications',
          x: 5,
          y: 55,
          width: 90,
          height: 35,
          order: 3,
          title: 'Notifications',
          description: 'Stay updated with school announcements, events, and important communications.'
        }
      ]
    }
  ],
  student: [
    {
      id: 'dashboard',
      title: 'Student Dashboard',
      subtitle: 'Your school workspace',
      description: 'Your dashboard gives you access to the school activities and information available to your student account.',
      path: '/student/dashboard',
      target: '[data-tutorial="dashboard"]',
      highlights: [
        {
          id: 'classes',
          x: 5,
          y: 5,
          width: 55,
          height: 45,
          order: 1,
          title: 'My Classes',
          description: 'View your current classes, assignments, and academic progress.'
        },
        {
          id: 'bills',
          x: 65,
          y: 5,
          width: 30,
          height: 45,
          order: 2,
          title: 'School Fees',
          description: 'View your school fees and make payments securely.'
        },
        {
          id: 'profile',
          x: 5,
          y: 55,
          width: 90,
          height: 35,
          order: 3,
          title: 'My Profile',
          description: 'View and manage your personal information, academic records, and school activities.'
        }
      ]
    }
  ],
  record_keeper: [
    {
      id: 'dashboard',
      title: 'Admin Assistant Dashboard',
      subtitle: 'Your administrative workspace',
      description: 'The dashboard gives you quick access to the administrative tasks available to your account.',
      path: '/admin-asst/dashboard',
      target: '[data-tutorial="dashboard"]',
      highlights: [
        {
          id: 'records',
          x: 5,
          y: 5,
          width: 90,
          height: 45,
          order: 1,
          title: 'Record Management',
          description: 'Access and manage student records, academic sessions, and school collections.'
        },
        {
          id: 'tasks',
          x: 5,
          y: 55,
          width: 90,
          height: 35,
          order: 2,
          title: 'Administrative Tasks',
          description: 'Manage inventory, generate reports, and handle payment records.'
        }
      ]
    }
  ]
};


/* ============================================================
   FALLBACK
============================================================ */

const fallbackSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to your school system',
    subtitle: 'Let us show you around',
    description: 'This guided tour introduces the main areas available to your account.',
    highlights: [
      {
        id: 'welcome-1',
        x: 5,
        y: 5,
        width: 90,
        height: 90,
        order: 1,
        title: 'Welcome',
        description: 'Welcome to your school management system. This tutorial will guide you through the key features.'
      }
    ]
  },
];


/* ============================================================
   SCREENSHOT CAPTURE SERVICE
============================================================ */

class ScreenshotService {
  private static instance: ScreenshotService;
  private captureQueue: Map<string, boolean> = new Map();
  private isCapturing: boolean = false;

  static getInstance(): ScreenshotService {
    if (!ScreenshotService.instance) {
      ScreenshotService.instance = new ScreenshotService();
    }
    return ScreenshotService.instance;
  }

  async capturePage(
    path: string,
    role: string,
    stepId: string
  ): Promise<string | null> {
    const key = `${role}-${stepId}`;

    if (this.captureQueue.has(key)) {
      return null;
    }

    this.captureQueue.set(key, true);

    try {
      await wait(800);

      const overlay = document.querySelector('[data-tutorial-overlay="true"]') as HTMLElement | null;
      if (overlay) {
        overlay.style.visibility = 'hidden';
      }

      await wait(150);

      const root = document.getElementById('root') || document.body;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const canvas = await html2canvas(root as HTMLElement, {
        backgroundColor: '#f8fafc',
        width: viewportWidth,
        height: viewportHeight,
        windowWidth: viewportWidth,
        windowHeight: viewportHeight,
        x: 0,
        y: window.scrollY,
        scrollX: 0,
        scrollY: window.scrollY,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        logging: false,
        removeContainer: true,
        ignoreElements: (element) => {
          if (!(element instanceof HTMLElement)) {
            return false;
          }
          return Boolean(element.closest('[data-tutorial-overlay="true"]'));
        },
      });

      if (overlay) {
        overlay.style.visibility = '';
      }

      const image = canvas.toDataURL('image/png', 0.92);
      
      const storageKey = `screenshot_${role}_${stepId}`;
      try {
        sessionStorage.setItem(storageKey, image);
      } catch (e) {
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        sessionStorage.setItem(storageKey, compressed);
      }

      this.captureQueue.delete(key);
      return image;

    } catch (error) {
      console.debug('Screenshot capture error:', error);
      this.captureQueue.delete(key);
      return null;
    }
  }

  getScreenshot(role: string, stepId: string): string | null {
    const storageKey = `screenshot_${role}_${stepId}`;
    return sessionStorage.getItem(storageKey);
  }

  isCaptured(role: string, stepId: string): boolean {
    const storageKey = `screenshot_${role}_${stepId}`;
    return sessionStorage.getItem(storageKey) !== null;
  }

  clearScreenshots() {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('screenshot_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
}


/* ============================================================
   COMPONENT
============================================================ */

const Tutorial: React.FC<TutorialProps> = ({
  isOpen,
  onClose,
  userId,
  role,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const screenshotService = ScreenshotService.getInstance();

  const normalizedRole = normalizeRole(role);
  const steps = useMemo(() => {
    const configuredSteps = tutorialContent[normalizedRole];
    if (configuredSteps && configuredSteps.length > 0) {
      return configuredSteps;
    }
    return fallbackSteps;
  }, [normalizedRole]);

  const [currentStep, setCurrentStep] = useState(0);
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const currentHighlights = step?.highlights || [];
  const currentHighlight = currentHighlights[currentHighlightIndex] || null;
  const isLastHighlight = currentHighlightIndex >= currentHighlights.length - 1;

  useEffect(() => {
    if (!isOpen || !step) return;

    const captureScreenshot = async () => {
      const storageKey = `screenshot_${normalizedRole}_${step.id}`;
      
      const existing = sessionStorage.getItem(storageKey);
      if (existing) {
        setScreenshot(existing);
        return;
      }

      if (isCapturing) return;

      setIsCapturing(true);

      try {
        if (step.path && step.path !== location.pathname) {
          navigate(step.path);
          await wait(1000);
        }

        const image = await screenshotService.capturePage(
          step.path || '',
          normalizedRole,
          step.id
        );

        if (image) {
          setScreenshot(image);
        }
      } catch (error) {
        console.debug('Failed to capture screenshot:', error);
      } finally {
        setIsCapturing(false);
      }
    };

    const timer = setTimeout(captureScreenshot, 300);
    return () => clearTimeout(timer);

  }, [isOpen, step, normalizedRole, location.pathname, navigate]);

  useEffect(() => {
    setCurrentHighlightIndex(0);
  }, [currentStep]);

  const saveProgress = useCallback(
    async ({ stepIndex, completed, skipped }: { stepIndex: number; completed?: boolean; skipped?: boolean }) => {
      if (!userId) return;

      try {
        await supabase
          .from('user_tutorial_progress')
          .upsert(
            {
              user_id: userId,
              role: normalizedRole,
              tutorial_version: 1,
              current_step: stepIndex,
              completed: completed ?? false,
              skipped: skipped ?? false,
              updated_at: new Date().toISOString(),
              completed_at: completed ? new Date().toISOString() : null,
            },
            { onConflict: 'user_id,role,tour_version' }
          );
      } catch (error) {
        console.debug('Tutorial progress error:', error);
      }
    },
    [userId, normalizedRole]
  );

  const moveToStep = useCallback(
    async (index: number) => {
      const nextStep = steps[index];
      if (!nextStep) return;

      setCurrentStep(index);
      setCurrentHighlightIndex(0);

      if (nextStep.path && nextStep.path !== location.pathname) {
        navigate(nextStep.path);
      }

      await saveProgress({ stepIndex: index, completed: false, skipped: false });
    },
    [steps, location.pathname, navigate, saveProgress]
  );

  const handleNextHighlight = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const highlights = step?.highlights || [];
      
      if (currentHighlightIndex < highlights.length - 1) {
        setCurrentHighlightIndex(prev => prev + 1);
      } else {
        if (isLastStep) {
          await saveProgress({
            stepIndex: currentStep,
            completed: true,
            skipped: false,
          });
          onClose();
        } else {
          await moveToStep(currentStep + 1);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      if (currentHighlightIndex > 0) {
        setCurrentHighlightIndex(prev => prev - 1);
      } else if (!isFirstStep) {
        await moveToStep(currentStep - 1);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await saveProgress({ stepIndex: currentStep, completed: false, skipped: true });
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { handleSkip(); return; }
      if (event.key === 'ArrowLeft' && !isProcessing) { handleBack(); }
      if (event.key === 'ArrowRight' && !isProcessing) { handleNextHighlight(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing]);

  if (!isOpen || !step) return null;

  const totalHighlights = currentHighlights.length;
  const isLastHighlightOfStep = currentHighlightIndex >= totalHighlights - 1;
  const showHighlight = currentHighlight !== null && screenshot !== null;

  return (
    <AnimatePresence>
      <motion.div
        data-tutorial-overlay="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 md:p-8"
      >
        <div
          data-tutorial-overlay="true"
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-[7px]"
          onClick={handleSkip}
        />

        <motion.div
          data-tutorial-overlay="true"
          initial={{ opacity: 0, y: 25, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.97 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          onClick={(event) => event.stopPropagation()}
          className="relative w-full max-w-[900px] max-h-[92vh] overflow-hidden rounded-[26px] sm:rounded-[30px] bg-white dark:bg-slate-950 border border-white/70 dark:border-slate-800 shadow-[0_30px_100px_rgba(0,0,0,0.38)]"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-100 dark:bg-slate-800">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-5 sm:px-7 pt-5 sm:pt-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                  Guided Tour
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {step.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {currentStep + 1} / {steps.length}
                {totalHighlights > 0 && ` • ${currentHighlightIndex + 1}/${totalHighlights}`}
              </span>
              <button
                type="button"
                aria-label="Close tutorial"
                onClick={handleSkip}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(92vh-170px)] overflow-y-auto overscroll-contain px-5 sm:px-7 pt-6 sm:pt-7 pb-4 scrollbar-thin">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${step.id}-${currentHighlightIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                {screenshot && (
                  <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-md">
                    <div className="h-8 px-3 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <div className="ml-2 h-4 flex-1 max-w-[170px] rounded-md bg-slate-100 dark:bg-slate-800" />
                    </div>

                    <div className="relative bg-white dark:bg-slate-950 overflow-hidden">
                      <img
                        src={screenshot}
                        alt={`${step.title} screenshot`}
                        draggable={false}
                        className="block w-full h-auto max-h-[400px] object-contain object-top"
                      />

                      {showHighlight && (
                        <div
                          className="absolute border-2 border-blue-500 bg-blue-500/10 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] transition-all duration-300"
                          style={{
                            left: `${currentHighlight.x}%`,
                            top: `${currentHighlight.y}%`,
                            width: `${currentHighlight.width}%`,
                            height: `${currentHighlight.height}%`,
                          }}
                        >
                          <div className="absolute -top-3 -right-3 flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold shadow-lg">
                            {currentHighlight.order}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showHighlight && (
                  <div className="mt-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/25">
                        {currentHighlight.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {currentHighlight.title}
                        </h3>
                        <p className="mt-1 text-xs sm:text-[13px] leading-5 text-slate-600 dark:text-slate-300">
                          {currentHighlight.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!showHighlight && (
                  <div className="mt-4">
                    <p className="text-[14px] sm:text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                      {step.description}
                    </p>
                  </div>
                )}

                {step.tip && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60">
                    <div className="flex items-start gap-3">
                      <CircleHelp className="shrink-0 w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs sm:text-[13px] leading-5 text-blue-800 dark:text-blue-200">
                        <strong>Tip:</strong> {step.tip}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="px-5 sm:px-7 py-4 sm:py-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSkip}
                disabled={isProcessing}
                className="px-1 py-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 transition"
              >
                Skip tour
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                {totalHighlights > 0 && (
                  <div className="hidden sm:flex items-center gap-1 mr-2">
                    {currentHighlights.map((_, index) => (
                      <div
                        key={index}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          index === currentHighlightIndex
                            ? 'w-4 bg-blue-500'
                            : index < currentHighlightIndex
                            ? 'bg-blue-300'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBack}
                  disabled={(isFirstStep && currentHighlightIndex === 0) || isProcessing}
                  className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextHighlight}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-2 min-w-[120px] px-4 sm:px-5 py-2.5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-slate-950/10 dark:shadow-white/10 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition"
                >
                  {isLastStep && isLastHighlightOfStep ? (
                    <>
                      <Check className="w-4 h-4" />
                      Done
                    </>
                  ) : (
                    <>
                      {isLastHighlightOfStep ? 'Next Section' : 'Understand'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Tutorial;
