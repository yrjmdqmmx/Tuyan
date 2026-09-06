#!/usr/bin/env bash
# Source only after taking the shared production lock. No credentials are read here.
load_scientific_v2_expansion() {
  expansion_json=null
  expansion_docker_args=()
  expansion_cli_args=()
  [[ -n "${expansion_sha256:-}" ]] || return 0
  [[ "$expansion_sha256" =~ ^[a-f0-9]{64}$ ]] || return 1
  local path="/opt/paperbanana/operator-private/scientific-v2/admin-inputs/$expansion_sha256.json"
  [[ -f "$path" && ! -L "$path" && "$(stat -c '%u:%g:%a:%h' "$path")" =~ ^0:0:0?600:1$
    && "$(sha256sum "$path" | awk '{print $1}')" == "$expansion_sha256" ]] || return 1
  expansion_json="$(jq -ce '
    select((keys | sort) == ["baseline","kind","schemaVersion","targetModelId"] and
      .schemaVersion == 1 and .kind == "single_model_expansion" and
      (.baseline | keys | sort) == ["batchId","manifestHash","releaseHash","releaseId"] and
      ([.baseline.releaseId,.baseline.batchId] | all(type == "string" and test("^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$"))) and
      ([.baseline.releaseHash,.baseline.manifestHash] | all(type == "string" and test("^[a-f0-9]{64}$"))) and
      (.targetModelId | type == "string" and length > 0 and length <= 200 and (startswith("codex:") | not)))
  ' "$path")" || return 1
  expansion_docker_args=(-e PAPERBANANA_SCIENTIFIC_V2_EXPANSION_PATH=/run/paperbanana-scientific-v2/expansion.json -v "$path:/run/paperbanana-scientific-v2/expansion.json:ro")
  expansion_cli_args=(--expansion-sha256 "$expansion_sha256")
}
