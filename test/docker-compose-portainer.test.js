'use strict';
/**
 * Tests for docker-compose.portainer.yml and the README.md Portainer section
 * introduced in this PR.
 *
 * Changes under test:
 *   docker-compose.portainer.yml (new file):
 *     - Compose file version 3.9
 *     - `agent` service: portainer/agent:lts image, global deploy mode,
 *       linux platform constraint, required volume mounts, agent_network
 *     - `portainer` service: portainer/portainer-ee:lts image, replicated
 *       deploy (1 replica), manager node constraint, ports 9443/9000/8000,
 *       portainer_data volume mount, agent_network, correct -H command
 *     - `agent_network`: overlay driver, attachable
 *     - `portainer_data`: named volume declared
 *
 *   README.md (updated):
 *     - "### Portainer (Docker Swarm)" section present
 *     - Mentions docker-compose.portainer.yml filename
 *     - Mentions ports 9443, 9000, 8000
 *     - Contains `docker swarm init` command
 *     - Contains `docker stack deploy -c docker-compose.portainer.yml portainer` command
 *
 * Strategy: parse the YAML file with js-yaml and read README.md with fs,
 * then assert against the parsed structure — no Docker daemon required.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { describe, it, before } = require('mocha');

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

function loadPortainerCompose() {
  const filePath = path.join(ROOT, 'docker-compose.portainer.yml');
  const raw = fs.readFileSync(filePath, 'utf8');
  return yaml.load(raw);
}

function readReadme() {
  return fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
}

// ── docker-compose.portainer.yml ──────────────────────────────────────────────

describe('docker-compose.portainer.yml — file parseable', () => {
  it('loads without throwing', () => {
    assert.doesNotThrow(() => loadPortainerCompose());
  });

  it('parses to a non-null object', () => {
    const doc = loadPortainerCompose();
    assert.ok(doc !== null && typeof doc === 'object');
  });
});

describe('docker-compose.portainer.yml — compose version', () => {
  let doc;
  before(() => { doc = loadPortainerCompose(); });

  it('declares version "3.9"', () => {
    assert.strictEqual(String(doc.version), '3.9');
  });
});

describe('docker-compose.portainer.yml — services', () => {
  let doc;
  before(() => { doc = loadPortainerCompose(); });

  it('defines exactly two services: agent and portainer', () => {
    const names = Object.keys(doc.services).sort();
    assert.deepStrictEqual(names, ['agent', 'portainer']);
  });
});

describe('docker-compose.portainer.yml — agent service', () => {
  let agent;
  before(() => { agent = loadPortainerCompose().services.agent; });

  it('uses the portainer/agent:lts image', () => {
    assert.strictEqual(agent.image, 'portainer/agent:lts');
  });

  it('mounts /var/run/docker.sock', () => {
    const hasSock = agent.volumes.some(
      (v) => v === '/var/run/docker.sock:/var/run/docker.sock' ||
              (typeof v === 'object' && v.source === '/var/run/docker.sock')
    );
    assert.ok(hasSock, 'docker.sock volume mount missing');
  });

  it('mounts /var/lib/docker/volumes', () => {
    const hasVolumes = agent.volumes.some(
      (v) => v === '/var/lib/docker/volumes:/var/lib/docker/volumes' ||
              (typeof v === 'object' && v.source === '/var/lib/docker/volumes')
    );
    assert.ok(hasVolumes, 'docker volumes mount missing');
  });

  it('is connected to agent_network', () => {
    const networks = Array.isArray(agent.networks) ? agent.networks : Object.keys(agent.networks);
    assert.ok(networks.includes('agent_network'));
  });

  it('uses global deploy mode', () => {
    assert.strictEqual(agent.deploy.mode, 'global');
  });

  it('constrains placement to linux nodes', () => {
    const constraints = agent.deploy.placement.constraints;
    assert.ok(
      constraints.some((c) => c.includes('node.platform.os') && c.includes('linux')),
      'linux platform constraint missing'
    );
  });

  it('does not expose any ports', () => {
    assert.ok(
      !agent.ports || agent.ports.length === 0,
      'agent service should not expose ports directly'
    );
  });
});

describe('docker-compose.portainer.yml — portainer service', () => {
  let portainer;
  before(() => { portainer = loadPortainerCompose().services.portainer; });

  it('uses the portainer/portainer-ee:lts image', () => {
    assert.strictEqual(portainer.image, 'portainer/portainer-ee:lts');
  });

  it('connects to the agent via tcp://tasks.agent:9001', () => {
    const cmd = Array.isArray(portainer.command)
      ? portainer.command.join(' ')
      : String(portainer.command);
    assert.ok(
      cmd.includes('tcp://tasks.agent:9001'),
      `command should reference tasks.agent:9001, got: ${cmd}`
    );
    assert.ok(cmd.includes('-H'), 'command should use -H flag');
  });

  it('exposes port 9443 (HTTPS UI)', () => {
    const ports = portainer.ports.map(String);
    assert.ok(
      ports.some((p) => p === '9443:9443' || p.endsWith(':9443')),
      'port 9443 not exposed'
    );
  });

  it('exposes port 9000 (HTTP UI)', () => {
    const ports = portainer.ports.map(String);
    assert.ok(
      ports.some((p) => p === '9000:9000' || p.endsWith(':9000')),
      'port 9000 not exposed'
    );
  });

  it('exposes port 8000 (Edge/tunnel)', () => {
    const ports = portainer.ports.map(String);
    assert.ok(
      ports.some((p) => p === '8000:8000' || p.endsWith(':8000')),
      'port 8000 not exposed'
    );
  });

  it('exposes exactly three ports', () => {
    assert.strictEqual(portainer.ports.length, 3);
  });

  it('mounts the portainer_data named volume to /data', () => {
    const hasData = portainer.volumes.some(
      (v) => v === 'portainer_data:/data' ||
              (typeof v === 'object' && v.source === 'portainer_data' && v.target === '/data')
    );
    assert.ok(hasData, 'portainer_data:/data volume mount missing');
  });

  it('is connected to agent_network', () => {
    const networks = Array.isArray(portainer.networks)
      ? portainer.networks
      : Object.keys(portainer.networks);
    assert.ok(networks.includes('agent_network'));
  });

  it('uses replicated deploy mode', () => {
    assert.strictEqual(portainer.deploy.mode, 'replicated');
  });

  it('runs exactly 1 replica', () => {
    assert.strictEqual(portainer.deploy.replicas, 1);
  });

  it('constrains placement to manager nodes', () => {
    const constraints = portainer.deploy.placement.constraints;
    assert.ok(
      constraints.some((c) => c.includes('node.role') && c.includes('manager')),
      'manager node constraint missing'
    );
  });

  it('does not mount the docker socket (only agent should)', () => {
    const volumes = portainer.volumes || [];
    const hasSock = volumes.some(
      (v) => String(v).includes('/var/run/docker.sock')
    );
    assert.ok(!hasSock, 'portainer service should not mount docker.sock directly');
  });
});

describe('docker-compose.portainer.yml — networks', () => {
  let networks;
  before(() => { networks = loadPortainerCompose().networks; });

  it('declares the agent_network network', () => {
    assert.ok(networks.agent_network, 'agent_network not declared');
  });

  it('agent_network uses the overlay driver', () => {
    assert.strictEqual(networks.agent_network.driver, 'overlay');
  });

  it('agent_network is attachable', () => {
    assert.strictEqual(networks.agent_network.attachable, true);
  });

  it('declares no unexpected networks', () => {
    const names = Object.keys(networks);
    assert.deepStrictEqual(names, ['agent_network']);
  });
});

describe('docker-compose.portainer.yml — volumes', () => {
  let volumes;
  before(() => { volumes = loadPortainerCompose().volumes; });

  it('declares the portainer_data named volume', () => {
    assert.ok(Object.prototype.hasOwnProperty.call(volumes, 'portainer_data'));
  });

  it('declares no unexpected named volumes', () => {
    const names = Object.keys(volumes);
    assert.deepStrictEqual(names, ['portainer_data']);
  });
});

describe('docker-compose.portainer.yml — shared network membership', () => {
  let doc;
  before(() => { doc = loadPortainerCompose(); });

  it('both services share agent_network so they can communicate', () => {
    const agentNets = Array.isArray(doc.services.agent.networks)
      ? doc.services.agent.networks
      : Object.keys(doc.services.agent.networks);
    const portainerNets = Array.isArray(doc.services.portainer.networks)
      ? doc.services.portainer.networks
      : Object.keys(doc.services.portainer.networks);
    assert.ok(agentNets.includes('agent_network'));
    assert.ok(portainerNets.includes('agent_network'));
  });
});

// ── README.md — Portainer section ────────────────────────────────────────────

describe('README.md — Portainer (Docker Swarm) section', () => {
  let readme;
  before(() => { readme = readReadme(); });

  it('contains the "Portainer (Docker Swarm)" heading', () => {
    assert.ok(
      readme.includes('Portainer (Docker Swarm)'),
      'Portainer heading not found in README'
    );
  });

  it('references the docker-compose.portainer.yml filename', () => {
    assert.ok(
      readme.includes('docker-compose.portainer.yml'),
      'docker-compose.portainer.yml filename not mentioned in README'
    );
  });

  it('mentions port 9443', () => {
    assert.ok(readme.includes('9443'), 'port 9443 not mentioned in README Portainer section');
  });

  it('mentions port 9000', () => {
    assert.ok(readme.includes('9000'), 'port 9000 not mentioned in README Portainer section');
  });

  it('mentions port 8000', () => {
    assert.ok(readme.includes('8000'), 'port 8000 not mentioned in README Portainer section');
  });

  it('includes the docker swarm init command', () => {
    assert.ok(
      readme.includes('docker swarm init'),
      'docker swarm init command missing from README'
    );
  });

  it('includes the docker stack deploy command', () => {
    assert.ok(
      readme.includes('docker stack deploy'),
      'docker stack deploy command missing from README'
    );
  });

  it('docker stack deploy command targets the portainer stack name', () => {
    assert.ok(
      readme.includes('docker stack deploy -c docker-compose.portainer.yml portainer'),
      'full docker stack deploy command not found in README'
    );
  });

  it('Portainer section appears after the Compose section', () => {
    const composeIdx = readme.indexOf('### Compose');
    const portainerIdx = readme.indexOf('### Portainer');
    assert.ok(composeIdx !== -1, '### Compose heading not found');
    assert.ok(portainerIdx !== -1, '### Portainer heading not found');
    assert.ok(
      portainerIdx > composeIdx,
      'Portainer section should appear after the Compose section'
    );
  });

  it('Portainer section appears before the Plain Node section', () => {
    const portainerIdx = readme.indexOf('### Portainer');
    const plainNodeIdx = readme.indexOf('### Plain Node');
    assert.ok(portainerIdx !== -1, '### Portainer heading not found');
    assert.ok(plainNodeIdx !== -1, '### Plain Node heading not found');
    assert.ok(
      portainerIdx < plainNodeIdx,
      'Portainer section should appear before the Plain Node section'
    );
  });
});
