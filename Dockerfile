# PREPARE DEPS
FROM rust:1.87 AS chef

RUN cargo install cargo-chef
WORKDIR /app

# GET DEPS
FROM chef AS planner
COPY Cargo.toml Cargo.lock ./
COPY crates/auth/Cargo.toml ./crates/auth/Cargo.toml
RUN mkdir -p ./crates/auth/src \
    && echo "// dummy file" > ./crates/auth/src/lib.rs
COPY crates/blob/Cargo.toml ./crates/blob/Cargo.toml
RUN mkdir -p ./crates/blob/src \
    && echo "// dummy file" > ./crates/blob/src/lib.rs
COPY crates/blockchain_dev/Cargo.toml ./crates/blockchain_dev/Cargo.toml
RUN mkdir -p ./crates/blockchain_dev/src \
    && echo "// dummy file" > ./crates/blockchain_dev/src/lib.rs
COPY crates/customers/Cargo.toml ./crates/customers/Cargo.toml
RUN mkdir -p ./crates/customers/src \
    && echo "// dummy file" > ./crates/customers/src/lib.rs
COPY crates/goods/Cargo.toml ./crates/goods/Cargo.toml
RUN mkdir -p ./crates/goods/src \
    && echo "// dummy file" > ./crates/goods/src/lib.rs
COPY crates/orders/Cargo.toml ./crates/orders/Cargo.toml
RUN mkdir -p ./crates/orders/src \
    && echo "// dummy file" > ./crates/orders/src/lib.rs
COPY crates/vendors/Cargo.toml ./crates/vendors/Cargo.toml
RUN mkdir -p ./crates/vendors/src \
    && echo "// dummy file" > ./crates/vendors/src/lib.rs
COPY crates/customers/migration/Cargo.toml ./crates/customers/migration/Cargo.toml
RUN mkdir -p ./crates/customers/migration/src/ \
    && echo "// dummy file" > ./crates/customers/migration/src/lib.rs
COPY crates/vendors/migration/Cargo.toml ./crates/vendors/migration/Cargo.toml
RUN mkdir -p ./crates/vendors/migration/src/ \
    && echo "// dummy file" > ./crates/vendors/migration/src/lib.rs
COPY crates/blockchain_dev/Cargo.toml ./crates/blockchain_dev/Cargo.toml
RUN mkdir -p ./crates/blockchain_dev/src \
    && echo "// dummy file" > ./crates/blockchain_dev/src/lib.rs

COPY utils/init_utils/Cargo.toml ./utils/init_utils/Cargo.toml
RUN mkdir -p ./utils/init_utils/src \
    && echo "// dummy file" > ./utils/init_utils/src/lib.rs
COPY utils/middleware/Cargo.toml ./utils/middleware/Cargo.toml
RUN mkdir -p ./utils//middleware/src \
    && echo "// dummy file" > ./utils/middleware/src/lib.rs
COPY utils/service_errors/Cargo.toml ./utils/service_errors/Cargo.toml
RUN mkdir -p ./utils/service_errors/src \
    && echo "// dummy file" > ./utils/service_errors/src/lib.rs
COPY utils/tracing_logger/Cargo.toml ./utils/tracing_logger/Cargo.toml
RUN mkdir -p ./utils/tracing_logger/src \
    && echo "// dummy file" > ./utils/tracing_logger//src/lib.rs


RUN cargo chef prepare --recipe-path recipe.json

# BUILDER
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

# FINAL BUILD
COPY . .
RUN cargo build --workspace --release

#	Services   #
# auth_service
FROM debian:bookworm-slim AS auth_service
RUN apt-get update && \
    apt-get install -y libssl-dev ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/auth /usr/local/bin/
COPY crates/auth/.env.docker /usr/local/bin/.env
CMD ["auth"]

# customers_service
FROM debian:bookworm-slim AS customers_service
RUN apt-get update && apt-get install -y libpq5 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/customers /usr/local/bin/
COPY crates/customers/.env.docker /usr/local/bin/.env
CMD ["customers"]

# vendors_service
FROM debian:bookworm-slim AS vendors_service
RUN apt-get update && apt-get install -y libpq5 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/vendors /usr/local/bin/
COPY crates/vendors/.env.docker /usr/local/bin/.env
CMD ["vendors"]

# goods_service
FROM debian:bookworm-slim AS goods_service
RUN apt-get update && apt-get install -y libssl-dev && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/goods /usr/local/bin/
COPY ./crates/goods/categories.json .
COPY crates/goods/.env.docker /usr/local/bin/.env
CMD ["goods"]

# blob_service
FROM debian:bookworm-slim AS blob_service
RUN apt-get update && apt-get install -y libssl-dev && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/blob /usr/local/bin/
COPY crates/blob/.env.docker /usr/local/bin/.env
CMD ["blob"]

# orders_service
FROM debian:bookworm-slim AS orders_service
RUN apt-get update && apt-get install -y libssl-dev && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/orders /usr/local/bin/
COPY crates/orders/.env.docker /usr/local/bin/.env
CMD ["orders"]

# blockchain_service
FROM debian:bookworm-slim AS blockchain_service
RUN apt-get update && apt-get install -y libssl-dev && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/blockchain_dev /usr/local/bin/
CMD ["blockchain_dev"]
