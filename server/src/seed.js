/**
 * Idempotent database seed.
 *
 * Safe by default: it upserts by stable keys and never deletes existing records.
 *   --force     wipe the Athenaeum collections first (refused in production)
 *   --if-empty  do nothing when the catalogue already has titles (used on startup)
 */
import { connectDatabase, disconnectDatabase } from './db.js'
import { User } from './models/User.js'
import { Book } from './models/Book.js'
import { Category } from './models/Category.js'
import { Loan } from './models/Loan.js'
import { InventoryTransaction } from './models/InventoryTransaction.js'
import { config } from './config.js'

const force = process.argv.includes('--force')
const ifEmpty = process.argv.includes('--if-empty')
const DAY = 24 * 60 * 60 * 1000
const daysFromNow = (n) => new Date(Date.now() + n * DAY)

if (force && config.isProd) {
  // --force drops every Athenaeum collection; never permit that in production.
  console.error('[seed] refusing to run --force with NODE_ENV=production')
  process.exit(1)
}

const CATEGORIES = [
  {
    name: 'Natural Sciences & Physical Inquiry',
    slug: 'natural-sciences',
    icon: 'science',
    image: '/assets/stitch/db809a7cc1.jpg',
    collectionNote: 'Rare Manuscripts & Codices',
    description:
      'Physics, astronomy, chemistry and the experimental tradition from the sixteenth-century rebirth of natural philosophy to the quantitative revolution of the Enlightenment.',
  },
  {
    name: 'Literature, Philology & Poetry',
    slug: 'literature-philology',
    icon: 'auto_stories',
    image: '/assets/stitch/7918eb0a17.jpg',
    collectionNote: 'Core Humanist Canon',
    description:
      'Vernacular poetry, classical philology, critical editions and the marginalia tradition that carried humanist reading practices across Europe.',
  },
  {
    name: 'History, Archaeology & Codicology',
    slug: 'history-archaeology',
    icon: 'history_edu',
    image: '/assets/stitch/91e21a0f06.jpg',
    collectionNote: 'Rare Manuscripts & Codices',
    description:
      'Chronicles, epigraphy, excavation reports and the material study of the codex itself — scripts, bindings, watermarks and provenance.',
  },
  {
    name: 'Cartography & Celestial Atlases',
    slug: 'cartography',
    icon: 'public',
    image: '/assets/stitch/0f056a0672.jpg',
    collectionNote: 'Cartography & Celestial Atlases',
    description:
      'Hand-tinted atlases, portolan charts, celestial maps and the instruments of early modern navigation and cosmography.',
  },
  {
    name: 'Philosophy & Scholasticism',
    slug: 'philosophy',
    icon: 'psychology',
    image: '/assets/stitch/e6e5a261bb.jpg',
    collectionNote: 'Philosophy & Scholasticism',
    description:
      'Scholastic summae, early modern rationalism and the critical tradition, with full concordances to the humanist canon.',
  },
  {
    name: 'Law, Treatises & Jurisprudence',
    slug: 'law',
    icon: 'gavel',
    image: '/assets/stitch/fbc203e351.jpg',
    collectionNote: 'Law, Treatises & Jurisprudence',
    description:
      'Roman law, canonical treatises, customary codes and the printed jurisprudence of the early modern courts.',
  },
  {
    name: 'Musicology & Liturgical Scores',
    slug: 'musicology',
    icon: 'music_note',
    image: '/assets/stitch/2f45c3ccef.jpg',
    collectionNote: 'Musicology & Liturgical Scores',
    description:
      'Illuminated antiphonals, notated graduals and the palaeography of chant across monastic scriptoria.',
  },
  {
    name: 'Computer Science & Computational Theory',
    slug: 'computer-science',
    icon: 'memory',
    image: '/assets/stitch/7dfa83659a.jpg',
    collectionNote: 'Cross-Disciplinary Concordances',
    description:
      'Mathematical logic, formal systems and the foundations of computation, read alongside the historical manuscript record.',
  },
  {
    name: 'Engineering & Applied Technology',
    slug: 'engineering',
    icon: 'precision_manufacturing',
    image: '/assets/stitch/1f61c8d718.jpg',
    collectionNote: 'Engineering & Applied Technology',
    description:
      'Architectural treatises, mechanics, hydraulics and the illustrated handbooks of practical invention.',
  },
  {
    name: 'Business, Commerce & Economics',
    slug: 'business-economics',
    icon: 'account_balance',
    image: '/assets/stitch/ad80b02ad9.jpg',
    collectionNote: 'Business, Commerce & Economics',
    description:
      'Mercantile ledgers, political economy and the printed treatises that codified early modern commerce.',
  },
  {
    name: 'Fiction, Narratives & Storycraft',
    slug: 'fiction-narrative',
    icon: 'menu_book',
    image: '/assets/stitch/677b906d35.jpg',
    collectionNote: 'Fiction, Narratives & Storycraft',
    description:
      'Frame narratives, romances and the earliest printed vernacular story cycles held in the rare folio vault.',
  },
  {
    name: 'Self-Development, Ethics & Human Flourishing',
    slug: 'ethics-flourishing',
    icon: 'self_improvement',
    image: '/assets/stitch/b419c8137b.jpg',
    collectionNote: 'Self-Development, Ethics & Human Flourishing',
    description:
      'Virtue ethics, practical philosophy and the long tradition of writing on how a life should be lived.',
  },
]

