/**
 * Mongolian content.
 *
 * Built *from* the English content, so everything that is not language — links,
 * screenshots, numbers, accents, slugs — is shared and cannot drift. Only words
 * are listed here, keyed by slug / code / position, and each table is typed so
 * a project or capability without a translation is a type error.
 *
 * Wording follows the Mongolian résumé wherever it covers the same fact.
 * **Draft for Amartuvshin to proofread** before the Mongolian site is linked
 * anywhere — see the note in the handoff.
 */

import {
  en,
  type Capability,
  type Project,
  type SiteContent,
  type SocialLink,
  type TimelineEntry,
} from "@/lib/content";

type ProjectWords = Pick<
  Project,
  "category" | "role" | "status" | "summary" | "description" | "highlights"
> & {
  title?: string;
  /** Metric labels, in order. */
  metrics?: string[];
  /** Link labels, in order. */
  links?: string[];
  /** Gallery alt + caption, in order. */
  gallery?: { alt: string; caption?: string }[];
};

const projects: Record<string, ProjectWords> = {
  spotfixes: {
    category: "Хиймэл оюунтай алдаа ангилах платформ",
    role: "UI/UX хариуцагч, QA · 3 хүний баг",
    status: "Ажиллаж байна",
    summary:
      "Mozilla Firefox-ийн 222,000+ алдааны бүртгэлээр сургасан, програм хангамжийн алдааны зэрэглэлийг таамаглаж, давхардсан тайланг илрүүлдэг ажиллаж буй вэб платформ.",
    description:
      "Spotfixes бол Ганнон Их Сургуульд хийсэн бидний жил үргэлжилсэн төгсөлтийн төсөл (2025 намар – 2026 хавар) бөгөөд Mozilla Firefox-ийн хөгжүүлэгчид болон удирдагч багшийн зөвлөмжийг тусган бүтээсэн. Алдааны зэрэглэлийг (S1–S4) TF-IDF + Random Forest загвар, түлхүүр үгийн дүрмийн системээр таамаглаж, RAG төстэй байдлын хайлтаар өмнөх хамгийн төстэй гурван алдааг гаргаж ирдэг. Байгууллага бүр тусгаарлагдсан ажлын орчинтой (multi-tenant, Supabase RLS) бөгөөд өөрсдийн алдааг бөөнөөр оруулж, загвараа дахин сургах боломжтой. Би React интерфэйсийн UI/UX-ийг хариуцаж, хэрэглэгчийн туршилт, QA бүртгэлийг удирдан, Ubuntu дээрх Docker байршуулалтыг үнэлсэн.",
    highlights: [
      "Алдааны зэрэглэлийг 89% нарийвчлалтай таамагладаг (эцсийн тайлан); сургалтын өгөгдлийг оруулан бүх өгөгдөл дээр үнэлэхэд 97.6%",
      "Multi-tenant: гурван үүрэг, компани бүрийн өгөгдлийг өгөгдлийн сангийн мөрийн түвшинд тусгаарласан",
      "Давхардлыг түлхүүр үгээр биш, утгаар нь илрүүлдэг (ChromaDB + RAG)",
      "Таамаглал дунджаар 3.4 сек, төстэй алдааны хайлт 1.2 сек (зорилт: 5 сек-ээс бага)",
      "Хэрэглэгчийн туршилтаар давхардсан админ бүртгэл, дахин сургалтын явцын алдааг илрүүлж, хоёуланг нь зассан",
      "GitHub Actions CI/CD-тэйгээр spotfixes.com дээр ажиллаж байна",
    ],
    metrics: ["НАРИЙВЧЛАЛ", "АЛДААНЫ БҮРТГЭЛ", "ТААМАГЛАЛ"],
    links: ["Сайт үзэх", "Код"],
    gallery: [
      {
        alt: "Spotfixes-ийн нүүр хуудас: ML ангилал, семантик хайлт, tenant тусгаарлалт, эрхийн түвшин, CSV ба JSON импорт, засварын санал гэсэн зургаан боломжийн карт.",
        caption: "Үндсэн платформ · нүүр хуудас, багийн төсөл",
      },
      {
        alt: "Spotfixes-ийн нүүр хуудас: TF-IDF шинж чанарын гаргалт, вектор RAG давхардал илрүүлэлт, санал хүсэлтэд суурилсан дахин сургалт, 222k+ Firefox бүртгэл бүхий ML хөдөлгүүрийн хэсэг.",
        caption: "ML хөдөлгүүр · нүүр хуудас, багийн төсөл",
      },
      {
        alt: "Spotfixes-ийн нүүр хуудас: мөрийн түвшний хамгаалалтын төлөв болон технологийн логонуудын матриц бүхий дэд бүтцийн хэсэг.",
        caption: "Дэд бүтэц · нүүр хуудас, багийн төсөл",
      },
    ],
  },
  "web-design": {
    category: "Концепц сайт · Хичээлийн ажил",
    role: "Дизайнер, хөгжүүлэгч · AI туслалцаатай",
    status: "Ажиллаж байна",
    summary:
      "Ганнон Их Сургуулийн вэб дизайны хичээлд зориулж KRYOS, VOIDGATE гэсэн зохиомол брэндүүдэд хийсэн хоёр концепц вэбсайт.",
    description:
      "Ганнон Их Сургуулийн вэб дизайны хичээлийн ажил (2026 хавар). KRYOS нь зохиомол тоглоомын студи, VOIDGATE нь зохиомол шинжлэх ухааны уран зөгнөлт ертөнц бөгөөд хоёр брэнд, тэдний бүх мэдэгдэл даалгаврын хүрээнд зохиогдсон. Би хоёр сайтыг хиймэл оюуны туслалцаатай зохиож бүтээсэн: VS Code доторх Claude Code болон судалгаанд Firecrawl, зураг үүсгэхэд Gemini Nano Banana, UI үүсгэхэд Magic, Google Stitch зэрэг MCP серверүүдийг ашиглаж, үр дүнг нь чиглүүлэн засварлаж, байршуулсан.",
    highlights: [
      "Хоёр бүрэн концепц сайт, хоёулаа байршуулагдсан",
      "AI туслалцаатай ажлын урсгал: Firecrawl, Nano Banana, Magic, Stitch бүхий Claude Code",
      "Зохиомол брэндүүд — студи, ертөнц, мэдэгдлүүд нь дизайны даалгаврын нэг хэсэг",
    ],
    links: ["KRYOS", "VOIDGATE"],
    gallery: [
      {
        alt: "KRYOS-ийн нүүр хэсэг: тоглоомын HUD хүрээтэй, талст дүрс дээрх “Worlds that remember you” гарчиг.",
        caption: "KRYOS · зохиомол тоглоомын студи",
      },
      {
        alt: "KRYOS-ийн бүтээлийн хэсэг: Project Halcyon, Nightfold гэсэн зохиомол хоёр тоглоомын үүсгэсэн зурагтай том картууд.",
        caption: "KRYOS · бүтээлүүд",
      },
      {
        alt: "VOIDGATE-ийн нүүр хэсэг: гэрэлтсэн лого, командын мөр, серверийн өрөөний консолын зураг.",
        caption: "VOIDGATE · зохиомол sci-fi ертөнц",
      },
      {
        alt: "VOIDGATE-ийн архивын хэсэг: түүх, протоколын төлөвийн хүснэгт, фракцын картууд болон өгөгдлийн агуулахын зураг.",
        caption: "VOIDGATE · архив",
      },
    ],
  },
  portfolio: {
    title: "ЭНЭ САЙТ",
    category: "Хувийн портфолио",
    role: "Дизайнер, хөгжүүлэгч",
    status: "Хөгжүүлж байна",
    summary:
      "Таны үзэж буй сайт: Next.js дээр бүтээсэн, гүйлгэлтээр хөдөлдөг, CI-д хүртээмжийн шалгалттай портфолио.",
    description:
      "Next.js 16, React 19, TypeScript, Tailwind CSS v4, GSAP, Framer Motion ашиглан эхнээс нь зохиож бүтээсэн. Push бүрт GitHub Actions дээр төрлийн шалгалт, lint, production build болон axe хүртээмжийн автомат шалгалт ажилладаг бөгөөд бүх хөдөлгөөнт эффект нь хөдөлгөөн багасгах тохиргоонд зориулсан хувилбартай.",
    highlights: [
      "CI-д axe хүртээмжийн автомат шалгалт",
      "Хөдөлгөөн багасгах бүрэн горим",
      "390px утаснаас десктоп хүртэл дасан зохицдог",
    ],
    gallery: [
      {
        alt: "Энэ сайтын бүтээлийн хэсэг: гүйлгэлтээр удирдагддаг тайзан дээрх төслийн дэлгэц, түүхийн багана.",
        caption: "Бүтээлийн тайз",
      },
      {
        alt: "Энэ сайтын замнал хэсэг: Их нууруудыг ойртуулан харуулсан LED бөмбөрцөг, туйлын дээгүүр Эри хүрч ирсэн гэрэлтсэн маршрут, 2022 оны бичлэг нээлттэй замын бүртгэл.",
        caption: "Маршрут",
      },
    ],
  },
};

