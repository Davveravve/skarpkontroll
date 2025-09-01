// src/contexts/AuthContext.js - Simplified user management without subscriptions
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Hämta användarprofil
  const fetchUserProfile = async (uid) => {
    try {
      console.log('📋 AuthContext: Fetching user profile for', uid);
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const profile = userDoc.data();
        
        // Konvertera Firestore timestamps till JavaScript dates
        if (profile.createdAt?.seconds) {
          profile.createdAt = new Date(profile.createdAt.seconds * 1000);
        }
        if (profile.updatedAt?.seconds) {
          profile.updatedAt = new Date(profile.updatedAt.seconds * 1000);
        }
        
        setUserProfile(profile);
        console.log('✅ AuthContext: User profile loaded');
        return profile;
      } else {
        console.log('⚠️ AuthContext: No user profile found');
        return null;
      }
    } catch (error) {
      console.error('❌ AuthContext: Error fetching user profile:', error);
      return null;
    }
  };

  // Registrera ny användare
  const register = async (email, password, displayName, companyName, phone = '') => {
    try {
      console.log('🔐 AuthContext: Starting registration for', email);
      setAuthError(null);
      
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ AuthContext: Firebase auth user created', user.uid);
      
      // Uppdatera Firebase Auth profil
      await updateProfile(user, { displayName: displayName });
      
      // Skicka verifiering e-post
      await sendEmailVerification(user);
      console.log('📧 AuthContext: Email verification sent');
      
      // Skapa användarprofil i Firestore
      const userProfileData = {
        uid: user.uid,
        email: user.email,
        displayName: displayName || '',
        companyName: companyName || '',
        phone: phone || '',
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        stats: {
          totalCustomers: 0,
          totalAddresses: 0,
          totalInstallations: 0,
          totalInspections: 0,
          totalTemplates: 0
        }
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfileData);
      await fetchUserProfile(user.uid);
      console.log('✅ AuthContext: User profile created in Firestore');
      
      return { success: true, user, requiresVerification: true };
    } catch (error) {
      console.error('❌ AuthContext: Registration error:', error);
      setAuthError(error.message);
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  // Logga in
  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Starting login for', email);
      setAuthError(null);
      
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ AuthContext: Firebase auth successful', user.uid);
      
      // Uppdatera senaste inloggning
      if (user.uid) {
        console.log('📝 AuthContext: Updating last login...');
        await updateDoc(doc(db, 'users', user.uid), {
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ AuthContext: Last login updated');
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error);
      setAuthError(error.message);
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  // Logga ut
  const logout = async () => {
    try {
      console.log('🔐 AuthContext: Logging out');
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      console.log('✅ AuthContext: Logout successful');
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error);
      setAuthError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Skicka lösenordsåterställning
  const resetPassword = async (email) => {
    try {
      console.log('🔐 AuthContext: Sending password reset to', email);
      await sendPasswordResetEmail(auth, email);
      console.log('✅ AuthContext: Password reset email sent');
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Password reset error:', error);
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  // Uppdatera användarprofil
  const updateUserProfile = async (profileData) => {
    try {
      setLoading(true);
      console.log('📝 AuthContext: Updating user profile...');
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        ...profileData,
        updatedAt: serverTimestamp()
      });
      
      // Uppdatera Firebase Auth displayName om det ingår
      if (profileData.displayName) {
        await updateProfile(currentUser, { displayName: profileData.displayName });
      }
      
      await fetchUserProfile(currentUser.uid);
      setLoading(false);
      console.log('✅ AuthContext: Profile updated');
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Profile update error:', error);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  // Felmeddelanden på svenska
  const getErrorMessage = (errorCode) => {
    const errorMessages = {
      'auth/user-not-found': 'Användaren finns inte.',
      'auth/wrong-password': 'Fel lösenord.',
      'auth/email-already-in-use': 'E-postadressen används redan.',
      'auth/weak-password': 'Lösenordet är för svagt.',
      'auth/invalid-email': 'Ogiltig e-postadress.',
      'auth/too-many-requests': 'För många försök. Försök igen senare.',
      'auth/user-disabled': 'Kontot är inaktiverat.',
      'auth/invalid-credential': 'Felaktiga inloggningsuppgifter.'
    };
    
    return errorMessages[errorCode] || 'Ett oväntat fel uppstod.';
  };

  // Lyssna på ändringar i autentisering
  useEffect(() => {
    console.log('🔄 AuthContext: Setting up auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 AuthContext: Auth state changed', {
        hasUser: !!user,
        userUid: user?.uid,
        userEmail: user?.email
      });
      
      setCurrentUser(user);
      
      if (user) {
        // Användare inloggad - hämta profil
        await fetchUserProfile(user.uid);
      } else {
        // Användare utloggad
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      console.log('🔄 AuthContext: Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    authError,
    register,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};