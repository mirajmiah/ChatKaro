import { useState, useRef } from 'react';
import { ArrowLeft, Camera, User, Mail, Calendar, Shield, Pencil, X, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore.js';

export default function ProfilePage() {
  const { authUser, updateProfile, updateName, updateBio, onlineUsers } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const fileInputRef = useRef(null);

  const isOnline = onlineUsers.includes(authUser?._id);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      setIsUploading(true);
      try {
        await updateProfile({ profilePic: reader.result });
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(authUser?.fullName || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState(authUser?.bio || '');

  const handleSaveName = async () => {
    const name = editedName.trim();
    if (!name) return;

    setIsSavingName(true);
    try {
      await updateName(name);
      setIsEditingName(false);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveBio = async () => {
    setIsSavingBio(true);
    try {
      await updateBio(editedBio);
      setIsEditingBio(false);
    } finally {
      setIsSavingBio(false);
    }
  };

  const memberSince = authUser?.createdAt
    ? new Date(authUser.createdAt).toLocaleDateString([], {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  const initials = authUser?.fullName
    ? authUser.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div className="flex-1 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8">
  <div className="flex w-full justify-start mb-6">
    <Link to="/" className="btn btn-ghost btn-sm gap-2">
      <ArrowLeft size={16} />
      Back to Chats
    </Link>
  </div>

  <div className="text-center">
    <h1 className="text-2xl font-bold">Your Profile</h1>
    <p className="text-base-content/60 mt-1">
      Manage your account information
    </p>
  </div>
</div>

        <div className="card bg-base-200 shadow-xl border border-base-300">
          <div className="card-body items-center gap-6">
            {/* Avatar section */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-primary/30 bg-base-300 flex items-center justify-center">
                {authUser?.profilePic ? (
                  <img
                    src={authUser.profilePic}
                    alt={authUser.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-base-content/50">{initials}</span>
                )}
              </div>

              {/* Online badge */}
              <span
                className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-base-200 ${
                  isOnline ? 'bg-success' : 'bg-base-300'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-60"
                aria-label="Change profile picture"
              >
                {isUploading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Camera size={16} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Online status text */}
            <div className="flex items-center gap-2">
              <span
                className={`badge gap-1.5 ${
                  isOnline ? 'badge-success badge-outline' : 'badge-ghost'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success' : 'bg-base-content/30'}`}
                />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* User info fields */}
            <div className="w-full space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-base-300/50">
                <User size={18} className="text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-base-content/50 font-medium uppercase tracking-wide">
                    Full Name
                  </p>
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="input input-bordered input-sm min-w-0 flex-1"
                        autoFocus
                        maxLength={80}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') setIsEditingName(false);
                        }}
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={isSavingName}
                        className="btn btn-primary btn-sm btn-square"
                        aria-label="Save name"
                      >
                        {isSavingName ? <span className="loading loading-spinner loading-xs" /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        disabled={isSavingName}
                        className="btn btn-ghost btn-sm btn-square"
                        aria-label="Cancel name editing"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{authUser?.fullName || '—'}</p>
                      <button
                        onClick={() => {
                          setEditedName(authUser?.fullName || '');
                          setIsEditingName(true);
                        }}
                        className="btn btn-ghost btn-xs"
                        aria-label="Edit name"
                      >
                        <Pencil size={14} />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-base-300/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
                    About me
                  </p>
                  {!isEditingBio && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditedBio(authUser?.bio || '');
                        setIsEditingBio(true);
                      }}
                      className="btn btn-ghost btn-xs"
                      aria-label="Edit About me"
                    >
                      <Pencil size={14} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
                {isEditingBio ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedBio}
                      onChange={(event) => setEditedBio(event.target.value)}
                      className="textarea textarea-bordered w-full"
                      rows={5}
                      maxLength={600}
                      aria-label="About me"
                      placeholder="Tell your contacts a little about yourself"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-base-content/50">{editedBio.length}/600</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveBio}
                          disabled={isSavingBio}
                          className="btn btn-primary btn-sm"
                        >
                          {isSavingBio ? <span className="loading loading-spinner loading-xs" /> : <><Check size={15} /> Save</>}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingBio(false)}
                          disabled={isSavingBio}
                          className="btn btn-ghost btn-sm"
                        >
                          <X size={15} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {authUser?.bio || <span className="text-base-content/50">Add a short introduction about yourself.</span>}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-base-300/50">
                <Mail size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-base-content/50 font-medium uppercase tracking-wide">
                    Email
                  </p>
                  <p className="font-semibold truncate">{authUser?.email || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-base-300/50">
                <Calendar size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-base-content/50 font-medium uppercase tracking-wide">
                    Member Since
                  </p>
                  <p className="font-semibold">{memberSince}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-base-300/50">
                <Shield size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-base-content/50 font-medium uppercase tracking-wide">
                    Account Status
                  </p>
                  <p className="font-semibold text-success">Active</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-base-content/40 text-center">
              Click the camera icon to upload a new profile photo (max 5MB)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
