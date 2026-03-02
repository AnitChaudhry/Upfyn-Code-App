import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ── Lightweight matrix rain canvas (30% opacity behind login) ──
function MatrixRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, columns, drops, animId;

    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFabcdef{}[]()<>=;:+-*/&|!?#@$%^~'.split('');
    const fontSize = 14;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      columns = Math.floor(w / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * -100);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < columns; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Head character — brighter
        ctx.fillStyle = `rgba(34, 197, 94, ${0.9 + Math.random() * 0.1})`;
        ctx.font = `${fontSize}px monospace`;
        ctx.fillText(char, x, y);

        // Trail — dimmer
        if (drops[i] > 1) {
          const trailChar = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillStyle = `rgba(34, 197, 94, ${0.15 + Math.random() * 0.15})`;
          ctx.fillText(trailChar, x, y - fontSize);
        }

        if (y > h && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.5 + Math.random() * 0.5;
      }

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" style={{ opacity: 0.3 }} />;
}

const LoginForm = () => {
  const [mode, setMode] = useState(null); // null = splash, 'login' = login form, 'signup' = signup form
  const [isAnimating, setIsAnimating] = useState(false);

  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Signup fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register, user: authUser } = useAuth();

  // When authUser becomes available after login/signup, save first_name for returning-user greeting
  useEffect(() => {
    if (authUser && authUser.first_name) {
      localStorage.setItem('upfynai-user-name', authUser.first_name);
    } else if (authUser && authUser.username) {
      localStorage.setItem('upfynai-user-name', authUser.username);
    }
  }, [authUser]);

  // Check for returning user name in localStorage
  const [returningName, setReturningName] = useState(null);
  useEffect(() => {
    const savedName = localStorage.getItem('upfynai-user-name');
    if (savedName) setReturningName(savedName);
  }, []);

  const handleSelect = (selected) => {
    setIsAnimating(true);
    setError('');
    setTimeout(() => {
      setMode(selected);
      setIsAnimating(false);
    }, 400);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier || !password) { setError('Please fill in all fields'); return; }
    setIsLoading(true);
    const result = await login(identifier, password);
    if (!result.success) setError(result.error);
    // Save first_name (or username) for returning-user greeting
    setIsLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !email.trim() || !signupPassword) { setError('First name, email and password are required'); return; }
    if (signupPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (signupPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email format'); return; }
    setIsLoading(true);
    const result = await register(firstName.trim(), lastName.trim(), signupPassword, email.trim(), phone.trim() || null);
    if (!result.success) setError(result.error);
    // first_name saved via useEffect on authUser change
    setIsLoading(false);
  };

  // Splash screen — big text selection
  if (mode === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden relative">
        <MatrixRain />
        <style>{`
          @keyframes fadeGrow {
            0% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(3); filter: blur(20px); }
          }
          .splash-animate {
            animation: fadeGrow 0.4s ease-out forwards;
          }
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .fade-in { animation: fadeIn 0.6s ease-out; }
        `}</style>

        <div className={`text-center relative z-10 ${isAnimating ? 'splash-animate' : 'fade-in'}`}>
          {returningName ? (
            <>
              <button
                onClick={() => handleSelect('login')}
                className="block mx-auto mb-6 focus:outline-none group"
              >
                <h1 className="text-5xl sm:text-7xl font-bold text-foreground transition-all duration-200 group-hover:text-blue-500 group-hover:scale-105 cursor-pointer">
                  Welcome, {returningName}!
                </h1>
              </button>
              <button
                onClick={() => handleSelect('signup')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
              >
                Not {returningName}? <span className="underline">Create a new account</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-8">
              <button
                onClick={() => handleSelect('signup')}
                className="focus:outline-none group"
              >
                <h1 className="text-5xl sm:text-7xl font-bold text-foreground transition-all duration-200 group-hover:text-blue-500 group-hover:scale-105 cursor-pointer">
                  Hello
                </h1>
              </button>

              <div className="w-16 h-px bg-border" />

              <button
                onClick={() => handleSelect('login')}
                className="focus:outline-none group"
              >
                <h1 className="text-5xl sm:text-7xl font-bold text-muted-foreground transition-all duration-200 group-hover:text-blue-500 group-hover:scale-105 cursor-pointer">
                  Welcome back
                </h1>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Form view
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden relative">
      <MatrixRain />
      <style>{`
        @keyframes growIn {
          0% { opacity: 0; transform: scale(0.8); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0px); }
        }
        .grow-in { animation: growIn 0.4s ease-out; }
      `}</style>

      <div
        className="fixed inset-0 z-[1] bg-background/80 backdrop-blur-md"
        onClick={() => { if (!isLoading) { setMode(null); setError(''); } }}
      />

      <div className="relative z-10 w-full max-w-md grow-in">
        <div className="bg-card rounded-xl shadow-2xl border border-border p-8 space-y-6">

          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {mode === 'login' ? (returningName ? `Welcome back, ${returningName}!` : 'Welcome back') : 'Hello, let\'s get started'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {mode === 'login' ? 'Enter your credentials' : 'Join Upfyn-Code'}
            </p>
          </div>

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email, Username, or Mobile
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your password"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button type="button" onClick={() => { setMode('signup'); setError(''); }} className="text-blue-500 hover:underline">
                  Sign Up
                </button>
              </p>
            </form>
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Doe"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Mobile <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+91 9876543210"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="At least 6 characters"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm password"
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors">
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button type="button" onClick={() => { setMode('login'); setError(''); }} className="text-blue-500 hover:underline">
                  Sign In
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
