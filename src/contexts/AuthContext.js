// src/contexts/AuthContext.js - Komplett användarhantering med lösenordsåterställning
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
        if (profile.subscription?.trialEnds?.seconds) {
          profile.subscription.trialEnds = new Date(profile.subscription.trialEnds.seconds * 1000);
        }
        
        setUserProfile(profile);
        console.log('✅ AuthContext: User profile loaded', profile);
        return profile;
      } else {
        console.log('❌ AuthContext: No user profile found');
      }
    } catch (error) {
      console.error('❌ AuthContext: Error fetching user profile:', error);
    }
  };

  // Registrera ny användare
  const register = async (email, password, companyName, contactPerson, phone = '') => {
    try {
      console.log('📝 AuthContext: Starting registration for', email);
      setAuthError(null);
      
      // Skapa användare i Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ AuthContext: Firebase user created', user.uid);
      
      // Uppdatera displayName
      await updateProfile(user, {
        displayName: contactPerson
      });
      console.log('✅ AuthContext: Display name updated');
      
      // Skicka verifieringsemail
      await sendEmailVerification(user);
      console.log('✅ AuthContext: Verification email sent');
      
      // Skapa användarprofil i Firestore
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14); // 14 dagars gratis provperiod
      
      const userProfileData = {
        uid: user.uid,
        email: user.email,
        companyName,
        contactPerson,
        phone: phone || '',
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        subscription: {
          type: 'trial',
          status: 'active',
          trialEnds: trialEnds,
          customersLimit: 50,
          templatesLimit: 20,
          storageLimit: 1024 * 1024 * 1024, // 1GB
          storageUsed: 0
        },
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
      
      console.log('🎉 AuthContext: Login complete, returning success');
      return { success: true, user };
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error);
      setAuthError(error.message);
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  // Logga ut
  const logout = async () => {
    try {
      console.log('👋 AuthContext: Logging out...');
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setAuthError(null);
      console.log('✅ AuthContext: Logout successful');
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  // Återställ lösenord
  const resetPassword = async (email) => {
    try {
      console.log('🔄 AuthContext: Sending password reset for', email);
      setAuthError(null);
      
      await sendPasswordResetEmail(auth, email);
      console.log('✅ AuthContext: Password reset email sent');
      
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Password reset error:', error);
      setAuthError(error.message);
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  // Uppdatera abonnemang
  const updateSubscription = async (subscriptionData) => {
    if (!currentUser) return { success: false, error: 'Inte inloggad' };
    
    try {
      console.log('💳 AuthContext: Updating subscription for', currentUser.uid);
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        subscription: subscriptionData,
        updatedAt: serverTimestamp()
      });
      
      await fetchUserProfile(currentUser.uid);
      console.log('✅ AuthContext: Subscription updated');
      
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Subscription update error:', error);
      return { success: false, error: error.message };
    }
  };

  // Applicera kampanjkod
  const applyPromoCode = async (promoCode) => {
    if (!currentUser || !userProfile) return { success: false, error: 'Inte inloggad' };
    
    try {
      console.log('🎫 AuthContext: Applying promo code:', promoCode);
      
      // Här skulle du normalt validera kampanjkoden mot din backend
      // För nu, hårdkoda några exempel
      const validPromoCodes = {
        'TRIAL30': { days: 30, type: 'trial_extension' },
        'WELCOME50': { discount: 50, type: 'discount' }
      };
      
      const promo = validPromoCodes[promoCode.toUpperCase()];
      if (!promo) {
        return { success: false, error: 'Ogiltig kampanjkod' };
      }
      
      let updatedSubscription = { ...userProfile.subscription };
      
      if (promo.type === 'trial_extension') {
        const currentEnd = userProfile.subscription.trialEnds || new Date();
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + promo.days);
        updatedSubscription.trialEnds = newEnd;
      }
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        subscription: updatedSubscription,
        appliedPromoCodes: [...(userProfile.appliedPromoCodes || []), promoCode],
        updatedAt: serverTimestamp()
      });
      
      await fetchUserProfile(currentUser.uid);
      console.log('✅ AuthContext: Promo code applied');
      
      return { success: true, promo };
    } catch (error) {
      console.error('❌ AuthContext: Promo code error:', error);
      return { success: false, error: error.message };
    }
  };

  // Kontrollera gränser
  const checkLimits = async () => {
    if (!userProfile) return { withinLimits: true, limits: {} };
    
    try {
      const subscription = userProfile.subscription;
      const stats = userProfile.stats;
      
      const limits = {
        customers: {
          used: stats?.totalCustomers || 0,
          limit: subscription.customersLimit,
          withinLimit: (stats?.totalCustomers || 0) < subscription.customersLimit
        },
        templates: {
          used: stats?.totalTemplates || 0,
          limit: subscription.templatesLimit,
          withinLimit: (stats?.totalTemplates || 0) < subscription.templatesLimit
        },
        storage: {
          used: subscription.storageUsed || 0,
          limit: subscription.storageLimit,
          withinLimit: (subscription.storageUsed || 0) < subscription.storageLimit
        }
      };
      
      const withinLimits = limits.customers.withinLimit && 
                          limits.templates.withinLimit && 
                          limits.storage.withinLimit;
      
      return { withinLimits, limits };
    } catch (error) {
      console.error('Error checking limits:', error);
      return { withinLimits: true, limits: {} };
    }
  };

  // Uppdatera användarstatistik
  const updateUserStats = async (statType, increment = 1) => {
    if (!currentUser || !userProfile) return;
    
    try {
      const updatedStats = {
        ...userProfile.stats,
        [statType]: (userProfile.stats[statType] || 0) + increment
      };
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        stats: updatedStats,
        updatedAt: serverTimestamp()
      });
      
      setUserProfile(prev => ({
        ...prev,
        stats: updatedStats
      }));
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  // Hjälpfunktion för bättre felmeddelanden
  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Ingen användare hittades med denna e-postadress';
      case 'auth/wrong-password':
        return 'Felaktigt lösenord';
      case 'auth/email-already-in-use':
        return 'En användare med denna e-postadress finns redan';
      case 'auth/weak-password':
        return 'Lösenordet är för svagt. Använd minst 6 tecken';
      case 'auth/invalid-email':
        return 'Ogiltig e-postadress';
      case 'auth/too-many-requests':
        return 'För många misslyckade inloggningsförsök. Försök igen senare';
      case 'auth/network-request-failed':
        return 'Nätverksfel. Kontrollera din internetanslutning';
      case 'auth/invalid-credential':
        return 'Felaktig e-post eller lösenord';
      default:
        return 'Ett oväntat fel uppstod. Försök igen';
    }
  };

  // Lyssna på autentiseringsförändringar
  useEffect(() => {
    console.log('🔍 AuthContext: Setting up auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 AuthContext: Auth state changed:', user ? user.email : 'No user');
      
      setCurrentUser(user);
      
      if (user) {
        console.log('👤 AuthContext: User found, fetching profile...');
        
        // Uppdatera emailVerified status om det har ändrats
        if (user.emailVerified && userProfile && !userProfile.emailVerified) {
          await updateDoc(doc(db, 'users', user.uid), {
            emailVerified: true,
            updatedAt: serverTimestamp()
          });
        }
        
        await fetchUserProfile(user.uid);
      } else {
        console.log('❌ AuthContext: No user, clearing profile');
        setUserProfile(null);
      }
      
      setLoading(false);
      console.log('✅ AuthContext: Auth state update complete');
    });

    return () => {
      console.log('🧹 AuthContext: Cleaning up auth listener');
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
    updateSubscription,
    applyPromoCode,
    checkLimits,
    updateUserStats,
    fetchUserProfile,
    setAuthError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};