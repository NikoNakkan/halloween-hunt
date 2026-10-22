// All player-facing text lives here. Edit freely: the app reads nothing else.
// Each `code` is the secret part of a QR link (…/?c=<code>). Change them before printing
// if you want, but every code must stay unique.

export interface Clue {
  id: string;
  code: string;
  title: string;
  text: string;
}

export const START: Clue = {
  id: "start",
  code: "gria-k7q2",
  title: "ΚΑΛΩΣ ΗΡΘΕΣ…",
  text:
    "ΒΛΕΠΩ ΟΤΙ ΑΛΛΟΣ ΕΝΑΣ ΠΡΟΣΠΑΘΕΙ ΝΑ ΛΥΣΕΙ ΤΟΝ ΦΟΝΟ ΤΗΣ ΑΝΟΗΤΗΣ ΓΡΙΑΣ!\n\n" +
    "ΓΕΛΑΕΙ ΟΜΩΣ ΚΑΛΥΤΕΡΑ ΟΠΟΙΟΣ ΓΕΛΑΕΙ ΤΕΛΕΥΤΑΙΟΣ…\n\n" +
    "ΓΙΑ ΝΑ ΔΟΥΜΕ ΠΟΣΟ ΚΑΛΑ ΜΠΟΡΕΙΣ ΝΑ ΨΑΞΕΙΣ. ΥΠΑΡΧΟΥΝ ΑΛΛΑ 4 ΚΡΥΜΜΕΝΑ ΣΤΟΙΧΕΙΑ. " +
    "ΠΡΟΣΠΑΘΗΣΕ ΝΑ ΤΑ ΒΡΕΙΣ ΠΡΙΝ ΕΙΝΑΙ ΠΟΛΥ ΑΡΓΑ…",
};

export const CLUES: readonly Clue[] = [
  {
    id: "steel",
    code: "atsali-3mzp",
    title: "Η μυρωδιά του ατσαλιού",
    text:
      "Η μυρωδιά του ατσαλιού δεν φεύγει ποτέ. Κολλάει στα δάχτυλα, στα σεντόνια, στους τοίχους. " +
      "Εκείνο το βράδυ η κουζίνα μύριζε σίδερο… και κανείς δεν μαγείρευε.",
  },
  {
    id: "blood",
    code: "stagona-9xwr",
    title: "Σταγόνα… σταγόνα…",
    text:
      "Ακούς τον ήχο; Σταγόνα… σταγόνα… σταγόνα. Έσταζε όλη νύχτα πάνω από το κρεβάτι της γιαγιάς. " +
      "Το πρωί, το πάτωμα είχε γίνει καθρέφτης. Κόκκινος καθρέφτης.",
  },
  {
    id: "bonds",
    code: "desmoi-5tbh",
    title: "Οι δεσμοί της οικογένειας",
    text:
      "Οι οικογενειακοί δεσμοί είναι βαθιοί. Βαθιοί και μακριοί. " +
      "Τόσο βαθιοί που φτάνουν κάτω από το πάτωμα. Τόσο μακριοί που ακόμα σφίγγουν.",
  },
  {
    id: "hidden",
    code: "skia-2fjn",
    title: "Κάποιος ήταν πάντα εκεί",
    text:
      "Κάποιος ζούσε πάντα μέσα στο σπίτι. Άκουγε πίσω από τις πόρτες, ήξερε κάθε τρίξιμο. " +
      "Η γιαγιά τον έλεγε «φάντασμα». Δεν ήταν φάντασμα.",
  },
];

export const ALL_CLUES: readonly Clue[] = [START, ...CLUES];

export const TEXT = {
  enterTitle: "ΤΟ ΣΠΙΤΙ ΤΗΣ ΓΡΙΑΣ",
  enterButton: "Πάτα για να μπεις… αν τολμάς",
  enterHint: "Δυνάμωσε τον ήχο 🔊",
  lockedTitle: "Όχι ακόμα…",
  lockedText: "Βρες πρώτα την αρχή. Η γριά σε περιμένει.",
  unknownTitle: "Χάθηκες;",
  unknownText: "Αυτός ο κωδικός δεν υπάρχει. Ή μήπως υπήρχε κάποτε…",
  alreadyFound: "Αυτό το στοιχείο το έχετε ήδη βρει.",
  newFind: "Νέο στοιχείο!",
  homeTitle: "Το κυνήγι συνεχίζεται",
  homeText: "Ψάξε τους κρυμμένους κωδικούς μέσα στο σπίτι και σκάναρέ τους με την κάμερα.",
  notStarted: "Το κυνήγι δεν έχει ξεκινήσει. Βρες τον πρώτο κωδικό.",
  progressLabel: "Στοιχεία που βρέθηκαν",
  // Shown on every phone once all 5 are found (and nothing else): the quiz password.
  codeLabel: "Ο κωδικός είναι",
  code: "ΕΓΓΟΝΗ",
  scanButton: "📷 Σκάναρε",
  scanHint: "Στόχευσε τον κρυμμένο κωδικό…",
  scanCancel: "Άκυρο",
  scanNoCamera: "Δεν βρέθηκε κάμερα. Σκάναρε με την κάμερα του κινητού σου.",
  muteOn: "🔇",
  muteOff: "🔊",
} as const;
