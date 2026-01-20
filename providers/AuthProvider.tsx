import React, { createContext, ReactNode, useContext, useState } from 'react';

interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  username: string;
}

interface AuthContextType {
  session: User | null;
  signIn: (user: User) => void;
  signOut: () => void;
  signUp: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<User | null>(null);

  const signIn = (user: User) => {
    setSession(user);
  };

  const signOut = () => {
    setSession(null);
  };

  const signUp = (user: User) => {
    setSession(user);
  };

  return (
    <AuthContext.Provider value={{ session, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}