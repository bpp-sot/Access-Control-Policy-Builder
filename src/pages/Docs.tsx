import sourceManifest from '@data/source-manifest.json';
import evidenceIndex from '@data/evidence-index.json';

const evidenceClassifications: Array<{ code: string; label: string; description: string }> = [
  {
    code: 'A',
    label: 'Official Skillable sample',
    description: 'From the LearnOnDemandSystems/labauthor repository.',
  },
  { code: 'B', label: 'Official Skillable documentation', description: 'From docs.skillable.com.' },
  {
    code: 'C',
    label: 'Native Microsoft Azure documentation',
    description: 'From docs.microsoft.com/azure.',
  },
  { code: 'D', label: 'Native AWS documentation', description: 'From docs.aws.amazon.com/IAM.' },
  {
    code: 'E',
    label: 'Application safety constraint',
    description: 'Added by this tool, not from Skillable.',
  },
  { code: 'F', label: 'User-supplied custom rule', description: 'Provided by the user.' },
  {
    code: 'G',
    label: 'Unverified or requires manual review',
    description: 'No official evidence available.',
  },
];

export default function Docs() {
  return (
    <div>
      <h2 className="section-title">Documentation & Methodology</h2>
      <p className="section-subtitle">
        How this application generates Access Control Policies and the evidence standards it
        follows.
      </p>

      <div className="card mb-4">
        <div className="card-header">Evidence Standard</div>
        <p className="text-sm text-secondary mb-4">
          Every generated policy rule is classified according to one of the following evidence
          classifications. The interface allows you to inspect why each statement was generated and
          trace it back to its source.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Label</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {evidenceClassifications.map((c) => (
              <tr key={c.code}>
                <td>
                  <span className={`evidence-badge evidence-${c.code}`}>Class {c.code}</span>
                </td>
                <td className="font-semibold">{c.label}</td>
                <td className="text-sm text-secondary">{c.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mb-4">
        <div className="card-header">Azure Policy Model</div>
        <p className="text-sm text-secondary mb-2">
          Skillable Azure ACPs use <strong>Azure Policy</strong> definitions. The recommended
          approach is a <strong>whitelist model</strong>: encase allowed resources in a
          &ldquo;not&rdquo; block with effect <strong>Deny</strong>, so anything not explicitly
          permitted is blocked.
        </p>
        <p className="text-sm text-secondary mb-2">
          Key best practices from official Skillable documentation:
        </p>
        <ul className="text-sm text-secondary" style={{ paddingLeft: '20px' }}>
          <li>
            Always use the <strong>Deny</strong> effect for lab environment policies.
          </li>
          <li>
            Limit VMs by <strong>SKU</strong>, <strong>Region</strong>, and <strong>Name</strong>{' '}
            for maximum security.
          </li>
          <li>
            VMs are the most abused resource (e.g. cryptocurrency mining) &mdash; restrict or block
            entirely.
          </li>
          <li>Use a whitelist model (not + deny) rather than a blacklist model.</li>
        </ul>
      </div>

      <div className="card mb-4">
        <div className="card-header">AWS IAM Policy Model</div>
        <p className="text-sm text-secondary mb-2">
          Skillable AWS ACPs use <strong>IAM managed identity-based policies</strong>. These are
          JSON policies with Version <code>2012-10-17</code> and Statement arrays containing Action,
          Effect, Resource, and optional Condition elements.
        </p>
        <p className="text-sm text-secondary mb-2">Key patterns from official Skillable samples:</p>
        <ul className="text-sm text-secondary" style={{ paddingLeft: '20px' }}>
          <li>
            Use <strong>Allow</strong> statements for permitted services, add <strong>Deny</strong>{' '}
            statements for exceptions.
          </li>
          <li>
            Restrict EC2 instance types using the <code>ec2:InstanceType</code> condition key with{' '}
            <code>StringNotEquals</code>.
          </li>
          <li>The model is allow-by-default: explicitly allow what is needed, deny what is not.</li>
          <li>
            Selecting EC2 with specific operations auto-includes the launch-wizard{' '}
            <code>Describe*</code> discovery actions (Classification D — native AWS documentation)
            so the console can list VPCs, subnets, AMIs, and instance types. Optional extras such as
            Elastic IPs, key-pair creation, and <code>CreateTags</code> remain opt-in.
          </li>
        </ul>
        <div className="alert alert-info mt-3">
          <span>{'\u{2139}'}</span>
          <div>
            <strong>AWS resource quantity controls (e.g. limiting a lab to one VM)</strong> are{' '}
            <strong>not expressible</strong> in IAM identity-based policies. IAM conditions control{' '}
            <em>which actions</em> and <em>which resource ARNs</em> are permitted, not{' '}
            <em>how many</em> resources may exist. To cap resource counts on AWS, use{' '}
            <strong>Service Control Policies (SCPs)</strong>, <strong>Service Quotas</strong>, or
            other organisational controls outside the scope of IAM identity-based policies. These
            must be configured at the AWS organisation or account level and are not generated by
            this tool.
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">Deployment Behaviour</div>
        <p className="text-sm text-secondary mb-2">
          The official Skillable documentation describes two deployment methods:
        </p>
        <div className="alert alert-info">
          <span>{'\u{2139}'}</span>
          <div>
            <strong>Method 1 (default):</strong> Resources deploy before the user enters the lab.
            The ACP is applied <em>after</em> deployment and does not impact it.
          </div>
        </div>
        <div className="alert alert-warning">
          <span>{'\u{26A0}'}</span>
          <div>
            <strong>Method 2 (background):</strong> Resources deploy in the background while the
            user can interact with the lab. The ACP is active <em>during</em> deployment, so the
            policy must permit template operations or deployment will fail.
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">Source Repository</div>
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
              <td className="font-semibold">Commit / Version</td>
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
              <td className="font-semibold">License</td>
              <td className="text-sm">{sourceManifest.sourceRepository.licenseNote}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card mb-4">
        <div className="card-header">Manual Mappings</div>
        <p className="text-sm text-secondary mb-2">
          The following manual mappings were made during normalisation. These are documented for
          transparency:
        </p>
        {sourceManifest.manualMappings.map((m, i) => (
          <div key={i} className="mb-2">
            <span className={`evidence-badge evidence-${m.evidenceClassification}`}>
              Class {m.evidenceClassification}
            </span>
            <p className="text-sm text-secondary mt-1">{m.description}</p>
            <p className="text-xs text-muted">{m.note}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          Evidence Index ({evidenceIndex.evidenceEntries.length} entries)
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Source</th>
                <th>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {evidenceIndex.evidenceEntries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className={`evidence-badge evidence-${e.classification}`}>
                      Class {e.classification}
                    </span>
                  </td>
                  <td className="text-sm">
                    {e.sourceTitle}
                    {e.sourceUrl && (
                      <div>
                        <a
                          href={e.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs"
                        >
                          View source
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="text-sm text-secondary">{e.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
