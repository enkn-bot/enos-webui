# ENOS fork of Open WebUI

## Upstream sync

To merge a new OWUI release (e.g. v0.9.7):

```bash
git fetch upstream --tags
git checkout upstream-sync
git merge v0.9.7          # fast-forward only — never commit ENOS code here
git push origin upstream-sync

git checkout main
git merge upstream-sync   # resolve any conflicts, then:
git push origin main
```

Conflict surface is intentionally tiny: only files listed in "ENOS touch-points" below.

## ENOS touch-points (files that differ from upstream)

- `src/lib/components/chat/MessageInput.svelte` — mounts `<ModelPicker>`
- `Dockerfile.enos` — custom image tag
- `src/lib/components/enos/` — new files, never conflict
- `src/lib/stores/enos/` — new files, never conflict
- `branding/` — bind-mounted at runtime, not in build

## Image build + deploy

```bash
docker build -f Dockerfile.enos -t ghcr.io/enkn-bot/enos-webui:latest .
docker push ghcr.io/enkn-bot/enos-webui:latest
ssh soraia-a1 'cd ~/open-webui && docker compose pull && docker compose up -d'
```

## 3 ENOS mind model IDs

- `enos.subconscious` — fast tier
- `enos.mind` — default, balanced tier  
- `enos.deepmind` — deep reasoning tier