const capabilities: Record<string, Pick<Capability, "title" | "description" | "tags">> = {
  "SYS/01": {
    title: "Full-stack вэб",
    description:
      "PostgreSQL (Supabase) өгөгдлийн сантай FastAPI backend дээр React frontend, REST API, multi-tenant өгөгдлийн тусгаарлалт.",
    tags: ["React", "FastAPI", "PostgreSQL"],
  },
  "SYS/02": {
    title: "Машин сургалт",
    description:
      "scikit-learn-ээр (TF-IDF + Random Forest) текст ангилал, ChromaDB ашигласан RAG төстэй байдлын хайлт.",
    tags: ["scikit-learn", "RAG", "ChromaDB"],
  },
  "SYS/03": {
    title: "Java ба суурь програмчлал",
    description:
      "Хамгийн сайн эзэмшсэн хэл минь Java, мөн Python, JavaScript, SQL, C++; Android Studio-д Android апп.",
    tags: ["Java", "Python", "C++"],
  },
  "SYS/04": {
    title: "UI/UX ба хэрэглэгчийн туршилт",
    description:
      "Spotfixes-ийн UI/UX-ийг хариуцаж, хэрэглэгчийн туршилт төлөвлөн явуулж, илрүүлсэн асуудлыг бүртгэн засварт хүргэсэн.",
    tags: ["UI/UX", "Хэрэглэгчийн туршилт", "Хүртээмж"],
  },
  "SYS/05": {
    title: "Тест ба QA",
    description:
      "Програм хангамжийн хөгжүүлэлтийн мөчлөгийн туршид тест кейс боловсруулах, алдаа хянах, QA тайлан гаргах.",
    tags: ["QA", "Тест кейс", "SDLC"],
  },
  "SYS/06": {
    title: "DevOps ба аюулгүй байдал",
    description:
      "Ubuntu дээр Docker, GitHub Actions CI/CD, OAuth2, JWT, MFA болон мөрийн түвшний хамгаалалт (RLS) бүхий нэвтрэлт.",
    tags: ["Docker", "CI/CD", "OAuth2"],
  },
};

