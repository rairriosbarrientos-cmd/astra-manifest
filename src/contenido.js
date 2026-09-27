// Daily readings: warm, universal writing that helps people reflect.
// Deterministic per person + day, so the reading is the same if they reopen the app.
// Tone rules: empowering, never fear-based, no promises about health, money or specific events.

import { signFor, moonPhase, localDateKey } from './astro.js';

export const FOCUSES = [
  { id: 'love', name: 'Love', emoji: '💗' },
  { id: 'abundance', name: 'Abundance', emoji: '✨' },
  { id: 'career', name: 'Career', emoji: '🌟' },
  { id: 'healing', name: 'Healing', emoji: '🌿' },
  { id: 'selflove', name: 'Self-love', emoji: '🪞' },
];

const OPENINGS = [
  'You have a quiet strength that people often underestimate — sometimes even you.',
  'You give a lot of yourself to others, and lately you have been wondering who pours back into you.',
  'Part of you craves change, while another part wants the comfort of what you know. Both are allowed.',
  'You are more sensitive than you let people see, and that sensitivity is a gift, not a flaw.',
  'You have been carrying something in silence. Today asks you to set a little of it down.',
  'You hold yourself to a high standard, higher than you would ever hold anyone you love.',
  'There is a version of your life you keep imagining. It is closer than it feels.',
  'You are at your best when you trust your first instinct, and you know it.',
  'You have outgrown something — a habit, a room, a role — and your spirit has noticed before your mind has.',
  'You can be the calm in other people’s storms, even when your own sky is cloudy.',
  'You have learned to be independent, but you were never meant to do everything alone.',
  'People feel safe around you. That is rarer than you think.',
  'You have been patient for a long time. The universe has noticed the effort, even if the world hasn’t yet.',
  'Some days you feel wildly confident; other days you question everything. Both versions of you are real and worthy.',
  'You notice the small details others miss, and today those details are trying to tell you something.',
  'You have survived every hard day so far. That is not luck — that is who you are.',
  'There is a conversation you have been rehearsing in your head. The energy today favors honesty.',
  'You are allowed to want more without being ungrateful for what you have.',
  'Your intuition has been louder lately. It is worth listening to.',
  'You tend to downplay your wins. Today is a good day to let yourself feel proud.',
  'You are in a season of quiet growth — roots before blossoms.',
  'You have more influence on the people around you than you realize.',
  'Something you let go of is making room for something that fits you better.',
  'You have a rare mix of softness and strength, and you don’t have to choose between them.',
];

