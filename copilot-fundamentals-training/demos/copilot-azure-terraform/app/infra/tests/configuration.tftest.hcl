mock_provider "azurerm" {}

variables {
  subscription_id           = "11111111-1111-4111-8111-111111111111"
  tenant_id                 = "22222222-2222-4222-8222-222222222222"
  name_prefix               = "portaltest123"
  location                  = "southeastasia"
  entra_client_id           = "33333333-3333-4333-8333-333333333333"
  entra_client_secret       = "synthetic-test-value-not-a-real-secret"
  allowed_tester_object_ids = ["44444444-4444-4444-8444-444444444444"]
}

run "blocks_unconfirmed_authentication" {
  command = plan

  variables {
    application_integration_verified = true
  }

  expect_failures = [azurerm_resource_group.main]
}

run "blocks_unfinished_application" {
  command = plan

  variables {
    authentication_confirmed = true
  }

  expect_failures = [azurerm_resource_group.main]
}

run "rejects_empty_tester_allowlist" {
  command = plan

  variables {
    authentication_confirmed         = true
    application_integration_verified = true
    allowed_tester_object_ids        = []
  }

  expect_failures = [var.allowed_tester_object_ids]
}

run "rejects_empty_login_secret" {
  command = plan

  variables {
    authentication_confirmed         = true
    application_integration_verified = true
    entra_client_secret              = " "
  }

  expect_failures = [var.entra_client_secret]
}

run "secure_minimal_configuration" {
  command = plan

  variables {
    authentication_confirmed         = true
    application_integration_verified = true
  }

  assert {
    condition = (
      azurerm_service_plan.main.os_type == "Linux" &&
      azurerm_service_plan.main.sku_name == "B1" &&
      azurerm_service_plan.main.worker_count == 1
    )
    error_message = "Use one Linux B1 instance, without container orchestration."
  }

  assert {
    condition = (
      azurerm_storage_account.main.account_replication_type == "LRS" &&
      !azurerm_storage_account.main.shared_access_key_enabled &&
      !azurerm_storage_account.main.allow_nested_items_to_be_public &&
      azurerm_storage_container.attachments.container_access_type == "private"
    )
    error_message = "Storage must use LRS, disallow Shared Key, and keep attachments private."
  }

  assert {
    condition = (
      azurerm_linux_web_app.main.https_only &&
      azurerm_linux_web_app.main.auth_settings_v2[0].auth_enabled &&
      azurerm_linux_web_app.main.auth_settings_v2[0].require_authentication &&
      azurerm_linux_web_app.main.auth_settings_v2[0].unauthenticated_action == "RedirectToLoginPage" &&
      toset(azurerm_linux_web_app.main.auth_settings_v2[0].active_directory_v2[0].allowed_identities) == var.allowed_tester_object_ids &&
      toset(azurerm_linux_web_app.main.auth_settings_v2[0].excluded_paths) == toset(["/health"])
    )
    error_message = "Require login and the tester allowlist; only minimal health may be anonymous."
  }

  assert {
    condition = (
      azurerm_linux_web_app.main.site_config[0].application_stack[0].node_version == "24-lts" &&
      azurerm_linux_web_app.main.app_settings["HOST"] == "0.0.0.0" &&
      azurerm_linux_web_app.main.app_settings["STORAGE_BACKEND"] == "azure"
    )
    error_message = "The later application must use the declared Azure runtime and storage contract."
  }

  assert {
    condition = (
      azurerm_role_assignment.table.role_definition_name == "Storage Table Data Contributor" &&
      azurerm_role_assignment.blob.role_definition_name == "Storage Blob Data Contributor" &&
      azurerm_log_analytics_workspace.main.retention_in_days == 30
    )
    error_message = "Require data-plane roles and bounded monitoring retention."
  }
}
