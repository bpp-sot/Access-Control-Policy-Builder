import { Routes, Route, NavLink, Link } from 'react-router-dom';
import { useTheme } from './lib/theme';
import Home from './pages/Home';
import NewPolicy from './pages/NewPolicy';
import Projects from './pages/Projects';
import Explorer from './pages/Explorer';
import Review from './pages/Review';
import SecurityReviewPage from './pages/SecurityReviewPage';
import Docs from './pages/Docs';
import About from './pages/About';
import sourceManifest from '@data/source-manifest.json';

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/new', label: 'New Policy' },
  { path: '/projects', label: 'Projects' },
  { path: '/explorer', label: 'Examples' },
  { path: '/docs', label: 'Docs' },
  { path: '/about', label: 'About' },
];

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-layout">
      <header className="app-header">
        <Link to="/" className="logo">
          <span className="logo-icon">AC</span>
          <span>Policy Builder</span>
        </Link>
        <nav className="app-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '\u{1F319}' : '\u{2600}'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<NewPolicy />} />
          <Route path="/new/:projectId" element={<NewPolicy />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/review/:projectId" element={<Review />} />
          <Route path="/security/:projectId" element={<SecurityReviewPage />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>
          Skillable Access Control Policy Builder &mdash; Source:{' '}
          <a href={sourceManifest.sourceRepository.url} target="_blank" rel="noopener noreferrer">
            {sourceManifest.sourceRepository.name}
          </a>{' '}
          ({sourceManifest.sourceRepository.commitSha}) &mdash; Synced{' '}
          {sourceManifest.sourceRepository.syncDate}
        </p>
      </footer>
    </div>
  );
}
