import sourceManifest from '@data/source-manifest.json';

export default function About() {
  return (
    <div>
      <h2 className="section-title">About</h2>
      <p className="section-subtitle">Source version, methodology, and attribution</p>

      <div className="card mb-4">
        <div className="card-header">Application</div>
        <p className="text-sm text-secondary mb-2">
          The <strong>Skillable Access Control Policy Builder</strong> is a client-side static web
          application that helps Skillable lab authors configure and generate Access Control
          Policies for Microsoft Azure and Amazon Web Services without manually writing policy JSON.
        </p>
        <p className="text-sm text-secondary">
          The application runs entirely in the browser. No server, database, authentication, or
          cloud credentials are required. All data is stored locally in the browser or exported as
          JSON files.
        </p>
      </div>

      <div className="card mb-4">
        <div className="card-header">Evidence Source</div>
        <table className="table">
          <tbody>
            <tr>
              <td className="font-semibold">Repository</td>
              <td>
                <a
                  href={sourceManifest.sourceRepository.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {sourceManifest.sourceRepository.name}
                </a>
              </td>
            </tr>
            <tr>
              <td className="font-semibold">Branch</td>
              <td>{sourceManifest.sourceRepository.branch}</td>
            </tr>
            <tr>
              <td className="font-semibold">Commit SHA</td>
              <td>{sourceManifest.sourceRepository.commitSha}</td>
            </tr>
            <tr>
              <td className="font-semibold">Sync Date</td>
              <td>{sourceManifest.sourceRepository.syncDate}</td>
            </tr>
            <tr>
              <td className="font-semibold">Azure Examples</td>
              <td>{sourceManifest.azureExamplesImported}</td>
            </tr>
            <tr>
              <td className="font-semibold">AWS Examples</td>
              <td>{sourceManifest.awsExamplesImported}</td>
            </tr>
            <tr>
              <td className="font-semibold">Total Examples</td>
              <td>{sourceManifest.totalExamplesImported}</td>
            </tr>
            <tr>
              <td className="font-semibold">Parsed Successfully</td>
              <td>{sourceManifest.filesParsedSuccessfully}</td>
            </tr>
            <tr>
              <td className="font-semibold">Failed to Parse</td>
              <td>{sourceManifest.filesFailedToParse.length || 'None'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card mb-4">
        <div className="card-header">Skillable Documentation References</div>
        <ul className="text-sm text-secondary" style={{ paddingLeft: '20px' }}>
          <li>
            <a
              href="https://docs.skillable.com/docs/acp-best-practices"
              target="_blank"
              rel="noopener noreferrer"
            >
              ACP Best Practices
            </a>
          </li>
          <li>
            <a
              href="https://docs.skillable.com/docs/cloud-security-standards"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloud Security Standards
            </a>
          </li>
          <li>
            <a
              href="https://docs.skillable.com/docs/cloud-fabric-explanation"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloud Fabric Explanation
            </a>
          </li>
        </ul>
      </div>

      <div className="card mb-4">
        <div className="card-header">Technology Stack</div>
        <ul className="text-sm text-secondary" style={{ paddingLeft: '20px' }}>
          <li>React + TypeScript + Vite</li>
          <li>React Router (HashRouter for GitHub Pages compatibility)</li>
          <li>Vitest + React Testing Library (unit tests)</li>
          <li>Playwright (end-to-end tests)</li>
          <li>ESLint + Prettier</li>
          <li>GitHub Actions (CI + GitHub Pages deployment)</li>
        </ul>
      </div>

      <div className="card mb-4">
        <div className="card-header">License & Attribution</div>
        <p className="text-sm text-secondary mb-2">{sourceManifest.sourceRepository.licenseNote}</p>
        <p className="text-sm text-secondary">
          This application preserves attribution to the LearnOnDemandSystems/labauthor repository.
          All official policy samples are sourced from that repository and their original paths and
          GitHub URLs are preserved in the evidence data.
        </p>
      </div>

      <div className="card">
        <div className="card-header">Privacy</div>
        <p className="text-sm text-secondary">
          This application does not collect, transmit, or store any personal data. All project data
          is stored locally in your browser. No analytics, tracking, or telemetry is included. The
          application never stores secrets, credentials, passwords, access keys, or temporary access
          passes.
        </p>
      </div>
    </div>
  );
}
