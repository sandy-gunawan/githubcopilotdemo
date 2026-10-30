output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "app_url" {
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
  description = "Infrastructure endpoint only; Terraform does not deploy the application."
}

output "entra_redirect_uri" {
  value       = "https://${azurerm_linux_web_app.main.default_hostname}/.auth/login/aad/callback"
  description = "Must be configured as a Web redirect URI in the Entra registration before provisioning."
}

output "storage_account_name" {
  value = azurerm_storage_account.main.name
}

output "table_endpoint" {
  value = azurerm_storage_account.main.primary_table_endpoint
}

output "blob_endpoint" {
  value = azurerm_storage_account.main.primary_blob_endpoint
}

output "web_app_principal_id" {
  value = azurerm_linux_web_app.main.identity[0].principal_id
}
