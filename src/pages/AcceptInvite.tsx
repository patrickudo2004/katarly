import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Loader2 } from 'lucide-react';

export const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const acceptInvite = useMutation(api.invites.acceptInvite);
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const handleInvite = async () => {
      if (isLoading) return;

      if (isAuthenticated) {
        try {
          console.log("Authenticated user, accepting invite directly...");
          await acceptInvite({ token });
          localStorage.removeItem('pending_invite_token');
          navigate('/');
        } catch (error) {
          console.error("Failed to accept invite:", error);
          navigate('/');
        }
      } else {
        console.log("Unauthenticated user, saving token and redirecting to login...");
        localStorage.setItem('pending_invite_token', token);
        navigate('/login');
      }
    };

    handleInvite();
  }, [token, isAuthenticated, isLoading, navigate, acceptInvite]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Processing Invitation</h2>
        <p className="text-gray-500 mt-2">Setting up your access to the church...</p>
      </div>
    </div>
  );
};