/** In the same order as the English timeline. */
const timeline: Pick<TimelineEntry, "period" | "title" | "org" | "description">[] = [
  {
    period: "2020 – 2021",
    title: "Их сургуулийн суралцалт · 21 кредит",
    org: "Шинжлэх Ухаан, Технологийн Их Сургууль",
    description: "Улаанбаатар, Монгол. 21 кредит судалсан.",
  },
  {
    period: "2022, 2023 оны зун",
    title: "Зуны хурлын туслах ажилтан",
    org: "Ганнон, Туслах үйлчилгээ",
    description: "Оюутны байр бэлтгэж, хурлын зочдод үйлчилсэн.",
  },
  {
    period: "2023.08 – 2024.05",
    title: "Хүлээн авалтын ажилтан",
    org: "Ганнон, Оюутны байрны алба",
    description: "StarRez-д оюутны байрны бүртгэл хөтөлж, оршин суугчдын хүсэлтийг шийдвэрлэсэн.",
  },
  {
    period: "2025.05 – 2026.04",
    title: "Хоол үйлчилгээний ажилтан",
    org: "Metz Culinary · Chick-fil-A",
    description: "Оюутны хотхоны оргил цагаар хоол бэлтгэл, нөөцийг хариуцсан.",
  },
  {
    period: "2025.08 – 2026.05",
    title: "Spotfixes · Төгсөлтийн төсөл",
    org: "Ганнон Их Сургууль · 3 хүний баг",
    description:
      "Mozilla Firefox-ийн 222,000+ алдааны бүртгэлээр сургасан, алдааны зэрэглэлийг таамагладаг ажиллаж буй платформ. Би React интерфэйсийн UI/UX, хэрэглэгчийн туршилт, QA-г хариуцсан.",
  },
  {
    period: "2026.05-д төгссөн",
    title: "Програм хангамжийн инженерчлэлийн бакалавр",
    org: "Ганнон Их Сургууль",
    description:
      "Эри, Пенсильвани, АНУ. Инженерчлэл, бизнесийн коллежийн деканы жагсаалт (2024 намар, 2025 хавар).",
  },
  {
    period: "2026.06 – 2026.09",
    title: "Корпорацийн логистикийн зохицуулагч (гэрээт, Ханбогд Хурд)",
    org: "Оюу Толгой ХХК",
    description:
      "Төв оффис болон уурхайн хоорондын ачаа тээврийг зохицуулж, логистикийн өгөгдлийг хянан маршрутын үр ашиггүй байдлыг илрүүлсэн.",
  },
];

const nav: Record<string, string> = {
  "#hero": "Эхлэл",
  "#about": "Танилцуулга",
  "#connect": "Холбоо",
  "#work": "Төслүүд",
  "#capabilities": "Ур чадвар",
  "#anatomy": "Дотор",
  "#timeline": "Замнал",
  "#contact": "Холбогдох",
};

