# Portal Keluhan Mini

This is a fictional local application for the Azure Terraform workshop.
Respond in everyday Indonesian. Use synthetic data only.

- The application is Node.js + Express, serves `public/`, and starts through
  `npm start` / `server.js`. `/health` is the readiness endpoint.
- Storage is local JSON plus an uploads directory outside the static web root.
  It is single-process demo storage, not a cloud database or blob adapter.
- Authentication is intentionally absent. Default binding is loopback only.
  Do not expose this application publicly or describe it as production-ready.
- Azure does not discover localhost automatically. Analyze these workspace
  files when asked for recommendations. Distinguish application integration
  work from generating infrastructure.
- Do not log in to Azure, inspect subscriptions, generate IaC, deploy, or
  modify resources unless the user explicitly requests that next stage.
- Preserve existing data; never reset/reseed a non-empty store automatically.
- Keep error messages visible and never return success after a failed write.
