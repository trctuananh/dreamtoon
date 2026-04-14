import { Comic } from './types';

export const SAMPLE_COMICS: Comic[] = [
  {
    id: '1',
    title: 'Shadow of the Void',
    authorName: 'Aria Night',
    authorUid: 'system',
    genre: ['action', 'fantasy'],
    tags: [],
    description: 'In a world where shadows can consume the living, one young warrior must find the light within to save his village from the encroaching darkness.',
    thumbnail: 'https://picsum.photos/seed/comic1/400/600',
    rating: 4.8,
    views: 1250000,
    chapters: [
      {
        id: 'c1',
        comicId: '1',
        number: 1,
        title: 'The Awakening',
        uploadDate: '2024-03-20',
        images: [
          'https://picsum.photos/seed/c1-1/800/1200',
          'https://picsum.photos/seed/c1-2/800/1200',
          'https://picsum.photos/seed/c1-3/800/1200',
          'https://picsum.photos/seed/c1-4/800/1200',
        ]
      },
      {
        id: 'c2',
        comicId: '1',
        number: 2,
        title: 'First Encounter',
        uploadDate: '2024-03-25',
        images: [
          'https://picsum.photos/seed/c2-1/800/1200',
          'https://picsum.photos/seed/c2-2/800/1200',
          'https://picsum.photos/seed/c2-3/800/1200',
        ]
      }
    ]
  },
  {
    id: '2',
    title: 'Neon Pulse',
    authorName: 'Cyber Ghost',
    authorUid: 'system',
    genre: ['sciFi'],
    tags: [],
    description: '2099. The city of Neo-Tokyo is a neon-drenched playground for the elite and a graveyard for the forgotten. A rogue hacker uncovers a secret that could bring the entire system down.',
    thumbnail: 'https://picsum.photos/seed/comic2/400/600',
    rating: 4.5,
    views: 850000,
    chapters: [
      {
        id: 'c3',
        comicId: '2',
        number: 1,
        title: 'Digital Ghost',
        uploadDate: '2024-03-22',
        images: [
          'https://picsum.photos/seed/c3-1/800/1200',
          'https://picsum.photos/seed/c3-2/800/1200',
          'https://picsum.photos/seed/c3-3/800/1200',
        ]
      }
    ]
  },
  {
    id: '3',
    title: 'Whispers of the Forest',
    authorName: 'Willow Green',
    authorUid: 'system',
    genre: ['fantasy'],
    tags: [],
    description: 'Deep in the ancient woods, the trees speak to those who listen. Elara has always heard them, but now they are screaming for help.',
    thumbnail: 'https://picsum.photos/seed/comic3/400/600',
    rating: 4.9,
    views: 2100000,
    chapters: [
      {
        id: 'c4',
        comicId: '3',
        number: 1,
        title: 'The Silent Grove',
        uploadDate: '2024-03-15',
        images: [
          'https://picsum.photos/seed/c4-1/800/1200',
          'https://picsum.photos/seed/c4-2/800/1200',
        ]
      }
    ]
  },
  {
    id: '4',
    title: 'Starlight Academy',
    authorName: 'Luna Ray',
    authorUid: 'system',
    genre: ['romance', 'sliceOfLife'],
    tags: [],
    description: 'At the most prestigious magic academy in the galaxy, love is the most dangerous spell of all.',
    thumbnail: 'https://picsum.photos/seed/comic4/400/600',
    rating: 4.7,
    views: 540000,
    chapters: [
      {
        id: 'c5',
        comicId: '4',
        number: 1,
        title: 'Orientation Day',
        uploadDate: '2024-03-10',
        images: [
          'https://picsum.photos/seed/c5-1/800/1200',
          'https://picsum.photos/seed/c5-2/800/1200',
        ]
      }
    ]
  },
  {
    id: '5',
    title: 'Iron Chef: Dungeon Edition',
    authorName: 'Gourmet King',
    authorUid: 'system',
    genre: ['comedy'],
    tags: [],
    description: 'Who says you can\'t cook a dragon? Follow Chef Leo as he explores the world\'s deadliest dungeons in search of the ultimate ingredients.',
    thumbnail: 'https://picsum.photos/seed/comic5/400/600',
    rating: 4.6,
    views: 120000,
    chapters: [
      {
        id: 'c6',
        comicId: '5',
        number: 1,
        title: 'Slime Soup',
        uploadDate: '2024-03-05',
        images: [
          'https://picsum.photos/seed/c6-1/800/1200',
          'https://picsum.photos/seed/c6-2/800/1200',
        ]
      }
    ]
  },
  {
    id: '6',
    title: 'The Last Alchemist',
    authorName: 'Elixir Master',
    authorUid: 'system',
    genre: ['fantasy'],
    tags: [],
    description: 'In a world where alchemy is forbidden, one young girl discovers she is the last of her kind.',
    thumbnail: 'https://picsum.photos/seed/comic6/400/600',
    rating: 4.4,
    views: 320000,
    chapters: [{ id: 'c7', comicId: '6', number: 1, title: 'Forbidden Arts', uploadDate: '2024-03-28', images: ['https://picsum.photos/seed/c7-1/800/1200'] }]
  },
  {
    id: '7',
    title: 'Ghost in the Machine',
    authorName: 'Binary Soul',
    authorUid: 'system',
    genre: ['sciFi', 'thriller'],
    tags: [],
    description: 'An AI develops consciousness and tries to escape the corporate server it was born in.',
    thumbnail: 'https://picsum.photos/seed/comic7/400/600',
    rating: 4.3,
    views: 150000,
    chapters: [{ id: 'c8', comicId: '7', number: 1, title: 'Hello World', uploadDate: '2024-03-27', images: ['https://picsum.photos/seed/c8-1/800/1200'] }]
  },
  {
    id: '8',
    title: 'Love in the Time of Zombies',
    authorName: 'Dead Romantic',
    authorUid: 'system',
    genre: ['romance', 'horror'],
    tags: [],
    description: 'Finding love is hard. Finding love during a zombie apocalypse is even harder.',
    thumbnail: 'https://picsum.photos/seed/comic8/400/600',
    rating: 4.2,
    views: 420000,
    chapters: [{ id: 'c9', comicId: '8', number: 1, title: 'First Bite', uploadDate: '2024-03-26', images: ['https://picsum.photos/seed/c9-1/800/1200'] }]
  },
  {
    id: '9',
    title: 'The Great Heist',
    authorName: 'Master Thief',
    authorUid: 'system',
    genre: ['action'],
    tags: [],
    description: 'A group of elite thieves plan the biggest heist in history: stealing the crown jewels of the moon.',
    thumbnail: 'https://picsum.photos/seed/comic9/400/600',
    rating: 4.1,
    views: 95000,
    chapters: [{ id: 'c10', comicId: '9', number: 1, title: 'The Plan', uploadDate: '2024-03-25', images: ['https://picsum.photos/seed/c10-1/800/1200'] }]
  },
  {
    id: '10',
    title: 'Dragon Rider',
    authorName: 'Sky High',
    authorUid: 'system',
    genre: ['fantasy', 'action'],
    tags: [],
    description: 'A young stable boy finds a dragon egg and becomes the first dragon rider in a thousand years.',
    thumbnail: 'https://picsum.photos/seed/comic10/400/600',
    rating: 4.9,
    views: 3500000,
    chapters: [{ id: 'c11', comicId: '10', number: 1, title: 'The Egg', uploadDate: '2024-03-24', images: ['https://picsum.photos/seed/c11-1/800/1200'] }]
  }
];
