#!/bin/bash
# =============================================
# HotBando GCP Deployment Script
# Run this on your LOCAL machine (not the VM)
# =============================================
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  HotBando GCP Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}gcloud CLI not found. Install it first:${NC}"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | grep -q "@"; then
    echo -e "${YELLOW}Not authenticated. Opening browser for login...${NC}"
    gcloud auth login
fi

ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null)
echo -e "${GREEN}Authenticated as: ${ACCOUNT}${NC}"

# Set project
PROJECT_ID="hotbando-$(date +%s)"
echo -e "${YELLOW}Creating GCP project: ${PROJECT_ID}${NC}"
gcloud projects create "$PROJECT_ID" --name="HotBando WiFi" 2>/dev/null || echo "Project may already exist"
gcloud config set project "$PROJECT_ID"

# Enable billing (required for Compute Engine)
echo -e "${YELLOW}Enabling Compute Engine API...${NC}"
gcloud services enable compute.googleapis.com 2>/dev/null

# Create VM
VM_NAME="hotbando-server"
ZONE="africa-south1-a"  # Johannesburg - closest to Tanzania
MACHINE_TYPE="e2-medium"  # 2 vCPU, 4GB RAM

echo -e "${YELLOW}Creating VM instance...${NC}"
gcloud compute instances create "$VM_NAME" \
    --zone="$ZONE" \
    --machine-type="$MACHINE_TYPE" \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=50GB \
    --boot-disk-type=pd-standard \
    --tags=hotbando-server \
    --metadata-from-file=startup-script=setup-vm.sh \
    2>/dev/null || echo "VM may already exist"

# Create firewall rules
echo -e "${YELLOW}Creating firewall rules...${NC}"
gcloud compute firewall-rules create allow-hotbando-http \
    --allow=tcp:80,tcp:443,tcp:3000 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=hotbando-server \
    --description="HTTP/HTTPS/Portal" \
    2>/dev/null || true

gcloud compute firewall-rules create allow-hotbando-radius \
    --allow=udp:1812,udp:1813 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=hotbando-server \
    --description="FreeRADIUS" \
    2>/dev/null || true

gcloud compute firewall-rules create allow-hotbando-ssh \
    --allow=tcp:22 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=hotbando-server \
    --description="SSH" \
    2>/dev/null || true

# Get VM IP
VM_IP=$(gcloud compute instances describe "$VM_NAME" \
    --zone="$ZONE" \
    --format="get(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}VM Name:    ${VM_NAME}${NC}"
echo -e "${GREEN}Zone:       ${ZONE}${NC}"
echo -e "${GREEN}VM IP:      ${VM_IP}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. SSH into the VM:"
echo "   gcloud compute ssh $VM_NAME --zone=$ZONE"
echo ""
echo "2. The setup script is running. Wait 2-3 minutes for Docker to install."
echo ""
echo "3. Clone and start the app:"
echo "   cd /opt/hotbando"
echo "   cp .env.production .env"
echo "   nano .env  # Edit with your values"
echo "   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
echo ""
echo "4. Build FreeRADIUS:"
echo "   cd /opt/hotbando/freeradius && docker build -t hotbando-freeradius:latest ."
echo "   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d freeradius"
echo ""
echo "5. Access the app:"
echo "   http://$VM_IP:3000  (portal)"
echo "   http://$VM_IP:3000/admin  (admin panel)"
echo ""
echo "6. MikroTik RADIUS config:"
echo "   RADIUS server: $VM_IP"
echo "   RADIUS secret: (from your .env)"
echo ""
echo -e "${YELLOW}To add SSL later:${NC}"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d yourdomain.com"
echo ""
echo -e "${GREEN}MikroTik should redirect to: http://$VM_IP:3000/hotspot${NC}"
