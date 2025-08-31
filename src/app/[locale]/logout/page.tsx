import { SignOutButton } from '@clerk/nextjs';

export default function LogoutPage() {
  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center">
      <SignOutButton>
        <button className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700">
          Sign Out
        </button>
      </SignOutButton>
    </div>
  );
}
