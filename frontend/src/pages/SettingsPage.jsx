import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, Palette } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore.js';

const GUIDE_LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'bn', label: 'বাংলা' },
  { id: 'hi', label: 'हिन्दी' },
];

const USAGE_GUIDE = {
  en: {
    title: 'How to use ChatKaro',
    description: 'Follow these steps to find people and start chatting.',
    steps: [
      {
        title: 'Find someone',
        description: 'On the Chats page, search using the person’s exact account email, then choose Search contact.',
      },
      {
        title: 'Send a contact request',
        description: 'Choose Send request. The other person must accept it before you can chat normally.',
      },
      {
        title: 'Start a conversation',
        description: 'Once connected, select them from your contacts. Type a message and press Enter to send; use Shift + Enter for a new line. Use the paperclip to attach an image, video, or supported file up to 5 MB.',
      },
      {
        title: 'Review incoming requests',
        description: 'Accept or decline contact requests in Contact requests. You can preview messages in Message requests before accepting or declining them.',
      },
    ],
  },
  bn: {
    title: 'ChatKaro কীভাবে ব্যবহার করবেন',
    description: 'মানুষ খুঁজে তাদের সঙ্গে চ্যাট শুরু করতে নিচের ধাপগুলো অনুসরণ করুন।',
    steps: [
      {
        title: 'কাউকে খুঁজুন',
        description: 'Chats পেজে গিয়ে সেই ব্যক্তির অ্যাকাউন্টের সঠিক ইমেইল লিখুন, তারপর Search contact নির্বাচন করুন।',
      },
      {
        title: 'কন্ট্যাক্ট অনুরোধ পাঠান',
        description: 'Send request নির্বাচন করুন। সাধারণভাবে চ্যাট করার আগে অন্য ব্যক্তিকে অনুরোধটি গ্রহণ করতে হবে।',
      },
      {
        title: 'কথোপকথন শুরু করুন',
        description: 'সংযুক্ত হওয়ার পর কন্ট্যাক্ট তালিকা থেকে ব্যক্তিকে নির্বাচন করুন। বার্তা লিখে Enter চাপলে পাঠানো হবে; নতুন লাইন দিতে Shift + Enter চাপুন। পেপারক্লিপ দিয়ে ৫ MB পর্যন্ত ছবি, ভিডিও বা সমর্থিত ফাইল পাঠাতে পারবেন।',
      },
      {
        title: 'আসা অনুরোধগুলো দেখুন',
        description: 'Contact requests থেকে কন্ট্যাক্ট অনুরোধ গ্রহণ বা প্রত্যাখ্যান করুন। Message requests-এর বার্তা গ্রহণ বা প্রত্যাখ্যান করার আগে দেখে নিতে পারবেন।',
      },
    ],
  },
  hi: {
    title: 'ChatKaro का उपयोग कैसे करें',
    description: 'लोगों को खोजने और उनसे चैट शुरू करने के लिए ये चरण अपनाएँ।',
    steps: [
      {
        title: 'किसी को खोजें',
        description: 'Chats पेज पर उस व्यक्ति के खाते का सही ईमेल खोजें, फिर Search contact चुनें।',
      },
      {
        title: 'कॉन्टैक्ट अनुरोध भेजें',
        description: 'Send request चुनें। सामान्य रूप से चैट करने से पहले दूसरे व्यक्ति को अनुरोध स्वीकार करना होगा।',
      },
      {
        title: 'बातचीत शुरू करें',
        description: 'जुड़ने के बाद अपनी कॉन्टैक्ट सूची से उस व्यक्ति को चुनें। संदेश लिखकर भेजने के लिए Enter दबाएँ; नई पंक्ति के लिए Shift + Enter दबाएँ। पेपरक्लिप से 5 MB तक की तस्वीर, वीडियो या समर्थित फ़ाइल भेजें।',
      },
      {
        title: 'आने वाले अनुरोध देखें',
        description: 'Contact requests में कॉन्टैक्ट अनुरोध स्वीकार या अस्वीकार करें। Message requests के संदेश स्वीकार या अस्वीकार करने से पहले देख सकते हैं।',
      },
    ],
  },
};

