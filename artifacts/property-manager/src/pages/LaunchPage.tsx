import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import SEO from '@/components/SEO'

const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
}

const logoVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8 },
  },
}

const pulseVariants = {
  hidden: { opacity: 0.3, scale: 0.98 },
  visible: {
    opacity: [0.3, 0.6, 0.3],
    scale: [0.98, 1.02, 0.98],
    transition: {
      duration: 3,
      repeat: Infinity,
    },
  },
}

export default function LaunchPage() {
  const reducedMotion = prefersReducedMotion()

  const containerTransition = reducedMotion
    ? { opacity: { duration: 0 } }
    : containerVariants

  const itemTransition = reducedMotion
    ? { opacity: { duration: 0 }, y: { duration: 0 } }
    : itemVariants

  return (
    <>
      <SEO
        title="Launching Soon"
        description="LIVAREX is launching soon. We're putting the finishing touches on our platform and preparing for launch this Wednesday."
        url="/"
      />

      <div className="min-h-screen w-full bg-gradient-to-br from-white via-blue-50 to-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        {/* Animated background gradient blob */}
        {!reducedMotion && (
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          </div>
        )}

        <motion.div
          className="max-w-2xl mx-auto w-full text-center space-y-8 sm:space-y-10"
          initial={reducedMotion ? 'visible' : 'hidden'}
          animate="visible"
          variants={containerTransition}
        >
          {/* Logo */}
          <motion.div
            className="flex justify-center"
            initial={reducedMotion ? 'visible' : 'hidden'}
            animate="visible"
            variants={reducedMotion ? {} : logoVariants}
          >
            <div className="relative">
              <img
                src="/livarex-logo.png"
                alt="LIVAREX"
                className="h-16 w-auto md:h-20"
              />
              {!reducedMotion && (
                <motion.div
                  className="absolute inset-0"
                  variants={pulseVariants}
                  initial="hidden"
                  animate="visible"
                />
              )}
            </div>
          </motion.div>

          {/* Main headline */}
          <motion.div
            className="space-y-3 sm:space-y-4"
            initial={reducedMotion ? 'visible' : 'hidden'}
            animate="visible"
            variants={reducedMotion ? {} : itemTransition}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent">
                Something Great
              </span>
              <br />
              <span className="text-slate-900">Is Almost Here</span>
            </h1>
          </motion.div>

          {/* Supporting message */}
          <motion.p
            className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl mx-auto"
            initial={reducedMotion ? 'visible' : 'hidden'}
            animate="visible"
            variants={reducedMotion ? {} : itemTransition}
          >
            We're putting the finishing touches on our platform and preparing for launch.
          </motion.p>

          {/* Launch info */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 py-4 sm:py-6"
            initial={reducedMotion ? 'visible' : 'hidden'}
            animate="visible"
            variants={reducedMotion ? {} : itemTransition}
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="text-emerald-700 font-medium text-sm sm:text-base">
                Official launch: Wednesday
              </span>
            </div>
          </motion.div>

          {/* Call-to-action status */}
          <motion.div
            className="space-y-4 sm:space-y-6 pt-4 sm:pt-6"
            initial={reducedMotion ? 'visible' : 'hidden'}
            animate="visible"
            variants={reducedMotion ? {} : itemTransition}
          >
            <div className="inline-block">
              <button
                disabled
                className="px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-md opacity-70 cursor-default text-base sm:text-lg"
              >
                Launching Soon
              </button>
            </div>
          </motion.div>

          {/* Footer message */}
          <motion.div
            className="pt-8 sm:pt-12 border-t border-slate-200"
            initial={reducedMotion ? 'visible' : 'hidden'}
            animate="visible"
            variants={reducedMotion ? {} : itemTransition}
          >
            <p className="text-sm sm:text-base text-slate-500">
              Thank you for your interest in LIVAREX. We can't wait to launch!
            </p>
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-blob {
            animation: none;
          }
        }
      `}</style>
    </>
  )
}