const FOCUS_INSIGHTS = {
  love: [
    'Love flows most freely when you stop auditioning for it. Let people meet the real you today.',
    'Notice who makes you feel lighter after you talk to them. That is where your heart is being fed.',
    'An open heart is not a weak heart. Let someone in a little further than usual.',
    'The love you are calling in starts with how you speak to yourself in private.',
    'A small, sincere gesture today could mean more to someone than you will ever know.',
    'You deserve a love that feels like rest, not like a test.',
    'Old patterns may knock today. You can answer differently this time.',
    'Say the kind thing you usually only think. Connection grows in the spaces we are brave in.',
  ],
  abundance: [
    'Abundance begins with noticing: list three things that already feel like enough.',
    'Your energy follows your attention. Spend a few minutes today picturing the life you are building, in detail.',
    'Receiving is a skill. Practice saying a simple “thank you” without explaining it away.',
    'One practical step — a message sent, an idea written down — turns intention into momentum.',
    'Let go of the story that you have to struggle to deserve good things.',
    'Generosity opens doors. Share something you know or have, and watch how it returns.',
    'Clarity is a form of wealth. Decide what “enough” looks like for you this month.',
    'Opportunities often arrive dressed as ordinary conversations. Stay curious today.',
  ],
  career: [
    'Your ideas deserve more airtime than you give them. Share one today.',
    'Focus on the one task that would make everything else easier.',
    'The right path does not have to be the fastest path. Consistency is your quiet superpower.',
    'Someone is watching your work more closely than you think — in a good way.',
    'Ask for what you need. The worst answer is simply information.',
    'You are more qualified than your inner critic claims. Act from that truth today.',
    'A conversation with a mentor or peer could spark something important.',
    'Protect your deep-work time like it is a meeting with your future self.',
  ],
  healing: [
    'Healing is not linear. A heavy day does not erase your progress.',
    'Be as gentle with yourself as you would be with a dear friend going through the same thing.',
    'Your body has been holding a lot. Slow breaths today are an act of care.',
    'You are allowed to outgrow the version of you that learned to survive.',
    'Forgiveness can be a process instead of a moment. Take one small step, for you.',
    'Rest is productive. Give yourself permission to pause without guilt.',
    'Notice what drains you and what restores you. Choose one more restoring thing today.',
    'What you are feeling makes sense. Let it move through you instead of fighting it.',
  ],
  selflove: [
    'You are not too much, and you are not too little. You are exactly the right amount of you.',
    'Keep one promise to yourself today, however small. Self-trust is built this way.',
    'Look at yourself with the eyes of someone who adores you.',
    'Your worth is not a performance. You are allowed to simply be.',
    'Speak to yourself today the way you would speak to your younger self.',
    'Celebrate one thing about you that has nothing to do with productivity.',
    'Boundaries are a love language — the one you speak to yourself.',
    'Your quirks are part of your magic. Stop editing them out.',
  ],
};

const ACTIONS = [
  'Write your intention on paper and keep it somewhere you will see it tonight.',
  'Take a ten-minute walk without your phone and notice what thoughts arrive.',
  'Send a message to someone you have been thinking about.',
  'Drink a glass of water slowly and set one clear intention for the afternoon.',
  'Clear one small space — a drawer, a desktop, an inbox — to make room for the new.',
  'Say your affirmation out loud three times, even if it feels silly.',
  'Before bed, list three moments from today that you are grateful for.',
  'Do one thing your future self will thank you for.',
  'Put on a song that makes you feel powerful and let yourself enjoy it fully.',
  'Say no to one thing that doesn’t serve you, kindly and without over-explaining.',
  'Spend five minutes visualizing your intention as already real — the sights, sounds and feelings.',
  'Compliment someone sincerely; notice how giving lifts your own energy.',
  'Step outside and look at the sky for one full minute.',
  'Write down one fear, then write down one reason you can handle it.',
  'Light a candle or open a window and take three deep breaths before starting your day.',
  'Choose one word for today and let it guide your decisions.',
];

const PROMPTS = [
  'What would I do today if I fully trusted myself?',
  'Where in my life am I asking for permission I don’t need?',
  'What is one thing I am ready to release?',
  'When did I last feel truly at peace, and what was I doing?',
  'What is my heart trying to tell me that my head keeps dismissing?',
  'What would the most loving version of me choose today?',
  'Which small win from this week deserves more credit?',
  'What am I calling into my life, and am I making room for it?',
  'Who helps me feel like myself, and how can I spend more time with them?',
  'What story about myself am I ready to rewrite?',
  'If my future self wrote me a letter, what would it say?',
  'What does “enough” look like for me right now?',
  'What am I pretending not to know?',
  'Where do I feel most alive, and how can I bring more of that into today?',
  'What boundary would make my life lighter?',
  'What do I want to feel more of this month?',
];

