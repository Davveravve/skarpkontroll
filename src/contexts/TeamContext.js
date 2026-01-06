// src/contexts/TeamContext.js - Team management context with localStorage caching
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { useAuth } from './AuthContext';

const TeamContext = createContext();

// Cache keys
const CACHE_KEYS = {
  CURRENT_TEAM: 'skarpkontroll_currentTeam',
  USER_TEAMS: 'skarpkontroll_userTeams',
  TEAM_MEMBERS: 'skarpkontroll_teamMembers',
  CACHE_TIMESTAMP: 'skarpkontroll_cacheTimestamp'
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

// Helper functions for localStorage
const saveToCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
  } catch (err) {
    console.log('TeamContext: Could not save to cache:', err.message);
  }
};

const loadFromCache = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.log('TeamContext: Could not load from cache:', err.message);
    return null;
  }
};

const clearTeamCache = () => {
  try {
    Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key));
  } catch (err) {
    console.log('TeamContext: Could not clear cache:', err.message);
  }
};

const isCacheValid = () => {
  try {
    const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
    if (!timestamp) return false;
    return (Date.now() - parseInt(timestamp)) < CACHE_DURATION;
  } catch {
    return false;
  }
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

// Generera unik team-kod
const generateTeamCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += ' ';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const TeamProvider = ({ children }) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const [currentTeam, setCurrentTeam] = useState(() => loadFromCache(CACHE_KEYS.CURRENT_TEAM));
  const [userTeams, setUserTeams] = useState(() => loadFromCache(CACHE_KEYS.USER_TEAMS) || []);
  const [teamMembers, setTeamMembers] = useState(() => loadFromCache(CACHE_KEYS.TEAM_MEMBERS) || []);
  // ALDRIG loading = true - visa cache direkt, uppdatera i bakgrunden
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasInitialized = useRef(false);

  // Hämta alla teams användaren tillhör
  const fetchUserTeams = async (silent = false) => {
    if (!currentUser) return [];

    try {
      if (!silent) console.log('TeamContext: Fetching all user teams');
      const teamsQuery = query(
        collection(db, 'teams'),
        where('members', 'array-contains', currentUser.uid)
      );

      const snapshot = await getDocs(teamsQuery);
      const teams = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      setUserTeams(teams);
      saveToCache(CACHE_KEYS.USER_TEAMS, teams);
      if (!silent) console.log('TeamContext: Found', teams.length, 'teams');
      return teams;
    } catch (err) {
      console.error('TeamContext: Error fetching user teams:', err);
      return [];
    }
  };

  // Byt aktivt team
  const switchTeam = async (teamId) => {
    if (!teamId) return { success: false, error: 'Inget team valt' };

    try {
      console.log('TeamContext: Switching to team', teamId);
      // Rensa team cache for snabbare byte
      saveToCache(CACHE_KEYS.CURRENT_TEAM, null);
      saveToCache(CACHE_KEYS.TEAM_MEMBERS, []);

      // Spara aktivt team-ID i användarprofilen
      await updateUserProfile({ teamId });

      // Hämta det nya teamet (utan loading för smidigare UX)
      await fetchTeam(teamId);

      return { success: true };
    } catch (err) {
      console.error('TeamContext: Error switching team:', err);
      return { success: false, error: err.message };
    }
  };

  // Hämta team-info
  const fetchTeam = async (teamId, silent = false) => {
    if (!teamId) {
      setCurrentTeam(null);
      setTeamMembers([]);
      saveToCache(CACHE_KEYS.CURRENT_TEAM, null);
      saveToCache(CACHE_KEYS.TEAM_MEMBERS, []);
      return null;
    }

    try {
      if (!silent) console.log('TeamContext: Fetching team', teamId);
      const teamDoc = await getDoc(doc(db, 'teams', teamId));

      if (teamDoc.exists()) {
        const team = { ...teamDoc.data(), id: teamDoc.id };
        setCurrentTeam(team);
        saveToCache(CACHE_KEYS.CURRENT_TEAM, team);

        // Hämta medlemsinfo
        if (team.members && team.members.length > 0) {
          const memberPromises = team.members.map(async (memberId) => {
            const memberDoc = await getDoc(doc(db, 'users', memberId));
            if (memberDoc.exists()) {
              const data = memberDoc.data();
              return {
                id: memberId,
                displayName: data.contactPerson || data.displayName || data.companyName || 'Okand',
                email: data.email || '',
                companyName: data.companyName || ''
              };
            }
            return null;
          });

          const members = (await Promise.all(memberPromises)).filter(Boolean);
          setTeamMembers(members);
          saveToCache(CACHE_KEYS.TEAM_MEMBERS, members);
        }

        if (!silent) console.log('TeamContext: Team loaded', team.name);
        return team;
      } else {
        if (!silent) console.log('TeamContext: Team not found');
        setCurrentTeam(null);
        saveToCache(CACHE_KEYS.CURRENT_TEAM, null);
        return null;
      }
    } catch (err) {
      console.error('TeamContext: Error fetching team:', err);
      setError(err.message);
      return null;
    }
  };

  // Skapa nytt team
  const createTeam = async (teamName, password = null) => {
    if (!currentUser) {
      return { success: false, error: 'Inte inloggad' };
    }

    try {
      console.log('TeamContext: Creating team', teamName);

      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const teamCode = generateTeamCode();

      const teamData = {
        name: teamName,
        code: teamCode,
        password: password || null,
        ownerId: currentUser.uid,
        members: [currentUser.uid],
        logoUrl: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'teams', teamId), teamData);

      // Uppdatera användarens profil med teamId
      await updateUserProfile({ teamId });

      const team = { id: teamId, ...teamData };
      const members = [{
        id: currentUser.uid,
        displayName: userProfile?.contactPerson || userProfile?.displayName || userProfile?.companyName || 'Du',
        email: currentUser.email,
        companyName: userProfile?.companyName || ''
      }];

      setCurrentTeam(team);
      setTeamMembers(members);

      // Uppdatera userTeams-listan
      const newUserTeams = [...userTeams, team];
      setUserTeams(newUserTeams);

      // Spara till cache
      saveToCache(CACHE_KEYS.CURRENT_TEAM, team);
      saveToCache(CACHE_KEYS.TEAM_MEMBERS, members);
      saveToCache(CACHE_KEYS.USER_TEAMS, newUserTeams);

      console.log('TeamContext: Team created', teamId);
      return { success: true, team, code: teamCode };
    } catch (err) {
      console.error('TeamContext: Error creating team:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Gå med i team via kod
  const joinTeam = async (code, password = null) => {
    if (!currentUser) {
      return { success: false, error: 'Inte inloggad' };
    }

    try {
      console.log('TeamContext: Joining team with code', code);

      // Normalisera koden
      const normalizedCode = code.toUpperCase().replace(/\s/g, ' ').trim();

      // Hitta teamet med koden
      const teamsQuery = query(
        collection(db, 'teams'),
        where('code', '==', normalizedCode)
      );

      const snapshot = await getDocs(teamsQuery);

      if (snapshot.empty) {
        return { success: false, error: 'Ingen team hittades med den koden' };
      }

      const teamDoc = snapshot.docs[0];
      const team = { id: teamDoc.id, ...teamDoc.data() };

      // Kolla lösenord om det krävs
      if (team.password && team.password !== password) {
        return { success: false, error: 'Fel lösenord' };
      }

      // Lägg till användaren i teamet
      await updateDoc(doc(db, 'teams', team.id), {
        members: arrayUnion(currentUser.uid),
        updatedAt: serverTimestamp()
      });

      // Uppdatera användarens profil
      await updateUserProfile({ teamId: team.id });

      await fetchTeam(team.id);

      // Uppdatera userTeams-listan och cache
      setUserTeams(prev => {
        // Kolla om teamet redan finns i listan
        if (prev.some(t => t.id === team.id)) {
          return prev;
        }
        const newList = [...prev, team];
        saveToCache(CACHE_KEYS.USER_TEAMS, newList);
        return newList;
      });

      console.log('TeamContext: Joined team', team.name);
      return { success: true, team };
    } catch (err) {
      console.error('TeamContext: Error joining team:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Lämna team
  const leaveTeam = async () => {
    if (!currentUser || !currentTeam) {
      return { success: false, error: 'Inget team att lämna' };
    }

    try {
      console.log('TeamContext: Leaving team', currentTeam.id);

      // Ta bort användaren från teamets members
      const updatedMembers = currentTeam.members.filter(id => id !== currentUser.uid);

      await updateDoc(doc(db, 'teams', currentTeam.id), {
        members: updatedMembers,
        updatedAt: serverTimestamp()
      });

      // Ta bort teamId från användarprofilen
      await updateUserProfile({ teamId: null });

      const leftTeamId = currentTeam.id;

      // Uppdatera userTeams-listan
      const remainingTeams = userTeams.filter(t => t.id !== leftTeamId);
      setUserTeams(remainingTeams);
      saveToCache(CACHE_KEYS.USER_TEAMS, remainingTeams);

      // Om det finns andra team, byt till det första
      if (remainingTeams.length > 0) {
        await switchTeam(remainingTeams[0].id);
      } else {
        setCurrentTeam(null);
        setTeamMembers([]);
        saveToCache(CACHE_KEYS.CURRENT_TEAM, null);
        saveToCache(CACHE_KEYS.TEAM_MEMBERS, []);
      }

      console.log('TeamContext: Left team');
      return { success: true };
    } catch (err) {
      console.error('TeamContext: Error leaving team:', err);
      return { success: false, error: err.message };
    }
  };

  // Ta bort medlem (endast ägare)
  const removeMember = async (memberId) => {
    if (!currentUser || !currentTeam) {
      return { success: false, error: 'Inget team' };
    }

    if (currentTeam.ownerId !== currentUser.uid) {
      return { success: false, error: 'Endast ägaren kan ta bort medlemmar' };
    }

    if (memberId === currentUser.uid) {
      return { success: false, error: 'Du kan inte ta bort dig själv' };
    }

    try {
      const updatedMembers = currentTeam.members.filter(id => id !== memberId);

      await updateDoc(doc(db, 'teams', currentTeam.id), {
        members: updatedMembers,
        updatedAt: serverTimestamp()
      });

      // Ta bort teamId från medlemmens profil
      await updateDoc(doc(db, 'users', memberId), {
        teamId: null,
        updatedAt: serverTimestamp()
      });

      await fetchTeam(currentTeam.id);

      return { success: true };
    } catch (err) {
      console.error('TeamContext: Error removing member:', err);
      return { success: false, error: err.message };
    }
  };

  // Uppdatera team-logotyp (endast ägare)
  const updateTeamLogo = async (file) => {
    if (!currentUser || !currentTeam) {
      return { success: false, error: 'Inget team' };
    }

    if (currentTeam.ownerId !== currentUser.uid) {
      return { success: false, error: 'Endast ägaren kan ändra logotypen' };
    }

    try {
      console.log('TeamContext: Uploading team logo');

      // Ta bort gammal logotyp om den finns
      if (currentTeam.logoUrl && currentTeam.logoPath) {
        try {
          const oldRef = ref(storage, currentTeam.logoPath);
          await deleteObject(oldRef);
          console.log('TeamContext: Deleted old logo');
        } catch (err) {
          console.log('TeamContext: Could not delete old logo:', err.message);
        }
      }

      // Ladda upp ny logotyp
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const logoPath = `teams/${currentTeam.id}/logo_${timestamp}.${extension}`;
      const storageRef = ref(storage, logoPath);

      await uploadBytes(storageRef, file);
      const logoUrl = await getDownloadURL(storageRef);

      // Uppdatera team-dokumentet
      await updateDoc(doc(db, 'teams', currentTeam.id), {
        logoUrl,
        logoPath,
        updatedAt: serverTimestamp()
      });

      // Uppdatera lokal state och cache
      const updatedTeam = { ...currentTeam, logoUrl, logoPath };
      setCurrentTeam(updatedTeam);
      saveToCache(CACHE_KEYS.CURRENT_TEAM, updatedTeam);

      console.log('TeamContext: Logo uploaded successfully');
      return { success: true, logoUrl };
    } catch (err) {
      console.error('TeamContext: Error uploading logo:', err);
      return { success: false, error: err.message };
    }
  };

  // Uppdatera team-lösenord (endast ägare)
  const updateTeamPassword = async (newPassword) => {
    if (!currentUser || !currentTeam) {
      return { success: false, error: 'Inget team' };
    }

    if (currentTeam.ownerId !== currentUser.uid) {
      return { success: false, error: 'Endast ägaren kan ändra lösenordet' };
    }

    try {
      console.log('TeamContext: Updating team password');

      await updateDoc(doc(db, 'teams', currentTeam.id), {
        password: newPassword || null,
        updatedAt: serverTimestamp()
      });

      // Uppdatera lokal state och cache
      const updatedTeam = { ...currentTeam, password: newPassword || null };
      setCurrentTeam(updatedTeam);
      saveToCache(CACHE_KEYS.CURRENT_TEAM, updatedTeam);

      console.log('TeamContext: Password updated successfully');
      return { success: true };
    } catch (err) {
      console.error('TeamContext: Error updating password:', err);
      return { success: false, error: err.message };
    }
  };

  // Uppdatera team-namn (endast ägare)
  const updateTeamName = async (newName) => {
    if (!currentUser || !currentTeam) {
      return { success: false, error: 'Inget team' };
    }

    if (currentTeam.ownerId !== currentUser.uid) {
      return { success: false, error: 'Endast ägaren kan ändra teamnamnet' };
    }

    if (!newName || !newName.trim()) {
      return { success: false, error: 'Teamnamn krävs' };
    }

    try {
      console.log('TeamContext: Updating team name to', newName);

      await updateDoc(doc(db, 'teams', currentTeam.id), {
        name: newName.trim(),
        updatedAt: serverTimestamp()
      });

      // Uppdatera lokal state och cache
      const updatedTeam = { ...currentTeam, name: newName.trim() };
      setCurrentTeam(updatedTeam);
      saveToCache(CACHE_KEYS.CURRENT_TEAM, updatedTeam);

      // Uppdatera userTeams-listan
      const updatedUserTeams = userTeams.map(t =>
        t.id === currentTeam.id ? { ...t, name: newName.trim() } : t
      );
      setUserTeams(updatedUserTeams);
      saveToCache(CACHE_KEYS.USER_TEAMS, updatedUserTeams);

      console.log('TeamContext: Team name updated successfully');
      return { success: true };
    } catch (err) {
      console.error('TeamContext: Error updating team name:', err);
      return { success: false, error: err.message };
    }
  };

  // Överför ägarskap till annan medlem (endast ägare)
  const transferOwnership = async (newOwnerId) => {
    if (!currentUser || !currentTeam) {
      return { success: false, error: 'Inget team' };
    }

    if (currentTeam.ownerId !== currentUser.uid) {
      return { success: false, error: 'Endast ägaren kan överföra ägarskap' };
    }

    if (!currentTeam.members.includes(newOwnerId)) {
      return { success: false, error: 'Den nya ägaren måste vara medlem i teamet' };
    }

    if (newOwnerId === currentUser.uid) {
      return { success: false, error: 'Du är redan ägare' };
    }

    try {
      console.log('TeamContext: Transferring ownership to', newOwnerId);

      await updateDoc(doc(db, 'teams', currentTeam.id), {
        ownerId: newOwnerId,
        updatedAt: serverTimestamp()
      });

      // Uppdatera lokal state och cache
      const updatedTeam = { ...currentTeam, ownerId: newOwnerId };
      setCurrentTeam(updatedTeam);
      saveToCache(CACHE_KEYS.CURRENT_TEAM, updatedTeam);

      console.log('TeamContext: Ownership transferred successfully');
      return { success: true };
    } catch (err) {
      console.error('TeamContext: Error transferring ownership:', err);
      return { success: false, error: err.message };
    }
  };

  // Ta bort team helt (endast ägare)
  const deleteTeam = async () => {
    if (!currentUser || !currentTeam) {
      return { success: false, error: 'Inget team' };
    }

    if (currentTeam.ownerId !== currentUser.uid) {
      return { success: false, error: 'Endast ägaren kan ta bort teamet' };
    }

    try {
      console.log('TeamContext: Deleting team', currentTeam.id);

      const teamId = currentTeam.id;

      // Ta bort logotyp om den finns
      if (currentTeam.logoPath) {
        try {
          const logoRef = ref(storage, currentTeam.logoPath);
          await deleteObject(logoRef);
        } catch (err) {
          console.log('TeamContext: Could not delete logo file:', err.message);
        }
      }

      // Uppdatera alla medlemmars profiler (ta bort teamId)
      const memberUpdatePromises = currentTeam.members.map(memberId =>
        updateDoc(doc(db, 'users', memberId), {
          teamId: null,
          updatedAt: serverTimestamp()
        }).catch(err => console.log('Could not update member', memberId, err.message))
      );
      await Promise.all(memberUpdatePromises);

      // Ta bort team-dokumentet
      const { deleteDoc: firestoreDeleteDoc } = await import('firebase/firestore');
      await firestoreDeleteDoc(doc(db, 'teams', teamId));

      // Uppdatera userTeams-listan
      const remainingTeams = userTeams.filter(t => t.id !== teamId);
      setUserTeams(remainingTeams);
      saveToCache(CACHE_KEYS.USER_TEAMS, remainingTeams);

      // Om det finns andra team, byt till det första
      if (remainingTeams.length > 0) {
        await switchTeam(remainingTeams[0].id);
      } else {
        setCurrentTeam(null);
        setTeamMembers([]);
        saveToCache(CACHE_KEYS.CURRENT_TEAM, null);
        saveToCache(CACHE_KEYS.TEAM_MEMBERS, []);
      }

      console.log('TeamContext: Team deleted successfully');
      return { success: true };
    } catch (err) {
      console.error('TeamContext: Error deleting team:', err);
      return { success: false, error: err.message };
    }
  };

  // Ta bort team-logotyp (endast ägare)
  const removeTeamLogo = async () => {
    if (!currentUser || !currentTeam) {
      return { success: false, error: 'Inget team' };
    }

    if (currentTeam.ownerId !== currentUser.uid) {
      return { success: false, error: 'Endast ägaren kan ta bort logotypen' };
    }

    try {
      console.log('TeamContext: Removing team logo');

      // Ta bort från Storage
      if (currentTeam.logoPath) {
        try {
          const logoRef = ref(storage, currentTeam.logoPath);
          await deleteObject(logoRef);
        } catch (err) {
          console.log('TeamContext: Could not delete logo file:', err.message);
        }
      }

      // Uppdatera team-dokumentet
      await updateDoc(doc(db, 'teams', currentTeam.id), {
        logoUrl: null,
        logoPath: null,
        updatedAt: serverTimestamp()
      });

      // Uppdatera lokal state och cache
      const updatedTeam = { ...currentTeam, logoUrl: null, logoPath: null };
      setCurrentTeam(updatedTeam);
      saveToCache(CACHE_KEYS.CURRENT_TEAM, updatedTeam);

      console.log('TeamContext: Logo removed successfully');
      return { success: true };
    } catch (err) {
      console.error('TeamContext: Error removing logo:', err);
      return { success: false, error: err.message };
    }
  };

  // Hämta team när användarprofil ändras - ALDRIG loading screen
  useEffect(() => {
    const loadTeams = async () => {
      const targetTeamId = userProfile?.teamId;

      // Alltid uppdatera i bakgrunden utan loading
      fetchUserTeams(true);

      if (targetTeamId) {
        // Om teamId har ändrats, hämta det nya teamet
        if (currentTeam?.id !== targetTeamId) {
          await fetchTeam(targetTeamId, true);
        } else {
          // Uppdatera i bakgrunden
          fetchTeam(targetTeamId, true);
        }
      } else if (!targetTeamId && currentTeam) {
        // Användaren har inget team längre
        setCurrentTeam(null);
        setTeamMembers([]);
        saveToCache(CACHE_KEYS.CURRENT_TEAM, null);
        saveToCache(CACHE_KEYS.TEAM_MEMBERS, []);
      }
    };

    if (userProfile !== undefined && currentUser) {
      loadTeams();
    } else if (!currentUser) {
      // Användaren loggade ut - rensa cache
      clearTeamCache();
      setCurrentTeam(null);
      setUserTeams([]);
      setTeamMembers([]);
      hasInitialized.current = false;
    }
  }, [userProfile?.teamId, currentUser]);

  const value = {
    currentTeam,
    userTeams,
    teamMembers,
    loading,
    error,
    isTeamOwner: currentTeam?.ownerId === currentUser?.uid,
    hasTeam: !!currentTeam,
    hasMultipleTeams: userTeams.length > 1,
    createTeam,
    joinTeam,
    leaveTeam,
    removeMember,
    switchTeam,
    fetchTeam,
    fetchUserTeams,
    updateTeamLogo,
    removeTeamLogo,
    updateTeamPassword,
    updateTeamName,
    transferOwnership,
    deleteTeam
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};
