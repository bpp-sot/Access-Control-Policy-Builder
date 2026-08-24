import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { loadProject } from '@/lib/storage';
import { generatePolicy } from '@/lib/policy-generator';
import { generateSecurityReview, securityReviewToText } from '@/lib/security-review';
import { downloadText, copyToClipboard } from '@/lib/download';
import type { SecurityReview } from '@/types';

export default function SecurityReviewPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState<SecurityReview | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const project = loadProject(projectId);
    if (!project) {
      navigate('/projects');
      return;
    }
    try {
      const policy = generatePolicy(project.wizard);
      setReview(generateSecurityReview(project.wizard, policy));
    } catch {
      navigate('/new');
    }
  }, [projectId, navigate]);

  if (!review) {
    return <div className="card">Loading...</div>;
  }

  const reviewText = securityReviewToText(review);
  const filename = `security-review-${review.projectName.replace(/\s+/g, '-').toLowerCase()}.txt`;

  const handleCopy = async () => {
    const success = await copyToClipboard(reviewText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const severityClass = (s: string) => `severity-${s}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title">Security Review Summary</h2>
          <p className="section-subtitle">
            Suitable for submission to Skillable as part of the lab authoring process
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/review/${projectId}`} className="btn btn-secondary btn-sm">
            Back to Review
          </Link>
        </div>
      </div>

      {/* Overall risk */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted">Overall Risk Assessment</div>
            <div className={`text-2xl font-bold ${severityClass(review.overallRisk)}`}>
              {review.overallRisk.toUpperCase()}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? '\u2713 Copied!' : 'Copy Summary'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => downloadText(filename, reviewText)}
            >
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Summary text */}
      <div className="card mb-4">
        <div className="card-header">Review Summary</div>
        <div className="code-block">
          <pre>{review.summary}</pre>
        </div>
      </div>

      {/* Items */}
      <div className="card mb-4">
        <div className="card-header">Security Items ({review.items.length})</div>
        {review.items.length === 0 ? (
          <div className="alert alert-success">
            <span>{'\u2713'}</span>
            <div>
              No security issues identified. The policy follows official Skillable best practices.
            </div>
          </div>
        ) : (
          review.items.map((item, i) => (
            <div
              key={i}
              className="mb-3"
              style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}
            >
              <div className="flex items-center gap-3 mb-1">
                <span
                  className={`badge severity-${item.severity}`}
                  style={{ textTransform: 'uppercase' }}
                >
                  {item.severity}
                </span>
                <span className="font-semibold text-sm">{item.category}</span>
              </div>
              <p className="text-sm text-secondary mb-1">{item.description}</p>
              <p className="text-sm">
                <strong>Recommendation:</strong> {item.recommendation}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Project info */}
      <div className="card">
        <div className="card-header">Project Information</div>
        <table className="table">
          <tbody>
            <tr>
              <td className="font-semibold">Project Name</td>
              <td>{review.projectName}</td>
            </tr>
            <tr>
              <td className="font-semibold">Lab Profile Number</td>
              <td>{review.labProfileNumber}</td>
            </tr>
            <tr>
              <td className="font-semibold">Cloud Provider</td>
              <td>{review.provider === 'azure' ? 'Microsoft Azure' : 'Amazon Web Services'}</td>
            </tr>
            <tr>
              <td className="font-semibold">Generated</td>
              <td>{new Date(review.generatedAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td className="font-semibold">Source Version</td>
              <td>{review.sourceVersion}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
