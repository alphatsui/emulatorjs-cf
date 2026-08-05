#!/usr/bin/env bash
set -euo pipefail

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-f20ba18d01ebd5442049903aba1d6f51}"
PREFIX="${R2_PREFIX:-emulatorjs}"

BUCKETS=(
  "${PREFIX}-roms"
  "${PREFIX}-art"
  "${PREFIX}-config"
  "${PREFIX}-profiles"
)

echo "Creating R2 buckets (account: ${ACCOUNT_ID})..."
for bucket in "${BUCKETS[@]}"; do
  echo "  -> ${bucket}"
  wrangler r2 bucket create "${bucket}" --account-id "${ACCOUNT_ID}" 2>/dev/null || echo "  (already exists or error)"
done

echo ""
echo "Seeding config bucket with default console configs..."
CONSOLES=(3do arcade atari2600 atari5200 atari7800 colecovision doom gb gba gbc jaguar lynx msx n64 nds nes ngp odyssey2 pce psx sega32x segaCD segaGG segaMD seggaMS segaSG segaSaturn snes vb vectrex ws)

for console in "${CONSOLES[@]}"; do
  config="{\"name\":\"${console}\",\"display_items\":0,\"defaults\":{\"has_logo\":false,\"has_back\":false,\"has_corner\":false,\"has_video\":false,\"rom_extension\":\"\",\"video_position\":\"\",\"multi_disc\":0},\"items\":{}}"
  echo "${config}" | wrangler r2 object put "${PREFIX}-config/config/${console}.json" --account-id "${ACCOUNT_ID}" --content-type application/json 2>/dev/null || true
done

echo ""
echo "Done. Buckets created:"
printf '  - %s\n' "${BUCKETS[@]}"
echo ""
echo "Next: set ADMIN_TOKEN secret on the worker:"
echo "  wrangler secret put ADMIN_TOKEN"
