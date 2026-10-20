import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Smile, ThumbsUp, Heart, PartyPopper, Flame, Sparkles } from 'lucide-react';
import { useTranslation } from '../lib/i18n.js';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: Smile,
    emojis: [
      { emoji: '😀', keywords: 'grinning happy smile' },
      { emoji: '😃', keywords: 'smiley happy joy' },
      { emoji: '😄', keywords: 'smile laugh pleased' },
      { emoji: '😁', keywords: 'beam grin happy' },
      { emoji: '😆', keywords: 'laughing lol haha' },
      { emoji: '😅', keywords: 'sweat smile relief' },
      { emoji: '😂', keywords: 'tears joy funny lol' },
      { emoji: '🤣', keywords: 'rofl rolling floor laughing' },
      { emoji: '🥲', keywords: 'smiling tear touched' },
      { emoji: '☺️', keywords: 'blush warm smile' },
      { emoji: '😊', keywords: 'blushing warm proud' },
      { emoji: '😇', keywords: 'angel innocent halo' },
      { emoji: '🙂', keywords: 'slight smile calm' },
      { emoji: '🙃', keywords: 'upside down silly' },
      { emoji: '😉', keywords: 'wink playful flirt' },
      { emoji: '😌', keywords: 'relieved peace calm' },
      { emoji: '😍', keywords: 'heart eyes love crush' },
      { emoji: '🥰', keywords: 'love hearts adored' },
      { emoji: '😘', keywords: 'kiss heart mwah' },
      { emoji: '😗', keywords: 'kissing duck face' },
      { emoji: '😚', keywords: 'kiss closed eyes' },
      { emoji: '😋', keywords: 'yum delicious tongue' },
      { emoji: '😛', keywords: 'tongue silly cheeky' },
      { emoji: '😜', keywords: 'wink tongue crazy' },
      { emoji: '🤪', keywords: 'zany wacky wild' },
      { emoji: '😝', keywords: 'squint tongue prank' },
      { emoji: '🤑', keywords: 'money rich greedy' },
      { emoji: '🤗', keywords: 'hug friendly open' },
      { emoji: '🤭', keywords: 'gasp giggle oops' },
      { emoji: '🤫', keywords: 'shh quiet secret' },
      { emoji: '🤔', keywords: 'thinking wonder hm' },
      { emoji: '🫡', keywords: 'salute respect yes sir' },
      { emoji: '🤐', keywords: 'zipper secret quiet' },
      { emoji: '🤨', keywords: 'raised eyebrow suspect' },
      { emoji: '😐', keywords: 'neutral poker face' },
      { emoji: '😑', keywords: 'expressionless blank' },
      { emoji: '😶', keywords: 'no mouth speechless' },
      { emoji: '😏', keywords: 'smirk sneaky sly' },
      { emoji: '😒', keywords: 'unamused annoyed bored' },
      { emoji: '🙄', keywords: 'eye roll whatever' },
      { emoji: '😬', keywords: 'grimace awkward oof' },
      { emoji: '🤥', keywords: 'lying pinocchio' },
      { emoji: '😔', keywords: 'sad pensive down' },
      { emoji: '😪', keywords: 'sleepy tired snot' },
      { emoji: '🤤', keywords: 'drool hungry crave' },
      { emoji: '😴', keywords: 'sleeping zzz night' },
      { emoji: '😷', keywords: 'mask sick virus' },
      { emoji: '🤒', keywords: 'sick fever thermometer' },
      { emoji: '🤕', keywords: 'hurt bandage injury' },
      { emoji: '🤢', keywords: 'nauseous sick gross' },
      { emoji: '🤮', keywords: 'vomiting puke barf' },
      { emoji: '🤧', keywords: 'sneezing cold tissue' },
      { emoji: '🥵', keywords: 'hot sweat heat' },
      { emoji: '🥶', keywords: 'cold freezing ice' },
      { emoji: '🥴', keywords: 'woozy drunk dazed' },
      { emoji: '😵', keywords: 'dizzy dead knocked out' },
      { emoji: '🤯', keywords: 'mind blown explosion wow' },
      { emoji: '🤠', keywords: 'cowboy hat yeehaw' },
      { emoji: '🥳', keywords: 'party celebrate horn' },
      { emoji: '😎', keywords: 'cool sunglasses chill' },
      { emoji: '🤓', keywords: 'nerd glasses smart' },
      { emoji: '🧐', keywords: 'monocle classy inspect' },
      { emoji: '😕', keywords: 'confused puzzled unsure' },
      { emoji: '😟', keywords: 'worried nervous anxious' },
      { emoji: '🙁', keywords: 'frowning sad upset' },
      { emoji: '😮', keywords: 'open mouth wow shock' },
      { emoji: '😯', keywords: 'surprised gasp huh' },
      { emoji: '😲', keywords: 'astonished stunned' },
      { emoji: '😳', keywords: 'flushed embarrassed wide eyes' },
      { emoji: '🥺', keywords: 'pleading puppy eyes please' },
      { emoji: '🥹', keywords: 'holding tears touched' },
      { emoji: '😦', keywords: 'frowning open mouth' },
      { emoji: '😧', keywords: 'anguished distressed' },
      { emoji: '😨', keywords: 'fearful scared nervous' },
      { emoji: '😰', keywords: 'anxious blue sweat' },
      { emoji: '😥', keywords: 'sad relief tear' },
      { emoji: '😢', keywords: 'crying sad tear' },
      { emoji: '😭', keywords: 'sobbing loud crying' },
      { emoji: '😱', keywords: 'scream terror horror' },
      { emoji: '😖', keywords: 'confounded frustration' },
      { emoji: '😣', keywords: 'persevering struggle' },
      { emoji: '😞', keywords: 'disappointed regret' },
      { emoji: '😓', keywords: 'sweat downcast effort' },
      { emoji: '😩', keywords: 'weary tired frustrated' },
      { emoji: '😫', keywords: 'tired exhausted upset' },
      { emoji: '🥱', keywords: 'yawn boring sleepy' },
      { emoji: '😤', keywords: 'triumph steam angry' },
      { emoji: '😡', keywords: 'pouting rage red angry' },
      { emoji: '😠', keywords: 'angry mad grumpy' },
      { emoji: '🤬', keywords: 'cursing swearing mad' },
      { emoji: '💀', keywords: 'skull dead lol dying' },
      { emoji: '💩', keywords: 'poop crap funny' },
      { emoji: '🤡', keywords: 'clown foolish circus' },
      { emoji: '👻', keywords: 'ghost spooky boo' },
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: ThumbsUp,
    emojis: [
      { emoji: '👍', keywords: 'thumbs up like good agree' },
      { emoji: '👎', keywords: 'thumbs down dislike bad' },
      { emoji: '👌', keywords: 'ok fine perfect' },
      { emoji: '🤌', keywords: 'pinched fingers italian chef' },
      { emoji: '🤏', keywords: 'pinching hand tiny small' },
      { emoji: '✌️', keywords: 'peace victory two' },
      { emoji: '🤞', keywords: 'fingers crossed luck hope' },
      { emoji: '🫰', keywords: 'hand with index heart kpop' },
      { emoji: '🤟', keywords: 'love you rock hand' },
      { emoji: '🤘', keywords: 'rock on metal horns' },
      { emoji: '🤙', keywords: 'call me shaka chill' },
      { emoji: '👈', keywords: 'point left finger' },
      { emoji: '👉', keywords: 'point right finger' },
      { emoji: '👆', keywords: 'point up finger' },
      { emoji: '👇', keywords: 'point down finger' },
      { emoji: '☝️', keywords: 'index point up one' },
      { emoji: '👋', keywords: 'wave hello goodbye hi' },
      { emoji: '🤚', keywords: 'raised back of hand' },
      { emoji: '🖐️', keywords: 'hand five splay' },
      { emoji: '✋', keywords: 'high five stop palm' },
      { emoji: '🖖', keywords: 'vulcan spock live long' },
      { emoji: '🫱', keywords: 'hand right' },
      { emoji: '🫲', keywords: 'hand left' },
      { emoji: '👏', keywords: 'applause clapping brava' },
      { emoji: '🙌', keywords: 'raising hands celebrate praise' },
      { emoji: '🫶', keywords: 'heart hands love care' },
      { emoji: '👐', keywords: 'open hands hug welcome' },
      { emoji: '🤲', keywords: 'palms together prayer' },
      { emoji: '🤝', keywords: 'handshake deal agreement' },
      { emoji: '🙏', keywords: 'pray please thanks namaste' },
      { emoji: '✍️', keywords: 'writing note pen' },
      { emoji: '💅', keywords: 'nail polish sassy glam' },
      { emoji: '🤳', keywords: 'selfie phone camera' },
      { emoji: '💪', keywords: 'flex bicep strong power' },
      { emoji: '👀', keywords: 'eyes look see drama' },
      { emoji: '👁️', keywords: 'eye look watching' },
      { emoji: '👅', keywords: 'tongue taste lick' },
      { emoji: '👄', keywords: 'mouth lips kiss' },
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts',
    icon: Heart,
    emojis: [
      { emoji: '❤️', keywords: 'red heart love passion' },
      { emoji: '🧡', keywords: 'orange heart warm care' },
      { emoji: '💛', keywords: 'yellow heart friendship' },
      { emoji: '💚', keywords: 'green heart nature jealous' },
      { emoji: '💙', keywords: 'blue heart trust peace' },
      { emoji: '💜', keywords: 'purple heart royalty' },
      { emoji: '🖤', keywords: 'black heart dark soul' },
      { emoji: '🤍', keywords: 'white heart pure angel' },
      { emoji: '🤎', keywords: 'brown heart chocolate' },
      { emoji: '💔', keywords: 'broken heart sadness grief' },
      { emoji: '❤️‍🔥', keywords: 'heart on fire passion hot' },
      { emoji: '❤️‍🩹', keywords: 'mending heart healing recover' },
      { emoji: '❣️', keywords: 'heart exclamation point love' },
      { emoji: '💕', keywords: 'two hearts floating love' },
      { emoji: '💞', keywords: 'revolving hearts love' },
      { emoji: '💓', keywords: 'beating heart alive pulse' },
      { emoji: '💗', keywords: 'growing heart love expand' },
      { emoji: '💖', keywords: 'sparkling heart shiny glitter' },
      { emoji: '💘', keywords: 'cupid arrow love struck' },
      { emoji: '💝', keywords: 'gift heart ribbon present' },
      { emoji: '💟', keywords: 'heart decoration symbol' },
      { emoji: '💯', keywords: 'hundred percent perfect score' },
      { emoji: '🔥', keywords: 'fire flame lit hot trend' },
      { emoji: '✨', keywords: 'sparkles stars magic shiny' },
      { emoji: '🌟', keywords: 'glowing star bright winner' },
      { emoji: '💫', keywords: 'dizzy star shooting magic' },
      { emoji: '💥', keywords: 'collision boom bang explosion' },
      { emoji: '💤', keywords: 'sleep zzz resting' },
    ],
  },
  {
    id: 'party',
    name: 'Party',
    icon: PartyPopper,
    emojis: [
      { emoji: '🎉', keywords: 'party popper celebration confetti tada' },
      { emoji: '🎊', keywords: 'confetti ball celebration' },
      { emoji: '🎈', keywords: 'balloon birthday party' },
      { emoji: '🎂', keywords: 'birthday cake candles treat' },
      { emoji: '🍰', keywords: 'shortcake sweet dessert' },
      { emoji: '🧁', keywords: 'cupcake icing bakery' },
      { emoji: '🎁', keywords: 'present gift wrapped surprise' },
      { emoji: '🏆', keywords: 'trophy champion win gold' },
      { emoji: '🥇', keywords: 'first place medal gold' },
      { emoji: '🥈', keywords: 'second place medal silver' },
      { emoji: '🥉', keywords: 'third place medal bronze' },
      { emoji: '🍾', keywords: 'champagne bottle pop cheers' },
      { emoji: '🥂', keywords: 'clinking glasses cheers toast' },
      { emoji: '🍻', keywords: 'beer mugs cheers party' },
      { emoji: '🍹', keywords: 'tropical drink cocktail summer' },
      { emoji: '🍿', keywords: 'popcorn movie snack cinema' },
      { emoji: '🍕', keywords: 'pizza slice cheesy food' },
      { emoji: '🍔', keywords: 'burger fast food burger' },
      { emoji: '🍟', keywords: 'french fries potato fast food' },
      { emoji: '🍫', keywords: 'chocolate bar sweet candy' },
      { emoji: '☕', keywords: 'coffee cup hot tea drink' },
      { emoji: '🎯', keywords: 'direct hit bulls eye target' },
      { emoji: '🎲', keywords: 'game die random luck' },
      { emoji: '🎮', keywords: 'video game controller play' },
    ],
  },
  {
    id: 'nature',
    name: 'Nature',
    icon: Flame,
    emojis: [
      { emoji: '☀️', keywords: 'sun sunny bright day' },
      { emoji: '🌤️', keywords: 'sun behind small cloud' },
      { emoji: '⛅', keywords: 'partly cloudy weather' },
      { emoji: '☁️', keywords: 'cloud overcast cloudy' },
      { emoji: '🌧️', keywords: 'rain rain cloud storm' },
      { emoji: '⛈️', keywords: 'thunderstorm lightning rain' },
      { emoji: '🌩️', keywords: 'lightning bolt storm' },
      { emoji: '❄️', keywords: 'snowflake cold snow ice' },
      { emoji: '☃️', keywords: 'snowman winter cold' },
      { emoji: '🌈', keywords: 'rainbow colorful sky pride' },
      { emoji: '🌊', keywords: 'water wave ocean beach' },
      { emoji: '🌸', keywords: 'cherry blossom flower spring' },
      { emoji: '🌹', keywords: 'rose red flower romantic' },
      { emoji: '🌺', keywords: 'hibiscus tropical flower' },
      { emoji: '🌻', keywords: 'sunflower bright summer' },
      { emoji: '🌼', keywords: 'blossom flower yellow' },
      { emoji: '🌷', keywords: 'tulip flower spring' },
      { emoji: '🍀', keywords: 'four leaf clover lucky irish' },
      { emoji: '🍁', keywords: 'maple leaf autumn fall' },
      { emoji: '🍂', keywords: 'fallen leaf autumn nature' },
      { emoji: '🍃', keywords: 'leaves flutter breeze wind' },
      { emoji: '🐶', keywords: 'dog puppy pet cute bark' },
      { emoji: '🐱', keywords: 'cat kitten pet meow' },
      { emoji: '🐼', keywords: 'panda bear cute animal' },
      { emoji: '🦁', keywords: 'lion king beast animal' },
      { emoji: '🐯', keywords: 'tiger face wild animal' },
      { emoji: '🦄', keywords: 'unicorn magic horse fantasy' },
      { emoji: '🦋', keywords: 'butterfly insect beautiful' },
    ],
  },
  {
    id: 'symbols',
    name: 'Symbols',
    icon: Sparkles,
    emojis: [
      { emoji: '⚡', keywords: 'high voltage power electric fast' },
      { emoji: '💡', keywords: 'light bulb idea bright smart' },
      { emoji: '🔔', keywords: 'bell alert notification ring' },
      { emoji: '🔕', keywords: 'bell with slash mute silent' },
      { emoji: '📢', keywords: 'loudspeaker announcement shout' },
      { emoji: '💬', keywords: 'speech balloon chat message talk' },
      { emoji: '💭', keywords: 'thought balloon ponder dream' },
      { emoji: '📱', keywords: 'mobile phone cell device call' },
      { emoji: '💻', keywords: 'laptop computer code tech' },
      { emoji: '📷', keywords: 'camera photo picture take' },
      { emoji: '⏳', keywords: 'hourglass time ticking wait' },
      { emoji: '⏰', keywords: 'alarm clock time wake up' },
      { emoji: '🔒', keywords: 'locked secure padlock safe' },
      { emoji: '🔓', keywords: 'unlocked open padlock' },
      { emoji: '🔑', keywords: 'key access password secret' },
      { emoji: '📌', keywords: 'pushpin location mark note' },
      { emoji: '📍', keywords: 'round pushpin map pin here' },
      { emoji: '📎', keywords: 'paperclip attach document' },
      { emoji: '🚀', keywords: 'rocket blast off launch space fast' },
      { emoji: '💎', keywords: 'gem stone diamond jewelry precious' },
      { emoji: '⭐', keywords: 'star favorite rating night' },
      { emoji: '✅', keywords: 'check mark button success done' },
      { emoji: '❌', keywords: 'cross mark red x wrong cancel' },
      { emoji: '⚠️', keywords: 'warning alert caution danger' },
    ],
  },
];

