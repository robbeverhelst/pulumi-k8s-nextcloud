import { config, Namespace } from '@homelab/shared'

const cfg = config('nextcloud')

const ns = new Namespace('nextcloud', {
  metadata: { name: cfg.get('namespace', 'nextcloud') },
})

export const namespace = ns.metadata.name
