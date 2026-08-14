import type http from 'node:http'

export async function listenWithCleanup(
  server: http.Server,
  port: number,
  host: string,
  closeRuntime: () => Promise<void>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      void closeRuntime().then(
        () => reject(error),
        () => reject(error),
      )
    }
    server.once('error', onError)
    server.listen(port, host, () => {
      server.off('error', onError)
      resolve()
    })
  })
}
