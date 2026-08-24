import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadAllProjects, deleteProject, importProjectFromJson, saveProject } from '@/lib/storage';
import type { PolicyProject } from '@/types';

export default function Projects() {
  const [projects, setProjects] = useState<PolicyProject[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const refresh = () => setProjects(loadAllProjects());

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete project "${name}"? This cannot be undone.`)) {
      deleteProject(id);
      refresh();
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const project = importProjectFromJson(reader.result as string);
        project.updatedAt = new Date().toISOString();
        saveProject(project);
        refresh();
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to import project.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title">Policy Projects</h2>
          <p className="section-subtitle">Saved and imported policy configurations</p>
        </div>
        <div className="flex gap-2">
          <label className="btn btn-secondary">
            Import JSON
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <Link to="/new" className="btn btn-primary">
            New Policy
          </Link>
        </div>
      </div>

      {importError && (
        <div className="alert alert-danger">
          <span>{'\u{26A0}'}</span>
          <div>{importError}</div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">{'\u{1F4C1}'}</div>
            <p>No saved projects yet.</p>
            <p className="text-sm mt-2">
              Create a new policy or import a project JSON file to get started.
            </p>
            <Link to="/new" className="btn btn-primary mt-4">
              Create New Policy
            </Link>
          </div>
        </div>
      ) : (
        <div className="project-list">
          {projects.map((p) => (
            <div key={p.id} className="project-item">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`badge ${p.wizard.provider === 'azure' ? 'badge-info' : 'badge-warning'}`}
                  >
                    {p.wizard.provider === 'azure'
                      ? 'Azure'
                      : p.wizard.provider === 'aws'
                        ? 'AWS'
                        : 'No provider'}
                  </span>
                  <span className="font-semibold">
                    {p.wizard.project.projectName || 'Untitled'}
                  </span>
                  {p.generatedPolicy && <span className="badge badge-success">Generated</span>}
                </div>
                <div className="text-sm text-muted mt-1">
                  {p.wizard.project.labProfileNumber || 'No lab number'} &middot;{' '}
                  {p.wizard.services.length} services &middot; Updated{' '}
                  {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                {p.generatedPolicy && (
                  <Link to={`/review/${p.id}`} className="btn btn-secondary btn-sm">
                    Review
                  </Link>
                )}
                <Link to={`/new/${p.id}`} className="btn btn-secondary btn-sm">
                  Edit
                </Link>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(p.id, p.wizard.project.projectName)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
