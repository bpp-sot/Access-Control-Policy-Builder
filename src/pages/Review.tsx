import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { loadProject } from '@/lib/storage';
import { generatePolicy } from '@/lib/policy-generator';
import { copyToClipboard, downloadJson } from '@/lib/download';
import type { PolicyProject, GeneratedPolicy } from '@/types';
import sourceManifest from '@data/source-manifest.json';

export default function Review() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<PolicyProject | null>(null);
  const [policy, setPolicy] = useState<GeneratedPolicy | null>(null);
  const [copied, setCopied] = useState(false);
  const [showStatement, setShowStatement] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const loaded = loadProject(projectId);
    if (!loaded) {
      navigate('/projects');
      return;
    }
    setProject(loaded);
    try {
      setPolicy(generatePolicy(loaded.wizard));
    } catch {
      // If generation fails, navigate back
      navigate('/new');
    }
  }, [projectId, navigate]);

  if (!project || !policy) {
    return <div className="card">Loading...</div>;
  }

  const policyJsonStr = JSON.stringify(policy.policyJson, null, 2);
  const filename = `${project.wizard.project.projectName || 'policy'}-${policy.provider}.json`;

  const handleCopy = async () => {
    const success = await copyToClipboard(policyJsonStr);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadJson(filename, policyJsonStr);
  };

  const handleDownloadProject = () => {
    downloadJson(
      `${project.wizard.project.projectName || 'project'}.json`,
      JSON.stringify(project, null, 2),
    );
  };

  const handleSecurityReview = () => {
    navigate(`/security/${projectId}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title">Generated Policy Review</h2>
          <p className="section-subtitle">
            {project.wizard.project.projectName || 'Untitled'} &middot;{' '}
            {policy.provider === 'azure' ? 'Microsoft Azure' : 'Amazon Web Services'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/projects" className="btn btn-secondary btn-sm">
            Back to Projects
          </Link>
        </div>
      </div>

      {/* Warnings */}
      {policy.warnings.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">Warnings ({policy.warnings.length})</div>
          {policy.warnings.map((w, i) => (
            <div key={i} className="alert alert-warning">
              <span>{'\u{26A0}'}</span>
              <div>{w}</div>
            </div>
          ))}
        </div>
      )}

      {/* Security risks */}
      {policy.securityRisks.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">Security Risks ({policy.securityRisks.length})</div>
          {policy.securityRisks.map((r, i) => (
            <div key={i} className="alert alert-danger">
              <span>{'\u{26A0}'}</span>
              <div>{r}</div>
            </div>
          ))}
        </div>
      )}

      {/* Unsupported combinations */}
      {policy.unsupportedCombinations.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">Unsupported / Unverified Combinations</div>
          {policy.unsupportedCombinations.map((c, i) => (
            <div key={i} className="alert alert-info">
              <span>{'\u{2139}'}</span>
              <div>{c}</div>
            </div>
          ))}
        </div>
      )}

      {/* Custom additions (Professional Mode — Classification F) */}
      {policy.statements.some((s) => s.evidence.classification === 'F') && (
        <div className="card mb-4">
          <div className="card-header">
            Custom Additions (Professional Mode){' '}
            <span className="evidence-badge evidence-F">
              {policy.statements.filter((s) => s.evidence.classification === 'F').length} Class F
            </span>
          </div>
          <div className="alert alert-warning mb-3">
            <span>{'\u{26A0}'}</span>
            <div>
              The following fragments were supplied by the author and are <strong>not</strong>{' '}
              derived from official Skillable samples. They require manual review for correctness,
              least privilege, and Skillable compatibility before use.
            </div>
          </div>
          {policy.statements
            .filter((s) => s.evidence.classification === 'F')
            .map((stmt) => (
              <div
                key={stmt.id}
                className="mb-3"
                style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-sm">{stmt.description}</div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowStatement(showStatement === stmt.id ? null : stmt.id)}
                  >
                    {showStatement === stmt.id ? 'Hide' : 'Show'} JSON
                  </button>
                </div>
                <p className="text-sm text-secondary mb-2">{stmt.plainEnglish}</p>
                {stmt.warnings.map((w, i) => (
                  <div key={i} className="text-xs" style={{ color: 'var(--accent-warning)' }}>
                    {'\u{26A0}'} {w}
                  </div>
                ))}
                {showStatement === stmt.id && (
                  <div className="code-block mt-2">
                    <pre>{JSON.stringify(stmt.jsonFragment, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Policy JSON */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="card-header" style={{ marginBottom: 0 }}>
            Generated Policy JSON
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? '\u2713 Copied!' : 'Copy'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDownload}>
              Download JSON
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadProject}>
              Export Project
            </button>
          </div>
        </div>
        <div className="code-block">
          <pre>{policyJsonStr}</pre>
        </div>
      </div>

      {/* Plain English explanation */}
      <div className="card mb-4">
        <div className="card-header">Plain-English Explanation</div>
        <div className="flex-col gap-3">
          {policy.statements.map((stmt) => (
            <div
              key={stmt.id}
              className="mb-4"
              style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm">{stmt.description}</div>
                <span className={`evidence-badge evidence-${stmt.evidence.classification}`}>
                  Class {stmt.evidence.classification}
                </span>
              </div>
              <p className="text-sm text-secondary mb-2">{stmt.plainEnglish}</p>

              {stmt.warnings.length > 0 && (
                <div className="mb-2">
                  {stmt.warnings.map((w, i) => (
                    <div key={i} className="text-xs" style={{ color: 'var(--accent-warning)' }}>
                      {'\u{26A0}'} {w}
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowStatement(showStatement === stmt.id ? null : stmt.id)}
              >
                {showStatement === stmt.id ? 'Hide' : 'Show'} evidence & JSON
              </button>

              {showStatement === stmt.id && (
                <div className="mt-2">
                  <div className="text-xs text-muted mb-1">
                    <strong>Source:</strong> {stmt.evidence.sourceTitle}
                    {stmt.evidence.sourceUrl && (
                      <>
                        {' '}
                        &middot;{' '}
                        <a href={stmt.evidence.sourceUrl} target="_blank" rel="noopener noreferrer">
                          View source
                        </a>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-muted mb-1">
                    <strong>Rationale:</strong> {stmt.evidence.rationale}
                  </div>
                  <div className="text-xs text-muted mb-2">
                    <strong>Type:</strong> {stmt.evidence.copiedOrParameterised} &middot;{' '}
                    <strong>Confidence:</strong> {stmt.evidence.confidence}
                  </div>
                  <div className="code-block">
                    <pre>{JSON.stringify(stmt.jsonFragment, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Evidence summary */}
      <div className="card mb-4">
        <div className="card-header">Evidence Summary</div>
        <div className="form-grid-3">
          <div>
            <span className="evidence-badge evidence-A">
              Class A: {policy.evidenceSummary.classificationA}
            </span>
            <div className="text-xs text-muted mt-1">Official Skillable samples</div>
          </div>
          <div>
            <span className="evidence-badge evidence-E">
              Class E: {policy.evidenceSummary.classificationE}
            </span>
            <div className="text-xs text-muted mt-1">Application safety constraints</div>
          </div>
          <div>
            <span className="evidence-badge evidence-F">
              Class F: {policy.evidenceSummary.classificationF}
            </span>
            <div className="text-xs text-muted mt-1">User-supplied custom rules</div>
          </div>
          <div>
            <span className="evidence-badge evidence-G">
              Class G: {policy.evidenceSummary.classificationG}
            </span>
            <div className="text-xs text-muted mt-1">Unverified / manual review</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="btn btn-primary" onClick={handleSecurityReview}>
          Generate Security Review {'\u{1F6E1}'}
        </button>
        <Link to={`/new/${projectId}`} className="btn btn-secondary">
          Edit Configuration
        </Link>
      </div>

      <div className="text-xs text-muted mt-6">
        Source: {sourceManifest.sourceRepository.name} ({sourceManifest.sourceRepository.commitSha})
        &middot; Synced {sourceManifest.sourceRepository.syncDate}
      </div>
    </div>
  );
}
