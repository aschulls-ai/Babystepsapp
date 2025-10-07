import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { mobileService } from './services/MobileService';
import { SpeedInsights } from "@vercel/speed-insights/react";
import './App.css';

// Components
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import BabyProfile from './components/BabyProfile';
import TrackingPage from './components/TrackingPage';
import FoodResearch from './components/FoodResearch';
import FormulaComparison from './components/FormulaComparison';
import EmergencyTraining from './components/EmergencyTraining';
import MealPlanner from './components/MealPlanner';
import Research from './components/Research';
import EmailVerification from './components/EmailVerification';
import PasswordReset from './components/PasswordReset';
import PrivacyPolicy from './components/PrivacyPolicy';
import Layout from './components/Layout';
import BottomBannerAd from './components/ads/BottomBannerAd';

// Get backend URL with fallback for different environments
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Debug logging
console.log('Environment configuration:', {
  BACKEND_URL,
  API,
  processEnv: process.env.REACT_APP_BACKEND_URL,
  importMeta: import.meta.env?.REACT_APP_BACKEND_URL
});

// Set up axios defaults
axios.defaults.baseURL = API;

function App() {
  const [user, setUser] = useState(null);
  const [currentBaby, setCurrentBaby] = useState(null);
  const [babies, setBabies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      // Initialize mobile features if running on native platform
      if (Capacitor.isNativePlatform()) {
        await initializeMobileApp();
      }
      
      await checkAuthState();
    };
    
    initializeApp();
  }, []);

  const initializeMobileApp = async () => {
    try {
      // Set status bar style
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#10b981' });
      
      // Hide splash screen after app is ready
      await SplashScreen.hide();
      
      // Initialize mobile service
      await mobileService.initializeServices();
      
      console.log('Mobile app initialized successfully');
    } catch (error) {
      console.error('Mobile app initialization failed:', error);
    }
  };

  const checkAuthState = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        await fetchBabies();
        // Set a basic user object to indicate authentication
        setUser({ authenticated: true });
      } catch (error) {
        console.error('Auth check failed:', error);
        logout();
      }
    }
    setLoading(false);
  };

  const fetchBabies = async () => {
    try {
      const response = await axios.get('/babies');
      setBabies(response.data);
      if (response.data.length > 0 && !currentBaby) {
        setCurrentBaby(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch babies:', error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Set user state to trigger re-render
      setUser({ email });
      await fetchBabies();
      toast.success('Welcome to Baby Steps!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'ERR_NETWORK') {
        toast.error('Unable to connect to server. Please check your internet connection.');
      } else if (error.response?.status === 404) {
        toast.error('Login service not available. Please try again later.');
      } else {
        toast.error(error.response?.data?.detail || 'Login failed');
      }
      return false;
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post('/auth/register', { name, email, password });
      
      // Registration now requires email verification
      toast.success('Account created! Please check your email for verification link.');
      return { success: true, requiresVerification: true, email };
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 'ERR_NETWORK') {
        toast.error('Unable to connect to server. Please check your internet connection.');
      } else if (error.response?.status === 404) {
        toast.error('Registration service not available. Please try again later.');
      } else {
        toast.error(error.response?.data?.detail || 'Registration failed');
      }
      return { success: false };
    }
  };

  const resendVerification = async (email) => {
    try {
      await axios.post('/auth/resend-verification', { email });
      toast.success('Verification email sent! Please check your inbox.');
      return true;
    } catch (error) {
      toast.error('Failed to send verification email');
      return false;
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      await axios.post('/auth/request-password-reset', { email });
      toast.success('Password reset link sent! Please check your email.');
      return true;
    } catch (error) {
      toast.error('Failed to send password reset email');
      return false;
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      await axios.post('/auth/reset-password', { token, new_password: newPassword });
      toast.success('Password reset successful! You can now log in.');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Password reset failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setCurrentBaby(null);
    setBabies([]);
    toast.success('Logged out successfully');
  };

  const addBaby = async (babyData) => {
    try {
      const response = await axios.post('/babies', babyData);
      const newBaby = response.data;
      setBabies([...babies, newBaby]);
      if (!currentBaby) {
        setCurrentBaby(newBaby);
      }
      toast.success(`${newBaby.name}'s profile created successfully!`);
      return newBaby;
    } catch (error) {
      toast.error('Failed to add baby profile');
      throw error;
    }
  };

  const updateBaby = async (babyData) => {
    try {
      const response = await axios.put(`/babies/${currentBaby.id}`, babyData);
      const updatedBaby = response.data;
      
      // Update babies array
      setBabies(babies.map(baby => 
        baby.id === updatedBaby.id ? updatedBaby : baby
      ));
      
      // Update current baby if it's the one being updated
      if (currentBaby.id === updatedBaby.id) {
        setCurrentBaby(updatedBaby);
      }
      
      toast.success(`${updatedBaby.name}'s profile updated successfully!`);
      return updatedBaby;
    } catch (error) {
      toast.error('Failed to update baby profile');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Baby Steps...</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = user || localStorage.getItem('token');

  return (
    <div className="App min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Router>
        <Routes>
          <Route 
            path="/auth" 
            element={
              isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <AuthPage 
                onLogin={login} 
                onRegister={register}
                onRequestPasswordReset={requestPasswordReset}
                onResendVerification={resendVerification}
              />
            } 
          />
          
          {/* Email verification and password reset routes - accessible without authentication */}
          <Route path="/verify-email/:token" element={<EmailVerification />} />
          <Route path="/reset-password/:token" element={<PasswordReset />} />
          
          {/* Privacy policy - accessible without authentication */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          
          <Route 
            path="/*" 
            element={
              !isAuthenticated ? 
              <Navigate to="/auth" replace /> : 
              <Layout 
                currentBaby={currentBaby}
                babies={babies}
                onSwitchBaby={setCurrentBaby}
                onLogout={logout}
              >
                <Routes>
                  <Route 
                    path="/dashboard" 
                    element={
                      <Dashboard 
                        currentBaby={currentBaby}
                        onAddBaby={addBaby}
                      />
                    } 
                  />
                  <Route 
                    path="/baby-profile" 
                    element={
                      <BabyProfile 
                        currentBaby={currentBaby}
                        onAddBaby={addBaby}
                        onUpdateBaby={updateBaby}
                      />
                    } 
                  />
                  <Route 
                    path="/tracking" 
                    element={
                      <TrackingPage 
                        currentBaby={currentBaby}
                      />
                    } 
                  />
                  <Route 
                    path="/food-research" 
                    element={
                      <FoodResearch 
                        currentBaby={currentBaby}
                      />
                    } 
                  />
                  <Route 
                    path="/formula-comparison" 
                    element={
                      <FormulaComparison 
                        currentBaby={currentBaby}
                      />
                    } 
                  />
                  <Route 
                    path="/emergency-training" 
                    element={<EmergencyTraining currentBaby={currentBaby} />} 
                  />
                  <Route 
                    path="/meal-planner" 
                    element={
                      <MealPlanner 
                        currentBaby={currentBaby}
                      />
                    } 
                  />
                  <Route 
                    path="/research" 
                    element={<Research />} 
                  />
                  <Route 
                    path="/" 
                    element={<Navigate to="/dashboard" replace />} 
                  />
                </Routes>
              </Layout>
            } 
          />
        </Routes>
        <Toaster position="top-right" />
        
        {/* Bottom Banner Ad - Only show when user is logged in */}
        {user && <BottomBannerAd />}
        
        {/* Add padding to prevent content overlap with bottom banner */}
        {user && <div className="h-16 md:h-20" />}
        
        {/* Vercel Speed Insights for performance monitoring */}
        <SpeedInsights />
      </Router>
    </div>
  );
}

export default App;