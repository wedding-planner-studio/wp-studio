import React from 'react';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Analytics & Privacy Notice
          </h1>
          
          <div className="prose prose-lg text-gray-700">
            <p>
              Due to the sensitive nature of wedding planning and the personal information 
              of couples and guests, we cannot publicly share detailed analytics or client data. 
              However, to support our Build Award submission we can prepare a short document 
              with blurred screenshots that demonstrate platform activity, feature usage, 
              and event pipelines without disclosing personal details.
            </p>
            
            <p>
              This approach allows us to respect client privacy while still providing 
              SCF Build Award reviewers with clear evidence of product adoption, 
              active events, and engagement metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}