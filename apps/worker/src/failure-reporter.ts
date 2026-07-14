import { withLoggedSpan } from '@workspace/observability';
import { AppClient } from '@worker/app-client';
import { Context, Duration, Effect, Layer, Queue, Schedule } from 'effect';

export type FailureReport = {
    readonly jobStatusPath: string;
    readonly errorMessage: string;
    readonly requestId: string;
};

export class FailureReporter extends Context.Service<
    FailureReporter,
    {
        readonly enqueue: (report: FailureReport) => Effect.Effect<void>;
    }
>()('FailureReporter') {}

const deliveryRetrySchedule = Schedule.exponential(1_000).pipe(
    Schedule.take(9),
    Schedule.modifyDelay((_, delay) => Effect.succeed(Duration.millis(Math.min(Duration.toMillis(delay), 30_000)))),
);

export const FailureReporterLive = Layer.effect(
    FailureReporter,
    Effect.gen(function* () {
        const appClient = yield* AppClient;
        const queue = yield* Queue.unbounded<FailureReport>();

        const deliver = (report: FailureReport) =>
            appClient
                .requestJson<{ ok: true }>(`${report.jobStatusPath}/fail`, {
                    method: 'POST',
                    body: JSON.stringify({ errorMessage: report.errorMessage }),
                    requestId: report.requestId,
                    retry: 'none',
                })
                .pipe(
                    Effect.retry({
                        schedule: deliveryRetrySchedule,
                        while: (error) => error.transient,
                    }),
                    // The span's end log carries the outcome and error message; the daemon
                    // itself must survive undeliverable reports, hence the final ignore.
                    withLoggedSpan('failure-report.deliver', {
                        'request.id': report.requestId,
                        'job.status_path': report.jobStatusPath,
                    }),
                    Effect.ignore,
                );

        yield* Effect.forever(Queue.take(queue).pipe(Effect.flatMap(deliver))).pipe(
            Effect.forkScoped({ startImmediately: true }),
        );

        return {
            enqueue: (report: FailureReport) => Queue.offer(queue, report).pipe(Effect.asVoid),
        };
    }),
);