const BOOKS = [
  {
    title: 'Philosophiae Naturalis Principia Mathematica',
    author: 'Sir Isaac Newton',
    authorDates: '1642–1727',
    publishedYear: 1687,
    publisher: 'Royal Society / Joseph Streater, London',
    category: 'natural-sciences',
    shelfmark: 'MS. BODL. 1687-NEWT • Cambridge & Bodleian',
    codexLanguage: 'Latin',
    pages: 510,
    coverImage: '/assets/principia-cover.png',
    featured: true,
    rating: 4.9,
    citationCount: 28490,
    totalCopies: 4,
    tags: ['Latin', 'Classical Mechanics', 'Core Humanist Canon'],
    collectionName: 'Rare Manuscripts & Codices',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1200 DPI Multispectral',
    location: 'Reading Room Vault',
    excerpt:
      '"Axiomata, sive Leges Motus. Lex I: Corpus omne perseverare in statu suo quiescendi vel movendi uniformiter in directum..."',
    description:
      'The first edition of Newton\'s Principia, presented to the Bodleian by the author and annotated in a contemporary hand. Establishes the three laws of motion, universal gravitation and the mathematical method of natural philosophy that shaped the following three centuries of physical science. Digitised at 1200 DPI with multispectral capture to recover the faded iron-gall marginalia.',
  },
  {
    title: 'De Humani Corporis Fabrica Libri Septem',
    author: 'Andreas Vesalius',
    authorDates: '1514–1564 • Attr. Jan van Calcar',
    publishedYear: 1543,
    publisher: 'Johannes Oporinus, Basel',
    category: 'natural-sciences',
    shelfmark: 'INC. 1543-VES • Basel & Paris Faculté',
    codexLanguage: 'Latin',
    pages: 663,
    coverImage: '/assets/stitch/3455536e0c.jpg',
    featured: true,
    rating: 4.8,
    citationCount: 19340,
    totalCopies: 3,
    tags: ['Latin', 'Medical Humanism', 'Anatomy'],
    collectionName: 'Rare Manuscripts & Codices',
    accessTier: 'Full Color Plates',
    digitalFidelity: 'Anatomical Woodcuts',
    description:
      'Vesalius\'s revolutionary anatomical atlas, illustrated with woodcuts attributed to the workshop of Jan van Calcar. The Fabrica overturned Galenic anatomy through direct dissection and is considered the founding work of modern medical illustration. This copy preserves the folding plates in their first state.',
  },
  {
    title: 'Sidereus Nuncius (The Starry Messenger)',
    author: 'Galileo Galilei',
    authorDates: '1564–1642',
    publishedYear: 1610,
    publisher: 'Tommaso Baglioni, Venice',
    category: 'natural-sciences',
    shelfmark: 'VEN. 1610-GAL • Biblioteca Nazionale Marciana',
    codexLanguage: 'Latin',
    pages: 58,
    coverImage: '/assets/stitch/145096c881.jpg',
    rating: 4.9,
    citationCount: 22180,
    totalCopies: 2,
    tags: ['Latin', 'Observational Astronomy'],
    collectionName: 'Rare Manuscripts & Codices',
    accessTier: 'Open Access',
    digitalFidelity: 'Astronomical Engravings',
    description:
      'Galileo\'s announcement of the four Medicean moons, the mountainous lunar surface and the swarm of previously uncatalogued stars. The etched lunar plates remain among the most reproduced images in the history of science.',
  },
  {
    title: 'Harmonices Mundi (The Harmony of the World)',
    author: 'Johannes Kepler',
    authorDates: '1571–1630',
    publishedYear: 1619,
    publisher: 'Gottfried Tampach, Linz',
    category: 'natural-sciences',
    shelfmark: 'LINZ. 1619-KEP • Austrian National Library',
    codexLanguage: 'Latin',
    pages: 252,
    coverImage: '/assets/stitch/25ee7dba9a.jpg',
    rating: 4.7,
    citationCount: 11760,
    totalCopies: 2,
    tags: ['Latin', 'Astrophysics', 'Musicology & Math'],
    collectionName: 'Rare Manuscripts & Codices',
    accessTier: 'IIIF v3.0',
    digitalFidelity: 'Musicology & Math',
    description:
      'In which Kepler sets out the third law of planetary motion and argues that the heavens are governed by musical proportion — a bridge between Pythagorean cosmology and modern celestial mechanics.',
  },
  {
    title: 'Theatrum Orbis Terrarum (Theatre of the World)',
    author: 'Abraham Ortelius',
    authorDates: '1527–1598',
    publishedYear: 1570,
    publisher: 'Gillis Coppens van Diest, Antwerp',
    category: 'cartography',
    shelfmark: 'CART. 1570-ORT • Royal Geographic Society',
    codexLanguage: 'Latin',
    pages: 188,
    coverImage: '/assets/stitch/0f056a0672.jpg',
    rating: 4.8,
    citationCount: 9810,
    totalCopies: 2,
    tags: ['Latin', 'Global Geography', 'Cartography'],
    collectionName: 'Cartography & Celestial Atlases',
    accessTier: 'Hand-Tinted Folios',
    digitalFidelity: 'Cartography',
    description:
      'Generally regarded as the first modern atlas: a uniform collection of maps, consistently engraved and bound to a single format. This copy retains its original hand-tinting in verdigris and vermilion.',
  },
  {
    title: 'Micrographia: Minute Bodies Exemplified',
    author: 'Robert Hooke, F.R.S.',
    authorDates: '1635–1703',
    publishedYear: 1665,
    publisher: 'Royal Society, London',
    category: 'natural-sciences',
    shelfmark: 'RYS. 1665-HOOK • Royal Society Archives',
    codexLanguage: 'English',
    pages: 246,
    coverImage: '/assets/stitch/c5226b913e.jpg',
    featured: true,
    rating: 4.8,
    citationCount: 15420,
    totalCopies: 3,
    tags: ['English', 'Experimental Philosophy', 'Early Microscopy'],
    collectionName: 'Rare Manuscripts & Codices',
    accessTier: 'Copperplate Foldouts',
    digitalFidelity: 'Early Microscopy',
    description:
      'Hooke\'s microscopic observations, including the first published use of the word "cell". The folding copperplates — the flea, the louse, the point of a needle — set a new standard for scientific engraving.',
  },
  {
    title: 'La Divina Commedia: Illustrated Folio',
    author: 'Dante Alighieri',
    authorDates: '1265–1321',
    publishedYear: 1481,
    publisher: 'Nicolaus Laurentii, Florence',
    category: 'literature-philology',
    shelfmark: 'FOL. 1481-DANT • Biblioteca Medicea Laurenziana',
    codexLanguage: 'Italian',
    pages: 402,
    coverImage: '/assets/stitch/1d3dbc66a1.jpg',
    featured: true,
    rating: 4.9,
    citationCount: 20510,
    totalCopies: 2,
    tags: ['Italian', 'Poetry', 'Incunabula'],
    collectionName: 'Core Humanist Canon',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1420 DPI Multispectral',
    description:
      'The Landino commentary edition of the Commedia, among the most ambitious illustrated incunabula of the Florentine press, issued with engraved opening plates for each cantica.',
  },
  {
    title: 'Codex Leicester: Studies on Hydrology & Celestial Movements',
    author: 'Leonardo da Vinci',
    authorDates: '1452–1519',
    publishedYear: 1510,
    publisher: 'Autograph manuscript, Florence',
    category: 'natural-sciences',
    shelfmark: 'MS. LEIC. 1510-VINCI • Leicester Codex',
    codexLanguage: 'Italian',
    pages: 72,
    coverImage: '/assets/stitch/678f6c395f.jpg',
    rating: 4.9,
    citationCount: 14230,
    totalCopies: 1,
    tags: ['Italian', 'Hydrology', 'Renaissance Science'],
    collectionName: 'Recently Digitized Acquisitions',
    accessTier: 'Reading Room Vault Only',
    digitalFidelity: 'Full IIIF Multispectral',
    description:
      'Leonardo\'s notebook on the motion of water, the luminosity of the moon and the fossil record, written in his characteristic mirror script. A single-copy holding available for supervised reading-room consultation only.',
  },
  {
    title: 'Dialogo Sopra i Due Massimi Sistemi del Mondo',
    author: 'Galileo Galilei',
    authorDates: '1564–1642',
    publishedYear: 1632,
    publisher: 'Giovanni Batista Landini, Florence',
    category: 'natural-sciences',
    shelfmark: 'FLO. 1632-GAL • Biblioteca Nazionale Centrale',
    codexLanguage: 'Italian',
    pages: 458,
    coverImage: '/assets/stitch/0c8bda6cf0.jpg',
    rating: 4.8,
    citationCount: 16780,
    totalCopies: 2,
    tags: ['Italian', 'Copernicanism', 'Astronomy'],
    collectionName: 'Recently Digitized Acquisitions',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1200 DPI Multispectral',
    description:
      'The dialogue that brought Galileo before the Inquisition. Salviati, Sagredo and Simplicio weigh the Ptolemaic and Copernican systems across four days of conversation in the vernacular.',
  },
  {
    title: 'Anatomia Universale: Complete Hand-Coloured Folios',
    author: 'Paolo Mascagni',
    authorDates: '1755–1815',
    publishedYear: 1833,
    publisher: 'Batelli & Co., Florence',
    category: 'natural-sciences',
    shelfmark: 'ATL. 1833-MASC • Accademia dei Fisiocritici',
    codexLanguage: 'Italian',
    pages: 84,
    coverImage: '/assets/stitch/c648c100d7.jpg',
    rating: 4.7,
    citationCount: 6420,
    totalCopies: 2,
    tags: ['Italian', 'Anatomy', 'Coloured Plates'],
    collectionName: 'Recently Digitized Acquisitions',
    accessTier: 'Full Color Plates',
    digitalFidelity: '1400 DPI Colour',
    description:
      'Mascagni\'s monumental lymphatic plates, issued posthumously in elephant folio. Each plate is hand-coloured and keyed to the accompanying Latin and Italian letterpress.',
  },
  {
    title: 'Summa Theologiae: Prima Pars',
    author: 'Thomas Aquinas',
    authorDates: '1225–1274',
    publishedYear: 1485,
    publisher: 'Anton Koberger, Nuremberg',
    category: 'philosophy',
    shelfmark: 'THEOL. 1485-AQUIN • Vatican Apostolic Archive',
    codexLanguage: 'Latin',
    pages: 612,
    coverImage: '/assets/stitch/db809a7cc1.jpg',
    rating: 4.7,
    citationCount: 18990,
    totalCopies: 3,
    tags: ['Latin', 'Scholasticism', 'Theology'],
    collectionName: 'Philosophy & Scholasticism',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1000 DPI Multispectral',
    description:
      'Koberger\'s handsome incunable edition of the Prima Pars, rubricated throughout and preserving the scholastic apparatus in its original layout of objections, sed contra and respondeo.',
  },
  {
    title: 'Meditationes de Prima Philosophia',
    author: 'René Descartes',
    authorDates: '1596–1650',
    publishedYear: 1641,
    publisher: 'Michael Soly, Paris',
    category: 'philosophy',
    shelfmark: 'PAR. 1641-DESC • Sorbonne Collections',
    codexLanguage: 'Latin',
    pages: 118,
    coverImage: '/assets/stitch/e6e5a261bb.jpg',
    rating: 4.8,
    citationCount: 17540,
    totalCopies: 3,
    tags: ['Latin', 'Rationalism', 'Metaphysics'],
    collectionName: 'Philosophy & Scholasticism',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1200 DPI Multispectral',
    description:
      'The Latin Meditations with the Objections and Replies, the collaborative apparatus through which the new philosophy was first contested in print.',
  },
  {
    title: 'Critique of Pure Reason',
    author: 'Immanuel Kant',
    authorDates: '1724–1804',
    publishedYear: 1781,
    publisher: 'Johann Friedrich Hartknoch, Riga',
    category: 'philosophy',
    shelfmark: 'RIG. 1781-KANT • Königsberg Archive',
    codexLanguage: 'German',
    pages: 856,
    coverImage: '/assets/stitch/3328abae84.jpg',
    rating: 4.6,
    citationCount: 24310,
    totalCopies: 4,
    tags: ['German', 'Epistemology', 'Idealism'],
    collectionName: 'Philosophy & Scholasticism',
    accessTier: 'Open Access',
    digitalFidelity: '1000 DPI' ,
    description:
      'First edition of the Kritik der reinen Vernunft, the work that reframed epistemology by asking what the mind contributes to experience. Bound with the original German title page and errata leaf.',
  },
  {
    title: 'Corpus Juris Civilis: Digestorum Libri',
    author: 'Justinian I',
    authorDates: '482–565',
    publishedYear: 1583,
    publisher: 'Hugues de la Porte, Lyon',
    category: 'law',
    shelfmark: 'DIG. 1583-JUST • Bodleian Law Library',
    codexLanguage: 'Latin',
    pages: 1180,
    coverImage: '/assets/stitch/fbc203e351.jpg',
    rating: 4.5,
    citationCount: 8760,
    totalCopies: 2,
    tags: ['Latin', 'Roman Law', 'Jurisprudence'],
    collectionName: 'Law, Treatises & Jurisprudence',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1000 DPI',
    description:
      'The Digest in a Lyon folio edition with the Accursian gloss, the foundational text of the civil-law tradition read in European faculties for centuries.',
  },
  {
    title: 'Codex Sinaiticus: Facsimile Edition',
    author: 'Anonymous Scribes',
    authorDates: '4th century',
    publishedYear: 1844,
    publisher: 'British Library Facsimile Press, London',
    category: 'history-archaeology',
    shelfmark: 'MS. SIN. 340-SINAI • St Catherine’s Monastery',
    codexLanguage: 'Greek',
    pages: 346,
    coverImage: '/assets/stitch/91e21a0f06.jpg',
    rating: 4.9,
    citationCount: 13590,
    totalCopies: 2,
    tags: ['Greek', 'Biblical Studies', 'Palaeography'],
    collectionName: 'Rare Manuscripts & Codices',
    accessTier: 'Open Access IIIF',
    digitalFidelity: 'Full IIIF Multispectral',
    description:
      'A complete photographic facsimile of the fourth-century pandect, with the scribal corrections, quire signatures and the marginal apparatus that make it a primary witness for the history of the book.',
  },
  {
    title: 'The Canterbury Tales: Ellesmere Manuscript',
    author: 'Geoffrey Chaucer',
    authorDates: '1343–1400',
    publishedYear: 1400,
    publisher: 'Ellesmere Folio, London',
    category: 'literature-philology',
    shelfmark: 'MS. EL. 1400-CHAU • Huntington Library',
    codexLanguage: 'Middle English',
    pages: 232,
    coverImage: '/assets/stitch/7918eb0a17.jpg',
    rating: 4.9,
    citationCount: 12980,
    totalCopies: 2,
    tags: ['Middle English', 'Medieval Poetry', 'Illumination'],
    collectionName: 'Rare Manuscripts & Codices',
    accessTier: 'Reading Room Vault Only',
    digitalFidelity: '1200 DPI Multispectral',
    description:
      'The Ellesmere manuscript, the most finely illuminated witness to the Canterbury Tales, with its celebrated equestrian portrait of the pilgrims painted in the margins.',
  },
  {
    title: 'Graduale Romanum: Illuminated Antiphonal',
    author: 'Anonymous Cantors',
    authorDates: '13th century',
    publishedYear: 1250,
    publisher: 'Abbey of St Gall Scriptorium',
    category: 'musicology',
    shelfmark: 'MS. CANT. 1250-GALL • Abbey Library of St Gall',
    codexLanguage: 'Latin',
    pages: 310,
    coverImage: '/assets/stitch/2f45c3ccef.jpg',
    rating: 4.8,
    citationCount: 5420,
    totalCopies: 1,
    tags: ['Latin', 'Chant', 'Liturgics'],
    collectionName: 'Musicology & Liturgical Scores',
    accessTier: 'Reading Room Vault Only',
    digitalFidelity: '1200 DPI Multispectral',
    description:
      'An illuminated gradual with square neumes on a four-line staff, its historiated initials depicting the feasts of the liturgical year. Among the finest surviving witnesses to the St Gall notation tradition.',
  },
  {
    title: 'De Revolutionibus Orbium Coelestium',
    author: 'Nicolaus Copernicus',
    authorDates: '1473–1543',
    publishedYear: 1543,
    publisher: 'Johannes Petreius, Nuremberg',
    category: 'natural-sciences',
    shelfmark: 'NOR. 1543-COPE • Jagiellonian Library',
    codexLanguage: 'Latin',
    pages: 212,
    coverImage: '/assets/stitch/677b906d35.jpg',
    rating: 4.9,
    citationCount: 21870,
    totalCopies: 2,
    tags: ['Latin', 'Heliocentrism', 'Astronomy'],
    collectionName: 'Rare Manuscripts & Codices',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1200 DPI Multispectral',
    description:
      'The first edition of De Revolutionibus, retaining the famous anonymous preface by Andreas Osiander. The copy carries contemporary marginal notes correcting the heliocentric model.',
  },
  {
    title: 'The History of the Peloponnesian War',
    author: 'Thucydides',
    authorDates: 'c. 460–400 BC',
    publishedYear: 1502,
    publisher: 'Aldus Manutius, Venice',
    category: 'history-archaeology',
    shelfmark: 'ALD. 1502-THUC • Biblioteca Marciana',
    codexLanguage: 'Greek',
    pages: 292,
    coverImage: '/assets/stitch/a4a952e4e3.jpg',
    rating: 4.8,
    citationCount: 10240,
    totalCopies: 2,
    tags: ['Greek', 'Classical History', 'Aldine Press'],
    collectionName: 'Core Humanist Canon',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1000 DPI',
    description:
      'The princeps edition of Thucydides from the Aldine press, set in the celebrated Aldine Greek types cut by Francesco Griffo.',
  },
  {
    title: 'Principia Mathematica',
    author: 'Alfred North Whitehead & Bertrand Russell',
    authorDates: '1910–1913',
    publishedYear: 1910,
    publisher: 'Cambridge University Press',
    category: 'computer-science',
    shelfmark: 'CAM. 1910-WHIT • Cambridge Manuscript Registry',
    codexLanguage: 'English',
    pages: 666,
    coverImage: '/assets/stitch/7dfa83659a.jpg',
    rating: 4.7,
    citationCount: 16020,
    totalCopies: 3,
    tags: ['English', 'Logic', 'Foundations'],
    collectionName: 'Cross-Disciplinary Concordances',
    accessTier: 'Open Access',
    digitalFidelity: '600 DPI',
    description:
      'The first volume of Whitehead and Russell\'s attempt to derive mathematics from logic — the work whose notation and formal method underpin modern computational theory.',
  },
  {
    title: 'Traité Élémentaire de Chimie',
    author: 'Antoine Lavoisier',
    authorDates: '1743–1794',
    publishedYear: 1789,
    publisher: 'Cuchet, Paris',
    category: 'natural-sciences',
    shelfmark: 'PAR. 1789-LAVO • Académie des Sciences',
    codexLanguage: 'French',
    pages: 558,
    coverImage: '/assets/stitch/71316754d5.jpg',
    rating: 4.8,
    citationCount: 12480,
    totalCopies: 3,
    tags: ['French', 'Chemistry', 'Quantitative Method'],
    collectionName: 'Natural Sciences & Physical Inquiry',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1200 DPI',
    description:
      'Lavoisier\'s elementary treatise, with the thirteen folding plates drawn by Madame Lavoisier, presenting the balance-based method and the new nomenclature of chemistry.',
  },
  {
    title: 'Commentaria in Euclidis Elementa',
    author: 'Proclus',
    authorDates: '412–485',
    publishedYear: 1533,
    publisher: 'Simon Grynaeus, Basel',
    category: 'engineering',
    shelfmark: 'BAS. 1533-PROC • ETH Zurich Archive',
    codexLanguage: 'Greek',
    pages: 268,
    coverImage: '/assets/stitch/7b3a51ecd2.jpg',
    rating: 4.6,
    citationCount: 4980,
    totalCopies: 2,
    tags: ['Greek', 'Geometry', 'Applied Mathematics'],
    collectionName: 'Engineering & Applied Technology',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1000 DPI',
    description:
      'Proclus\'s commentary on the first book of Euclid, the principal ancient source on the philosophy of mathematics and the theory of geometrical demonstration.',
  },
  {
    title: 'De Architectura Libri Decem',
    author: 'Vitruvius',
    authorDates: 'c. 80–15 BC',
    publishedYear: 1521,
    publisher: 'Giovanni Tacuino, Verona',
    category: 'engineering',
    shelfmark: 'VER. 1521-VITR • Politecnico di Milano',
    codexLanguage: 'Latin',
    pages: 196,
    coverImage: '/assets/stitch/1f61c8d718.jpg',
    rating: 4.7,
    citationCount: 8930,
    totalCopies: 2,
    tags: ['Latin', 'Architecture', 'Engineering'],
    collectionName: 'Engineering & Applied Technology',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1200 DPI',
    description:
      'The illustrated Verona Vitruvius, the treaty on architecture, proportion and machine design that supplied the vocabulary of Western building for four hundred years.',
  },
  {
    title: 'An Inquiry into the Nature and Causes of the Wealth of Nations',
    author: 'Adam Smith',
    authorDates: '1723–1790',
    publishedYear: 1776,
    publisher: 'W. Strahan & T. Cadell, London',
    category: 'business-economics',
    shelfmark: 'LON. 1776-SMIT • Bodleian Economics Archive',
    codexLanguage: 'English',
    pages: 512,
    coverImage: '/assets/stitch/ad80b02ad9.jpg',
    rating: 4.7,
    citationCount: 21460,
    totalCopies: 4,
    tags: ['English', 'Political Economy', 'Commerce'],
    collectionName: 'Business, Commerce & Economics',
    accessTier: 'Open Access',
    digitalFidelity: '600 DPI',
    description:
      'First edition of the Wealth of Nations, bound in contemporary calf with the half-title present — the founding text of classical political economy.',
  },
  {
    title: 'Ethica Nicomachea',
    author: 'Aristotle',
    authorDates: '384–322 BC',
    publishedYear: 1497,
    publisher: 'Aldus Manutius, Venice',
    category: 'ethics-flourishing',
    shelfmark: 'ALD. 1497-ARIS • Corpus Christi College',
    codexLanguage: 'Greek',
    pages: 226,
    coverImage: '/assets/stitch/b419c8137b.jpg',
    rating: 4.9,
    citationCount: 19870,
    totalCopies: 3,
    tags: ['Greek', 'Virtue Ethics', 'Flourishing'],
    collectionName: 'Self-Development, Ethics & Human Flourishing',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1000 DPI',
    description:
      'The Aldine editio princeps of the Nicomachean Ethics, the founding inquiry into virtue, practical wisdom and human flourishing.',
  },
  {
    title: 'Il Decameron',
    author: 'Giovanni Boccaccio',
    authorDates: '1313–1375',
    publishedYear: 1470,
    publisher: 'Christophorus Valdarfer, Venice',
    category: 'fiction-narrative',
    shelfmark: 'VEN. 1470-BOCC • Biblioteca Medicea Laurenziana',
    codexLanguage: 'Italian',
    pages: 344,
    coverImage: '/assets/stitch/677b906d35.jpg',
    rating: 4.8,
    citationCount: 11420,
    totalCopies: 2,
    tags: ['Italian', 'Narrative', 'Plague Literature'],
    collectionName: 'Fiction, Narratives & Storycraft',
    accessTier: 'Open Access IIIF',
    digitalFidelity: '1200 DPI Multispectral',
    description:
      'The Valdarfer Decameron, among the earliest dated printings of Boccaccio\'s hundred tales told by ten young Florentines sheltering from the plague.',
  },
]

