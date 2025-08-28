# Nextcloud Stack

Pulumi Kubernetes stack: nextcloud-stack

## Usage

```bash
bun install
export KUBECONFIG=$HOME/.kube/config  # or your cluster config
PULUMI_STACK=prod bun run up
```

### Preview / Destroy

```bash
PULUMI_STACK=prod bun run preview
PULUMI_STACK=prod bun run destroy
```

## Configuration

Use Pulumi config to override settings, for example:

```bash
pulumi config set <project>:namespace <value>
pulumi config set <project>:replicas 2
pulumi config set <project>:image busybox:1.36
pulumi config set <project>:message 'hello'
pulumi config set <project>:intervalSeconds 5
```

## Links


## Contributing

Contributions are welcome via pull requests.

---
Note: This repository is an automated export from a private monorepo.