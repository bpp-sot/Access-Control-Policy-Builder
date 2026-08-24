import { useState } from 'react';
import { useWizard } from '@/lib/wizard-context';
import { detectSecrets } from '@/lib/secret-detector';
import type { LearningOutcome, LearnerTask, ServiceSelection } from '@/types';
import serviceCatalogue from '@data/service-catalogue.json';
import regionsSkus from '@data/regions-skus.json';
import type { ServiceCatalogueEntry, OperationDef } from '@/types';

const azureServices = serviceCatalogue.azureServices as ServiceCatalogueEntry[];
const awsServices = serviceCatalogue.awsServices as ServiceCatalogueEntry[];
const operations = serviceCatalogue.operations as OperationDef[];
const azureLocations = regionsSkus.azureLocations as Array<{ value: string; label: string }>;
const awsRegions = regionsSkus.awsRegions as Array<{ value: string; label: string }>;
const azureVmSkus = regionsSkus.azureVmSkus as Array<{ value: string; label: string }>;
const awsInstanceTypes = regionsSkus.awsInstanceTypes as Array<{ value: string; label: string }>;

// ─── Step 1: Project ─────────────────────────────────────────────────────

export function Step1Project() {
  const { wizard, setWizard } = useWizard();
  const p = wizard.project;

  const update = (field: keyof typeof p, value: string) => {
    const detection = detectSecrets(value);
    if (detection.detected) {
      alert(detection.warnings.join('\n'));
      return;
    }
    setWizard((prev) => ({
      ...prev,
      project: { ...prev.project, [field]: value },
    }));
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">Policy Project Details</div>
        <p className="text-sm text-secondary mb-4">
          Enter the metadata for your lab project. This information is included in the security
          review summary and helps identify the policy.
        </p>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">
              Project Name <span className="required">*</span>
            </label>
            <input
              className="form-input"
              value={p.projectName}
              onChange={(e) => update('projectName', e.target.value)}
              placeholder="e.g. Azure VM Lab Policy"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Lab Profile Name</label>
            <input
              className="form-input"
              value={p.labProfileName}
              onChange={(e) => update('labProfileName', e.target.value)}
              placeholder="e.g. Deploying Virtual Machines in Azure"
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Lab Profile Number</label>
            <input
              className="form-input"
              value={p.labProfileNumber}
              onChange={(e) => update('labProfileNumber', e.target.value)}
              placeholder="e.g. CLD-AZR-SBX-001"
            />
            <div className="form-hint">Example format: CLD-AZR-SBX-001 or CLD-AWS-SBX-001</div>
          </div>
          <div className="form-group">
            <label className="form-label">Author</label>
            <input
              className="form-input"
              value={p.author}
              onChange={(e) => update('author', e.target.value)}
              placeholder="Your name"
            />
          </div>
        </div>

        <div className="form-grid-3">
          <div className="form-group">
            <label className="form-label">Version</label>
            <input
              className="form-input"
              value={p.version}
              onChange={(e) => update('version', e.target.value)}
              placeholder="1.0.0"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Programme</label>
            <input
              className="form-input"
              value={p.programme}
              onChange={(e) => update('programme', e.target.value)}
              placeholder="e.g. Cloud Administration"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Module</label>
            <input
              className="form-input"
              value={p.module}
              onChange={(e) => update('module', e.target.value)}
              placeholder="e.g. Module 3"
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Intended Audience</label>
            <input
              className="form-input"
              value={p.intendedAudience}
              onChange={(e) => update('intendedAudience', e.target.value)}
              placeholder="e.g. Beginner IT students"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Lab Duration (minutes)</label>
            <input
              className="form-input"
              type="number"
              value={p.labDuration}
              onChange={(e) => update('labDuration', e.target.value)}
              placeholder="60"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            value={p.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Brief description of the lab and its purpose..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={p.status}
            onChange={(e) => update('status', e.target.value)}
          >
            <option value="development">Development</option>
            <option value="production">Production</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Cloud Platform ──────────────────────────────────────────────

export function Step2Platform() {
  const { wizard, setWizard } = useWizard();

  return (
    <div>
      <div className="card">
        <div className="card-header">Select Cloud Platform</div>
        <p className="text-sm text-secondary mb-4">
          Skillable Access Control Policies use different native policy models depending on the
          cloud provider. The two models are structurally different and cannot be directly
          converted.
        </p>

        <div className="alert alert-info">
          <span>{'\u{2139}'}</span>
          <div>
            <strong>Azure</strong> ACPs use <strong>Azure Policy</strong> definitions (deny-based
            whitelist model).
            <br />
            <strong>AWS</strong> ACPs use <strong>IAM managed identity-based policies</strong>{' '}
            (allow-based model with optional deny exceptions).
          </div>
        </div>

        <div className="form-grid-2 mt-4">
          <label
            className={`checkbox-item ${wizard.provider === 'azure' ? 'checked' : ''}`}
            style={{ minHeight: '100px', alignItems: 'center' }}
          >
            <input
              type="radio"
              name="provider"
              checked={wizard.provider === 'azure'}
              onChange={() => setWizard((prev) => ({ ...prev, provider: 'azure' }))}
            />
            <div className="checkbox-item-content">
              <div className="checkbox-item-title" style={{ fontSize: '1rem' }}>
                Microsoft Azure
              </div>
              <div className="checkbox-item-desc">
                Azure Policy definitions with deny-based whitelist model. Best practice: encase
                allowed resources in a &ldquo;not&rdquo; block with &ldquo;Deny&rdquo; effect.
              </div>
            </div>
          </label>

          <label
            className={`checkbox-item ${wizard.provider === 'aws' ? 'checked' : ''}`}
            style={{ minHeight: '100px', alignItems: 'center' }}
          >
            <input
              type="radio"
              name="provider"
              checked={wizard.provider === 'aws'}
              onChange={() => setWizard((prev) => ({ ...prev, provider: 'aws' }))}
            />
            <div className="checkbox-item-content">
              <div className="checkbox-item-title" style={{ fontSize: '1rem' }}>
                Amazon Web Services
              </div>
              <div className="checkbox-item-desc">
                IAM managed identity-based policies with allow-based model. Allow permitted actions,
                add Deny statements for exceptions.
              </div>
            </div>
          </label>
        </div>

        <div className="alert alert-warning mt-4">
          <span>{'\u{26A0}'}</span>
          <div>
            One-to-one conversion between Azure and AWS policies is <strong>not supported</strong>.
            The policy models are fundamentally different. Choose the correct platform for your lab.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Learning Purpose ────────────────────────────────────────────

export function Step3Purpose() {
  const { wizard, setWizard } = useWizard();
  const [newOutcome, setNewOutcome] = useState('');
  const [newTask, setNewTask] = useState('');

  const addOutcome = () => {
    if (!newOutcome.trim()) return;
    const outcome: LearningOutcome = { id: `o-${Date.now()}`, outcome: newOutcome.trim() };
    setWizard((prev) => ({
      ...prev,
      purpose: { ...prev.purpose, outcomes: [...prev.purpose.outcomes, outcome] },
    }));
    setNewOutcome('');
  };

  const removeOutcome = (id: string) => {
    setWizard((prev) => ({
      ...prev,
      purpose: { ...prev.purpose, outcomes: prev.purpose.outcomes.filter((o) => o.id !== id) },
    }));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const task: LearnerTask = { id: `t-${Date.now()}`, task: newTask.trim() };
    setWizard((prev) => ({
      ...prev,
      purpose: { ...prev.purpose, tasks: [...prev.purpose.tasks, task] },
    }));
    setNewTask('');
  };

  const removeTask = (id: string) => {
    setWizard((prev) => ({
      ...prev,
      purpose: { ...prev.purpose, tasks: prev.purpose.tasks.filter((t) => t.id !== id) },
    }));
  };

  const updateField = (field: keyof typeof wizard.purpose, value: string) => {
    const detection = detectSecrets(value);
    if (detection.detected) {
      alert(detection.warnings.join('\n'));
      return;
    }
    setWizard((prev) => ({
      ...prev,
      purpose: { ...prev.purpose, [field]: value },
    }));
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="card-header">Learning Outcomes</div>
        <p className="text-sm text-secondary mb-4">
          Define what the learner should be able to do after completing the lab. Each requested
          permission should map to at least one learning outcome or task.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            className="form-input"
            value={newOutcome}
            onChange={(e) => setNewOutcome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOutcome())}
            placeholder="e.g. Deploy a virtual machine in Azure"
          />
          <button className="btn btn-primary" onClick={addOutcome}>
            Add
          </button>
        </div>

        {wizard.purpose.outcomes.length > 0 ? (
          <div className="checkbox-group">
            {wizard.purpose.outcomes.map((o) => (
              <div key={o.id} className="checkbox-item">
                <div className="checkbox-item-content">
                  <div className="checkbox-item-title">{o.outcome}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => removeOutcome(o.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No outcomes added yet.</p>
        )}
      </div>

      <div className="card mb-4">
        <div className="card-header">Learner Tasks</div>
        <p className="text-sm text-secondary mb-4">
          List the specific tasks the learner will perform. These help determine which permissions
          are required.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            className="form-input"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
            placeholder="e.g. Create a storage account and upload a file"
          />
          <button className="btn btn-primary" onClick={addTask}>
            Add
          </button>
        </div>

        {wizard.purpose.tasks.length > 0 ? (
          <div className="checkbox-group">
            {wizard.purpose.tasks.map((t) => (
              <div key={t.id} className="checkbox-item">
                <div className="checkbox-item-content">
                  <div className="checkbox-item-title">{t.task}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => removeTask(t.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No tasks added yet.</p>
        )}
      </div>

      <div className="card">
        <div className="card-header">Resource Requirements</div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Supporting Resources</label>
            <textarea
              className="form-textarea"
              value={wizard.purpose.supportingResources}
              onChange={(e) => updateField('supportingResources', e.target.value)}
              placeholder="Documentation, sample files, or other resources the learner needs..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Resources Created by Learner</label>
            <textarea
              className="form-textarea"
              value={wizard.purpose.resourcesCreatedByLearner}
              onChange={(e) => updateField('resourcesCreatedByLearner', e.target.value)}
              placeholder="Resources the learner will create during the lab..."
            />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Resources Pre-Deployed</label>
            <textarea
              className="form-textarea"
              value={wizard.purpose.resourcesPreDeployed}
              onChange={(e) => updateField('resourcesPreDeployed', e.target.value)}
              placeholder="Resources deployed before the learner enters the lab..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Resources Modified by Learner</label>
            <textarea
              className="form-textarea"
              value={wizard.purpose.resourcesModifiedByLearner}
              onChange={(e) => updateField('resourcesModifiedByLearner', e.target.value)}
              placeholder="Existing resources the learner will modify..."
            />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Read-Only Resources</label>
            <textarea
              className="form-textarea"
              value={wizard.purpose.resourcesReadOnly}
              onChange={(e) => updateField('resourcesReadOnly', e.target.value)}
              placeholder="Resources the learner can view but not modify..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Resources to Delete</label>
            <textarea
              className="form-textarea"
              value={wizard.purpose.resourcesMustBeDeleted}
              onChange={(e) => updateField('resourcesMustBeDeleted', e.target.value)}
              placeholder="Resources the learner must delete as part of the lab..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Deployment Behaviour ────────────────────────────────────────

export function Step4Deployment() {
  const { wizard, setWizard } = useWizard();
  const d = wizard.deployment;

  const update = <K extends keyof typeof d>(field: K, value: (typeof d)[K]) => {
    setWizard((prev) => ({ ...prev, deployment: { ...prev.deployment, [field]: value } }));
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">Deployment Behaviour</div>
        <p className="text-sm text-secondary mb-4">
          Configure how resources are deployed in the lab. This affects whether the Access Control
          Policy is active during deployment.
        </p>

        <div className="alert alert-info">
          <span>{'\u{2139}'}</span>
          <div>
            <strong>Pre-entry deployment</strong> (default): The ACP is applied <em>after</em> all
            resources are deployed. The policy does not impact deployment.
            <br />
            <strong>Background deployment</strong>: The ACP is active <em>during</em> deployment.
            The policy must permit template operations or deployment will fail.
          </div>
        </div>

        <div className="form-group mt-4">
          <label className="form-label">Deployment Method</label>
          <select
            className="form-select"
            value={d.method}
            onChange={(e) => update('method', e.target.value as typeof d.method)}
          >
            <option value="none">No resource template</option>
            <option value="pre-entry">Resources deployed before learner entry (default)</option>
            <option value="background">
              Resources deployed in background (ACP active during deployment)
            </option>
            <option value="arm-template">ARM template</option>
            <option value="bicep">Bicep compiled to ARM</option>
            <option value="cloudformation">CloudFormation stack</option>
            <option value="other">Other deployment method</option>
          </select>
        </div>

        {d.method === 'background' && (
          <div className="alert alert-danger">
            <span>{'\u{26A0}'}</span>
            <div>
              <strong>Background deployment warning:</strong> The ACP will be active while resources
              are deploying. You must ensure the policy permits all operations performed by the
              resource template, or deployment will fail. Consider adding exceptions for
              template-deployed resources.
            </div>
          </div>
        )}

        <div className="form-grid-3 mt-4">
          <label className={`checkbox-item ${d.lifecycleActions ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={d.lifecycleActions}
              onChange={(e) => update('lifecycleActions', e.target.checked)}
            />
            <div className="checkbox-item-content">
              <div className="checkbox-item-title">Lifecycle Actions</div>
              <div className="checkbox-item-desc">Start/stop/restart operations</div>
            </div>
          </label>
          <label className={`checkbox-item ${d.validationScripts ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={d.validationScripts}
              onChange={(e) => update('validationScripts', e.target.checked)}
            />
            <div className="checkbox-item-content">
              <div className="checkbox-item-title">Validation Scripts</div>
              <div className="checkbox-item-desc">Scripts that validate lab state</div>
            </div>
          </label>
          <label className={`checkbox-item ${d.cleanupScripts ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={d.cleanupScripts}
              onChange={(e) => update('cleanupScripts', e.target.checked)}
            />
            <div className="checkbox-item-content">
              <div className="checkbox-item-title">Cleanup Scripts</div>
              <div className="checkbox-item-desc">Scripts that clean up after the lab</div>
            </div>
          </label>
        </div>

        <div className="form-grid-2 mt-4">
          <div className="form-group">
            <label className="form-label">Behaviour on Deployment Failure</label>
            <textarea
              className="form-textarea"
              value={d.deploymentFailureBehaviour}
              onChange={(e) => update('deploymentFailureBehaviour', e.target.value)}
              placeholder="What happens if deployment fails?"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Lab Save</label>
            <select
              className="form-select"
              value={d.labSaveEnabled ? 'enabled' : 'disabled'}
              onChange={(e) => update('labSaveEnabled', e.target.value === 'enabled')}
            >
              <option value="enabled">Lab save enabled</option>
              <option value="disabled">Lab save disabled</option>
            </select>
            <div className="form-hint">Whether learners can save and resume the lab later.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Region ──────────────────────────────────────────────────────

export function Step5Region() {
  const { wizard, setWizard } = useWizard();
  const isAzure = wizard.provider === 'azure';
  const locations = isAzure ? azureLocations : awsRegions;
  const locationLabel = isAzure ? 'Azure Locations' : 'AWS Regions';
  const globalLabel = isAzure ? 'global resource types' : 'global services';

  const toggleLocation = (value: string) => {
    setWizard((prev) => {
      const current = prev.region.approvedLocations;
      const updated = current.includes(value)
        ? current.filter((l) => l !== value)
        : [...current, value];
      return {
        ...prev,
        region: {
          ...prev.region,
          approvedLocations: updated,
          primaryLocation: updated.length === 1 ? updated[0] : prev.region.primaryLocation,
        },
      };
    });
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">{locationLabel}</div>
        <p className="text-sm text-secondary mb-4">
          {isAzure
            ? 'Select the Azure locations where resources can be deployed. The policy will deny resource creation in any other region.'
            : 'Select the AWS regions where resources can be deployed. Note: AWS IAM policies do not have a direct equivalent to Azure Policy location restrictions — region control is typically handled at the VPC/SCP level.'}
        </p>

        {!isAzure && (
          <div className="alert alert-warning">
            <span>{'\u{26A0}'}</span>
            <div>
              AWS IAM identity-based policies do not natively restrict regions in the same way Azure
              Policy does. Region selection here is recorded for the security review but may require
              manual implementation via Service Control Policies (SCPs) or VPC-level controls.
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Approved {isAzure ? 'Locations' : 'Regions'}</label>
          <div className="checkbox-group" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {locations.map((loc) => (
              <label
                key={loc.value}
                className={`checkbox-item ${wizard.region.approvedLocations.includes(loc.value) ? 'checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={wizard.region.approvedLocations.includes(loc.value)}
                  onChange={() => toggleLocation(loc.value)}
                />
                <div className="checkbox-item-content">
                  <div className="checkbox-item-title">{loc.label}</div>
                  <div className="checkbox-item-desc">{loc.value}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="form-grid-2 mt-4">
          <div className="form-group">
            <label className="form-label">Primary {isAzure ? 'Location' : 'Region'}</label>
            <select
              className="form-select"
              value={wizard.region.primaryLocation}
              onChange={(e) =>
                setWizard((prev) => ({
                  ...prev,
                  region: { ...prev.region, primaryLocation: e.target.value },
                }))
              }
            >
              <option value="">Select primary {isAzure ? 'location' : 'region'}...</option>
              {wizard.region.approvedLocations.map((loc) => {
                const found = locations.find((l) => l.value === loc);
                return (
                  <option key={loc} value={loc}>
                    {found?.label ?? loc}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{globalLabel}</label>
            <label
              className={`checkbox-item ${wizard.region.globalResourcesRequired ? 'checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={wizard.region.globalResourcesRequired}
                onChange={(e) =>
                  setWizard((prev) => ({
                    ...prev,
                    region: { ...prev.region, globalResourcesRequired: e.target.checked },
                  }))
                }
              />
              <div className="checkbox-item-content">
                <div className="checkbox-item-title">Require {globalLabel}</div>
                <div className="checkbox-item-desc">
                  {isAzure
                    ? 'Allow "global" location for global resource types'
                    : 'Allow global services like IAM'}
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 6: Services ────────────────────────────────────────────────────

export function Step6Services() {
  const { wizard, setWizard } = useWizard();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const services = wizard.provider === 'azure' ? azureServices : awsServices;
  const categories = ['all', ...new Set(services.map((s) => s.category))];

  const filtered = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.resourceTypes.some((rt) => rt.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleService = (serviceId: string) => {
    setWizard((prev) => {
      const exists = prev.services.find((s) => s.serviceId === serviceId);
      if (exists) {
        return { ...prev, services: prev.services.filter((s) => s.serviceId !== serviceId) };
      }
      const newSel: ServiceSelection = {
        serviceId,
        operations: [],
        customResourceTypes: [],
        allowedSkus: [],
        allowedNames: [],
      };
      return { ...prev, services: [...prev.services, newSel] };
    });
  };

  const isSelected = (serviceId: string) => wizard.services.some((s) => s.serviceId === serviceId);

  return (
    <div>
      <div className="card">
        <div className="card-header">Select Cloud Services</div>
        <p className="text-sm text-secondary mb-4">
          Choose the cloud services required by your lab. Each service shows whether an official
          Skillable sample is available and its risk profile.
        </p>

        <div className="form-grid-2 mb-4">
          <input
            className="search-input"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </select>
        </div>

        <div className="checkbox-group">
          {filtered.map((svc) => {
            const selected = isSelected(svc.id);
            return (
              <label key={svc.id} className={`checkbox-item ${selected ? 'checked' : ''}`}>
                <input type="checkbox" checked={selected} onChange={() => toggleService(svc.id)} />
                <div className="checkbox-item-content">
                  <div className="flex items-center justify-between">
                    <div className="checkbox-item-title">{svc.name}</div>
                    <div className="flex gap-2">
                      <span
                        className={`badge ${svc.officialSampleAvailable ? 'badge-success' : 'badge-warning'}`}
                      >
                        {svc.officialSampleAvailable ? 'Sample' : 'No sample'}
                      </span>
                      <span className={`badge badge-neutral`}>{svc.riskCategory}</span>
                    </div>
                  </div>
                  <div className="checkbox-item-desc">{svc.notes}</div>
                  <div className="text-xs text-muted mt-2">
                    Cost: {svc.costSensitivity} | Identity: {svc.identitySensitivity} | Network:{' '}
                    {svc.networkExposureSensitivity}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">{'\u{1F50D}'}</div>
            <p>No services match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 7: Operations ──────────────────────────────────────────────────

export function Step7Operations() {
  const { wizard, setWizard } = useWizard();
  const services = wizard.provider === 'azure' ? azureServices : awsServices;
  const skus = wizard.provider === 'azure' ? azureVmSkus : awsInstanceTypes;
  const skuLabel = wizard.provider === 'azure' ? 'VM SKUs' : 'Instance Types';

  const selectedServices = wizard.services
    .map((sel) => ({
      sel,
      svc: services.find((s) => s.id === sel.serviceId),
    }))
    .filter((x) => x.svc);

  const toggleOperation = (serviceId: string, opId: string) => {
    setWizard((prev) => ({
      ...prev,
      services: prev.services.map((s) => {
        if (s.serviceId !== serviceId) return s;
        const ops = s.operations.includes(opId)
          ? s.operations.filter((o) => o !== opId)
          : [...s.operations, opId];
        return { ...s, operations: ops };
      }),
    }));
  };

  const toggleSku = (serviceId: string, sku: string) => {
    setWizard((prev) => ({
      ...prev,
      services: prev.services.map((s) => {
        if (s.serviceId !== serviceId) return s;
        const skusList = s.allowedSkus.includes(sku)
          ? s.allowedSkus.filter((x) => x !== sku)
          : [...s.allowedSkus, sku];
        return { ...s, allowedSkus: skusList };
      }),
    }));
  };

  const addName = (serviceId: string, name: string) => {
    if (!name.trim()) return;
    setWizard((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.serviceId === serviceId ? { ...s, allowedNames: [...s.allowedNames, name.trim()] } : s,
      ),
    }));
  };

  const removeName = (serviceId: string, name: string) => {
    setWizard((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.serviceId === serviceId
          ? { ...s, allowedNames: s.allowedNames.filter((n) => n !== name) }
          : s,
      ),
    }));
  };

  if (selectedServices.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">{'\u{1F4E6}'}</div>
          <p>No services selected. Go back to Step 6 to select services first.</p>
        </div>
      </div>
    );
  }

  const showSkus = (svcId: string) =>
    svcId === 'azure-compute-vm' || svcId === 'azure-compute-vmss' || svcId === 'aws-ec2';

  return (
    <div>
      {selectedServices.map(({ sel, svc }) => {
        if (!svc) return null;
        return (
          <div key={svc.id} className="card mb-4">
            <div className="card-header">
              {svc.name}
              {!svc.officialSampleAvailable && (
                <span className="badge badge-warning ml-2">No official sample</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Operations</label>
              <div className="form-grid-3">
                {operations.map((op) => (
                  <label
                    key={op.id}
                    className={`checkbox-item ${sel.operations.includes(op.id) ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={sel.operations.includes(op.id)}
                      onChange={() => toggleOperation(svc.id, op.id)}
                    />
                    <div className="checkbox-item-content">
                      <div className="checkbox-item-title">{op.label}</div>
                      <div className="checkbox-item-desc">{op.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {showSkus(svc.id) && (
              <div className="form-group">
                <label className="form-label">Allowed {skuLabel}</label>
                <div className="form-hint mb-2">
                  Restrict which {skuLabel.toLowerCase()} can be created. This is a Skillable best
                  practice to limit cost and abuse potential.
                </div>
                <div className="checkbox-group">
                  {skus.map((sku) => (
                    <label
                      key={sku.value}
                      className={`checkbox-item ${sel.allowedSkus.includes(sku.value) ? 'checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={sel.allowedSkus.includes(sku.value)}
                        onChange={() => toggleSku(svc.id, sku.value)}
                      />
                      <div className="checkbox-item-content">
                        <div className="checkbox-item-title">{sku.label}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {sel.allowedSkus.length === 0 && (
                  <div className="alert alert-warning mt-2">
                    <span>{'\u{26A0}'}</span>
                    <div>
                      No {skuLabel.toLowerCase()} selected. Users can create any size, including
                      high-cost ones. This is a security risk.
                    </div>
                  </div>
                )}
              </div>
            )}

            {wizard.provider === 'azure' &&
              (svc.id === 'azure-compute-vm' || svc.id === 'azure-compute-vmss') && (
                <div className="form-group">
                  <label className="form-label">Allowed Resource Names</label>
                  <div className="form-hint mb-2">
                    Restrict the names of resources. In Azure, VM names must be unique within a
                    resource group, so limiting names limits the number of VMs.
                  </div>
                  <NameInput
                    names={sel.allowedNames}
                    onAdd={(name) => addName(svc.id, name)}
                    onRemove={(name) => removeName(svc.id, name)}
                  />
                </div>
              )}

            {svc.id === 'azure-compute-vmss' && (
              <div className="form-group">
                <label className="form-label">Max Capacity (Scale Set Instances)</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  value={sel.maxCapacity ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setWizard((prev) => ({
                      ...prev,
                      services: prev.services.map((s) =>
                        s.serviceId === svc.id ? { ...s, maxCapacity: val } : s,
                      ),
                    }));
                  }}
                  placeholder="e.g. 3"
                />
                <div className="form-hint">
                  Limit the maximum number of instances in the scale set. Official sample uses 3.
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NameInput({
  names,
  onAdd,
  onRemove,
}: {
  names: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [input, setInput] = useState('');
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          className="form-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd(input);
              setInput('');
            }
          }}
          placeholder="e.g. VM-1"
        />
        <button
          className="btn btn-primary"
          onClick={() => {
            onAdd(input);
            setInput('');
          }}
        >
          Add
        </button>
      </div>
      {names.length > 0 && (
        <div className="tag-input-container">
          {names.map((n) => (
            <span key={n} className="tag-pill">
              {n}
              <button onClick={() => onRemove(n)}>&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 8: Review ──────────────────────────────────────────────────────

export function Step8Review() {
  const { wizard } = useWizard();
  return (
    <div>
      <div className="card">
        <div className="card-header">Configuration Summary</div>
        <p className="text-sm text-secondary mb-4">
          Review your configuration below. Click Generate to create the policy.
        </p>

        <table className="table">
          <tbody>
            <tr>
              <td className="font-semibold">Project Name</td>
              <td>{wizard.project.projectName || 'Not set'}</td>
            </tr>
            <tr>
              <td className="font-semibold">Lab Profile Number</td>
              <td>{wizard.project.labProfileNumber || 'Not set'}</td>
            </tr>
            <tr>
              <td className="font-semibold">Cloud Provider</td>
              <td>
                {wizard.provider === 'azure'
                  ? 'Microsoft Azure'
                  : wizard.provider === 'aws'
                    ? 'Amazon Web Services'
                    : 'Not selected'}
              </td>
            </tr>
            <tr>
              <td className="font-semibold">Deployment Method</td>
              <td>{wizard.deployment.method}</td>
            </tr>
            <tr>
              <td className="font-semibold">Approved Regions</td>
              <td>
                {wizard.region.approvedLocations.length > 0
                  ? wizard.region.approvedLocations.join(', ')
                  : 'Not restricted'}
              </td>
            </tr>
            <tr>
              <td className="font-semibold">Selected Services</td>
              <td>{wizard.services.length}</td>
            </tr>
            <tr>
              <td className="font-semibold">Learning Outcomes</td>
              <td>{wizard.purpose.outcomes.length}</td>
            </tr>
            <tr>
              <td className="font-semibold">Learner Tasks</td>
              <td>{wizard.purpose.tasks.length}</td>
            </tr>
          </tbody>
        </table>

        {wizard.services.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Services Detail</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Operations</th>
                  <th>SKUs</th>
                  <th>Names</th>
                </tr>
              </thead>
              <tbody>
                {wizard.services.map((sel) => {
                  const svc = (wizard.provider === 'azure' ? azureServices : awsServices).find(
                    (s) => s.id === sel.serviceId,
                  );
                  return (
                    <tr key={sel.serviceId}>
                      <td>{svc?.name ?? sel.serviceId}</td>
                      <td>{sel.operations.join(', ') || 'None'}</td>
                      <td>{sel.allowedSkus.join(', ') || 'Any'}</td>
                      <td>{sel.allowedNames.join(', ') || 'Any'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
