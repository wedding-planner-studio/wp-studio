'use client';

import React, { useState, useEffect } from 'react';
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

const ProductivitySection = () => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('es-MX', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar Card */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden col-span-1 group hover:shadow-lg transition-all duration-300 ease-out">
              <div className="p-2 pt-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 px-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-purple-600 font-medium">Minuto a Minuto</span>
                  </div>
                  <div className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs font-medium">
                    Próximamente
                  </div>
                </div>

                {/* Title and Description */}
                <h2 className="text-xl font-normal text-gray-900 mb-4 px-6">
                  WP Studio organiza tu evento.
                </h2>
                <p className="text-zinc-400 mb-8 font-light tracking-wide px-6">
                  Cronograma automático de actividades, confirmaciones y recordatorios para el día
                  perfecto.
                </p>

                {/* Calendar Interface */}
                <div className="bg-gray-50 rounded-2xl relative overflow-hidden border h-[250px]">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between relative z-10 p-3">
                    <div className="flex items-center space-x-2 scale-70">
                      <ChevronLeft className="h-4 w-4 text-gray-500 cursor-pointer hover:text-gray-700" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        Día Anterior
                      </span>
                    </div>

                    {/* Current Time Display */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out scale-70">
                      <span className="text-sm font-medium text-gray-900">{currentTime}</span>
                    </div>

                    <div className="flex items-center space-x-2 scale-70">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        Día Siguiente
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-500 cursor-pointer hover:text-gray-700" />
                    </div>
                  </div>

                  {/* Time Tracker Line */}
                  <div className="absolute left-0 w-full h-full pointer-events-none z-20">
                    <div className="relative h-full">
                      <div className="absolute top-0 left-1/2 w-[0px] group-hover:w-[1px] h-[400px] bg-red-400 transform -translate-x-0.5 translate-x-[-190px] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                    </div>
                  </div>

                  {/* Events */}
                  <div className="relative z-10 transform group-hover:-translate-x-4 transition-transform duration-500 ease-out scale-70 -translate-y-10">
                    {/* Past Event - Grayed Out */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-200 opacity-60 mb-4 transform translate-x-[-100px]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-500 line-through mb-1">
                            Ensayo - Iglesia San José
                          </div>
                          <span className="text-xs text-gray-400">2:00 PM - 4:00 PM</span>
                        </div>
                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    {/* Current Appointment */}
                    <div className="bg-blue-100 rounded-2xl p-4 border border-blue-200 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              Ceremonia - Ana & Luis
                            </div>
                            <span className="text-xs text-gray-600">4:00 PM - 5:30 PM</span>
                          </div>
                        </div>
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>

                    {/* Next Appointment */}
                    <div className="bg-green-100 rounded-2xl p-4 border border-green-200 transform translate-x-[100px]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              Recepción - Jardín Botánico
                            </div>
                            <span className="text-xs text-gray-600">6:00 PM - 11:00 PM</span>
                          </div>
                        </div>
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Data Management Card */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden group col-span-2 hover:shadow-lg transition-all duration-300 ease-out">
              <div className="px-2 pt-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 px-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-purple-500 font-medium">Lista de Invitados</span>
                  </div>
                </div>

                {/* Title and Description */}
                <h2 className="text-xl font-normal text-gray-900 mb-4 px-6">
                  Gestión completa de invitados.
                </h2>
                <p className="text-zinc-400 mb-8 font-light tracking-wide px-6">
                  WP Studio organiza automáticamente confirmaciones, restricciones alimenticias y
                  asignación de mesas.
                </p>

                {/* Customer Management Interface */}
                <div className="bg-gray-50 border border-b-white rounded-2xl overflow-hidden relative transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 ease-out h-80">
                  <img
                    src="/dashboard-scrceenshot.png"
                    alt="Customer Management Dashboard"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductivitySection;
