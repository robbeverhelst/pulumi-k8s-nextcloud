import { config, Helm } from '@homelab/shared'
import { Secret } from '@pulumi/kubernetes/core/v1'
import { Database, Provider } from '@pulumi/postgresql'

const cfg = config('nextcloud')
const ns = cfg.get('namespace', 'nextcloud')

// PostgreSQL provider for Nextcloud database
const postgresProvider = new Provider('postgres-provider', {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'defaultpassword',
  sslmode: 'disable',
})

// Create database for Nextcloud
new Database(
  'nextcloud-database',
  {
    name: 'nextcloud',
    owner: process.env.POSTGRES_USER || 'postgres',
  },
  { provider: postgresProvider },
)

// Create secrets for Nextcloud
const nextcloudSecret = new Secret('nextcloud-secret', {
  metadata: {
    name: 'nextcloud-secret',
    namespace: ns,
  },
  stringData: {
    'nextcloud-username': process.env.NEXTCLOUD_USERNAME || 'admin',
    'nextcloud-password': process.env.NEXTCLOUD_PASSWORD || 'changeme',
    'db-username': process.env.POSTGRES_USER || 'postgres',
    'db-password': process.env.POSTGRES_PASSWORD || 'defaultpassword',
  },
})

const nextcloud = new Helm('nextcloud', {
  namespace: ns,
  chart: 'nextcloud',
  repo: 'https://nextcloud.github.io/helm/',
  version: process.env.NEXTCLOUD_HELM_VERSION || '6.2.2',
  values: {
    image: {
      repository: 'nextcloud',
      tag: process.env.NEXTCLOUD_IMAGE?.split(':')[1] || '30.0.4',
      flavor: 'apache',
    },
    nextcloud: {
      host: cfg.get('host', 'nextcloud.homelab.local'),
      existingSecret: {
        enabled: true,
        secretName: nextcloudSecret.metadata.name,
        usernameKey: 'nextcloud-username',
        passwordKey: 'nextcloud-password',
      },
      trustedDomains: [cfg.get('host', 'nextcloud.homelab.local'), 'localhost', '192.168.1.210:8080'],
      extraEnv: [
        {
          name: 'NEXTCLOUD_LOGLEVEL',
          value: '0',
        },
      ],
    },
    service: {
      type: 'LoadBalancer',
      port: 8080,
    },
    persistence: {
      enabled: true,
      storageClass: cfg.get('storageClass', 'truenas-hdd-mirror-iscsi'),
      accessMode: 'ReadWriteOnce',
      size: cfg.get('dataSize', '100Gi'),
    },
    internalDatabase: {
      enabled: false,
    },
    externalDatabase: {
      enabled: true,
      type: 'postgresql',
      host: process.env.POSTGRES_HOST || 'localhost',
      database: 'nextcloud',
      existingSecret: {
        enabled: true,
        secretName: nextcloudSecret.metadata.name,
        usernameKey: 'db-username',
        passwordKey: 'db-password',
      },
    },
    // redis: {
    //   enabled: true,
    //   auth: {
    //     enabled: true,
    //     password: process.env.REDIS_PASSWORD || 'changeme',
    //   },
    // },
    resources: {
      requests: {
        cpu: '500m',
        memory: '2Gi',
      },
      limits: {
        cpu: '4',
        memory: '8Gi',
      },
    },
    livenessProbe: {
      enabled: true,
    },
    readinessProbe: {
      enabled: true,
    },
    startupProbe: {
      enabled: true,
    },
    cronjob: {
      enabled: true,
    },
    metrics: {
      enabled: true,
      https: false,
      token: process.env.NEXTCLOUD_METRICS_TOKEN || '',
      timeout: '5s',
      image: {
        repository: 'xperimental/nextcloud-exporter',
        tag: '0.8.0',
        pullPolicy: 'IfNotPresent',
      },
      service: {
        type: 'ClusterIP',
        annotations: {
          'prometheus.io/scrape': 'true',
          'prometheus.io/port': '9205',
        },
      },
      serviceMonitor: {
        enabled: true,
        interval: '30s',
        scrapeTimeout: '10s',
        labels: {
          release: 'kube-prometheus-stack',
        },
      },
    },
  },
})

export const namespace = ns
export const services = {
  nextcloud: nextcloud.release.name,
}
