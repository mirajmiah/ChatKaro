import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, User, Mail, Calendar, Shield, Pencil, X, Check, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore.js';
import { useTranslation } from '../lib/i18n.js';
import ImageViewer from '../components/ImageViewer.jsx';

export default function ProfilePage() {
  const { authUser, updateProfile, updateName, updateBio, onlineUsers, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAccountView = location.hash === '#account';
  const { language, t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [showProfileImage, setShowProfileImage] = useState(false);
  const fileInputRef = useRef(null);

  const isOnline = onlineUsers.includes(authUser?._id);

  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(t('Image must be 10 MB or smaller'));
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
    ? new Date(authUser.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : language === 'hi' ? 'hi-IN' : 'en-US', {
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
    <div className="flex-1 flex items-start justify-center px-3 py-5 sm:px-4 sm:py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8">
  <div className="flex w-full justify-start mb-6">
    <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "auto" })} className="btn btn-ghost btn-sm gap-2">
      <ArrowLeft size={16} />
      {t('Back to Chats')}
    </Link>
  </div>

  <div className="text-center">
    <h1 className="text-2xl font-bold">{isAccountView ? t('Account') : t('Your Profile')}</h1>
    <p className="text-base-content/60 mt-1">
      {isAccountView ? t('Account details, membership, and sign out') : t('Manage your account information')}
    </p>
  </div>
</div>

        <div className="card bg-base-200 shadow-xl border border-base-300">
          <div className="card-body items-center gap-6">
            {!isAccountView && (
              <>
            {/* Avatar section */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-primary/30 bg-base-300 flex items-center justify-center">
                {authUser?.profilePic ? (
                  <button
                    type="button"
                    onClick={() => setShowProfileImage(true)}
                    className="h-full w-full cursor-zoom-in"
                    aria-label={t('View profile picture')}
                  >
                    <img
                      src={authUser.profilePic}
                      alt={authUser.fullName}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <span className="text-3xl font-bold text-base-content/50">{initials}</span>
                )}
              </div>

              {/* Online badge */}
              <span
                className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-base-200 ${
                  isOnline ? 'bg-success' : 'bg-base-300'
                }`}
                title={t(isOnline ? 'Online' : 'Offline')}
              />

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-60"
                aria-label={t('Change profile picture')}
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
                {t(isOnline ? 'Online' : 'Offline')}
              </span>
            </div>

            {/* User info fields */}
            <div className="w-full space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-base-300/50">
                <User size={18} className="text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-base-content/50 font-medium uppercase tracking-wide">
                    {t('Full Name')}
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
                        aria-label={t('Save name')}
                      >
                        {isSavingName ? <span className="loading loading-spinner loading-xs" /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        disabled={isSavingName}
                        className="btn btn-ghost btn-sm btn-square"
                        aria-label={t('Cancel name editing')}
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
                        aria-label={t('Edit name')}
                      >
                        <Pencil size={14} />
                        <span>{t('Edit')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-base-300/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
                    {t('About me')}
                  </p>
                  {!isEditingBio && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditedBio(authUser?.bio || '');
                        setIsEditingBio(true);
                      }}
                      className="btn btn-ghost btn-xs"
                      aria-label={t('Edit About me')}
                    >
                      <Pencil size={14} />
                      <span>{t('Edit')}</span>
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
                      aria-label={t('About me')}
                      placeholder={t('Tell your contacts a little about yourself')}
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
                          {isSavingBio ? <span className="loading loading-spinner loading-xs" /> : <><Check size={15} /> {t('Save')}</>}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingBio(false)}
                          disabled={isSavingBio}
                          className="btn btn-ghost btn-sm"
                        >
                          <X size={15} />
                          {t('Cancel')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {authUser?.bio || <span className="text-base-content/50">{t('Add a short introduction about yourself.')}</span>}
                  </p>
                )}
              </div>
              </div>
              </>
            )}
            {isAccountView && (
              <div className="w-full space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-base-300/50">
                <Mail size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-base-content/50 font-medium uppercase tracking-wide">
                    {t('Email')}
                  </p>
                  <p className="font-semibold truncate">{authUser?.email || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-base-300/50">
                <Calendar size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-base-content/50 font-medium uppercase tracking-wide">
                    {t('Member Since')}
                  </p>
                  <p className="font-semibold">{memberSince}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-base-300/50">
                <Shield size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-base-content/50 font-medium uppercase tracking-wide">
                    {t('Account Status')}
                  </p>
                  <p className="font-semibold text-success">{t('Active')}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/login', { replace: true });
                }}
                className="btn btn-error mt-2 w-full gap-2"
              >
                <LogOut size={18} />
                {t('Logout')}
              </button>
              </div>
            )}

            {!isAccountView && (
              <p className="text-xs text-base-content/40 text-center">
                {t('Click the camera icon to upload a new profile photo (max 10MB)')}
              </p>
            )}
          </div>
        </div>
      </div>
      {showProfileImage && (
        <ImageViewer
          src={authUser.profilePic}
          alt={t('Profile picture of {name}', { name: authUser.fullName })}
          closeLabel={t('Close image')}
          onClose={() => setShowProfileImage(false)}
        />
      )}
    </div>
  );
}