const THEMES = [
  { id: 'night', label: 'Night', primary: '#38bdf8', bg: '#0f1729', text: '#cbd5e1' },
  { id: 'light', label: 'Light', primary: '#570df8', bg: '#ffffff', text: '#1f2937' },
  { id: 'dark', label: 'Dark', primary: '#661ae6', bg: '#1d232a', text: '#a6adba' },
  { id: 'cupcake', label: 'Cupcake', primary: '#65c3c8', bg: '#faf7f5', text: '#291334' },
  { id: 'forest', label: 'Forest', primary: '#1eb854', bg: '#171212', text: '#d1c7c7' },
  { id: 'dracula', label: 'Dracula', primary: '#ff79c6', bg: '#282a36', text: '#f8f8f2' },
  { id: 'cyberpunk', label: 'Cyberpunk', primary: '#ff7598', bg: '#ffee00', text: '#333' },
  { id: 'retro', label: 'Retro', primary: '#ef9995', bg: '#e4d8b4', text: '#282425' },
  { id: 'aqua', label: 'Aqua', primary: '#09ecf3', bg: '#345da7', text: '#ffffff' },
  { id: 'luxury', label: 'Luxury', primary: '#ffffff', bg: '#09090b', text: '#dca54c' },
];

function ThemeSwatch({ theme, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 cursor-pointer
        transition-all duration-150 hover:scale-105 text-left
        ${isSelected ? 'border-primary shadow-lg shadow-primary/20' : 'border-base-300 hover:border-primary/40'}
      `}
      style={{ backgroundColor: theme.bg }}
      aria-label={`Select ${theme.label} theme`}
      aria-pressed={isSelected}
    >
      {/* Color dots */}
      <div className="flex gap-1">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary }} />
        <span className="w-3 h-3 rounded-full opacity-60" style={{ backgroundColor: theme.primary }} />
        <span className="w-3 h-3 rounded-full opacity-30" style={{ backgroundColor: theme.primary }} />
      </div>

      {/* Theme name */}
      <span
        className="text-xs font-semibold mt-1 truncate w-full"
        style={{ color: theme.text }}
      >
        {theme.label}
      </span>

      {/* Selected checkmark */}
      {isSelected && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
          <Check size={12} className="text-primary-content" />
        </span>
      )}
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, guideLanguage, setGuideLanguage } = useSettingsStore();
  const guide = USAGE_GUIDE[guideLanguage] ?? USAGE_GUIDE.en;

  const handleThemeChange = (themeId) => {
    setTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  };

  return (
    <div className="flex-1 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
  <div className="flex w-full justify-start mb-6">
    <Link to="/" className="btn btn-ghost btn-sm gap-2">
      <ArrowLeft size={16} />
      Back to Chats
    </Link>
  </div>

  <div className="text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
      <Palette size={24} className="text-primary" />
    </div>

    <h1 className="text-2xl font-bold">Settings</h1>
    <p className="text-base-content/60 mt-1">
      Customize your ChatKaro experience
    </p>
  </div>
</div>

        <div className="card bg-base-200 shadow-xl border border-base-300">
          <div className="card-body gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Theme</h2>
              <p className="text-sm text-base-content/60 mb-4">
                Choose your preferred color scheme. Changes apply instantly.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {THEMES.map((t) => (
                  <ThemeSwatch
                    key={t.id}
                    theme={t}
                    isSelected={theme === t.id}
                    onClick={() => handleThemeChange(t.id)}
                  />
                ))}
              </div>
            </div>

            <div className="divider" />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Theme</p>
                <p className="text-sm text-base-content/60">
                  {THEMES.find((t) => t.id === theme)?.label ?? theme}
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-lg border border-base-300 shadow"
                style={{
                  backgroundColor: THEMES.find((t) => t.id === theme)?.bg ?? '#000',
                }}
              />
            </div>
          </div>

          <section className="card bg-base-200 shadow-xl border border-base-300 mt-6" aria-labelledby="usage-guide-title">
            <div className="card-body gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <BookOpen size={20} className="text-primary" />
                  </span>
                  <div>
                    <h2 id="usage-guide-title" className="text-lg font-semibold">
                      {guide.title}
                    </h2>
                    <p className="mt-1 text-sm text-base-content/60">
                      {guide.description}
                    </p>
                  </div>
                </div>

                <div role="group" aria-label="Usage guide language" className="join self-start">
                  {GUIDE_LANGUAGES.map((language) => (
                    <button
                      key={language.id}
                      type="button"
                      className={`join-item btn btn-sm ${guideLanguage === language.id ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setGuideLanguage(language.id)}
                      aria-pressed={guideLanguage === language.id}
                    >
                      {language.label}
                    </button>
                  ))}
                </div>
              </div>

              <ol className="grid gap-4 sm:grid-cols-2">
                {guide.steps.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-3 rounded-xl bg-base-100 p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-medium">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-base-content/70">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
