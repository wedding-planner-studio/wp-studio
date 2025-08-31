'use client';
import { SignIn } from '@clerk/nextjs';

const SignInPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignIn />
    </div>
  );
};

export default SignInPage;
