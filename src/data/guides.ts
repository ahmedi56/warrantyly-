export type GuideTopic = 'Maintenance' | 'Troubleshooting' | 'Getting started';

export type Guide = {
  id: string;
  title: string;
  topic: GuideTopic;
  minutes: number;
  steps: string[];
};

export const guides: Guide[] = [
  {
    id: 'g1',
    title: 'Quick start guide',
    topic: 'Getting started',
    minutes: 3,
    steps: ['Unbox and remove all protective film.', 'Place on a flat, dry surface near an outlet.', 'Run one cycle with water only before first use.'],
  },
  {
    id: 'g2',
    title: 'Cleaning the machine',
    topic: 'Maintenance',
    minutes: 4,
    steps: ['Unplug and let it cool down.', 'Remove the water tank and drip tray.', 'Wash removable parts with warm soapy water.', 'Dry completely and reassemble.'],
  },
  {
    id: 'g3',
    title: 'Descaling process',
    topic: 'Maintenance',
    minutes: 5,
    steps: ['Fill the tank with descaling solution.', 'Run the descale program until the tank is empty.', 'Rinse with two full tanks of clean water.'],
  },
  {
    id: 'g4',
    title: 'Common issues & error codes',
    topic: 'Troubleshooting',
    minutes: 6,
    steps: ['Won’t turn on: check the outlet and power cable.', 'Leaking: make sure the tank is seated correctly.', 'Error light blinking: restart and descale.'],
  },
];

/** Canned answers for the (simulated) AI assistant. */
export const assistantAnswers: { match: RegExp; answer: string }[] = [
  {
    match: /filter|clean/i,
    answer:
      'Here’s how to clean the filter:\n1. Remove the water tank\n2. Take out the filter\n3. Rinse it with warm water\n4. Let it dry completely\n5. Reinsert the filter',
  },
  {
    match: /descal|scale|limescale/i,
    answer: 'Descale every 2–3 months: fill the tank with descaling solution, run the descale program, then rinse with two tanks of clean water.',
  },
  {
    match: /error|code|blink/i,
    answer: 'A blinking error light usually means scale build-up or a misplaced tank. Unplug for 30 seconds, reseat the tank, then run a descale cycle.',
  },
  {
    match: /reset/i,
    answer: 'To reset: unplug the device, hold the power button for 10 seconds, plug it back in, and power it on.',
  },
  {
    match: /warranty|cover|claim/i,
    answer: 'Your warranty covers manufacturing defects. Accidental damage usually isn’t covered. Open the product and tap “Something broke?” to prepare a claim.',
  },
];

export const fallbackAnswer =
  'I can help with cleaning, descaling, error codes, resets and warranty questions. If the problem continues, open the product and tap “Something broke?” to prepare a claim.';
