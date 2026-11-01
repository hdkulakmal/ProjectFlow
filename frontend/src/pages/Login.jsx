import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedUser = await login(email, password);

      // Redirect based on user role
      if (loggedUser.role === 'Student') {
        navigate('/student/dashboard');
      } else if (loggedUser.role === 'Supervisor') {
        navigate('/supervisor/dashboard');
      } else if (loggedUser.role === 'Coordinator') {
        navigate('/coordinator/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
  if (!err.response) {
    setError('Cannot connect to backend server. Make sure backend is running on port 5000.');
  } else {
    const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
    setError(msg);
  }
}
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface text-on-surface">
      {/* Left Column: Campus Image & University Branding (Hidden on mobile) */}
      <div className="relative hidden lg:flex w-1/2 items-center justify-center overflow-hidden bg-primary-container">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1600&auto=format&fit=crop')`,
          }}
        />
        {/* Dark Navy Overlay */}
        <div className="absolute inset-0 bg-primary/70 backdrop-blur-[2px]" />

        {/* Content over image */}
        <div className="relative z-10 p-12 text-white max-w-lg">
          <div className="mb-6 flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">ProjectFlow</h1>
              <p className="text-surface-variant font-medium">University of Vavuniya</p>
            </div>
          </div>
          <p className="text-lg text-slate-200 leading-relaxed">
            Streamlining project management, collaboration, and documentation for students and faculty.
          </p>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-between items-center bg-surface-container-lowest p-6 lg:p-12 overflow-y-auto">
        <div className="w-full" />

        <div className="w-full max-w-md my-auto">
          {/* Mobile University Branding */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-white mb-3 shadow-md">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-primary">ProjectFlow</h1>
            <p className="text-sm text-on-surface-variant">University of Vavuniya</p>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-primary tracking-tight">Welcome Back</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Please sign in with your university credentials.
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-error">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2" htmlFor="email">
                University Email / Registration No.
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@vau.ac.lk"
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm text-on-surface transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-on-surface" htmlFor="password">
                  Password
                </label>
                <a href="#" className="text-xs font-semibold text-primary-container hover:underline">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-2.5 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm text-on-surface transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-on-surface"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-on-surface-variant">
                Remember me
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg font-semibold text-white bg-primary-container hover:bg-primary active:scale-[0.99] transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="w-full text-center py-4">
          <p className="text-xs text-on-surface-variant">
            Need help? Contact <a href="mailto:support@vau.ac.lk" className="text-primary font-semibold hover:underline">IT Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}