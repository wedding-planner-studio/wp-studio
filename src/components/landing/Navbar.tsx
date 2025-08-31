'use client';
import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { BOOK_A_MEETING_URL } from '@/lib/constants';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed w-full z-50 px-4 sm:px-6 lg:px-8 pt-6">
      <nav
        className={`max-w-7xl mx-auto rounded-full transition-all duration-500 ${isScrolled ? 'opacity-95 bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50' : 'bg-white/95 backdrop-blur-sm border border-gray-200/30'}`}
      >
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center">
              <Link
                href="/"
                className="flex items-center space-x-2 transform hover:scale-110 transition-transform duration-300"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Chat bubble */}
                    <path
                      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      fill="white"
                    />
                    {/* Checkmark */}
                    <path
                      d="M9 11l2 2 4-4"
                      stroke="#6366f1"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="font-bold text-gray-900 hidden sm:block text-lg">wpstudio</span>
              </Link>
              <div className="hidden md:block ml-10">
                <div className="flex items-center space-x-8">
                  <div className="relative group">
                    <button
                      aria-haspopup="true"
                      aria-expanded="false"
                      className="text-gray-600 hover:text-gray-900 flex items-center space-x-1 text-sm transition-colors duration-300"
                    >
                      <span>Servicios</span>
                      <ChevronDown className="h-4 w-4 transform group-hover:rotate-180 transition-transform duration-300" />
                    </button>
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-20 invisible group-hover:visible transition-all duration-300 opacity-0 group-hover:opacity-100 border border-gray-100">
                      <Link
                        href="#rsvp"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Envío de Invitaciones
                      </Link>
                      <Link
                        href="#rsvp"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Confirmaciones RSVP
                      </Link>
                      <Link
                        href="#tools"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Gestión de Invitados
                      </Link>
                      <Link
                        href="#empleado-ia"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Empleado IA 24/7
                      </Link>
                      <Link
                        href="#mapa"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Mapa de asientos
                      </Link>
                    </div>
                  </div>
                  <Link
                    href="#book-a-meeting"
                    className="text-gray-600 hover:text-gray-900 text-sm transition-colors duration-300"
                  >
                    Contacto
                  </Link>
                  <Link
                    href={BOOK_A_MEETING_URL}
                    className="text-gray-600 hover:text-gray-900 text-sm transition-colors duration-300"
                  >
                    Reserva tu demo
                  </Link>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <SignedOut>
                <Link
                  href="/sign-in"
                  className="text-gray-600 hover:text-gray-900 text-sm transition-colors duration-300"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href={BOOK_A_MEETING_URL}
                  className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-purple-600 transition-all duration-300 hover:scale-105 transform"
                >
                  Contáctanos
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/admin/events"
                  className="text-gray-600 hover:text-gray-900 text-sm transition-colors duration-300"
                >
                  Dashboard
                </Link>
                <div className="ml-2">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>
            </div>
            <div className="md:hidden flex items-center">
              <SignedIn>
                <div className="mr-4">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-600 hover:text-gray-900 p-2 transition-colors duration-300"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div
        className={`md:hidden mt-4 bg-white/95 backdrop-blur-sm rounded-2xl transition-all duration-300 transform border border-gray-200/50 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Link
            href="#servicios"
            className="text-gray-600 hover:text-gray-900 block px-3 py-2 text-base transition-colors duration-300"
          >
            Servicios
          </Link>
          <Link
            href="#funciones"
            className="text-gray-600 hover:text-gray-900 block px-3 py-2 text-base transition-colors duration-300"
          >
            Funciones
          </Link>
          <Link
            href="#precios"
            className="text-gray-600 hover:text-gray-900 block px-3 py-2 text-base transition-colors duration-300"
          >
            Precios
          </Link>
          <Link
            href="#testimonios"
            className="text-gray-600 hover:text-gray-900 block px-3 py-2 text-base transition-colors duration-300"
          >
            Casos de Éxito
          </Link>
          <Link
            href="#contacto"
            className="text-gray-600 hover:text-gray-900 block px-3 py-2 text-base transition-colors duration-300"
          >
            Contacto
          </Link>

          <SignedOut>
            <Link
              href="/sign-in"
              className="text-gray-600 hover:text-gray-900 block px-3 py-2 text-base transition-colors duration-300"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/sign-up"
              className="bg-purple-500 text-white block px-3 py-2 rounded-lg text-base text-center font-medium mt-4 hover:bg-purple-600 transition-all duration-300 hover:scale-105 transform"
            >
              Contáctanos
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 block px-3 py-2 text-base transition-colors duration-300"
            >
              Dashboard
            </Link>
          </SignedIn>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
