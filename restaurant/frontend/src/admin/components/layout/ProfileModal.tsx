import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/admin/components/ui/dialog";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Avatar, AvatarFallback } from "@/admin/components/ui/avatar";
import { Badge } from "@/admin/components/ui/badge";
import { User, Mail, Phone, ShieldCheck, LogOut, Check } from "lucide-react";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const navigate = useNavigate();
  const { profile, saveProfile, initials } = useAdminProfile();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
  }, [profile, open]);

  const handleSignOut = () => {
    onOpenChange(false);
    signOut();
    navigate({ to: "/", replace: true });
  };

  const handleSave = () => {
    saveProfile({ name, email, phone });
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="h-5 w-5 text-primary" />
            Admin Profile
          </DialogTitle>
          <DialogDescription>
            Manage your account credentials and system identity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Header Card */}
          <div className="flex items-center gap-4 rounded-2xl border bg-muted/40 p-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-primary to-destructive text-lg font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-bold text-foreground">{profile.name}</h3>
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" /> Admin
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          {/* Form / Details */}
          <div className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Full Name</label>
              {isEditing ? (
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
              ) : (
                <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 text-sm font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {profile.name}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email Address</label>
              {isEditing ? (
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
              ) : (
                <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {profile.email}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Phone Number</label>
              {isEditing ? (
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9" />
              ) : (
                <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 text-sm font-medium">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {profile.phone}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            {isEditing ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} className="gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit Details
              </Button>
            )}

            <Button
              size="sm"
              variant="destructive"
              onClick={handleSignOut}
              className="ml-auto gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
