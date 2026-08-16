variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  sensitive   = true
}

variable "resource_group_name" {
  description = "CircleChat Azure resource group"
  type        = string
  default     = "RG-CIRCLECHAT-K3S"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "centralindia"
}

variable "app_name" {
  description = "Azure Linux Web App name"
  type        = string
}

variable "docker_image" {
  description = "GHCR Docker image"
  type        = string
  default     = "ghcr.io/v0id-x/circle-chat-backend"
}

variable "container_port" {
  description = "Port exposed by the Docker container"
  type        = string
  default     = "8000"
}