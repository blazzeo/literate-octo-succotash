#!/bin/bash
set -e

KAFKA_BROKER="kafka:9092"

echo "⏳ Waiting for Kafka to be ready..."
sleep 10

create_topic() {
  local topic=$1
  echo "📦 Creating topic: $topic"
  /opt/kafka/bin/kafka-topics.sh --create \
    --if-not-exists \
    --topic "$topic" \
    --bootstrap-server "$KAFKA_BROKER" \
    --replication-factor 1 \
    --partitions 1
}

create_topic "vendor-registered"
create_topic "customer-registered"
create_topic "admin-registered"
create_topic "vendor-deleted"
create_topic "customer-deleted"
create_topic "admin-deleted"

echo "✅ All topics created (if not existed)."
