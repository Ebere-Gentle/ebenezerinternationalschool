import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2,
  ArrowRight,
  Shield,
  CheckCircle,
  Globe,
  Zap,
  Sparkles,
  Fingerprint,
  User,
  GraduationCap,
  Building2,
  Award,
  Users,
  School,
  Star,
  Rocket,
  Crown,
  Heart,
  Sun,
  Moon,
  Cloud,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

// Import images
import loginBg from '../../assets/login-bg.jpg';
import schoolLogo from '../../assets/school-logo.png';

// Floating particles
const particles = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 4 + 2,
  duration: Math.random() * 20 + 10,
  delay: Math.random() * 10,
  opacity: Math.random() * 0.3 + 0.1,
}));

// Floating stats
const floatingStats = [
  { icon: Users, value: '12,000+', label: 'Students', color: 'from-blue-400 to-cyan-500' },
  { icon: GraduationCap, value: '350+', label: 'Teachers', color: 'from-purple-400 to-pink-500' },
  { icon: Award, value: '98%', label: 'Success Rate', color: 'from-green-400 to-emerald-500' },
  { icon: Building2, value: '4', label: 'Branches', color: 'from-orange-400 to-red-500' },
];

// Features for the interactive carousel
const features = [
  { icon: Rocket, title: 'AI-Powered Learning', desc: 'Personalized learning paths for every student' },
  { icon: Shield, title: 'Secure Platform', desc: 'Enterprise-grade security with 256-bit encryption' },
  { icon: Heart, title: 'Parent Engagement', desc: 'Real-time updates and communication with parents' },
  { icon: Crown, title: 'Academic Excellence', desc: 'Track and improve student performance' },
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Auto-rotate features
  useEffect(() => {
    if (!isHovering) {
      const interval = setInterval(() => {
        setCurrentFeature((prev) => (prev + 1) % features.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isHovering]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePosition({ x, y });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const user = await login(formData.email, formData.password);
      
      const roleMap: Record<string, string> = {
        admin: '/admin/dashboard',
        teacher: '/teacher/dashboard',
        student: '/student/dashboard',
        parent: '/parent/dashboard',
        director: '/admin/dashboard',
      };
      
      const redirectPath = roleMap[user.role] || '/dashboard';
      navigate(redirectPath);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div 
      className="min-h-screen w-full overflow-hidden relative"
      onMouseMove={handleMouseMove}
    >
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
        style={{
          backgroundImage: `url(${loginBg})`,
          filter: 'blur(2px) brightness(0.4) saturate(0.8)',
        }}
      />
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-pink-900/40" />
      
      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-white"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              opacity: particle.opacity,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 20, 0],
              opacity: [particle.opacity, particle.opacity * 2, particle.opacity],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Left Side - Branding with Interactive Elements */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Logo with Animation */}
            <motion.div
              whileHover={{ scale: 1.02, rotate: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
                <motion.img 
                  src={schoolLogo} 
                  alt="Ebenezer International School" 
                  className="h-20 md:h-24 w-auto brightness-0 invert drop-shadow-2xl mx-auto lg:mx-0"
                  animate={{
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                {/* Glow effect */}
                <motion.div
                  className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </motion.div>

            {/* Feature Carousel */}
            <div 
              className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFeature}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-start gap-4"
                >
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                    {React.createElement(features[currentFeature].icon, {
                      className: "w-6 h-6 text-blue-400"
                    })}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {features[currentFeature].title}
                    </h3>
                    <p className="text-sm text-white/60 mt-1">
                      {features[currentFeature].desc}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Dots indicator */}
              <div className="flex gap-1.5 mt-4">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentFeature 
                        ? 'w-8 bg-gradient-to-r from-blue-400 to-purple-400' 
                        : 'w-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Floating Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {floatingStats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  whileHover={{ 
                    scale: 1.05,
                    y: -5,
                    transition: { type: "spring", stiffness: 300 }
                  }}
                  className="bg-white/5 backdrop-blur-xl rounded-xl p-3 border border-white/10 text-center"
                >
                  <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-20`}>
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-lg font-bold text-white mt-1">{stat.value}</p>
                  <p className="text-xs text-white/50">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { icon: Shield, label: '256-bit Encryption' },
                { icon: CheckCircle, label: 'Secure Login' },
                { icon: Globe, label: 'SSL Certified' },
                { icon: Zap, label: '99.99% Uptime' },
              ].map((badge, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-xs text-white/70"
                >
                  <badge.icon className="w-3 h-3" />
                  {badge.label}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Glassmorphic Login Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
          >
            <div className="relative">
              {/* Animated border glow */}
              <motion.div
                className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 blur-xl"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Login Card */}
              <div className="relative bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                {/* Card header with animated icon */}
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.6 }}
                    className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20"
                  >
                    <School className="w-5 h-5 text-blue-400" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Welcome Back</h2>
                    <p className="text-sm text-white/50">Sign in to continue your journey</p>
                  </div>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <label className="block text-sm font-medium text-white/70 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder:text-white/30 outline-none"
                        placeholder="Enter your email"
                        required
                      />
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        initial={false}
                      />
                    </div>
                  </motion.div>

                  {/* Password */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <label className="block text-sm font-medium text-white/70 mb-1.5">
                      Password
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full h-12 pl-11 pr-12 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder:text-white/30 outline-none"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        initial={false}
                      />
                    </div>
                  </motion.div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <motion.label 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-2 text-sm text-white/60 cursor-pointer group"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.rememberMe}
                          onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                          formData.rememberMe 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 border-transparent' 
                            : 'border-white/20 group-hover:border-white/40'
                        }`}>
                          {formData.rememberMe && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-white" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                      Remember me
                    </motion.label>
                    <motion.button
                      whileHover={{ scale: 1.05, x: 2 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Forgot Password?
                    </motion.button>
                  </div>

                  {/* Sign In Button */}
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-full h-12 rounded-xl font-medium text-white overflow-hidden group"
                  >
                    {/* Animated gradient background */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                      }}
                      transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ backgroundSize: '200% 200%' }}
                    />
                    
                    {/* Hover overlay */}
                    <motion.div
                      className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={false}
                    />
                    
                    {/* Button content */}
                    <span className="relative flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <span>Sign In</span>
                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </motion.div>
                        </>
                      )}
                    </span>
                  </motion.button>
                </form>

                {/* Divider with animated line */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-transparent text-white/40">or continue with</span>
                  </div>
                </div>

                {/* Quick access buttons */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Student', icon: User },
                    { label: 'Teacher', icon: GraduationCap },
                    { label: 'Parent', icon: Heart },
                  ].map((role) => (
                    <motion.button
                      key={role.label}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const emails: Record<string, string> = {
                          'Student': 'student@Ebenezerinternational.edu.ng',
                          'Teacher': 'teacher@Ebenezerinternational.edu.ng',
                          'Parent': 'parent@Ebenezerinternational.edu.ng',
                        };
                        setFormData({ ...formData, email: emails[role.label] || '' });
                        toast.success(`Quick login as ${role.label}`);
                      }}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                    >
                      <role.icon className="w-4 h-4 text-white/40 group-hover:text-white/80 transition-colors" />
                      <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
                        {role.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                  <p className="text-xs text-white/30">
                    © {new Date().getFullYear()} Ebenezer International School
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;