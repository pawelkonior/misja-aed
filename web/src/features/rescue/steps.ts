// Adult BLS, ERC 2025. The AED's prompts and the emergency dispatcher take priority.
export const medicalSources = {
  erc: 'https://www.prc.krakow.pl/wp-content/uploads/2025/11/WytResusc_netv2.pdf',
  ministry: 'https://www.gov.pl/web/mswia/pierwsza-pomoc',
};

export const steps = [
  {
    title: 'Wezwij pomoc',
    text: 'Sprawdź, czy jest bezpiecznie. Jeśli osoba nie reaguje, dzwoń pod 112 na głośniku. Udrożnij drogi oddechowe i oceń oddech przez maksymalnie 10 sekund.',
    tip: 'Jeśli osoba nie oddycha prawidłowo, od razu uciskaj środek klatki piersiowej. Wyślij drugą osobę po AED. Jeśli jesteś sam, zostań przy poszkodowanym i słuchaj dyspozytora.',
    illustration: 'Na ekranie telefonu pojawia się numer alarmowy 112.',
  },
  {
    title: 'Włącz defibrylator',
    text: 'Gdy AED jest przy poszkodowanym, otwórz pokrywę. Jeśli urządzenie samo się nie włączy, naciśnij przycisk zasilania. Słuchaj komunikatów AED.',
    tip: 'Jeśli pomagacie we dwoje, jedna osoba nadal uciska klatkę piersiową, a druga przygotowuje AED.',
    illustration: 'Otwarte urządzenie AED z podświetlanym przyciskiem zasilania.',
  },
  {
    title: 'Naklej elektrody',
    text: 'Odsłoń klatkę piersiową. Naklej elektrody na gołą skórę zgodnie z rysunkiem na opakowaniu. Pierwszą umieść pod prawym obojczykiem, drugą na lewym boku, bezpośrednio pod pachą.',
    tip: 'Strony oznaczają prawą i lewą stronę osoby poszkodowanej. Jeśli pomagacie we dwoje, kontynuujcie uciskanie podczas naklejania elektrod.',
    illustration:
      'Widok od przodu. Elektrody trafiają pod prawy obojczyk i na lewy bok klatki piersiowej poszkodowanego.',
  },
  {
    title: 'Odsuń się na polecenie AED',
    text: 'Podczas analizy rytmu i wyładowania nikt nie może dotykać poszkodowanego. Powiedz głośno „Odsunąć się!” i sprawdź, czy wszyscy się odsunęli.',
    tip: 'Jeśli AED poprosi, naciśnij przycisk wyładowania. W pełni automatyczny AED sam poda wyładowanie po ostrzeżeniu.',
    illustration:
      'Otwarta dłoń oznacza, że podczas analizy i wyładowania nikt nie dotyka poszkodowanego.',
  },
  {
    title: 'Wznów uciskanie',
    text: 'Po wyładowaniu lub komunikacie, że wyładowanie jest zbędne, od razu wróć do uciskania środka klatki piersiowej. Uciskaj na głębokość 5–6 cm, 100–120 razy na minutę. Po każdym uciśnięciu zwolnij nacisk.',
    tip: 'Jeśli potrafisz, stosuj 30 uciśnięć i 2 oddechy. W innym razie uciskaj bez przerw. Wykonuj polecenia AED i dyspozytora. Kontynuuj, aż ratownicy przejmą działania lub osoba zacznie prawidłowo oddychać.',
    illustration: 'Schemat przedstawia rytmiczne uciśnięcia klatki piersiowej osoby dorosłej.',
  },
] as const;
