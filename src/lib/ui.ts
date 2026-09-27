/**
 * Interface strings — everything a component used to hard-code.
 *
 * Content (who he is, what he built) lives in `content.ts`; this is the frame
 * around it: labels, buttons, form messages, aria text. Kept separate because it
 * changes for different reasons — copy is edited when his story changes, this
 * when the interface does.
 *
 * `UiStrings` is inferred from the English table, so the Mongolian table is
 * checked key-for-key against it: a string added here and not translated is a
 * type error, not a silent English fallback.
 */

const en = {
  lang: {
    /** The toggle's own labels, always in their own script. */
    en: "EN",
    mn: "МН",
    switchTo: "Switch language",
    current: "English",
  },
  nav: {
    openMenu: "Open menu",
    closeMenu: "Close menu",
    siteMenu: "Site menu",
    backToTop: "back to top",
    home: "home",
    resume: "Resume",
    resumeAria: "Download resume (PDF)",
    online: "Online",
  },
  hero: {
    aria: "Introduction",
    currently: "Currently",
    scroll: "Scroll",
  },
  about: {
    aria: "Profile",
    portrait: (name: string) => `Portrait of ${name}`,
  },
  connect: {
    aria: "Find me elsewhere",
    eyebrow: "Find me elsewhere",
    title: "Signal",
    lead: "The code, the career history, and the résumé in English and Mongolian.",
    openPdf: "Open PDF",
    openProfile: "Open profile",
  },
  contact: {
    aria: "Contact",
    title: "Let's build",
    email: "Email",
    availability: "Availability",
    based: "Based",
  },
  form: {
    name: "Name",
    email: "Email",
    message: "Message",
    namePlaceholder: "Your name",
    emailPlaceholder: "you@company.com",
    messagePlaceholder: "The role, the team, or anything you'd like to ask…",
    nameRequired: "Please add your name.",
    emailRequired: "Please add your email.",
    emailInvalid: "That email doesn't look right.",
    messageShort: "A little more, please (10+ characters).",
    send: "Send message",
    sending: "Sending",
    sent: "Message sent",
    retry: "Try again",
    another: "Send another",
    noClient: "No mail client answered. Write to",
    copied: "Address copied",
    copy: "Copy address",
    liveSent: "Your mail client has been opened.",
    liveNoClient: (email: string) => `No mail client answered. Write to ${email} instead.`,
    liveErrors: (n: number) => `${n} ${n === 1 ? "field needs" : "fields need"} attention.`,
    subject: (name: string) => `Hello from ${name}`,
  },
  footer: {
    aria: "Footer",
    index: "Index",
    elsewhere: "Elsewhere",
    top: "Top",
    /** Trademark credit for the marks on the Signal panels (see BrandMarks). */
    credit:
      "GitHub and the Invertocat logo are trademarks of GitHub, Inc. LinkedIn and the IN logo are registered trademarks of LinkedIn Corporation.",
  },
  palette: {
    aria: "Command palette",
    placeholder: "Jump to a section, a case file, or an action…",
    search: "Search commands",
    results: "Commands",
    sections: "Sections",
    caseFiles: "Case files",
    actions: "Actions",
    copyEmail: "Copy email address",
    copiedEmail: "Copied",
    lowPower: "Low-power mode",
    language: "Мэдээллийг монголоор үзэх",
    on: "ON",
    off: "OFF",
    none: (q: string) => `Nothing matches “${q}”.`,
    keys: "↑↓ move · ↵ select · esc close",
    count: (n: number) => `${n} results`,
  },
  common: {
    newTab: "(opens in a new tab)",
  },
  notFound: {
    eyebrow: "Page not found",
    body: "This page doesn't exist — or it did, and doesn't any more.",
    back: "Back to the index",
  },
};

export type UiStrings = typeof en;

export const ui: { en: UiStrings; mn?: UiStrings } = { en };
