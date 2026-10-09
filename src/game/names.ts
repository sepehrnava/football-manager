// Name parts for generated (fictional) players. Avoid famous footballers' surnames:
// generated names must never look like real players from the league data.

export const NATIONS: { flag: string; first: string[]; last: string[] }[] = [
  {
    flag: '🇬🇧',
    first: ['Jack', 'Harry', 'Oliver', 'Callum', 'Mason', 'Reece', 'Tom', 'Kieran'],
    last: ['Walker', 'Bennett', 'Hughes', 'Clarke', 'Foster', 'Marsh', 'Doyle', 'Pearce'],
  },
  {
    flag: '🇪🇸',
    first: ['Pablo', 'Sergio', 'Iker', 'Dani', 'Álvaro', 'Marc', 'Raúl', 'Hugo'],
    last: ['García', 'Moreno', 'Navas', 'Ruiz', 'Torres', 'Vidal', 'Serrano', 'Ortega'],
  },
  {
    flag: '🇫🇷',
    first: ['Lucas', 'Théo', 'Kylian', 'Hugo', 'Antoine', 'Yanis', 'Mathis', 'Enzo'],
    last: ['Martin', 'Dubois', 'Lefèvre', 'Mercier', 'Camara', 'Diallo', 'Bernard', 'Roux'],
  },
  {
    flag: '🇩🇪',
    first: ['Leon', 'Jonas', 'Felix', 'Niklas', 'Lukas', 'Timo', 'Kai', 'Julian'],
    last: ['Müller', 'Schmidt', 'Wagner', 'Becker', 'Hoffmann', 'Krüger', 'Brandt', 'Vogel'],
  },
  {
    flag: '🇧🇷',
    first: ['Gabriel', 'Rafael', 'Felipe', 'Lucas', 'Matheus', 'Rodrigo', 'Henrique', 'Caio'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Lima', 'Alves'],
  },
  {
    flag: '🇮🇹',
    first: ['Marco', 'Lorenzo', 'Federico', 'Andrea', 'Matteo', 'Davide', 'Nicolò', 'Luca'],
    last: ['Rossi', 'Bianchi', 'Romano', 'Ferrari', 'Esposito', 'Ricci', 'Greco', 'Conti'],
  },
  {
    flag: '🇳🇱',
    first: ['Daan', 'Sem', 'Bram', 'Luuk', 'Jesse', 'Milan', 'Thijs', 'Joey'],
    last: ['de Jong', 'Bakker', 'Visser', 'Smit', 'Mulder', 'de Vries', 'Bos', 'Dekker'],
  },
  {
    flag: '🇵🇹',
    first: ['João', 'Diogo', 'Rúben', 'Nuno', 'Gonçalo', 'Pedro', 'Tiago', 'André'],
    last: ['Ferreira', 'Carvalho', 'Mendes', 'Neves', 'Gomes', 'Pinto', 'Ramos', 'Sousa'],
  },
  {
    flag: '🇮🇷',
    first: ['Ali', 'Reza', 'Mehdi', 'Sardar', 'Saman', 'Milad', 'Arash', 'Omid'],
    last: ['Karimi', 'Rezaei', 'Shahbazi', 'Hosseini', 'Ahmadi', 'Moradi', 'Nazari', 'Jafari'],
  },
  {
    flag: '🇳🇬',
    first: ['Victor', 'Samuel', 'Ademola', 'Kelechi', 'Wilfred', 'Joe', 'Alex', 'Moses'],
    last: ['Okonkwo', 'Adebayo', 'Nwosu', 'Chukwu', 'Obi', 'Okoye', 'Nnamdi', 'Ejiofor'],
  },
  {
    flag: '🇯🇵',
    first: ['Takumi', 'Daichi', 'Kaoru', 'Ritsu', 'Wataru', 'Hiroki', 'Kento', 'Yuto'],
    last: ['Tanaka', 'Suzuki', 'Sato', 'Watanabe', 'Nakamura', 'Kobayashi', 'Yamamoto', 'Kato'],
  },
  {
    flag: '🇦🇷',
    first: ['Mateo', 'Santiago', 'Tomás', 'Joaquín', 'Franco', 'Agustín', 'Ignacio', 'Bautista'],
    last: ['Fernández', 'González', 'Romero', 'Molina', 'Acuña', 'Paredes', 'Medina', 'Díaz'],
  },
];

/**
 * The league's clubs, strongest first. `level` is the typical rating of their
 * starters. A user-created club takes the place of the last one.
 */
export const AI_CLUBS: { name: string; short: string; primary: string; secondary: string; level: number }[] = [
  { name: 'Northport United', short: 'NPU', primary: '#C8102E', secondary: '#FFFFFF', level: 77 },
  { name: 'Riverside Athletic', short: 'RIV', primary: '#1D428A', secondary: '#FFC72C', level: 75 },
  { name: 'Kingsbridge City', short: 'KGC', primary: '#6CABDD', secondary: '#1C2C5B', level: 73 },
  { name: 'Harbor Rovers', short: 'HRR', primary: '#00553E', secondary: '#FFFFFF', level: 71 },
  { name: 'Ashford Wanderers', short: 'ASW', primary: '#F58025', secondary: '#111111', level: 69 },
  { name: 'Eastgate FC', short: 'EGF', primary: '#6A1B9A', secondary: '#F5F5F5', level: 67 },
  { name: 'Millbrook Town', short: 'MBT', primary: '#222222', secondary: '#E3C770', level: 65 },
  { name: 'Stonehill Albion', short: 'STA', primary: '#D7263D', secondary: '#1B1B3A', level: 63 },
  { name: 'Westwood Rangers', short: 'WWR', primary: '#0077B6', secondary: '#90E0EF', level: 61 },
  { name: 'Bayside Harriers', short: 'BYH', primary: '#2B9348', secondary: '#F2B544', level: 60 },
];
