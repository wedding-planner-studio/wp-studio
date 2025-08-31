'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const FeatureGridSection = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const sectionHeight = rect.height;

      // Calculate when the section starts to be visible
      const sectionTop = rect.top;
      const sectionBottom = rect.bottom;

      // Start animation when section is 80% visible from bottom
      const startTrigger = windowHeight * 0.8;

      if (sectionBottom < 0 || sectionTop > windowHeight) {
        // Section is not visible
        setScrollProgress(0);
        return;
      }

      let progress = 0;

      if (sectionTop <= startTrigger && sectionBottom >= 0) {
        // Calculate progress based on how much the section has moved up
        const visibleHeight = Math.min(sectionBottom, windowHeight) - Math.max(sectionTop, 0);
        const maxProgress = Math.min(sectionHeight, windowHeight * 0.6);
        progress = Math.max(0, Math.min(1, visibleHeight / maxProgress));
      }

      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="mapa" ref={sectionRef} className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Card - Seat Assignment */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 ease-out group">
              <div className="p-2 pt-8">
                <div className="px-6 pb-0">
                  <h3 className="text-xl text-purple-600 font-medium mb-4">
                    Mapa de asientos visual
                  </h3>
                  <p className="text-gray-500 mb-8 leading-relaxed">
                    Deja que los novios asignen lugares con solo arrastrar y soltar. Tú te ahorras
                    horas de logística.
                  </p>
                </div>

                {/* Dashboard Image with Sliding Notes */}
                <div className="bg-gray-50 border border-b-white rounded-2xl overflow-hidden relative transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 ease-out h-80">
                  <Image
                    src="/seat-assignment-screenshot.png"
                    alt="Panel de control de Evana mostrando asignación de asientos y organización de mesas"
                    width={1000}
                    height={1000}
                    className="w-full h-full object-cover object-top"
                  />

                  {/* Sliding Notes - appear based on scroll progress */}
                  <div
                    className="absolute top-4 right-4 space-y-2 transition-all duration-700 ease-out"
                    style={{
                      transform: `translateX(${100 - scrollProgress * 100}%)`,
                      opacity: scrollProgress > 0.3 ? 1 : 0,
                    }}
                  >
                    <div
                      className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg transition-all duration-500 ease-out"
                      style={{
                        transform: `translateY(${20 - scrollProgress * 20}px)`,
                        transitionDelay: '200ms',
                      }}
                    >
                      <div className="text-xs text-gray-600 font-medium">Mesa 1</div>
                      <div className="text-xs text-amber-600">🥜 Alérgico a nueces</div>
                    </div>
                    <div
                      className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg transition-all duration-500 ease-out"
                      style={{
                        transform: `translateY(${20 - scrollProgress * 20}px)`,
                        transitionDelay: '400ms',
                      }}
                    >
                      <div className="text-xs text-gray-600 font-medium">Mesa 10</div>
                      <div className="text-xs text-purple-600">💍 &quot;You&apos;re next&quot;</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card - Import Feature */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 ease-out">
              <div className="p-2 pt-8">
                <div className="px-6 pb-0">
                  <h3 className="text-xl text-purple-600 font-medium mb-4">
                    Trabajas en Excel. Nosotros también.
                  </h3>
                  <p className="text-gray-500 mb-2 leading-relaxed">
                    Sube tu archivo, haz cambios desde la app y vuelve a bajarlo cuando lo
                    necesites.
                  </p>
                  <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                    Nos adaptamos a tu flujo de trabajo actual.
                  </p>
                </div>

                {/* Download Interface */}
                <div className="bg-gray-50 border border-b-white rounded-2xl overflow-hidden relative transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 ease-out h-80">
                  <Image
                    src="/download-guests-popover.png"
                    alt="Interfaz de descarga de invitados mostrando opciones de exportación en Excel y CSV"
                    width={1000}
                    height={1000}
                    className="w-full h-full object-cover object-center"
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

export default FeatureGridSection;
