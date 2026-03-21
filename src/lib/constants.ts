export const COLORS = {
  PRIMARY: '#E91E63', // Pink/Magenta
  SUCCESS: '#00FF00',
  ERROR: '#FF0000',
  WARNING: '#FFA500'
};

export const MARKET_ITEMS = [
  { id: 'twilight_echo', name: 'Twilight Echo Permit x1', cost: 50, maxStock: 15, minLevel: 1, description: 'Used to resonate with Twilight Echoes.', image: 'https://picsum.photos/seed/twilight/400/300' },
  { id: 'weapon_echo', name: 'Weapon Echo Permit x1', cost: 50, maxStock: 15, minLevel: 1, description: 'Used to resonate with Weapon Echoes.', image: 'https://picsum.photos/seed/weapon/400/300' },
  { id: 'adv_echo', name: 'Advanced Echo Permit x1', cost: 50, maxStock: 15, minLevel: 1, description: 'Used to resonate with Advanced Echoes.', image: 'https://picsum.photos/seed/adv/400/300' },
  { id: 'purifier_metal', name: 'Purifier Metal x100', cost: 30, maxStock: 20, minLevel: 1, description: 'Material used for purifying equipment.', image: 'https://picsum.photos/seed/metal/400/300' },
  { id: 'ion_probes', name: 'Ion Probes x200', cost: 40, maxStock: 20, minLevel: 1, description: 'Probes for deep space exploration.', image: 'https://picsum.photos/seed/probe/400/300' },
  { id: 'stellaris_exp', name: 'Stellaris EXP x10000', cost: 35, maxStock: 20, minLevel: 1, description: 'Grants a large amount of Stellaris EXP.', image: 'https://picsum.photos/seed/exp/400/300' },
  { id: 'starmap_echo', name: 'Starmap Echo Permit x1', cost: 85, maxStock: 10, minLevel: 1, description: 'Used to resonate with Starmap Echoes.', image: 'https://picsum.photos/seed/starmap/400/300' },
  { id: 'starsea_ticket', name: 'Starsea Ticket x1', cost: 100, maxStock: 10, minLevel: 1, description: 'A ticket to the Starsea event.', image: 'https://picsum.photos/seed/starsea/400/300' },
  { id: 'diamond_box', name: 'Diamond Blind Box x1', cost: 100, maxStock: 15, minLevel: 1, description: 'Contains a random diamond-tier reward.', image: 'https://picsum.photos/seed/diamond/400/300' },
  { id: 'red_eqpt', name: 'Red 2-Star Eqpt. Selection x1', cost: 100, maxStock: 10, minLevel: 1, description: 'Select a Red 2-Star Equipment.', image: 'https://picsum.photos/seed/red/400/300' },
  { id: 'ssr_box', name: 'SSR+ Stellaris Selection Box x1', cost: 400, maxStock: 2, minLevel: 11, description: 'Select an SSR+ Stellaris.', image: 'https://picsum.photos/seed/ssr/400/300' },
  { id: 'lottery_ticket', name: 'Lottery Ticket', cost: 150, maxStock: 9999, minLevel: 21, description: 'Entry ticket for the monthly lottery.', image: 'https://picsum.photos/seed/lottery/400/300' }
];

export const LEVEL_CONSTANTS = {
  BASE: 100,
  INCREMENT: 1
};

export const TOKEN_REWARDS = {
  BASE: 10
};

export function getXpForNextLevel(currentLevel: number) {
  return LEVEL_CONSTANTS.BASE + (currentLevel - 1) * LEVEL_CONSTANTS.INCREMENT;
}
