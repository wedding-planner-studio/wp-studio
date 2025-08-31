export default function AnimatedCards() {
  return (
    <div className="relative bg-gradient-to-br from-purple-100 to-transparent rounded-3xl transform -rotate-1">
      {/* WhatsApp Cards Stack */}
      <div className="relative p-8 h-[150px] flex items-center justify-center perspective-[3000px]">
        {/* Card 1 - Bottom (Off track) - Simplified */}
        <div
          className="absolute w-full max-w-3xl z-30 origin-left opacity-90 hover:opacity-95"
          style={{
            transform:
              'translateX(0px) translateY(-30px) translateZ(0px) rotateY(45deg) rotateX(-3deg) rotateZ(-4deg)',
          }}
        >
          <div className="transition-transform duration-500 ease-in-out hover:-translate-y-6">
            <div className="p-4 bg-neutral-900 rounded-2xl shadow-lg shadow-black/20 hover:bg-gradient-to-r hover:from-neutral-900 hover:to-neutral-700 hover:text-white">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-300">
                      Wedding Guest List (156)
                    </span>
                  </div>
                  <span className="text-xs text-purple-500 ">Message from Template</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {' '}
                    {/* Header gap */}
                    {/* Icon from reference code */}
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                      role="img"
                      focusable="false"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.6807 5.7029C12.9925 5.97566 13.0241 6.44948 12.7513 6.76121L9.71942 10.2263C9.56569 10.402 9.33892 10.4961 9.10596 10.4808C8.873 10.4656 8.66044 10.3427 8.53094 10.1485L6.76432 7.49855L4.37742 10.2263C4.10466 10.5381 3.63083 10.5696 3.31911 10.2969C3.00739 10.0241 2.97581 9.55028 3.24857 9.23856L6.28056 5.77356C6.43429 5.59788 6.66106 5.50379 6.89401 5.51905C7.12696 5.53432 7.33952 5.65718 7.46902 5.85142L9.23562 8.50133L11.6224 5.77347C11.8952 5.46174 12.369 5.43015 12.6807 5.7029Z"
                      ></path>
                    </svg>
                    <span className="text-sm font-medium text-green-500">Invitation Sent</span>
                  </div>
                  {/* Date is moved below */}
                </div>
                {/* Spacing using margin (8px) */}
                <p className="text-neutral-200 text-lg font-medium tracking-wide mt-2">
                  You&apos;re invited to Emily & David&apos;s Wedding! Tap for all the details.
                </p>
                {/* Spacing using margin (12px) */}
                <span className="text-xs text-neutral-500 mt-3">Oct 12</span>
              </div>
            </div>
          </div>
        </div>
        {/* Card 2 - Middle (At risk) - Simplified */}
        <div
          className="absolute w-full max-w-3xl z-30 origin-left opacity-90 hover:opacity-95"
          style={{
            transform:
              'translateX(50px) translateY(0px) translateZ(200px) rotateY(45deg) rotateX(-3deg) rotateZ(-4deg)',
          }}
        >
          <div className="transition-transform duration-500 ease-in-out hover:-translate-y-6">
            <div className="p-4 bg-neutral-900 rounded-2xl shadow-lg shadow-black/20 hover:bg-gradient-to-r hover:from-neutral-900 hover:to-neutral-700 hover:text-white">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-300">RSVP Pending (24)</span>
                  </div>
                  <span className="text-xs text-purple-500">Message from Template</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {' '}
                    {/* Header gap */}
                    {/* Icon from reference code */}
                    <svg
                      className="w-4 h-4 text-purple-400"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                      role="img"
                      focusable="false"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.6807 5.7029C12.9925 5.97566 13.0241 6.44948 12.7513 6.76121L9.71942 10.2263C9.56569 10.402 9.33892 10.4961 9.10596 10.4808C8.873 10.4656 8.66044 10.3427 8.53094 10.1485L6.76432 7.49855L4.37742 10.2263C4.10466 10.5381 3.63083 10.5696 3.31911 10.2969C3.00739 10.0241 2.97581 9.55028 3.24857 9.23856L6.28056 5.77356C6.43429 5.59788 6.66106 5.50379 6.89401 5.51905C7.12696 5.53432 7.33952 5.65718 7.46902 5.85142L9.23562 8.50133L11.6224 5.77347C11.8952 5.46174 12.369 5.43015 12.6807 5.7029Z"
                      ></path>
                    </svg>
                    <span className="text-sm font-medium text-purple-400">Reminder Scheduled</span>
                  </div>
                  {/* Date is moved below */}
                </div>
                {/* Spacing using margin (8px) */}
                <p className="text-neutral-200 text-lg font-medium tracking-wide mt-2">
                  Gentle reminder: RSVP deadline is approaching! Respond by Oct 20th.
                </p>
                {/* Spacing using margin (12px) */}
                <span className="text-xs text-neutral-500 mt-3">Scheduled for Oct 18</span>
              </div>
            </div>
          </div>
        </div>
        {/* Card 3 - Top (On track) */}
        <div
          className="absolute w-full max-w-3xl z-30 origin-left opacity-90 hover:opacity-95"
          style={{
            transform:
              'translateX(100px) translateY(30px) translateZ(0px) rotateY(45deg) rotateX(-3deg) rotateZ(-4deg)',
          }}
        >
          <div className="transition-transform duration-500 ease-in-out hover:-translate-y-6">
            <div className="p-4 bg-neutral-900 rounded-2xl shadow-lg shadow-black/20 hover:bg-gradient-to-r hover:from-neutral-900 hover:to-neutral-700 hover:text-white">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-300">All Guests</span>
                  </div>
                  <span className="text-xs text-purple-500">Message from Template</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {' '}
                    {/* Header gap */}
                    {/* Icon from reference code */}
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                      role="img"
                      focusable="false"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.6807 5.7029C12.9925 5.97566 13.0241 6.44948 12.7513 6.76121L9.71942 10.2263C9.56569 10.402 9.33892 10.4961 9.10596 10.4808C8.873 10.4656 8.66044 10.3427 8.53094 10.1485L6.76432 7.49855L4.37742 10.2263C4.10466 10.5381 3.63083 10.5696 3.31911 10.2969C3.00739 10.0241 2.97581 9.55028 3.24857 9.23856L6.28056 5.77356C6.43429 5.59788 6.66106 5.50379 6.89401 5.51905C7.12696 5.53432 7.33952 5.65718 7.46902 5.85142L9.23562 8.50133L11.6224 5.77347C11.8952 5.46174 12.369 5.43015 12.6807 5.7029Z"
                      ></path>
                    </svg>
                    <span className="text-sm font-medium text-green-500">Messages Sent (120)</span>
                  </div>
                  {/* Date is moved below */}
                </div>
                {/* Spacing using margin (8px) */}
                <p className="text-neutral-200 text-lg font-medium tracking-wide mt-2">
                  Save the date! We&apos;re delighted to invite you to our wedding! Feel free to
                  reach out if you have any questions.
                </p>
                {/* Spacing using margin (12px) */}
                <span className="text-xs text-neutral-500 mt-3">Oct 16</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