const USERS = [
  {
    firstName: 'Vivian',
    lastName: 'Sterling',
    email: 'v.sterling@athenaeum-fellows.edu',
    password: 'Athenaeum#2024',
    role: 'scholar',
    affiliation: 'Bodleian Libraries, University of Oxford',
    discipline: 'Medieval & Byzantine Manuscript Studies',
    membershipTier: 'Faculty Fellow',
  },
  {
    firstName: 'Ambrose',
    lastName: 'Whitlock',
    email: 'curator@athenaeum.edu',
    password: 'Athenaeum#2024',
    role: 'librarian',
    affiliation: 'Athenaeum Archive Board',
    discipline: 'Rare Books & Special Collections',
    membershipTier: 'Curator',
  },
  {
    firstName: 'Athenaeum',
    lastName: 'Administrator',
    email: 'admin@athenaeum.edu',
    password: 'Athenaeum#2024',
    role: 'admin',
    affiliation: 'Athenaeum Archive Board',
    discipline: 'Digital Preservation',
    membershipTier: 'Archivist',
  },
  {
    firstName: 'Julian',
    lastName: 'Vance',
    email: 'j.vance@bodleian.ox.ac.uk',
    password: 'Athenaeum#2024',
    role: 'scholar',
    affiliation: 'Collège de France',
    discipline: 'Early Modern Print & Incunabula',
    membershipTier: 'Charter Pass',
  },
  {
    firstName: 'Marisol',
    lastName: 'Kenner',
    email: 'm.kenner@sorbonne.fr',
    password: 'Athenaeum#2024',
    role: 'scholar',
    affiliation: 'Sorbonne Collections',
    discipline: 'Historical Cartography & Navigation',
    membershipTier: 'Charter Pass',
  },
  {
    firstName: 'Idris',
    lastName: 'Bayero',
    email: 'i.bayero@vatican-archive.org',
    password: 'Athenaeum#2024',
    role: 'scholar',
    affiliation: 'Vatican Apostolic Archive',
    discipline: 'Classical Papyrology & Epigraphy',
    membershipTier: 'Visiting Scholar',
  },
]

