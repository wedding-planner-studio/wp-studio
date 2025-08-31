import React from 'react';
import Link from 'next/link';
import { BOOK_A_MEETING_URL } from '@/lib/constants';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white py-16 rounded-3xl mt-20 mb-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Logo and Social Media */}
            <div className="lg:col-span-1">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                  <svg
                    aria-hidden="true"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
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
                <span className="text-xl font-semibold">evana</span>
              </div>

              <p className="text-gray-300 text-sm mb-6 max-w-xs">
                Tu empleado digital para bodas perfectas. Automatiza invitaciones, confirmaciones y
                gestión de invitados 24/7.
              </p>

              {/* Copyright */}
              <p className="text-gray-400 text-sm">©2025 Evana. Todos los derechos reservados.</p>
            </div>

            {/* Servicios */}
            <div>
              <h3 className="text-white font-medium mb-4">Servicios</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="#rsvp" className="text-gray-300 hover:text-white transition-colors">
                    Confirmaciones RSVP
                  </Link>
                </li>
                <li>
                  <Link href="#tools" className="text-gray-300 hover:text-white transition-colors">
                    Gestión de Invitados
                  </Link>
                </li>
                <li>
                  <Link
                    href="#empleado-ia"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Asistente IA 24/7
                  </Link>
                </li>
              </ul>
            </div>

            {/* Funciones */}
            <div>
              <h3 className="text-white font-medium mb-4">Funciones</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="#rsvp" className="text-gray-300 hover:text-white transition-colors">
                    Envío Automático de Invitaciones
                  </Link>
                </li>
                <li>
                  <Link href="#rsvp" className="text-gray-300 hover:text-white transition-colors">
                    Seguimiento de Confirmaciones
                  </Link>
                </li>
                <li>
                  <Link href="#mapa" className="text-gray-300 hover:text-white transition-colors">
                    Mapa de Asientos
                  </Link>
                </li>
                <li>
                  <Link href="#tools" className="text-gray-300 hover:text-white transition-colors">
                    Restricciones Alimenticias
                  </Link>
                </li>
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <ul className="space-y-3">
                <li>
                  <Link
                    href={BOOK_A_MEETING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy-policy"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Privacidad
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
