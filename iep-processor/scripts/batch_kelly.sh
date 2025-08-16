#!/usr/bin/env bash
set -euo pipefail

# Batch IEP extraction for all PDFs in ./samples
# - Uses existing single-file runner (npm run test:single)
# - Skips duplicate files with " (1).pdf"
# - Moves JSON outputs to output/Kelly/
# - Renames JSON to the student's full name from the IEP (First_Last)
# - Falls back to UNKNOWN if name not found

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SAMPLES_DIR="$ROOT_DIR/samples"
OUT_DIR="$ROOT_DIR/output"
KELLY_DIR="$OUT_DIR/Kelly"

mkdir -p "$KELLY_DIR"

# Ensure model is GPT-5 as per project defaults
export OPENAI_MODEL="${OPENAI_MODEL:-gpt-5-2025-08-07}"

echo "Batch started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

i=0
shopt -s nullglob
for f in "$SAMPLES_DIR"/*.pdf; do
  # Skip duplicates like "foo (1).pdf"
  if [[ "$f" == *" (1).pdf" ]]; then
    echo "Skip duplicate: $f"
    continue
  fi

  base="$(basename "$f" .pdf)"
  echo "Processing: $f"

  if npm run -s test:single "$f" --prefix "$ROOT_DIR"; then
    # Find the JSON that corresponds to this input base name
    last_json="$(ls -t "$OUT_DIR/${base}_"*_extraction_result.json 2>/dev/null | head -1 || true)"
    if [[ -z "${last_json:-}" || ! -f "$last_json" ]]; then
      echo "WARN: No JSON found after processing $f" | tee -a "$KELLY_DIR/_errors.txt"
      continue
    fi

    # Extract student name safely using jq; handle apostrophe in key name
    name=$(jq -r ".data.IEP[\"CHILD'S INFORMATION\"].NAME // \"UNKNOWN\"" "$last_json" 2>/dev/null || echo UNKNOWN)

    # Convert "Last, First" to "First Last" if applicable
    if [[ "$name" == *","* ]]; then
      last_part="${name%%,*}"
      first_part="${name#*,}"
      # trim spaces
      last_part="${last_part##+([[:space:]])}"; last_part="${last_part%%+([[:space:]])}"
      first_part="${first_part##+([[:space:]])}"; first_part="${first_part%%+([[:space:]])}"
      display="$first_part $last_part"
    else
      display="$name"
    fi

    # Sanitize for filename
    sanitized=$(printf "%s" "$display" | tr -cd '[:alnum:] _-' | sed -E 's/[[:space:]]+/_/g; s/_+/_/g; s/^_+|_+$//g')
    [[ -z "$sanitized" ]] && sanitized="UNKNOWN"

    # Extract timestamp from the JSON filename
    basefile="$(basename "$last_json")"
    ts="${basefile%_extraction_result.json}"
    ts="${ts##*_}"
    [[ -z "$ts" ]] && ts="$(date -u +%Y-%m-%dT%H-%M-%SZ)"

    dest="$KELLY_DIR/${sanitized}_${ts}_extraction_result.json"
    mv -f "$last_json" "$dest"
    echo "→ Moved: $(basename "$dest")"
  else
    echo "ERROR: Extraction failed for $f" | tee -a "$KELLY_DIR/_errors.txt"
  fi

  i=$((i+1))
  sleep 1

done

count=$(ls "$KELLY_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "JSON count in Kelly: $count"
echo "Batch finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
