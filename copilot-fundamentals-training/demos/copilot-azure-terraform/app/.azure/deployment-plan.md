# Portal Keluhan Mini - deployment plan

Status: Infrastructure validated locally; provisioning and deployment blocked.

## Approved scope

- Direct Terraform CLI only; no Bicep or azd.
- Create infrastructure configuration and documentation only.
- Do not log in, inspect Azure inventory, change subscriptions, plan against
  Azure, apply, or deploy application code in this phase.
- Application integration is a separate, unfinished phase.
- Authentication is undecided. Require explicit Entra configuration and block
  provisioning until authentication and application integration are verified.
- Azure starts empty. A separate import script is deferred to the application
  integration phase; do not seed, migrate, or delete local data.

## Architecture

- One Linux App Service on a single-instance B1 plan, serving UI and Express API.
- One Standard LRS StorageV2 account: a Table for complaints/attachment metadata
  and a private Blob container for attachment contents.
- System-assigned managed identity with Table/Blob data-plane roles.
- Workspace-based Application Insights and a Log Analytics workspace.
- Entra App Service Authentication, restricted to explicitly allowed testers.
- No AKS, Docker/ACR, gateway, cache, queue, VNet, or private endpoint.
- Local protected Terraform state for one operator; no bootstrap resources.

## Implementation checklist

- [x] Read package.json, server.js, public/, .env.example, README.md, local store.
- [x] Read Azure Skills, Azure MCP guidance, and provider/service documentation.
- [x] Obtain approval and confirm Terraform-only implementation scope.
- [x] Author Terraform with mandatory identity inputs and readiness gates.
- [x] Document configuration, state protection, and separate code migration.
- [x] Run offline formatting, initialization without backend, and validation.
- [x] Verify missing readiness fails without accessing Azure.

## Local validation evidence

- Terraform 1.16.6 with pinned, signed AzureRM 5.12.0 and committed-ready
  dependency lock file.
- `terraform init -backend=false -input=false`: provider download only.
- `terraform validate`: passed with no warnings after schema corrections.
- `terraform test`: five mock-provider tests passed. Confirmed authentication
  and integration gates independently, rejected empty tester lists and empty
  login secrets, and asserted the minimal secure configuration.
- No real Azure plan, login, inventory, subscription change, apply, deployment,
  application source edits, or import was performed.
- Not ready for deployment validation: application integration and Entra
  decisions are deliberately still outstanding.

## Later approval gates

1. Implement Table/Blob adapters, hosting/proxy changes, user authorization,
   telemetry, UI wording, and explicit import tooling.
2. Verify local regression tests and cloud-integration behavior separately.
3. Confirm subscription, region, runtime/SKU availability, price, Entra setup,
   tester access, and RBAC permissions with the user.
4. Obtain separate permission for Azure authentication and a real Terraform plan.
5. Review the saved plan and obtain separate apply approval.
6. Deploy application code separately and verify cloud behavior before declaring
   the application ready.

## Documentation sources

- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- https://learn.microsoft.com/en-us/azure/storage/tables/table-storage-design
- https://learn.microsoft.com/en-us/azure/storage/tables/authorize-access-azure-active-directory
- https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-aad
- https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-enable?tabs=nodejs

Provider details must be checked against the pinned provider release, rather
than copied from older skill examples. No Azure resource availability or
subscription permissions have been verified.