async function seed() {
  await connectDatabase()
  console.log(`[seed] connected to ${config.mongoUri}`)

  if (force) {
    await Promise.all([
      Book.deleteMany({}),
      Category.deleteMany({}),
      Loan.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      User.deleteMany({}),
    ])
    console.log('[seed] --force supplied: existing collections cleared')
  }

  if (ifEmpty) {
    const existing = await Book.countDocuments()
    if (existing > 0) {
      console.log(`[seed] catalogue already holds ${existing} titles — nothing to do (--if-empty)`)
      await disconnectDatabase()
      return
    }
    console.log('[seed] --if-empty supplied and the catalogue is empty — seeding')
  }

  // --- categories ---
  for (const [index, cat] of CATEGORIES.entries()) {
    await Category.findOneAndUpdate({ slug: cat.slug }, { ...cat, order: index }, { upsert: true, new: true })
  }
  const categories = await Category.find()
  const catBySlug = new Map(categories.map((c) => [c.slug, c]))
  console.log(`[seed] categories: ${categories.length}`)

  // --- users ---
  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email })
    if (existing) continue
    await User.create({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      affiliation: u.affiliation,
      discipline: u.discipline,
      membershipTier: u.membershipTier,
      passwordHash: await User.hashPassword(u.password),
    })
  }
  const users = await User.find()
  console.log(`[seed] users: ${users.length}`)

  // --- books ---
  for (const b of BOOKS) {
    const category = catBySlug.get(b.category)
    if (!category) throw new Error(`Unknown category slug in seed data: ${b.category}`)
    await Book.findOneAndUpdate(
      { shelfmark: b.shelfmark },
      { ...b, category: category._id, availableCopies: b.totalCopies },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }
  const books = await Book.find()
  console.log(`[seed] books: ${books.length}`)

  // --- circulation history ---
  const loanCount = await Loan.countDocuments()
  if (loanCount > 0 && !force) {
    console.log(`[seed] circulation already present (${loanCount} loans) — skipping loan generation`)
  } else {
    const byShelfmark = new Map(books.map((b) => [b.shelfmark, b]))
    const scholars = users.filter((u) => u.role === 'scholar')

    // Active loans: staggered due dates, including genuinely overdue items.
    const active = [
      { shelf: 'MS. BODL. 1687-NEWT • Cambridge & Bodleian', user: 0, due: -4 },
      { shelf: 'MS. LEIC. 1510-VINCI • Leicester Codex', user: 0, due: 9 },
      { shelf: 'FOL. 1481-DANT • Biblioteca Medicea Laurenziana', user: 1, due: 2 },
      { shelf: 'INC. 1543-VES • Basel & Paris Faculté', user: 2, due: 17 },
      { shelf: 'ALD. 1502-THUC • Biblioteca Marciana', user: 3, due: -11 },
      { shelf: 'MS. EL. 1400-CHAU • Huntington Library', user: 3, due: 5 },
      { shelf: 'RYS. 1665-HOOK • Royal Society Archives', user: 4, due: 14 },
      { shelf: 'CART. 1570-ORT • Royal Geographic Society', user: 4, due: 21 },
      { shelf: 'RIG. 1781-KANT • Königsberg Archive', user: 2, due: 3 },
    ]

    for (const item of active) {
      const book = byShelfmark.get(item.shelf)
      if (!book) continue
      const user = scholars[item.user % scholars.length]
      const borrowedAt = daysFromNow(item.due - config.loanPeriodDays)
      const existing = await Loan.findOne({ book: book._id, user: user._id, status: 'active' })
      if (existing) continue

      await Loan.create({
        book: book._id,
        user: user._id,
        borrowedAt,
        dueDate: daysFromNow(item.due),
        status: 'active',
      })
      await Book.updateOne({ _id: book._id, availableCopies: { $gt: 0 } }, { $inc: { availableCopies: -1 } })
      await InventoryTransaction.create({
        type: 'borrow',
        book: book._id,
        delta: 0,
        availableDelta: -1,
        totalBefore: book.totalCopies,
        totalAfter: book.totalCopies,
        availableBefore: book.availableCopies,
        availableAfter: book.availableCopies - 1,
        reason: `Borrowed by ${user.firstName} ${user.lastName}`,
        actor: user._id,
        createdAt: borrowedAt,
      })
    }

    // Returned history spread across the last ten months so the analytics trend has real shape.
    let historyIndex = 0
    for (let monthsAgo = 10; monthsAgo >= 0; monthsAgo -= 1) {
      const itemsThisMonth = 2 + (monthsAgo % 3)
      for (let i = 0; i < itemsThisMonth; i += 1) {
        const book = books[(historyIndex * 5) % books.length]
        const user = scholars[historyIndex % scholars.length]
        const borrowedAt = new Date(Date.now() - (monthsAgo * 30 + 12 + i) * DAY)
        const returnedAt = new Date(borrowedAt.getTime() + (7 + (i % 14)) * DAY)
        if (returnedAt.getTime() > Date.now()) continue

        await Loan.create({
          book: book._id,
          user: user._id,
          borrowedAt,
          dueDate: new Date(borrowedAt.getTime() + config.loanPeriodDays * DAY),
          returnedAt,
          status: 'returned',
        })
        await InventoryTransaction.create({
          type: 'return',
          book: book._id,
          delta: 0,
          availableDelta: 1,
          totalBefore: book.totalCopies,
          totalAfter: book.totalCopies,
          availableBefore: book.availableCopies,
          availableAfter: book.availableCopies + 1,
          reason: `Returned by ${user.firstName} ${user.lastName}`,
          actor: user._id,
          createdAt: returnedAt,
        })
        historyIndex += 1
      }
    }

    // Initial accession ledger entries for the whole catalogue.
    for (const book of books) {
      const exists = await InventoryTransaction.findOne({ book: book._id, type: 'acquire' })
      if (exists) continue
      await InventoryTransaction.create({
        type: 'acquire',
        book: book._id,
        delta: book.totalCopies,
        availableDelta: book.totalCopies,
        totalBefore: 0,
        totalAfter: book.totalCopies,
        availableBefore: 0,
        availableAfter: book.availableCopies,
        reason: 'Initial catalogue accession',
        actor: users.find((u) => u.role === 'librarian')?._id || null,
      })
    }
    console.log('[seed] circulation history generated')
  }

  // Keep the ledger's availability figures consistent with the Book documents.
  const [finalLoans, finalBooks] = await Promise.all([Loan.countDocuments(), Book.countDocuments()])
  const activeCount = await Loan.countDocuments({ status: 'active' })
  const overdue = await Loan.countDocuments({ status: 'active', dueDate: { $lt: new Date() } })
  console.log(`[seed] done — ${finalBooks} books, ${finalLoans} loans (${activeCount} active, ${overdue} overdue)`)
  console.log('[seed] sign in with v.sterling@athenaeum-fellows.edu / Athenaeum#2024 (scholar)')
  console.log('[seed] staff: curator@athenaeum.edu or admin@athenaeum.edu / Athenaeum#2024')

  await disconnectDatabase()
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err)
  await disconnectDatabase().catch(() => {})
  process.exit(1)
})
