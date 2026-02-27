'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import {
  ArrowRight,
  Star,
  TrendingUp,
  Package,
  Gift,
  Calculator,
  BarChart3,
  Clock,
  Shield,
  CheckCircle
} from 'lucide-react';
import { AuthModal } from '@/modules/auth';
import { Header } from '@/shared/components/landing/Header';

export function HardcodedLanding() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  const handleGetStarted = () => {
    setAuthModalOpen(true);
  };

  const handleSignOut = () => {
    // TODO: Implementar logout
    setUser(null);
  };

  const featuresData = [
    {
      icon: Package,
      title: "Gestión de Inventario",
      description: "Control total de tu inventario con alertas automáticas, seguimiento en tiempo real y reportes detallados.",
      color: "from-purple-500 to-indigo-500"
    },
    {
      icon: Calculator,
      title: "Contabilidad Automatizada",
      description: "Automatiza tus procesos contables con facturación inteligente y conciliación bancaria automática.",
      color: "from-pink-500 to-purple-500"
    },
    {
      icon: BarChart3,
      title: "Reportes Avanzados",
      description: "Dashboards interactivos con métricas clave para tomar decisiones informadas sobre tu negocio.",
      color: "from-indigo-500 to-cyan-500"
    },
    {
      icon: Clock,
      title: "Tiempo Real",
      description: "Sincronización instantánea de datos entre todos los módulos para información siempre actualizada.",
      color: "from-blue-500 to-purple-500"
    },
    {
      icon: Shield,
      title: "Seguridad Avanzada",
      description: "Protección de datos con encriptación de nivel bancario y copias de seguridad automáticas.",
      color: "from-purple-500 to-pink-500"
    }
  ];

  const benefitsData = [
    "Soporte técnico especializado",
    "Actualizaciones automáticas incluidas",
    "Capacitación personalizada",
    "Integración con DIAN"
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <Header
        user={user}
        onLoginClick={handleGetStarted}
        onSignOut={handleSignOut}
      />

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 py-20 md:py-28 bg-gray-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-8 text-center lg:text-left"
            >
              <div className="space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-700"
                >
                  <Star className="w-4 h-4 text-yellow-500 mr-2" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Software #1 para MiPymes</span>
                </motion.div>

                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
                  <span className="text-slate-900 dark:text-white">
                    Revoluciona tu
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Contabilidad
                  </span>
                </h1>

                <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Software contable especializado para MiPymes con gestión inteligente de inventario. Automatiza tu contabilidad y toma el control total de tu negocio.
                </p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="inline-flex items-center gap-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700"
                >
                  <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-green-700 dark:text-green-300">¡100% para pequeños emprendedores!</span>
                </motion.div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-lg px-8 py-6"
                >
                  Comenzar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

            </motion.div>

            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative hidden lg:block"
            >
              <div className="relative z-10">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 text-white">
                    <div className="space-y-4">
                      <div className="h-8 w-3/4 bg-white/20 rounded animate-pulse"></div>
                      <div className="h-4 w-1/2 bg-white/20 rounded animate-pulse"></div>
                      <div className="grid grid-cols-2 gap-4 mt-8">
                        <div className="bg-white/10 p-4 rounded-lg">
                          <div className="h-4 w-16 bg-white/20 rounded mb-2"></div>
                          <div className="h-8 w-24 bg-white/30 rounded"></div>
                        </div>
                        <div className="bg-white/10 p-4 rounded-lg">
                          <div className="h-4 w-16 bg-white/20 rounded mb-2"></div>
                          <div className="h-8 w-24 bg-white/30 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-6 -right-6 bg-blue-600 p-4 rounded-2xl shadow-xl"
              >
                <TrendingUp className="w-8 h-8 text-white" />
              </motion.div>

              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-6 -left-6 bg-indigo-600 p-4 rounded-2xl shadow-xl"
              >
                <Package className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-4 sm:px-6 py-20 bg-white dark:bg-black/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Funcionalidades Poderosas
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Todo lo que necesitas para gestionar tu MiPyme de manera eficiente y profesional
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuresData.map((feature, index) => {
              const IconComponent = feature.icon;

              return (
                <motion.div
                  key={index}
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="relative p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 h-full">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 bg-gradient-to-r ${feature.color}`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>

                    <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </h3>

                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="relative px-4 sm:px-6 py-20 bg-gray-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-12 text-white aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl font-bold mb-4">30</div>
                    <div className="text-2xl font-semibold">Días de prueba gratis</div>
                    <p className="text-blue-100 mt-2">Sin tarjeta de crédito</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 100, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    ¿Por qué elegir Contagracia?
                  </span>
                </h2>
                <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                  La solución completa para pequeñas y medianas empresas colombianas
                </p>
              </div>

              <div className="space-y-6">
                {benefitsData.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ x: 50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start space-x-4"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-lg text-slate-700 dark:text-slate-200 font-medium">{benefit}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            ¿Listo para transformar tu negocio?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Únete a cientos de empresas que ya confían en Contagracia
          </p>
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-white hover:bg-gray-100 text-blue-600 border-0 text-lg px-8"
          >
            Comenzar Ahora - Gratis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-4 sm:px-6 py-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Contagracia
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Software contable especializado para MiPymes colombianas
              </p>
            </div>

            <div>
              <span className="font-semibold text-slate-900 dark:text-white mb-4 block">Producto</span>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li><a href="#features" className="hover:text-blue-600 transition-colors">Funcionalidades</a></li>
                <li><a href="#benefits" className="hover:text-blue-600 transition-colors">Beneficios</a></li>
              </ul>
            </div>

            <div>
              <span className="font-semibold text-slate-900 dark:text-white mb-4 block">Empresa</span>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Nosotros</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Contacto</a></li>
              </ul>
            </div>

            <div>
              <span className="font-semibold text-slate-900 dark:text-white mb-4 block">Legal</span>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Términos</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacidad</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 mt-12 pt-8 text-center">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              © {new Date().getFullYear()} Contagracia. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
