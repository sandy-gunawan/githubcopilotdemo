locals {
  name = "${var.name_prefix}-${var.environment}"
  tags = {
    application = "portal-keluhan-mini"
    environment = var.environment
    data        = "synthetic-only"
    managed_by  = "terraform"
  }
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name}"
  location = var.location
  tags     = local.tags

  lifecycle {
    precondition {
      condition     = var.authentication_confirmed
      error_message = "Provisioning blocked: Entra registration and allowed testers are not confirmed."
    }
    precondition {
      condition     = var.application_integration_verified
      error_message = "Provisioning blocked: the local-only application has not completed Azure integration."
    }
  }
}

resource "azurerm_service_plan" "main" {
  name                = "plan-${local.name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "B1"
  worker_count        = 1
  tags                = local.tags
}

resource "azurerm_storage_account" "main" {
  name                            = "${var.name_prefix}${var.environment}st"
  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  account_kind                    = "StorageV2"
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  default_to_oauth_authentication = true
  public_network_access           = "Enabled"
  tags                            = local.tags

  blob_properties {
    delete_retention_policy {
      days = 7
    }
    container_delete_retention_policy {
      days = 7
    }
  }
}

resource "azurerm_storage_table" "complaints" {
  name               = "Complaints"
  storage_account_id = azurerm_storage_account.main.id
}

resource "azurerm_storage_container" "attachments" {
  name                  = "attachments"
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${local.name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  daily_quota_gb      = 1
  tags                = local.tags
}

resource "azurerm_application_insights" "main" {
  name                 = "appi-${local.name}"
  resource_group_name  = azurerm_resource_group.main.name
  location             = azurerm_resource_group.main.location
  workspace_id         = azurerm_log_analytics_workspace.main.id
  application_type     = "Node.JS"
  retention_in_days    = 30
  daily_data_cap_in_gb = 1
  sampling_percentage  = 25
  ip_masking_enabled   = true
  tags                 = local.tags
}

resource "azurerm_linux_web_app" "main" {
  name                                           = "app-${local.name}"
  resource_group_name                            = azurerm_resource_group.main.name
  location                                       = azurerm_resource_group.main.location
  service_plan_id                                = azurerm_service_plan.main.id
  https_only                                     = true
  public_network_access_enabled                  = true
  ftp_publish_basic_authentication_enabled       = false
  webdeploy_publish_basic_authentication_enabled = false
  tags                                           = local.tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on                         = true
    app_command_line                  = "npm start"
    health_check_path                 = "/health"
    health_check_eviction_time_in_min = 5
    minimum_tls_version               = "1.2"
    scm_minimum_tls_version           = "1.2"
    ftps_state                        = "Disabled"

    application_stack {
      node_version = "24-lts"
    }
  }

  app_settings = {
    NODE_ENV                              = "production"
    HOST                                  = "0.0.0.0"
    STORAGE_BACKEND                       = "azure"
    AZURE_TABLE_ENDPOINT                  = azurerm_storage_account.main.primary_table_endpoint
    AZURE_TABLE_NAME                      = azurerm_storage_table.complaints.name
    AZURE_BLOB_ENDPOINT                   = azurerm_storage_account.main.primary_blob_endpoint
    AZURE_BLOB_CONTAINER                  = azurerm_storage_container.attachments.name
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.main.connection_string
    ENTRA_AUTH_CLIENT_SECRET              = var.entra_client_secret
  }

  auth_settings_v2 {
    auth_enabled           = true
    require_authentication = true
    require_https          = true
    unauthenticated_action = "RedirectToLoginPage"
    default_provider       = "azureactivedirectory"
    excluded_paths         = ["/health"]

    active_directory_v2 {
      client_id                  = var.entra_client_id
      tenant_auth_endpoint       = "https://login.microsoftonline.com/${var.tenant_id}/v2.0"
      client_secret_setting_name = "ENTRA_AUTH_CLIENT_SECRET"
      allowed_identities         = sort(tolist(var.allowed_tester_object_ids))
      allowed_audiences          = [var.entra_client_id, "api://${var.entra_client_id}"]
    }

    login {
      token_store_enabled = false
    }
  }
}

resource "azurerm_role_assignment" "table" {
  scope                = azurerm_storage_table.complaints.resource_manager_id
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = azurerm_linux_web_app.main.identity[0].principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "blob" {
  scope                = azurerm_storage_container.attachments.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_web_app.main.identity[0].principal_id
  principal_type       = "ServicePrincipal"
}
