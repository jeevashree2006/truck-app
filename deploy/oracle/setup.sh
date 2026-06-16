#!/usr/bin/env bash
# One-time VM prep for an Oracle Cloud Always Free Ubuntu instance:
#   installs Docker, adds swap (so the build fits on a 1 GB micro), and opens
#   the host firewall for HTTP/HTTPS. Run once:  bash setup.sh
set -euo pipefail

echo "==> 1/4 Installing Docker (+ compose plugin)..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER" || true

echo "==> 2/4 Adding 2 GB swap (helps the image build on a 1 GB VM)..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> 3/4 Opening the host firewall for ports 80 + 443..."
sudo iptables -I INPUT 1 -p tcp --dport 80  -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
if ! command -v netfilter-persistent >/dev/null 2>&1; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
fi
sudo netfilter-persistent save

echo "==> 4/4 Done."
echo "    IMPORTANT: also add Ingress rules for TCP 80 and 443 in your VCN's"
echo "    Security List (Oracle console) — the host firewall alone isn't enough."
echo "    Then log out and back in (so 'docker' works without sudo) and run:"
echo "        cd ~/truck-app/deploy/oracle && cp .env.example .env && nano .env"
echo "        docker compose up -d --build"
