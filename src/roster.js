// The nine customers who ring the road. Positions alternate sides at even
// intervals of u. Lines and responses are exact and must not be edited.

export const ROSTER = [
  {
    id: 'reza',
    name: 'Amoo Reza',
    role: 'Tollbooth uncle',
    u: 0.1,
    side: 1,
    color: 'signBlue',
    items: 'Kubideh x1, Doogh x1',
    line:
      'Salam pesaram! Sit a minute, it gets quiet in this little glass box. ' +
      'Any news on the football tonight?',
    responses: ['Ghabeli nadareh, amoo', 'Score is 2 to 1, amoo'],
  },
  {
    id: 'trucker',
    name: 'The Trucker',
    role: 'All-night hauler',
    u: 0.2,
    side: -1,
    color: 'slate',
    items: 'Kubideh x2',
    line:
      'Double kubideh for the road. My daughter is getting married just ' +
      'down the way, can you believe it.',
    responses: ['Mobarak basheh!', 'Drive safe, pedar'],
  },
  {
    id: 'wedding',
    name: 'The Wedding',
    role: 'Garden party',
    u: 0.3,
    side: 1,
    color: 'plum',
    items: 'Kubideh x40',
    line:
      'Forty skewers, lotfan! The whole garden is hungry and the dancing ' +
      'has not even started.',
    responses: ['Sad sal be in salha', 'Save me a dance!'],
  },
  {
    id: 'student',
    name: 'The Student',
    role: 'Waiting for the bus',
    u: 0.4,
    side: -1,
    color: 'turq',
    items: 'Kubideh x1, Extra nan x2',
    line:
      'Could I get kabob like maman makes? Waiting for the Tehran bus and ' +
      'feeling a little homesick.',
    responses: ['Be salamati beri', 'Slipped you extra nan'],
  },
  {
    id: 'mechanic',
    name: 'The Mechanic',
    role: 'Gas station',
    u: 0.5,
    side: 1,
    color: 'terra',
    items: 'Kubideh x1',
    line:
      'Leave the moped with me, I will tighten her up. Pay me in kubideh ' +
      'and we are square.',
    responses: ['Lotf darin, ostad', 'She rides smoother now'],
  },
  {
    id: 'shepherd',
    name: 'The Shepherd',
    role: 'Hillside flock',
    u: 0.6,
    side: -1,
    color: 'greenDeep',
    items: 'Kubideh x2',
    line:
      'Climb on up, leave the bike below. Feed the dog one too, he has ' +
      'earned it today.',
    responses: ['Nooshe janet', 'The dog says thanks'],
  },
  {
    id: 'elders',
    name: 'Tea-House Elders',
    role: 'Backgammon table',
    u: 0.7,
    side: 1,
    color: 'pom',
    items: 'Kubideh x3, Chai x3',
    line:
      'Sit, sit, one round of takhteh before you go. The loser buys the ' +
      'next round of tea, agreed?',
    responses: ['Cheshm, yek dast', 'You rolled a six. Lucky'],
  },
  {
    id: 'film',
    name: 'The Film Crew',
    role: 'Arthouse shoot',
    u: 0.8,
    side: -1,
    color: 'saffron',
    items: 'Kubideh x1',
    line:
      'Cut! One more take, azizam. Hold the kubideh just so, the light is ' +
      'absolutely perfect.',
    responses: ['Har che shoma begin', 'That is a wrap. Mersi!'],
  },
  {
    id: 'neema',
    name: 'Neema',
    role: 'The convert',
    u: 0.9,
    side: 1,
    color: 'placket',
    items: 'Kubideh x1',
    line:
      "Wow, I've been going to Alborz this whole time. I didn't know " +
      'Shamshiry was this good! Wowy.',
    responses: ['Enjoy'],
  },
];

export function customerById(id) {
  return ROSTER.find((c) => c.id === id);
}
