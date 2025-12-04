// src/pages/Profile.tsx
import { useRef,useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Sidebar from "@/components/layout/Sidebar";

import { User, Settings, Globe, Camera, Save } from "lucide-react";
import api from "../api/axiosInstance";

const Profile = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const fileInputRef = useRef<HTMLInputElement | null>(null);
const [avatarFile, setAvatarFile] = useState<File | null>(null);
const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
const [uploading, setUploading] = useState(false);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

 
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    role: "",
    bio: "",
    jurisdiction: "",
    language: "",
    timezone: "",
    avatarUrl: ""  
  });

  // AI-related small prefs (replaces the removed notifications section for AI-specific toggle)
 const onSelectImageClick = () => {
  fileInputRef.current?.click();
};

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0] ?? null;
  if (!file) return;

  // Validation
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert("Please select a PNG, JPG or WEBP image.");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    alert("File too large. Max 5MB.");
    return;
  }

  // Set preview
  const url = URL.createObjectURL(file);
  // revoke previous
  if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  setAvatarFile(file);
  setAvatarPreview(url);
};
// Returns uploaded image URL (string) or null on failure
const uploadAvatar = async (): Promise<string | null> => {
  if (!avatarFile) return null;
  setUploading(true);
  try {
    const form = new FormData();
    form.append("avatar", avatarFile);

    // If you have an api instance configured with baseURL and auth, use that instead of axios.
    const res = await api.post("/uploadProfileImage", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        // optional: you can show progress to user
        // const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
      },
    });

    setUploading(false);
    if (res.data?.success && res.data?.url) {
      return res.data.url;
    } else {
      alert("Image upload failed");
      return null;
    }
  } catch (err) {
    setUploading(false);
    console.error("Upload failed", err);
    alert("Image upload failed");
    return null;
  }
};

  useEffect(() => {
  console.log("avatarPreview:", avatarPreview);
  console.log("profile.avatarUrl:", profile.avatarUrl);
}, [avatarPreview, profile.avatarUrl]);

  // Fetch profile
  useEffect(() => {
  const fetchProfile = async () => {
    try {
      const res = await api.get("/getProfile");
      if (res.data?.success && res.data.user) {
        // Merge server fields into existing profile shape to avoid missing keys
        setProfile(prev => ({ ...prev, ...res.data.user }));
        // If server returns avatar URL and you want to preview it when no local selection:
        if (res.data.user.avatarUrl && !avatarPreview) {
          setAvatarPreview(null); // ensure preview uses avatarUrl via <AvatarImage src={avatarPreview ?? profile.avatarUrl} />
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };
  fetchProfile();
}, []); // keep empty deps

  // Save profile
  const saveProfile = async () => {
  try {
    // Upload avatar if user selected a new one
    let avatarUrl = profile.avatarUrl || "";
    if (avatarFile) {
      const uploaded = await uploadAvatar();
      if (uploaded) avatarUrl = uploaded;
      // optionally: if upload failed (uploaded === null) you can abort save
    }

    const payload = { ...profile, avatarUrl };
    const response = await api.put("/updateProfile", payload);
    const data = response.data;

    if (data?.success) {
  // 1) Merge returned user into profile (ensures avatarUrl is present)
  setProfile(prev => ({ ...prev, ...data.user }));

  // 2) Make sure avatarPreview shows the persisted URL (so AvatarImage loads it)
  // prefer returned user.avatarUrl (if available), otherwise keep existing preview
  const persistedUrl = data.user?.avatarUrl ?? profile.avatarUrl ?? null;
  if (persistedUrl) {
    // revoke old blob URL if any
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(persistedUrl);
  }

  // 3) Clear local file selection but keep preview so image stays visible
  setAvatarFile(null);

  alert("Profile updated successfully");
}

  } catch (error) {
    console.error("Error updating profile:", error);
    alert("Failed to update profile");
  }
};

  return (
    <div className="flex min-h-screen bg-gradient-soft">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile & Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            {/* Only Profile and Settings tabs remain */}
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Profile</span>
              </TabsTrigger>

              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Profile Picture */}
                <Card className="border-border shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Camera className="w-5 h-5 text-primary" />
                      <span>Profile Picture</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center space-y-4">
  <Avatar className="w-32 h-32">
    <AvatarImage src={avatarPreview ?? profile.avatarUrl ?? ""} />
    <AvatarFallback className="text-2xl">
      {profile.firstName?.charAt(0) || ""}
      {profile.lastName?.charAt(0) || ""}
    </AvatarFallback>
  </Avatar>

  <div className="text-center">
    <p className="font-semibold text-foreground">
      {profile.firstName} {profile.lastName}
    </p>
    <p className="text-sm text-muted-foreground">{profile.role}</p>
  </div>

  <input
    type="file"
    ref={fileInputRef}
    className="hidden"
    accept="image/png, image/jpeg, image/webp"
    onChange={handleFileChange}
  />

  <div className="w-full flex gap-2">
    <Button variant="outline" className="flex-1" onClick={onSelectImageClick} disabled={uploading}>
      <Camera className="w-4 h-4 mr-2" />
      {avatarFile ? "Change Photo" : "Upload Photo"}
    </Button>

    {avatarFile && (
      <Button
        variant="ghost"
        className="flex-1"
        onClick={() => {
          // clear selected preview
          if (avatarPreview) URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(null);
          setAvatarFile(null);
        }}
        disabled={uploading}
      >
        Remove
      </Button>
    )}
  </div>
</CardContent>

                </Card>

                {/* Personal Information */}
                <Card className="lg:col-span-2 border-border shadow-soft">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={profile.firstName}
                          onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={profile.lastName}
                          onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <p className="p-2 border rounded bg-gray-100">{profile.email}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          value={profile.company}
                          onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        value={profile.role}
                        onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="grid gap-6">
                <Card className="border-border shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-primary" />
                      <span>Regional Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="jurisdiction">Legal Jurisdiction</Label>
                        <Select
                          value={profile.jurisdiction}
                          onValueChange={(value) => setProfile({ ...profile, jurisdiction: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select jurisdiction" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usa">United States</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="canada">Canada</SelectItem>
                            <SelectItem value="australia">Australia</SelectItem>
                            <SelectItem value="eu">European Union</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select
                          value={profile.language}
                          onValueChange={(value) => setProfile({ ...profile, language: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                          value={profile.timezone}
                          onValueChange={(value) => setProfile({ ...profile, timezone: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="america/new_york">Eastern Time</SelectItem>
                            <SelectItem value="america/chicago">Central Time</SelectItem>
                            <SelectItem value="america/denver">Mountain Time</SelectItem>
                            <SelectItem value="america/los_angeles">Pacific Time</SelectItem>
                            <SelectItem value="europe/london">London</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              
              </div>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={saveProfile}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
