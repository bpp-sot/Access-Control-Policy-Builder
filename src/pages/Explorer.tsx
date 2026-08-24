import { useState } from 'react';
import azurePatterns from '@data/azure-patterns.json';
import awsPatterns from '@data/aws-patterns.json';
import type { AzurePattern, AwsPattern } from '@/types';

const azureList = azurePatterns.patterns as AzurePattern[];
const awsList = awsPatterns.patterns as AwsPattern[];

export default function Explorer() {
  const [provider, setProvider] = useState<'azure' | 'aws'>('azure');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const patterns = provider === 'azure' ? azureList : awsList;
  const selected = patterns.find((p) => p.id === selectedId);

  return (
    <div>
      <h2 className="section-title">Official Example Explorer</h2>
      <p className="section-subtitle">
        Browse all {azureList.length + awsList.length} official Skillable Access Control Policy
        samples from the LearnOnDemandSystems/labauthor repository.
      </p>

      <div className="tab-bar">
        <button
          className={`tab ${provider === 'azure' ? 'active' : ''}`}
          onClick={() => {
            setProvider('azure');
            setSelectedId(null);
          }}
        >
          Azure ({azureList.length})
        </button>
        <button
          className={`tab ${provider === 'aws' ? 'active' : ''}`}
          onClick={() => {
            setProvider('aws');
            setSelectedId(null);
          }}
        >
          AWS ({awsList.length})
        </button>
      </div>

      <div className="form-grid-2">
        {/* List */}
        <div>
          <div className="checkbox-group">
            {patterns.map((p) => (
              <label
                key={p.id}
                className={`checkbox-item ${selectedId === p.id ? 'checked' : ''}`}
                onClick={() => setSelectedId(p.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="checkbox-item-content">
                  <div className="checkbox-item-title">{p.title}</div>
                  <div className="checkbox-item-desc">{p.purpose}</div>
                  <div className="flex gap-2 mt-2">
                    <span className="badge badge-neutral">{p.reusablePattern}</span>
                    {p.wildcardUse.length > 0 && (
                      <span className="badge badge-warning">Wildcards</span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div>
          {selected ? (
            <div className="card">
              <div className="card-header">{selected.title}</div>

              <div className="mb-4">
                <div className="text-sm font-semibold mb-1">Purpose</div>
                <p className="text-sm text-secondary">{selected.purpose}</p>
              </div>

              <div className="mb-4">
                <div className="text-sm font-semibold mb-1">Applicable When</div>
                <p className="text-sm text-secondary">{selected.applicableWhen}</p>
              </div>

              <div className="mb-4">
                <div className="text-sm font-semibold mb-1">Structure Notes</div>
                <p className="text-sm text-secondary">{selected.structureNotes}</p>
              </div>

              <div className="form-grid-2 mb-4">
                <div>
                  <div className="text-sm font-semibold mb-1">Resource Types</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.resourceTypesRepresented.map((rt) => (
                      <span key={rt} className="badge badge-neutral">
                        {rt}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">Services</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.servicesRepresented.map((s) => (
                      <span key={s} className="badge badge-info">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {selected.sizesOrSkusMentioned.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-1">SKUs / Sizes</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.sizesOrSkusMentioned.map((s) => (
                      <span key={s} className="badge badge-neutral">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.regionsOrLocationsMentioned.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-1">Regions / Locations</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.regionsOrLocationsMentioned.map((r) => (
                      <span key={r} className="badge badge-neutral">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">Policy JSON</div>
                <div className="code-block">
                  <pre>{JSON.stringify(selected.policyJson, null, 2)}</pre>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={selected.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  View on GitHub {'\u{1F517}'}
                </a>
                <span className="badge badge-success">
                  Evidence Class A &mdash; Official Skillable Sample
                </span>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">{'\u{1F4C4}'}</div>
                <p>Select an example from the list to view its details.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
