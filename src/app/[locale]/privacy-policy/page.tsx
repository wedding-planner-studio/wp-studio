import React from 'react';

export default function PrivacyPolicyPage() {
  const pdfUrl = 'https://8eyoe3mdhc.ufs.sh/f/n8JiHxKrIpGQOU5l72EdFUsb3pOyK1ruj0RGX7E6VHtIS5vo';

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-100">
      {/* Optional Header */}
      {/* <h1 className="text-2xl font-semibold text-center mb-4 text-gray-800">Privacy Policy</h1> */}
      <div className="flex-grow border border-gray-300 rounded-lg overflow-hidden shadow-sm bg-white">
        <iframe
          src={pdfUrl}
          className="w-full h-full border-none"
          title="Privacy Policy PDF"
          // sandbox attribute can enhance security but might restrict PDF functionality
          // sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
