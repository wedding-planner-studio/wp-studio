'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck } from 'lucide-react';
import { Button } from '../ui';
import { BOOK_A_MEETING_URL } from '@/lib/constants';

const Hero = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Content */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-purple-50 text-purple-600 px-4 py-2 rounded-full text-sm font-medium mb-6 relative overflow-hidden">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-purple-300/30 to-transparent animate-[spin_6s_linear_infinite] blur-sm"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[spin_5s_linear_infinite] blur-xs"></div>
            <span className="relative z-10">¿Aún envías invitaciones una por una?</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-gray-900 mb-6 leading-tight">
            Tu empleado digital <br />
            para <span className="text-purple-500">bodas perfectas</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            Automatiza invitaciones, confirmaciones y atención a invitados. Perfecto para wedding
            planners, organizadores de eventos y parejas que buscan una experiencia moderna.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/admin/events">
              <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-4 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 group">
                <span>Crea tu primer evento</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </Link>
            <Link href={BOOK_A_MEETING_URL} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="text-gray-600 px-6 py-3 font-medium hover:text-gray-900 transition-all duration-300 flex items-center space-x-2"
              >
                <CalendarCheck className="h-4 w-4" />
                <span>Reserva una demo</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Messaging Card */}
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 ease-out">
            <div className="p-2 pt-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 px-6">
                <div className="flex items-center space-x-3">
                  <span className="text-purple-500 font-medium">Invitaciones</span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>

              {/* Title and Description */}
              <h3 id="rsvp" className="text-xl font-normal text-gray-900 mb-4 px-6">
                Envío de invitaciones + RSVP
              </h3>
              <p className="text-gray-500 mb-8 leading-relaxed px-6">
                Envía más de 500 invitaciones con un click y confirma asistencias automáticamente.
              </p>

              <div className="bg-gray-50 border rounded-2xl relative overflow-hidden">
                <div className="p-4 relative h-48">
                  {/* Main Stats Display */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 text-center relative z-30">
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <span className="text-sm font-medium text-gray-900">
                        Todo desde tu propio número
                      </span>
                    </div>

                    <div className="text-3xl font-bold text-gray-900 mb-1">500+</div>
                    <div className="text-sm text-gray-500 mb-3">Invitaciones enviadas</div>

                    {/* Progress indicator */}
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse"></div>
                      <span className="text-xs text-purple-600 font-medium">
                        Con tu marca personal
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Asistente IA */}
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 ease-out">
            <div className="p-2 pt-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 px-6">
                <div className="flex items-center space-x-3">
                  <span className="text-purple-500 font-medium">Asistente IA</span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>

              {/* Title and Description */}
              <h3 className="text-xl font-normal text-gray-900 mb-4 px-6">
                Atención 24/7 personalizada.
              </h3>
              <p className="text-gray-500 mb-8 leading-relaxed px-6">
                Responde dudas de invitados con empatía y conocimiento del evento.
              </p>

              {/* Calendar Interface */}
              <div className="bg-gray-50 border rounded-2xl relative overflow-hidden">
                <div className="p-4 h-56">
                  {/* Background Cards Stack */}
                  <div className="absolute inset-0 p-2">
                    {/* Card 1 - Front */}
                    <div className="absolute top-2 left-2 right-0 bg-white rounded-xl shadow-lg border border-gray-100 transform rotate-0 z-30">
                      <div className="p-3">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-xs font-medium text-gray-900">Carlos Ruiz</span>
                          <span className="text-xs text-gray-400">ahora</span>
                        </div>
                        <div className="space-y-2">
                          <div className="bg-gray-100 rounded-lg px-3 py-2">
                            <p className="text-xs text-gray-800">
                              ¿A qué hora empieza la ceremonia?
                            </p>
                          </div>
                          <div className="bg-purple-500 text-white rounded-lg px-3 py-2 ml-6">
                            <p className="text-xs">
                              La ceremonia inicia a las 4:00 PM en el Jardín Botánico ⛪️
                            </p>
                          </div>
                          <div className="bg-gray-100 rounded-lg px-3 py-2">
                            <p className="text-xs text-gray-800">¿Y el dress code?</p>
                          </div>
                          <div className="bg-purple-500 text-white rounded-lg px-3 py-2 ml-6 flex items-center">
                            <div className="flex-1">
                              <p className="text-xs">Formal elegante. Evita colores blancos 👔</p>
                            </div>
                            <div className="ml-2">
                              <div className="w-2 h-2 rounded-full bg-white/60"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gestión Card */}
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 ease-out">
            <div className="p-2 pt-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 px-6">
                <div className="flex items-center space-x-3">
                  <span className="text-purple-500 font-medium">Gestión</span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>

              {/* Title and Description */}
              <h3 className="text-xl font-normal text-gray-900 mb-4 px-6">
                Control total del evento.
              </h3>
              <p className="text-gray-500 mb-8 leading-relaxed px-6">
                Métricas en tiempo real, mapa de asientos y comunicación centralizada.
              </p>

              {/* Customer Management Interface */}
              <div className="bg-gray-50 border rounded-2xl relative overflow-hidden">
                <div className="p-4 relative h-48">
                  {/* Attendance Overview */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 text-center relative z-30">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Estado de Invitaciones</h4>
                      <span className="text-xs text-gray-500">127 enviadas</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full relative"
                        style={{ width: '68%' }}
                      >
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2 rounded-r-full absolute right-0"
                          style={{ width: '25%' }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-semibold text-purple-600">86</div>
                        <div className="text-xs text-gray-500">Confirmados</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-yellow-600">24</div>
                        <div className="text-xs text-gray-500">Pendientes</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-red-500">17</div>
                        <div className="text-xs text-gray-500">No asisten</div>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Activity - positioned at bottom */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          3 nuevas restricciones alimenticias
                        </span>
                        <span className="text-xs text-gray-400">5 min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified custom keyframes */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Hero;
