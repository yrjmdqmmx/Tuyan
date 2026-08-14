type CloudAdapters = {
  mongo: { db: { collection(name: string): unknown } }
  storage: { bucket(name: string): unknown }
}

let adapters: CloudAdapters | undefined

function configured(): CloudAdapters {
  if (!adapters) throw new Error('Laf cloud adapter is not configured')
  return adapters
}

export function configureLafCloud(next: CloudAdapters): void {
  adapters = next
}

const cloud = {
  mongo: {
    db: {
      collection(name: string) {
        return configured().mongo.db.collection(name)
      },
    },
  },
  storage: {
    bucket(name: string) {
      return configured().storage.bucket(name)
    },
  },
}

export default cloud