export default function EmojiPicker({ onSelect, onClose }) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredEmoji, setHoveredEmoji] = useState(null);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Filter emojis based on search query
  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const all = [];
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (item.keywords.toLowerCase().includes(q) || item.emoji.includes(q)) {
          all.push(item);
        }
      }
    }
    return all;
  }, [searchQuery]);

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];

  return (
    <div
      ref={containerRef}
      className="w-72 sm:w-80 rounded-2xl border border-base-300 bg-base-100/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-150 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Search bar */}
      <div className="p-2 border-b border-base-300 flex items-center gap-1.5 bg-base-200/40">
        <Search size={16} className="text-base-content/50 shrink-0 ml-1" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('Search emojis…')}
          className="input input-ghost input-xs w-full focus:bg-transparent focus:outline-none text-xs text-base-content placeholder:text-base-content/40"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Emoji Grid Area */}
      <div className="p-2 max-h-56 overflow-y-auto min-h-[180px]">
        {searchQuery ? (
          <div>
            <div className="text-[11px] font-semibold text-base-content/60 px-1 mb-1">
              {filteredEmojis.length ? t('Search results ({count})', { count: filteredEmojis.length }) : t('No matching emojis')}
            </div>
            {filteredEmojis.length === 0 ? (
              <div className="py-8 text-center text-xs text-base-content/40">
                {t('No emojis found for "{query}"', { query: searchQuery })}
              </div>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                {filteredEmojis.map(({ emoji, keywords }) => (
                  <button
                    key={`${emoji}-${keywords}`}
                    type="button"
                    onMouseEnter={() => setHoveredEmoji({ emoji, keywords })}
                    onMouseLeave={() => setHoveredEmoji(null)}
                    onClick={() => {
                      onSelect(emoji);
                    }}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-base-200 hover:scale-120 active:scale-90 transition-all cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="text-[11px] font-semibold text-base-content/60 px-1 mb-1">
              {t(currentCategory.name)}
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
              {currentCategory.emojis.map(({ emoji, keywords }) => (
                <button
                  key={`${emoji}-${keywords}`}
                  type="button"
                  onMouseEnter={() => setHoveredEmoji({ emoji, keywords })}
                  onMouseLeave={() => setHoveredEmoji(null)}
                  onClick={() => {
                    onSelect(emoji);
                  }}
                  className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-base-200 hover:scale-120 active:scale-90 transition-all cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs along bottom & Footer Preview */}
      <div className="border-t border-base-300 bg-base-200/50 p-1 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {EMOJI_CATEGORIES.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveCategory(id);
                setSearchQuery('');
              }}
              title={t(name)}
              className={`btn btn-ghost btn-xs btn-circle ${
                activeCategory === id && !searchQuery
                  ? 'text-primary bg-primary/15'
                  : 'text-base-content/50 hover:text-base-content'
              }`}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
        <div className="text-xs text-base-content/60 px-2 truncate max-w-[120px] font-mono">
          {hoveredEmoji ? (
            <span className="flex items-center gap-1">
              <span className="text-base">{hoveredEmoji.emoji}</span>
              <span className="text-[10px] capitalize opacity-70 truncate">{hoveredEmoji.keywords.split(' ')[0]}</span>
            </span>
          ) : (
            <span className="text-[10px] opacity-40">ChatKaro</span>
          )}
        </div>
      </div>
    </div>
  );
}
