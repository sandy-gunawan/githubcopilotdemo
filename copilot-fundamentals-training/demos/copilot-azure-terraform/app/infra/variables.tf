variable "subscription_id" {
  type        = string
  description = "Explicit target subscription, supplied only after approval."

  validation {
    condition     = can(regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", var.subscription_id))
    error_message = "subscription_id must be a UUID."
  }
}

variable "tenant_id" {
  type        = string
  description = "Single Entra tenant for Terraform and tester authentication."

  validation {
    condition     = can(regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", var.tenant_id))
    error_message = "tenant_id must be a UUID."
  }
}

variable "name_prefix" {
  type        = string
  description = "Globally unique lowercase alphanumeric prefix for app/storage names."

  validation {
    condition     = can(regex("^[a-z][a-z0-9]{5,15}$", var.name_prefix))
    error_message = "name_prefix must start with a lowercase letter and contain 6-16 lowercase letters/digits."
  }
}

variable "location" {
  type        = string
  description = "Azure region explicitly chosen after runtime, SKU, price, and availability review."

  validation {
    condition     = length(trimspace(var.location)) > 0
    error_message = "location is required."
  }
}

variable "environment" {
  type        = string
  description = "Only synthetic dev/test environments are supported."
  default     = "dev"

  validation {
    condition     = contains(["dev", "test"], var.environment)
    error_message = "environment must be dev or test."
  }
}

variable "entra_client_id" {
  type        = string
  description = "Client ID of an externally configured single-tenant Entra web app registration."

  validation {
    condition     = can(regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", var.entra_client_id))
    error_message = "entra_client_id must be a UUID."
  }
}

variable "entra_client_secret" {
  type        = string
  sensitive   = true
  description = "Entra web login secret, supplied securely later. Stored in Terraform state; never commit it."

  validation {
    condition     = length(trimspace(var.entra_client_secret)) > 0
    error_message = "An Entra web login secret is required; anonymous access is not an alternative."
  }
}

variable "allowed_tester_object_ids" {
  type        = set(string)
  description = "Nonempty set of individual tester Entra user object IDs, not group IDs or email addresses."

  validation {
    condition = length(var.allowed_tester_object_ids) > 0 && alltrue([
      for id in var.allowed_tester_object_ids :
      can(regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", id))
    ])
    error_message = "Provide at least one tester user object ID, each in UUID format."
  }
}

variable "authentication_confirmed" {
  type        = bool
  default     = false
  description = "Set true only after Entra registration, redirect URI, secret, and tester authorization have been reviewed."
}

variable "application_integration_verified" {
  type        = bool
  default     = false
  description = "Set true only after Table/Blob integration, hosting/proxy handling, auth UX, telemetry, and tests are complete."
}
