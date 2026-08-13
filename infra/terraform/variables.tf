variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  sensitive   = true
}

variable "resource_group_name" {
  description = "Existing Azure resource group"
  type        = string
  default     = "RG-CIRCLECHAT-K3S"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "centralindia"
}

variable "ssh_public_key" {
  description = "SSH public key used for VM access"
  type        = string
  sensitive   = true
}