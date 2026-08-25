import { Link } from 'react-router-dom';
import sourceManifest from '@data/source-manifest.json';
import { APP_INFO, APP_VERSION } from '@/lib/app-info';

const features = [
  {
    icon: '\u{1F9E0}',
    title: 'Wizard-Driven',
    description:
      'Step through a guided wizard to describe your lab, select services, and configure constraints without writing JSON.',
  },
  {
    icon: '\u{1F310}',
    title: 'Azure & AWS',
    description:
      'Generate Azure Policy definitions or AWS IAM managed identity-based policies, each using the correct native model.',
  },
  {
    icon: '\u{1F50D}',
    title: 'Evidence-Traced',
    description:
      'Every generated statement traces back to official Skillable samples from the LearnOnDemandSystems/labauthor repository.',
  },
  {
    icon: '\u{1F6E1}',
    title: 'Security Review',
    description:
      'Automatic security analysis flags wildcard permissions, missing VM restrictions, and unsupported combinations.',
  },
  {
    icon: '\u{1F4CB}',
    title: 'Copy & Download',
    description:
      'Copy policy JSON to clipboard, download as a formatted file, or export the full project configuration for reuse.',
  },
  {
    icon: '\u{1F4DA}',
    title: 'Example Explorer',
    description:
      'Browse all official Skillable ACP samples with full JSON, structure notes, and applicability guidance.',
  },
];

export default function Home() {
  return (
    <div>
      <div className="hero">
        <div className="hero-eyebrow">{APP_INFO.organisation}</div>
        <h1>{APP_INFO.name}</h1>
        <p className="hero-tagline">{APP_INFO.tagline}</p>
        <p className="hero-description">
          Generate production-ready Access Control Policies for Microsoft Azure and Amazon Web
          Services without manually writing policy JSON. Every rule is traced to official Skillable
          samples.
        </p>
        <div className="hero-actions">
          <Link to="/new" className="btn btn-primary btn-lg">
            Start New Policy
          </Link>
          <Link to="/explorer" className="btn btn-secondary btn-lg">
            Browse Examples
          </Link>
        </div>
        <div className="hero-version">
          <span className="badge badge-version">{APP_VERSION}</span>
          <span className="text-muted text-xs">Build: {APP_INFO.buildLabel}</span>
        </div>
      </div>

      <div className="feature-grid">
        {features.map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-card-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">How It Works</div>
        <div className="form-grid-3">
          <div>
            <div className="badge badge-info mb-2">Step 1&ndash;4</div>
            <h3 className="font-semibold text-sm">Describe Your Lab</h3>
            <p className="text-sm text-muted mt-2">
              Enter project metadata, choose a cloud platform, define learning outcomes, and
              configure deployment behaviour.
            </p>
          </div>
          <div>
            <div className="badge badge-info mb-2">Step 5&ndash;7</div>
            <h3 className="font-semibold text-sm">Configure Constraints</h3>
            <p className="text-sm text-muted mt-2">
              Select regions, cloud services, and operations. Configure SKU restrictions, naming
              rules, and capacity limits.
            </p>
          </div>
          <div>
            <div className="badge badge-info mb-2">Step 8</div>
            <h3 className="font-semibold text-sm">Review & Generate</h3>
            <p className="text-sm text-muted mt-2">
              Review the generated policy with plain-English explanations, evidence tracing,
              security analysis, and download options.
            </p>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <div className="card-header">Evidence Source</div>
        <p className="text-sm text-secondary">
          This application uses the official{' '}
          <a href={sourceManifest.sourceRepository.url} target="_blank" rel="noopener noreferrer">
            LearnOnDemandSystems/labauthor
          </a>{' '}
          repository as its primary evidence source. {sourceManifest.azureExamplesImported} Azure
          examples and {sourceManifest.awsExamplesImported} AWS examples have been imported and
          normalised.
        </p>
        <div className="flex gap-3 mt-4">
          <span className="badge badge-success">
            {sourceManifest.totalExamplesImported} official samples
          </span>
          <span className="badge badge-neutral">
            Synced {sourceManifest.sourceRepository.syncDate}
          </span>
          <span className="badge badge-neutral">{sourceManifest.sourceRepository.commitSha}</span>
        </div>
      </div>
    </div>
  );
}
