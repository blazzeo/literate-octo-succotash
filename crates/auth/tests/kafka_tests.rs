use futures_util::stream::StreamExt;
use rdkafka::Message;
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::producer::{FutureProducer, FutureRecord};
use std::time::Duration;
use tokio::time;

#[tokio::test]
async fn test_publish_msg() {
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", "localhost:9092")
        .create()
        .expect("Producer creation error");

    // Define the topic and message
    let topic = "customer-registered";
    let key = "key1";
    let payload = "Hello, Kafka from Rust!";

    // Send the message and wait for the result
    let delivery_status = producer
        .send(
            FutureRecord::to(topic).payload(payload).key(key),
            Duration::from_secs(5),
        )
        .await;

    println!("{:?}", delivery_status);

    assert!(
        delivery_status.is_ok(),
        "Kafka error: {:?}",
        delivery_status.err()
    )
}

#[tokio::test]
async fn test_read_one_msg() {
    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", "test-group-1")
        .set("bootstrap.servers", "localhost:9092")
        .set("enable.partition.eof", "false")
        .set("auto.offset.reset", "earliest")
        .create()
        .expect("Consumer creation failed");

    consumer
        .subscribe(&["customer-registered"])
        .expect("Can't subscribe to specified topic");

    let mut message_stream = consumer.stream();

    // Attempt to read msg with interval of 10 secs
    let maybe_message = time::timeout(Duration::from_secs(10), message_stream.next()).await;

    match maybe_message {
        Ok(Some(Ok(msg))) => {
            let payload = msg
                .payload_view::<str>()
                .unwrap_or(Ok("<invalid utf8>"))
                .unwrap();
            let key = msg.key_view::<str>().unwrap_or(Ok("<no key>")).unwrap();

            println!("Received message: key='{}', payload='{}'", key, payload);

            consumer
                .commit_message(&msg, rdkafka::consumer::CommitMode::Async)
                .unwrap();

            assert_eq!(payload, "Hello, Kafka from Rust!");
        },
        Ok(Some(Err(e))) => panic!("Error while receiving message: {:?}", e),
        Ok(None) => panic!("Stream ended unexpectedly"),
        Err(_) => panic!("Timed out waiting for message"),
    }
}
