// The race course: 40 customer-support tickets, each with the correct answer.
// Both racers get the exact same tickets and the exact same category descriptions.

export const CATEGORIES = {
  billing: "Charges, refunds, invoices, payment methods, or subscription prices.",
  technical: "The app or website is broken, slow, crashing, or showing an error.",
  shipping: "Where a package is, delivery delays, wrong address, or damaged items.",
  account: "Logging in, passwords, changing email, or deleting an account.",
} as const;

export type Category = keyof typeof CATEGORIES;

export const CATEGORY_NAMES = Object.keys(CATEGORIES) as Category[];

export interface Ticket {
  id: number;
  text: string;
  answer: Category;
}

export const TICKETS: Ticket[] = [
  // billing
  { id: 1, answer: "billing", text: "I was charged twice for my order this month. Please refund one of them." },
  { id: 2, answer: "billing", text: "Can I get a copy of my invoice from March for my expense report?" },
  { id: 3, answer: "billing", text: "My card expired. How do I update the payment method on file?" },
  { id: 4, answer: "billing", text: "Why did my subscription price go up from $9 to $12?" },
  { id: 5, answer: "billing", text: "I cancelled last week but you still took money from my account." },
  { id: 6, answer: "billing", text: "Do you offer a discount if I pay for a full year up front?" },
  { id: 7, answer: "billing", text: "There's a $4.99 fee on my statement I don't recognize." },
  { id: 8, answer: "billing", text: "The item arrived fine but I changed my mind. How do I get my money back?" },
  { id: 9, answer: "billing", text: "Can I split the payment between two credit cards?" },
  { id: 10, answer: "billing", text: "Your checkout charged me in euros instead of dollars." },

  // technical
  { id: 11, answer: "technical", text: "The app crashes every time I open the camera screen." },
  { id: 12, answer: "technical", text: "I get 'Error 500' when I click the save button." },
  { id: 13, answer: "technical", text: "The website takes over a minute to load on my phone." },
  { id: 14, answer: "technical", text: "Notifications stopped working after the latest update." },
  { id: 15, answer: "technical", text: "The search bar returns no results, even for things I know exist." },
  { id: 16, answer: "technical", text: "Dark mode makes all the text invisible on the settings page." },
  { id: 17, answer: "technical", text: "The export to PDF button does nothing when I click it." },
  { id: 18, answer: "technical", text: "The payment page shows a blank white screen so I can't check out." },
  { id: 19, answer: "technical", text: "Images in my feed show a broken icon instead of the picture." },
  { id: 20, answer: "technical", text: "The tracking page throws a JavaScript error and never loads." },

  // shipping
  { id: 21, answer: "shipping", text: "My package says delivered but it's not at my door." },
  { id: 22, answer: "shipping", text: "It's been two weeks and my order still hasn't shipped." },
  { id: 23, answer: "shipping", text: "I typed the wrong street number. Can you change the delivery address?" },
  { id: 24, answer: "shipping", text: "The box arrived crushed and the mug inside is broken." },
  { id: 25, answer: "shipping", text: "Do you ship to Canada, and how long does it take?" },
  { id: 26, answer: "shipping", text: "The tracking number you sent me doesn't work on the carrier's site." },
  { id: 27, answer: "shipping", text: "I only received 2 of the 3 items I ordered." },
  { id: 28, answer: "shipping", text: "Can I pick up my order at a store instead of having it delivered?" },
  { id: 29, answer: "shipping", text: "The courier left my parcel out in the rain and everything is soaked." },
  { id: 30, answer: "shipping", text: "You sent me a blue shirt but I ordered a red one." },

  // account
  { id: 31, answer: "account", text: "I forgot my password and the reset email never arrives." },
  { id: 32, answer: "account", text: "How do I change the email address on my profile?" },
  { id: 33, answer: "account", text: "Please delete my account and all of my data." },
  { id: 34, answer: "account", text: "Someone else logged into my account from another country." },
  { id: 35, answer: "account", text: "I want to turn on two-factor authentication." },
  { id: 36, answer: "account", text: "My account says it's locked after too many login attempts." },
  { id: 37, answer: "account", text: "Can I merge my two accounts into one?" },
  { id: 38, answer: "account", text: "I signed up with Google but now I want to log in with a password." },
  { id: 39, answer: "account", text: "How do I change my username?" },
  { id: 40, answer: "account", text: "I closed my account by accident. Can you bring it back?" },
];
