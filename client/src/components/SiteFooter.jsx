import { Link } from 'react-router-dom'

const DEPARTMENT_LINKS = [
  { label: 'Incunabula & Early Print', to: '/catalog?search=incunabula' },
  { label: 'Byzantine Manuscripts', to: '/catalog?category=history-archaeology' },
  { label: 'Cartographic Studies', to: '/catalog?category=cartography' },
  { label: 'Philosophical Tracts', to: '/catalog?category=philosophy' },
  { label: 'Papyrology Collection', to: '/catalog?search=papyrology' },
]

const INDEX_LINKS = [
  { label: 'Universal Concordance', to: '/catalog' },
  { label: 'Author & Scribe Register', to: '/catalog?sort=title' },
  { label: 'Recently Digitised', to: '/catalog?sort=recent' },
  { label: 'Most Consulted', to: '/catalog?sort=popular' },
  { label: 'Academic Disciplines', to: '/categories' },
]

const ACCESS_LINKS = [
  { label: 'Circulation & Loans', to: '/circulation' },
  { label: 'Inventory Management', to: '/inventory' },
  { label: 'Curator Analytics', to: '/admin/analytics' },
  { label: 'Scholar Profile', to: '/profile' },
  { label: 'Request Credentials', to: '/register' },
]

function LinkColumn({ heading, links }) {
  return (
    <div>
      <h3 className="font-label-lg text-label-lg text-walnut-dark mb-space-md uppercase tracking-wider">{heading}</h3>
      <ul className="space-y-space-sm font-body-md text-body-md text-on-surface-variant">
        {links.map((l) => (
          <li key={l.label}>
            <Link className="hover:text-brass-muted transition-colors" to={l.to}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SiteFooter() {
  return (
    <footer className="w-full bg-cream-surface shadow-[0_-1px_8px_rgba(62,39,35,0.03)] mt-space-xl">
      <div className="max-w-[1440px] mx-auto px-margin py-space-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter mb-space-xl">
          <div className="lg:col-span-2 pr-space-lg">
            <div className="flex items-center gap-space-sm mb-space-md">
              <img alt="Athenaeum Library emblem" className="h-7 w-auto object-contain" src="/assets/athenaeum-mark.svg" />
              <span className="font-headline-sm text-headline-sm text-walnut-dark">Athenaeum Digital Repository</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md max-w-sm">
              Dedicated to the preservation, scholarly curation, and open dissemination of historical codices,
              illuminated leaves, and peer-reviewed humanist inquiries.
            </p>
            <div className="flex items-center gap-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted bg-parchment px-2.5 py-1 rounded">
                Est. MDCCCLXXXIV
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">• Folio Registry verified</span>
            </div>
          </div>

          <LinkColumn heading="Archive Departments" links={DEPARTMENT_LINKS} />
          <LinkColumn heading="Catalog & Indices" links={INDEX_LINKS} />
          <LinkColumn heading="Research & Access" links={ACCESS_LINKS} />
        </div>

        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md bg-parchment/40 px-space-lg py-space-md rounded-xl">
          <div className="flex items-center gap-space-md">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              © {new Date().getFullYear()} Athenaeum Academic Library & Archives Board. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-space-lg font-label-md text-label-md text-on-surface-variant">
            <Link className="hover:text-walnut-dark transition-colors" to="/categories">
              Academic Disciplines
            </Link>
            <Link className="hover:text-walnut-dark transition-colors" to="/catalog">
              Open Catalogue
            </Link>
            <Link className="hover:text-walnut-dark transition-colors" to="/register">
              Scholar Registration
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
