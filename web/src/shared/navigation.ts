import catalogData from '../../public/data/catalog.json';
export const catalog = catalogData;
export const paths = {
  home: 'pulpit',
  services: 'uslugi',
  more: 'wiecej',
  map: 'mapa',
  ar: 'ar',
  recording: 'nagranie',
  guide: 'instrukcja',
  data: 'dane',
  about: 'projekt',
} as const;
export type Page = keyof typeof paths;
export const names: Record<Page, string> = {
  home: 'Pulpit',
  services: 'Usługi',
  more: 'Więcej',
  map: 'Mapa AED',
  ar: 'Nawigacja AR',
  recording: 'Nagranie przejścia',
  guide: 'Instrukcja AED',
  data: 'Otwarte dane',
  about: 'O projekcie',
};
const pages: readonly Page[] = [
  'home',
  'services',
  'more',
  'map',
  'ar',
  'recording',
  'guide',
  'data',
  'about',
];
export function currentPage(): Page {
  return pages.find((p) => '#' + paths[p] === window.location.hash) ?? 'home';
}
