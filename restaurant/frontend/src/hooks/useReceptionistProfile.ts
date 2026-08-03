import { useState, useEffect } from "react";

export interface ReceptionistProfileData {
  name: string;
  email: string;
  phone: string;
  role: "Receptionist";
}

const STORAGE_KEY = "receptionist_profile_data";

const defaultProfile: ReceptionistProfileData = {
  name: "Receptionist",
  email: "receptionist@restaurant.com",
  phone: "+91 98765 43210",
  role: "Receptionist",
};

export function useReceptionistProfile() {
  const [profile, setProfile] = useState<ReceptionistProfileData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load receptionist profile:", e);
    }
    return defaultProfile;
  });

  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setProfile(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener("receptionist-profile-updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("receptionist-profile-updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const updateProfile = (newProfile: Partial<ReceptionistProfileData>) => {
    const updated: ReceptionistProfileData = {
      ...profile,
      ...newProfile,
      role: "Receptionist", // Permanent role
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setProfile(updated);
      window.dispatchEvent(new CustomEvent("receptionist-profile-updated"));
    } catch (e) {
      console.error("Failed to save receptionist profile:", e);
    }
  };

  return { profile, updateProfile };
}
