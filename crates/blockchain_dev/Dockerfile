FROM rust:1.87 AS builder

WORKDIR /app

# Устанавливаем Foundry корректно
RUN apt-get update && apt-get install -y curl bash git && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN curl -L https://foundry.paradigm.xyz | bash && \
    bash -c "source /root/.bashrc && foundryup"

ENV PATH="/root/.foundry/bin:${PATH}"

COPY . .

RUN cargo build --release

FROM debian:bookworm-slim AS blockchain_service

RUN apt-get update && apt-get install -y netcat-openbsd && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/blockchain_dev /usr/local/bin/blockchain_service
COPY --from=builder /root/.foundry/bin/anvil /usr/local/bin/anvil
COPY --from=builder /root/.foundry/bin/forge /usr/local/bin/forge
COPY ./contracts ./contracts

EXPOSE 8545 3007

CMD anvil --host 0.0.0.0 --port 8545 & \
    until nc -z 0.0.0.0 8545; do echo "Waiting for anvil..."; sleep 1; done; \
    cd /app/contracts && \
    forge create src/vendor_fabric.sol:VendorFabric \
        --rpc-url http://localhost:8545 \
        --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
        --json > /app/deployment.json && \
    blockchain_service
