"use client";

import React, { useEffect, useState, useRef } from "react";
import { Icon } from "@/components/icons/Icon";
import type { TeamPod, TeamMemberUser, MemberPortfolioItem } from "@/db";
import { ArchitecturalPreview } from "@/components/public/TeamShowcase";
import type { StaffIdentity } from "./OperationsOS";

export function isImageUrl(val?: string | null): boolean {
  if (!val) return false;
  const str = val.trim();
  return (
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    str.startsWith("data:image/") ||
    str.startsWith("/") ||
    str.startsWith("blob:")
  );
}

function extractDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return urlStr;
  }
}

const COLOR_PRESETS = [
  { name: "TVL Amber", value: "#FBD227" },
  { name: "Neon Cyan", value: "#00F0FF" },
  { name: "Emerald", value: "#10B981" },
  { name: "Violet", value: "#A855F7" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Electric Blue", value: "#3B82F6" },
  { name: "Coral", value: "#FB923C" },
];

interface MyProfileCardViewProps {
  staff: StaffIdentity;
  onProfileUpdated?: (updated: {
    name: string;
    email: string;
    memberLabel: string | null;
    avatar?: string;
  }) => void;
}

export function MyProfileCardView({ staff, onProfileUpdated }: MyProfileCardViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pods, setPods] = useState<TeamPod[]>([]);
  const [_memberId, setMemberId] = useState<string>("");

  // Account & Credentials
  const [name, setName] = useState(staff.name || "");
  const [username, setUsername] = useState(
    staff.memberLabel ? staff.memberLabel.replace(/^@/, "") : ""
  );
  const [email, setEmail] = useState(staff.email || "");
  const [newPassword, setNewPassword] = useState("");

  // Profile & Card
  const [avatar, setAvatar] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [teamId, setTeamId] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [portfolioCollection, setPortfolioCollection] = useState<MemberPortfolioItem[]>([]);

  // Preview interactive state
  const [deckIndex, setDeckIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"stacked" | "grid">("stacked");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch initial profile & member data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch("/api/staff/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load staff profile");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.ok) {
          if (Array.isArray(data.pods)) {
            setPods(data.pods);
          }
          if (data.staff) {
            setName(data.staff.name || "");
            setEmail(data.staff.email || "");
            if (data.staff.memberLabel) {
              setUsername(data.staff.memberLabel.replace(/^@/, ""));
            }
          }
          if (data.member) {
            const m = data.member as TeamMemberUser;
            setMemberId(m.id || "");
            if (m.name) setName(m.name);
            if (m.email) setEmail(m.email);
            if (m.username) setUsername(m.username.replace(/^@/, ""));
            setRoleTitle(m.roleTitle || "");
            setTeamId(m.teamId || "");
            setBio(m.bio || "");
            setSkills(m.skills ? m.skills.join(", ") : "");
            setPortfolioUrl(m.portfolioUrl || "");
            setAvatar(m.avatar || m.avatarUrl || "");
            setPortfolioCollection(
              m.portfolioCollection ? structuredClone(m.portfolioCollection) : []
            );
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("Could not load /api/staff/me:", err);
          // Fallback to initial staff prop values
          setName(staff.name || "");
          setEmail(staff.email || "");
          if (staff.memberLabel) setUsername(staff.memberLabel.replace(/^@/, ""));
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [staff]);

  // Image upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, SVG, WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Image is larger than 2MB. Please select a smaller photo or paste an image URL.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add new portfolio card
  const handleAddCard = () => {
    const newCard: MemberPortfolioItem = {
      id: `port-${Date.now()}`,
      title: "",
      url: "",
      tag: "PRODUCTION BUILD",
      description: "",
      accentColor: "#FBD227",
    };
    setPortfolioCollection((prev) => [...prev, newCard]);
  };

  // Update card field
  const handleUpdateCard = (idx: number, patch: Partial<MemberPortfolioItem>) => {
    setPortfolioCollection((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    );
  };

  // Remove card
  const handleRemoveCard = (idx: number) => {
    setPortfolioCollection((prev) => prev.filter((_, i) => i !== idx));
  };

  // Save profile & card handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessNotice(null);
    setErrorMessage(null);

    const parsedSkills = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const cleanedCards = portfolioCollection
      .filter((c) => c.title.trim() && c.url.trim())
      .map((c) => ({
        ...c,
        id: c.id || `port-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: c.title.trim(),
        url: c.url.trim(),
        tag: c.tag?.trim() || "PRODUCTION BUILD",
        description: c.description?.trim() || "",
        accentColor: c.accentColor || "#FBD227",
        previewImage: c.previewImage?.trim() || undefined,
      }));

    try {
      const res = await fetch("/api/staff/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          username: username.trim(),
          newPassword: newPassword.trim() || undefined,
          avatar: avatar.trim() || undefined,
          avatarUrl: avatar.trim() || undefined,
          roleTitle: roleTitle.trim() || undefined,
          teamId: teamId || null,
          bio: bio.trim(),
          skills: parsedSkills,
          portfolioUrl: portfolioUrl.trim(),
          portfolioCollection: cleanedCards,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setSuccessNotice("Saved! Your card is updated on the homepage.");
        setNewPassword(""); // Clear password field after successful update
        if (data.member?.id) {
          setMemberId(data.member.id);
        }
        if (onProfileUpdated) {
          onProfileUpdated({
            name: name.trim(),
            email: email.trim(),
            memberLabel: username.trim() ? `@${username.trim()}` : null,
            avatar: avatar.trim() || undefined,
          });
        }
      } else {
        setErrorMessage(data?.error || "Failed to save profile. Please check your inputs.");
      }
    } catch (err) {
      console.error("Save profile error:", err);
      setErrorMessage("Network error. Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  // Selected Pod Details
  const assignedPod = pods.find((p) => p.id === teamId);
  const podColor = assignedPod?.color || "#FBD227";

  // Active Portfolio Cards for Live Preview
  const previewCards: MemberPortfolioItem[] =
    portfolioCollection.length > 0
      ? portfolioCollection.filter((c) => c.title.trim() || c.url.trim())
      : portfolioUrl.trim()
      ? [
          {
            id: "fallback-primary",
            title: `${name || "My"} Primary Portfolio`,
            url: portfolioUrl.trim(),
            tag: "PRIMARY WEBSITE",
            description: `Official digital portfolio and interactive client build archive for ${name || "team member"}.`,
            accentColor: podColor,
          },
        ]
      : [];

  const totalCards = previewCards.length;
  const activeCardIndex = totalCards > 0 ? ((deckIndex % totalCards) + totalCards) % totalCards : 0;
  const currentCard = totalCards > 0 ? previewCards[activeCardIndex] : null;

  const displayInitial = (name.trim().charAt(0) || "V").toUpperCase();
  const hasAvatarImage = isImageUrl(avatar);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FBD227] border-t-transparent" />
          <p className="font-mono text-xs uppercase tracking-wider text-gray-400">Loading your profile & card...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#262626] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#FBD227] bg-[#FBD227]/10 px-2 py-0.5 rounded border border-[#FBD227]/30">
              Self-Service Editor
            </span>
            <span className="font-mono text-xs text-gray-400">&bull; {staff.role === "admin" ? "Studio Admin" : "Team Member"}</span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white">
            My Profile & Team Card
          </h1>
          <p className="font-sans text-sm text-gray-400 mt-1 max-w-2xl">
            Update your account credentials, login password, public team member card, bio, skills, and interactive website portfolio deck.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/#team"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#333333] bg-[#141414] px-3.5 py-2 font-mono text-xs font-bold text-gray-300 hover:border-[#FBD227] hover:text-[#FBD227] transition-colors"
          >
            <span>View Public Card Deck</span>
            <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successNotice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-emerald-200 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
              ✓
            </span>
            <div>
              <p className="font-sans text-sm font-bold text-emerald-100">{successNotice}</p>
              <p className="font-mono text-xs text-emerald-300/80">Changes are synchronized to the homepage and client discovery view.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-400 hover:text-white p-1"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-rose-200 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 font-bold">
              !
            </span>
            <p className="font-sans text-sm font-medium">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white p-1"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Left Form Editor, Right Live Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Editor (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* SECTION 1: Account & Credentials */}
          <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#222222] pb-3">
              <Icon name="shield" className="h-4 w-4 text-[#FBD227]" />
              <h2 className="font-monument text-sm uppercase tracking-wider font-bold text-white">
                Account & Login Credentials
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan S."
                  className="w-full rounded-lg border border-[#333333] bg-[#181818] px-3.5 py-2.5 font-sans text-sm text-white placeholder-gray-500 focus:border-[#FBD227] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                  Username / Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono text-sm text-gray-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
                    placeholder="jordans"
                    className="w-full rounded-lg border border-[#333333] bg-[#181818] pl-8 pr-3.5 py-2.5 font-mono text-sm text-white placeholder-gray-500 focus:border-[#FBD227] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@thevirtuslabs.com"
                  className="w-full rounded-lg border border-[#333333] bg-[#181818] px-3.5 py-2.5 font-sans text-sm text-white placeholder-gray-500 focus:border-[#FBD227] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                  Update Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep existing"
                  className="w-full rounded-lg border border-[#333333] bg-[#181818] px-3.5 py-2.5 font-sans text-sm text-white placeholder-gray-500 focus:border-[#FBD227] focus:outline-none transition-colors"
                />
                <p className="font-mono text-[10px] text-gray-500 mt-1">Min 12 characters if updating.</p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Profile Picture / Avatar */}
          <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#222222] pb-3">
              <Icon name="user" className="h-4 w-4 text-[#FBD227]" />
              <h2 className="font-monument text-sm uppercase tracking-wider font-bold text-white">
                Profile Picture & Monogram
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 font-monument text-2xl font-bold text-white bg-[#181818] shadow-md"
                style={{ borderColor: `${podColor}80` }}
              >
                {hasAvatarImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <span>{displayInitial}</span>
                )}
              </div>

              <div className="space-y-2 flex-1 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#333333] bg-[#1C1C1C] px-3 py-1.5 font-mono text-xs font-bold text-gray-200 hover:border-[#FBD227] hover:text-white transition-colors"
                  >
                    <Icon name="upload" className="h-3.5 w-3.5 text-[#FBD227]" />
                    <span>Upload Image File</span>
                  </button>

                  {hasAvatarImage && (
                    <button
                      type="button"
                      onClick={() => setAvatar("")}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/20 px-2.5 py-1.5 font-mono text-xs font-bold text-rose-300 hover:text-rose-200 transition-colors"
                    >
                      <Icon name="close" className="h-3 w-3" />
                      <span>Use Monogram</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    Or Paste Image URL directly:
                  </label>
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://images.unsplash.com/... or /images/..."
                    className="w-full rounded-lg border border-[#2B2B2B] bg-[#161616] px-3 py-2 font-mono text-xs text-white placeholder-gray-600 focus:border-[#FBD227] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Role, Pod & Specialist Statement */}
          <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#222222] pb-3">
              <Icon name="bolt" className="h-4 w-4 text-[#FBD227]" />
              <h2 className="font-monument text-sm uppercase tracking-wider font-bold text-white">
                Studio Specialization & Pod Assignment
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                  Role Title *
                </label>
                <input
                  type="text"
                  required
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Lead Brand & System Designer"
                  className="w-full rounded-lg border border-[#333333] bg-[#181818] px-3.5 py-2.5 font-sans text-sm text-white placeholder-gray-500 focus:border-[#FBD227] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                  Assigned Specialty Pod
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full rounded-lg border border-[#333333] bg-[#181818] px-3.5 py-2.5 font-sans text-sm text-white focus:border-[#FBD227] focus:outline-none transition-colors"
                >
                  <option value="">(Unassigned / General Studio Roster)</option>
                  {pods.map((pod) => (
                    <option key={pod.id} value={pod.id}>
                      {pod.name} ({pod.focusArea || "Specialist Pod"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                Specialist Bio / Directional Statement
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Senior craftsperson directing brand architectures and high-conviction client digital systems..."
                className="w-full rounded-lg border border-[#333333] bg-[#181818] p-3 font-sans text-sm text-white placeholder-gray-500 focus:border-[#FBD227] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                Core Skills & Capabilities (comma-separated)
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Next.js, TypeScript, Brand Systems, WebGL, UI/UX"
                className="w-full rounded-lg border border-[#333333] bg-[#181818] px-3.5 py-2.5 font-sans text-sm text-white placeholder-gray-500 focus:border-[#FBD227] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* SECTION 4: Personal Website URL */}
          <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#222222] pb-3">
              <Icon name="link" className="h-4 w-4 text-[#FBD227]" />
              <h2 className="font-monument text-sm uppercase tracking-wider font-bold text-white">
                Personal Website & Main Portfolio
              </h2>
            </div>

            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                Personal Website URL
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://jordans.design or https://member.thevirtuslabs.com"
                className="w-full rounded-lg border border-[#333333] bg-[#181818] px-3.5 py-2.5 font-mono text-sm text-white placeholder-gray-500 focus:border-[#FBD227] focus:outline-none transition-colors"
              />
              <p className="font-mono text-[10px] text-gray-500 mt-1">
                Featured as the direct &quot;Personal Website&quot; badge link on your public team card.
              </p>
            </div>
          </div>

          {/* SECTION 5: Portfolio Website Card Collection */}
          <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2">
                <Icon name="folder" className="h-4 w-4 text-[#FBD227]" />
                <h2 className="font-monument text-sm uppercase tracking-wider font-bold text-white">
                  Portfolio Website Card Collection ({portfolioCollection.length})
                </h2>
              </div>

              <button
                type="button"
                onClick={handleAddCard}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FBD227] px-3 py-1.5 font-mono text-xs font-bold text-black hover:bg-[#ffe366] transition-colors shadow"
              >
                <Icon name="plus" className="h-3.5 w-3.5 text-black" />
                <span>Add Website Card</span>
              </button>
            </div>

            {portfolioCollection.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#2F2F2F] bg-[#141414] p-6 text-center">
                <Icon name="folder" className="mx-auto h-8 w-8 text-gray-500 mb-2" />
                <p className="font-sans text-sm text-gray-300 font-semibold">No website cards added yet</p>
                <p className="font-mono text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Click &quot;Add Website Card&quot; to showcase your client builds, platforms, design archives, and live applications.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {portfolioCollection.map((card, idx) => (
                  <div
                    key={card.id || idx}
                    className="relative rounded-xl border border-[#2B2B2B] bg-[#141414] p-4 sm:p-5 space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: card.accentColor || "#FBD227" }}
                        />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
                          Card {String(idx + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCard(idx)}
                        className="rounded p-1 text-gray-500 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                        title="Remove this card"
                      >
                        <Icon name="close" className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-mono text-[10px] uppercase text-gray-400 mb-1">
                          Card Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={card.title}
                          onChange={(e) => handleUpdateCard(idx, { title: e.target.value })}
                          placeholder="e.g. Tidewater Fleet Telematics"
                          className="w-full rounded border border-[#333333] bg-[#181818] px-3 py-2 font-sans text-xs text-white focus:border-[#FBD227] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[10px] uppercase text-gray-400 mb-1">
                          Live Website URL *
                        </label>
                        <input
                          type="url"
                          required
                          value={card.url}
                          onChange={(e) => handleUpdateCard(idx, { url: e.target.value })}
                          placeholder="https://..."
                          className="w-full rounded border border-[#333333] bg-[#181818] px-3 py-2 font-mono text-xs text-white focus:border-[#FBD227] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-mono text-[10px] uppercase text-gray-400 mb-1">
                          Category Tag
                        </label>
                        <input
                          type="text"
                          value={card.tag || ""}
                          onChange={(e) => handleUpdateCard(idx, { tag: e.target.value })}
                          placeholder="PRODUCTION BUILD, DESIGN SYSTEM"
                          className="w-full rounded border border-[#333333] bg-[#181818] px-3 py-2 font-mono text-xs text-white focus:border-[#FBD227] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[10px] uppercase text-gray-400 mb-1">
                          Accent Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={card.accentColor || "#FBD227"}
                            onChange={(e) => handleUpdateCard(idx, { accentColor: e.target.value })}
                            className="h-8 w-10 cursor-pointer rounded border border-[#333333] bg-transparent p-0.5"
                          />
                          <div className="flex flex-wrap gap-1">
                            {COLOR_PRESETS.slice(0, 5).map((preset) => (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => handleUpdateCard(idx, { accentColor: preset.value })}
                                style={{ backgroundColor: preset.value }}
                                className="h-5 w-5 rounded-full border border-white/20 transition-transform hover:scale-110"
                                title={preset.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-gray-400 mb-1">
                        Preview Image URL (Optional - leaves architectural vector if blank)
                      </label>
                      <input
                        type="url"
                        value={card.previewImage || ""}
                        onChange={(e) => handleUpdateCard(idx, { previewImage: e.target.value })}
                        placeholder="https://... or /images/..."
                        className="w-full rounded border border-[#333333] bg-[#181818] px-3 py-2 font-mono text-xs text-white focus:border-[#FBD227] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-gray-400 mb-1">
                        Description / Client Impact
                      </label>
                      <textarea
                        rows={2}
                        value={card.description || ""}
                        onChange={(e) => handleUpdateCard(idx, { description: e.target.value })}
                        placeholder="Comprehensive telemetry system built for ocean shipping logistics..."
                        className="w-full rounded border border-[#333333] bg-[#181818] p-2.5 font-sans text-xs text-white focus:border-[#FBD227] focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-[#262626]">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FBD227] px-6 py-3 font-monument text-sm font-bold uppercase text-black hover:bg-[#ffe366] transition-all disabled:opacity-50 shadow-lg cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Icon name="check" className="h-4 w-4 text-black" />
                  <span>Save Profile & Card</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Column: Live Interactive Card Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FBD227] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FBD227]"></span>
              </span>
              <h3 className="font-monument text-xs uppercase tracking-wider text-white font-bold">
                Live Public Card Preview
              </h3>
            </div>
            <span className="font-mono text-[10px] text-gray-500">Real-time simulation</span>
          </div>

          {/* Render Preview Card */}
          <div className="relative flex flex-col justify-between rounded-xl border border-[#2B2B2B] bg-[#111111] p-5 sm:p-6 shadow-2xl overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: podColor }} />

            <div>
              {/* Header: Avatar, Name, Handle, Role, Pod */}
              <div className="flex items-start gap-3.5 mb-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-monument text-lg font-bold text-white border overflow-hidden shadow-inner"
                  style={{ backgroundColor: "#181818", borderColor: `${podColor}60` }}
                >
                  {hasAvatarImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    displayInitial
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {assignedPod ? (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#202020] text-gray-300 border border-[#333333]">
                        {assignedPod.name}
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#202020] text-gray-400 border border-[#333333]">
                        Studio Specialist
                      </span>
                    )}
                  </div>

                  <h4 className="font-monument text-base sm:text-lg font-bold uppercase text-white truncate">
                    {name || "Team Member"}
                  </h4>

                  {username && (
                    <p className="font-mono text-xs text-[#FBD227] font-semibold tracking-wider">
                      @{username}
                    </p>
                  )}

                  <p className="font-mono text-xs text-gray-300 font-medium">
                    {roleTitle || "Specialist Designer / Engineer"}
                  </p>
                </div>
              </div>

              {/* Bio Statement */}
              {bio ? (
                <p className="font-sans text-xs text-gray-300 leading-relaxed mb-3.5">
                  {bio}
                </p>
              ) : (
                <p className="font-sans text-xs text-gray-600 italic mb-3.5">
                  No directional bio statement provided yet.
                </p>
              )}

              {/* Skills Tags */}
              {skills.trim() && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {skills
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((s, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#181818] text-gray-300 border border-[#2B2B2B]"
                      >
                        {s}
                      </span>
                    ))}
                </div>
              )}

              {/* Personal Website Line */}
              <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-[#161616] border border-[#242424] font-mono text-xs mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <Icon name="link" className="h-3 w-3 text-[#FBD227]" />
                    <span>Personal Website:</span>
                  </span>
                  {portfolioUrl.trim() ? (
                    <a
                      href={portfolioUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#FBD227] hover:underline font-semibold truncate"
                    >
                      <span className="truncate">{extractDomain(portfolioUrl.trim())}</span>
                      <Icon name="arrow-up-right" className="h-2.5 w-2.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-gray-500 italic text-[11px]">Not configured</span>
                  )}
                </div>
              </div>
            </div>

            {/* Portfolio Website Cards Live Section */}
            {totalCards > 0 ? (
              <div className="mt-2 border-t border-[#222222] pt-3.5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Icon name="folder" className="h-3.5 w-3.5 text-[#FBD227]" />
                    <span className="font-monument text-[11px] uppercase tracking-wider text-gray-300">
                      Portfolio Deck
                    </span>
                    <span className="font-mono text-[10px] font-bold text-[#FBD227] bg-[#FBD227]/10 px-1.5 py-0.5 rounded border border-[#FBD227]/20">
                      {String(activeCardIndex + 1).padStart(2, "0")} / {String(totalCards).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === "stacked" ? "grid" : "stacked")}
                      className="px-2 py-0.5 rounded bg-[#1C1C1C] text-gray-400 hover:text-white font-mono text-[10px] border border-[#2C2C2C] transition-colors"
                    >
                      {viewMode === "stacked" ? "Fan" : "Deck"}
                    </button>
                    {viewMode === "stacked" && totalCards > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setDeckIndex((prev) => (prev === 0 ? totalCards - 1 : prev - 1))}
                          className="h-6 w-6 flex items-center justify-center rounded bg-[#1C1C1C] hover:bg-[#FBD227] hover:text-black text-gray-300 border border-[#2C2C2C] transition-colors"
                        >
                          <Icon name="chevron-left" className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeckIndex((prev) => (prev + 1) % totalCards)}
                          className="h-6 w-6 flex items-center justify-center rounded bg-[#1C1C1C] hover:bg-[#FBD227] hover:text-black text-gray-300 border border-[#2C2C2C] transition-colors"
                        >
                          <Icon name="chevron-right" className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {viewMode === "stacked" && currentCard && (
                  <div className="rounded-xl border border-[#282828] bg-[#161616] p-3.5 space-y-2.5 transition-all">
                    {/* Visual Preview */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[#262626] bg-[#0E0E0E]">
                      {currentCard.previewImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentCard.previewImage}
                          alt={currentCard.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ArchitecturalPreview
                          item={currentCard}
                          accentColor={currentCard.accentColor || podColor}
                        />
                      )}
                      <span
                        className="absolute top-2 left-2 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold tracking-wider uppercase text-black"
                        style={{ backgroundColor: currentCard.accentColor || podColor }}
                      >
                        {currentCard.tag || "PRODUCTION BUILD"}
                      </span>
                    </div>

                    {/* Card Title & Link */}
                    <div className="flex items-start justify-between gap-2 pt-1">
                      <div className="min-w-0">
                        <h5 className="font-monument text-xs font-bold uppercase text-white truncate">
                          {currentCard.title || "Website Project"}
                        </h5>
                        {currentCard.description && (
                          <p className="font-sans text-[11px] text-gray-400 line-clamp-2 mt-0.5">
                            {currentCard.description}
                          </p>
                        )}
                      </div>

                      {currentCard.url && (
                        <a
                          href={currentCard.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded bg-[#202020] hover:bg-[#FBD227] hover:text-black text-gray-200 font-mono text-[10px] font-bold transition-colors shrink-0"
                        >
                          <span>Visit</span>
                          <Icon name="arrow-up-right" className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                    {previewCards.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-[#242424] bg-[#141414] hover:border-[#383838] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.accentColor || podColor }}
                          />
                          <div className="min-w-0">
                            <p className="font-monument text-[11px] font-bold uppercase text-white truncate">
                              {item.title}
                            </p>
                            <p className="font-mono text-[9px] text-gray-500 truncate">{extractDomain(item.url)}</p>
                          </div>
                        </div>

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FBD227] hover:underline font-mono text-[10px] shrink-0"
                          >
                            Live &rarr;
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 border-t border-[#222222] pt-3 text-center py-4 bg-[#141414] rounded-lg border border-dashed border-[#242424]">
                <p className="font-mono text-xs text-gray-500">No portfolio website cards in deck yet.</p>
                <p className="font-sans text-[11px] text-gray-600 mt-0.5">Add cards on the left to see them render here live.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