const socials: Record<string, Partial<SocialLink>> = {
  GH: { label: "GITHUB", handle: "@amartuvshing" },
  IN: { label: "LINKEDIN", handle: "in/amartuvshinganzorig" },
  LV: { label: "SPOTFIXES", handle: "spotfixes.com · ажиллаж буй" },
};

function required<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`content.mn: missing translation for ${what}`);
  return v;
}

export const mn: SiteContent = {
  profile: {
    ...en.profile,
    wordmark: "АМАРТҮВШИН",
    fullName: "Ганзоригийн Амартүвшин",
    role: "Програм хангамжийн инженер",
    discipline: "Full-stack · Машин сургалт · UI/UX",
    location: "Улаанбаатар, Монгол · GMT+8",
    status: "Програм хангамжийн инженерийн анхан шатны ажилд нээлттэй",
    heroLead: "Сайн уу, би Амартүвшин. Портфолиод минь тавтай морил.",
    heroLeadLines: ["Сайн уу, би Амартүвшин.", "Портфолиод минь тавтай морил."],
    heroSub:
      "Програм хангамжийн инженерчлэлээр төгссөн. Full-stack вэб апп, машин сургалтын хэрэгсэл бүтээдэг — хамгийн сүүлд Mozilla Firefox-ийн 222,000+ алдааны тайланд суурилсан, хиймэл оюунтай алдаа ангилах платформ.",
    kicker: "ПОРТФОЛИО — 2026",
  },
  about: {
    heading: "ТАНИЛЦУУЛГА",
    lead: "Ганнон Их Сургуулийн төгсөгч, одоо Улаанбаатарт.",
    paragraphs: [
      "2026 оны 5-р сард АНУ-ын Пенсильвани мужийн Эри хот дахь Ганнон Их Сургуулийг програм хангамжийн инженерчлэлийн бакалавр зэрэгтэй төгссөн. Миний төгсөлтийн төсөл Spotfixes нь програм хангамжийн алдаа хэр ноцтойг таамаглаж, давхардсан тайланг илрүүлдэг ажиллаж буй вэб платформ бөгөөд Mozilla Firefox-ийн бодит өгөгдөл дээр, Firefox-ийн хөгжүүлэгчдийн зөвлөмжийг тусган бүтээгдсэн. Би түүний UI/UX болон хэрэглэгчийн туршилтыг хариуцсан.",
      "Би голчлон Java, Python, React ашигладаг бөгөөд хэрэглэгчийн анзаардаг зүйлд буюу ойлгомжтой интерфэйс, найдвартай ажиллагаа, хэрэглэгчид хүрэхээс өмнө алдааг илрүүлэх туршилтад анхаардаг. Одоо Улаанбаатарт буцаж ирсэн, монгол, англи хэлээр чөлөөтэй харилцдаг бөгөөд анхны бүтэн цагийн програм хангамжийн инженерийн ажлаа хайж байна.",
    ],
    signature: [
      { k: "ЧИГЛЭЛ", v: "Full-stack · ML" },
      { k: "ТЕХНОЛОГИ", v: "Java · Python · React" },
      { k: "БАЙРШИЛ", v: "Улаанбаатар, МН" },
    ],
  },
  capabilities: en.capabilities.map((cap) => ({
    ...cap,
    ...required(capabilities[cap.code], `capability ${cap.code}`),
  })),
  projects: en.projects.map((p) => {
    const w = required(projects[p.slug], `project ${p.slug}`);
    return {
      ...p,
      title: w.title ?? p.title,
      category: w.category,
      role: w.role,
      status: w.status,
      summary: w.summary,
      description: w.description,
      highlights: w.highlights,
      metrics: p.metrics.map((m, i) => ({ ...m, label: w.metrics?.[i] ?? m.label })),
      links: p.links?.map((l, i) => ({ ...l, label: w.links?.[i] ?? l.label })),
      gallery: p.gallery?.map((g, i) => ({ ...g, ...(w.gallery?.[i] ?? {}) })),
    };
  }),
  timeline: en.timeline.map((e, i) => ({
    ...e,
    ...required(timeline[i], `timeline entry ${i}`),
  })),
  contact: {
    ...en.contact,
    heading: "ХОЛБОГДОХ",
    lead: "Ажлын байр эсвэл төслийн талаар ярилцах уу? И-мэйл бичээрэй — 48 цагийн дотор хариу өгнө.",
    availability: "НЭЭЛТТЭЙ · ОДОО АЖИЛЛАХ БОЛОМЖТОЙ",
  },
  socials: en.socials.map((s) => ({ ...s, ...(socials[s.code] ?? {}) })),
  navLinks: en.navLinks.map((l) => ({ ...l, label: nav[l.href] ?? l.label })),
};
