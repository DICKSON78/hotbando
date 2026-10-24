#!/bin/bash
# =============================================
# HotBando VM Startup Script
# Runs automatically when VM is created
# =============================================
set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install Docker
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git

# Docker GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Docker repo
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
systemctl enable docker
systemctl start docker

# Clone HotBando
mkdir -p /opt
cd /opt
git clone https://github.com/your-repo/hotbando.git 2>/dev/null || echo "Set up git repo manually"

# Create log directory
mkdir -p /opt/hotbando/logs

# Log completion
echo "[$(date)] HotBando VM setup complete" > /var/log/hotbando-setup.log
echo "Docker version: $(docker --version)" >> /var/log/hotbando-setup.log
