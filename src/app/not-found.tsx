import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-8xl font-light text-gray-800 tracking-tight">404</h1>
          <p className="text-gray-500 text-lg">Not found</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-black rounded-full hover:bg-gray-800 transition-all duration-200 hover:scale-105"
        >
          ← Home
        </Link>
      </div>
    </div>
  );
}
