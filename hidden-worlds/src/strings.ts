import { APP_NAME, PREMIUM_PRICE } from './config';

// Every user-facing sentence lives here so the game can be translated later (SHELL rules).
// Lines marked OWNER are placeholders for the owner to rewrite before launch.
export const S = {
  appName: APP_NAME,
  loading: 'Opening the field guide…',
  building: 'Laying out today’s world…',
  back: 'Back',
  close: 'Close',
  continue: 'Continue',
  reload: 'Reload',

  // home
  homeTagline: 'A new world to search, every day.',
  today: 'Today',
  todaysPuzzle: 'Today’s puzzle',
  preview: 'Preview',
  puzzleNo: (n: number | null) => (n === null ? 'Preview' : `No. ${n}`),
  play: 'Play today’s puzzle',
  resume: 'Carry on',
  doneToday: 'Solved today',
  nextIn: 'Next puzzle in',
  streak: 'Streak',
  bestStreak: 'Best',
  bestStreakLong: 'Best streak',
  archive: 'Archive',
  explore: 'Explore',
  collection: 'Residents',
  stats: 'Stats',
  settings: 'Settings',
  about: 'About',
  premium: 'Premium',
  difficulty: ['', 'Gentle', 'Easy', 'Steady', 'Tricky', 'Fiendish'] as const,
  findN: (n: number) => `${n} things to find`,
  someoneHiding: 'Someone is hiding here',

  // play
  timeLabel: 'Time taken',
  foundLabel: (a: number, b: number) => `${a} of ${b} found`,
  missesLabel: (n: number) => (n === 1 ? '1 miss' : `${n} misses`),
  hint: 'Hint',
  hintUsed: '1 free hint per puzzle',
  hintMore: 'More hints come with Premium',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomFit: 'Show the whole world',
  worldLabel:
    'The puzzle world. Drag to move around, pinch or use the zoom buttons to look closer, and tap the things listed in the tray.',
  trayLabel: 'Things to find',
  found: 'Found',
  foundToast: (name: string) => `Found the ${name.toLowerCase()}`,
  lockout: 'Slow down a moment… tapping resumes shortly.',
  chipHelp: 'Hold a tag to see its name',
  residentSlot: 'Someone is hiding here',
  residentFoundLine: 'resident found',
  shareCardTagline: 'Can you find them all?',
  artTitle: 'Art',
  unknownName: '?????',
  sectionsNav: 'Sections',
  shareHead: (n: number | null) => (n === null ? 'Preview' : `No. ${n}`),
  shareLevel: (world: string, level: number) => `${world} level ${level}`,
  shareHints: (n: number) => (n === 0 ? 'no hints' : n === 1 ? '1 hint' : `${n} hints`),
  shareStreak: (n: number) => `Streak ${n}`,
  residentFound: (name: string) => `You found ${name}!`,
  newToCollection: 'New to your collection',
  alreadyMet: 'Already in your collection',
  rarity: { common: 'Common', uncommon: 'Uncommon', rare: 'Rare' } as const,
  beat: (t: string) => `Beat ${t}`,
  challengeFrom: 'A friend’s challenge',
  lateNote: 'Archive puzzles count as late and don’t change your streak.',

  // result
  resultTitle: 'All found',
  resultStars: (n: number) => `${n} of 3 stars`,
  resultTime: 'Time',
  resultMisses: 'Misses',
  resultHints: 'Hints',
  resultResident: 'Resident',
  residentNotFound: 'Still hiding',
  shareText: 'Share result',
  shareImage: 'Share picture',
  challenge: 'Challenge a friend',
  copied: 'Copied to the clipboard',
  shared: 'Shared',
  shareFailed: 'Could not share from this browser',
  downloaded: 'Picture saved',
  keepLooking: 'Look around',
  home: 'Home',
  nextLevel: 'Next level',
  backToLevels: 'All levels',
  vsFriend: (mine: string, theirs: string, win: boolean) =>
    win
      ? `You beat your friend: ${mine} against ${theirs}.`
      : `Your friend was quicker: ${theirs} against your ${mine}.`,
  noHints: 'no hints',
  hintsN: (n: number) => (n === 1 ? '1 hint' : `${n} hints`),
  shareFound: (a: number, b: number) => `${a} of ${b} found`,

  // archive
  archiveTitle: 'Archive',
  archiveLede: 'The last seven days are free to play. Older puzzles come with Premium.',
  locked: 'Locked',
  late: 'Played late',
  notPlayed: 'Not played',

  // explore
  exploreTitle: 'Explore',
  exploreLede: 'Thirty levels in every world, from gentle to fiendish. Explore never touches your streak.',
  levelN: (n: number) => `Level ${n}`,
  unlockNeed: (need: number, have: number) => `Find ${need} different residents to open (${have} of ${need})`,
  worldComplete: 'All residents found',
  levelsDone: (a: number, b: number) => `${a} of ${b} levels`,
  levelsRange: (a: number, b: number) => `Levels ${a}–${b}`,

  // collection
  collectionTitle: 'Residents',
  collectionLede: 'Each puzzle hides one resident. Find them all to complete a world.',
  timesFound: (n: number) => (n === 1 ? 'Found once' : `Found ${n} times`),
  firstFound: (d: string) => `First found ${d}`,
  unknown: 'Not yet found',

  // stats
  statsTitle: 'Stats',
  played: 'Played',
  completed: 'Completed',
  currentStreak: 'Current streak',
  bestTime: 'Best time',
  avgTime: 'Average time',
  threeStars: 'Three-star puzzles',
  residentsFound: 'Residents found',

  // settings
  settingsTitle: 'Settings',
  sound: 'Sound',
  haptics: 'Vibration',
  relaxed: 'Relaxed mode',
  relaxedHelp: 'Hides the timer and miss counter, and never pauses your tapping.',
  colorBlind: 'Colour-blind friendly colours',
  colorBlindHelp:
    'Uses colours that stay apart for red–green colour blindness and writes the colour on each tag.',
  reducedMotion: 'Reduce motion',
  motionSystem: 'Follow device',
  motionOn: 'On',
  motionOff: 'Off',
  reset: 'Reset all progress',
  resetConfirm: 'This deletes your streak, results and residents on this device. It cannot be undone.',
  resetYes: 'Yes, reset everything',
  resetNo: 'Keep my progress',
  resetDone: 'Progress reset',

  // premium
  premiumTitle: 'Premium',
  premiumLede: 'We are thinking about a Premium membership for people who want more.',
  premiumBenefits: [
    'Unlimited hints',
    'The full puzzle archive',
    'Every world open from day one',
    'Streak repair when life gets in the way',
  ],
  premiumPrice: `Planned price: ${PREMIUM_PRICE}`,
  premiumNotYet:
    'Premium is not available yet, and nothing will be charged. Tap below if you would like to hear when it is ready.',
  premiumCta: 'Tell me when it’s ready',
  premiumEmail: 'Email (optional)',
  premiumThanks: 'Thank you. We have noted your interest.',
  premiumNothingCharged: 'Nothing has been charged, and nothing will be.',
  premiumAlready: 'You have already told us you are interested. Thank you.',

  // about
  aboutTitle: 'About',
  aboutWhat: `${APP_NAME} is a daily seek-and-find puzzle. Each day everyone gets the same hand-built world to search, generated from the date.`,
  // OWNER: rewrite before launch.
  aboutArt:
    '[Placeholder for the owner] The art in this version is temporary vector art drawn in code. The finished game will use characters and a style designed by a human illustrator; individual sprites will be produced inside that style with AI assistance and edited by hand.',
  privacyTitle: 'Privacy',
  privacy:
    'No account. Your progress stays on this device. Anonymous usage statistics are collected only if enabled, and never include personal data.',
  version: (app: string, engine: number, pack: string) =>
    `Version ${app} · engine ${engine} · art pack ${pack}`,

  // shell
  onboarding: [
    { title: 'Look around', body: 'Drag to move. Pinch, or use + and −, to look closer.' },
    { title: 'Find the tags', body: 'Tap each thing shown in the tray below. Colours matter.' },
    { title: 'Someone is hiding', body: 'Every world hides a resident. Finding them is a bonus.' },
  ],
  skip: 'Skip',
  next: 'Next',
  gotIt: 'Start looking',
  updateReady: 'A new version is ready.',
  update: 'Update',
  installTitle: 'Keep it on your home screen',
  installBody: 'Add the game to your home screen to open tomorrow’s puzzle in one tap.',
  installIos: 'In Safari, tap Share, then “Add to Home Screen”.',
  install: 'Add to home screen',
  notNow: 'Not now',
  errorTitle: 'Something went wrong',
  errorBody: 'Your progress is saved. Reloading usually fixes this.',
  packError: 'The art for this puzzle could not be loaded. Check your connection and reload.',
  worldUnlocked: (name: string) => `${name} is open in Explore`,
} as const;
