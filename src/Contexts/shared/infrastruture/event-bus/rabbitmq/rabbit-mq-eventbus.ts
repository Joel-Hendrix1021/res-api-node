import { inject, injectable } from 'tsyringe';
import { containerTypes } from '../../../../../apps/mooc/backend/dependency-injection/container.types';
import { DomainEvent } from '../../../domain/domain-event';
import { IEventBus } from '../../../domain/event-bus';
import { DomainEventDeserializer } from '../domain-event-deserializer';
import { DomainEventFailoverPublisher } from '../domain-event-failover-publisher';
import { DomainEventSubscribers } from '../domain-event-subscribers';
import { configSettings } from './config';
import { RabbitMQConnection } from './rabbit-mq-connection';
import { RabbitMqConsumerFactory } from './rabbit-mq-consumer-factory';
import { RabbitMQQueueFormatter } from './rabbit-mq-queue-formatter';

@injectable()
export class RabbitMqEventBus implements IEventBus {
	private failoverPublisher: DomainEventFailoverPublisher;
	private exchange = configSettings.exchangeSettings.name;
	private maxRetries: Number;

	constructor(
		@inject(containerTypes.rabbitMQConnection)
		private connection: RabbitMQConnection,
		@inject(containerTypes.rabbitMQQueueFormatter)
		private queueNameFormatter: RabbitMQQueueFormatter
	) {}

	async addSubscribers(subscribers: DomainEventSubscribers): Promise<void> {
		//await this.connectToRabbitMq();

		const deserializer = DomainEventDeserializer.configure(subscribers);
		const consumerFactory = new RabbitMqConsumerFactory(
			this.connection,
			deserializer,
			this.maxRetries
		);
		for (const subscriber of subscribers.items) {
			const queueName = this.queueNameFormatter.format(subscriber);
			const rabbitMqConsumer = consumerFactory.build(
				subscriber,
				this.exchange,
				queueName
			);
			console.log(rabbitMqConsumer);
			await this.connection.consume(
				queueName,
				rabbitMqConsumer.onMessage.bind(rabbitMqConsumer)
			);
		}
	}

	async publish(events: DomainEvent[]): Promise<void> {
		await this.connectToRabbitMq();

		for (const event of events) {
			try {
				const routingKey = event.eventName;
				const content = this.toBuffer(event);
				const options = this.options(event);
				console.log('eventName', routingKey);
				console.log('exchange', this.exchange);
				console.log('option', options);
				await this.connection.publish({
					exchange: this.exchange,
					routingKey,
					content,
					options,
				});
			} catch (error: any) {
				await this.failoverPublisher.publish(event);
			}
		}
	}

	private toBuffer(event: DomainEvent): Buffer {
		const eventPrimitives = JSON.stringify({
			data: {
				id: event.eventId,
				type: event.eventName,
				occurred_on: event.occurredOn.toISOString(),
				aggregateId: event.aggregateId,
				attributes: event.toPrimitives(),
			},
		});

		return Buffer.from(eventPrimitives);
	}

	private options(event: DomainEvent): {
		messageId: string;
		contentType: string;
		contentEncoding: string;
	} {
		return {
			messageId: event.eventId,
			contentType: 'application/json',
			contentEncoding: 'utf-8',
		};
	}

	private async connectToRabbitMq(): Promise<void> {
		if (this.connection.connectionExists()) return;

		await this.connection.connect();
	}
}
