'use client';

import React from 'react';
import { Wrench } from 'lucide-react';

export default function Tools() {
  return (
    <section id="tools" className="bg-gradient-to-b from-white via-purple-50/20 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center bg-purple-50 text-purple-600 px-4 py-2 rounded-full text-sm font-medium mb-6 relative overflow-hidden">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-purple-300/30 to-transparent animate-[spin_6s_linear_infinite] blur-sm"></div>
            <Wrench className="h-4 w-4 mr-2 relative z-10" />
            <span className="relative z-10">Herramientas profesionales</span>
          </div>

          {/* Main Heading */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-gray-900 leading-tight">
            Herramientas avanzadas
            <br />
            <span className="text-purple-500">diseñadas para ti</span>
          </h2>

          {/* Description */}
          <p className="text-lg text-gray-500 max-w-3xl mx-auto leading-relaxed">
            Hemos construido herramientas especializadas que entienden las necesidades únicas de los
            wedding planners. Desde gestión de invitados hasta coordinación de eventos, cada función
            está pensada para hacer tu trabajo más eficiente.
          </p>
        </div>
      </div>
    </section>
  );
}
