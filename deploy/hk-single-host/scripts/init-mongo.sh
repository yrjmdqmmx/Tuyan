#!/usr/bin/env bash
set -Eeuo pipefail

read_secret() {
  local path="$1"
  test -r "$path" || { echo "missing required secret file: $path" >&2; exit 1; }
  tr -d '\r\n' < "$path"
}

root_password="$(read_secret "$MONGO_ROOT_PASSWORD_FILE")"
export PAPERBANANA_AUTH_DB_PASSWORD
export PAPERBANANA_BUSINESS_DB_PASSWORD
PAPERBANANA_AUTH_DB_PASSWORD="$(read_secret "$MONGO_AUTH_PASSWORD_FILE")"
PAPERBANANA_BUSINESS_DB_PASSWORD="$(read_secret "$MONGO_BUSINESS_PASSWORD_FILE")"

mongo_admin=(
  mongosh --quiet --host mongodb
  --username "$MONGO_ROOT_USERNAME"
  --password "$root_password"
  --authenticationDatabase admin
)

"${mongo_admin[@]}" --eval '
  try {
    rs.status()
  } catch (error) {
    if (error.codeName !== "NotYetInitialized") throw error
    rs.initiate({_id: "rs0", members: [{_id: 0, host: "mongodb:27017"}]})
  }
'

for _ in $(seq 1 60); do
  if "${mongo_admin[@]}" --eval 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
"${mongo_admin[@]}" --eval 'quit(db.hello().isWritablePrimary ? 0 : 2)'

"${mongo_admin[@]}" --eval '
  const users = [
    {database: "paperbanana_auth", username: "paperbanana_auth", password: process.env.PAPERBANANA_AUTH_DB_PASSWORD},
    {database: "paperbanana_business", username: "paperbanana_business", password: process.env.PAPERBANANA_BUSINESS_DB_PASSWORD},
  ]
  for (const user of users) {
    const target = db.getSiblingDB(user.database)
    const roles = [{role: "readWrite", db: user.database}]
    if (target.getUser(user.username)) target.updateUser(user.username, {pwd: user.password, roles})
    else target.createUser({user: user.username, pwd: user.password, roles})
  }
'

unset PAPERBANANA_AUTH_DB_PASSWORD PAPERBANANA_BUSINESS_DB_PASSWORD root_password
echo "MongoDB replica set and application users are ready."
