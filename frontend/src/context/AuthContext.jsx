import React, { createContext, useContext, useState, useEffect } from 'react';
import authService, { DEFAULT_DEMO_CITIZEN } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(false);

  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const data = await authService.login(identifier, password);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const data = await authService.register(payload);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (email) => {
    setLoading(true);
    try {
      return await authService.sendOtp(email);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email, otp) => {
    setLoading(true);
    try {
      const data = await authService.verifyOtp(email, otp);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    try {
      return await authService.forgotPassword(email);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email, token, newPassword) => {
    setLoading(true);
    try {
      return await authService.resetPassword(email, token, newPassword);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoCitizen = async (citizenId = 'CZN-1001') => {
    setLoading(true);
    try {
      const data = await authService.loginAsDemoCitizen(citizenId);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoAdmin = async () => {
    setLoading(true);
    try {
      const data = await authService.loginAsDemoAdmin();
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const switchDemoCitizen = (citizenId) => {
    loginAsDemoCitizen(citizenId);
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SYSTEM';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        sendOtp,
        verifyOtp,
        forgotPassword,
        resetPassword,
        loginAsDemoCitizen,
        loginAsDemoAdmin,
        logout,
        switchDemoCitizen,
        isAuthenticated: !!user,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
