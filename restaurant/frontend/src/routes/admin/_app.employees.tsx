import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/admin/components/layout/PageHeader";
import { StatusBadge } from "@/admin/components/layout/StatusBadge";
import { Card } from "@/admin/components/ui/card";
import { Button } from "@/admin/components/ui/button";
import { Input } from "@/admin/components/ui/input";
import { Avatar, AvatarFallback } from "@/admin/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/admin/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/admin/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/admin/components/ui/alert-dialog";
import { UserCog, Plus, Search, Mail, Phone, Trash2, Loader2, AlertCircle, ShieldCheck, Key, RefreshCw, Copy, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { type Employee } from "@/hooks/useSupabaseData";

export const Route = createFileRoute("/admin/_app/employees")({
  head: () => ({
    meta: [
      { title: "Employees — ScanDine" },
      { name: "description", content: "Manage restaurant staff records with live database synchronization." },
    ],
  }),
  component: EmployeesPage,
});

function generateSecurePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
  const u = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const l = "abcdefghijklmnopqrstuvwxyz";
  const n = "0123456789";
  const s = "!@#$%^&*";
  
  let pass = "";
  pass += u[Math.floor(Math.random() * u.length)];
  pass += l[Math.floor(Math.random() * l.length)];
  pass += n[Math.floor(Math.random() * n.length)];
  pass += s[Math.floor(Math.random() * s.length)];
  
  for (let i = 4; i < 12; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return pass.split("").sort(() => 0.5 - Math.random()).join("");
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // New staff form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Employee["role"]>("receptionist");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; role?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation state
  const [staffToDelete, setStaffToDelete] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Auto-generate password when modal opens
  useEffect(() => {
    if (isOpen && !password) {
      setPassword(generateSecurePassword());
    }
  }, [isOpen, password]);

  // Fetch employees directly from Supabase DB
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const { data, error: fetchErr } = await supabase
        .from("sd_employees")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchErr) {
        console.error("Error fetching employees:", fetchErr);
        setError(fetchErr.message);
        toast.error("Failed to load employees from database");
      } else {
        setEmployees(data || []);
      }
    } catch (err: any) {
      console.error("Exception fetching employees:", err);
      setError(err.message || "An unexpected error occurred while fetching staff data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Real-time synchronization for changes on sd_employees table
  useRealtimeTable("sd_employees", fetchEmployees);

  // Search filter
  const filtered = employees.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.email && e.email.toLowerCase().includes(q)) ||
      (e.role && e.role.toLowerCase().includes(q)) ||
      (e.phone && e.phone.includes(q))
    );
  });

  // Handle Add Staff with Full Field & Duplicate Email Validation & Supabase Auth Creation
  const handleAddStaff = async (ev: React.FormEvent) => {
    ev.preventDefault();

    // Field-specific validation
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "Employee Name is required";
    if (!email.trim() || !email.includes("@")) newErrors.email = "Email is required";
    if (!phone.trim()) newErrors.phone = "Phone Number is required";
    if (!role) newErrors.role = "Role is required";
    if (!password.trim() || password.length < 6) newErrors.password = "Password must be at least 6 characters";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setErrors({});

    const cleanEmail = email.trim().toLowerCase();

    // Duplicate Email Check (Local state)
    const existsLocally = employees.some((e) => e.email.toLowerCase() === cleanEmail);
    if (existsLocally) {
      setErrors({ email: "A staff member with this email already exists" });
      toast.error("A staff member with this email address already exists.");
      return;
    }

    setSubmitting(true);

    try {
      if (isSupabaseConfigured) {
        // 1. Duplicate Email Check in Database
        const { data: dbCheck } = await supabase
          .from("sd_employees")
          .select("id")
          .eq("email", cleanEmail);

        if (dbCheck && dbCheck.length > 0) {
          setErrors({ email: "A staff member with this email already exists in database" });
          toast.error("A staff member with this email address already exists in the database.");
          setSubmitting(false);
          return;
        }

        // 2. Create actual Supabase Auth Credentials
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: name.trim(),
              role: role,
            },
          },
        });

        if (authErr && !authErr.message.includes("already registered")) {
          console.error("Supabase Auth Error:", authErr);
          toast.error(`Authentication creation failed: ${authErr.message}`);
          setSubmitting(false);
          return;
        }

        // 3. Store record in sd_employees database table
        const empId = `EMP-${Date.now().toString().slice(-4)}`;
        const newRecord = {
          name: name.trim(),
          email: cleanEmail,
          phone: phone.trim(),
          role: role,
          address: address.trim() || "Main Branch",
          employee_id: empId,
          password_plain: password,
          status: "active",
        };

        const { data: inserted, error: insertErr } = await supabase
          .from("sd_employees")
          .insert([newRecord])
          .select()
          .single();

        if (insertErr) {
          console.error("Supabase insert error:", insertErr);
          toast.error(insertErr.message || "Failed to add staff member to database.");
        } else {
          toast.success(`Staff member "${inserted?.name || name}" and login credentials created successfully!`);
          setName("");
          setEmail("");
          setPhone("");
          setAddress("");
          setPassword("");
          setIsOpen(false);
          await fetchEmployees();
        }
      }
    } catch (err: any) {
      console.error("Failed to add staff:", err);
      toast.error(err.message || "An unexpected error occurred while adding staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Staff with Database Confirmation & Auth Access Revocation
  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    setDeleting(true);

    try {
      const { error: delErr } = await supabase
        .from("sd_employees")
        .delete()
        .eq("id", staffToDelete.id);

      if (delErr) {
        console.error("Supabase delete error:", delErr);
        toast.error(delErr.message || "Failed to remove staff member from database.");
      } else {
        toast.success(`Staff member "${staffToDelete.name}" removed! Login access revoked.`);
        await fetchEmployees();
      }
    } catch (err: any) {
      console.error("Failed to delete staff:", err);
      toast.error(err.message || "An unexpected error occurred while removing staff member.");
    } finally {
      setDeleting(false);
      setStaffToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees & Staff Management"
        description={`${employees.length} team members registered in Supabase database`}
        icon={<UserCog className="h-5 w-5" />}
        actions={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add staff
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Add New Login Credentials
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddStaff} className="space-y-3.5 mt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    placeholder="e.g. Carlos Gomez"
                    className={`mt-1 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {errors.name && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Email Address *</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder="e.g. carlos@scandine.co"
                    className={`mt-1 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {errors.email && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.email}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Phone Number *</label>
                  <Input
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    placeholder="e.g. +1 415 555 0105"
                    className={`mt-1 ${errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {errors.phone && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.phone}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value as Employee["role"]);
                      if (errors.role) setErrors((prev) => ({ ...prev, role: undefined }));
                    }}
                    className={`w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors.role ? "border-destructive" : ""}`}
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="kitchen_staff">Kitchen Staff</option>
                    <option value="waiter">Waiter</option>
                  </select>
                  {errors.role && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.role}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Address / Branch</label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Main Branch, San Francisco"
                    className="mt-1"
                  />
                </div>

                {/* Generate Password Section */}
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-primary" /> Generate Password *
                    </label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10"
                        onClick={() => setPassword(generateSecurePassword())}
                      >
                        <RefreshCw className="h-3 w-3" /> Generate New
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        onClick={() => {
                          if (!password) return;
                          navigator.clipboard.writeText(password);
                          setCopiedPassword(true);
                          toast.success("Password copied to clipboard!");
                          setTimeout(() => setCopiedPassword(false), 2000);
                        }}
                      >
                        {copiedPassword ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedPassword ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. kF8#Pw92Lm!"
                      className={`font-mono text-xs pr-9 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[11px] text-destructive font-medium">{errors.password}</p>}
                </div>

                <div className="flex justify-end gap-2 border-t pt-3 mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Staff"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Staff KPI Summary Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Active staff", value: employees.length, tone: "text-success" },
          { label: "Receptionists", value: employees.filter((e) => e.role === "receptionist").length, tone: "text-info" },
          { label: "Kitchen Staff", value: employees.filter((e) => e.role === "kitchen_staff").length, tone: "text-warning" },
          { label: "Waiters & Other", value: employees.filter((e) => e.role !== "receptionist" && e.role !== "kitchen_staff").length, tone: "text-primary" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`mt-1 font-display text-2xl font-bold ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Controls & Search */}
      <Tabs defaultValue="all">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="all">All Staff ({employees.length})</TabsTrigger>
          </TabsList>
          <div className="relative ml-auto max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search staff by name, email or role…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="all" className="mt-4">
          {loading && employees.length === 0 ? (
            <Card className="p-12 text-center flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Loading staff directory from database…</p>
            </Card>
          ) : error ? (
            <Card className="p-8 text-center border-destructive/30 bg-destructive/5 text-destructive flex flex-col items-center">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="font-semibold text-sm">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchEmployees} className="mt-3">
                Retry Fetching
              </Button>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <UserCog className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-bold text-foreground">No staff members found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "No staff records match your search filter." : "Click 'Add staff' to register your first team member."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((e) => (
                <Card key={e.id} className="group relative overflow-hidden p-5 transition-all hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-destructive/20 font-display font-bold text-primary">
                        {e.name ? e.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "EM"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display font-bold text-foreground">{e.name}</div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {e.role.replace("_", " ")}
                      </div>
                      <div className="mt-1">
                        <StatusBadge status="ready" />
                      </div>
                    </div>

                    {/* Delete Trigger Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                      onClick={() => setStaffToDelete(e)}
                      title="Remove Staff Member"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{e.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{e.phone || "+1 415 555 0100"}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !open && setStaffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Remove Staff Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">{staffToDelete?.name}</span> ({staffToDelete?.email})? This action will permanently delete the record from the Supabase database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Staff"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
