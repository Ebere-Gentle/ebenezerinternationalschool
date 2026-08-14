import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Key,
  Send,
  ArrowLeft,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';

import schoolLogo from '../../assets/school-logo.png';

import confusedGirl from '../../assets/first-image.png';
import appPayment from '../../assets/second-image.png';
import happyApp from '../../assets/third-image.png';
import girlsImage from '../../assets/login.png';

// ============================================================
// TYPES
// ============================================================

interface StoryImage {
  src: string;
  alt: string;
}

// ============================================================
// LOGIN COMPONENT
// ============================================================

const Login: React.FC = () => {
  const navigate = useNavigate();

  const {
    login,
    isLoading,
    isAuthenticated,
    user,
  } = useAuth();

  // ==========================================================
  // LOGIN STATE
  // ==========================================================

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================================
  // FORGOT PASSWORD STATE
  // ==========================================================

  const [showForgotPassword, setShowForgotPassword] =
    useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resettingPassword, setResettingPassword] =
    useState(false);

  const [resetError, setResetError] = useState<string | null>(
    null
  );

  // ==========================================================
  // RESET PASSWORD STATE
  // ==========================================================

  const [showResetPassword, setShowResetPassword] =
    useState(false);

  const [resetToken, setResetToken] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // ==========================================================
  // LOGIN FORM
  // ==========================================================

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  // ==========================================================
  // STORY IMAGES
  // ==========================================================

  const storyImages: StoryImage[] = [
    {
      src: confusedGirl,
      alt: 'Student overwhelmed by school fee and payment documents',
    },
    {
      src: appPayment,
      alt: 'Student being introduced to the Ebenezer International School app',
    },
    {
      src: happyApp,
      alt: 'Happy student using the Ebenezer International School app',
    },
    {
      src: girlsImage,
      alt: 'Students at Ebenezer International School',
    },
  ];

  // ==========================================================
  // STORY SETTINGS
  // ==========================================================

  const STORY_DURATION = 24 * 60 * 60 * 1000;

  const STORY_INDEX_KEY =
    'ebenezer_login_story_index';

  const STORY_TIME_KEY =
    'ebenezer_login_story_timestamp';

  // ==========================================================
  // GET INITIAL STORY
  // ==========================================================

  const getInitialStory = (): number => {
    try {
      const savedIndex =
        localStorage.getItem(STORY_INDEX_KEY);

      const savedTimestamp =
        localStorage.getItem(STORY_TIME_KEY);

      // FIRST VISIT
      if (
        savedIndex === null ||
        savedTimestamp === null
      ) {
        localStorage.setItem(
          STORY_INDEX_KEY,
          '0'
        );

        localStorage.setItem(
          STORY_TIME_KEY,
          Date.now().toString()
        );

        return 0;
      }

      const index = Number(savedIndex);
      const timestamp = Number(savedTimestamp);

      // INVALID DATA
      if (
        Number.isNaN(index) ||
        Number.isNaN(timestamp) ||
        index < 0 ||
        index >= storyImages.length
      ) {
        localStorage.setItem(
          STORY_INDEX_KEY,
          '0'
        );

        localStorage.setItem(
          STORY_TIME_KEY,
          Date.now().toString()
        );

        return 0;
      }

      // 24 HOURS EXPIRED
      const elapsed = Date.now() - timestamp;

      if (elapsed >= STORY_DURATION) {
        const nextIndex =
          (index + 1) % storyImages.length;

        localStorage.setItem(
          STORY_INDEX_KEY,
          nextIndex.toString()
        );

        localStorage.setItem(
          STORY_TIME_KEY,
          Date.now().toString()
        );

        return nextIndex;
      }

      return index;
    } catch (error) {
      console.error(
        'Unable to load login story:',
        error
      );

      return 0;
    }
  };

  // ==========================================================
  // CURRENT STORY
  // ==========================================================

  const [currentStory, setCurrentStory] =
    useState<number>(getInitialStory);

  // ==========================================================
  // CHECK STORY EXPIRATION
  // ==========================================================

  useEffect(() => {
    const checkStoryExpiration = () => {
      try {
        const timestamp = Number(
          localStorage.getItem(STORY_TIME_KEY)
        );

        const savedIndex = Number(
          localStorage.getItem(STORY_INDEX_KEY)
        );

        if (
          Number.isNaN(timestamp) ||
          Number.isNaN(savedIndex)
        ) {
          return;
        }

        const elapsed =
          Date.now() - timestamp;

        if (elapsed >= STORY_DURATION) {
          const nextIndex =
            (savedIndex + 1) %
            storyImages.length;

          localStorage.setItem(
            STORY_INDEX_KEY,
            nextIndex.toString()
          );

          localStorage.setItem(
            STORY_TIME_KEY,
            Date.now().toString()
          );

          setCurrentStory(nextIndex);
        }
      } catch (error) {
        console.error(
          'Story expiration check failed:',
          error
        );
      }
    };

    checkStoryExpiration();

    const interval = window.setInterval(
      checkStoryExpiration,
      60 * 1000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // ==========================================================
  // CURRENT / NEXT IMAGE
  // ==========================================================

  const currentImage =
    storyImages[currentStory];

  const nextStory =
    (currentStory + 1) %
    storyImages.length;

  const nextImage =
    storyImages[nextStory];

  // ==========================================================
  // PASSWORD RECOVERY TOKEN
  // ==========================================================

  useEffect(() => {
    const hashParams =
      new URLSearchParams(
        window.location.hash.substring(1)
      );

    const accessToken =
      hashParams.get('access_token');

    const type =
      hashParams.get('type');

    if (
      accessToken &&
      type === 'recovery'
    ) {
      setResetToken(accessToken);
      setShowResetPassword(true);

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      toast.info(
        'Please set your new password'
      );
    }
  }, []);

  // ==========================================================
  // REDIRECT ALREADY AUTHENTICATED USER
  // ==========================================================

  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      user &&
      !showResetPassword &&
      !showForgotPassword
    ) {
      const roleMap: Record<
        string,
        string
      > = {
        admin: '/admin/dashboard',
        teacher: '/teacher/dashboard',
        student: '/student/dashboard',
        parent: '/parent/dashboard',
        director: '/admin/dashboard',
        record_keeper: '/admin-asst/dashboard',
        admin_asst: '/admin-asst/dashboard',
        finance: '/dashboard',
        super_admin: '/dashboard',
      };

      const redirectPath =
        roleMap[user.role] ||
        '/dashboard';

      navigate(
        redirectPath,
        { replace: true }
      );
    }
  }, [
    isAuthenticated,
    isLoading,
    navigate,
    showForgotPassword,
    showResetPassword,
    user,
  ]);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setLoginError(null);

    const email =
      formData.email.trim();

    const password =
      formData.password;

    // REQUIRED FIELDS
    if (!email || !password) {
      const message =
        'Please fill in all fields';

      setLoginError(message);
      toast.error(message);

      return;
    }

    // EMAIL VALIDATION
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      const message =
        'Please enter a valid email address';

      setLoginError(message);
      toast.error(message);

      return;
    }

    // PASSWORD VALIDATION
    if (password.length < 6) {
      const message =
        'Password must be at least 6 characters';

      setLoginError(message);
      toast.error(message);

      return;
    }

    setIsSubmitting(true);

    try {
      const loggedInUser =
        await login(
          email,
          password
        );

      // ======================================================
      // ROLE REDIRECT
      // ======================================================

      const roleMap: Record<
        string,
        string
      > = {
        admin: '/admin/dashboard',
        teacher: '/teacher/dashboard',
        student: '/student/dashboard',
        parent: '/parent/dashboard',
        director: '/admin/dashboard',
        record_keeper: '/admin-asst/dashboard',
        admin_asst: '/admin-asst/dashboard',
        finance: '/dashboard',
        super_admin: '/dashboard',
      };

      const redirectPath =
        roleMap[
          loggedInUser.role
        ] || '/dashboard';

      toast.success(
        `Welcome back, ${
          loggedInUser.first_name ||
          loggedInUser.email
        }!`
      );

      navigate(
        redirectPath,
        { replace: true }
      );
    } catch (error: any) {
      console.error(
        'Login error:',
        error
      );

      let errorMessage =
        'Invalid email or password. Please try again.';

      const rawMessage =
        error?.message ||
        '';

      const message =
        rawMessage.toLowerCase();

      if (
        message.includes(
          'email not confirmed'
        )
      ) {
        errorMessage =
          'Please verify your email address before logging in. Check your inbox for the confirmation link.';
      } else if (
        message.includes(
          'invalid login credentials'
        )
      ) {
        errorMessage =
          'Invalid email or password. Please check your credentials and try again.';
      } else if (
        message.includes(
          'user not found'
        )
      ) {
        errorMessage =
          'No account found with this email address. Please check your email.';
      } else if (
        message.includes(
          'rate limit'
        )
      ) {
        errorMessage =
          'Too many login attempts. Please wait a few minutes before trying again.';
      } else if (
        message.includes(
          'network'
        )
      ) {
        errorMessage =
          'Network error. Please check your internet connection and try again.';
      } else if (
        rawMessage
      ) {
        errorMessage =
          rawMessage;
      }

      setLoginError(
        errorMessage
      );

      toast.error(
        errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================
  // FORGOT PASSWORD
  // ==========================================================

  const handleForgotPassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setResetError(null);

    const email =
      resetEmail.trim();

    if (!email) {
      const message =
        'Please enter your email address';

      setResetError(message);
      toast.error(message);

      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      const message =
        'Please enter a valid email address';

      setResetError(message);
      toast.error(message);

      return;
    }

    setResettingPassword(true);

    try {
      const {
        error,
      } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              `${window.location.origin}/login`,
          }
        );

      if (error) {
        if (
          error.message
            ?.toLowerCase()
            .includes('rate limit')
        ) {
          throw new Error(
            'Too many reset attempts. Please wait a few minutes.'
          );
        }

        throw error;
      }

      setResetSent(true);

      toast.success(
        'Password reset link sent! Check your email.'
      );
    } catch (error: any) {
      console.error(
        'Forgot password error:',
        error
      );

      const message =
        error?.message ||
        'Failed to send reset link. Please try again.';

      setResetError(message);
      toast.error(message);
    } finally {
      setResettingPassword(false);
    }
  };

  // ==========================================================
  // RESET PASSWORD
  // ==========================================================

  const handleResetPassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setResetError(null);

    if (
      !newPassword ||
      !confirmPassword
    ) {
      const message =
        'Please fill in all fields';

      setResetError(message);
      toast.error(message);

      return;
    }

    if (
      newPassword.length < 6
    ) {
      const message =
        'Password must be at least 6 characters';

      setResetError(message);
      toast.error(message);

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      const message =
        'Passwords do not match';

      setResetError(message);
      toast.error(message);

      return;
    }

    setResetting(true);

    try {
      const {
        error,
      } =
        await supabase.auth.updateUser({
          password:
            newPassword,
        });

      if (error) {
        if (
          error.message
            ?.toLowerCase()
            .includes('rate limit')
        ) {
          throw new Error(
            'Too many attempts. Please wait a few minutes.'
          );
        }

        throw error;
      }

      setResetSuccess(true);

      toast.success(
        'Password updated successfully!'
      );

      setTimeout(() => {
        setShowResetPassword(false);
        setResetSuccess(false);
        setShowForgotPassword(false);

        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
      }, 3000);
    } catch (error: any) {
      console.error(
        'Reset password error:',
        error
      );

      const message =
        error?.message ||
        'Failed to reset password. Please try again.';

      setResetError(message);
      toast.error(message);
    } finally {
      setResetting(false);
    }
  };

  // ==========================================================
  // FORGOT PASSWORD SCREEN
  // ==========================================================

  const renderForgotPassword =
    () => (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">

          <button
            onClick={() => {
              setShowForgotPassword(false);
              setResetSent(false);
              setResetError(null);
            }}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </button>

          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Key className="h-8 w-8 text-blue-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              Forgot Password?
            </h1>

            <p className="text-gray-500 mt-2">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {resetSent ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">

              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />

              <h3 className="text-lg font-semibold text-green-700">
                Check Your Email
              </h3>

              <p className="text-green-600 mt-2">
                We've sent a password reset link to{' '}
                <strong>
                  {resetEmail}
                </strong>.
              </p>

              <p className="text-sm text-green-500 mt-1">
                Click the link in the email to set a new password.
              </p>

              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSent(false);
                  setResetEmail('');
                }}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Return to Login
              </button>

            </div>
          ) : (
            <form
              onSubmit={
                handleForgotPassword
              }
              className="space-y-5"
            >

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email Address
                </label>

                <div className="relative">

                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) =>
                      setResetEmail(
                        e.target.value
                      )
                    }
                    className={`w-full h-12 rounded-lg border ${
                      resetError
                        ? 'border-red-300'
                        : 'border-gray-200'
                    } pl-11 pr-4 text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                    placeholder="Enter your email address"
                    required
                    disabled={
                      resettingPassword
                    }
                  />

                </div>

                {resetError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {resetError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  resettingPassword
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 font-semibold text-white shadow-lg shadow-blue-700/30 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {resettingPassword ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Send Reset Link
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                Remember your password?{' '}

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetError(null);
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign In
                </button>
              </p>

            </form>
          )}
        </div>
      </div>
    );

  // ==========================================================
  // RESET PASSWORD SCREEN
  // ==========================================================

  const renderResetPassword =
    () => (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 sm:p-10">

        <div className="w-full max-w-md">

          {resetSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">

              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />

              <h2 className="text-2xl font-bold text-green-700">
                Password Updated!
              </h2>

              <p className="text-green-600 mt-2">
                Your password has been successfully updated.
              </p>

              <p className="text-sm text-green-500 mt-1">
                You will be redirected to the login page...
              </p>

              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setResetSuccess(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setResetToken('');
                }}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </button>

            </div>
          ) : (
            <>

              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setResetError(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </button>

              <div className="text-center mb-8">

                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Lock className="h-8 w-8 text-green-600" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900">
                  Set New Password
                </h1>

                <p className="text-gray-500 mt-2">
                  Please enter your new password below.
                </p>

              </div>

              <form
                onSubmit={
                  handleResetPassword
                }
                className="space-y-5"
              >

                {/* NEW PASSWORD */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    New Password
                  </label>

                  <div className="relative">

                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      type={
                        showNewPassword
                          ? 'text'
                          : 'password'
                      }
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(
                          e.target.value
                        )
                      }
                      className="w-full h-12 rounded-lg border border-gray-200 pl-11 pr-12 text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Enter new password (min 6 characters)"
                      required
                      disabled={resetting}
                      minLength={6}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowNewPassword(
                          !showNewPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>

                  </div>
                </div>

                {/* CONFIRM PASSWORD */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>

                  <div className="relative">

                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(
                          e.target.value
                        )
                      }
                      className="w-full h-12 rounded-lg border border-gray-200 pl-11 pr-12 text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Confirm your new password"
                      required
                      disabled={resetting}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>

                  </div>
                </div>

                {resetError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">

                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />

                    <span>
                      {resetError}
                    </span>

                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 font-semibold text-white shadow-lg shadow-green-600/30 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
                >
                  {resetting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Update Password
                    </>
                  )}
                </button>

              </form>
            </>
          )}

        </div>
      </div>
    );

  // ==========================================================
  // LOGIN SCREEN
  // ==========================================================

  const renderLogin = () => (
    <div className="grid min-h-screen lg:grid-cols-2">

      {/* ======================================================
          LEFT SIDE
      ====================================================== */}

      <div className="relative hidden min-h-screen overflow-hidden lg:flex">

        <div className="flex h-full w-full items-center justify-center p-8 xl:p-12">

          <img
            src={currentImage.src}
            alt={currentImage.alt}
            className="max-h-[88vh] w-full max-w-2xl object-contain"
          />

        </div>

        {/* SCHOOL BRAND */}

        <div className="absolute left-8 top-8 z-20 flex items-center gap-3 rounded-full bg-white/95 px-4 py-2 shadow-md backdrop-blur-sm">

          <img
            src={schoolLogo}
            alt="Ebenezer International School"
            className="h-9 w-9 rounded-full object-contain"
          />

          <div>

            <p className="text-sm font-bold text-gray-900">
              Ebenezer International School
            </p>

            <p className="text-[10px] text-gray-500">
              School Management System
            </p>

          </div>

        </div>

        {/* NEXT STORY */}

        <div className="absolute bottom-7 right-7 z-30">

          <div className="relative overflow-hidden rounded-lg border border-white bg-white p-1 shadow-xl">

            <img
              src={nextImage.src}
              alt={nextImage.alt}
              className="h-16 w-20 object-contain rounded-md xl:h-20 xl:w-24"
            />

            <div className="absolute bottom-1 left-1 right-1 rounded bg-black/60 px-1 py-0.5 text-center">

              <span className="text-[8px] font-medium uppercase tracking-wide text-white">
                Next
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* ======================================================
          RIGHT SIDE
      ====================================================== */}

      <div className="flex min-h-screen items-center justify-center bg-white p-6 sm:p-10">

        <div className="w-full max-w-md">

          {/* LOGO */}

          <div className="mb-8 text-center">

            <img
              src={schoolLogo}
              alt="Ebenezer International School"
              className="mx-auto mb-5 h-24 w-24 rounded-full bg-white object-contain p-2 shadow-lg"
            />

            <h1 className="text-3xl font-bold text-gray-900">
              Welcome Back
            </h1>

            <p className="mt-2 text-gray-500">
              Sign in to continue to your dashboard
            </p>

            <p className="mt-1 text-xs font-medium text-blue-600">
              Ebenezer International School
            </p>

          </div>

          {/* MOBILE STORY */}

          <div className="relative mb-6 overflow-hidden rounded-xl bg-white lg:hidden">

            <img
              src={currentImage.src}
              alt={currentImage.alt}
              className="mx-auto h-auto max-h-72 w-full object-contain"
            />

            <div className="absolute bottom-3 right-3">

              <div className="rounded-md border border-white bg-white p-1 shadow-lg">

                <img
                  src={nextImage.src}
                  alt={nextImage.alt}
                  className="h-12 w-16 rounded object-contain"
                />

              </div>

            </div>

          </div>

          {/* ERROR */}

          {loginError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">

              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />

              <span>
                {loginError}
              </span>

            </div>
          )}

          {/* LOGIN FORM */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* EMAIL */}

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email Address
              </label>

              <div className="relative">

                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email:
                        e.target.value,
                    })
                  }
                  className={`h-12 w-full rounded-lg border ${
                    loginError
                      ? 'border-red-300'
                      : 'border-gray-200'
                  } pl-11 pr-4 text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                  placeholder="Enter your email"
                  required
                  disabled={
                    isSubmitting
                  }
                  autoComplete="email"
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>

              <div className="relative">

                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password:
                        e.target.value,
                    })
                  }
                  className={`h-12 w-full rounded-lg border ${
                    loginError
                      ? 'border-red-300'
                      : 'border-gray-200'
                  } pl-11 pr-12 text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                  placeholder="Enter your password"
                  required
                  disabled={
                    isSubmitting
                  }
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>

              </div>

            </div>

            {/* REMEMBER / FORGOT */}

            <div className="flex items-center justify-between">

              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">

                <input
                  type="checkbox"
                  checked={
                    formData.rememberMe
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rememberMe:
                        e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={
                    isSubmitting
                  }
                />

                Remember me

              </label>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(
                    true
                  );

                  setResetEmail('');
                  setResetError(null);
                  setResetSent(false);
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Forgot Password?
              </button>

            </div>

            {/* SIGN IN */}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                isLoading
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 font-semibold text-white shadow-lg shadow-blue-700/30 transition hover:bg-blue-800 hover:shadow-blue-700/40 disabled:cursor-not-allowed disabled:bg-blue-400"
            >

              {isSubmitting ||
              isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <span>
                    Sign In
                  </span>

                  <ArrowRight className="h-4 w-4" />
                </>
              )}

            </button>

          </form>

          {/* FOOTER */}

          <div className="mt-8 border-t border-gray-100 pt-4 text-center">

            <p className="text-xs text-gray-400">
              ©{' '}
              {new Date().getFullYear()}{' '}
              Ebenezer International School.
              All rights reserved.
            </p>

          </div>

        </div>

      </div>

    </div>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================

  if (showResetPassword) {
    return renderResetPassword();
  }

  if (showForgotPassword) {
    return renderForgotPassword();
  }

  return renderLogin();
};

export default Login;