const AFFIRMATIONS = {
  love: ['I am worthy of a love that feels safe and joyful.', 'I give and receive love freely.', 'My heart is open, and the right people find their way to me.', 'I attract relationships that honor who I am.', 'I am loved, loving and lovable.', 'I let love in without fear.'],
  abundance: ['I am open to receiving all the good that is coming to me.', 'Abundance flows to me in expected and unexpected ways.', 'I am grateful for what I have and open to more.', 'I am a magnet for opportunities that align with me.', 'There is more than enough for me.', 'I welcome prosperity with ease and gratitude.'],
  career: ['My work matters, and I do it with confidence.', 'I am capable of achieving what I set my mind to.', 'Doors open for me when I show up as myself.', 'I trust my skills and I keep growing.', 'I am building a career that makes me proud.', 'Success comes to me through consistent, joyful action.'],
  healing: ['I am healing, and every day I grow lighter.', 'I release what no longer serves me.', 'I am gentle with myself while I grow.', 'My peace is my priority.', 'I am safe to feel, to rest and to begin again.', 'I honor how far I have come.'],
  selflove: ['I am enough, exactly as I am.', 'I choose myself with love every day.', 'I am proud of who I am becoming.', 'My worth is not up for debate.', 'I treat myself with kindness and respect.', 'I love the person I am and the person I am growing into.'],
};

const COLORS = ['Rose gold', 'Midnight blue', 'Sage green', 'Warm amber', 'Soft lavender', 'Pearl white', 'Deep emerald', 'Coral', 'Silver', 'Golden yellow', 'Blush pink', 'Ocean teal'];
const CRYSTALS = ['Rose quartz', 'Amethyst', 'Citrine', 'Clear quartz', 'Moonstone', 'Tiger’s eye', 'Green aventurine', 'Labradorite', 'Selenite', 'Carnelian', 'Black tourmaline', 'Lapis lazuli'];

function hash(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function aleatorio(semilla) {
  let a = semilla;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const elegir = (rnd, lista) => lista[Math.floor(rnd() * lista.length)];

// profile: { name, birthday, focus }
export function dailyReading(profile, date = new Date()) {
  const sign = signFor(profile.birthday);
  const focus = FOCUSES.find((f) => f.id === profile.focus) || FOCUSES[0];
  const dia = localDateKey(date);
  const rnd = aleatorio(hash(`${dia}|${sign?.id}|${profile.name?.toLowerCase().trim()}|${focus.id}`));
  const moon = moonPhase(date);
  return {
    date: dia,
    sign,
    focus,
    moon,
    opening: elegir(rnd, OPENINGS),
    insight: elegir(rnd, FOCUS_INSIGHTS[focus.id]),
    moonNote: `The ${moon.name.toLowerCase()} invites you to ${moon.energy}.`,
    signNote: sign ? `As a ${sign.name}, you are ${sign.traits}. Today, lean on your gift for ${sign.gift}.` : '',
    action: elegir(rnd, ACTIONS),
    prompt: elegir(rnd, PROMPTS),
    affirmation: elegir(rnd, AFFIRMATIONS[focus.id]),
    luckyNumber: 1 + Math.floor(rnd() * 33),
    color: elegir(rnd, COLORS),
    crystal: elegir(rnd, CRYSTALS),
  };
}

// Light-hearted sign compatibility, for fun.
const ELEMENT_MATCH = {
  'Fire-Fire': 88, 'Fire-Air': 92, 'Fire-Earth': 64, 'Fire-Water': 58,
  'Earth-Earth': 86, 'Earth-Water': 93, 'Earth-Air': 60,
  'Air-Air': 84, 'Air-Water': 62, 'Water-Water': 90,
};
export function compatibility(a, b) {
  if (!a || !b) return null;
  const key = ELEMENT_MATCH[`${a.element}-${b.element}`] ? `${a.element}-${b.element}` : `${b.element}-${a.element}`;
  const score = Math.min(99, (ELEMENT_MATCH[key] || 70) + (hash(`${a.id}${b.id}`) % 7) - 3);
  const note = score >= 88
    ? `${a.name} and ${b.name} light each other up. Easy chemistry — just keep talking about the deep stuff.`
    : score >= 70
      ? `${a.name} and ${b.name} balance each other well. Differences become strengths when you stay curious.`
      : `${a.name} and ${b.name} see the world differently — which can be magnetic when you both stay patient and kind.`;
  return { score, note };
}
