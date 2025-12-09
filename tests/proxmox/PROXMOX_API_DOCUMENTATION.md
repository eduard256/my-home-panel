# Proxmox VE API Documentation

## Overview

Proxmox VE provides a comprehensive REST API for managing virtualization infrastructure. This documentation covers tested endpoints for retrieving information and managing VMs and containers.

**Base URL:** `https://<proxmox-host>:8006/api2/json`

**Protocol:** HTTPS (uses self-signed certificate by default, use `-k` flag with curl)

**Authentication:** API Token via `Authorization` header

## Table of Contents

- [Authentication](#authentication)
- [Information Endpoints (GET)](#information-endpoints-get)
  - [Version & Cluster](#version--cluster)
  - [Nodes](#nodes)
  - [Virtual Machines (QEMU)](#virtual-machines-qemu)
  - [Containers (LXC)](#containers-lxc)
  - [Storage](#storage)
  - [Users & Tasks](#users--tasks)
- [Management Endpoints (POST)](#management-endpoints-post)
  - [Container Management](#container-management)
  - [VM Management](#vm-management)
  - [Backup Operations](#backup-operations)
- [Response Format](#response-format)
- [Examples](#examples)

---

## Authentication

### API Token Authentication

Proxmox API supports token-based authentication. Tokens are created in the web UI:

**Path:** Datacenter → Permissions → API Tokens → Add

**Token Format:**
```
USER@REALM!TOKENID=SECRET
```

**Example:**
```
root@pam!mytoken=12345678-1234-1234-1234-123456789abc
```

### Using Token in Requests

**Header Format:**
```
Authorization: PVEAPIToken=USER@REALM!TOKENID=SECRET
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/version
```

---

## Information Endpoints (GET)

### Version & Cluster

#### Get Proxmox Version

**Endpoint:** `GET /api2/json/version`

**Description:** Returns Proxmox VE version information

**Response:**
```json
{
  "data": {
    "version": "9.0.6",
    "release": "9.0",
    "repoid": "49c767b70aeb6648"
  }
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/version
```

---

#### Get Cluster Resources

**Endpoint:** `GET /api2/json/cluster/resources`

**Description:** Returns all cluster resources including nodes, VMs, containers, and storage

**Response:**
```json
{
  "data": [
    {
      "type": "qemu",
      "vmid": 100,
      "name": "my-vm",
      "status": "running",
      "maxmem": 4294967296,
      "mem": 2483560448,
      "maxcpu": 4,
      "cpu": 0.0186805163977594,
      "maxdisk": 34359738368,
      "disk": 0,
      "uptime": 29705,
      "node": "pve"
    },
    {
      "type": "lxc",
      "vmid": 101,
      "name": "my-container",
      "status": "running",
      "maxmem": 536870912,
      "mem": 25853952,
      "maxcpu": 1,
      "cpu": 0.000688230019346774,
      "node": "pve"
    },
    {
      "type": "storage",
      "storage": "local",
      "plugintype": "dir",
      "disk": 22751748096,
      "maxdisk": 100861726720,
      "content": "vztmpl,backup,iso",
      "status": "available",
      "node": "pve"
    }
  ]
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/cluster/resources
```

---

### Nodes

#### Get Nodes List

**Endpoint:** `GET /api2/json/nodes`

**Description:** Returns list of all nodes in the cluster

**Response:**
```json
{
  "data": [
    {
      "node": "pve",
      "status": "online",
      "type": "node",
      "level": "",
      "id": "node/pve",
      "mem": 4949024768,
      "maxmem": 16535662592,
      "cpu": 0.0220734126984127,
      "maxcpu": 4,
      "disk": 22751748096,
      "maxdisk": 100861726720,
      "uptime": 29718
    }
  ]
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes
```

---

#### Get Node Status

**Endpoint:** `GET /api2/json/nodes/{node}/status`

**Description:** Returns detailed status information for a specific node

**Parameters:**
- `{node}` - Node name (e.g., "pve")

**Response:**
```json
{
  "data": {
    "uptime": 29736,
    "cpu": 0.0215032464466438,
    "loadavg": ["0.04", "0.08", "0.03"],
    "memory": {
      "total": 16535662592,
      "used": 4960595968,
      "free": 10280865792
    },
    "rootfs": {
      "total": 100861726720,
      "used": 22751748096,
      "free": 78109978624,
      "avail": 72939241472
    },
    "swap": {
      "total": 8589930496,
      "used": 0,
      "free": 8589930496
    },
    "kversion": "Linux 6.14.11-1-pve #1 SMP PREEMPT_DYNAMIC PMX 6.14.11-1",
    "pveversion": "pve-manager/9.0.6/49c767b70aeb6648",
    "cpuinfo": {
      "cpus": 4,
      "cores": 4,
      "sockets": 1,
      "model": "Intel(R) N150",
      "mhz": "3600.031"
    }
  }
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/status
```

---

### Virtual Machines (QEMU)

#### Get VMs List

**Endpoint:** `GET /api2/json/nodes/{node}/qemu`

**Description:** Returns list of all QEMU VMs on a specific node

**Parameters:**
- `{node}` - Node name (e.g., "pve")

**Response:**
```json
{
  "data": [
    {
      "vmid": 100,
      "name": "home-assistant",
      "status": "running",
      "maxmem": 4294967296,
      "mem": 2861942784,
      "cpus": 4,
      "cpu": 0,
      "maxdisk": 34359738368,
      "disk": 0,
      "uptime": 29725,
      "netin": 127219199,
      "netout": 28798772,
      "diskread": 0,
      "diskwrite": 0,
      "pid": 1103
    }
  ]
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/qemu
```

---

#### Get VM Status

**Endpoint:** `GET /api2/json/nodes/{node}/qemu/{vmid}/status/current`

**Description:** Returns detailed current status of a specific VM

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - VM ID (e.g., 100)

**Response:**
```json
{
  "data": {
    "vmid": 100,
    "name": "home-assistant",
    "status": "running",
    "qmpstatus": "running",
    "cpus": 4,
    "cpu": 0,
    "maxmem": 4294967296,
    "mem": 2477305856,
    "freemem": 1613893632,
    "balloon": 4294967296,
    "maxdisk": 34359738368,
    "disk": 0,
    "uptime": 29727,
    "netin": 127219453,
    "netout": 28799584,
    "diskread": 922293760,
    "diskwrite": 893048832,
    "pid": 1103,
    "agent": 1,
    "ballooninfo": {
      "actual": 4294967296,
      "max_mem": 4294967296,
      "free_mem": 1613893632,
      "total_mem": 4091199488
    },
    "nics": {
      "tap100i0": {
        "netin": 127219453,
        "netout": 28799584
      }
    }
  }
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/qemu/100/status/current
```

---

### Containers (LXC)

#### Get Containers List

**Endpoint:** `GET /api2/json/nodes/{node}/lxc`

**Description:** Returns list of all LXC containers on a specific node

**Parameters:**
- `{node}` - Node name (e.g., "pve")

**Response:**
```json
{
  "data": [
    {
      "vmid": 101,
      "name": "mqtt",
      "status": "running",
      "type": "lxc",
      "maxmem": 536870912,
      "mem": 25853952,
      "maxswap": 536870912,
      "swap": 0,
      "cpus": 1,
      "cpu": 0,
      "maxdisk": 2040373248,
      "disk": 797433856,
      "uptime": 29690,
      "netin": 1937030,
      "netout": 1636,
      "diskread": 380469248,
      "diskwrite": 10784768,
      "pid": 1324,
      "tags": "community-script;mqtt"
    }
  ]
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/lxc
```

---

#### Get Container Status

**Endpoint:** `GET /api2/json/nodes/{node}/lxc/{vmid}/status/current`

**Description:** Returns detailed current status of a specific container

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - Container ID (e.g., 101)

**Response:**
```json
{
  "data": {
    "vmid": 10000,
    "name": "mqtt",
    "status": "running",
    "type": "lxc",
    "cpus": 4,
    "cpu": 0,
    "maxmem": 8589934592,
    "mem": 46387200,
    "maxswap": 536870912,
    "swap": 0,
    "maxdisk": 33741029376,
    "disk": 1109368832,
    "uptime": 29646,
    "netin": 9134553,
    "netout": 9589172,
    "diskread": 156061696,
    "diskwrite": 62304256,
    "pid": 1813,
    "tags": "community-script;os",
    "ha": {
      "managed": 0
    }
  }
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/lxc/101/status/current
```

---

### Storage

#### Get Storage List

**Endpoint:** `GET /api2/json/storage`

**Description:** Returns list of all configured storage

**Response:**
```json
{
  "data": [
    {
      "storage": "local",
      "type": "dir",
      "content": "vztmpl,iso,backup",
      "path": "/var/lib/vz",
      "digest": "b6b926339dcd532a2a6e2d8a145ba4cc6c95363d"
    },
    {
      "storage": "local-lvm",
      "type": "lvmthin",
      "content": "images,rootdir",
      "vgname": "pve",
      "thinpool": "data",
      "digest": "b6b926339dcd532a2a6e2d8a145ba4cc6c95363d"
    }
  ]
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/storage
```

---

#### Get Node Storage Status

**Endpoint:** `GET /api2/json/nodes/{node}/storage`

**Description:** Returns storage status on a specific node

**Parameters:**
- `{node}` - Node name (e.g., "pve")

**Response:**
```json
{
  "data": [
    {
      "storage": "local",
      "type": "dir",
      "content": "vztmpl,backup,iso",
      "active": 1,
      "enabled": 1,
      "shared": 0,
      "total": 100861726720,
      "used": 22751752192,
      "avail": 72939237376,
      "used_fraction": 0.225573693132982
    },
    {
      "storage": "local-lvm",
      "type": "lvmthin",
      "content": "rootdir,images",
      "active": 1,
      "enabled": 1,
      "shared": 0,
      "total": 373553102848,
      "used": 18640299832,
      "avail": 354912803016,
      "used_fraction": 0.0498999999996916
    }
  ]
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/storage
```

---

#### Get Storage Content

**Endpoint:** `GET /api2/json/nodes/{node}/storage/{storage}/content`

**Description:** Returns content list of a specific storage (backups, ISOs, templates)

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{storage}` - Storage name (e.g., "local")

**Response:**
```json
{
  "data": [
    {
      "volid": "local:backup/vzdump-lxc-10000-2025_11_17-22_59_58.tar.zst",
      "format": "tar.zst",
      "content": "backup",
      "subtype": "lxc",
      "vmid": 10000,
      "ctime": 1763409598,
      "size": 356455456,
      "notes": "mqtt with 65536 file descriptors"
    },
    {
      "volid": "local:backup/vzdump-qemu-100-2025_11_17-23_51_27.vma.zst",
      "format": "vma.zst",
      "content": "backup",
      "subtype": "qemu",
      "vmid": 100,
      "ctime": 1763412687,
      "size": 10253936353,
      "notes": "home-assistant-old"
    },
    {
      "volid": "local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst",
      "format": "tzst",
      "content": "vztmpl",
      "ctime": 1757349290,
      "size": 141589318
    }
  ]
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/storage/local/content
```

---

### Users & Tasks

#### Get Users List

**Endpoint:** `GET /api2/json/access/users`

**Description:** Returns list of all users

**Response:**
```json
{
  "data": [
    {
      "userid": "root@pam",
      "enable": 1,
      "expire": 0,
      "realm-type": "pam",
      "email": "admin@example.com"
    }
  ]
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/access/users
```

---

#### Get Tasks List

**Endpoint:** `GET /api2/json/nodes/{node}/tasks`

**Description:** Returns list of recent tasks on a node

**Parameters:**
- `{node}` - Node name (e.g., "pve")

**Response:**
```json
{
  "data": [
    {
      "upid": "UPID:pve:00021249:002D9506:692EE327:vzstop:101:root@pam!test2:",
      "node": "pve",
      "pid": 135753,
      "pstart": 2987270,
      "starttime": 1764679463,
      "type": "vzstop",
      "id": "101",
      "user": "root@pam!test2",
      "status": "OK",
      "endtime": 1764679465
    }
  ],
  "total": 630
}
```

**curl Example:**
```bash
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/tasks
```

---

## Management Endpoints (POST)

### Container Management

#### Start Container

**Endpoint:** `POST /api2/json/nodes/{node}/lxc/{vmid}/status/start`

**Description:** Starts a stopped container

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - Container ID (e.g., 101)

**Response:**
```json
{
  "data": "UPID:pve:000212A7:002D9BF8:692EE339:vzstart:101:root@pam!test2:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/lxc/101/status/start
```

---

#### Stop Container

**Endpoint:** `POST /api2/json/nodes/{node}/lxc/{vmid}/status/stop`

**Description:** Stops a running container (hard stop)

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - Container ID (e.g., 101)

**Response:**
```json
{
  "data": "UPID:pve:00021249:002D9506:692EE327:vzstop:101:root@pam!test2:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/lxc/101/status/stop
```

---

#### Shutdown Container

**Endpoint:** `POST /api2/json/nodes/{node}/lxc/{vmid}/status/shutdown`

**Description:** Gracefully shuts down a running container

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - Container ID (e.g., 101)

**Optional Query Parameters:**
- `timeout` - Timeout in seconds (default: 60)
- `forceStop` - Force stop after timeout (0 or 1)

**Response:**
```json
{
  "data": "UPID:pve:00021249:002D9506:692EE327:vzshutdown:101:root@pam!test2:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  "https://<host>:8006/api2/json/nodes/pve/lxc/101/status/shutdown?timeout=30"
```

---

#### Reboot Container

**Endpoint:** `POST /api2/json/nodes/{node}/lxc/{vmid}/status/reboot`

**Description:** Reboots a running container

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - Container ID (e.g., 101)

**Optional Query Parameters:**
- `timeout` - Timeout in seconds (default: 60)

**Response:**
```json
{
  "data": "UPID:pve:0002145F:002DA22A:692EE349:vzreboot:101:root@pam!test2:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/lxc/101/status/reboot
```

---

### VM Management

#### Start VM

**Endpoint:** `POST /api2/json/nodes/{node}/qemu/{vmid}/status/start`

**Description:** Starts a stopped VM

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - VM ID (e.g., 100)

**Response:**
```json
{
  "data": "UPID:pve:00000433:00000510:692703C2:qmstart:100:root@pam:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/qemu/100/status/start
```

---

#### Stop VM

**Endpoint:** `POST /api2/json/nodes/{node}/qemu/{vmid}/status/stop`

**Description:** Stops a running VM (hard stop)

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - VM ID (e.g., 100)

**Response:**
```json
{
  "data": "UPID:pve:00000433:00000510:692703C2:qmstop:100:root@pam:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/qemu/100/status/stop
```

---

#### Shutdown VM

**Endpoint:** `POST /api2/json/nodes/{node}/qemu/{vmid}/status/shutdown`

**Description:** Gracefully shuts down a running VM

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - VM ID (e.g., 100)

**Optional Query Parameters:**
- `timeout` - Timeout in seconds
- `forceStop` - Force stop after timeout (0 or 1)
- `keepActive` - Keep active after shutdown (0 or 1)

**Response:**
```json
{
  "data": "UPID:pve:00000433:00000510:692703C2:qmshutdown:100:root@pam:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/qemu/100/status/shutdown
```

---

#### Reboot VM

**Endpoint:** `POST /api2/json/nodes/{node}/qemu/{vmid}/status/reboot`

**Description:** Reboots a running VM

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - VM ID (e.g., 100)

**Optional Query Parameters:**
- `timeout` - Timeout in seconds

**Response:**
```json
{
  "data": "UPID:pve:00000433:00000510:692703C2:qmreboot:100:root@pam:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/qemu/100/status/reboot
```

---

#### Reset VM

**Endpoint:** `POST /api2/json/nodes/{node}/qemu/{vmid}/status/reset`

**Description:** Hard resets a running VM (similar to pressing reset button)

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - VM ID (e.g., 100)

**Response:**
```json
{
  "data": "UPID:pve:00000433:00000510:692703C2:qmreset:100:root@pam:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/qemu/100/status/reset
```

---

#### Suspend VM

**Endpoint:** `POST /api2/json/nodes/{node}/qemu/{vmid}/status/suspend`

**Description:** Suspends a running VM

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - VM ID (e.g., 100)

**Response:**
```json
{
  "data": "UPID:pve:00000433:00000510:692703C2:qmsuspend:100:root@pam:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/qemu/100/status/suspend
```

---

#### Resume VM

**Endpoint:** `POST /api2/json/nodes/{node}/qemu/{vmid}/status/resume`

**Description:** Resumes a suspended VM

**Parameters:**
- `{node}` - Node name (e.g., "pve")
- `{vmid}` - VM ID (e.g., 100)

**Response:**
```json
{
  "data": "UPID:pve:00000433:00000510:692703C2:qmresume:100:root@pam:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://<host>:8006/api2/json/nodes/pve/qemu/100/status/resume
```

---

### Backup Operations

#### Create Backup

**Endpoint:** `POST /api2/json/nodes/{node}/vzdump`

**Description:** Creates a backup of VM or container

**Parameters:**
- `{node}` - Node name (e.g., "pve")

**Required POST Data (application/x-www-form-urlencoded):**
- `vmid` - VM/Container ID to backup

**Optional POST Data:**
- `storage` - Storage for backup (default: local)
- `mode` - Backup mode: `snapshot`, `suspend`, or `stop` (default: snapshot)
- `compress` - Compression: `0` (none), `1` (lzo), `gzip`, `zstd` (default: zstd)
- `notes-template` - Notes template for backup
- `remove` - Remove old backups (prune)

**Response:**
```json
{
  "data": "UPID:pve:00287712:02CD3ED8:692E2FDB:vzdump:4001:root@pam:"
}
```

**curl Example:**
```bash
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  -d "vmid=101" \
  -d "storage=local" \
  -d "mode=snapshot" \
  -d "compress=zstd" \
  https://<host>:8006/api2/json/nodes/pve/vzdump
```

---

## Response Format

All API responses follow this structure:

**Success Response:**
```json
{
  "data": <result>
}
```

**Error Response:**
```json
{
  "data": null,
  "message": "Error description"
}
```

**Task Response (Asynchronous Operations):**

Most management operations return a UPID (Unique Process ID) that can be used to monitor task progress.

```json
{
  "data": "UPID:pve:00021249:002D9506:692EE327:vzstop:101:root@pam!test2:"
}
```

**UPID Format:**
```
UPID:<node>:<pid>:<pstart>:<starttime>:<type>:<id>:<user>:
```

To monitor task status, use:
```bash
GET /api2/json/nodes/{node}/tasks/{upid}/status
```

---

## Examples

### Complete Workflow: Check and Restart Container

```bash
# Step 1: Get list of containers
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://10.0.20.10:8006/api2/json/nodes/pve/lxc

# Step 2: Check specific container status
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://10.0.20.10:8006/api2/json/nodes/pve/lxc/101/status/current

# Step 3: Reboot container
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://10.0.20.10:8006/api2/json/nodes/pve/lxc/101/status/reboot
```

---

### Complete Workflow: Monitor Node Resources

```bash
# Step 1: Get cluster overview
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://10.0.20.10:8006/api2/json/cluster/resources

# Step 2: Get detailed node status
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://10.0.20.10:8006/api2/json/nodes/pve/status

# Step 3: Get storage usage
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://10.0.20.10:8006/api2/json/nodes/pve/storage
```

---

### Complete Workflow: Backup Container

```bash
# Step 1: Check container is running
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://10.0.20.10:8006/api2/json/nodes/pve/lxc/101/status/current

# Step 2: Create backup
curl -k -X POST -H "Authorization: PVEAPIToken=<TOKEN>" \
  -d "vmid=101" \
  -d "storage=local" \
  -d "mode=snapshot" \
  -d "compress=zstd" \
  https://10.0.20.10:8006/api2/json/nodes/pve/vzdump

# Step 3: List backups
curl -k -H "Authorization: PVEAPIToken=<TOKEN>" \
  https://10.0.20.10:8006/api2/json/nodes/pve/storage/local/content
```

---

## Notes

### SSL Certificate
Proxmox uses self-signed SSL certificates by default. In production, either:
- Install a valid SSL certificate
- Use the `-k` flag in curl to skip verification (for testing only)

### Rate Limiting
Be mindful of API rate limits when creating monitoring scripts. Consider:
- Implementing exponential backoff
- Caching responses when appropriate
- Using websockets for real-time monitoring

### Permissions
Ensure your API token has appropriate permissions for the operations you need to perform. Tokens can be restricted using Proxmox's permission system.

### Task Monitoring
Management operations (start, stop, backup, etc.) are asynchronous. Monitor the task status using the returned UPID to ensure completion.

---

## Additional Resources

- **Official API Viewer:** https://pve.proxmox.com/pve-docs/api-viewer/
- **Proxmox VE API Wiki:** https://pve.proxmox.com/wiki/Proxmox_VE_API
- **Official Documentation:** https://pve.proxmox.com/pve-docs/

---

**Last Updated:** 2025-12-02
**Tested on Proxmox VE:** 9.0.6
