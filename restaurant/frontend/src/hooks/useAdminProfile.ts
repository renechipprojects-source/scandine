import { useState, useEffect } from "react";

export interface AdminProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
}

const STORAGE_KEY = "admin_profile_data";
const PROFILE_EVENT = "admin-profile-updated";

const defaultProfile: AdminProfile = {
  name: "Elena Kovács",
  email: "elena@scandine.co",
  phone: "+1 555 010 2233",
  role: "Admin",
};

export function getInitials(name: string): string {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function useAdminProfile() {
  const [profile, setProfile] = useState<AdminProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultProfile, ...parsed, role: "Admin" };
      }
    } catch (e) {
      console.error(e);
    }
    return defaultProfile;
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setProfile({ ...defaultProfile, ...parsed, role: "Admin" });
        }
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener(PROFILE_EVENT, handleUpdate);
    return () => window.removeEventListener(PROFILE_EVENT, handleUpdate);
  }, []);

  const saveProfile = (newProfile: Partial<AdminProfile>) => {
    const updated = { ...profile, ...newProfile, role: "Admin" };
    setProfile(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event(PROFILE_EVENT));
    } catch (e) {
      console.error("Failed to save admin profile to localStorage", e);
    }
  };

  return {
    profile,
    saveProfile,
    initials: getInitials(profile.name),
  };
}
