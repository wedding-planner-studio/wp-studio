'use client';

import { Button } from '@/components/ui/button';
import ExpandingArrow from '@/components/ui/expanding-arrow';
import Image from 'next/image';
import Link from 'next/link';
import Waitlist from '@/components/Waitlist';
import AnimatedCards from '@/components/AnimatedCards';

export default function WaitlistForm() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -left-1/2 top-0 aspect-square w-[100%] opacity-[0.08] blur-[100px]
          bg-[conic-gradient(from_0deg_at_center,#9333EA_0deg,#7C3AED_72deg,#6D28D9_144deg,#5B21B6_198deg,#4C1D95_261deg,#9333EA_360deg)]"
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(147 51 234 / 0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(147 51 234 / 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo and Main Nav */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center">
                <Image
                  src="/evana_logo.png"
                  alt="Evana"
                  width={100}
                  height={28}
                  className="h-5 w-auto -translate-x-4"
                />
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link
                  href="/pricing"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Pricing
                </Link>
                <a
                  href="#whatsapp-messaging"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={e => {
                    e.preventDefault();
                    document
                      .getElementById('whatsapp-messaging')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  WhatsApp Messaging
                </a>
                <a
                  href="#ai-assistant-for-guests"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={e => {
                    e.preventDefault();
                    document
                      .getElementById('ai-assistant-for-guests')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  AI Assistant for Guests
                </a>
                <a
                  href="#automated-rsvps"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={e => {
                    e.preventDefault();
                    document
                      .getElementById('automated-rsvps')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Automated RSVPs
                </a>
                {/* 
                <Link
                  href="#"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Media
                </Link>
                <Link
                  href="#"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Communication
                </Link> */}
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-6">
              <Link
                href="/admin/events"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link
                href="https://calendar.notion.so/meet/juancasian/evana"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button>Talk to Us</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex min-h-screen flex-col relative">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[85vh] pt-24">
            {/* Left side - Hero content */}
            <div className="flex flex-col justify-center">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[#0F172A] leading-[1.1]">
                Plan your perfect
                <div className="flex flex-col mt-2">
                  <span className="text-[#9333EA]">event with evana</span>
                </div>
              </h1>
              <p className="mt-8 text-lg text-gray-600 max-w-[480px] leading-relaxed">
                Your all-in-one{' '}
                <span className="text-[#9333EA] font-semibold">Wedding Planning</span> platform.
                <span className="mt-4 text-gray-600 text-normal">
                  {' '}
                  Send updates to all your guests, let our assistant reply instantly, and watch your
                  CRM stay in sync—so you can focus on the celebration.
                </span>
              </p>
              <div className="mt-10 flex gap-4">
                <Link href="/admin/events">
                  <Button className="group pr-6">
                    Create your first Event
                    <ExpandingArrow className="-ml-1" />
                  </Button>
                </Link>
                <a
                  href="https://calendar.notion.so/meet/juancasian/evana"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="group pr-6">
                    Book a Demo
                    <ExpandingArrow className="-ml-1" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Right side - Request Access Form */}
            <div className="lg:flex items-center justify-center">
              <Waitlist />
            </div>
          </div>
        </div>
      </main>

      {/* WhatsApp Invitations Section */}
      <section id="whatsapp-messaging" className="py-20 relative overflow-hidden max-w-7xl mx-auto">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] leading-tight">
                Send invitations to all your guests{' '}
                <span className="text-[#9333EA]">in one click</span>
              </h2>
              <p className="mt-5 text-lg text-gray-600 leading-relaxed">
                Reach all your guests instantly through{' '}
                <span className="text-[#9333EA] font-semibold">WhatsApp</span>. Send personalized
                invitations, updates, and reminders effortlessly.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-[#9333EA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Bulk Messaging</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Send invitations to multiple guests simultaneously
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-[#9333EA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 5h16a1 1 0 011 1v8a1 1 0 01-1 1h-2v3l-4-3H4a1 1 0 01-1-1V6a1 1 0 011-1z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Message Templates</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Use pre-approved templates or create custom designs with our template builder
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Pre-approved templates
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Custom builder
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Rich media support
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-[#9333EA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Real-time Updates</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Keep everyone in sync with instant notifications
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-[#9333EA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Scheduled Messages</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Plan and automate your communication
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Animated Cards */}
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-purple-100 rounded-3xl transform -rotate-1"></div>
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-3xl transform rotate-1"></div>

              {/* WhatsApp Cards Stack */}
              <div className="relative p-8">
                {/* Card 1 - Bottom */}
                <div className="absolute inset-x-8 top-16 p-6 bg-white rounded-xl shadow-lg transform -rotate-3 transition-transform hover:-translate-y-2 hover:rotate-0">
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2v-2zm1-10c2.21 0 4 1.79 4 4 0 1.54-.87 2.88-2.15 3.55L12 15h-2v-2h2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2H8c0-2.21 1.79-4 4-4z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold">Wedding Invitation</h4>
                      <p className="text-sm text-gray-500">Sent to 120 guests</p>
                    </div>
                  </div>
                </div>

                {/* Card 2 - Middle */}
                <div className="absolute inset-x-8 top-8 p-6 bg-white rounded-xl shadow-lg transform rotate-2 transition-transform hover:-translate-y-2 hover:rotate-0">
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold">Event Reminder</h4>
                      <p className="text-sm text-gray-500">Scheduled for tomorrow</p>
                    </div>
                  </div>
                </div>

                {/* Card 3 - Top */}
                <div className="relative p-6 bg-white rounded-xl shadow-lg transform transition-transform hover:-translate-y-2">
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold">Venue Update</h4>
                      <p className="text-sm text-gray-500">Sent just now</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-gray-600">
                      Hi everyone! The venue for tomorrow&apos;s event has been updated. Click here
                      for details.
                    </p>
                    <div className="mt-4 flex gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">✓ Sent</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        85% Read
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chatbot Section */}
      <section
        id="ai-assistant-for-guests"
        className="py-24 relative overflow-hidden bg-gradient-to-b from-purple-50/50 max-w-7xl mx-auto"
      >
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Chat Interface */}
            <div className="relative order-2 lg:order-1">
              <div className="relative mx-auto max-w-[380px]">
                {/* Phone Frame */}
                <div className="relative rounded-[3rem] bg-gray-900 p-4 shadow-xl">
                  <div className="absolute inset-0 rounded-[3rem] border-[12px] border-gray-900"></div>
                  {/* Screen Content */}
                  <div className="relative rounded-[2rem] overflow-hidden bg-gray-50 aspect-[9/19]">
                    {/* Chat Header */}
                    <div className="absolute top-0 inset-x-0 bg-[#25D366] text-white p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-14h2v6h-2zm0 8h2v2h-2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium">Wedding Assistant</div>
                          <div className="text-xs opacity-80">Always active</div>
                        </div>
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="absolute inset-0 pt-20 p-4">
                      <div className="space-y-4">
                        {/* Guest Message */}
                        <div className="flex justify-end">
                          <div className="bg-[#DCF8C6] rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm">What time does the ceremony start?</p>
                            <p className="text-[10px] text-gray-500 text-right">11:32 AM</p>
                          </div>
                        </div>

                        {/* Bot Response */}
                        <div className="flex justify-start">
                          <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm">
                            <p className="text-sm">
                              The ceremony starts at 4:00 PM at Santa Maria Church. I recommend
                              arriving by 3:30 PM to find parking and get seated comfortably. Would
                              you like directions to the venue?
                            </p>
                            <p className="text-[10px] text-gray-500">11:32 AM</p>
                          </div>
                        </div>

                        {/* Guest Message */}
                        <div className="flex justify-end">
                          <div className="bg-[#DCF8C6] rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm">Is there a dress code?</p>
                            <p className="text-[10px] text-gray-500 text-right">11:33 AM</p>
                          </div>
                        </div>

                        {/* Bot Response with Options */}
                        <div className="flex justify-start">
                          <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm">
                            <p className="text-sm">
                              The dress code is Cocktail Attire. Here&apos;s what that means:
                            </p>
                            <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
                              <li>Men: Suit or blazer with dress pants</li>
                              <li>Women: Cocktail dress or elegant separates</li>
                            </ul>
                            <p className="text-[10px] text-gray-500">11:33 AM</p>
                          </div>
                        </div>

                        {/* Typing Indicator */}
                        <div className="flex justify-start">
                          <div className="bg-white rounded-lg p-3 px-4 shadow-sm">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"></div>
                              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.2s]"></div>
                              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-purple-200 rounded-full blur-2xl opacity-60"></div>
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-purple-200 rounded-full blur-2xl opacity-60"></div>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 order-1 lg:order-2">
              <h2 className="text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight">
                AI-Powered Assistant for{' '}
                <span className="text-[#9333EA]">Every Guest Question</span>
              </h2>
              <p className="mt-6 text-xl text-gray-600 leading-relaxed">
                Our intelligent chatbot handles all guest inquiries 24/7, providing accurate
                information about your event using advanced AI technology.
              </p>
              <div className="mt-10 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-[#9333EA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Instant Responses</h3>
                    <p className="mt-1 text-gray-600">
                      Get immediate answers to common questions about venue, timing, dress code, and
                      more.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-[#9333EA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Context-Aware</h3>
                    <p className="mt-1 text-gray-600">
                      The AI understands your event details and provides personalized responses.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-[#9333EA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Smart Suggestions</h3>
                    <p className="mt-1 text-gray-600">
                      Proactively offers relevant information like directions, parking details, and
                      accommodation options.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RSVP Tracking Section */}
      <section id="automated-rsvps" className="py-24 relative overflow-hidden max-w-7xl mx-auto">
        <div className="container px-6 mx-auto border-y border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <div className="relative z-10 border-r py-16 pr-16">
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] leading-tight">
                Smart RSVP Tracking with <span className="text-[#9333EA]">Zero Effort</span>
              </h2>
              <p className="mt-5 text-lg text-gray-600 leading-relaxed">
                Automatically track guest responses and manage attendance without the hassle. Our AI
                understands natural language responses and updates RSVP status in real-time.
              </p>
              <div className="mt-8 space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-purple-100">
                    <div className="text-2xl font-bold text-[#9333EA]">87%</div>
                    <div className="text-xs text-gray-600 mt-1">Response Rate</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-purple-100">
                    <div className="text-2xl font-bold text-[#9333EA]">142</div>
                    <div className="text-xs text-gray-600 mt-1">Confirmed</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-purple-100">
                    <div className="text-2xl font-bold text-[#9333EA]">12</div>
                    <div className="text-xs text-gray-600 mt-1">Pending</div>
                  </div>
                </div>

                {/* Feature List */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-[#9333EA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Automatic Status Updates
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      AI automatically detects and updates RSVP status from natural chat responses.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-[#9333EA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Smart Follow-ups</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Automated reminders for pending responses with perfect timing.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Animated Cards */}
            <div className="lg:pl-8">
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] leading-tight">
                We&apos;re using <span className="text-[#9333EA]">Intelligence</span> to make your
                life easier
              </h2>
              <p className="mt-5 text-lg text-gray-600 leading-relaxed max-w-xl">
                Guest attendance is automatically updated based on their responses.
              </p>
              <div className="py-24">
                <AnimatedCards />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
